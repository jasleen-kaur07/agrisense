export interface NavLeaf {
  href: string;
  key: string;
}
export type NavItem = { key: string; href: string } | { key: string; menu: NavLeaf[] };

export const INSIGHTS_MENU: NavLeaf[] = [
  { href: "/insights/weather", key: "nav.weather" },
  { href: "/insights/prediction", key: "nav.prediction" },
  { href: "/insights/fertilizer", key: "nav.fertilizer" },
  { href: "/insights/market", key: "nav.market" },
];

export const MORE_MENU: NavLeaf[] = [
  { href: "/more/regional", key: "nav.regional" },
  { href: "/more/season", key: "nav.season" },
  { href: "/more/history", key: "nav.history" },
  { href: "/more/alerts", key: "nav.alerts" },
  { href: "/more/schemes", key: "nav.schemes" },
  { href: "/more/settings", key: "nav.settings" },
];

export function buildNav(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { key: "nav.overview", href: "/overview" },
    { key: "nav.cropAdvice", href: "/crop-advice" },
    { key: "nav.insights", menu: INSIGHTS_MENU },
    { key: "nav.more", menu: MORE_MENU },
  ];
  // UX only: the backend enforces ADMIN on every /admin endpoint.
  if (isAdmin) items.push({ key: "nav.admin", href: "/admin" });
  return items;
}
