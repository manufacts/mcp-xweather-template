import type { UserContext } from "mcp-use";

/** Client hints personalize a map; they are never identity or authorization. */
export function clientLocationQuery(location: UserContext["location"]): string | undefined {
  if (!location) return;
  const coordinate = (value: unknown, limit: number) => {
    if (typeof value !== "number" && typeof value !== "string") return;
    if (typeof value === "string" && !value.trim()) return;
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) <= limit ? n : undefined;
  };
  const lat = coordinate(location.latitude, 90), lon = coordinate(location.longitude, 180);
  if (lat !== undefined && lon !== undefined) return `${lat},${lon}`;
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const city = text(location.city);
  if (!city) return;
  // Xweather expects city,state for US cities and city,country elsewhere.
  const country = text(location.country);
  const region = country.toUpperCase() === "US" ? text(location.region) || country : country || text(location.region);
  const query = [city, region].filter(Boolean).join(",");
  return query.length >= 2 && query.length <= 160 ? query : undefined;
}

export function mapPlaces(location: string | undefined, locations: string[] | undefined, hint: UserContext["location"], dashboard = false) {
  const explicit = location ?? locations?.[0];
  if (explicit) return { location: explicit, locations: locations?.length ? locations : [explicit], locationSource: "explicit" as const };
  const nearby = clientLocationQuery(hint);
  if (nearby) return { location: nearby, locations: [nearby], locationSource: "client" as const };
  return { location: "dallas,tx", locations: dashboard ? ["dallas,tx", "arlington,tx", "plano,tx"] : ["dallas,tx"], locationSource: "fallback" as const };
}
