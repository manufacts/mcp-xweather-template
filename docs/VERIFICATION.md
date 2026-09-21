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
- ChatGPT/Claude execution has not been verified. Host credential origins, CSP, WebGL and assistant messaging need separate validation for those hosts.
- Earlier upstream Xweather MCP discovery found 19 tools, server version 3.2.4 and raster UI metadata. This app uses direct Weather API calls; upstream widget execution was not the data adapter.
- Weather refresh is subject to a five-minute cache. Layer access, geographic coverage and retained history depend on the account/dataset. Slow connections can show temporary playback gaps.
- MapsGL sessions consume quota: 150 accesses per five-minute wall-clock bucket. No paid plan was created; the deployment and public template publication are recorded below.

## Manufact deployment — September 21, 2026

- Public GitHub template: https://github.com/manufacts/mcp-xweather-template (main branch, GitHub template flag enabled).
- Manufact organization: `xweather`; server `f0b72e21-8895-409d-9f99-52eaca9e6495`; managed server slug `xweather`.
- First production deployment `084e6736-5886-4651-b6a0-52bc8dd7ea27` reached running with the custom slug active.
- Live MCP smoke against `https://xweather.run.mcp-use.com/mcp` passed: four tools, two resources, three live sites, 30 storm cells, invalid-input rejection and credential redaction.
- At this initial deployment, public Inspector HTML responded successfully. The embedded production Inspector was subsequently removed; the browser checks below record the earlier enabled configuration.
- The provided logo was downloaded to `public/xweather.png` and reuploaded to Manufact's CDN for both organization and dashboard server branding. MCP metadata references the bundled asset.
- GitHub source excludes `.env*` (except the placeholder `.env.example`), generated build output and the local project link. A scan of every staged source file found no configured credential values.
- README includes the official cloud deploy badge, build/start commands, environment setup and the live demo link.

### Public deployment follow-up

- Runtime commit `a54a44a` reached running/complete in deployment `c186a0a1-0df6-407e-9da8-8c2deb269e6d`. Typecheck, production build and live MCP smoke passed after the explicit MapsGL CSP host change.
- The saved browser-key domains include `localhost`, `127.0.0.1` and the user-approved `xweather.run.mcp-use.com`.
- Production MCP initialization resolves the bundled icon to `https://xweather.run.mcp-use.com/mcp/_mcp-use/public/xweather.png`. That URL returned PNG bytes identical to the checked-in file. The organization CDN logo and the server's stored icon were verified; the stored server image also matches the source file.
- The full README deploy-button URL opens **Deploy xweather**, selects the public `manufacts/mcp-xweather-template` repository on `main`, and uses the Node runtime. No duplicate deployment was submitted.
- In the public server-hosted Inspector, live radar, temperature shading and wind particles rendered. Three place pins and 30 live storm cells were present. Dallas details showed live weather; a selected cell showed reflectivity, hail probability, movement and its missing-track notice.
- Xweather initially returned 401 for MapsGL authentication and 403 for Maps layer metadata after the new domain was saved. The map service cached the rejection with `max-age=600,s-maxage=600`; after that cache expired, the same allowed-origin metadata request returned 200. Native MapsGL storm tracks/cones then rendered. This does not verify the separate Weather API cone normalization/exposure path, whose sampled records still lacked tracks.
- Two later radar tile requests failed, and the UI showed its unavailable-tiles notice. Successful scene rendering does not establish that every layer/frame is available at every time.
- The Manufact Cloud Tools view uses `https://manufact.com/` as the MapsGL referrer. It initially returned 401 because that domain was not allowed. The user subsequently approved it, and `manufact.com` was saved alongside the existing domains. Standalone Inspector validation does not establish Cloud Tools or ChatGPT/Claude compatibility.
- Cloud's CSP log URL-encoded wildcard domains. The template now also declares the pinned MapsGL SDK's four explicit `a`/`b`/`c`/`d-prod.v1.mapsgl.api.xweather.com` hosts, retaining provider wildcards for compatible hosts.

### City popover follow-up

- A single-place initial view selects its city and opens the on-map details automatically. Multi-place views keep their overview.
- In-map search selects the newly loaded city inside the existing request-sequence guard, so a stale context response cannot open an unrelated city's details.
- Local browser verification: `show-weather-map` opened Dallas details automatically (29°C, Mostly Cloudy). After closing details and searching `zurich,ch`, the map recentered and reopened the details for Zurich (22°C, Cloudy) without clicking its pin.
- Typecheck and production build passed for this change. Existing map-library chunk-size warnings remain.

### Production Inspector removal

- Removed the explicit Inspector opt-in from the existing server's start command, the deploy badge and the CLI deployment example. The production command is `npm start -- --host 0.0.0.0`.
- The README now links to Manufact Cloud Tools, which requires sign-in and organization access, and retains the public MCP endpoint for MCP Apps-compatible clients. Local development still includes the Inspector.
- The earlier standalone Inspector checks above are historical evidence, not the current production configuration.
