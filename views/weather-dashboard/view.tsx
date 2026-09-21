import { useHostContext, useToolContext } from "mcp-use/react";
import { WeatherMap } from "../shared/WeatherMap.js";
import { browserCredential } from "../shared/schema.js";
import "../shared/app.css";
import { normalizeLocale, translator } from "../shared/i18n.js";
export default function WeatherSitesView() {
  const host=useHostContext(), locale=normalizeLocale(host.locale), t=translator(locale);
  const view=useToolContext<"show-weather-dashboard">();
  if(view.status==="pending")return <div className="map-placeholder" lang={locale} data-theme={host.theme}>{t("Finding your places…")}</div>;
  if(view.status==="error")return <div className="map-placeholder" lang={locale} data-theme={host.theme} role="alert">{view.error.message}</div>;
  return <WeatherMap data={view.toolOutput} credential={browserCredential(view.meta)}/>;
}
