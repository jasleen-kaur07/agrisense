import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RegionalGuide from "@/components/advice/RegionalGuide.vue";
import { i18n } from "@/i18n";
import type { RegionalGuide as Guide } from "@/lib/api/types";
import { setLocale } from "./helpers";

const guide: Guide = {
  kind: "REGIONAL_PATTERN", state: "Demo State", district: "Demo District", season: "KHARIF",
  basis: "recency-weighted area share (historical prevalence)", asOfYear: 2020,
  crops: [
    { rank: 1, crop: "Demo Crop A", prevalencePct: 41.2, districtPct: 44, statePct: 30 },
    { rank: 2, crop: "Demo Crop B", prevalencePct: 9.8, districtPct: null, statePct: 9.8 },
  ],
  yearRoundCrops: ["Demo Perennial"],
  coverage: { districtRecords: 120, yearsCovered: [2018, 2019, 2020], stateFallbackUsed: true, districtWeight: 0.8, firstYear: 2018, lastYear: 2020 },
  caveats: ["Historical share of recorded area only.", "Records may lag current practice."],
};

const BANNED = [/best crop/i, /suitab/i, /probab/i, /recommended for/i, /accura/i, /match/i];
const mountGuide = (props: { guide: Guide; limitations?: string[] }) => mount(RegionalGuide, { props, global: { plugins: [i18n] } });

describe("RegionalGuide", () => {
  for (const lang of ["en", "hi"] as const) {
    it(`renders caveats, coverage and fallback notice, and no forbidden wording (${lang})`, () => {
      setLocale(lang);
      const w = mountGuide({ guide, limitations: ["An extra limitation."] });
      const text = w.text();
      for (const c of [...guide.caveats, "An extra limitation."]) expect(text).toContain(c);
      expect(text).toContain("Demo Crop A");
      expect(text).toContain("Demo Perennial");
      expect(text).toContain("2018–2020");
      expect(w.find("[role=note]").exists()).toBe(true); // state fallback notice
      expect(w.find("[data-testid=guide-crops]").exists()).toBe(true);
      for (const re of BANNED) expect(text).not.toMatch(re);
    });
  }

  it("labels the figure as historical prevalence in English", () => {
    setLocale("en");
    const w = mountGuide({ guide });
    expect(w.findAll("span").filter((s) => s.text() === "historical prevalence").length).toBeGreaterThan(0);
  });

  it("clamps the bar width and shows state-only wording when there is no district share", () => {
    setLocale("en");
    const w = mountGuide({ guide: { ...guide, crops: [{ rank: 1, crop: "X", prevalencePct: 140, districtPct: null, statePct: 5 }] } });
    expect(w.get("[data-testid=guide-crops] [style]").attributes("style")).toContain("width: 100%");
    expect(w.text()).toContain("district records not used");
  });
});
