// Investigated as part of the canonical-orchestration correction (not dismissed as unrelated,
// even though it predates that work): this file's original two checks were both stale relative
// to the current codebase, for two different reasons --
//
// 1. The script-load-order assertion read ibis-headspace-preview/index.html for static
//    <script src="/js/ibis-headspace-fabric.js">-style tags. Headspace was refactored (see
//    js/ibis-headspace-bootstrap.js) to load every module through one sequential async loader
//    instead of static tags -- the HTML now only references ibis-headspace-bootstrap.js itself.
//    The real load order (fabric -> universal -> preview) is still correct; it lives in that
//    loader's `modules` array now, so the assertion is rewritten to check that array instead of
//    markup that no longer exists.
//
// 2. The "plain read-only questions must use the canonical TEXT provider without the multi-agent
//    wrapper" assertion required js/ibis-headspace-universal.js to contain isPlainAnswer(route) --
//    the exact client-side gate this pass removed, because it let the BROWSER decide a question
//    was simple enough to skip canonical orchestration (FTN.IbisRuntime.ask()) entirely. That was
//    the architecture being corrected, not a property to keep guarding. The replacement assertion
//    below instead guards the corrected invariant: no such gate exists, and ask() unconditionally
//    calls FTN.IbisRuntime.ask() for every prompt.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap = fs.readFileSync('js/ibis-headspace-bootstrap.js', 'utf8');
const preview = fs.readFileSync('js/ibis-headspace-preview.js', 'utf8');
const fabric = fs.readFileSync('js/ibis-headspace-fabric.js', 'utf8');
const universal = fs.readFileSync('js/ibis-headspace-universal.js', 'utf8');
const assistantEdge = fs.readFileSync('supabase/functions/ibis-assistant/index.ts', 'utf8');
const cloudflareEdge = fs.readFileSync('supabase/functions/ibis-text-cloudflare/index.ts', 'utf8');

const modulesMatch = bootstrap.match(/var modules\s*=\s*\[([\s\S]*?)\];/);
assert(modulesMatch, 'ibis-headspace-bootstrap.js must define its module load list as `var modules = [...]`.');
const moduleOrder = modulesMatch[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '').split('?')[0]).filter(Boolean);
const fabricIndex = moduleOrder.indexOf('/js/ibis-headspace-fabric.js');
const universalIndex = moduleOrder.indexOf('/js/ibis-headspace-universal.js');
const previewIndex = moduleOrder.indexOf('/js/ibis-headspace-preview.js');
assert(fabricIndex >= 0 && universalIndex > fabricIndex && previewIndex > universalIndex,
  'Headspace bootstrap must load its fabric, universal runtime bridge, then local spatial-command handler in that order (loader awaits each module sequentially, so array order is real load order).');

const submitStart = preview.indexOf("document.getElementById('inputOrbit')?.addEventListener('submit'");
const submitSource = preview.slice(submitStart, submitStart + 320);
assert.match(submitSource, /if\(!interpret\(text\)\)return/,
  'The local spatial-command handler must release ordinary questions to universal IBIS.');
assert.doesNotMatch(submitSource, /answerFromPrompt\(text\)/,
  'Ordinary questions must not be answered by prototype copy.');
assert.match(submitSource, /,true\)/,
  'Spatial commands must be claimed during capture before the universal fallback.');
assert.match(fabric, /document\.querySelector\('script\[src\^=/,
  'Dynamic fabric loading must not duplicate the statically loaded universal bridge.');

assert.doesNotMatch(universal, /function isPlainAnswer/,
  'The browser must not decide a question is "plain" and route around canonical orchestration -- js/ibis-runtime.js\'s own ask() already classifies internally.');
assert.match(universal, /async function ask\(text,context\)\{/,
  'ask() must take only (text, context) -- no route/classification argument the caller could use to gate canonical orchestration.');
const askBody = universal.slice(universal.indexOf('async function ask(text,context){'), universal.indexOf('async function ask(text,context){') + 900);
assert.match(askBody, /FTN\.IbisRuntime\.ask\(text,context\)/,
  'ask() must call FTN.IbisRuntime.ask() unconditionally for every prompt -- the canonical entry point every Headspace question enters.');
assert.doesNotMatch(askBody, /kind:'DIRECT_TEXT'/,
  'The old DIRECT_TEXT short-circuit result kind must be gone -- a plain question no longer bypasses the runtime call above.');
assert.match(askBody, /kind:'DEGRADED'/,
  'A runtime that is unavailable/times out/throws must be reported as an explicit DEGRADED result, not silently disguised as a normal canonical answer.');

assert.match(universal, /var direct=result&&\(result\.data\|\|result\.result\)\|\|\{\};if\(direct\.answer\)return direct\.answer/,
  'Headspace must still be able to render an answer returned directly inside the canonical runtime result shape.');
[assistantEdge, cloudflareEdge].forEach((source) => {
  assert.match(source, /ftn-platform-website\\\.pages\\\.dev/,
    'IBIS text gateways must allow the owned Cloudflare Pages preview domain.');
  assert.match(source, /url\.protocol === "https:"/,
    'Preview-origin access must remain HTTPS-only.');
});

console.log('IBIS Headspace routing: spatial commands stay local, every ordinary and specialist question enters FTN.IbisRuntime.ask() unconditionally (no client-side plain-question gate), and a runtime failure is reported DEGRADED rather than disguised as canonical.');
