"use client";

import { Badge } from "@/components/ui/misc";
import { useT } from "@/lib/i18n/provider";
import type { DataStatus } from "@/lib/api/types";

const TONE = { LIVE: "olive", CACHED: "ochre", UNAVAILABLE: "terracotta" } as const;

/** Status badge only: it carries a label, never any weather value. */
export function WeatherStatusBadge({ status }: { status: DataStatus }) {
  const t = useT();
  return (
    <Badge tone={TONE[status] ?? "neutral"} data-testid="weather-status" data-status={status}>
      {t(`weather.status.${status}`)}
    </Badge>
  );
}
