import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const html = fs.readFileSync('ibis-headspace-preview/index.html','utf8');
const bootstrap = fs.readFileSync('js/ibis-headspace-bootstrap.js','utf8');
const arrival = fs.readFileSync('js/ibis-headspace-arrival.js','utf8');
const arrivalCss = fs.readFileSync('css/components/ibis-headspace-arrival.css','utf8');
const preview = fs.readFileSync('js/ibis-headspace-preview.js','utf8');
const themes = fs.readFileSync('js/ibis-country-themes.js','utf8');
const speech = fs.readFileSync('js/ibis-headspace-speech.js','utf8');
const universal = fs.readFileSync('js/ibis-headspace-universal.js','utf8');
const investorGuards = fs.readFileSync('js/ibis-investor-handoff-guards.js','utf8');
const manager = fs.readFileSync('js/ibis-headspace-window-manager.js','utf8');
const fabric = fs.readFileSync('js/ibis-headspace-fabric.js','utf8');
const toolHealth = fs.readFileSync('js/ibis-headspace-tool-health.js','utf8');
const scoutHealth = fs.readFileSync('js/ibis-headspace-scout-health.js','utf8');
const publicBootstrap = fs.readFileSync('js/ibis-query-bootstrap.js','utf8');
const publicHtml = fs.readFileSync('ibis-ai/index.html','utf8');
const scoutRegistry = JSON.parse(fs.readFileSync('data/scout-2-source-registry.json','utf8'));
const landmarkManifest = JSON.parse(fs.readFileSync('data/ibis-headspace-landmarks.json','utf8'));

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
assert.doesNotMatch(html,/ibis-flight/,'Headspace must not translate a still bird asset as fake flight.');
assert.match(html,/id="headspaceTime"/,'Headspace must connect its ambient arrival to the FTN Clock capability.');
assert.doesNotMatch(html,/headspace-archipelago-|AI-generated/,'Unverified generated geography must not appear on the Headspace arrival.');
assert.equal(landmarkManifest.count,51,'The Caribbean landmark collection must contain all 51 approved locations.');
assert.equal(landmarkManifest.landmarks.length,51,'The landmark manifest count must match its records.');
assert.equal(new Set(landmarkManifest.landmarks.map(item=>item.id)).size,51,'Every landmark must have a unique stable ID.');
assert.equal(new Set(landmarkManifest.landmarks.map(item=>item.localPath)).size,51,'Every landmark must use its own local asset.');
for (const item of landmarkManifest.landmarks) {
  assert.match(item.articleUrl,/^https:\/\/(?:en\.)?wikipedia\.org\//,`${item.id} needs a named landmark information link.`);
  assert.match(item.descriptionUrl,/^https:\/\/commons\.wikimedia\.org\//,`${item.id} needs a Commons provenance link.`);
  assert.match(item.license,/^(?:CC0|CC BY(?:-SA)?|Public domain|PDM)/i,`${item.id} does not have an allowed licence.`);
  assert.ok(item.author,`${item.id} needs an attribution holder.`);
  assert.ok(Array.isArray(item.dayparts)&&item.dayparts.length,`${item.id} needs a clock-aligned daypart.`);
  const localFile=item.localPath.replace(/^\//,'');
  const bytes=fs.readFileSync(localFile);
  assert.ok(bytes.length>80_000,`${item.id} is missing or too small to be a production scene.`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.fileHashSha256,`${item.id} does not match its provenance hash.`);
}
assert.equal((html.match(/data-scene-layer=/g)||[]).length,2,'Headspace must crossfade through exactly two reusable image layers.');
for (const id of ['sceneLabel','sceneArticle','sceneCredit']) assert.match(html,new RegExp(`id="${id}"`),`Missing unobtrusive landmark metadata surface ${id}.`);
assert.match(arrival,/fetch\('\/data\/ibis-headspace-landmarks\.json'/,'Headspace must render the governed 51-location manifest.');
assert.match(bootstrap,/node\.classList\.add\('dematerialized'\)/,'Headspace must open as a clear objective field without premature cards.');
assert.equal((html.match(/<article class="thought[^\"]*dematerialized"/g)||[]).length,(html.match(/<article class="thought/g)||[]).length,'Every Headspace card must be hidden in first-paint HTML, before asynchronous hydration.');
for (const outcome of ['make happen?','achieve?','find?','understand?','solve?','build?','change?','prove?']) assert.ok(arrival.includes(`'${outcome}'`),`Missing punctuated outcome phrase ${outcome}`);
assert.match(html,/id="outcomeWord" class="outcome-word">make happen\?<\/span><\/span>/,'Each outcome must own its question mark so punctuation cannot drift away.');
assert.match(arrivalCss,/\.outcome-window\{[^}]*width:6\.35em/,'The outcome frame must reserve a stable width so the sentence never jumps.');
assert.match(arrival,/prefers-reduced-motion: reduce/,'Outcome motion must respect reduced-motion preferences.');
assert.match(arrival,/America\/Port_of_Spain/,'Ambient clock must use the real Trinidad and Tobago IANA time zone.');
for (const part of ['morning','daytime','evening','night']) assert.ok(arrival.includes(`'${part}'`),`Missing Trinidad-time atmosphere state ${part}`);
assert.match(arrival,/window\.setInterval\(advance,5200\)/,'Outcome words must remain long enough to read calmly.');
assert.doesNotMatch(arrival,/scheduleFlight|function fly/,'Headspace must not simulate wing flight with a static image.');
assert.match(arrival,/240000/,'Idle landmark rotation must settle to a four-minute cadence.');
assert.match(arrival,/MutationObserver[\s\S]*headspace-engaged[\s\S]*stopScenes/,'Landmark changes must stop as soon as Headspace begins working.');
assert.doesNotMatch(arrival,/orientationTimers|settleRotation|\b20000\b|\b40000\b|\b60000\b/,'Discarded three-scene sequencing logic must not remain.');
assert.match(arrival,/matchingLandmarks[\s\S]*dataset\.daypart/,'Landmark selection must respect the Trinidad-time atmosphere.');
assert.match(html,/id="liveView"[^>]+aria-pressed="false"/,'Headspace needs an explicit Live view toggle.');
assert.match(html,/<details class="headspace-menu" id="headspaceMenu">/,'Secondary controls must live behind the three-dot menu.');
assert.match(arrival,/requestFullscreen/,'Live view must request browser fullscreen from its user gesture.');
assert.match(arrivalCss,/body\.ambient-live \.scene-image\{filter:saturate\(1\.16\) contrast\(1\.04\)\}/,'Live view must restore vivid undimmed landmark colour.');
assert.match(arrivalCss,/body\.ambient-live \.identity[\s\S]*\.input-orbit[\s\S]*display:none!important/,'Live view must preserve the scene and clock without working controls.');
assert.match(arrivalCss,/\.head-actions\{z-index:260/,'The protected controls must remain above cards and the command dock.');
assert.doesNotMatch(html,/<(?:label|input)[^>]+(?:headspaceOpacity|opacity-control)/,'The retired Focus control must not remain in the public interface.');
assert.doesNotMatch(preview,/headspaceOpacity|applyOpacity/,'The retired Focus control logic must not remain in the preview controller.');
assert.doesNotMatch(manager,/headspaceOpacity|wireOpacity|__ibisSetOpacity/,'The retired Focus control logic must not remain in the window manager.');
assert.doesNotMatch(preview,/function draggable/,'Only the spatial window manager may own card dragging.');
assert.match(arrivalCss,/body\.headspace-engaged \.field\{top:auto!important;padding-bottom:190px\}/,'Working cards must clear the fixed command dock without an artificial top offset.');
assert.match(investorGuards,/var informational=/,'Information questions must be excluded from side-effect handoff interception.');
assert.match(investorGuards,/moneyAction&&!informational/,'Rates, prices and calculations must not be mistaken for payment execution.');
assert.match(universal,/function mortgageAnswer\b/,'Headspace must complete bounded mortgage calculations without a fragile capability handoff.');
assert.match(universal,/ibis-image-cloudflare/,'Headspace image requests must reach the verified real image route.');
assert.match(universal,/function renderImage\b[\s\S]*Download image/,'Headspace must render a real downloadable image artifact.');
assert.match(manager,/Math\.min\(count\|\|1,max\)/,'Window columns must adapt to the number of visible results.');
assert.match(manager,/function fit\b/,'Answer and media windows must adapt to their real content.');
assert.match(speech,/function splitText\b/,'Founder voice must split long answers into bounded synthesis chunks.');
assert.match(speech,/chunkIndex<chunks\.length[\s\S]*playChunk/,'Founder voice must continue automatically through every answer chunk.');
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
