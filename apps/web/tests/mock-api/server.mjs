// DEMO MOCK API for AgriSense web e2e. NOT a real service; every record here is DEMO data.
// Implements just enough of contracts/*.yaml (cookies, CSRF double-submit, problem+json).
import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 8090);
const uuid = () => randomUUID();
const now = () => new Date().toISOString();

const sessions = new Map(); // access token -> user id
const refreshes = new Map(); // refresh token -> user id
const users = new Map(); // id -> user
const creds = new Map(); // email -> {id,password}
const db = { farms: [], fields: [], recs: [], alerts: [], feedback: [] };

const STATES = [{ stateKey: "DEMO STATE", name: "Demo State (DEMO)", districtCount: 2 }];
const DISTRICTS = [
  { stateKey: "DEMO STATE", districtKey: "DEMO DISTRICT A", state: "Demo State (DEMO)", district: "Demo District A", latitude: 20, longitude: 78 },
  { stateKey: "DEMO STATE", districtKey: "DEMO DISTRICT B", state: "Demo State (DEMO)", district: "Demo District B", latitude: 21, longitude: 79 },
];

function guide(state, district, season) {
  const d = DISTRICTS.find((x) => x.districtKey === district) ?? DISTRICTS[0];
  return {
    kind: "REGIONAL_PATTERN", state: d.state, district: d.district, season,
    basis: "DEMO recency-weighted area share (historical prevalence)", asOfYear: 2020,
    crops: [
      { rank: 1, crop: "Demo Crop A", prevalencePct: 41.2, districtPct: 44.0, statePct: 30.1 },
      { rank: 2, crop: "Demo Crop B", prevalencePct: 22.5, districtPct: 20.0, statePct: 25.0 },
      { rank: 3, crop: "Demo Crop C", prevalencePct: 9.8, districtPct: null, statePct: 9.8 },
    ],
    yearRoundCrops: ["Demo Perennial"],
    coverage: { districtRecords: 120, yearsCovered: [2016, 2017, 2018, 2019, 2020], stateFallbackUsed: true, districtWeight: 0.8, firstYear: 2016, lastYear: 2020 },
    caveats: ["DEMO data: historical share of recorded area only; not a forecast.", "Records may lag current practice."],
    sources: ["DEMO dataset"],
  };
}
function weather(unavailable) {
  if (unavailable) return { status: "UNAVAILABLE", source: "Open-Meteo", attribution: "Weather data by Open-Meteo.com", fetchedAt: null, message: "DEMO: weather is unavailable right now." };
  return {
    status: "LIVE", source: "Open-Meteo", attribution: "Weather data by Open-Meteo.com", fetchedAt: now(), timezone: "UTC",
    current: { time: now(), temperatureC: 31.5, humidityPct: 60, precipitationMm: 0, windKmh: 9, weatherCode: 2 },
    daily: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() + i * 864e5).toISOString().slice(0, 10), tempMaxC: 33 + i, tempMinC: 22, precipitationSumMm: i, precipitationProbabilityMaxPct: 10 * i, weatherCode: 3 })),
  };
}

function cookies(req) {
  const out = {};
  for (const p of (req.headers.cookie || "").split(";")) {
    const [k, ...v] = p.trim().split("=");
    if (k) out[k] = v.join("=");
  }
  return out;
}
function send(res, status, body, extra = {}) {
  const isProblem = status >= 400;
  res.writeHead(status, { "content-type": isProblem ? "application/problem+json" : "application/json", "x-mock-api": "DEMO", "x-request-id": uuid(), ...extra });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}
const problem = (res, status, title, detail, errors) =>
  send(res, status, { type: "https://agrisense.local/problems/mock", title, status, detail, traceId: "demo-" + uuid().slice(0, 8), ...(errors ? { errors } : {}) });

function setSession(res, userId) {
  const access = uuid(), refresh = uuid(), csrf = uuid() + uuid();
  sessions.set(access, userId);
  refreshes.set(refresh, userId);
  return [
    `as_access=${access}; Path=/; HttpOnly; SameSite=Strict`,
    `as_refresh=${refresh}; Path=/api/v1/auth; HttpOnly; SameSite=Strict`,
    `as_csrf=${csrf}; Path=/; SameSite=Strict`,
  ];
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const t = Buffer.concat(chunks).toString();
  return t ? JSON.parse(t) : {};
}

const farmView = (f) => f;
const toField = (f) => ({ ...f, farmName: db.farms.find((x) => x.id === f.farmId)?.name });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    const path = url.pathname;
    const method = req.method;
    if (path === "/health") return send(res, 200, { status: "ok", mock: "DEMO" });
    if (path === "/__reset" && method === "POST") {
      sessions.clear(); refreshes.clear(); users.clear(); creds.clear();
      Object.assign(db, { farms: [], fields: [], recs: [], alerts: [], feedback: [] });
      return send(res, 200, { reset: true });
    }
    if (!path.startsWith("/api/v1/")) return problem(res, 404, "Not found");
    const p = path.slice("/api/v1".length);
    const c = cookies(req);
    const body = ["POST", "PUT", "PATCH"].includes(method) ? await readBody(req) : {};

    const PUBLIC_POST = ["/auth/login", "/auth/register", "/auth/forgot", "/auth/reset"];
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !PUBLIC_POST.includes(p)) {
      if (!c.as_csrf || req.headers["x-csrf-token"] !== c.as_csrf) return problem(res, 403, "CSRF check failed", "Missing or wrong X-CSRF-Token");
    }

    if (p === "/auth/register" && method === "POST") {
      if (creds.has(body.email)) return problem(res, 409, "Conflict", "Email already registered");
      if (!body.password || body.password.length < 10) return problem(res, 422, "Validation failed", "invalid", [{ field: "password", message: "must be at least 10 characters" }]);
      const id = uuid();
      const u = { id, email: body.email, displayName: body.displayName ?? null, roles: body.email === "admin@demo.test" ? ["ADMIN"] : ["FARMER"], language: body.language ?? "en", onboardingCompleted: false, enabled: true, createdAt: now(), profile: {} };
      users.set(id, u); creds.set(body.email, { id, password: body.password });
      return send(res, 201, pub(u), { "set-cookie": setSession(res, id) });
    }
    if (p === "/auth/login" && method === "POST") {
      const cr = creds.get(body.email);
      if (!cr || cr.password !== body.password) return problem(res, 401, "Unauthorized", "Invalid credentials");
      return send(res, 200, pub(users.get(cr.id)), { "set-cookie": setSession(res, cr.id) });
    }
    if (p === "/auth/forgot" && method === "POST") return send(res, 202);
    if (p === "/auth/reset" && method === "POST") return body.token === "demo-token" ? send(res, 204) : problem(res, 400, "Invalid token");
    if (p === "/auth/refresh" && method === "POST") {
      const uid = refreshes.get(c.as_refresh);
      if (!uid) return problem(res, 401, "Unauthorized");
      refreshes.delete(c.as_refresh);
      return send(res, 204, undefined, { "set-cookie": setSession(res, uid) });
    }
    if (p === "/auth/logout" && method === "POST") {
      sessions.delete(c.as_access); refreshes.delete(c.as_refresh);
      return send(res, 204, undefined, { "set-cookie": ["as_access=; Path=/; Max-Age=0", "as_refresh=; Path=/api/v1/auth; Max-Age=0", "as_csrf=; Path=/; Max-Age=0"] });
    }

    const uid = sessions.get(c.as_access);
    const me = uid && users.get(uid);
    if (!me) return problem(res, 401, "Unauthorized", "Authentication required");
    const mine = (x) => x.userId === me.id;

    if (p === "/auth/me") return send(res, 200, pub(me));
    if (p === "/profile") {
      if (method === "PUT") {
        for (const k of ["displayName", "language", "onboardingCompleted"]) if (k in body) me[k] = body[k];
        for (const k of ["experienceLevel", "preferredStateKey", "preferredDistrictKey"]) if (k in body) me.profile[k] = body[k];
      }
      return send(res, 200, { displayName: me.displayName, language: me.language, onboardingCompleted: me.onboardingCompleted, ...me.profile });
    }

    if (p === "/locations/states") return send(res, 200, STATES);
    if (p === "/locations/districts") return send(res, 200, DISTRICTS.filter((d) => d.stateKey === url.searchParams.get("state")));
    if (p === "/locations/search") return send(res, 200, DISTRICTS.filter((d) => d.district.toLowerCase().includes((url.searchParams.get("q") || "").toLowerCase())));
    if (p === "/locations/nearest") {
      const lat = Number(url.searchParams.get("lat"));
      if (!Number.isFinite(lat) || lat < 5) return problem(res, 404, "Not found", "No supported district nearby");
      return send(res, 200, { ...DISTRICTS[0], distanceKm: 12.3 });
    }
    let m;
    if ((m = p.match(/^\/locations\/([^/]+)\/([^/]+)$/))) {
      const d = DISTRICTS.find((x) => x.stateKey === decodeURIComponent(m[1]) && x.districtKey === decodeURIComponent(m[2]));
      return d ? send(res, 200, d) : problem(res, 404, "Not found");
    }
    if (p === "/seasons/current") return send(res, 200, { season: "KHARIF", next: "RABI", months: [6, 7, 8, 9, 10], rule: "DEMO: simplified calendar-month convention, not a regional sowing calendar." });
    if (p === "/regional/guide") return send(res, 200, guide(url.searchParams.get("state"), url.searchParams.get("district"), url.searchParams.get("season")));
    if (p === "/weather") return send(res, 200, weather(url.searchParams.get("district") === "DEMO DISTRICT B"));

    if (p === "/farms") {
      if (method === "POST") {
        const d = DISTRICTS.find((x) => x.districtKey === body.districtKey);
        if (!body.name || !d) return problem(res, 422, "Validation failed", "invalid", [{ field: "districtKey", message: "unsupported district" }]);
        const f = { id: uuid(), userId: me.id, name: body.name, stateKey: d.stateKey, districtKey: d.districtKey, state: d.state, district: d.district, latitude: d.latitude, longitude: d.longitude, createdAt: now() };
        db.farms.push(f);
        return send(res, 201, farmView(f));
      }
      return send(res, 200, db.farms.filter(mine).map(farmView));
    }
    if ((m = p.match(/^\/farms\/([^/]+)$/))) {
      const f = db.farms.find((x) => x.id === m[1] && mine(x));
      if (!f) return problem(res, 404, "Not found");
      if (method === "PUT") Object.assign(f, { name: body.name });
      if (method === "DELETE") { db.farms = db.farms.filter((x) => x !== f); db.fields = db.fields.filter((x) => x.farmId !== f.id); return send(res, 204); }
      return send(res, 200, f);
    }
    if ((m = p.match(/^\/farms\/([^/]+)\/fields$/)) && method === "POST") {
      const f = db.farms.find((x) => x.id === m[1] && mine(x));
      if (!f) return problem(res, 404, "Not found");
      if (!(body.areaAcres > 0)) return problem(res, 422, "Validation failed", "invalid", [{ field: "areaAcres", message: "must be greater than 0" }]);
      const fl = { id: uuid(), userId: me.id, farmId: f.id, name: body.name, areaAcres: body.areaAcres, soil: body.soil ?? null, soilSource: body.soil ? "USER" : null, createdAt: now() };
      db.fields.push(fl);
      return send(res, 201, toField(fl));
    }
    if (p === "/fields") return send(res, 200, db.fields.filter(mine).map(toField));
    if ((m = p.match(/^\/fields\/([^/]+)(\/soil)?$/))) {
      const f = db.fields.find((x) => x.id === m[1] && mine(x));
      if (!f) return problem(res, 404, "Not found");
      if (m[2]) {
        if (method === "PUT") { f.soil = body; f.soilSource = "USER"; return send(res, 200, toField(f)); }
        f.soil = null; f.soilSource = null; return send(res, 204);
      }
      if (method === "PUT") Object.assign(f, { name: body.name, areaAcres: body.areaAcres });
      if (method === "DELETE") { db.fields = db.fields.filter((x) => x !== f); return send(res, 204); }
      return send(res, 200, toField(f));
    }

    if (p === "/recommendations" && method === "POST") {
      const f = db.fields.find((x) => x.id === body.fieldId && mine(x));
      if (!f) return problem(res, 404, "Not found", "Field not found");
      const farm = db.farms.find((x) => x.id === f.farmId);
      const season = body.season ?? "KHARIF";
      const rec = {
        id: uuid(), userId: me.id, fieldId: f.id, fieldName: f.name, kind: "REGIONAL_PATTERN", season,
        location: { state: farm.state, district: farm.district, stateKey: farm.stateKey, districtKey: farm.districtKey },
        regional: guide(farm.stateKey, farm.districtKey, season), weather: weather(farm.districtKey === "DEMO DISTRICT B"),
        soilUsed: false, limitations: ["DEMO limitation: no yield, price or suitability information is provided."], createdAt: now(),
      };
      db.recs.unshift(rec);
      return send(res, 201, rec);
    }
    if (p === "/recommendations") {
      const items = db.recs.filter(mine);
      return send(res, 200, { items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 });
    }
    if ((m = p.match(/^\/recommendations\/([^/]+)(\/compare|\/plan)?$/))) {
      const r = db.recs.find((x) => x.id === m[1] && mine(x));
      if (!r) return problem(res, 404, "Not found");
      if (!m[2]) { if (method === "DELETE") { db.recs = db.recs.filter((x) => x !== r); return send(res, 204); } return send(res, 200, r); }
      if (m[2] === "/compare") {
        const crops = (url.searchParams.get("crops") || "").split(",").filter(Boolean);
        if (crops.length < 2 || crops.length > 4) return problem(res, 422, "Validation failed", "choose 2 to 4 crops");
        const row = (label, f) => ({ label, source: "DEMO regional records", values: crops.map((cn) => { const c = r.regional.crops.find((x) => x.crop === cn); return c ? f(c) : null; }) });
        return send(res, 200, { crops, rows: [row("Historical prevalence", (c) => `${c.prevalencePct}%`), row("State share", (c) => `${c.statePct}%`)], notes: ["DEMO: data-derived columns only."] });
      }
      const crop = body.crop;
      if (!r.regional.crops.some((x) => x.crop === crop)) return problem(res, 422, "Validation failed", "crop not in guide");
      return send(res, 200, {
        crop, disclaimer: "DEMO disclaimer: general information only; check with your local agriculture office.",
        items: [
          { kind: "DATA_INSIGHT", title: "Historical prevalence in your district", detail: "DEMO detail from regional records.", source: { type: "REGIONAL_DATA", label: "DEMO regional records", url: null } },
          { kind: "CHECKLIST", title: "Check local advisory before sowing", detail: "DEMO checklist item.", source: { type: "GENERAL", label: "General" } },
          { kind: "OFFICIAL_RESOURCE", title: "Soil Health Card portal", detail: "Official portal for soil testing.", source: { type: "OFFICIAL_PORTAL", label: "soilhealth.dac.gov.in", url: "https://soilhealth.dac.gov.in/" } },
        ],
      });
    }

    if (p === "/alerts") return send(res, 200, db.alerts.filter(mine));
    if (p === "/feedback" && method === "POST") { db.feedback.push({ ...body, id: uuid(), createdAt: now() }); return send(res, 201); }

    if (p.startsWith("/admin/")) {
      if (!me.roles.includes("ADMIN")) return problem(res, 403, "Forbidden");
      if (p === "/admin/stats") return send(res, 200, { users: users.size, farms: db.farms.length, fields: db.fields.length, recommendations: db.recs.length, feedback: db.feedback.length });
      if (p === "/admin/users") return send(res, 200, { items: [...users.values()].map(pub), page: 0, size: 20, totalItems: users.size, totalPages: 1 });
      if (p === "/admin/recommendations") return send(res, 200, { items: db.recs, page: 0, size: 20, totalItems: db.recs.length, totalPages: 1 });
      if (p === "/admin/feedback") return send(res, 200, db.feedback);
      if (p === "/admin/data/summary") return send(res, 200, { districts: 2, supportedDistricts: 2, statRows: 0, firstYear: 2016, lastYear: 2020, weatherCacheEntries: 0, datasetLicenseStatus: "DEMO" });
      if ((m = p.match(/^\/admin\/users\/([^/]+)$/)) && method === "PATCH") {
        const u = users.get(m[1]); if (!u) return problem(res, 404, "Not found");
        if ("enabled" in body) u.enabled = body.enabled;
        return send(res, 200, pub(u));
      }
    }
    return problem(res, 404, "Not found", `${method} ${p}`);
  } catch (e) {
    return problem(res, 500, "Mock error", String(e));
  }
});

function pub(u) {
  const rest = { ...u };
  delete rest.profile;
  return rest;
}

server.listen(PORT, process.env.MOCK_HOST || "127.0.0.1", () => console.log(`DEMO mock API listening on ${PORT}`));
