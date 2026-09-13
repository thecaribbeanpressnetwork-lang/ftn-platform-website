import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('ibis-headspace-preview/index.html','utf8');
const bootstrap = fs.readFileSync('js/ibis-headspace-bootstrap.js','utf8');
const arrival = fs.readFileSync('js/ibis-headspace-arrival.js','utf8');
const themes = fs.readFileSync('js/ibis-country-themes.js','utf8');
const speech = fs.readFileSync('js/ibis-headspace-speech.js','utf8');
const manager = fs.readFileSync('js/ibis-headspace-window-manager.js','utf8');
const fabric = fs.readFileSync('js/ibis-headspace-fabric.js','utf8');
const toolHealth = fs.readFileSync('js/ibis-headspace-tool-health.js','utf8');
const scoutHealth = fs.readFileSync('js/ibis-headspace-scout-health.js','utf8');
const publicBootstrap = fs.readFileSync('js/ibis-query-bootstrap.js','utf8');
const publicHtml = fs.readFileSync('ibis-ai/index.html','utf8');
const scoutRegistry = JSON.parse(fs.readFileSync('data/scout-2-source-registry.json','utf8'));

// Public Headspace must first-paint immediately and hydrate capabilities through one non-blocking
// bootstrap. Directly embedding the full capability graph in HTML previously held DOM readiness
// open long enough for the public route to look blank and fail human-style link audits.
assert.match(html,/src="\/js\/ibis-headspace-bootstrap\.js[^\"]*"\s+async/,'Headspace must load one async non-blocking bootstrap.');
assert.doesNotMatch(html,/<script[^>]+src="\/js\/ibis-headspace-speech\.js/,'Speech must hydrate through bootstrap instead of blocking the document.');
for (const moduleName of [
  'ibis-headspace-window-manager.js',
  'ibis-headspace-speech.js',
  'ibis-headspace-fabric.js',
  'ibis-headspace-universal.js',
  'ibis-headspace-preview.js',
  'ibis-headspace-handoff-guards.js',
  'ibis-headspace-statistics.js',
  'ibis-headspace-live-statistics.js',
  'ibis-headspace-capital.js',
  'ibis-headspace-live-model.js'
]) assert.match(bootstrap,new RegExp(moduleName.replaceAll('.','\\.')),`Headspace bootstrap must hydrate ${moduleName}`);
assert.match(bootstrap,/DOMContentLoaded/,'Capability hydration must begin after the document is interactive.');
assert.match(bootstrap,/setTimeout\(start, 0\)/,'Hydration must yield first paint before capability loading.');
assert.match(bootstrap,/failures\.push/,'Optional capability-load failures must degrade visibly rather than block the whole workspace.');

// Investor first paint must be neutral and evidence-bound. It must not present a fabricated
// conclusion or placeholder demand curve before a task has generated evidence.
assert.match(html,/What do you want to <span class="outcome-window"/,'Headspace must open with the founder-approved outcome-first invitation.');
assert.match(html,/Start with the reality you want\. ibis helps build the road there\./,'Headspace must carry the approved IBIS positioning line.');
assert.match(html,/ibis-flight\.webp/,'Headspace must use the lightweight owned purple-ibis flight asset.');
for (const scene of ['headspace-archipelago-trinidad-tobago.webp','headspace-archipelago-lesser-antilles.webp','headspace-archipelago-grenadines.webp']) assert.ok(html.includes(scene),`Missing restrained Headspace scene ${scene}`);
assert.match(html,/id="headspaceTime"/,'Headspace must connect its ambient arrival to the FTN Clock capability.');
assert.match(html,/Atmosphere: AI visualization · coastlines: Natural Earth/,'Synthetic atmosphere and sourced geography must be distinguished.');
assert.match(html,/caribbean-natural-earth\.svg/,'Headspace must ground its archipelago silhouettes in the Natural Earth map asset.');
assert.match(html,/Venezuela · Trinidad &amp; Tobago · Lesser Antilles/,'The quiet geographic orientation must state the real south-to-north corridor.');
assert.match(bootstrap,/node\.classList\.add\('dematerialized'\)/,'Headspace must open as a clear objective field without premature cards.');
assert.equal((html.match(/<article class="thought[^\"]*dematerialized"/g)||[]).length,(html.match(/<article class="thought/g)||[]).length,'Every Headspace card must be hidden in first-paint HTML, before asynchronous hydration.');
for (const outcome of ['make happen','achieve','find','understand','solve','build','change','prove']) assert.ok(arrival.includes(`'${outcome}'`),`Missing outcome phrase ${outcome}`);
assert.match(arrival,/prefers-reduced-motion: reduce/,'Outcome motion must respect reduced-motion preferences.');
assert.match(arrival,/America\/Port_of_Spain/,'Ambient clock must use the real Trinidad and Tobago IANA time zone.');
for (const part of ['morning','daytime','evening','night']) assert.ok(arrival.includes(`'${part}'`),`Missing Trinidad-time atmosphere state ${part}`);
assert.match(arrival,/20000/,'The first orientation minute must reveal the second Caribbean scene.');
assert.match(arrival,/40000/,'The first orientation minute must reveal the third Caribbean scene.');
assert.match(arrival,/60000/,'The four-minute settled cadence must begin only after the orientation minute.');
assert.match(arrival,/random\(42000,96000\)/,'Repeated ibis crossings must remain rare enough for an ambient workspace.');
assert.match(arrival,/first\?10500/,'The first ibis crossing must wait until the geographic arrival flight settles.');
assert.match(arrival,/random\(150000,360000\)/,'Working-mode ibis discoveries must be substantially rarer than arrival motion.');
assert.match(arrival,/random\(120,320\)/,'Working-mode ibis discoveries must remain visually small.');
assert.match(arrival,/random\(300,760\)/,'Ibis crossings must vary scale to preserve aerial depth.');
assert.match(arrival,/flight-from-left.*flight-from-right/,'Ibis paths must vary travel direction.');
assert.match(arrival,/240000/,'Atmospheric scenes must rotate slowly rather than distract from the objective.');
assert.match(html,/thought-graph dematerialized/,'The graph surface must remain hidden until real evidence requests it.');
assert.match(html,/body\{overflow-y:auto\}\.headspace\{height:auto;overflow:visible\}\.field\{inset:auto\}/,'Headspace must neutralize the legacy viewport lock and 116px field offset.');
assert.match(html,/@media \(max-height:820px\) and \(min-width:721px\)/,'Short or zoomed desktop viewports need a compact first paint that clears the fixed command dock.');
assert.doesNotMatch(html,/Sample signal/i,'Headspace must not show sample demand data on the investor surface.');
assert.doesNotMatch(html,/Caribbean context is first-class infrastructure\./i,'The old canned conclusion must not return.');

for (const id of ['speakAnswer','speechPause','speechRewind','speechSpeed','speechNext']) assert.match(html, new RegExp(`id="${id}"`), `Missing speech control ${id}`);
assert.match(html,/Founder voice controls/);
assert.match(html,/approved Chatterbox founder voice/);
for (const operation of ['ibis-founder-voice',"action:'speak'",'IBIS_FOUNDER_VOICE','founderListeningApproved','new Audio','.pause(','.play(','move(-10)','move(10)','playbackRate']) assert.ok(speech.includes(operation), `Missing speech operation ${operation}`);
assert.doesNotMatch(speech,/speechSynthesis/,'The founder voice control must not substitute a generic browser voice.');
for (const action of ['place','snapNode','minimize','restore','tile','stack']) assert.match(manager, new RegExp(`function ${action}\\b`));
assert.match(manager,/function freeform\b/,'Headspace must expose a genuine unsnapped freeform layout.');
assert.match(manager,/if\s*\(mode!==['"]freeform['"]\)\s*\{?\s*freeform\(\)/,'Dragging a snapped card must implicitly unsnap Headspace rather than snapping it back.');
assert.match(manager,/document\.addEventListener\('pointermove',moveDrag,true\)/,'Headspace drag must survive the grid-to-freeform DOM/layout transition.');
assert.match(fabric,/manager\.getMode\(\)!==['"]freeform['"]\)\{manager\.arrange\(manager\.getMode\(\)\);return;\}/,'The fabric must not reapply freeform percentages over a snapped layout.');
for (const code of ['TT','JM','BB','GY','LC','VE']) assert.match(themes, new RegExp(`${code}: \\{`));
assert.match(themes, /VE:.*primary: '#f2c94c'.*secondary: '#1f5ca8'.*tertiary: '#d71920'/);
assert.match(themes, /GY:.*secondary: '#2f8f48'.*tertiary: '#d71920'.*ink: '#08090b'.*muted: '#ffffff'/);
assert.match(themes, /ibis-native.*primary: '#55d6d0'.*secondary: '#ef5b4f'.*tertiary: '#f7f8fa'/);

// Regression gate: public ibis must keep an explicit same-origin Headspace entry and preserve the
// capability/health/permission truth boundary.
assert.match(publicHtml, /ibis-query-bootstrap\.js/,'Public ibis workspace must load the recovery entry bootstrap.');
assert.match(publicBootstrap, /data-ibis-headspace-entry/,'Public ibis workspace must expose a visible Headspace entry.');
assert.match(publicBootstrap, /href="\/ibis-headspace-preview\/"/,'Public Headspace entry must target the connected Headspace route.');
assert.match(publicBootstrap, /Live tools remain capability, health and permission gated/i,'Public entry must preserve the truth boundary in user-visible copy.');

// Truthful tools surface: it must inspect its own governed dependencies rather than making the
// entire runtime a prerequisite for reporting tool health.
assert.match(fabric, /ibis-headspace-tool-health\.js/,'Headspace fabric must load the real tool-health surface.');
assert.match(toolHealth, /IbisToolCatalog\.load\('\/data\/ibis-capability-registry\.json'\)/,'Tool health must read the governed capability registry.');
assert.match(toolHealth, /ConnectionFabric\.health\(\)/,'Tool health must read real connection-fabric health.');
assert.match(toolHealth, /catalog\.enabled/,'Tool health must distinguish enabled tools from total registered tools.');
assert.match(toolHealth, /will not claim disconnected tools are usable/i,'Tool health must fail closed when health cannot be verified.');
assert.doesNotMatch(toolHealth, /API[_ -]?KEY|SECRET|TOKEN\s*=/i,'Headspace tool health must not embed credential material.');

// Scout truth-state: configured sources, scheduled automation and observed execution are separate.
assert.match(fabric, /ibis-headspace-scout-health\.js/,'Headspace fabric must load Scout Network health.');
assert.match(scoutHealth, /\/data\/scout-2-source-registry\.json/,'Scout health must use the governed Scout 2.0 source registry.');
assert.match(scoutHealth, /actions\/runs\?event=schedule/,'Scout health must check observable scheduled workflow history rather than claim an unseen run.');
assert.match(scoutHealth, /run\.status==='in_progress'\|\|run\.status==='queued'/,'Scout health must distinguish an active run from a completed run.');
assert.match(scoutHealth, /will not claim a scout is running/i,'Scout health must fail closed when runtime state cannot be verified.');
assert.equal(scoutRegistry.sources.length,9,'Scout 2.0 official-source registry count changed; review the Headspace truth surface.');
assert.equal(scoutRegistry.policy.paidApis,false,'Scout 2.0 must remain zero-paid-API by default.');
assert.equal(scoutRegistry.policy.automaticApplications,false,'Scout 2.0 must not auto-apply.');
assert.equal(scoutRegistry.policy.automaticSpend,false,'Scout 2.0 must not auto-spend.');
assert.equal(scoutRegistry.policy.founderApprovalRequired,true,'Scout 2.0 must preserve founder approval.');
assert.doesNotMatch(scoutHealth, /API[_ -]?KEY|SECRET|TOKEN\s*=/i,'Scout health must not embed credential material.');

console.log('ibis Headspace source audit: non-blocking bootstrap, neutral first paint, freeform unsnap, window arrangements, minimize/restore, country themes, speech controls, public entry, truthful tool health and Scout truth-state verified.');
