import { useToolContext } from "mcp-use/react";
import { WeatherMap } from "../shared/WeatherMap.js";
import { browserCredential } from "../shared/schema.js";
import "../shared/app.css";
export default function WeatherSitesView() {
  const view=useToolContext<"show-weather-dashboard">();
  if(view.status==="pending")return <div className="map-placeholder">Finding your places…</div>;
  if(view.status==="error")return <div className="map-placeholder" role="alert">{view.error.message}</div>;
  return <WeatherMap data={view.toolOutput} credential={browserCredential(view.meta)}/>;
}
