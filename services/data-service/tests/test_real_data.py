"""Sanity checks against the committed derived datasets (not fixtures)."""
from app.config import get_settings
from app.domain.locations import Gazetteer
from app.domain.regional import RegionalEngine

D = get_settings().data_dir


def test_gazetteer_has_broad_coverage():
    g = Gazetteer.from_csv(D / "gazetteer.csv")
    assert len(g.frame) >= 400
    assert g.get("Uttar Pradesh", "Lucknow") is not None
    assert all(8 <= r.latitude <= 37 and 68 <= r.longitude <= 98 for r in g.frame.itertuples())  # inside India's bounding box


def test_engine_answers_for_every_supported_district_in_some_season():
    g = Gazetteer.from_csv(D / "gazetteer.csv")
    e = RegionalEngine.from_csv(D / "regional_stats.csv.gz")
    missing = []
    for r in g.frame.itertuples():
        if not any(e.rank(r.state_key, r.district_key, s).crops for s in ("Kharif", "Rabi", "Summer")):
            missing.append((r.state, r.district))
    assert not missing, missing[:5]


def test_prevalence_sums_are_sane():
    e = RegionalEngine.from_csv(D / "regional_stats.csv.gz")
    res = e.rank("UTTAR PRADESH", "LUCKNOW", "Kharif")
    assert res.crops and 0 < sum(c.prevalence_pct for c in res.crops) <= 100.5
