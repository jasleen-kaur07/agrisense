"use client";

import { CloudSun, History, MapPin } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { LinkButton } from "@/components/ui/button";
import { Kicker } from "@/components/ui/misc";

export function Landing() {
  const t = useT();
  const steps = [
    { icon: MapPin, k: "landing.step1" },
    { icon: History, k: "landing.step2" },
    { icon: CloudSun, k: "landing.step3" },
  ];
  return (
    <div className="space-y-20">
      <section className="relative grid gap-10 py-6 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div>
          <Kicker className="mb-3">{t("landing.kicker")}</Kicker>
          <h1 className="text-4xl leading-[1.05] sm:text-6xl">{t("landing.title")}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink2 sm:text-lg">{t("landing.lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/register">{t("landing.cta")}</LinkButton>
            <LinkButton href="/how-it-works" variant="secondary">{t("landing.secondaryCta")}</LinkButton>
          </div>
        </div>
        <div aria-hidden="true" className="relative mx-auto h-64 w-64 rounded-[50%_48%_54%_46%] bg-sage sm:h-72 sm:w-72">
          <svg viewBox="0 0 100 100" className="h-full w-full p-10">
            <path d="M50 12 C74 24 80 52 63 72 C54 82 43 83 35 78 C24 60 28 32 50 12 Z" fill="#19342d" opacity=".9" />
            <path d="M50 20 C47 44 46 64 40 82" stroke="#dfe4d5" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      <section aria-labelledby="how-h">
        <Kicker className="mb-2">{t("landing.howKicker")}</Kicker>
        <h2 id="how-h" className="mb-8 text-3xl">{t("landing.howTitle")}</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, k }, i) => (
            <li key={k} className="border-t border-line-dark pt-5">
              <p className="mb-3 flex items-center gap-2 text-sm text-muted">
                <span className="font-serif text-lg text-olive-ink">{i + 1}</span>
                <Icon aria-hidden className="h-5 w-5 text-olive-ink" />
              </p>
              <h3 className="mb-2 text-xl">{t(`${k}Title`)}</h3>
              <p className="text-[15px] leading-relaxed text-ink2">{t(`${k}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="honest-h" className="rounded-[10px] border border-line bg-surface p-6 sm:p-10">
        <h2 id="honest-h" className="mb-5 text-3xl">{t("landing.honestTitle")}</h2>
        <ul className="grid gap-x-10 gap-y-3 text-[15px] leading-relaxed text-ink2 sm:grid-cols-2">
          {["landing.honest1", "landing.honest2", "landing.honest3", "landing.honest4"].map((k) => (
            <li key={k} className="border-l-2 border-olive pl-4">{t(k)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
