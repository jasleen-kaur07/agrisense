from __future__ import annotations

from datetime import date

# Simplified calendar convention (NOT a regional sowing calendar):
#   Kharif Jun-Sep, Rabi Oct-Feb, Summer Mar-May.
MONTHS = {"KHARIF": [6, 7, 8, 9], "RABI": [10, 11, 12, 1, 2], "SUMMER": [3, 4, 5]}
NEXT = {"KHARIF": "RABI", "RABI": "SUMMER", "SUMMER": "KHARIF"}
SOURCE_LABEL = {"KHARIF": "Kharif", "RABI": "Rabi", "SUMMER": "Summer"}
RULE = (
    "Simplified calendar convention: Kharif June-September, Rabi October-February, Summer March-May. "
    "Actual sowing windows vary by region and crop; check with your local agriculture office."
)


def season_for(d: date) -> str:
    for name, months in MONTHS.items():
        if d.month in months:
            return name
    raise ValueError(d)


def info(d: date) -> dict:
    s = season_for(d)
    return {"season": s, "next": NEXT[s], "months": MONTHS[s], "rule": RULE}
