# Local verification — September 21, 2026

Environment: Node 25.9.0, mcp-use 2.5.1, MapsGL 1.10.1, MapLibre 6.10.0. Local MCP endpoint: `http://localhost:3000/mcp`.

## Final Storm Explorer checks

- Typecheck: passed after the final map/legend changes.
- Production build: passed for both view entries. Large MapsGL/MapLibre chunks produce size warnings.
- Nine focused tests: passed. Coverage includes labelled samples, live-to-demo separation, sanitized failures, missing weather/timestamps, credential separation, storm normalization and cone interior/boundary/outside checks.
- Live MCP smoke: four tools and two view resources discovered; live Dallas/Arlington/Plano weather; 30 nearby storm cells; observed/future timeline bounds validated; invalid empty site list rejected.
- Credential checks: neither server nor browser secret appears in model-visible content, structured output or view resources. Unrestricted server secrets never appear in map metadata.
- Dependency installation audit reported zero vulnerabilities. Earlier account setup verified a separate browser key restricted to `localhost` and `127.0.0.1`; local credentials remain in ignored `.env`.

## Browser evidence

The final map-only implementation was exercised in the local Codex in-app Inspector, using CUA browser automation.

- Both `show-weather-map` and `show-weather-dashboard` render the shared map-only view. There is no separate dashboard, external header/footer, or external legend/timeline.
- Dark OpenFreeMap vector basemap rendered with real radar and storm layers, without the previous CARTO API-key watermark.
- Fluid Button/Slider primitives render as rounded controls. Search, presets, details, layer menu, legend, timeline and attribution sit inside the clipped map. Legend canvas labels and the built-in point tooltip use the dark glass theme.
- The default Dallas scene returned 30 selectable cells. Selecting SHV_H1 showed its real observation time, 57 dBZ reflectivity, 30% hail probability and movement, with an explicit missing-forecast-track state.
- Next hour switched to future radar/threat layers and the Forecast label; observed-only layers and current custom cell pins disappeared. All nine configured layer IDs were supported by the installed SDK.
- Playback advanced the accessible slider value; Pause stopped playback, keyboard Home reached the historical endpoint, and Now restored observation time.
- Selecting Dallas showed live place weather and unavailable cone assessment. No official alerts were returned for the sampled Dallas pin.
- Searching `zurich,ch` recentered the map, changed the search label/timezone to Zurich, and returned a Zurich pin with live weather.
- Wind scene rendered temperature shading and wind particles. Clicking a point returned **16.27°C** and **NE 6.4 km/h** in the built-in glass tooltip. Pin place added a second location, Mosnang, with live weather.
- Fullscreen opened and exited through the Inspector host.
- Mobile layout around 390px was visually checked: controls and internally scrolling details fit inside the map. Desktop was restored.
- Xweather, OpenFreeMap, OpenMapTiles and OpenStreetMap attribution is visible inside the map.
- Two MapsGL particle renderer errors occurred during development hot reload at 14:23:35 UTC. A clean reload rendered wind again and switched back to Storms without new errors. Document dimensions were 718px/718px, confirming no outer scroll overflow.
- “Explain this view” was attempted in the Inspector's Tools response. That host rejected the follow-up, and the app displayed its fallback notice. Successful assistant message delivery/answer generation is **not verified**.

## Integration fixes

1. Shared UI source lives in `views/shared/` so dev middleware resolves it correctly.
2. A read-only getter bridges MapsGL's old `map.transform` access to MapLibre 6's `painter.transform`.
3. CSP includes observed Xweather/Aeris map hosts, OpenFreeMap assets and `blob:` worker connections.
4. Timeline endpoints/scrubbing use whole seconds to avoid MapsGL out-of-range errors.
5. OpenFreeMap vector tiles replace CARTO watermark tiles. The style uses a quiet dark palette and provider attribution.
6. MapLibre 6 module-worker resolution failed after MCP view bundling. `prepare-assets.mjs` copies the pinned worker/shared modules to public `.js` assets, rewrites their relative import and gives them a JavaScript MIME type. The map sets an explicit worker URL. A full Inspector reload cleared the previously stalled worker pool.
7. Legend labels are canvas-rendered; the app themes them through the legend API with current bounds, alongside actual `awxgl-*` CSS overrides. Controls are removed during cleanup to avoid duplicate legends after HMR.
8. Host height rounding and hidden document overflow remove an iframe scrollbar; detail panels retain their own scrolling.

## Evidence boundaries

- Sampled live storm cells did **not** contain forecast tracks/cones. Normalization and cone math have automated coverage, but real forecast geometry rendering and real site/cone intersection were not visually verified. The UI labels unavailable assessments instead of inventing tracks or declaring safety.
- Cell queries return at most 30 records within 400 km, not every possible storm affecting a site. Exposure considers fresh, unexpired cones among those returned cells.
- Map playback and the latest storm/place snapshot are separate. Observed pins are hidden away from current time; detail copy and assistant context identify the latest snapshot.
- Local browser/protocol checks are not deployment or ChatGPT/Claude host proof. Host credential origins, CSP, WebGL and assistant messaging need validation before release.
- Earlier upstream Xweather MCP discovery found 19 tools, server version 3.2.4 and raster UI metadata. This app uses direct Weather API calls; upstream widget execution was not the data adapter.
- Weather refresh is subject to a five-minute cache. Layer access, geographic coverage and retained history depend on the account/dataset. Slow connections can show temporary playback gaps.
- MapsGL sessions consume quota: 150 accesses per five-minute wall-clock bucket. No paid plan, deployment or publication was created.
