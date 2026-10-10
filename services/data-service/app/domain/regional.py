"""Regional Crop Guide engine.

A transparent, recency-weighted ranking of crops by **historical prevalence**
(share of recorded cropped area) for a district and season. It is *not* a
suitability or yield prediction and must never be presented as one.

Method
------
For a query ``(state, district, season, as_of_year)``:

1. Each yearly record gets weight ``0.5 ** ((as_of_year - year) / half_life)``;
   only years ``<= as_of_year`` inside ``window_years`` are used.
2. District share of crop *c* = weighted area of *c* / weighted area of all crops.
3. State prior is computed the same way over every district of the state.
4. The two are blended: ``lam * district + (1 - lam) * state`` with
   ``lam = n / (n + shrinkage_k)`` where ``n`` is the weighted record count of
   the district. Districts with fewer than ``min_district_records`` weighted
   records use the state prior only and are flagged ``state_fallback_used``.
5. Crops that are only reported as "Whole Year" are returned separately.

The result always carries the data behind it (record counts, years covered,
whether the fallback was used) so the UI can show coverage honestly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

from app.domain.names import canonical_state, normalise

WHOLE_YEAR = "Whole Year"


@dataclass(frozen=True)
class EngineConfig:
    half_life_years: float = 1.0  # frozen from the 2011-12 validation grid (docs/ml/regional_backtest.md)
    window_years: int = 10
    shrinkage_k: float = 2.0
    min_district_records: float = 3.0
    top_n: int = 10


@dataclass
class CropShare:
    crop: str
    prevalence_pct: float
    district_share_pct: float | None
    state_share_pct: float
    rank: int


@dataclass
class RegionalResult:
    state: str
    district: str
    season: str
    as_of_year: int
    crops: list[CropShare]
    year_round_crops: list[str]
    district_records: int
    years_covered: list[int]
    state_fallback_used: bool
    district_weight: float
    method: str = "recency-weighted area share (historical prevalence)"
    caveats: list[str] = field(default_factory=list)


class RegionalEngine:
    def __init__(self, stats: pd.DataFrame, config: EngineConfig | None = None):
        self.config = config or EngineConfig()
        stats = stats.copy()
        stats["state_key"] = stats["state_key"].astype(str)
        stats["district_key"] = stats["district_key"].astype(str)
        self._by_district = {k: g for k, g in stats.groupby(["state_key", "district_key", "season"])}
        self._by_state = {k: g for k, g in stats.groupby(["state_key", "season"])}
        self.last_year = int(stats["year"].max())

    @classmethod
    def from_csv(cls, path: Path | str, config: EngineConfig | None = None) -> "RegionalEngine":
        return cls(pd.read_csv(path), config)

    def _weighted(self, frame: pd.DataFrame | None, as_of: int) -> tuple[pd.Series, float, list[int]]:
        cfg = self.config
        if frame is None or frame.empty:
            return pd.Series(dtype=float), 0.0, []
        f = frame[(frame["year"] <= as_of) & (frame["year"] > as_of - cfg.window_years)]
        if f.empty:
            return pd.Series(dtype=float), 0.0, []
        w = np.power(0.5, (as_of - f["year"].to_numpy()) / cfg.half_life_years)
        weighted = f.assign(w=f["area_ha"].to_numpy() * w)
        per_crop = weighted.groupby("crop")["w"].sum()
        return per_crop / per_crop.sum(), float(w.sum()), sorted(f["year"].unique().tolist())

    def rank(self, state: str, district: str, season: str, as_of_year: int | None = None) -> RegionalResult:
        cfg = self.config
        as_of = self.last_year if as_of_year is None else as_of_year
        s, d = canonical_state(state), normalise(district)
        district_frame = self._by_district.get((s, d, season))
        state_frame = self._by_state.get((s, season))

        d_share, n_d, years = self._weighted(district_frame, as_of)
        s_share, _, _ = self._weighted(state_frame, as_of)
        fallback = n_d < cfg.min_district_records
        lam = 0.0 if fallback else n_d / (n_d + cfg.shrinkage_k)

        crops = sorted(set(d_share.index) | set(s_share.index))
        blended = {
            c: lam * float(d_share.get(c, 0.0)) + (1 - lam) * float(s_share.get(c, 0.0)) for c in crops
        }
        ordered = sorted(blended.items(), key=lambda kv: (-kv[1], kv[0]))[: cfg.top_n]
        shown = [
            CropShare(
                crop=c,
                prevalence_pct=round(v * 100, 1),
                district_share_pct=None if fallback else round(float(d_share.get(c, 0.0)) * 100, 1),
                state_share_pct=round(float(s_share.get(c, 0.0)) * 100, 1),
                rank=i + 1,
            )
            for i, (c, v) in enumerate(ordered)
        ]
        year_round = self._year_round(s, d, as_of)
        caveats = [
            "Shows what has historically been grown here, not what is best for a particular farm.",
        ]
        if fallback:
            caveats.append("Too little district data for this season; state-level history was used.")
        return RegionalResult(
            state=s,
            district=d,
            season=season,
            as_of_year=as_of,
            crops=shown,
            year_round_crops=year_round,
            district_records=int(round(n_d)),
            years_covered=years,
            state_fallback_used=fallback,
            district_weight=round(lam, 3),
            caveats=caveats,
        )

    def _year_round(self, s: str, d: str, as_of: int) -> list[str]:
        frame = self._by_district.get((s, d, WHOLE_YEAR))
        share, _, _ = self._weighted(frame, as_of)
        return list(share.sort_values(ascending=False).head(5).index)
