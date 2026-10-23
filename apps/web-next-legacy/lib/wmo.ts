/** Maps a WMO weather code to an i18n key (presentation only). */
export function wmoKey(code: number | undefined | null): string {
  if (code === undefined || code === null) return "weather.wmo.unknown";
  if (code === 0) return "weather.wmo.clear";
  if (code <= 2) return "weather.wmo.partlyCloudy";
  if (code === 3) return "weather.wmo.overcast";
  if (code === 45 || code === 48) return "weather.wmo.fog";
  if (code >= 51 && code <= 57) return "weather.wmo.drizzle";
  if (code >= 61 && code <= 67) return "weather.wmo.rain";
  if (code >= 71 && code <= 77) return "weather.wmo.snow";
  if (code >= 80 && code <= 82) return "weather.wmo.showers";
  if (code >= 85 && code <= 86) return "weather.wmo.snow";
  if (code >= 95) return "weather.wmo.thunderstorm";
  return "weather.wmo.unknown";
}
