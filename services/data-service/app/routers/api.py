from __future__ import annotations

from datetime import date as date_type
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request

from app.domain import seasons
from app.domain.names import canonical_state, normalise
from app.errors import ApiError
from app.security import Principal, current_principal, require_admin

router = APIRouter(prefix="/v1", dependencies=[Depends(current_principal)])
SeasonParam = Literal["KHARIF", "RABI", "SUMMER"]


def _district_or_404(request: Request, state: str, district: str) -> dict:
    found = request.app.state.gazetteer.get(state, district)
    if not found:
        raise ApiError(404, "District not found", "This district is not in the supported list.", "not-found")
    return found


@router.get("/locations/states")
def states(request: Request):
    return request.app.state.gazetteer.states()


@router.get("/locations/districts")
def districts(request: Request, state: str):
    return request.app.state.gazetteer.districts(state)


@router.get("/locations/search")
def search(request: Request, q: str = Query(min_length=2), limit: int = Query(10, ge=1, le=25)):
    return request.app.state.gazetteer.search(q, limit)


@router.get("/locations/nearest")
def nearest(request: Request, lat: float = Query(ge=6.0, le=38.0), lon: float = Query(ge=67.0, le=98.0)):
    found = request.app.state.gazetteer.nearest(lat, lon)
    if not found:
        raise ApiError(404, "No supported district nearby", "Choose your state and district manually.", "not-found")
    return found


@router.get("/locations/{state_key}/{district_key}")
def location(request: Request, state_key: str, district_key: str):
    return _district_or_404(request, state_key, district_key)


@router.get("/seasons/current")
def current_season(date: date_type | None = None):
    return seasons.info(date or date_type.today())


@router.get("/regional/guide")
def regional_guide(request: Request, state: str, district: str, season: SeasonParam, asOfYear: int | None = None):
    d = _district_or_404(request, state, district)
    engine = request.app.state.engine
    r = engine.rank(d["stateKey"], d["districtKey"], seasons.SOURCE_LABEL[season], as_of_year=asOfYear)
    if not r.crops:
        raise ApiError(404, "No regional records", "No historical records exist for this district and season.", "no-data")
    years = r.years_covered
    return {
        "kind": "REGIONAL_PATTERN",
        "state": d["state"],
        "district": d["district"],
        "season": season,
        "basis": r.method,
        "asOfYear": r.as_of_year,
        "crops": [
            {
                "rank": c.rank,
                "crop": c.crop,
                "prevalencePct": c.prevalence_pct,
                "districtPct": c.district_share_pct,
                "statePct": c.state_share_pct,
            }
            for c in r.crops
        ],
        "yearRoundCrops": r.year_round_crops,
        "coverage": {
            "districtRecords": r.district_records,
            "yearsCovered": years,
            "stateFallbackUsed": r.state_fallback_used,
            "districtWeight": r.district_weight,
            "firstYear": years[0] if years else None,
            "lastYear": years[-1] if years else None,
        },
        "caveats": r.caveats
        + ["Crop records end in " + str(engine.last_year) + " and may not reflect recent changes."],
        "sources": ["District crop-production records 1997-" + str(engine.last_year) + " (see data/SOURCES.md)"],
    }


@router.get("/regional/crop-history")
def crop_history(request: Request, state: str, district: str, crops: str, years: int = Query(10, ge=1, le=20)):
    d = _district_or_404(request, state, district)
    wanted = [c.strip() for c in crops.split(",") if c.strip()][:5]
    if not wanted:
        raise ApiError(422, "Validation failed", "crops must not be empty", "validation")
    return {"series": request.app.state.engine.crop_history(d["stateKey"], d["districtKey"], wanted, years)}


@router.get("/weather")
def weather(request: Request, state: str, district: str):
    d = _district_or_404(request, state, district)
    key = f"{d['stateKey']}|{d['districtKey']}"
    return request.app.state.weather.get(key, d["latitude"], d["longitude"])


@router.get("/admin/data/summary")
def data_summary(request: Request, _: Principal = Depends(require_admin)):
    app = request.app.state
    return {
        "districts": app.gazetteer.all_rows,
        "supportedDistricts": len(app.gazetteer.frame),
        "statRows": app.engine.row_count,
        "firstYear": app.engine.first_year,
        "lastYear": app.engine.last_year,
        "weatherCacheEntries": app.weather.cache_entries(),
        "datasetLicenseStatus": "UNVERIFIED (internal academic use; see data/SOURCES.md)",
    }
