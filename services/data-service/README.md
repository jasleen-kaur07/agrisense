# data-service (FastAPI)

Gazetteer, seasons, Regional Crop Guide and cached Open-Meteo weather. Contract: `contracts/data.yaml`.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
.venv/bin/python -m app.pipeline.build_gazetteer [--geocode]   # regenerate data/gazetteer.csv + regional_stats.csv.gz
DATABASE_URL=postgresql+psycopg://... .venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --port 8083
```

Raw datasets are not in git (`data/SOURCES.md`). Derived files in `data/` are committed.
