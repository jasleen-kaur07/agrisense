"""Real-stack API tests: browser-equivalent calls through the gateway (http://localhost:8080).

Run (stack must be up):  services/data-service/.venv/bin/python -m pytest tests/e2e/api -q
Uses the dev bootstrap admin from .env (ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD).
"""
import os
import re
import uuid
from pathlib import Path

import httpx
import pytest

BASE = os.getenv("GATEWAY", "http://localhost:8080")
ORIGIN = "http://localhost:3000"
ENV = dict(re.findall(r"^([A-Z_]+)=(.*)$", (Path(__file__).resolve().parents[3] / ".env").read_text(), re.M))
PW = "Correct-horse-battery-9"


class Session:
    def __init__(self):
        # distinct client IP per simulated browser so the (working) rate limiter does not throttle the suite
        ip = f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250 + 1}"
        self.c = httpx.Client(base_url=BASE, timeout=30, headers={"Origin": ORIGIN, "X-Forwarded-For": ip})

    def csrf(self):
        return {"X-CSRF-Token": self.c.cookies.get("as_csrf") or ""}

    def get(self, path, **kw):
        return self.c.get("/api/v1" + path, **kw)

    def post(self, path, json=None, csrf=True, **kw):
        h = {**(self.csrf() if csrf else {}), **kw.pop("headers", {})}
        return self.c.post("/api/v1" + path, json=json, headers=h, **kw)

    def put(self, path, json=None):
        return self.c.put("/api/v1" + path, json=json, headers=self.csrf())

    def delete(self, path):
        return self.c.delete("/api/v1" + path, headers=self.csrf())


def register(email=None):
    s = Session()
    email = email or f"e2e-{uuid.uuid4().hex[:10]}@example.com"
    r = s.post("/auth/register", {"email": email, "password": PW, "displayName": "E2E Farmer", "language": "en"}, csrf=False)
    assert r.status_code == 201, r.text
    return s, email


@pytest.fixture(scope="module")
def farmer():
    return register()


def test_gateway_and_unauthenticated_access():
    assert httpx.get(BASE + "/ready").status_code == 200
    r = httpx.get(BASE + "/api/v1/farms")
    assert r.status_code == 401 and r.headers["content-type"].startswith("application/problem+json") and r.json()["traceId"]
    assert httpx.get(BASE + "/internal/v1/models").status_code == 404
    assert httpx.get(BASE + "/api/.well-known/jwks.json").status_code in (401, 404)


def test_register_sets_secure_cookies_and_me(farmer):
    s, email = farmer
    names = {c.name for c in s.c.cookies.jar}
    assert {"as_access", "as_refresh", "as_csrf"} <= names
    me = s.get("/auth/me").json()
    assert me["email"] == email and me["roles"] == ["FARMER"] and me["onboardingCompleted"] is False


def test_cookie_attributes():
    s = Session()
    r = s.post("/auth/register", {"email": f"e2e-{uuid.uuid4().hex[:10]}@example.com", "password": PW}, csrf=False)
    cookies = {h.split("=")[0]: h for h in r.headers.get_list("set-cookie")}
    assert "HttpOnly" in cookies["as_access"] and "SameSite=Strict" in cookies["as_access"]
    assert "HttpOnly" in cookies["as_refresh"] and "Path=/api/v1/auth" in cookies["as_refresh"]
    assert "HttpOnly" not in cookies["as_csrf"]


def test_csrf_and_origin_enforced(farmer):
    s, _ = farmer
    body = {"name": "x", "stateKey": "UTTAR PRADESH", "districtKey": "LUCKNOW"}
    assert s.post("/farms", body, csrf=False).status_code == 403  # no token
    assert s.post("/farms", body, headers={"X-CSRF-Token": "wrong"}).status_code == 403
    assert s.post("/farms", body, headers={"Origin": "http://evil.example"}).status_code == 403


def test_login_failure_is_generic():
    s = Session()
    a = s.post("/auth/login", {"email": "nobody@example.com", "password": PW}, csrf=False)
    _, email = register()
    b = Session().post("/auth/login", {"email": email, "password": "wrong-password-123"}, csrf=False)
    assert a.status_code == b.status_code == 401 and a.json()["detail"] == b.json()["detail"]


def test_profile_and_onboarding_without_soil(farmer):
    s, _ = farmer
    r = s.put("/profile", {"displayName": "Asha", "language": "hi", "experienceLevel": "BEGINNER", "preferredStateKey": "UTTAR PRADESH", "preferredDistrictKey": "LUCKNOW", "onboardingCompleted": True})
    assert r.status_code == 200 and r.json()["onboardingCompleted"] is True and r.json()["language"] == "hi"


def test_locations_and_gps(farmer):
    s, _ = farmer
    states = s.get("/locations/states").json()
    assert any(x["stateKey"] == "UTTAR PRADESH" for x in states) and len(states) >= 25
    ds = s.get("/locations/districts", params={"state": "UTTAR PRADESH"}).json()
    assert any(d["districtKey"] == "LUCKNOW" for d in ds)
    n = s.get("/locations/nearest", params={"lat": 26.85, "lon": 80.95}).json()
    assert n["districtKey"] == "LUCKNOW" and n["distanceKm"] < 30
    assert s.get("/locations/nearest", params={"lat": 25.0, "lon": 55.0}).status_code == 422  # outside India


def test_full_advice_journey_without_soil(farmer):
    s, _ = farmer
    farm = s.post("/farms", {"name": "Home farm", "stateKey": "UTTAR PRADESH", "districtKey": "LUCKNOW"})
    assert farm.status_code == 201, farm.text
    farm = farm.json()
    assert farm["district"] == "Lucknow" and farm["latitude"]
    assert s.post("/farms", {"name": "bad", "stateKey": "UTTAR PRADESH", "districtKey": "ATLANTIS"}).status_code == 422
    field = s.post(f"/farms/{farm['id']}/fields", {"name": "North plot", "areaAcres": 2.5})
    assert field.status_code == 201, field.text
    field = field.json()
    assert "soil" not in field or field["soil"] is None

    key = str(uuid.uuid4())
    rec = s.post("/recommendations", {"fieldId": field["id"], "season": "KHARIF"}, headers={"Idempotency-Key": key})
    assert rec.status_code == 201, rec.text
    rec = rec.json()
    assert rec["kind"] == "REGIONAL_PATTERN" and rec["soilUsed"] is False
    crops = rec["regional"]["crops"]
    assert crops and crops[0]["rank"] == 1 and "prevalencePct" in crops[0]
    cov = rec["regional"]["coverage"]
    assert cov["yearsCovered"] and "stateFallbackUsed" in cov
    assert rec["weather"]["status"] in ("LIVE", "CACHED", "UNAVAILABLE") and rec["weather"]["source"] == "Open-Meteo"
    if rec["weather"]["status"] != "UNAVAILABLE":
        assert len(rec["weather"]["daily"]) == 7 and rec["weather"]["current"]["temperatureC"] is not None
    text = (str(rec["regional"]) + str(rec["limitations"])).lower()  # weather legitimately has rain probability
    assert "probab" not in text and "best crop" not in text and "suitable for your" not in text
    assert any("historical" in x.lower() for x in rec["limitations"])

    again = s.post("/recommendations", {"fieldId": field["id"], "season": "KHARIF"}, headers={"Idempotency-Key": key})
    assert again.status_code == 200 and again.json()["id"] == rec["id"]

    mode = s.post("/recommendations", {"fieldId": field["id"], "mode": "SOIL_TEST"})
    assert mode.status_code == 422

    names = ",".join(c["crop"] for c in crops[:3])
    cmp_ = s.get(f"/recommendations/{rec['id']}/compare", params={"crops": names})
    assert cmp_.status_code == 200, cmp_.text
    labels = " ".join(r["label"].lower() for r in cmp_.json()["rows"])
    assert "prevalence" in labels and "suitab" not in labels and "water" not in labels and "price" not in labels

    plan = s.post(f"/recommendations/{rec['id']}/plan", {"crop": crops[0]["crop"]})
    assert plan.status_code == 200, plan.text
    kinds = {i["kind"] for i in plan.json()["items"]}
    assert {"DATA_INSIGHT", "CHECKLIST", "OFFICIAL_RESOURCE"} <= kinds
    ptext = str(plan.json()).lower()
    assert "dose" not in ptext and "kg/" not in ptext and "irrigat" not in ptext and "not agronomic advice" in ptext

    hist = s.get("/recommendations").json()
    assert hist["totalItems"] >= 1 and any(i["id"] == rec["id"] for i in hist["items"])
    assert s.get(f"/recommendations/{rec['id']}").json()["id"] == rec["id"]


def test_optional_soil_is_stored_never_required(farmer):
    s, _ = farmer
    farm = s.get("/farms").json()[0]
    f = s.post(f"/farms/{farm['id']}/fields", {"name": "Soil plot", "areaAcres": 1}).json()
    r = s.put(f"/fields/{f['id']}/soil", {"ph": 6.8})
    assert r.status_code == 200 and r.json()["soil"]["ph"] == 6.8 and r.json()["soil"].get("nitrogen") is None
    assert s.put(f"/fields/{f['id']}/soil", {"ph": 14}).status_code == 422


def test_weather_endpoint_through_gateway(farmer):
    s, _ = farmer
    w = s.get("/weather", params={"state": "UTTAR PRADESH", "district": "LUCKNOW"}).json()
    assert w["status"] in ("LIVE", "CACHED", "UNAVAILABLE") and "Open-Meteo" in w["attribution"]


def test_ownership_isolation(farmer):
    a, _ = farmer
    b, _ = register()
    farm_a = a.get("/farms").json()[0]
    rec_a = a.get("/recommendations").json()["items"][0]
    assert b.get("/farms").json() == []
    assert b.get(f"/farms/{farm_a['id']}").status_code == 404
    assert b.get(f"/recommendations/{rec_a['id']}").status_code == 404
    assert b.delete(f"/farms/{farm_a['id']}").status_code == 404
    assert a.get(f"/farms/{farm_a['id']}").status_code == 200


def test_admin_authorization_and_access(farmer):
    s, _ = farmer
    for path in ("/admin/stats", "/admin/users", "/admin/recommendations", "/admin/feedback", "/admin/data/summary"):
        assert s.get(path).status_code == 403, path
    admin = Session()
    r = admin.post("/auth/login", {"email": ENV["ADMIN_BOOTSTRAP_EMAIL"], "password": ENV["ADMIN_BOOTSTRAP_PASSWORD"]}, csrf=False)
    assert r.status_code == 200 and "ADMIN" in r.json()["roles"]
    assert admin.get("/admin/stats").json()["recommendations"] >= 1
    assert admin.get("/admin/users").json()["totalItems"] >= 2
    assert admin.get("/admin/data/summary").json()["supportedDistricts"] >= 400
    assert admin.get("/admin/recommendations").status_code == 200
    me = admin.get("/auth/me").json()
    assert admin.c.request("PATCH", f"{BASE}/api/v1/admin/users/{me['id']}", json={"enabled": False}, headers=admin.csrf()).status_code == 403


def test_feedback(farmer):
    s, _ = farmer
    assert s.post("/feedback", {"category": "IDEA", "message": "Please add more crops", "rating": 4}).status_code == 201


def test_refresh_rotation_reuse_and_logout():
    s, _ = register()
    old_refresh = s.c.cookies.get("as_refresh")
    r = s.post("/auth/refresh")
    assert r.status_code == 204 and s.c.cookies.get("as_refresh") != old_refresh
    assert s.get("/auth/me").status_code == 200
    # replaying the already-used refresh token revokes the family
    thief = httpx.Client(base_url=BASE, headers={"Origin": ORIGIN, "X-Forwarded-For": "10.9.9.9"})
    thief.cookies.set("as_refresh", old_refresh, path="/api/v1/auth")
    thief.cookies.set("as_csrf", "x" * 20)
    assert thief.post("/api/v1/auth/refresh", headers={"X-CSRF-Token": "x" * 20}).status_code == 401
    assert s.post("/auth/refresh").status_code == 401  # legitimate holder is also logged out of that family
    s2, _ = register()
    assert s2.post("/auth/logout").status_code == 204
    assert s2.get("/auth/me").status_code == 401


def test_forgot_password_never_reveals_accounts():
    _, email = register()
    a = Session().post("/auth/forgot", {"email": email}, csrf=False)
    b = Session().post("/auth/forgot", {"email": "ghost@example.com"}, csrf=False)
    assert a.status_code == b.status_code == 202


def test_password_reset_with_bad_token():
    assert Session().post("/auth/reset", {"token": "nonsense", "newPassword": PW}, csrf=False).status_code == 400
