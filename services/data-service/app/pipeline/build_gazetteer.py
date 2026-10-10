"""Build the district gazetteer and the aggregated regional statistics.

Usage (from services/data-service)::

    python -m app.pipeline.build_gazetteer            # offline, uses geocode cache
    python -m app.pipeline.build_gazetteer --geocode  # also query Open-Meteo geocoding for gaps

Inputs  : data/raw/crop_production.csv, data/raw/ind_adm2_points.csv
Outputs : data/gazetteer.csv, data/regional_stats.csv.gz,
          data/geocode_cache.json, docs/data/gazetteer_match.md
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import httpx
import pandas as pd

from app.domain.names import canonical_state, match_district, normalise

ROOT = Path(__file__).resolve().parents[4]  # repo root
RAW = ROOT / "data" / "raw"
OUT = ROOT / "services" / "data-service" / "data"
REPORT = ROOT / "docs" / "data" / "gazetteer_match.md"
GEOCODE_CACHE = OUT / "geocode_cache.json"

LAST_COMPLETE_YEAR = 2014  # 2015 has only 562 rows in the source
SUPPORT_FROM_YEAR = 2008
SUPPORT_MIN_ROWS = 50  # recent rows needed before a district is "supported"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_crop_production() -> pd.DataFrame:
    df = pd.read_csv(RAW / "crop_production.csv")
    df["Season"] = df["Season"].str.strip()
    df["Crop"] = df["Crop"].str.strip()
    df["state_key"] = df["State_Name"].map(canonical_state)
    df["district_key"] = df["District_Name"].map(normalise)
    df = df[(df["Crop_Year"] <= LAST_COMPLETE_YEAR) & (df["Area"] > 0)]
    return df


def centroids_from_points() -> pd.DataFrame:
    pts = pd.read_csv(RAW / "ind_adm2_points.csv", encoding="latin1")
    pts["state_key"] = pts["State"].map(canonical_state)
    pts["district_key"] = pts["District"].map(normalise)
    return pts.groupby(["state_key", "district_key"], as_index=False)[
        ["Latitude", "Longitude"]
    ].mean()


def geocode(state_key: str, district_key: str, cache: dict) -> dict | None:
    key = f"{state_key}|{district_key}"
    if key in cache:
        return cache[key]
    try:
        resp = httpx.get(
            GEOCODE_URL,
            params={"name": district_key.title(), "count": 10, "country_code": "IN", "language": "en"},
            timeout=httpx.Timeout(10.0, connect=5.0),
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:  # transient failure: do not cache, leave district without coordinates
        print(f"geocode failed for {key}: {exc}", flush=True)
        return None
    found = None
    for item in resp.json().get("results", []):
        if canonical_state(item.get("admin1", "")) == state_key:
            found = {"lat": item["latitude"], "lon": item["longitude"], "name": item["name"]}
            break
    cache[key] = found
    print(f"geocoded {key}: {'hit' if found else 'no match'}", flush=True)
    time.sleep(0.25)  # stay well below the provider's rate limits
    return found


def build(do_geocode: bool) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    crops = load_crop_production()
    cents = centroids_from_points()
    cent_by_state = {s: g for s, g in cents.groupby("state_key")}

    districts = (
        crops.groupby(["state_key", "district_key"])
        .agg(n_records=("Crop", "size"), first_year=("Crop_Year", "min"), last_year=("Crop_Year", "max"))
        .reset_index()
    )
    recent = crops[crops["Crop_Year"] >= SUPPORT_FROM_YEAR].groupby(["state_key", "district_key"]).size()
    districts["recent_records"] = districts.apply(
        lambda r: int(recent.get((r.state_key, r.district_key), 0)), axis=1
    )
    display = (
        crops.groupby(["state_key", "district_key"])[["State_Name", "District_Name"]].first().reset_index()
    )
    districts = districts.merge(display, on=["state_key", "district_key"])

    cache = json.loads(GEOCODE_CACHE.read_text()) if GEOCODE_CACHE.exists() else {}
    rows, review = [], []
    for r in districts.itertuples():
        lat = lon = None
        source, tier, score = "none", "none", 0.0
        state_cents = cent_by_state.get(r.state_key)
        if state_cents is not None:
            cand = set(state_cents["district_key"])
            matched, tier, score = match_district(r.state_key, r.district_key, cand)
            if matched:
                c = state_cents[state_cents["district_key"] == matched].iloc[0]
                lat, lon, source = float(c.Latitude), float(c.Longitude), "ind_adm2_points"
                if tier != "exact":
                    review.append((r.state_key, r.district_key, matched, tier, score))
        if lat is None and (do_geocode or f"{r.state_key}|{r.district_key}" in cache):
            hit = geocode(r.state_key, r.district_key, cache) if do_geocode else cache.get(f"{r.state_key}|{r.district_key}")
            if hit:
                lat, lon, source, tier, score = hit["lat"], hit["lon"], "open-meteo-geocoding", "geocoded", 0.0
        rows.append(
            {
                "state": r.State_Name.strip().title(),
                "district": str(r.District_Name).strip().title(),
                "state_key": r.state_key,
                "district_key": r.district_key,
                "latitude": None if lat is None else round(lat, 4),
                "longitude": None if lon is None else round(lon, 4),
                "coord_source": source,
                "coord_match_tier": tier,
                "coord_match_score": score,
                "n_records": r.n_records,
                "first_year": r.first_year,
                "last_year": r.last_year,
                "recent_records": r.recent_records,
            }
        )
    gaz = pd.DataFrame(rows)
    gaz["supported"] = gaz["latitude"].notna() & (gaz["recent_records"] >= SUPPORT_MIN_ROWS)
    gaz.sort_values(["state", "district"]).to_csv(OUT / "gazetteer.csv", index=False)
    if do_geocode:
        GEOCODE_CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True))

    stats = (
        crops.groupby(["state_key", "district_key", "Season", "Crop", "Crop_Year"], as_index=False)["Area"]
        .sum()
        .rename(columns={"Season": "season", "Crop": "crop", "Crop_Year": "year", "Area": "area_ha"})
    )
    stats.to_csv(OUT / "regional_stats.csv.gz", index=False, compression="gzip")

    write_report(gaz, review, stats)
    print(f"gazetteer rows={len(gaz)} supported={int(gaz['supported'].sum())} stats rows={len(stats)}")


def write_report(gaz: pd.DataFrame, review: list, stats: pd.DataFrame) -> None:
    tiers = gaz["coord_match_tier"].value_counts().to_dict()
    unsupported = gaz[~gaz["supported"]]
    lines = [
        "# Gazetteer build report",
        "",
        f"- Source: `crop_production.csv` sha256 `{sha256(RAW / 'crop_production.csv')[:16]}…`, "
        f"`ind_adm2_points.csv` sha256 `{sha256(RAW / 'ind_adm2_points.csv')[:16]}…`",
        f"- Districts in crop data: **{len(gaz)}** (years ≤ {LAST_COMPLETE_YEAR}, area > 0)",
        f"- Coordinates found: **{int(gaz['latitude'].notna().sum())}** — match tiers: {tiers}",
        f"- Supported (coordinates and ≥ {SUPPORT_MIN_ROWS} rows since {SUPPORT_FROM_YEAR}): "
        f"**{int(gaz['supported'].sum())}**",
        f"- Aggregated regional statistic rows: {len(stats)}",
        "",
        "## Non-exact matches to review",
        "",
        "| State | Crop-data district | Matched boundary name | Tier | Score |",
        "|---|---|---|---|---|",
        *[f"| {s} | {d} | {m} | {t} | {sc} |" for s, d, m, t, sc in sorted(review)],
        "",
        "## Unsupported districts",
        "",
        "| State | District | Coordinates | Recent rows |",
        "|---|---|---|---|",
        *[
            f"| {r.state} | {r.district} | {'yes' if pd.notna(r.latitude) else 'no'} | {r.recent_records} |"
            for r in unsupported.itertuples()
        ],
    ]
    REPORT.write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--geocode", action="store_true", help="query Open-Meteo geocoding for districts without coordinates")
    build(ap.parse_args().geocode)
