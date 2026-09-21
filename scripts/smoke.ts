import 'dotenv/config';
import assert from 'node:assert/strict';

import { mapSchema } from '../views/shared/schema.js';

const serverUrl = process.env.MCP_SERVER_URL ?? 'http://localhost:3000/mcp';
let requestId = 0;
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await fetch(serverUrl, {method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:++requestId,method,params})});
  assert.ok(response.ok, `MCP HTTP ${response.status}`);
  const raw=await response.text();
  const messages=response.headers.get('content-type')?.includes('text/event-stream') ? raw.split('\n').filter(line=>line.startsWith('data:')).map(line=>JSON.parse(line.slice(5))) : [JSON.parse(raw)];
  const message=messages.find(m=>m.id===requestId);
  assert.ok(message && !message.error, 'MCP request failed');
  return message.result;
}
const client={listTools:()=>rpc('tools/list'),listResources:()=>rpc('resources/list'),callTool:(params:Record<string,unknown>)=>rpc('tools/call',params),readResource:(params:Record<string,unknown>)=>rpc('resources/read',params)};
await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'xweather-poc-verification',version:'1.0.0'}});
  const catalog = await client.listTools();
  assert.equal(catalog.tools.length,4);
  const resources = await client.listResources();
  assert.equal(resources.resources.length,2);
  const dashboard = await client.callTool({name:'show-weather-dashboard',arguments:{locations:['dallas,tx','arlington,tx','plano,tx']}});
  assert.ok(!dashboard.isError);
  const data=mapSchema.parse(dashboard.structuredContent);
  assert.equal(data.mode,'live'); assert.equal(data.context.venues.length,3);
  assert.ok(data.context.stormsAvailable); assert.ok(Date.parse(data.end)>Date.parse(data.now)); assert.ok(Date.parse(data.start)<Date.parse(data.now));
  const map = await client.callTool({name:'show-weather-map',arguments:{location:'dallas,tx',layers:['radar','lightning-strikes','stormcells','lightning-threats','hail-threats'],zoom:6}});
  assert.ok(!map.isError); assert.ok(mapSchema.parse(map.structuredContent).mapsConfigured);
  const bad = await client.callTool({name:'show-weather-dashboard',arguments:{locations:[]}});
  assert.ok(bad.isError);
  const outputs=JSON.stringify([{content:dashboard.content,structuredContent:dashboard.structuredContent}, {content:map.content,structuredContent:map.structuredContent}]);
  for(const key of ['XWEATHER_CLIENT_SECRET','XWEATHER_MAPSGL_CLIENT_SECRET']) {
    assert.ok(process.env[key]); assert.ok(!outputs.includes(process.env[key]!),'Secret found in model-visible output');
  }
  assert.ok(!JSON.stringify(map).includes(process.env.XWEATHER_CLIENT_SECRET!),'Server secret leaked into map metadata');
  for(const resource of resources.resources) {
    const result=await client.readResource({uri:resource.uri});
    assert.ok(JSON.stringify(result).includes('text/html'));
    for(const key of ['XWEATHER_CLIENT_SECRET','XWEATHER_MAPSGL_CLIENT_SECRET']) assert.ok(!JSON.stringify(result).includes(process.env[key]!));
  }
  console.log(JSON.stringify({ok:true,tools:catalog.tools.map(t=>t.name),resources:resources.resources.length,mode:data.mode,sites:data.context.venues.map(s=>({name:s.location.name,exposure:s.exposure})),stormCells:data.context.storms.length,mapLayers:5,credentialSeparation:'passed',invalidInput:'rejected'},null,2));

