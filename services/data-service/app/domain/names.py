"""Name normalisation and matching for Indian states and districts.

Datasets in this project spell states and districts differently (for example
ORISSA/ODISHA, UTTARANCHAL/UTTARAKHAND, BAGPAT/BAGHPAT). Matching is done in
three explicit tiers so every join can be audited:

1. ``exact``  - equal after normalisation
2. ``alias``  - equal after a curated state/district alias table
3. ``fuzzy``  - best difflib match inside the same state, above a threshold

Nothing is matched across states, and every non-exact match is reported.
"""

from __future__ import annotations

import difflib
import re

STATE_ALIASES: dict[str, str] = {
    "ORISSA": "ODISHA",
    "UTTARANCHAL": "UTTARAKHAND",
    "PONDICHERRY": "PUDUCHERRY",
    "CHATISGARH": "CHHATTISGARH",
    "HIMACHAL": "HIMACHAL PRADESH",
    "ANDAMAN AND NICOBAR": "ANDAMAN AND NICOBAR ISLANDS",
    "DADAR NAGAR HAVELI": "DADRA AND NAGAR HAVELI",
    "DAMAN AND DUI": "DAMAN AND DIU",
}

# Curated district aliases, keyed by (canonical state, normalised district).
# Only add entries that were reviewed by a person; see reports/gazetteer_match.md.
DISTRICT_ALIASES: dict[tuple[str, str], str] = {
    ("UTTAR PRADESH", "BAGPAT"): "BAGHPAT",
    ("UTTAR PRADESH", "BADAUN"): "BUDAUN",
}

_PUNCT = re.compile(r"[^A-Z0-9 ]+")
_SPACES = re.compile(r"\s+")
_SUFFIXES = (" DISTRICT", " DIST")

FUZZY_THRESHOLD = 0.88


def normalise(value: object) -> str:
    """Upper-case, strip punctuation and collapse whitespace."""
    text = str(value).upper().replace("&", " AND ")
    text = _PUNCT.sub(" ", text)
    text = _SPACES.sub(" ", text).strip()
    for suffix in _SUFFIXES:
        if text.endswith(suffix):
            text = text[: -len(suffix)].strip()
    return text


def canonical_state(value: object) -> str:
    key = normalise(value)
    return STATE_ALIASES.get(key, key)


def match_district(
    state: str, district: str, candidates: set[str]
) -> tuple[str | None, str, float]:
    """Match ``district`` against ``candidates`` (already in the same state).

    Returns ``(matched_candidate | None, tier, score)``.
    """
    key = normalise(district)
    if key in candidates:
        return key, "exact", 1.0
    alias = DISTRICT_ALIASES.get((state, key))
    if alias and alias in candidates:
        return alias, "alias", 1.0
    best = difflib.get_close_matches(key, candidates, n=1, cutoff=FUZZY_THRESHOLD)
    if best:
        score = difflib.SequenceMatcher(None, key, best[0]).ratio()
        return best[0], "fuzzy", round(score, 3)
    return None, "none", 0.0
