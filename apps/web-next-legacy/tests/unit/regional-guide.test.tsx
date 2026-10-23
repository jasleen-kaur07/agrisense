import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegionalGuide } from "@/components/advice/RegionalGuide";
import { I18nProvider } from "@/lib/i18n/provider";
import type { RegionalGuide as Guide } from "@/lib/api/types";

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

describe("RegionalGuide", () => {
  for (const lang of ["en", "hi"] as const) {
    it(`renders caveats, coverage and fallback notice (${lang})`, () => {
      const { container } = render(
        <I18nProvider initialLang={lang} explicit>
          <RegionalGuide guide={guide} limitations={["An extra limitation."]} />
        </I18nProvider>,
      );
      const text = container.textContent ?? "";
      for (const c of [...guide.caveats, "An extra limitation."]) expect(text).toContain(c);
      expect(text).toContain("Demo Crop A");
      expect(text).toContain("Demo Perennial");
      expect(text).toContain("2018–2020");
      expect(container.querySelector("[role=note]")).not.toBeNull(); // state fallback notice
      for (const re of BANNED) expect(text).not.toMatch(re);
    });
  }

  it("labels the figure as historical prevalence in English", () => {
    const { getAllByText } = render(<RegionalGuide guide={guide} />);
    expect(getAllByText("historical prevalence").length).toBeGreaterThan(0);
  });
});
