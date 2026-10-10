# Data sources and provenance

Status date: 2026-10-10. Raw files live in `data/raw/` and are **git-ignored**
because their licenses are not verified (see "License status"). Checksums are in
`data/manifest.json`; `scripts/verify_data.py` re-checks them.

## Datasets

| File | What it is | Origin (as far as we can verify) | License status | Used for |
|---|---|---|---|---|
| `crop_production.csv` | 246,091 rows: state, district, year (1997–2015), season, crop, area, production. 33 states, 652 districts, 124 crops | Copied from the team's repo `Anand1513/final-year-project-` (`model2/data/raw/`). Looks like the widely shared Indian district crop-production table; the original publisher was **not verifiable from the repo** | **UNVERIFIED** | Regional Crop Guide statistics |
| `district_rainfall_normals.csv` | 641 districts, monthly/annual rainfall normals (mm) | Team repo. Original publisher not stated | **UNVERIFIED** | Reference only. **Not used as a model input** |
| `ind_adm2_points.csv` | Polygon boundary points for ~594 districts (lat/lon) | Team repo (`crop recommendation/`). Original publisher not stated | **UNVERIFIED** | District centroids for the gazetteer |
| `model1_crop_recommendation.csv` | 2,200 rows, 22 crops, 100 rows per crop; N, P, K, temperature, humidity, ph, rainfall | Described by the team as the Kaggle "Crop Recommendation Dataset" (Atharva Ingle). Not verified against the original page | **UNVERIFIED** | Model 1 validation only |
| `ml/model1/artifacts/source/*.pkl` | Model 1 random-forest and MinMax scaler pickles | Team repo `outputmodel1/` | Team-authored | Model 1 validation |

Derived files (committed, small): `services/data-service/data/gazetteer.csv`,
`services/data-service/data/regional_stats.csv.gz`.

## Rules

- No dataset is redistributed publicly until its license is confirmed.
  The project is for internal academic evaluation.
- Every derived artifact records the checksum of the raw file it came from.
- Gazetteer coordinates from a web geocoder are tagged with their source and
  confidence in `gazetteer.csv`.

## Known limitations

- Crop data ends in 2014 for practical purposes (2015 has 562 rows) and predates
  later district splits (for example in Telangana and Andhra Pradesh).
- "Area grown" records what farmers planted. It reflects markets, subsidies and
  habit as well as agronomy, so it is **historical prevalence, not suitability**.
- Model 1 dataset: rainfall unit is millimetres per the team docs; the
  **averaging period is unresolved**. See `docs/ml/rainfall-definition.md`.

## Open actions

- [ ] Confirm the original publisher and license of each dataset.
- [ ] Confirm Model 1 dataset provenance and the rainfall period.
