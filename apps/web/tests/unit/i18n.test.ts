import fs from "node:fs";
import path from "node:path";
import { createI18n } from "vue-i18n";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import hi from "@/i18n/messages/hi.json";
import { flatten, lookup, type Messages } from "@/i18n/core";
import { routes } from "@/router/routes";

const fe = flatten(en as Messages);
const fh = flatten(hi as Messages);

describe("i18n", () => {
  it("en and hi have identical key sets", () => {
    expect(Object.keys(fh).sort()).toEqual(Object.keys(fe).sort());
  });
  it("no empty values and placeholders match", () => {
    for (const [k, v] of Object.entries(fe)) {
      expect(v.trim(), k).not.toBe("");
      expect(fh[k]?.trim(), k).not.toBe("");
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(ph(fh[k]!), `placeholders of ${k}`).toBe(ph(v));
    }
  });
  it("hi file is marked as needing native-speaker review", () => {
    expect(JSON.stringify((hi as Messages)._meta)).toMatch(/NATIVE-SPEAKER REVIEW/i);
  });
  it("every literal t('key') used in source exists", () => {
    const missing: string[] = [];
    let scanned = 0;
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|vue)$/.test(e.name)) {
          scanned++;
          const src = fs.readFileSync(p, "utf8");
          for (const m of src.matchAll(/\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g)) if (!lookup(en as Messages, m[1]!)) missing.push(`${p}: ${m[1]}`);
        }
      }
    };
    walk(path.join(process.cwd(), "src"));
    expect(scanned).toBeGreaterThan(50);
    expect(missing).toEqual([]);
  });
  it("dynamic key families exist", () => {
    for (const k of ["season.KHARIF", "weather.status.LIVE", "weather.status.CACHED", "weather.status.UNAVAILABLE", "plan.kind.CHECKLIST", "plan.sourceType.GENERAL", "alerts.severity.WATCH", "admin.tab.recs", "feedback.cat.BUG", "nav.marketDesc", "notAvailable.marketWhy", "schemes.pmfby.name"]) {
      expect(lookup(en as Messages, k), k).toBeTruthy();
    }
  });
  it("every route has a page title in both languages", () => {
    const keys = new Set<string>();
    const walk = (rs: typeof routes) => rs.forEach((r) => { if (r.meta?.title) keys.add(r.meta.title); if (r.children) walk(r.children); });
    walk(routes);
    expect(keys.size).toBeGreaterThan(10);
    for (const k of keys) {
      expect(lookup(en as Messages, `titles.${k}`), k).toBeTruthy();
      expect(lookup(hi as Messages, `titles.${k}`), k).toBeTruthy();
    }
  });
  it("English guide/result text never uses forbidden claims", () => {
    const text = Object.entries(fe).filter(([k]) => /^(guide|result|overview)\./.test(k)).map(([, v]) => v).join(" ");
    expect(text).not.toMatch(/best crop|suitab|probab|accura|% match/i);
  });
  it("vue-i18n compiles every message, interpolates params, falls back to English, then to the key", () => {
    const i = createI18n({ legacy: false, locale: "hi", fallbackLocale: "en", missingWarn: false, fallbackWarn: false, messages: { en, hi } });
    const t = i.global.t;
    for (const lang of ["en", "hi"] as const) {
      i.global.locale.value = lang;
      for (const [k, v] of Object.entries(lang === "en" ? fe : fh)) {
        const params = Object.fromEntries([...v.matchAll(/\{(\w+)\}/g)].map((m) => [m[1]!, "PARAM"]));
        const out = t(k, params);
        expect(out, `${lang}:${k}`).not.toMatch(/\{\w+\}/);
        expect(out, `${lang}:${k}`).not.toBe(k);
      }
    }
    expect(t("guide.heading", { district: "D", season: "S" })).toContain("D");
    expect(t("no.such.key")).toBe("no.such.key");
    const partial = createI18n({ legacy: false, locale: "hi", fallbackLocale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { a: "x {n}" }, hi: {} } });
    expect(partial.global.t("a", { n: 2 })).toBe("x 2");
  });
});
