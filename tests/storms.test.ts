import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inCone, normalizeStorm } from '../src/storms.js';
const square=[{latitude:0,longitude:0},{latitude:0,longitude:2},{latitude:2,longitude:2},{latitude:2,longitude:0}];
test('forecast-cone intersection includes edges, rejects outside and missing geometry',()=>{
  assert.equal(inCone({latitude:1,longitude:1},square),true);
  assert.equal(inCone({latitude:0,longitude:1},square),true);
  assert.equal(inCone({latitude:3,longitude:1},square),false);
  assert.equal(inCone({latitude:1,longitude:1},[]),false);
});
test('storm observations retain unknown motion and absent forecasts',()=>{
  const storm=normalizeStorm({id:'FWS_A1',loc:{lat:33,long:-96},ob:{timestamp:1789998000,movement:{speedKPH:null},hail:{prob:0}}});
  assert.ok(storm);assert.equal(storm.speedKph,null);assert.equal(storm.hailProbability,0);
  assert.deepEqual(storm.track,[]);assert.deepEqual(storm.cone,[]);
  assert.equal(normalizeStorm({id:'bad',loc:{lat:33,long:-96},ob:{}}),null);
});
test('only timestamped and geographically valid forecast coordinates survive normalization',()=>{
  const storm=normalizeStorm({id:'FWS_A1',loc:{lat:33,long:-96},ob:{timestamp:1789998000},forecast:{locs:[{lat:34,long:-96,timestamp:1789998900},{lat:350,long:-96,timestamp:1789998900},{lat:34,long:-96}],cone:{wide:[{lat:34,long:-96},{lat:34,long:-95},{lat:33,long:-96}]}}});
  assert.equal(storm?.track.length,1);assert.equal(storm?.cone.length,3);
});
