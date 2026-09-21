import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientLocationQuery, mapPlaces } from '../src/client-preferences.js';
import { normalizeLocale, translator, usesMetric } from '../views/shared/i18n.js';
import { basemapStyle, themedBasemap } from '../views/shared/basemap.js';

test('client location accepts approximate coordinates including zero and falls back to city for invalid coordinates', () => {
  assert.equal(clientLocationQuery({latitude:'47.3769',longitude:'8.5417'}),'47.3769,8.5417');
  assert.equal(clientLocationQuery({latitude:0,longitude:0}),'0,0');
  assert.equal(clientLocationQuery({latitude:'',longitude:'',city:'Zurich',country:'CH'}),'Zurich,CH');
  assert.equal(clientLocationQuery({latitude:91,longitude:8,city:'Dallas',region:'TX',country:'US'}),'Dallas,TX');
  assert.equal(clientLocationQuery({latitude:'NaN',longitude:'Infinity'}),undefined);
  assert.equal(clientLocationQuery({country:'CH',timezone:'Europe/Zurich'}),undefined);
});
test('explicit requests win; absent hints do not inherit another caller location', () => {
  const hint={city:'Zurich',country:'CH'};
  assert.deepEqual(mapPlaces('miami,fl',[],hint),{location:'miami,fl',locations:['miami,fl'],locationSource:'explicit'});
  assert.equal(mapPlaces(undefined,['milan,it','munich,de'],hint,true).location,'milan,it');
  assert.deepEqual(mapPlaces(undefined,undefined,hint,true),{location:'Zurich,CH',locations:['Zurich,CH'],locationSource:'client'});
  assert.equal(mapPlaces(undefined,[],undefined).location,'dallas,tx');
  assert.equal(mapPlaces(undefined,undefined,undefined,true).locations.length,3);
});
test('locale uses safe BCP47 normalization, region units and translated fallback', () => {
  assert.equal(normalizeLocale('de-ch'),'de-CH');
  assert.equal(normalizeLocale('broken_locale'),'en-US');
  assert.equal(usesMetric('en-US'),false);
  assert.equal(usesMetric('en-GB'),true);
  assert.equal(usesMetric('de-CH'),true);
  assert.equal(translator('de-CH')('Now'),'Jetzt');
  assert.equal(translator('fr-CH')('{count} places',{count:2}),'2 lieux');
  assert.equal(translator('it-CH')('Explain this view'),'Spiega questa vista');
  assert.equal(translator('es-ES')('Weather layers'),'Capas meteorológicas');
  assert.equal(translator('ja-JP')('Now'),'Now');
});
test('theme and localized labels leave original basemap and weather layer identities intact', () => {
  const dark=themedBasemap('dark','en-US'), light=themedBasemap('light','de-CH');
  assert.deepEqual(light.layers.map(l=>l.id),dark.layers.map(l=>l.id));
  assert.equal(light.layers[0].paint?.['background-color'],'#eef2f0');
  assert.equal(basemapStyle.layers[0].paint?.['background-color'],'#151d24');
  const city=light.layers.find(l=>l.id==='label_city');
  assert.ok(city?.type==='symbol');
  assert.ok(JSON.stringify(city.layout?.['text-field']).includes('name:de'));
});
