import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('js/ibis-headspace-universal.js','utf8');
for(const required of [
  'ibis-web-research',
  'function needsLiveEvidence',
  'function personLookup',
  'function groundedResearch',
  "kind:'GROUNDED_RESEARCH'",
  'Grounded sources',
  'IBIS · GROUNDED WEB RESEARCH',
  'function publicAnswer',
]) assert(source.includes(required),`Headspace grounded-research invariant missing: ${required}`);

assert.match(source,/if\(needsLiveEvidence\(text\)\)return\{kind:'GROUNDED_RESEARCH'/,'Evidence-dependent Headspace questions must reach universal web research before generic model text.');
assert.match(source,/Evidence Boundary\|What Could Change It\|Next Action/,'Headspace must strip internal reasoning labels from public research answers.');
assert.match(source,/body\.sources/,'Grounded Headspace answers must require and expose source evidence.');
assert.doesNotMatch(source,/This is a person lookup\. Do not guess/,'Person lookups must not merely prompt model memory to fail closed; they must route to research.');

console.log('Headspace research-route gate passed: evidence-dependent questions use grounded web research and public output is sanitized.');
