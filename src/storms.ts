import { stormContextSchema, type StormCell, type WeatherLocation } from "../views/shared/schema.js";
import { dataMode, getSite, weatherRequest } from "./weather.js";

const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" ? v as Record<string, unknown> : {};
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
function coordinate(v: unknown) {
  const p = obj(v), latitude = num(p.lat), longitude = num(p.long);
  return latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}
function time(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? new Date(v * 1000).toISOString() : null;
}
export function normalizeStorm(value: unknown): StormCell | null {
  const raw = obj(value), ob = obj(raw.ob), loc = coordinate(raw.loc), observedAt = time(ob.timestamp);
  if (!loc || !observedAt || !str(raw.id)) return null;
  const forecast = obj(raw.forecast), movement = obj(ob.movement), hail = obj(ob.hail), traits = obj(raw.traits);
  return {
    id: str(raw.id), name: str(ob.location, str(obj(raw.place).name, "Storm cell")), ...loc, observedAt,
    distanceKm: num(obj(raw.relativeTo).distanceKM), reflectivity: num(ob.dbzm), speedKph: num(movement.speedKPH), direction: str(movement.dirTo),
    hailProbability: num(hail.prob), hailSizeCm: num(hail.maxSizeCM), trait: str(traits.type, "general"),
    track: arr(forecast.locs).flatMap(p => { const c = coordinate(p), t = time(obj(p).timestamp); return c && t ? [{ ...c, time: t }] : []; }),
    cone: arr(obj(forecast.cone).wide).flatMap(p => { const c = coordinate(p); return c ? [c] : []; }),
  };
}
/** Ray casting with an inclusive boundary; the provider's US storm cones do not cross the antimeridian. */
export function inCone(point: { latitude: number; longitude: number }, polygon: { latitude: number; longitude: number }[]) {
  if (polygon.length < 3) return false;
  const x = point.longitude, y = point.latitude;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const cross = (x-a.longitude)*(b.latitude-a.latitude)-(y-a.latitude)*(b.longitude-a.longitude);
    if (Math.abs(cross)<1e-9 && x>=Math.min(a.longitude,b.longitude) && x<=Math.max(a.longitude,b.longitude) && y>=Math.min(a.latitude,b.latitude) && y<=Math.max(a.latitude,b.latitude)) return true;
    if ((a.latitude>y)!==(b.latitude>y) && x<(b.longitude-a.longitude)*(y-a.latitude)/(b.latitude-a.latitude)+a.longitude) inside=!inside;
  }
  return inside;
}
export async function getStormContext(location: WeatherLocation, queries: string[]) {
  const warnings: string[] = [], radiusKm = 400;
  const [cells, sites] = await Promise.all([
    dataMode() === "demo" ? Promise.resolve({ status: "rejected" as const, reason: new Error("Live storm observations are not available in sample mode.") }) :
      weatherRequest("stormcells", "closest", { p: `${location.latitude},${location.longitude}`, radius: `${radiusKm}km`, limit: "30" })
        .then(value => ({ status: "fulfilled" as const, value }), () => ({ status: "rejected" as const, reason: new Error("Storm-cell data is unavailable here. Coverage is US, Puerto Rico and Guam; account access also applies.") })),
    Promise.allSettled(queries.map(getSite)),
  ]);
  const storms = cells.status === "fulfilled" ? arr(cells.value).map(normalizeStorm).filter((s): s is StormCell => s !== null) : [];
  if (cells.status === "rejected") warnings.push(cells.reason.message);
  const fresh = storms.filter(s => Date.now()-Date.parse(s.observedAt)<30*60000 && s.track.some(p => Date.parse(p.time)>=Date.now()) && s.cone.length>=3);
  const venues = sites.flatMap((r,i) => {
    if (r.status === "rejected") { warnings.push(`Could not retrieve weather for ${queries[i]}.`); return []; }
    const s=r.value, intersectingStorms=fresh.filter(c=>inCone(s.location,c.cone)).map(c=>c.id);
    warnings.push(...s.warnings.map(w=>`${s.location.name}: ${w}`));
    return [{ location:s.location, temperatureC:s.current.temperatureC, windKph:s.current.windKph, summary:s.current.summary, alerts:s.alerts,
      observedAt:s.current.time, intersectingStorms, exposure: intersectingStorms.length ? "intersects" as const : fresh.length ? "outside" as const : "unavailable" as const }];
  });
  return stormContextSchema.parse({generatedAt:new Date().toISOString(),stormsAvailable:cells.status === "fulfilled",radiusKm,storms,venues,warnings});
}
