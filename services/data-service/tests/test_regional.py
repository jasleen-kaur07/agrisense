import pandas as pd
import pytest

from app.domain.regional import EngineConfig, RegionalEngine


def make_stats():
    rows = []
    # district D1: rice dominates in Kharif every year, maize a little
    for y in range(2005, 2013):
        rows += [("S", "D1", "Kharif", "Rice", y, 80.0), ("S", "D1", "Kharif", "Maize", y, 20.0)]
        rows += [("S", "D2", "Kharif", "Maize", y, 90.0), ("S", "D2", "Kharif", "Rice", y, 10.0)]
    # D3 has a single record (should fall back to the state prior)
    rows += [("S", "D3", "Kharif", "Jute", 2012, 5.0)]
    rows += [("S", "D1", "Whole Year", "Sugarcane", 2012, 10.0)]
    return pd.DataFrame(rows, columns=["state_key", "district_key", "season", "crop", "year", "area_ha"])


def test_district_ranking_and_shape():
    eng = RegionalEngine(make_stats(), EngineConfig(half_life_years=3, shrinkage_k=2))
    r = eng.rank("S", "D1", "Kharif", as_of_year=2012)
    assert r.crops[0].crop == "Rice"
    assert r.crops[0].prevalence_pct > r.crops[1].prevalence_pct
    assert not r.state_fallback_used
    assert r.years_covered[-1] == 2012
    assert r.year_round_crops == ["Sugarcane"]
    assert sum(c.prevalence_pct for c in r.crops) == pytest.approx(100, abs=0.5)


def test_state_fallback_flagged():
    eng = RegionalEngine(make_stats(), EngineConfig(min_district_records=3))
    r = eng.rank("S", "D3", "Kharif", as_of_year=2012)
    assert r.state_fallback_used and r.district_weight == 0.0
    assert all(c.district_share_pct is None for c in r.crops)
    assert any("state-level" in c for c in r.caveats)


def test_no_future_data_used():
    eng = RegionalEngine(make_stats())
    r = eng.rank("S", "D1", "Kharif", as_of_year=2004)  # before any record
    assert r.crops == [] and r.state_fallback_used


def test_always_carries_historical_caveat():
    r = RegionalEngine(make_stats()).rank("S", "D1", "Kharif", as_of_year=2012)
    assert "historically" in r.caveats[0]
