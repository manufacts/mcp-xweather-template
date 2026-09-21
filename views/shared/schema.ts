import { z } from "zod";

export const layerIds = ["radar", "satellite-geocolor", "temperatures", "wind-particles", "alerts", "lightning-strikes", "stormcells", "lightning-threats", "hail-threats"] as const;
export const layerSchema = z.enum(layerIds);
export type LayerId = z.infer<typeof layerSchema>;
export const layers = [
  { id: "radar", title: "Radar", subtitle: "Precipitation intensity", color: "#49cfa7" },
  { id: "satellite-geocolor", title: "Satellite", subtitle: "Geocolor cloud imagery", color: "#b5bfea" },
  { id: "temperatures", title: "Temperature", subtitle: "Surface temperature", color: "#f0a56c" },
  { id: "wind-particles", title: "Wind", subtitle: "Speed & direction", color: "#81c9e7" },
  { id: "alerts", title: "Weather alerts", subtitle: "Official warning areas", color: "#e9c47b" },
  { id: "lightning-strikes", title: "Lightning", subtitle: "Observed cloud-to-ground strikes", color: "#facc15" },
  { id: "stormcells", title: "Storm cells", subtitle: "Radar-derived tracks · US coverage", color: "#fb923c" },
  { id: "lightning-threats", title: "Lightning outlook", subtitle: "Thunderstorm potential · next hour", color: "#c084fc" },
  { id: "hail-threats", title: "Hail outlook", subtitle: "Current & forecast hail threat areas", color: "#f472b6" },
] satisfies { id: LayerId; title: string; subtitle: string; color: string }[];
export const locationSchema = z.object({ name: z.string(), country: z.string(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), timezone: z.string(), query: z.string() });
export const periodSchema = z.object({ time: z.string(), temperatureC: z.number().nullable(), feelsLikeC: z.number().nullable(), windKph: z.number().nullable(), gustKph: z.number().nullable(), humidity: z.number().nullable(), precipitationChance: z.number().nullable(), precipitationMm: z.number().nullable(), summary: z.string() });
export const alertSchema = z.object({ title: z.string(), body: z.string(), expires: z.string().nullable(), source: z.string() });
export const siteSchema = z.object({ location: locationSchema, current: periodSchema, forecast: z.array(periodSchema), alerts: z.array(alertSchema), alertsAvailable: z.boolean(), signal: z.enum(["attention", "watch", "normal", "unknown"]), reasons: z.array(z.string()), warnings: z.array(z.string()), fetchedAt: z.string() });
export const dashboardSchema = z.object({ mode: z.enum(["live", "demo"]), source: z.string(), generatedAt: z.string(), sites: z.array(siteSchema), errors: z.array(z.object({ location: z.string(), message: z.string() })) });
export const coordinateSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export const stormSchema = z.object({
  id: z.string(), name: z.string(), latitude: z.number(), longitude: z.number(), observedAt: z.string(),
  distanceKm: z.number().nullable(), reflectivity: z.number().nullable(), speedKph: z.number().nullable(), direction: z.string(),
  hailProbability: z.number().nullable(), hailSizeCm: z.number().nullable(), trait: z.string(),
  track: z.array(coordinateSchema.extend({ time: z.string() })), cone: z.array(coordinateSchema),
});
export const venueSchema = z.object({
  location: locationSchema, temperatureC: z.number().nullable(), windKph: z.number().nullable(), summary: z.string(),
  alerts: z.array(alertSchema), observedAt: z.string(), intersectingStorms: z.array(z.string()),
  exposure: z.enum(["intersects", "outside", "unavailable"]),
});
export const stormContextSchema = z.object({
  generatedAt: z.string(), stormsAvailable: z.boolean(), radiusKm: z.number(), storms: z.array(stormSchema), venues: z.array(venueSchema), warnings: z.array(z.string()),
});
export const mapSchema = z.object({ mode: z.enum(["live", "demo"]), location: locationSchema, locationSource: z.enum(["explicit", "client", "fallback"]).optional(), locale: z.string().optional(), layers: z.array(layerSchema), zoom: z.number().min(2).max(12), start: z.string(), now: z.string(), end: z.string(), mapsConfigured: z.boolean(), context: stormContextSchema });
export type WeatherLocation = z.infer<typeof locationSchema>;
export type WeatherPeriod = z.infer<typeof periodSchema>;
export type WeatherSite = z.infer<typeof siteSchema>;
export type DashboardData = z.infer<typeof dashboardSchema>;
export type MapData = z.infer<typeof mapSchema>;
export type StormCell = z.infer<typeof stormSchema>;
export type StormContext = z.infer<typeof stormContextSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type BrowserCredential = { clientId: string; clientSecret: string };
export function browserCredential(meta: Record<string, unknown> | undefined): BrowserCredential | undefined {
  const result = z.object({ clientId: z.string().min(1), clientSecret: z.string().min(1) }).safeParse(meta?.mapsCredential);
  return result.success ? result.data : undefined;
}
