import time
from datetime import datetime, timezone

import jwt
import pandas as pd
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.security import JwtVerifier
from app.weather.provider import WeatherProvider, WeatherProviderError

INTERNAL = "test-internal-token"


class FakeProvider(WeatherProvider):
    name = "Open-Meteo"
    attribution = "Weather data by Open-Meteo.com (CC BY 4.0)"

    def __init__(self):
        self.calls, self.fail = 0, False

    def fetch(self, latitude, longitude):
        self.calls += 1
        if self.fail:
            raise WeatherProviderError("down")
        return {
            "timezone": "Asia/Kolkata",
            "current": {"time": "2026-10-10T10:00", "temperatureC": 30.1, "humidityPct": 60, "precipitationMm": 0.0, "windKmh": 8.0, "weatherCode": 1},
            "daily": [{"date": "2026-10-10", "tempMaxC": 33.0, "tempMinC": 22.0, "precipitationSumMm": 1.2, "precipitationProbabilityMaxPct": 20, "weatherCode": 2}],
        }


@pytest.fixture(scope="session")
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture()
def token_for(rsa_key):
    def make(roles=("FARMER",), iss="agrisense-identity", exp_in=300, key=None):
        now = int(time.time())
        return jwt.encode({"sub": "user-1", "iss": iss, "roles": list(roles), "iat": now, "exp": now + exp_in}, key or rsa_key, algorithm="RS256")

    return make


@pytest.fixture()
def data_dir(tmp_path):
    gaz = pd.DataFrame(
        [
            ("Uttar Pradesh", "Lucknow", "UTTAR PRADESH", "LUCKNOW", 26.85, 80.95, "ind_adm2_points", "exact", 1.0, 400, 1997, 2014, 120, True),
            ("Uttar Pradesh", "Agra", "UTTAR PRADESH", "AGRA", 27.18, 78.01, "ind_adm2_points", "exact", 1.0, 300, 1997, 2014, 100, True),
            ("Uttar Pradesh", "Nowhere", "UTTAR PRADESH", "NOWHERE", None, None, "none", "none", 0.0, 3, 1997, 1998, 0, False),
        ],
        columns=["state", "district", "state_key", "district_key", "latitude", "longitude", "coord_source", "coord_match_tier", "coord_match_score", "n_records", "first_year", "last_year", "recent_records", "supported"],
    )
    gaz.to_csv(tmp_path / "gazetteer.csv", index=False)
    rows = []
    for y in range(2005, 2015):
        rows += [("UTTAR PRADESH", "LUCKNOW", "Kharif", "Rice", y, 80.0), ("UTTAR PRADESH", "LUCKNOW", "Kharif", "Maize", y, 20.0)]
        rows += [("UTTAR PRADESH", "LUCKNOW", "Whole Year", "Sugarcane", y, 15.0)]
        rows += [("UTTAR PRADESH", "AGRA", "Kharif", "Bajra", y, 70.0), ("UTTAR PRADESH", "AGRA", "Kharif", "Rice", y, 30.0)]
    pd.DataFrame(rows, columns=["state_key", "district_key", "season", "crop", "year", "area_ha"]).to_csv(tmp_path / "regional_stats.csv.gz", index=False)
    return tmp_path


@pytest.fixture()
def provider():
    return FakeProvider()


@pytest.fixture()
def client(data_dir, rsa_key, provider):
    settings = Settings(database_url="sqlite:///:memory:", internal_api_token=INTERNAL, data_dir=data_dir, weather_cache_ttl_current_min=30)
    pub = rsa_key.public_key()
    verifier = JwtVerifier(settings, key_resolver=lambda token: pub)
    app = create_app(settings, verifier=verifier, provider=provider)
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth(token_for):
    return {"Authorization": f"Bearer {token_for()}"}
