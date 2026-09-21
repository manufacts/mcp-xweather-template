# Xweather MCP research and UI app use cases

Research date: September 21, 2026. Issue: [MCP-3447](https://linear.app/manufact/issue/MCP-3447/create-shareable-xweather-mapsgl-mcp-app-template).

## What Xweather already provides

The official hosted MCP endpoint is `https://mcp.api.xweather.com/mcp`, using Streamable HTTP. Authenticated discovery on September 21, 2026 identifies **Xweather API MCP Service 3.2.4**, with **19 tools**, all advertising output schemas. The [official registry entry](https://github.com/vaisala-xweather/xweather-mcp-registry/blob/main/server.json) and public changelog identify **1.2.2**, so the published version differs from the running service. The registry repository contains the server listing, not the server implementation.

The [documented catalog](https://www.xweather.com/docs/mcp-server/tools) lists **19 tools**:

| Category | Tools | Relevant capability |
| --- | --- | --- |
| [General](https://www.xweather.com/docs/mcp-server/tools/general) | `xweather_get_current_weather`, `xweather_get_weather_conditions`, `xweather_get_aggregated_weather_conditions`, `xweather_get_current_active_weather_alerts`, `xweather_get_current_weather_impacts`, `xweather_get_daily_weather_summaries`, `xweather_get_aggregated_daily_weather_summaries` | Current conditions, alerts, impacts, hourly conditions, daily history, and aggregate statistics. |
| [Forecast](https://www.xweather.com/docs/mcp-server/tools/forecast) | `xweather_get_forecast_weather`, `xweather_get_forecast_precipitation_timing` | Forecast periods and precipitation start/stop timing. Version 1.2.2 adds hourly forecast intervals from 1–72 hours. |
| [Air quality](https://www.xweather.com/docs/mcp-server/tools/air-quality) | `xweather_get_current_airquality`, `xweather_get_forecast_airquality` | Current and forecast AQI, categories, and pollutants. |
| [Lightning](https://www.xweather.com/docs/mcp-server/tools/lightning) | `xweather_get_historical_lightning_strikes` | Recent/historical strikes around a location and optional time buckets. |
| [Tropical](https://www.xweather.com/docs/mcp-server/tools/tropical) | `xweather_get_current_active_tropical_systems`, `xweather_get_current_tropical_storms_near_location`, `xweather_get_tropical_cyclone_detail`, `xweather_get_historical_tropical_cyclones` | Active systems, proximity, storm details/tracks, and historical comparisons. |
| [Maps](https://www.xweather.com/docs/mcp-server/tools/maps) | `xweather_get_raster_maps` | Raster maps for a location with weather/base layers. |
| [Road weather](https://www.xweather.com/docs/mcp-server/tools/roadweather) | `xweather_get_roadweather`, `xweather_get_roadweather_routes` | Pavement conditions at a point or along a route, up to 24 hours ahead. |

The changelog already records **an inline raster-map UI in v1.2.0**. We should present our app as a richer interactive MapsGL experience, rather than claim Xweather has no visual output. Authenticated discovery confirms the raster tool advertises `_meta.ui.resourceUri = ui://xweather_get_raster_map_view`. No dedicated MapsGL tool was found in the discovered catalog. The upstream raster widget itself was not rendered in this verification.

### Inspection boundary and authentication

An unauthenticated `initialize` request returned **HTTP 401**. After creating the free Developer account, authenticated `initialize` and `tools/list` succeeded using protocol 2025-06-18. Tool discovery and output/UI metadata are confirmed; upstream tool execution and widget rendering are separate from the direct Weather API calls used by this PoC.

[Authentication](https://www.xweather.com/docs/mcp-server/authentication) supports `Authorization: Bearer <client_id>_<client_secret>` or OAuth with dynamic client registration. Store the combined token only in server-side secret configuration. Avoid putting credentials into MCP URLs, model-visible text, structured output, screenshots, or source control.

[Tool scoping](https://www.xweather.com/docs/mcp-server/filtering-tool-scoping) supports exact `include_tools` / `exclude_tools` and tag filters. Prefer exact tool names for the initial integration: the current page lists `general` as a canonical tag but still uses `weather` in some examples.

Subscription entitlements determine which datasets are available. Road routes are a later feature partly because the documentation estimates approximately 40 API calls for an example route (one per maneuver), rather than one cheap request for the whole journey.

## Prioritized use cases

The current PoC is a map-only Storm Explorer: live radar, lightning, nearby storm cells, a next-hour forecast scene, and up to five place pins with weather and alerts. All controls and details float over the map. Other experiences below remain product proposals; separate dashboards and hourly charts are no longer part of the UI.

| Priority | Experience and example prompt | What the MCP App UI adds | Existing data/tools |
| --- | --- | --- | --- |
| P0 | **Local weather dashboard (proposal):** “What's the weather in Zurich today and tomorrow?” | Current-condition cards, hourly temperature/precipitation chart, daily outlook, alert badges, unit selection, and an action to open the map at the same location. | Current weather, conditions, forecast, active alerts; precipitation timing where available. |
| P0 | **Interactive weather explorer:** “Explore storms around Dallas and the next hour of weather.” | MapLibre + MapsGL map; nine layer toggles; observed/forecast playback; selectable storm cells; on-map legend, point inspection, search and fullscreen. Users investigate without another model round trip for each toggle or pan. | MapsGL weather layers, resolved location, current weather/alerts for textual context. This complements the upstream raster-map tool. |
| P1 | **Outdoor activity window:** “When is the best two-hour window for an outdoor event this afternoon?” | Selectable hourly timeline with precipitation, wind, temperature, and optional AQI; highlight hours that meet user-defined thresholds and inspect nearby radar. | Forecast, precipitation timing, impacts, air quality. Avoid universal safety guarantees. |
| P1 | **Multi-location operations board:** “Compare weather at our Zurich, Milan, and Munich sites.” | Map pins and sortable site cards; select a site to inspect current conditions, forecast, and alerts; show observation timestamps. | Current weather, forecasts, alerts, impacts queried per location. Explicit user-supplied sites; no inferred private locations. |
| P1 | **Severe-weather briefing:** “Which warnings affect our sites, and how has the storm moved?” | Clickable alert polygons linked to official warning details; radar/satellite playback; selected-site list and issue/expiry times. | Active alerts, impacts, radar and geocolor satellite. Preserve official source/severity and coverage limits. |
| P2 | **Road trip / fleet route risk:** “Show road conditions from Minneapolis to Fargo tomorrow at 7 AM.” | Route segments colored by pavement condition, maneuver detail, departure-time selection, and road-temperature timeline. | Roadweather point/route tools, forecasts, alerts. Confirm route geometry and entitlement from authenticated responses before committing to the UI. |
| P2 | **Air-quality activity planner:** “Compare air quality for a run today versus tomorrow.” | AQI scale, pollutant breakdown, forecast timeline, location comparisons, and optional AQI map layers. | Current and forecast air-quality tools; additional MapsGL AQI layers beyond the current nine layers. |
| P2 | **Tropical storm explorer:** “Show active storms near Miami and compare their tracks.” | Selectable storms, historical/forecast tracks, satellite context, detail drawer, and time controls. | Four tropical tools plus optional tropical MapsGL layers. Label forecast uncertainty explicitly. |
| P2 | **Recent weather and incident review:** “Show rainfall and nearby lightning around this site yesterday.” | Time-range selector, chart/map synchronization, event timeline, and source timestamps for a human-reviewed report. | Daily/hourly summaries, aggregations, historical lightning, and available map history. Respect dataset retention and subscription limits. |
| P2 | **Renewable-energy weather briefing:** “Compare wind and cloud cover around these wind and solar sites.” | Site map with wind particles/geocolor, forecast charts, and optional irradiance series. | Forecast/current data, optional GHI introduced in 1.2.2, and MapsGL. Weather context only; power production needs an additional asset model. |

## Implemented demo: Storm Explorer

Both View-bound tools, `show-weather-map` and `show-weather-dashboard`, now render one map-only experience. The latter keeps its tool name for compatibility and starts with three place pins.

1. Resolve a place, preserving its displayed name and timezone.
2. Retrieve up to 30 storm cells within 400 km and current weather/official alerts for up to five pins.
3. Show Storms, Next hour, Wind and Satellite presets with nine selectable layers. Timeline spans `now - 2h` to `now + 1h`; observed-only layers are hidden in future playback.
4. Inspect a cell's real observation time, reflectivity, hail probability and movement. Render supplied tracks/cones when available. Missing geometry remains visibly unavailable; exposure uses only fresh, unexpired cones.
5. Keep search, controls, legend, timeline, detail panels and attribution inside the rounded map. Official Fluid Functionalism primitives provide pill controls with blurred backgrounds.
6. Send selected map context to the host through “Explain this view.”

Implementation uses direct Weather API calls (`places`, `conditions`, `forecasts`, `alerts`, `stormcells`). MapsGL runs in the view using a separate browser credential restricted to localhost and 127.0.0.1. It travels only in tool-result `_meta`; unrestricted server credentials never reach the view or model-visible output.

## MapsGL implementation facts verified from current docs

The current npm package is **`@xweather/mapsgl@1.10.1`**. The old namespace changed starting with v1.8.0. `maplibre-gl` currently publishes 6.10.0; choose and test a compatible version when implementing instead of assuming the latest major is supported.

The [published layer catalog](https://www.xweather.com/docs/mapsgl/weather-layers) includes the original five base layer codes below. The Storm Explorer additionally uses `lightning-strikes`, `stormcells`, `lightning-threats` and `hail-threats`, verified as supported by the installed SDK. Account access and geographical coverage remain dataset-specific:

| Layer code | Representation | Documented time range | Coverage / cadence |
| --- | --- | --- | --- |
| `radar` | Precipitation intensity/type | -7 days to +15 days | Global catalog coverage; updates every 5 minutes. Future data represents forecast/model data, not observations. |
| `satellite-geocolor` | Geocolor satellite raster | Previous 7 days | Global; US/Japan/Australia 10-minute updates, Europe 15-minute updates. |
| `temperatures` | Surface temperature field | -7 to +15 days | Global; hourly. |
| `wind-particles` | Animated surface wind vector field | -7 to +15 days | Global; hourly. |
| `alerts` | Official alert polygons | Previous 7 days | Catalog lists US, Canada, Europe, Australia, Brazil, India, Mexico, South Africa, South Korea, Japan; every 2 minutes. |

At runtime, use `controller.weatherProvider.getSupportedLayerIds()` / `getLayerMetadata()` after load to check the installed SDK's layer support. Catalog coverage is not proof that an account can access every location/layer.

Use the SDK's MapLibre controller and load it client-side; include `@xweather/mapsgl/dist/mapsgl.css` plus MapLibre styles. Set up and clean up the map/controller with the React view lifecycle. Use the built-in legend and data inspector where possible.

### Credential and network design for implementation

- Use separate server-side Xweather credentials and a domain/namespace-restricted browser credential where MapsGL requires one. Browser credentials remain observable in the browser; keep the unrestricted server secret out of browser code.
- Load secrets from the project's environment/secret configuration. Add a placeholder-only `.env.example` when the integration variables are implemented. Ensure ignored local env files stay out of source control.
- Never return credentials in model-visible tool `content` or `structuredContent`. Define the widget-only configuration path and verify it in the host before adding any credential delivery code.
- Build an explicit CSP/network allowlist from actual requests: MapsGL data/tile hosts, chosen basemap style/tiles/glyphs/sprites, any geocoder, and the app origin. Prefer bundled SDK assets. Check worker/WebGL behavior inside the MCP App sandbox. The implementation bundles SDK assets and declares Xweather, Aeris, OpenFreeMap tile/assets hosts and `blob:` connections for SDK worker loading. The local mcp-use host adds the dev origin.
- Display Xweather attribution and the basemap provider's required attribution. See [Xweather attribution](https://www.xweather.com/docs/weather-api/resources/attribution).

### Session cost

[MapsGL sessions](https://www.xweather.com/docs/mapsgl/getting-started/sessions) start when a MapsGL layer is added and align to five-minute wall-clock buckets (`:00`, `:05`, `:10`, etc.). **One session equals 150 accesses** for Weather API and Maps subscriptions. Interactions within the session are unlimited; it is not 150 accesses for each layer toggle. Viewing from 08:03 to 08:07 spans two buckets and therefore consumes two sessions (300 accesses). Avoid mounting hidden map views or duplicate controllers unnecessarily.

## Implementation acceptance checklist

- [x] Create and install the official MCP Apps starter under `mcp-servers/xweather-mapsgl`.
- [x] Run starter typecheck/build and render `show-app` in the local Inspector.
- [x] Inspect current official MCP catalog/changelog and probe endpoint authentication.
- [x] Configure separate credentials; inspect authenticated discovery, output schemas, and UI metadata. Upstream tool results were not exercised.
- [x] Implement both map-only tool entry points with validated output schemas.
- [x] Verify live Storm Explorer rendering, forecast transitions, glass overlays and mobile layout in the Inspector; see VERIFICATION.md for the exact evidence boundary.
- [x] Verify credential restrictions, model-output redaction, CSP, attribution, and error behavior.
- [x] Add setup/environment instructions and local verification evidence.
- [ ] Gallery packaging and publication (not requested for this local PoC).

## Business value for Xweather

The concrete value proposition is to make Xweather's paid weather products usable inside AI-assisted operational workflows. A facilities or field-operations user can compare sites, inspect a storm, and change map layers without assembling dashboards or repeatedly prompting for static maps. Xweather retains the data, MapsGL, attribution, account and usage relationship; Manufact/mcp-use provides the MCP App, typed tool-to-view integration, sandbox configuration, Inspector and a reusable distribution template.

The commercial hypothesis is increased activation of Weather API + MapsGL and conversion from free API trials to recurring usage. Measure time to first live map, trial-to-active-app conversion, weekly active organizations, MapsGL session adoption and paid conversion. These are proposed success metrics, not demonstrated revenue lift. The integration should complement Xweather's existing MCP and raster UI, not be pitched as replacing a missing MCP server.

## Primary sources

- [Xweather MCP docs](https://www.xweather.com/docs/mcp-server)
- [Official MCP registry entry](https://github.com/vaisala-xweather/xweather-mcp-registry/blob/main/server.json)
- [MCP changelog](https://www.xweather.com/docs/mcp-server/changelog)
- [MCP tool catalog](https://www.xweather.com/docs/mcp-server/tools)
- [MapsGL overview](https://www.xweather.com/docs/mapsgl)
- [MapsGL getting started](https://www.xweather.com/docs/mapsgl/getting-started)
- [Layer catalog](https://www.xweather.com/docs/mapsgl/weather-layers)
- [Session accounting](https://www.xweather.com/docs/mapsgl/getting-started/sessions)
- [Road weather announcement](https://www.xweather.com/blog/road-weather-mcp)
