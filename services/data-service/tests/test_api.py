import time
from datetime import timedelta, timezone, datetime

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from tests.conftest import INTERNAL


def test_health_and_ready_need_no_auth(client):
    assert client.get("/health").json() == {"status": "UP"}
    assert client.get("/ready").json() == {"status": "UP"}


def test_requires_authentication_as_problem_json(client):
    r = client.get("/v1/locations/states")
    assert r.status_code == 401
    assert r.headers["content-type"].startswith("application/problem+json")
    assert r.json()["traceId"]


def test_rejects_forged_expired_and_wrong_issuer_tokens(client, token_for):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    for bad in (token_for(key=other), token_for(exp_in=-10), token_for(iss="evil")):
        assert client.get("/v1/locations/states", headers={"Authorization": f"Bearer {bad}"}).status_code == 401


def test_internal_token_accepted_and_wrong_one_rejected(client):
    assert client.get("/v1/locations/states", headers={"X-Internal-Token": INTERNAL}).status_code == 200
    assert client.get("/v1/locations/states", headers={"X-Internal-Token": "nope"}).status_code == 401


def test_request_id_echoed_and_regenerated_when_invalid(client, auth):
    rid = "7c1e6f56-5f4e-4d6a-9c1d-0d6a0a6f3a11"
    assert client.get("/health", headers={"X-Request-ID": rid}).headers["x-request-id"] == rid
    assert client.get("/health", headers={"X-Request-ID": "x"}).headers["x-request-id"] != "x"


def test_locations_only_supported_districts(client, auth):
    states = client.get("/v1/locations/states", headers=auth).json()
    assert states == [{"stateKey": "UTTAR PRADESH", "name": "Uttar Pradesh", "districtCount": 2}]
    names = [d["district"] for d in client.get("/v1/locations/districts", params={"state": "Uttar Pradesh"}, headers=auth).json()]
    assert names == ["Agra", "Lucknow"]
    assert client.get("/v1/locations/search", params={"q": "luck"}, headers=auth).json()[0]["districtKey"] == "LUCKNOW"
    assert client.get("/v1/locations/UTTAR PRADESH/NOWHERE", headers=auth).status_code == 404


def test_search_requires_two_chars(client, auth):
    r = client.get("/v1/locations/search", params={"q": "l"}, headers=auth)
    assert r.status_code == 422 and r.json()["errors"][0]["field"] == "q"


def test_season_rule(client, auth):
    r = client.get("/v1/seasons/current", params={"date": "2026-07-15"}, headers=auth).json()
    assert r["season"] == "KHARIF" and r["next"] == "RABI" and "Simplified" in r["rule"]
    assert client.get("/v1/seasons/current", params={"date": "2026-01-10"}, headers=auth).json()["season"] == "RABI"
    assert client.get("/v1/seasons/current", params={"date": "2026-04-10"}, headers=auth).json()["season"] == "SUMMER"


def test_regional_guide_shape_and_honest_wording(client, auth):
    r = client.get("/v1/regional/guide", params={"state": "Uttar Pradesh", "district": "lucknow", "season": "KHARIF"}, headers=auth)
    body = r.json()
    assert r.status_code == 200 and body["kind"] == "REGIONAL_PATTERN"
    assert body["crops"][0]["crop"] == "Rice" and body["crops"][0]["rank"] == 1
    assert body["yearRoundCrops"] == ["Sugarcane"]
    assert body["coverage"]["stateFallbackUsed"] is False and body["coverage"]["lastYear"] == 2014
    assert any("historically" in c for c in body["caveats"])
    text = str(body).lower()
    assert "suitab" not in text and "probab" not in text and "best crop" not in text


def test_regional_guide_unsupported_and_invalid_season(client, auth):
    assert client.get("/v1/regional/guide", params={"state": "UTTAR PRADESH", "district": "NOWHERE", "season": "KHARIF"}, headers=auth).status_code == 404
    assert client.get("/v1/regional/guide", params={"state": "UTTAR PRADESH", "district": "AGRA", "season": "WINTER"}, headers=auth).status_code == 422
    assert client.get("/v1/regional/guide", params={"state": "UTTAR PRADESH", "district": "AGRA", "season": "RABI"}, headers=auth).status_code == 404


def test_crop_history(client, auth):
    r = client.get("/v1/regional/crop-history", params={"state": "UTTAR PRADESH", "district": "AGRA", "crops": "Rice,bajra"}, headers=auth).json()
    assert {s["crop"] for s in r["series"]} == {"Rice", "bajra"}
    rice = next(s for s in r["series"] if s["crop"] == "Rice")
    assert rice["points"][-1] == {"year": 2014, "sharePct": 30.0}


def test_weather_live_then_cached_and_attribution(client, auth, provider):
    q = {"state": "UTTAR PRADESH", "district": "LUCKNOW"}
    first = client.get("/v1/weather", params=q, headers=auth).json()
    assert first["status"] == "LIVE" and first["source"] == "Open-Meteo" and "Open-Meteo" in first["attribution"]
    assert first["current"]["temperatureC"] == 30.1 and first["fetchedAt"]
    second = client.get("/v1/weather", params=q, headers=auth).json()
    assert second["status"] == "CACHED" and provider.calls == 1


def test_weather_unavailable_has_no_numbers(client, auth, provider):
    provider.fail = True
    w = client.get("/v1/weather", params={"state": "UTTAR PRADESH", "district": "AGRA"}, headers=auth).json()
    assert w["status"] == "UNAVAILABLE" and w["current"] is None and w["daily"] == [] and w["message"]


def test_weather_stale_cache_served_as_cached_when_provider_fails(client, auth, provider):
    q = {"state": "UTTAR PRADESH", "district": "LUCKNOW"}
    assert client.get("/v1/weather", params=q, headers=auth).json()["status"] == "LIVE"
    svc = client.app.state.weather
    real_now = svc.now
    svc.now = lambda: real_now() + timedelta(hours=2)  # beyond TTL, inside max-stale
    provider.fail = True
    w = client.get("/v1/weather", params=q, headers=auth).json()
    assert w["status"] == "CACHED" and w["current"] is not None and "last saved" in w["message"]
    svc.now = lambda: real_now() + timedelta(hours=48)  # beyond max-stale
    assert client.get("/v1/weather", params=q, headers=auth).json()["status"] == "UNAVAILABLE"


def test_admin_summary_requires_admin_user(client, token_for):
    farmer = {"Authorization": f"Bearer {token_for()}"}
    admin = {"Authorization": f"Bearer {token_for(roles=('ADMIN',))}"}
    assert client.get("/v1/admin/data/summary", headers=farmer).status_code == 403
    assert client.get("/v1/admin/data/summary", headers={"X-Internal-Token": INTERNAL}).status_code == 403
    body = client.get("/v1/admin/data/summary", headers=admin).json()
    assert body["supportedDistricts"] == 2 and body["lastYear"] == 2014 and "UNVERIFIED" in body["datasetLicenseStatus"]
