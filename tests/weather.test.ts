import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { dataMode, getDashboard, mapMetadata, normalizePeriod, signals, weatherRequest } from '../src/weather.js';

const originalEnv = {...process.env};
const originalFetch = globalThis.fetch;
afterEach(() => { process.env = {...originalEnv}; globalThis.fetch = originalFetch; });
const period = () => normalizePeriod({timestamp: 1789995600, tempC: 20, windSpeedKPH: 8, windGustKPH: 12, pop: 0, precipMM: 0});

test('sample mode is explicitly labelled and never calls the provider', async () => {
  process.env.WEATHER_MODE = 'demo';
  globalThis.fetch = async () => { throw new Error('Unexpected network call'); };
  const result = await getDashboard(['Miami', 'Zurich']);
  assert.equal(result.mode, 'demo');
  assert.equal(result.source, 'Illustrative sample data');
  assert.equal(result.sites.length, 2);
  assert.match(result.sites[0].warnings[0], /Not observations/);
});
test('live authentication failure is sanitized and never silently becomes demo data', async () => {
  process.env.WEATHER_MODE = 'live'; process.env.XWEATHER_CLIENT_ID = 'test-id'; process.env.XWEATHER_CLIENT_SECRET = 'test-secret';
  globalThis.fetch = async () => new Response('test-secret', {status: 401});
  assert.equal(dataMode(), 'live');
  await assert.rejects(getDashboard(['rejected-live-place']), error => error instanceof Error && /HTTP 401/.test(error.message) && !/test-secret/.test(error.message));
});
test('network exceptions never expose credentialed URLs', async () => {
  process.env.XWEATHER_CLIENT_ID = 'test-id'; process.env.XWEATHER_CLIENT_SECRET = 'test-secret';
  globalThis.fetch = async () => { throw new Error('https://example.com/?client_secret=test-secret'); };
  await assert.rejects(weatherRequest('conditions', 'network-failure'), /Xweather could not be reached/);
});
test('missing data does not produce a normal planning signal', () => {
  const p=period();
  assert.equal(signals(p, Array.from({length:6},period), 0, true).signal, 'normal');
  assert.equal(signals(p, [], 0, true).signal, 'unknown');
  assert.equal(signals(p, Array.from({length:6},period), 0, false).signal, 'unknown');
  assert.equal(signals({...p, temperatureC:null}, Array.from({length:6},period), 0, true).signal, 'unknown');
  assert.equal(signals({...p, windKph:45, gustKph:0}, [], 0, true).signal, 'watch');
  assert.equal(signals(p, [], 1, false).signal, 'attention');
});
test('missing source timestamps are rejected instead of fabricated', () => {
  assert.throws(() => normalizePeriod({tempC:20}), /valid observation/);
  assert.throws(() => normalizePeriod({dateTimeISO:'bad'}), /valid observation/);
  assert.equal(period().temperatureC,20);
});
test('browser credentials never fall back to unrestricted server credentials', () => {
  process.env.XWEATHER_CLIENT_ID = 'server-id'; process.env.XWEATHER_CLIENT_SECRET = 'server-secret';
  delete process.env.XWEATHER_MAPSGL_CLIENT_ID; delete process.env.XWEATHER_MAPSGL_CLIENT_SECRET;
  process.env.XWEATHER_MAPSGL_RESTRICTED = 'true';
  assert.deepEqual(mapMetadata(), {});
  process.env.XWEATHER_MAPSGL_CLIENT_ID = 'browser-id'; process.env.XWEATHER_MAPSGL_CLIENT_SECRET = 'browser-secret';
  process.env.XWEATHER_MAPSGL_RESTRICTED = 'false'; assert.deepEqual(mapMetadata(),{});
  process.env.XWEATHER_MAPSGL_RESTRICTED = 'true';
  assert.deepEqual(mapMetadata(),{mapsCredential:{clientId:'browser-id',clientSecret:'browser-secret'}});
});
