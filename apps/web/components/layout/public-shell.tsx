"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { useT } from "@/lib/i18n/provider";
import { buttonClass } from "@/components/ui/button";

export function SkipLink() {
  const t = useT();
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-md bg-forest px-4 py-3 text-surface focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
    >
      {t("common.skipToContent")}
    </a>
  );
}

export function PublicShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  const t = useT();
  return (
    <>
      <SkipLink />
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <Brand />
          <nav aria-label={t("nav.public")} className="flex items-center gap-2 sm:gap-4">
            <Link href="/how-it-works" className="hidden min-h-11 items-center px-2 text-sm font-semibold text-ink2 hover:text-forest sm:flex">
              {t("nav.howItWorks")}
            </Link>
            <LanguageSwitcher />
            <Link href="/login" className={buttonClass("secondary", "hidden sm:inline-flex")}>
              {t("auth.login")}
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={narrow ? "mx-auto max-w-md px-4 py-10 sm:px-0" : "mx-auto max-w-6xl px-4 py-10 sm:px-8"}>
        {children}
      </main>
      <footer className="mx-auto max-w-6xl border-t border-line px-4 py-8 text-sm text-muted sm:px-8">
        <p className="font-serif italic text-olive-ink">{t("footer.tagline")}</p>
        <p className="mt-1">{t("footer.weatherCredit")}</p>
      </footer>
    </>
  );
}
