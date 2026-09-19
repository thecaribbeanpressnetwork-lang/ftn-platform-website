import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../apps/ftn-scarlett-browser-extension/',import.meta.url);
const read=(name)=>fs.readFileSync(new URL(name,root),'utf8');
const manifest=JSON.parse(read('manifest.json'));
const popup=read('popup.js');
const understanding=read('page-understanding.js');
const policy=read('transformation-policy.js');
const content=read('content.js');
const handoff=read('ibis-handoff.js');

assert.equal(manifest.manifest_version,3);
assert.equal(manifest.name,'Scarlett by FTN');
assert.deepEqual([...manifest.permissions].sort(),['activeTab','scripting','storage'].sort());
for(const forbidden of ['<all_urls>','history','cookies','webRequest','geolocation','clipboardRead','clipboardWrite']){
  assert(!manifest.permissions.includes(forbidden),`Scarlett must not request ${forbidden}`);
}
assert.deepEqual(manifest.host_permissions,[
  'https://ftnplatform.org/ibis-ai/*',
  'https://www.ftnplatform.org/ibis-ai/*'
]);
assert.equal(manifest.background.service_worker,'background.js');

assert.match(understanding,/google-sheets/);
assert.match(understanding,/google-docs/);
assert.match(understanding,/gmail/);
assert.match(understanding,/google-calendar/);
assert.match(understanding,/PASSWORD_FIELD/);
assert.match(understanding,/PAYMENT_FIELD/);
assert.match(understanding,/HEALTH_CONTEXT/);
assert.doesNotMatch(understanding,/fetch\s*\(/);
assert.doesNotMatch(understanding,/XMLHttpRequest/);

assert.match(policy,/SENSITIVE_SURFACE_ASSIST_ONLY/);
assert.match(policy,/COMPLEX_APP_MUSCLE_MEMORY/);
assert.match(policy,/\['ORIGINAL','ASSIST','ADAPT'\]/);
assert.doesNotMatch(policy,/TRANSFORM|COMPARE|BLEND/);

assert.match(content,/data-ftn-scarlett-mode/);
assert.match(content,/restoreLedger/);
assert.match(content,/Ask ibis about this page/);
assert.match(content,/chrome\.storage\.session\.set/);
assert.match(content,/SCARLETT_HANDOFF_V1/);
assert.doesNotMatch(content,/fetch\s*\(/);
assert.doesNotMatch(content,/document\.cookie|chrome\.history|chrome\.cookies/);
assert.doesNotMatch(content,/innerHTML\s*=/);

assert.match(handoff,/Review the minimal page context before inserting it into ibis/);
assert.match(handoff,/Nothing is sent until you choose Insert/);
assert.match(handoff,/chrome\.storage\.session\.remove/);
assert.doesNotMatch(handoff,/fetch\s*\(/);

assert.match(popup,/chrome\.scripting\.executeScript/);
assert.match(popup,/SCARLETT_ANALYZE/);
assert.match(popup,/SCARLETT_MODE/);

for(const name of ['popup.html','popup.css','popup.js','background.js','page-understanding.js','transformation-policy.js','content.js','ibis-handoff.js','README.md']){
  assert.ok(fs.statSync(new URL(name,root)).size>20,`${name} should exist and be non-empty`);
}

console.log('Scarlett V1 audit: minimal permissions, local analysis, conservative policy, reversible modes and review-before-send ibis handoff verified.');
