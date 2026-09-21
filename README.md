# Xweather Template — Storm Explorer MCP App

<img src="public/xweather.png" alt="Xweather" width="80" height="80" />

A deployable MCP Apps template built with `mcp-use@2.5.1`, React, `@xweather/mapsgl@1.10.1` and `maplibre-gl@6.10.0`.

A map-only weather app with live storm cells, lightning, forecast layers and up to five monitored places. Search, scene presets, storm details, legend, timeline and assistant follow-up all float over the map. The view requests `prefersBorder: true`, uses the host's `--border-radius-xl`, and combines blurred glass surfaces with pill-shaped Fluid Functionalism controls. See [business value and use cases](docs/USE_CASES.md).

## Live demo

[Open Storm Explorer in Manufact Cloud Tools](https://manufact.com/cloud/xweather/servers/f0b72e21-8895-409d-9f99-52eaca9e6495/tools) (requires sign-in and access to the Xweather organization) and execute **show-weather-dashboard** for the three-site view, or **show-weather-map** to choose a location. You can also connect the public MCP endpoint below to an MCP Apps-compatible client.

**MCP endpoint:** `https://xweather.run.mcp-use.com/mcp`  
**Hosted by:** [Xweather on Manufact](https://manufact.com/cloud/xweather/servers/f0b72e21-8895-409d-9f99-52eaca9e6495/overview)

The shared demo uses a quota-limited Xweather Developer account. Deploy your own copy with your own credentials for continued use. The Xweather logo is bundled in `public/xweather.png`; deployed apps serve their own copy.

## Deploy to Manufact

[![Deploy to Manufact](https://cdn.mcp-use.com/deploy.svg)](https://manufact.com/deploy/start?repository-url=https%3A%2F%2Fgithub.com%2Fmanufacts%2Fmcp-xweather-template&branch=main&project-name=xweather&port=3000&runtime=node&build-command=npm+run+build&start-command=npm+start+--+--host+0.0.0.0)

The button opens Manufact Cloud, clones this public template into your GitHub account, and starts deployment. Choose your organization and repository name. The template builds with `npm run build` and starts with `npm start -- --host 0.0.0.0` on port 3000. Production serves the MCP endpoint and app assets without mounting the embedded Inspector. Preview the app in your server's Manufact Cloud **Tools** tab; local development includes the Inspector.

A deployment without Xweather credentials starts in labelled sample mode. To enable live weather, add these environment variables in the server's **Environment Variables** settings and redeploy:

| Variable | Value |
| --- | --- |
| `WEATHER_MODE` | `live` |
| `XWEATHER_CLIENT_ID` | Your server-side Xweather client ID |
| `XWEATHER_CLIENT_SECRET` | Your server-side Xweather client secret |
| `XWEATHER_MAPSGL_CLIENT_ID` | A separate browser credential's client ID |
| `XWEATHER_MAPSGL_CLIENT_SECRET` | That browser credential's client secret |
| `XWEATHER_MAPSGL_RESTRICTED` | `true`, after configuring its domain restrictions |

Create credentials in the [Xweather Developer Portal](https://data.portal.xweather.com/). Restrict the browser credential to the MCP host iframe origins you intend to support. Manufact Cloud's Tools preview uses `manufact.com`, which needs its own allowed-domain entry. Local development uses `localhost` and `127.0.0.1`. Previous credential rejections can remain cached by Xweather's map service for ten minutes after a domain change; reload the preview after that cache expires. Never put server credentials in the browser fields or commit credentials to GitHub. Deployment environment variables stay in Manufact, outside the repository.

To deploy from the CLI instead:

```bash
npm ci
npx mcp-use login
npx mcp-use org list
npx mcp-use deploy --org YOUR_ORG_SLUG --name xweather \
  --env-file .env \
  --build-command 'npm run build' \
  --start-command 'npm start -- --host 0.0.0.0'
```

Manufact stores the project link in ignored `.mcp-use/project.json`. Subsequent `npx mcp-use deploy` runs target that server. Set an available custom slug under the server's domain settings, then redeploy to activate it.

## Client preferences

Both apps follow the host's light/dark theme, including the basemap, glass controls, popovers, tooltips and legend text. Theme changes retain the current map view and playback state. The host locale formats dates, times, numbers and map labels, and sets the initial metric/imperial units; the units button remains an explicit override. Controls are translated into English, German, French, Italian and Spanish, with English fallback for other languages. Provider condition descriptions and official alerts retain their source wording. Times remain local to the displayed place, with its timezone shown on the timeline.

Omit `location` / `locations` to use the approximate location supplied in tool-call `_meta["openai/userLocation"]`, read through `ctx.client.user()`. Valid latitude/longitude takes priority over a city/region/country hint. Explicit tool arguments always win. With no usable location hint, the map falls back to Dallas and the multi-place view to Dallas/Arlington/Plano. The app does not request browser geolocation or infer location from the locale/timezone. The request's `openai/locale` is used until the app host supplies its locale.

## Official Xweather proxy demo

A separate [Xweather Official server in Manufact](https://manufact.com/cloud/xweather/servers/4e8aa477-ffb9-422e-8db4-3232c79d4859/tools) proxies `https://mcp.api.xweather.com/mcp` through Manufact's native external-server gateway. It preserves Xweather's own 19 tools and raster-map MCP App. This template's MapsGL views are a separate implementation.

Proxy endpoint: `https://fast-steel-rlb8y.run.mcp-use.com/mcp`. Xweather authentication is still required by the upstream service. The signed-in Cloud demo uses the configured demo account. No upstream service code is copied or redeployed.

## Run locally

Requires Node.js 22.22.2 or newer.

```bash
npm ci
# On a new checkout only; preserve an existing configured .env:
cp .env.example .env
npm run dev
```

Open [the Inspector](http://localhost:3000/mcp/inspector?server=http%3A%2F%2Flocalhost%3A3000%2Fmcp). Execute either map tool without location arguments to use client-supplied location hints. With no hints, **show-weather-dashboard** shows Dallas, Arlington and Plano, and **show-weather-map** shows Dallas. Supply location arguments to choose other places. Both render the same map-only app. MCP endpoint: `http://localhost:3000/mcp`.

Keep any configured `.env` private; the repository contains only `.env.example`.

| Tool | Purpose |
| --- | --- |
| `show-weather-map` | Storm Explorer, default client location (Dallas fallback); optional locations, layers and zoom. |
| `show-weather-dashboard` | Up to five monitored places; default client location (Dallas/Arlington/Plano fallback). |
| `resolve-weather-location` | App-only search for a city or coordinates. |
| `get-storm-context` | App-only refresh of nearby storm cells and place weather/alerts. |

## Explore

- **Storms:** radar, observed lightning, storm cells and official alerts. Select a cell for reflectivity, hail probability, movement, observation time and any supplied forecast track/cone.
- **Next hour:** forecast radar plus lightning and hail threat layers. The timeline spans two hours of history through one hour ahead and explicitly distinguishes observations from forecasts.
- **Wind / Satellite:** wind particles with temperature shading, or geocolor satellite with alerts.
- **Places:** numbered pins with current weather, official alert details and intersection with available fresh storm forecast cones. A single-city map opens that city's details automatically; searching recenters the map and opens the new city's details when its weather loads. Click the map to add a pin, up to five.
- **Explain this view:** sends the selected place/cell, time, layers and visible bounds to the host assistant, with uncertainty and snapshot/playback distinctions.

Nine supported layer IDs: `radar`, `satellite-geocolor`, `temperatures`, `wind-particles`, `alerts`, `lightning-strikes`, `stormcells`, `lightning-threats`, `hail-threats`. Coverage and entitlement vary. Observed-only layers are hidden in future playback; the latest custom cell pins are also hidden in historical playback. Lightning outlook requires a future time.

Storm lookup returns at most 30 cells within 400 km. Place exposure considers only fresh, unexpired supplied forecast cones. Missing tracks produce **assessment unavailable**, never a safety claim. The sampled live cells lacked forecast geometry; geometry handling has unit coverage but was not verified against a live cone.

## Credentials and data

Set `WEATHER_MODE=live`, `XWEATHER_CLIENT_ID`, and `XWEATHER_CLIENT_SECRET` for the server-side Weather API. The adapter calls `places`, `conditions`, `forecasts`, `alerts`, and `stormcells` directly; it does not proxy Xweather's upstream MCP. Live failures never silently become samples. Partial data failures are labelled. Weather data is cached for five minutes and places for one hour, so Refresh may retain cached observations.

The MapsGL browser needs a **separate restricted credential**:

```dotenv
XWEATHER_MAPSGL_CLIENT_ID=your_browser_client_id
XWEATHER_MAPSGL_CLIENT_SECRET=your_browser_client_secret
XWEATHER_MAPSGL_RESTRICTED=true
```

Configure allowed domains in Xweather before setting that flag. Local Inspector uses `localhost` and `127.0.0.1`. The flag is an operator assertion, not an API restriction check. Browser credentials are visible to the browser but travel only in tool-result `_meta`, outside model-visible `content` and `structuredContent`. Unrestricted server credentials never fall back into browser configuration. Keep `.env` ignored and mode `0600`.

Without credentials, `WEATHER_MODE=demo` shows labelled sample place weather for Dallas, Arlington, Plano, Miami, Tampa, Orlando, Zurich, Milan and Munich. It never fabricates storm observations. The map shows only the basemap until a restricted MapsGL credential is configured.

## UI and map integration

- Official [Fluid Functionalism](https://www.fluidfunctionalism.com/) Button, Slider and shape/context primitives are installed as source under `views/shared/fluid/`; provenance is in its README. Tailwind generates their utilities through `npm run styles`. `ShapeProvider` selects pill shapes.
- OpenFreeMap vector tiles provide the dark basemap; OpenFreeMap, OpenMapTiles, OpenStreetMap and Xweather attribution stays inside the map.
- `npm run prepare:assets` copies the pinned MapLibre module workers to `public/maplibre/` as `.js`, preserving the correct JavaScript MIME type. The view sets an explicit worker URL so MCP view bundling does not break worker resolution. `predev` and `prebuild` run this plus style generation automatically.
- MapsGL 1.10.1 reads the old `map.transform` property. A read-only getter bridges it to MapLibre 6's `painter.transform`. Reverify the bridge and workers before upgrading either package.
- CSP includes the four explicit MapsGL shard hosts used by the pinned SDK, Xweather/Aeris weather hosts, OpenFreeMap assets and `blob:` connections required by MapsGL workers. Explicit shard names avoid host implementations that URL-encode wildcard domains. Deployment needs the actual host's credential origins and sandbox validation.
- Timeline dates use whole seconds because MapsGL truncates milliseconds. Slow connections may show gaps while frames load.
- MapsGL usage is **150 accesses per five-minute wall-clock session bucket**. The Developer plan used for this PoC has 15,000 monthly accesses. Close unused map views.
- Map libraries load dynamically. Builds pass with large-chunk warnings.

## Validation

```bash
npm run typecheck
npm test
npm run build
# Requires the running dev server and live credentials:
npm run test:live
```

Thirteen focused tests cover sample/live separation, sanitized failures, missing data, timestamps, credential separation, storm normalization, cone boundaries, client-location precedence, locale defaults and basemap themes. Live smoke checks four tools/two resources, live place weather/storm cells, timeline configuration, invalid input, credential redaction, client-location defaults for both tools and explicit-location precedence. Visual rendering is checked separately in the Inspector.

See [verification evidence](docs/VERIFICATION.md) for the checks performed and their limits. ChatGPT/Claude execution requires separate host validation.

## Layout

- `index.ts`: tools, schemas, view metadata and CSP.
- `src/weather.ts`, `src/storms.ts`: provider normalization, caching, storm context and cone intersection.
- `views/shared/WeatherMap.tsx`: shared map-only experience used by both view entries.
- `views/shared/basemap.ts`, `app.css`, `fluid/`: map style and rounded glass UI.
- `scripts/prepare-assets.mjs`, `smoke.ts`: worker preparation and live protocol checks.
- `tests/`: focused data and credential tests.
