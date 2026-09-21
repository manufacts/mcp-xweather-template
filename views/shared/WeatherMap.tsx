import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getPublicBaseUrl, ModelContext, useCallTool, useDisplayMode, useHostContext, useSendFollowUp } from "mcp-use/react";
import { ArrowUpRight, Check, CloudLightning, CloudSun, Crosshair, Info, Layers, LoaderCircle, MapPin, Maximize2, Minus, Pause, Play, Plus, Radar, RefreshCw, Search, Wind, X, Zap } from "lucide-react";
import type { Map as LibreMap, Marker } from "maplibre-gl";
import type { MaplibreMapController } from "@xweather/mapsgl";
import { Button } from "./fluid/button.js";
import { Slider } from "./fluid/slider.js";
import { ShapeProvider } from "./fluid/shape-context.js";
import { layers, type BrowserCredential, type LayerId, type MapData, type StormCell } from "./schema.js";
import "@fontsource-variable/inter";
import "./fluid.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@xweather/mapsgl/dist/mapsgl.css";
import "./app.css";
import { themedBasemap, updateBasemap } from "./basemap.js";
import { normalizeLocale, translator, usesMetric } from "./i18n.js";

const presets = [
  { id:"storms", title:"Storms", icon:Radar, layers:["radar","lightning-strikes","stormcells","alerts"] },
  { id:"outlook", title:"Next hour", icon:Zap, layers:["radar","lightning-threats","hail-threats"] },
  { id:"wind", title:"Wind", icon:Wind, layers:["wind-particles","temperatures"] },
  { id:"satellite", title:"Satellite", icon:CloudSun, layers:["satellite-geocolor","alerts"] },
] satisfies {id:string;title:string;icon:typeof Radar;layers:LayerId[]}[];
const observedOnly = new Set<LayerId>(["satellite-geocolor","lightning-strikes","stormcells","alerts"]);
const outlookOnly = new Set<LayerId>(["lightning-threats"]);
const placeName = (s:string) => s.replace(/\b\w/g,c=>c.toUpperCase());

export function WeatherMap({ data, credential }: { data: MapData; credential?: BrowserCredential }) {
  return <ShapeProvider defaultShape="pill"><StormMap key={data.now} data={data} credential={credential}/></ShapeProvider>;
}
function StormMap({ data, credential }: { data:MapData; credential?:BrowserCredential }) {
  const canvas = useRef<HTMLDivElement>(null), legend = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap|null>(null), controller = useRef<MaplibreMapController|null>(null), markers = useRef<Marker[]>([]);
  const [location,setLocation] = useState(data.location), [context,setContext] = useState(data.context);
  const [selected,setSelected] = useState<LayerId[]>(data.layers), [preset,setPreset] = useState(() => presets.find(p => p.layers.length === data.layers.length && p.layers.every(id => data.layers.includes(id)))?.id ?? "");
  const [ready,setReady] = useState(false), [mapLoaded,setMapLoaded] = useState(false), [error,setError] = useState("");
  const [unavailable,setUnavailable] = useState<string[]>([]), [failed,setFailed] = useState<string[]>([]);
  const [position,setPosition] = useState(2/3), [playing,setPlaying] = useState(false), [query,setQuery] = useState("");
  const [metricOverride,setMetricOverride] = useState<boolean|null>(null), [layerMenu,setLayerMenu] = useState(false), [showLegend,setShowLegend] = useState(false);
  const [panel,setPanel] = useState<"storms"|"sites"|null>(data.context.venues.length===1?"sites":null), [stormId,setStormId] = useState<string|null>(null), [venueId,setVenueId] = useState<number|null>(data.context.venues.length===1?0:null);
  const [point,setPoint] = useState<{lat:number;lon:number}|null>(null), [sending,setSending] = useState(false), [explained,setExplained] = useState(false);
  const lookup=useCallTool("resolve-weather-location"), refresh=useCallTool("get-storm-context"), display=useDisplayMode(), host=useHostContext(), sendFollowUp=useSendFollowUp();
  const locale=normalizeLocale(host.hostContext?.locale ?? data.locale ?? host.locale), theme=host.theme;
  const t=useMemo(()=>translator(locale),[locale]);
  const number=useMemo(()=>new Intl.NumberFormat(locale,{maximumFractionDigits:0}),[locale]);
  const coordinate=useMemo(()=>new Intl.NumberFormat(locale,{minimumFractionDigits:3,maximumFractionDigits:3}),[locale]);
  const localeMetric=useMemo(()=>usesMetric(locale),[locale]);
  const metric=metricOverride ?? localeMetric;
  const fmt=(n:number|null,unit="")=>n===null?"—":`${number.format(n)}${unit}`;
  const lengthFormat=useMemo(()=>new Intl.NumberFormat(locale,{style:"unit",unit:metric?"kilometer":"mile",unitDisplay:"short",maximumFractionDigits:0}),[locale,metric]);
  const length=(km:number)=>lengthFormat.format(metric?km:km*.621371);
  const appearance=useRef({theme,locale,metric});appearance.current={theme,locale,metric};
  const requestSeq=useRef(0), watched=useRef(new WeakSet<object>());
  const startMs=Date.parse(data.start), nowMs=Date.parse(data.now), endMs=Date.parse(data.end), currentMs=startMs+position*(endMs-startMs);
  const future=currentMs>nowMs+30000, historical=currentMs<nowMs-15*60000;
  const storm=context.storms.find(s=>s.id===stormId), venue=venueId!==null?context.venues[venueId]:undefined;
  const timeFormat=useMemo(()=>new Intl.DateTimeFormat(locale,{hour:"2-digit",minute:"2-digit",timeZone:location.timezone}),[locale,location.timezone]);
  const time=(ms:number)=>timeFormat.format(new Date(ms));
  const clock=(iso:string)=>time(Date.parse(iso));
  const dateFormat=useMemo(()=>new Intl.DateTimeFormat(locale,{month:"short",day:"numeric",timeZone:location.timezone}),[locale,location.timezone]);
  const dateLabel=dateFormat.format(new Date(currentMs));
  const distance=(km:number|null)=>km===null?t("Distance unavailable"):t("{distance} away",{distance:length(km)});
  const displayLayers=selected.filter(id=>!(future&&observedOnly.has(id))&&!(!future&&outlookOnly.has(id)));
  const snapshotAge=Math.max(0,Math.round((Date.now()-Date.parse(context.generatedAt))/60000));

  useEffect(()=>{
    setReady(false); setMapLoaded(false); setError("");
    let disposed=false, resize:ResizeObserver|undefined, poll:ReturnType<typeof setInterval>|undefined, timeout:ReturnType<typeof setTimeout>|undefined;
    void(async()=>{
      const [libre,gl]=await Promise.all([import("maplibre-gl"),import("@xweather/mapsgl")]);
      if(disposed||!canvas.current)return;
      libre.setWorkerUrl(`${getPublicBaseUrl()}maplibre/maplibre-gl-worker.js`);
      const m=new libre.Map({container:canvas.current,center:[data.location.longitude,data.location.latitude],zoom:data.zoom,
        attributionControl:{compact:true},style:themedBasemap(appearance.current.theme,appearance.current.locale)});
      map.current=m;
      m.on("load",()=>{if(!disposed)setMapLoaded(true);});
      m.on("error",()=>{if(!disposed)setError("Some map data could not load. Try another layer or refresh.");});
      m.on("click",e=>{setPoint({lat:e.lngLat.lat,lon:e.lngLat.lng});setStormId(null);setVenueId(null);});
      resize=new ResizeObserver(()=>m.resize());resize.observe(canvas.current);
      if(!credential)return;
      Object.defineProperty(m,"transform",{get:()=>m.painter.transform});
      const c=new gl.MaplibreMapController(m,{account:new gl.Account(credential.clientId,credential.clientSecret),animation:{start:new Date(data.start),end:new Date(data.end),duration:16,autoplay:false,repeat:true,endDelay:1,pauseWhileLoading:false}});
      controller.current=c;
      timeout=setTimeout(()=>{if(!disposed)setError("Weather layers are taking longer than expected. Check connection or plan access.");},25000);
      c.on("error",()=>{if(!disposed)setError("A weather layer could not load. Check account access or try another time.");});
      c.once("load",()=>{
        if(disposed)return;
        if(timeout)clearTimeout(timeout);
        c.setUnitsForSystem(appearance.current.metric?"metric":"imperial");
        setUnavailable(layers.filter(l=>!c.weatherProvider.getSupportedLayerIds().includes(l.id)).map(l=>l.id));
        if(legend.current)c.addLegendControl(legend.current,{width:185,toggleOnClick:false});
        c.addDataInspectorControl({event:"click",stream:true,showCoordinates:true,layout:"stacked"});
        c.timeline.goToDate(new Date(data.now));setPosition((nowMs-startMs)/(endMs-startMs));setReady(true);
        poll=setInterval(()=>{if(!disposed){setPosition(c.timeline.position);setPlaying(c.timeline.isAnimating);}},350);
      });
    })().catch(()=>{if(!disposed)setError("The map could not start. Check WebGL support and Xweather access.");});
    return()=>{disposed=true;requestSeq.current++;if(poll)clearInterval(poll);if(timeout)clearTimeout(timeout);resize?.disconnect();markers.current.forEach(m=>m.remove());markers.current=[];controller.current?.timeline.stop();controller.current?.removeLegendControl();controller.current?.removeDataInspectorControl();controller.current?.dispose();controller.current=null;map.current?.remove();map.current=null;};
  },[data.start,data.now,data.end,data.location.latitude,data.location.longitude,data.zoom,credential?.clientId,credential?.clientSecret]);

  useEffect(()=>{
    if(mapLoaded&&map.current)updateBasemap(map.current,theme,locale);
  },[mapLoaded,theme,locale]);
  useEffect(()=>{if(ready)controller.current?.setUnitsForSystem(metric?"metric":"imperial");},[ready,metric]);

  // Time-incompatible layers are removed, so observed lightning is never presented as a forecast.
  useEffect(()=>{
    const c=controller.current;if(!ready||!c)return;
    const supported=c.weatherProvider.getSupportedLayerIds();
    for(const layer of layers){
      const wanted=selected.includes(layer.id)&&supported.includes(layer.id)&&!(future&&observedOnly.has(layer.id))&&!(!future&&outlookOnly.has(layer.id));
      try{
        if(wanted&&!c.hasWeatherLayer(layer.id))c.addWeatherLayer(layer.id,{paint:{opacity:layer.id==="temperatures"?.45:layer.id==="radar"?.76:.9}});
        else if(!wanted&&c.hasWeatherLayer(layer.id))c.removeWeatherLayer(layer.id);
      }catch{setFailed(prev=>[...new Set([...prev,layer.id])]);}
    }
    for(const source of c.sources){
      if(watched.current.has(source))continue;watched.current.add(source);
      source.on("metadata:error tile:error data:update:error",()=>{if(controller.current===c){setError("Some weather tiles are unavailable for this layer, place or time.");}});
    }
    // Legend labels are drawn into canvases, so CSS alone cannot theme their text.
    const bounds=map.current!.getBounds();
    c.controls.legend?.legends.forEach(({legend})=>legend.update({text:{color:theme==="dark"?"#dce6dc":"#243e34",family:"Inter Variable, sans-serif"}}, {
      time:new Date(currentMs),bounds:{north:bounds.getNorth(),south:bounds.getSouth(),east:bounds.getEast(),west:bounds.getWest()},
    }));
  },[selected,ready,future,theme,metric]);

  useEffect(()=>{
    const m=map.current;if(!m||!mapLoaded)return;
    let cancelled=false;
    void import("maplibre-gl").then(libre=>{
      if(cancelled)return;
      markers.current.forEach(marker=>marker.remove());markers.current=[];
      context.venues.forEach((v,i)=>{
        const el=document.createElement("button");el.type="button";el.className=`venue-pin ${v.exposure==="intersects"||v.alerts.length?"has-alert":""}`;el.textContent=String(i+1);el.setAttribute("aria-label",t("Inspect {place}",{place:v.location.name}));
        el.onclick=e=>{e.stopPropagation();setVenueId(i);setStormId(null);setPanel("sites");setPoint(null);};
        markers.current.push(new libre.Marker({element:el}).setLngLat([v.location.longitude,v.location.latitude]).addTo(m));
      });
      if(!historical&&!future)context.storms.forEach(s=>{
        const el=document.createElement("button");el.type="button";el.className=`storm-pin ${s.id===stormId?"selected":""}`;el.setAttribute("aria-label",t("Inspect storm {id}",{id:s.id}));el.innerHTML='<span></span>';
        el.onclick=e=>{e.stopPropagation();selectStorm(s);};
        markers.current.push(new libre.Marker({element:el}).setLngLat([s.longitude,s.latitude]).addTo(m));
      });
    });
    return()=>{cancelled=true;};
  },[context,mapLoaded,historical,future,stormId,t]);

  useEffect(()=>{
    const m=map.current;if(!mapLoaded||!m)return;
    for(const id of ["selected-track","selected-cone"]){if(m.getLayer(id))m.removeLayer(id);if(m.getSource(id))m.removeSource(id);}
    if(!storm||historical)return;
    if(storm.track.length){
      m.addSource("selected-track",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:[[storm.longitude,storm.latitude],...storm.track.map(p=>[p.longitude,p.latitude])]}}});
      m.addLayer({id:"selected-track",type:"line",source:"selected-track",paint:{"line-color":"#ffce8a","line-width":3,"line-dasharray":[2,2]}});
    }
    if(storm.cone.length>=3){
      const ring=storm.cone.map(p=>[p.longitude,p.latitude]);ring.push(ring[0]);
      m.addSource("selected-cone",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[ring]}}});
      m.addLayer({id:"selected-cone",type:"fill",source:"selected-cone",paint:{"fill-color":"#fb923c","fill-opacity":.16,"fill-outline-color":"#ffce8a"}});
    }
  },[storm,mapLoaded,historical]);

  function selectStorm(s:StormCell){setStormId(s.id);setVenueId(null);setPanel("storms");setPoint(null);map.current?.flyTo({center:[s.longitude,s.latitude],zoom:Math.max(map.current.getZoom(),7),duration:850});}
  function scrub(value:number){const t=controller.current?.timeline;if(!t)return;t.pause();t.goToDate(new Date(Math.floor((startMs+value*(endMs-startMs))/1000)*1000));setPosition(value);setPlaying(false);}
  function playback(){const t=controller.current?.timeline;if(!t)return;if(t.isAnimating)t.pause();else t.play(position>.99?0:position);setPlaying(t.isAnimating);}
  function choosePreset(id:string){const p=presets.find(p=>p.id===id)!;setPreset(id);setSelected(p.layers);setError("");if(id==="outlook")scrub(5/6);else if(future)scrub(2/3);}
  async function loadContext(next=location,queries=context.venues.map(v=>v.location.query),openPlace=false){
    const seq=++requestSeq.current;
    try{const r=await refresh.callTool({location:next.query,locations:queries});if(seq===requestSeq.current){setContext(r.structuredContent);setStormId(null);setVenueId(openPlace&&r.structuredContent.venues.length?0:null);if(openPlace)setPanel("sites");setError("");}}catch{if(seq===requestSeq.current)setError("Could not refresh the storm snapshot. The previous snapshot remains visible.");}
  }
  async function search(event:FormEvent){event.preventDefault();if(!query.trim()||lookup.isPending)return;try{const r=await lookup.callTool({query:query.trim()}),next=r.structuredContent;setLocation(next);setQuery("");setPoint(null);setPanel(null);setStormId(null);setVenueId(null);map.current?.flyTo({center:[next.longitude,next.latitude],zoom:6.5,duration:1000});await loadContext(next,[next.query],true);}catch{setError("Place not found. Try city, country or coordinates.");}}
  async function pinPoint(){if(!point||context.venues.length>=5)return;await loadContext(location,[...context.venues.map(v=>v.location.query),`${point.lat},${point.lon}`]);setPanel("sites");setPoint(null);}
  async function explain(){
    setSending(true);setExplained(false);
    const bounds=map.current?.getBounds();
    const prompt=`Respond in ${locale}. Explain the Xweather map I am viewing near ${location.name}. Map time: ${new Date(currentMs).toISOString()} (${future?"forecast":"observations"}). Layers: ${displayLayers.join(", ")}. ${point?`Selected point: ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}.`:""} ${bounds?`Visible bounds: ${bounds.toArray().flat().map(n=>n.toFixed(2)).join(", ")}.`:""} Latest snapshot from ${context.generatedAt}: ${storm?JSON.stringify(storm):venue?JSON.stringify(venue):`${context.storms.length} storm cells returned within ${context.radiusKm} km; ${context.venues.map(v=>`${v.location.name}: ${v.alerts.length} official alerts, cone exposure ${v.exposure}`).join("; ")}`}. Distinguish the latest storm snapshot from playback time. Explain uncertainty and missing data; do not infer safety from missing cones.`;
    try{await sendFollowUp({prompt});setExplained(true);}catch{setError("This host could not accept a follow-up. Ask the assistant to explain the selected map view.");}finally{setSending(false);}
  }
  const height=display.displayMode==="fullscreen"?"100dvh":host.maxHeight?`${Math.floor(Math.min(720,host.maxHeight))-2}px`:"660px";
  return <div className="storm-map" lang={locale} data-theme={theme} data-locale={locale} data-location-source={data.locationSource} style={{height}} data-ready={ready} data-time-mode={future?"forecast":"observed"}>
    <ModelContext content={`Xweather Storm Explorer: ${location.name}. ${data.mode==="demo"?"Sample weather. ":""}Map ${future?"forecast":"observation"} time ${new Date(Math.round(currentMs/60000)*60000).toISOString()}; visible layers ${displayLayers.join(", ")}. Latest cell snapshot ${context.generatedAt}; selected storm ${storm?.id??"none"}; selected site ${venue?.location.name??"none"}; selected point ${point?`${point.lat.toFixed(3)},${point.lon.toFixed(3)}`:"none"}. Snapshot and map playback are separate. No cone does not mean no risk.`}/>
    <div className="map-canvas" ref={canvas} aria-label={t("Interactive storm map centered on {place}",{place:location.name})}/>
    <div className="top-left">
      <form className="glass search-pill" onSubmit={search}><Search size={17}/><input aria-label={t("Search map location")} placeholder={`${placeName(location.name)}, ${location.country.toUpperCase()}`} value={query} onChange={e=>setQuery(e.target.value)}/><Button type="submit" variant="ghost" size="icon" aria-label={t("Search location")} loading={lookup.isPending}><ArrowUpRight size={17}/></Button></form>
      <div className="glass preset-pill" role="group" aria-label={t("Weather scenes")} >{presets.map(p=><Button key={p.id} variant="ghost" size="compact" active={preset===p.id} aria-pressed={preset===p.id} leadingIcon={p.icon} onClick={()=>choosePreset(p.id)} disabled={!ready}>{t(p.title)}</Button>)}</div>
    </div>
    <div className="top-right"><div className="glass status-pill"><i className={credential?"live-dot":"sample-dot"}/><span>{data.mode==="demo"?t("Sample weather"):t("Storm Explorer")}</span><span className="status-time">{clock(context.generatedAt)}</span></div><Button className="glass control" variant="ghost" size="icon" aria-label={t("Refresh storm snapshot")} loading={refresh.isPending} onClick={()=>void loadContext()}><RefreshCw size={16}/></Button>{display.availableDisplayModes.includes("fullscreen")&&<Button className="glass control" variant="ghost" size="icon" aria-label={t("Fullscreen map")} onClick={()=>void display.requestDisplayMode({mode:display.displayMode==="fullscreen"?"inline":"fullscreen"}).catch(()=>setError("Fullscreen is unavailable in this host."))}><Maximize2 size={16}/></Button>}</div>
    <div className="map-rail">
      <Button className="glass control" variant="ghost" size="icon" aria-label={t("Weather layers")} aria-expanded={layerMenu} active={layerMenu} onClick={()=>{setLayerMenu(v=>!v);setShowLegend(false);}}><Layers size={18}/></Button>
      <Button className="glass control" variant="ghost" size="icon" aria-label={t("Layer legend")} aria-expanded={showLegend} active={showLegend} onClick={()=>{setShowLegend(v=>!v);setLayerMenu(false);}}><Info size={18}/></Button>
      <Button className="glass control" variant="ghost" size="icon" aria-label={t("Recenter map")} onClick={()=>map.current?.flyTo({center:[location.longitude,location.latitude],zoom:data.zoom})}><Crosshair size={18}/></Button>
      <div className="glass zoom-pill"><Button variant="ghost" size="icon" aria-label={t("Zoom in")} onClick={()=>map.current?.zoomIn()}><Plus size={18}/></Button><Button variant="ghost" size="icon" aria-label={t("Zoom out")} onClick={()=>map.current?.zoomOut()}><Minus size={18}/></Button></div>
      <Button className="glass control units" variant="ghost" size="icon" aria-label={t("Toggle map units")} onClick={()=>setMetricOverride(!metric)}>{metric?"°C":"°F"}</Button>
    </div>
    {layerMenu&&<aside className="glass layer-menu" aria-label={t("Weather layers")} ><div className="panel-title"><strong>{t("Weather layers")}</strong><Button variant="ghost" size="icon-compact" aria-label={t("Close layers")} onClick={()=>setLayerMenu(false)}><X size={14}/></Button></div>{layers.map(l=><Button key={l.id} variant="ghost" className="layer-row" aria-label={t("Toggle {layer}",{layer:t(l.title)})} aria-pressed={selected.includes(l.id)} disabled={!ready||unavailable.includes(l.id)} onClick={()=>{setPreset("");setSelected(prev=>prev.includes(l.id)?prev.filter(id=>id!==l.id):[...prev,l.id]);}}><i style={{background:l.color}}/><span>{t(l.title)}<small>{unavailable.includes(l.id)||failed.includes(l.id)?t("Unavailable"):future&&observedOnly.has(l.id)?t("Hidden during forecast"):!future&&outlookOnly.has(l.id)?t("Select a future time"):t(l.subtitle)}</small></span>{selected.includes(l.id)&&<Check size={14}/>}</Button>)}</aside>}
    <aside className={`glass legend-panel ${showLegend?"is-open":""}`} aria-label={t("Weather legend")} aria-hidden={!showLegend}><div className="panel-title"><strong>{t("Layer legend")}</strong></div><div ref={legend}/>{!ready&&<small>{t("Waiting for weather layers")}</small>}</aside>
    <div className="context-switch glass"><Button variant="ghost" size="compact" leadingIcon={CloudLightning} active={panel==="storms"} onClick={()=>{setPanel(panel==="storms"?null:"storms");setVenueId(null);}}>{t("{count} cells",{count:context.stormsAvailable?number.format(context.storms.length):"—"})}</Button><Button variant="ghost" size="compact" leadingIcon={MapPin} active={panel==="sites"} onClick={()=>{setPanel(panel==="sites"?null:"sites");setStormId(null);}}>{t(context.venues.length===1?"{count} place":"{count} places",{count:number.format(context.venues.length)})}</Button></div>
    {panel&&<aside className="glass detail-panel" aria-label={panel==="storms"?t("Storm details"):t("Monitored places")}>
      <div className="panel-title"><strong>{storm?t("Cell {id}",{id:storm.id}):venue?placeName(venue.location.name):panel==="storms"?t("Nearby storm cells"):t("Monitored places")}</strong><Button variant="ghost" size="icon-compact" aria-label={t("Close details")} onClick={()=>{setPanel(null);setStormId(null);setVenueId(null);}}><X size={14}/></Button></div>
      {storm?<><div className="detail-kicker"><i className="storm-dot"/>{placeName(storm.name)}</div><p className="detail-note">{t("Observed {time}",{time:clock(storm.observedAt)})} · {distance(storm.distanceKm)}</p><div className="weather-metrics"><div><strong>{fmt(storm.reflectivity)}</strong><small>{t("Radar dBZ")}</small></div><div><strong>{fmt(storm.hailProbability,"%")}</strong><small>{t("Hail probability")}</small></div><div><strong>{fmt(storm.speedKph===null?null:metric?storm.speedKph:storm.speedKph*.621371)}</strong><small>{metric?"km/h":"mph"} {storm.direction}</small></div></div><p className="detail-note">{storm.track.length?t("{count} forecast positions through {time}. Dashed line shows the supplied track.",{count:number.format(storm.track.length),time:clock(storm.track.at(-1)!.time)}):t("No forecast track supplied for this cell.")}</p>{storm.cone.length>=3&&<p className="detail-note">{t("Shaded area: Xweather’s wide forecast error cone.")}</p>}<Button variant="secondary" size="compact" onClick={()=>setStormId(null)}>{t("All nearby cells")}</Button></>:
      venue?<><div className="venue-weather"><strong>{fmt(venue.temperatureC===null?null:metric?venue.temperatureC:venue.temperatureC*9/5+32,"°")}</strong><span>{venue.summary}<small>{t("Observed {time}",{time:clock(venue.observedAt)})}</small></span></div><p className={`exposure ${venue.exposure==="intersects"?"highlight":""}`}>{venue.exposure==="intersects"?t("Inside {count} supplied forecast cone(s)",{count:number.format(venue.intersectingStorms.length)}):venue.exposure==="outside"?t("Outside the available forecast cones"):t("Forecast-cone assessment unavailable")}</p><p className="detail-note">{t("Latest snapshot · checked cells within {distance}. Missing tracks do not establish safety.",{distance:length(context.radiusKm)})}</p>{venue.alerts.length?venue.alerts.map((a,i)=><details className="alert-detail" key={i}><summary>{a.title}</summary><p>{a.body}</p><small>{a.source}{a.expires?` · ${t("Expires {time}",{time:clock(a.expires)})}`:""}</small></details>):<p className="detail-note">{t("No official alerts returned. Check data notices below.")}</p>}<Button variant="secondary" size="compact" onClick={()=>setVenueId(null)}>{t("All places")}</Button></>:
      panel==="storms"?<><p className="detail-note">{t("Latest radar snapshot · within {distance}",{distance:length(context.radiusKm)})}<br/>{snapshotAge?t("{count} min since refresh",{count:number.format(snapshotAge)}):t("Just refreshed")} · {t("US radar coverage")}</p><div className="cell-list">{context.storms.slice(0,30).map(s=><Button key={s.id} variant="ghost" className="cell-row" onClick={()=>selectStorm(s)}><span className={`cell-symbol ${s.trait!=="general"?"severe":""}`}><CloudLightning size={17}/></span><span><strong>{placeName(s.name)}</strong><small>{s.id} · {distance(s.distanceKm)}</small></span><b>{fmt(s.reflectivity)}<small>dBZ</small></b></Button>)}</div>{!context.storms.length&&<p className="empty-copy">{context.stormsAvailable?t("No storm cells returned in this area. Explore radar or search another place."):t("Storm-cell data is unavailable here. Radar and other available layers can still be explored.")}</p>}</>:
      <><p className="detail-note">{t("Click a place to inspect weather. Click the map to add a pin.")}</p>{context.venues.map((v,i)=><Button key={v.location.query} variant="ghost" className="cell-row" onClick={()=>{setVenueId(i);map.current?.flyTo({center:[v.location.longitude,v.location.latitude],zoom:8});}}><span className="place-number">{i+1}</span><span><strong>{placeName(v.location.name)}</strong><small>{v.alerts.length?t("{count} official alerts",{count:number.format(v.alerts.length)}):v.summary}</small></span><b>{fmt(v.temperatureC===null?null:metric?v.temperatureC:v.temperatureC*9/5+32,"°")}</b></Button>)}</>}
      {context.warnings.length>0&&<details className="data-notices"><summary>{t("Data notices ({count})",{count:number.format(context.warnings.length)})}</summary>{context.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
    </aside>}
    {!mapLoaded&&!error&&<div className="glass center-notice"><LoaderCircle className="spin" size={18}/>{t("Opening the map…")}</div>}
    {!credential&&<div className="glass center-notice">{t("Basemap preview · configure a restricted MapsGL credential for weather layers.")}</div>}
    {error&&<div className="glass map-error" role="alert"><span>{t(error)}</span><Button variant="ghost" size="icon-compact" aria-label={t("Dismiss map notice")} onClick={()=>setError("")}><X size={14}/></Button></div>}
    <div className="bottom-actions">{point&&<div className="glass point-pill"><MapPin size={13}/><span>{coordinate.format(point.lat)}, {coordinate.format(point.lon)}</span><Button variant="ghost" size="compact" onClick={()=>void pinPoint()} disabled={context.venues.length>=5||refresh.isPending}>{t("Pin place")}</Button><Button variant="ghost" size="icon-compact" aria-label={t("Clear point")} onClick={()=>setPoint(null)}><X size={13}/></Button></div>}<Button className="glass explain-button" variant="ghost" loading={sending} onClick={()=>void explain()}>{explained?t("Sent to assistant"):t("Explain this view")}</Button></div>
    <div className="glass timeline" aria-label={t("Map playback controls")} >
      <Button className="play-button" variant="primary" size="icon" aria-label={playing?t("Pause timeline"):t("Play timeline")} disabled={!ready} onClick={playback}>{playing?<Pause size={16}/>:<Play size={16}/>}</Button>
      <div className="timeline-body"><div className="timeline-labels"><span>{dateLabel} <b>{time(currentMs)}</b> <small>{location.timezone.split("/").at(-1)?.replaceAll("_"," ")}</small></span><span className={future?"forecast-label":"observed-label"}>{future?t("Forecast"):t("Observed")}</span></div><div className="slider-wrap"><div className="now-marker"/><Slider label={t("Weather timeline")} size="compact" value={position} onChange={v=>scrub(typeof v==="number"?v:v[0])} min={0} max={1} step={1/180} showValue={false} showSteps={false} disabled={!ready} formatValue={v=>time(startMs+v*(endMs-startMs))}/></div><div className="timeline-ends"><span>−2h</span><button onClick={()=>scrub(2/3)}>{t("Now")}</button><span>+1h</span></div></div>
      <Button variant="ghost" size="compact" className="now-button" onClick={()=>scrub(2/3)} disabled={!ready}>{t("Now")}</Button>
    </div>
    <a className="weather-attribution" href="https://www.xweather.com" target="_blank" rel="noreferrer">{t("Weather by Vaisala Xweather")}</a>
  </div>;
}
