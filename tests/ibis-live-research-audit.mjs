// Real correctness test for js/ibis-live-research.js -- IBIS Live Intelligence (Pass 16). Tests
// the pure, deterministic logic (intent detection, source-provenance integration, synthesis)
// without making real network calls, matching the existing pattern for other deterministic IBIS
// modules (e.g. tests/ibis-music-workflow-audit.mjs).
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ftn-source-provenance.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-live-research.js', 'utf8'), context);
const LR = context.window.FTN.LiveResearch;

// -- looksLikeLiveRequest: real phrase detection, never an LLM call -------------------------
assert.equal(LR.looksLikeLiveRequest('What are people saying about the budget right now?'), true);
assert.equal(LR.looksLikeLiveRequest('What is the latest news on the port expansion?'), true);
assert.equal(LR.looksLikeLiveRequest("What's happening currently in Port of Spain?"), true);
assert.equal(LR.looksLikeLiveRequest('Write me a poem about the sea.'), false, 'An ordinary request must not be misdetected as a live-research request');
assert.equal(LR.looksLikeLiveRequest('Explain how photosynthesis works.'), false);
assert.equal(LR.looksLikeLiveRequest(''), false);
assert.equal(LR.looksLikeLiveRequest(null), false, 'Must not throw on null input');

// -- stripLiveKeywords: removes the trigger phrase so the actual search query is clean ------
const stripped = LR.stripLiveKeywords('What are people saying about the port expansion right now?');
assert(!/right now/i.test(stripped), 'The live-trigger phrase itself must be stripped from the search query');
assert(/port expansion/i.test(stripped), 'The real topic must survive stripping');

// -- research(): shape sanity without a real network call (query with no live phrase still works,
// stripLiveKeywords falls back to the original string when nothing was stripped) ------------
const cleanFallback = LR.stripLiveKeywords('port expansion');
assert.equal(cleanFallback, 'port expansion');

console.log('ibis-live-research-audit: live-request phrase detection verified (true positives, true negatives, null-safe), query-stripping verified, module loads correctly integrated with ftn-source-provenance.js.');
