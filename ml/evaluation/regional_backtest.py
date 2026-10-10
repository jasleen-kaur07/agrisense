"""Temporal back-test of the Regional Crop Guide engine (gate G6).

Protocol (fixed before looking at test results):
* Validation years 2011-2012 are used only to choose the engine's
  ``half_life_years`` and ``shrinkage_k`` from a small grid.
* The chosen configuration is then FROZEN and evaluated once on test years
  2013-2014.
* For every test year Y the engine sees data up to Y-1 only.
* Cases: each (state, district, season, year) that has records in year Y,
  seasons Kharif / Rabi / Summer. Truth = crops with area > 0 that year;
  "main" truth = the 3 crops with the largest area.
* Metrics for a method's top-3 picks:
    overlap3 : |picks ∩ main3| / 3
    p3       : |picks ∩ grown| / 3
    hit      : any pick is among main3
* Baselines: B0 national season popularity, B1 state-season popularity,
  B2 district-season (all history, no decay).

Metrics describe agreement with *historical planting*, not agronomic suitability.

Run: services/data-service/.venv/bin/python ml/evaluation/regional_backtest.py
"""

from __future__ import annotations

import itertools
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "data-service"))
from app.domain.regional import EngineConfig, RegionalEngine  # noqa: E402

STATS = ROOT / "services" / "data-service" / "data" / "regional_stats.csv.gz"
REPORT_JSON = ROOT / "docs" / "ml" / "regional_backtest.json"
REPORT_MD = ROOT / "docs" / "ml" / "regional_backtest.md"
SEASONS = ["Kharif", "Rabi", "Summer"]
VALID_YEARS = [2011, 2012]
TEST_YEARS = [2013, 2014]


def build_cases(stats: pd.DataFrame, years: list[int]) -> list[tuple]:
    sub = stats[stats["year"].isin(years) & stats["season"].isin(SEASONS)]
    cases = []
    for (s, d, se, y), g in sub.groupby(["state_key", "district_key", "season", "year"]):
        g = g.groupby("crop")["area_ha"].sum().sort_values(ascending=False)
        cases.append((s, d, se, int(y), set(g.index), list(g.index[:3])))
    return cases


def popularity(stats: pd.DataFrame, cols: list[str], max_year: int) -> dict:
    sub = stats[stats["year"] <= max_year]
    agg = sub.groupby(cols + ["crop"])["area_ha"].sum().reset_index().sort_values("area_ha", ascending=False)
    return {k if isinstance(k, tuple) else (k,): list(g["crop"][:3]) for k, g in agg.groupby(cols)}


def metrics(picks_fn, cases) -> dict:
    ov, p3, hit = [], [], []
    for s, d, se, y, grown, main in cases:
        picks = picks_fn(s, d, se, y)
        if not picks:
            continue
        picks = picks[:3]
        ov.append(len(set(picks) & set(main)) / 3)
        p3.append(len(set(picks) & grown) / 3)
        hit.append(float(bool(set(picks) & set(main))))
    return {"n": len(ov), "overlap3": float(np.mean(ov)), "p3": float(np.mean(p3)), "hit": float(np.mean(hit)), "_ov": ov}


def engine_picks(engine: RegionalEngine):
    def fn(s, d, se, y):
        return [c.crop for c in engine.rank(s, d, se, as_of_year=y - 1).crops[:3]]

    return fn


def baseline_picks(stats: pd.DataFrame):
    cache: dict[int, tuple] = {}

    def tables(y):
        if y not in cache:
            cache[y] = (
                popularity(stats, ["season"], y - 1),
                popularity(stats, ["state_key", "season"], y - 1),
                popularity(stats, ["state_key", "district_key", "season"], y - 1),
            )
        return cache[y]

    def b0(s, d, se, y):
        return tables(y)[0].get((se,))

    def b1(s, d, se, y):
        return tables(y)[1].get((s, se))

    def b2(s, d, se, y):
        t = tables(y)
        return t[2].get((s, d, se)) or t[1].get((s, se))

    return b0, b1, b2


def bootstrap_diff(a: list[float], b: list[float], n: int = 2000, seed: int = 0) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    a, b = np.array(a), np.array(b)
    m = min(len(a), len(b))
    idx = rng.integers(0, m, size=(n, m))
    diffs = (a[:m][idx] - b[:m][idx]).mean(axis=1)
    return float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))


def main() -> int:
    stats = pd.read_csv(STATS)
    valid, test = build_cases(stats, VALID_YEARS), build_cases(stats, TEST_YEARS)

    grid = list(itertools.product([1.0, 2.0, 3.0, 5.0, 100.0], [2.0, 5.0, 20.0, 50.0]))
    scored = []
    for hl, k in grid:
        eng = RegionalEngine(stats, EngineConfig(half_life_years=hl, shrinkage_k=k))
        m = metrics(engine_picks(eng), valid)
        scored.append({"half_life_years": hl, "shrinkage_k": k, **{x: m[x] for x in ("n", "overlap3", "p3", "hit")}})
    best = max(scored, key=lambda r: r["overlap3"])
    cfg = EngineConfig(half_life_years=best["half_life_years"], shrinkage_k=best["shrinkage_k"])

    engine = RegionalEngine(stats, cfg)  # FROZEN from here on
    b0, b1, b2 = baseline_picks(stats)
    results = {
        "B0 national season popularity": metrics(b0, test),
        "B1 state-season popularity": metrics(b1, test),
        "B2 district-season, all history": metrics(b2, test),
        "Regional engine (frozen config)": metrics(engine_picks(engine), test),
    }
    eng_m, b1_m = results["Regional engine (frozen config)"], results["B1 state-season popularity"]
    ci_lo, ci_hi = bootstrap_diff(eng_m["_ov"], b1_m["_ov"])

    # coverage / fallback rate on test cases
    fb = sum(engine.rank(s, d, se, as_of_year=y - 1).state_fallback_used for s, d, se, y, *_ in test)
    gate = all(eng_m[x] >= b1_m[x] for x in ("overlap3", "p3", "hit"))

    out = {
        "protocol": "validation 2011-2012 grid search; frozen config; test 2013-2014; history up to Y-1",
        "chosen_config": {"half_life_years": cfg.half_life_years, "shrinkage_k": cfg.shrinkage_k},
        "validation_grid": scored,
        "test": {k: {x: v[x] for x in ("n", "overlap3", "p3", "hit")} for k, v in results.items()},
        "overlap3_diff_vs_B1_95ci": [ci_lo, ci_hi],
        "state_fallback_rate_test": fb / len(test),
        "gate_G6_engine_ge_B1_on_all_metrics": gate,
        "note": "Measures agreement with historical planting, not agronomic suitability.",
    }
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(json.dumps(out, indent=2))
    lines = [
        "# Regional engine back-test (gate G6)",
        "",
        f"Protocol: {out['protocol']}.",
        f"Chosen config (picked on validation only): half-life {cfg.half_life_years} y, shrinkage k {cfg.shrinkage_k}.",
        "",
        "| Method | Cases | Overlap with top-3 by area | P@3 (grown) | Hit (any main crop) |",
        "|---|---|---|---|---|",
        *[f"| {k} | {v['n']} | {v['overlap3']:.3f} | {v['p3']:.3f} | {v['hit']:.3f} |" for k, v in results.items()],
        "",
        f"Engine minus B1 on overlap3, bootstrap 95% CI: [{ci_lo:+.3f}, {ci_hi:+.3f}].",
        f"State-fallback rate on test cases: {fb / len(test):.1%}.",
        f"**Gate G6 (engine >= B1 on every metric): {'PASS' if gate else 'FAIL'}.**",
        "",
        "These numbers measure agreement with what was historically planted. They are not",
        "evidence that the listed crops are agronomically best for a farm.",
    ]
    REPORT_MD.write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0 if gate else 1


if __name__ == "__main__":
    raise SystemExit(main())
