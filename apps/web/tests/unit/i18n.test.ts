import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import { flatten, lookup, translate, type Messages } from "@/lib/i18n/core";

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
      expect(ph(fh[k]), `placeholders of ${k}`).toBe(ph(v));
    }
  });
  it("hi file is marked as needing native-speaker review", () => {
    expect(JSON.stringify((hi as Messages)._meta)).toMatch(/NATIVE-SPEAKER REVIEW/i);
  });
  it("every literal t('key') used in source exists", () => {
    const missing: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", ".next", "tests"].includes(e.name) || e.name.startsWith(".")) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name)) {
          const src = fs.readFileSync(p, "utf8");
          for (const m of src.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) if (!lookup(en as Messages, m[1])) missing.push(`${p}: ${m[1]}`);
        }
      }
    };
    for (const d of ["app", "components", "features", "lib"]) walk(path.join(process.cwd(), d));
    expect(missing).toEqual([]);
  });
  it("dynamic key families exist", () => {
    for (const k of ["season.KHARIF", "weather.status.LIVE", "weather.status.CACHED", "weather.status.UNAVAILABLE", "plan.kind.CHECKLIST", "plan.sourceType.GENERAL", "alerts.severity.WATCH", "admin.tab.recs", "feedback.cat.BUG", "nav.marketDesc", "notAvailable.marketWhy", "schemes.pmfby.name"]) {
      expect(lookup(en as Messages, k), k).toBeTruthy();
    }
  });
  it("English guide/result text never uses forbidden claims", () => {
    const text = Object.entries(fe).filter(([k]) => /^(guide|result|overview)\./.test(k)).map(([, v]) => v).join(" ");
    expect(text).not.toMatch(/best crop|suitab|probab|accura|% match/i);
  });
  it("translate falls back to English then to the key", () => {
    expect(translate({}, { a: "x {n}" }, "a", { n: 2 })).toBe("x 2");
    expect(translate({}, {}, "missing.key")).toBe("missing.key");
  });
});
