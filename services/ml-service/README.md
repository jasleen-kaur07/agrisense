# ml-service (FastAPI, internal only)

Serves Model 1 (experimental; `ENABLE_MODEL1=true` in `.env.example`, `false` disables it) with SHAP factors. All seven inputs are required;
nothing is imputed; out-of-range input is rejected. Artifacts live in `artifacts/model1/1.0.0` and are checksum-verified
before loading. Run tests: `.venv/bin/python -m pytest -q`.
