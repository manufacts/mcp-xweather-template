import "dotenv/config";
import process from "node:process";
import { z } from "zod";
import { dashboardSchema, locationSchema, siteSchema, type WeatherLocation, type WeatherPeriod, type WeatherSite } from "../views/shared/schema.js";

export function dataMode(): "live" | "demo" {
  if (process.env.WEATHER_MODE === "demo") return "demo";
  if (process.env.WEATHER_MODE === "live") return "live";
  return process.env.XWEATHER_CLIENT_ID && process.env.XWEATHER_CLIENT_SECRET ? "live" : "demo";
}
export function mapMetadata() {
  // Browser-scoped credentials only. Never fall back to the server secret.
  const clientId = process.env.XWEATHER_MAPSGL_CLIENT_ID;
  const clientSecret = process.env.XWEATHER_MAPSGL_CLIENT_SECRET;
  return clientId && clientSecret && process.env.XWEATHER_MAPSGL_RESTRICTED === "true" ? { mapsCredential: { clientId, clientSecret } } : {};
}
const record = z.record(z.string(), z.unknown());
const asRecord = (v: unknown) => record.safeParse(v).data ?? {};
const asArray = (v: unknown): unknown[] => Array.isArray(v) ? v : v ? [v] : [];
const str = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const iso = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? new Date(v * 1000).toISOString() : null;
const cache = new Map<string, { expires: number; data: unknown }>();

export async function weatherRequest(endpoint: string, location: string, params: Record<string, string> = {}): Promise<unknown> {
  const clientId = process.env.XWEATHER_CLIENT_ID, clientSecret = process.env.XWEATHER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configure XWEATHER_CLIENT_ID and XWEATHER_CLIENT_SECRET for live weather.");
  const cacheKey = JSON.stringify([endpoint, location, params]);
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.data;
  const url = new URL(`https://data.api.xweather.com/${endpoint}/${encodeURIComponent(location)}`);
  url.search = new URLSearchParams({ ...params, client_id: clientId, client_secret: clientSecret }).toString();
  let response: Response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error("Xweather could not be reached. Please retry shortly."); }
  if (!response.ok) throw new Error(`Xweather request failed (HTTP ${response.status}). Check credentials, subscription access, or usage limits.`);
  let body: Record<string, unknown>;
  try { body = asRecord(await response.json()); } catch { throw new Error("Xweather returned an unreadable response."); }
  if (!body.success) {
    const code = str(asRecord(body.error).code);
    if (code === "warn_no_data" && ["alerts", "stormcells"].includes(endpoint)) return [];
    // Upstream error text and URLs can contain credentials; do not forward them.
    throw new Error(code === "warn_no_data" ? "No weather data is available for this location." : "Xweather rejected this request. Check location, credentials, subscription, and usage limits.");
  }
  if (cache.size > 300) cache.clear();
  cache.set(cacheKey, { expires: Date.now() + (endpoint === "places" ? 3600000 : 300000), data: body.response });
  return body.response;
}

export const demoLocations: WeatherLocation[] = [
  { name: "Dallas", country: "US", latitude: 32.7767, longitude: -96.797, timezone: "America/Chicago", query: "dallas,tx" },
  { name: "Arlington", country: "US", latitude: 32.7357, longitude: -97.1081, timezone: "America/Chicago", query: "arlington,tx" },
  { name: "Plano", country: "US", latitude: 33.0198, longitude: -96.6989, timezone: "America/Chicago", query: "plano,tx" },
  { name: "Miami", country: "US", latitude: 25.7617, longitude: -80.1918, timezone: "America/New_York", query: "miami,fl" },
  { name: "Tampa", country: "US", latitude: 27.9506, longitude: -82.4572, timezone: "America/New_York", query: "tampa,fl" },
  { name: "Orlando", country: "US", latitude: 28.5383, longitude: -81.3792, timezone: "America/New_York", query: "orlando,fl" },
  { name: "Zurich", country: "CH", latitude: 47.3769, longitude: 8.5417, timezone: "Europe/Zurich", query: "zurich,ch" },
  { name: "Milan", country: "IT", latitude: 45.4642, longitude: 9.19, timezone: "Europe/Rome", query: "milan,it" },
  { name: "Munich", country: "DE", latitude: 48.1351, longitude: 11.582, timezone: "Europe/Berlin", query: "munich,de" },
];
export async function resolveLocation(query: string): Promise<WeatherLocation> {
  if (dataMode() === "demo") {
    const term = query.trim().toLowerCase().replace("zürich", "zurich");
    const found = demoLocations.find(p => p.query === term || p.name.toLowerCase() === term);
    if (!found) throw new Error("Sample mode supports Dallas, Arlington, Plano, Miami, Tampa, Orlando, Zurich, Milan, and Munich. Configure Xweather for worldwide search.");
    return found;
  }
  const response = asRecord(asArray(await weatherRequest("places", query.trim()))[0]);
  const place = asRecord(response.place), loc = asRecord(response.loc), profile = asRecord(response.profile);
  const parsed = locationSchema.safeParse({ name: str(place.name, query), country: str(place.country), latitude: loc.lat, longitude: loc.long, timezone: str(profile.tz, "UTC"), query: `${loc.lat},${loc.long}` });
  if (!parsed.success) throw new Error("Xweather could not resolve this location. Try city,country or latitude,longitude.");
  return parsed.data;
}
export function normalizePeriod(value: unknown): WeatherPeriod {
  const p = asRecord(value);
  const time = iso(p.timestamp) ?? str(p.dateTimeISO);
  if (!time || !Number.isFinite(Date.parse(time))) throw new Error("Xweather returned weather without a valid observation/forecast time.");
  return { time, temperatureC: num(p.tempC) ?? num(p.avgTempC), feelsLikeC: num(p.feelslikeC) ?? num(p.avgFeelslikeC), windKph: num(p.windSpeedKPH), gustKph: num(p.windGustKPH), humidity: num(p.humidity), precipitationChance: num(p.pop), precipitationMm: num(p.precipMM), summary: str(p.weatherPrimary, str(p.weather, "Conditions unavailable")) };
}
export function signals(current: WeatherPeriod, forecast: WeatherPeriod[], alerts: number, alertsAvailable: boolean) {
  const periods = [current, ...forecast.slice(0, 6)], reasons: string[] = [];
  if (alerts) reasons.push(`${alerts} active official alert${alerts === 1 ? "" : "s"}`);
  if (periods.some(p => Math.max(p.gustKph ?? 0, p.windKph ?? 0) >= 40)) reasons.push("Wind or gusts ≥40 km/h");
  if (periods.some(p => (p.precipitationChance ?? 0) >= 60 || (p.precipitationMm ?? 0) >= 2)) reasons.push("Rain signal in the next 6 hours");
  if (periods.some(p => p.temperatureC !== null && (p.temperatureC >= 35 || p.temperatureC <= 0))) reasons.push("Temperature outside 0–35°C");
  const complete = alertsAvailable && forecast.length >= 6 && periods.every(p => p.temperatureC !== null && (p.windKph !== null || p.gustKph !== null) && (p.precipitationChance !== null || p.precipitationMm !== null));
  return { signal: alerts ? "attention" as const : reasons.length ? "watch" as const : complete ? "normal" as const : "unknown" as const, reasons };
}
function sampleSite(location: WeatherLocation): WeatherSite {
  const index = demoLocations.findIndex(p => p.name === location.name), time = Math.floor(Date.now() / 3600000) * 3600000;
  const forecast: WeatherPeriod[] = Array.from({ length: 12 }, (_, i) => ({ time: new Date(time + i * 3600000).toISOString(), temperatureC: Math.round((index < 3 ? 28 : 18) + 4 * Math.sin(i / 3)), feelsLikeC: index < 3 ? 33 : 19, windKph: 12 + index * 3, gustKph: index === 0 && i > 3 ? 43 : 22, humidity: 68, precipitationChance: index === 0 ? Math.min(90, 20 + i * 12) : index === 1 ? 30 : 10, precipitationMm: index === 0 && i > 3 ? 2.5 : 0, summary: index === 0 ? "Scattered showers" : index === 1 ? "Partly cloudy" : "Mostly sunny" }));
  const current = forecast[0];
  return siteSchema.parse({ location, current, forecast, alerts: [], alertsAvailable: true, ...signals(current, forecast, 0, true), warnings: ["Illustrative sample weather. Not observations or a forecast."], fetchedAt: new Date().toISOString() });
}
export async function getSite(query: string): Promise<WeatherSite> {
  const location = await resolveLocation(query);
  if (dataMode() === "demo") return sampleSite(location);
  const [conditions, outlook, warnings] = await Promise.allSettled([weatherRequest("conditions", location.query), weatherRequest("forecasts", location.query, { filter: "1hr", limit: "12" }), weatherRequest("alerts", location.query, { limit: "10" })]);
  if (conditions.status === "rejected") throw conditions.reason;
  const conditionPeriods = asArray(asRecord(asArray(conditions.value)[0]).periods);
  if (!conditionPeriods.length) throw new Error("Xweather returned no current conditions for this location.");
  const current = normalizePeriod(conditionPeriods[0]);
  const forecast = outlook.status === "fulfilled" ? asArray(asRecord(asArray(outlook.value)[0]).periods).slice(0, 12).map(normalizePeriod) : [];
  const alertsAvailable = warnings.status === "fulfilled";
  const alerts = warnings.status === "fulfilled" ? asArray(warnings.value).map(raw => {
    const a = asRecord(raw), d = asRecord(a.details), t = asRecord(a.timestamps);
    return { title: str(d.name, "Weather alert"), body: str(d.body, str(d.bodyFull)).slice(0, 4000), expires: iso(t.expires), source: "Official alerts via Xweather" };
  }) : [];
  return siteSchema.parse({ location, current, forecast, alerts, alertsAvailable, ...signals(current, forecast, alerts.length, alertsAvailable), fetchedAt: new Date().toISOString(), warnings: [...(!alertsAvailable ? ["Alerts could not be retrieved; absence of warnings is not confirmed."] : []), ...(outlook.status === "rejected" ? ["Hourly forecast could not be retrieved."] : [])] });
}
export async function getDashboard(locations: string[]) {
  const results = await Promise.allSettled(locations.map(getSite)), sites: WeatherSite[] = [], errors: { location: string; message: string }[] = [];
  results.forEach((r, i) => r.status === "fulfilled" ? sites.push(r.value) : errors.push({ location: locations[i], message: r.reason instanceof Error ? r.reason.message : "Weather unavailable." }));
  if (!sites.length) throw new Error(errors.map(e => `${e.location}: ${e.message}`).join(" "));
  return dashboardSchema.parse({ mode: dataMode(), source: dataMode() === "live" ? "Vaisala Xweather Weather API" : "Illustrative sample data", generatedAt: new Date().toISOString(), sites, errors });
}
