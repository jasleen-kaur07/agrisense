from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.domain.names import canonical_state, normalise


class Gazetteer:
    """Supported districts only: coordinates known and enough recent crop records."""

    def __init__(self, frame: pd.DataFrame):
        self.all_rows = len(frame)
        self.frame = frame[frame["supported"]].reset_index(drop=True)
        self._index = {(r.state_key, r.district_key): r for r in self.frame.itertuples()}

    @classmethod
    def from_csv(cls, path: Path | str) -> "Gazetteer":
        return cls(pd.read_csv(path))

    @staticmethod
    def _item(r) -> dict:
        return {
            "stateKey": r.state_key,
            "districtKey": r.district_key,
            "state": r.state,
            "district": r.district,
            "latitude": float(r.latitude),
            "longitude": float(r.longitude),
            "coordSource": r.coord_source,
        }

    def states(self) -> list[dict]:
        g = self.frame.groupby(["state_key", "state"]).size().reset_index(name="n")
        return [{"stateKey": r.state_key, "name": r.state, "districtCount": int(r.n)} for r in g.sort_values("state").itertuples()]

    def districts(self, state: str) -> list[dict]:
        s = canonical_state(state)
        rows = self.frame[self.frame["state_key"] == s].sort_values("district")
        return [self._item(r) for r in rows.itertuples()]

    def get(self, state: str, district: str) -> dict | None:
        r = self._index.get((canonical_state(state), normalise(district)))
        return self._item(r) if r else None

    def search(self, q: str, limit: int = 10) -> list[dict]:
        key = normalise(q)
        if not key:
            return []
        f = self.frame
        starts = f[f["district_key"].str.startswith(key)]
        contains = f[f["district_key"].str.contains(key, regex=False) & ~f["district_key"].str.startswith(key)]
        both = pd.concat([starts.sort_values("district"), contains.sort_values("district")]).head(limit)
        return [self._item(r) for r in both.itertuples()]
