import { MCPServer } from "mcp-use";
import { z } from "zod";
import { mapSchema, locationSchema, layerSchema, stormContextSchema } from "./views/shared/schema.js";
import { dataMode, mapMetadata, resolveLocation } from "./src/weather.js";
import { getStormContext } from "./src/storms.js";

const server = new MCPServer({
  name: "xweather-storm-explorer", title: "Xweather Storm Explorer", version: "0.2.0",
  description: "Explore storms, lightning and forecast threats on an interactive Xweather map.",
  instructions: "Use show-weather-map for the Storm Explorer. Optional locations add up to five monitored place pins. Maps include recent observations and one hour of forecast; distinguish those. Storm-cell lists are the latest US radar snapshot. Exposure means intersection with available fresh forecast cones, never a guarantee of safety. Say when data is unavailable or sample. Never request API credentials in tool arguments.",
  websiteUrl: "https://www.xweather.com", icons: [{ src: "xweather.png", mimeType: "image/png", sizes: ["200x200"] }],
});
// Explicit shard hosts also work with MCP hosts that URL-encode CSP wildcards.
const network = [
  "https://data.api.xweather.com", "https://maps.api.xweather.com",
  "https://*.mapsgl.api.xweather.com", "https://*.api.mapsgl.aerisapi.com",
  ...["a", "b", "c", "d"].map(shard => `https://${shard}-prod.v1.mapsgl.api.xweather.com`),
  "https://maps1.api.xweather.com", "https://maps2.api.xweather.com",
  "https://maps3.api.xweather.com", "https://maps4.api.xweather.com",
  "https://api.aerisapi.com", "https://maps.aerisapi.com", "https://cdn.aerisapi.com",
  "https://tile.openstreetmap.org", "https://tiles.openfreemap.org",
];
const viewConfig = { prefersBorder: true, csp: { connectDomains: [...network, "blob:"], resourceDomains: network } };
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };
const querySchema = z.string().trim().min(2).max(160).describe("City and region/country, or latitude,longitude.");
function toolError(error: unknown) {
  return { isError: true as const, content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Weather request failed." }] };
}
async function mapResult(location: string, locations: string[], layers: z.infer<typeof layerSchema>[], zoom: number) {
  const resolved = await resolveLocation(location), meta = mapMetadata();
  const context = await getStormContext(resolved, locations.length ? locations : [location]);
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);
  const data = mapSchema.parse({ mode: dataMode(), location: resolved, layers: [...new Set(layers)], zoom,
    start: new Date(now.getTime()-2*3600000).toISOString(), now: now.toISOString(), end:new Date(now.getTime()+3600000).toISOString(),
    mapsConfigured: Boolean(meta.mapsCredential), context });
  return { content: [{ type: "text" as const, text: `${data.mode === "demo" ? "SAMPLE WEATHER — " : ""}Storm Explorer near ${resolved.name}. ${context.stormsAvailable ? `${context.storms.length} latest storm cells returned within ${context.radiusKm} km (maximum 30).` : "Storm-cell data unavailable."} ${context.venues.length} place pins. Forecast-cone exposure is limited to available fresh tracks. ${context.warnings.join(" ")}` }], structuredContent:data, _meta:meta };
}
export const showWeatherMap = server.tool({
  name:"show-weather-map", title:"Storm Explorer",
  description:"Open a map-only Storm Explorer with radar, lightning, storm cells, selectable place pins, nowcasts, on-map playback and weather inspection. Defaults to Dallas; storm cells have US coverage.",
  inputSchema:z.object({location:querySchema.default("dallas,tx"),locations:z.array(querySchema).max(5).default([]),layers:z.array(layerSchema).max(9).default(["radar","lightning-strikes","stormcells","alerts"]),zoom:z.number().min(2).max(12).default(6.5)}),
  outputSchema:mapSchema,annotations,
  view:{name:"weather-map",description:"Map-only Storm Explorer with rounded glass controls, storm details and a forecast timeline.",...viewConfig},
}, async ({location,locations,layers,zoom}) => {try{return await mapResult(location,locations,layers,zoom);}catch(error){return toolError(error);}});
export const showWeatherDashboard = server.tool({
  name:"show-weather-dashboard",title:"Weather sites on a map",
  description:"Compare up to five places as pins in the Storm Explorer. Selecting a pin opens its weather and official alerts over the map.",
  inputSchema:z.object({locations:z.array(querySchema).min(1).max(5).default(["dallas,tx","arlington,tx","plano,tx"])}),
  outputSchema:mapSchema,annotations,view:{name:"weather-dashboard",description:"Monitored places on the Storm Explorer map.",...viewConfig},
},async ({locations}) => {try{return await mapResult(locations[0],locations,["radar","lightning-strikes","stormcells","alerts"],6.5);}catch(error){return toolError(error);}});
export const searchLocation = server.tool({
  name:"resolve-weather-location",title:"Find a place",visibility:"app",annotations,
  description:"Resolve a city or coordinates for the map's location search.",inputSchema:z.object({query:querySchema}),outputSchema:locationSchema,
},async ({query})=>{try{const location=await resolveLocation(query);return {content:[{type:"text" as const,text:`${location.name}, ${location.country}`}],structuredContent:location};}catch(error){return toolError(error);}});
export const refreshStormContext = server.tool({
  name:"get-storm-context",title:"Inspect nearby storms",visibility:"app",annotations,
  description:"Retrieve the latest US storm-cell snapshot and weather for up to five place pins. Independent of the map playback time.",
  inputSchema:z.object({location:querySchema,locations:z.array(querySchema).max(5).default([])}),outputSchema:stormContextSchema,
},async ({location,locations})=>{try{const resolved=await resolveLocation(location),data=await getStormContext(resolved,locations.length?locations:[location]);return {content:[{type:"text" as const,text:`${data.storms.length} latest storm cells; ${data.venues.length} place pins. ${data.warnings.join(" ")}`}],structuredContent:data};}catch(error){return toolError(error);}});
server.get("/health",c=>c.json({ok:true,mode:dataMode(),mapsConfigured:Boolean(mapMetadata().mapsCredential)}));
export default server;
