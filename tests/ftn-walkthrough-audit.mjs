// Real correctness test for js/ftn-walkthrough.js -- the Walkthrough Engine data-model
// foundation (Phase H, final integration pass). This is a data-model test: no video rendering
// exists yet, and this file does not claim any -- it verifies the shape, validation, and real
// staleness-detection logic against the actual product registry.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/product-registry-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/product-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ftn-walkthrough.js', 'utf8'), context);
const WT = context.window.FTN.Walkthrough;
const Registry = context.window.FTN.ProductRegistry;

// -- Real product ids exist in the registry (sanity check the fixture itself is real) ----------
const screen = Registry.get('screen');
assert(screen, 'The "screen" product must exist in the real registry for this test to be meaningful');

// -- walkthroughStep: fail-closed on an invalid action --------------------------------------
assert.throws(() => WT.walkthroughStep({ action: 'DESTROY_EVERYTHING' }), /valid action/);
const step = WT.walkthroughStep({ action: 'NAVIGATE', route: '/screen/', narration: 'Open FTN Screen.' });
assert.equal(step.status, 'DRAFT', 'A step with no explicit status defaults to DRAFT, not a fabricated READY');
assert.equal(step.screenshot, null, 'A step must not claim a screenshot exists until one is real');
assert.equal(step.videoSegment, null, 'A step must not claim a video segment exists until one is real');

// -- createWalkthrough: fail-closed on an unknown product id --------------------------------
assert.throws(() => WT.createWalkthrough('PRODUCT_TOUR', { productIds: ['not-a-real-product-id'] }), /unknown product id/);

// -- createWalkthrough: real product ids succeed, steps validated ---------------------------
const tour = WT.createWalkthrough('PRODUCT_TOUR', {
  title: 'FTN Screen walkthrough',
  productIds: ['screen'],
  steps: [
    { action: 'NAVIGATE', route: '/screen/', narration: 'This is FTN Screen.' },
    { action: 'HIGHLIGHT', targetElement: '.screen-discovery__card', narration: 'Real Caribbean titles, sourced honestly.' },
  ],
});
assert.equal(tour.steps.length, 2);
assert.equal(tour.status, 'DRAFT');
assert.equal(tour.generatedAt, null, 'A brand-new walkthrough must not claim it was ever actually generated');
assert.equal(tour.canonicalVideoUrl, null);

// -- Never fabricates a YouTube dependency: youtubeUrl is optional and separate from canonical --
assert.equal(tour.youtubeUrl, null, 'youtubeUrl must never be silently populated -- it is optional, never canonical');

// -- Staleness: a never-generated walkthrough is honestly "never generated", not "stale" -----
const neverGenerated = WT.checkStaleness(tour);
assert.equal(neverGenerated.neverGenerated, true);
assert.equal(neverGenerated.stale, false);

// -- Staleness: a walkthrough generated BEFORE the product's real lastVerified date is stale --
const oldGeneratedAt = '2020-01-01T00:00:00.000Z'; // real registry data postdates this by construction
const staleTour = WT.createWalkthrough('PRODUCT_TOUR', { productIds: ['screen'], generatedAt: oldGeneratedAt, status: 'READY' });
const staleness = WT.checkStaleness(staleTour);
assert.equal(staleness.stale, true, 'A walkthrough generated in 2020 must be detected stale against screen\'s real, much more recent lastVerified date');
assert(staleness.reasons.length > 0 && staleness.reasons[0].includes('screen'));

// -- summarize() correctly downgrades a stale READY walkthrough's effective status -----------
const summary = WT.summarize(staleTour);
assert.equal(summary.status, 'STALE', 'summarize() must report the EFFECTIVE status, not just blindly echo a now-inaccurate READY');

// -- A genuinely fresh walkthrough (generated far in the future) is correctly NOT stale -------
const freshTour = WT.createWalkthrough('PRODUCT_TOUR', { productIds: ['screen'], generatedAt: '2099-01-01T00:00:00.000Z', status: 'READY' });
assert.equal(WT.summarize(freshTour).status, 'READY');

console.log('ftn-walkthrough-audit: real step/walkthrough shape validated, fail-closed on unknown actions/product ids, no fabricated screenshot/video/generatedAt/youtubeUrl on a new walkthrough, real staleness detection verified against the actual product registry (both a genuinely stale case and a genuinely fresh case).');
