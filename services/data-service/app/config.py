from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./local-dev.db"
    internal_api_token: str = ""
    identity_jwks_url: str = "http://identity-service:8081/.well-known/jwks.json"
    jwt_issuer: str = "agrisense-identity"
    open_meteo_base_url: str = "https://api.open-meteo.com"
    weather_cache_ttl_current_min: int = 30  # one TTL for the whole snapshot (current + forecast)
    weather_max_stale_hours: int = 24  # CACHED fallback is only served within this age
    weather_timeout_s: float = 3.0  # must stay below farm-advisory's 4 s read timeout
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    port: int = 8083


@lru_cache
def get_settings() -> Settings:
    return Settings()
