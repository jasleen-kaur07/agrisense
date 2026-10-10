# Model 1 rainfall definition: UNRESOLVED

| Item | Status | Evidence |
|---|---|---|
| Unit | millimetres (secondary evidence) | Team doc `Final_Project_Documentation.md` (rainfall table) and public mirrors of the Kaggle dataset |
| Averaging period | **UNRESOLVED** | Not stated in the repo, the notebooks or the data |
| Range in data | 20.2 - 298.6 mm | `data/raw/model1_crop_recommendation.csv` |
| Compatibility with district annual normals | **Incompatible** | Only 0.9% of district annual normals (641 districts, team rainfall file) fall within 20-299 mm |

Per-class rainfall ranges are tight, mostly round-number bands (apple 100-125, banana 90-120,
blackgram 60-75) and every class has exactly 100 rows, which is consistent with generated data.

## Rule (gate G10)

No API-derived or normal-derived rainfall is fed to any model while the period is unresolved.
Model 1 soil-test mode therefore stays disabled for users and is available only to tests.

## How to close this

1. Find the dataset's original documentation (publisher page) and record the period here.
2. If it cannot be found, keep the mode disabled; do not guess a conversion.
