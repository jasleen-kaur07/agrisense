"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Menu, WifiOff, X } from "lucide-react";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { SkipLink } from "./public-shell";
import { buildNav, type NavLeaf } from "./nav-config";
import { useI18n } from "@/lib/i18n/provider";
import { useMe, useOnline } from "@/lib/hooks/queries";
import { ErrorPanel, SkeletonBlock } from "@/components/data/states";
import { cn } from "@/lib/cn";

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

function DesktopMenu({ label, items, path }: { label: string; items: NavLeaf[]; path: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.some((i) => isActive(path, i.href));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-11 items-center gap-1 border-b-2 px-3 text-sm font-semibold",
          active ? "border-olive-ink text-olive-ink" : "border-transparent text-ink2 hover:text-forest",
        )}
      >
        {t(label)}
        <ChevronDown aria-hidden className="h-4 w-4" />
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-30 mt-1 min-w-52 rounded-lg border border-line-dark bg-surface p-1">
          {items.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(path, i.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm",
                  isActive(path, i.href) ? "bg-sage font-semibold text-olive-ink" : "text-ink hover:bg-sage2",
                )}
              >
                {t(i.key)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, hasExplicitChoice } = useI18n();
  const path = usePathname();
  const router = useRouter();
  const me = useMe();
  const online = useOnline();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = me.data;
  const isAdmin = !!user?.roles.includes("ADMIN");
  const nav = buildNav(isAdmin);
  const inOnboarding = path.startsWith("/onboarding");

  useEffect(() => {
    if (user && !hasExplicitChoice && user.language !== lang) setLang(user.language);
  }, [user, hasExplicitChoice, lang, setLang]);

  useEffect(() => {
    if (user && !user.onboardingCompleted && !inOnboarding) router.replace("/onboarding");
  }, [user, inOnboarding, router]);

  useEffect(() => {
    // Close the mobile panel whenever the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [path]);

  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Brand href={user?.onboardingCompleted ? "/overview" : "/"} />
          {!inOnboarding && user && (
            <nav aria-label={t("nav.main")} className="hidden items-center gap-1 md:flex">
              {nav.map((item) =>
                "menu" in item ? (
                  <DesktopMenu key={item.key} label={item.key} items={item.menu} path={path} />
                ) : (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={isActive(path, item.href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold",
                      isActive(path, item.href) ? "border-olive-ink text-olive-ink" : "border-transparent text-ink2 hover:text-forest",
                    )}
                  >
                    {t(item.key)}
                  </Link>
                ),
              )}
            </nav>
          )}
          <div className="flex items-center gap-2">
            <LanguageSwitcher signedIn={!!user} />
            {!inOnboarding && user && (
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-line-dark bg-surface md:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
        {mobileOpen && user && (
          <nav id="mobile-nav" aria-label={t("nav.main")} className="border-t border-line bg-surface px-4 pb-4 md:hidden">
            <ul className="space-y-1 py-2">
              {nav.map((item) =>
                "menu" in item ? (
                  <li key={item.key}>
                    <p className="px-3 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-olive-ink">{t(item.key)}</p>
                    <ul>
                      {item.menu.map((i) => (
                        <li key={i.href}>
                          <Link
                            href={i.href}
                            aria-current={isActive(path, i.href) ? "page" : undefined}
                            className={cn("flex min-h-11 items-center rounded-md px-3 text-[15px]", isActive(path, i.href) ? "bg-sage font-semibold text-olive-ink" : "text-ink")}
                          >
                            {t(i.key)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={isActive(path, item.href) ? "page" : undefined}
                      className={cn("flex min-h-11 items-center rounded-md px-3 text-[15px] font-semibold", isActive(path, item.href) ? "bg-sage text-olive-ink" : "text-ink")}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        )}
      </header>

      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-ochre-soft px-4 py-2 text-sm text-ochre-ink">
          <WifiOff aria-hidden className="h-4 w-4" />
          {t("errors.offlineBanner")}
        </div>
      )}

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        {me.isPending ? (
          <SkeletonBlock rows={4} />
        ) : me.isError ? (
          <ErrorPanel error={me.error} onRetry={() => void me.refetch()} />
        ) : !me.data.onboardingCompleted && !inOnboarding ? (
          <SkeletonBlock rows={2} />
        ) : (
          children
        )}
      </main>
      <footer className="mx-auto max-w-6xl border-t border-line px-4 py-6 text-sm text-muted sm:px-8">
        <p className="font-serif italic text-olive-ink">{t("footer.tagline")}</p>
      </footer>
    </>
  );
}
