// FTN Platform — primary navigation drift audit (Phase 3 nav consolidation).
//
// Guards the guarantee scripts/sync-nav.mjs exists to provide: the desktop nav, the mobile nav,
// the no-JS static fallback on every configured page, and js/product-registry-data.js's own
// navPlacement.primary flags never quietly diverge from data/nav-config.mjs. Two layers:
//   1. Run the sync script's own --check mode -- catches any generated target (js/nav.js's
//      PRIMARY_NAV literal, or any of the 42 pages' static regions) that would change, and catches
//      a registry/config mismatch (an orphaned navPlacement.primary flag, or a nav-config.mjs
//      entry pointing at a product that isn't flagged primary) since sync-nav.mjs throws on those
//      before it even gets to comparing file content.
//   2. Independent content assertions below that don't merely re-run the generator, so a bug
//      shared between sync-nav.mjs and this audit couldn't silently pass both.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// --- 1. Drift check: everything sync-nav.mjs owns must already match data/nav-config.mjs. ---
try {
  execFileSync('node', ['scripts/sync-nav.mjs', '--check'], { stdio: 'pipe' });
} catch (err) {
  const output = (err.stdout || '').toString() + (err.stderr || '').toString();
  throw new Error(`Primary navigation has drifted from data/nav-config.mjs (or the registry/config link is broken):\n${output}`);
}

// --- 2. Independent verification, not a re-run of the generator's own logic. ---
const source = fs.readFileSync('js/product-registry-data.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
vm.runInContext(fs.readFileSync('js/product-registry.js', 'utf8'), context);
const products = context.window.FTN.ProductRegistryData;

const { PRIMARY_NAV } = await import(pathToFileURL('data/nav-config.mjs'));

// The founder-approved public structure (this exact prompt's own wording), asserted literally so
// a future edit to data/nav-config.mjs that silently drops or reorders an item fails loudly here,
// not just "sync-nav.mjs --check still passes because it's internally consistent with itself".
const APPROVED_LABELS = [
  'FTN Platform', 'FTN Community Connect', 'FTN Live', 'FTN Parliament', 'FTN TV',
  'FTN Kaiso', 'FTN Riddim', 'FTN Invest-in', 'FTN Directory', 'About FTN', 'Contact',
];
const resolvedLabels = PRIMARY_NAV.map((entry) => entry.registry
  ? products.find((p) => p.id === entry.registry)?.name
  : entry.label);
assert.deepEqual(resolvedLabels, APPROVED_LABELS, 'Primary navigation no longer matches the founder-approved public structure (order or membership changed)');

// Bidirectional registry <-> config link, re-derived independently of sync-nav.mjs's own copy of
// this same check (assertNoOrphanedPrimaryFlags / resolveNav's throw).
const configuredIds = new Set(PRIMARY_NAV.filter((e) => e.registry).map((e) => e.registry));
const flaggedIds = new Set(products.filter((p) => p.navPlacement && p.navPlacement.primary === true).map((p) => p.id));
assert.deepEqual([...configuredIds].sort(), [...flaggedIds].sort(), 'data/nav-config.mjs and navPlacement.primary flags in js/product-registry-data.js must list exactly the same product ids');

// FTN Display was deliberately removed from the primary row (consolidated into FTN Screen as
// Display Mode, 2026-08-24 founder decision) -- guard against it silently reappearing without a
// deliberate data/nav-config.mjs + navPlacement.primary change on both sides.
const display = products.find((p) => p.id === 'display');
assert.equal(display.navPlacement.primary, false, 'FTN Display must not silently re-enter primary navigation (it is a capability of FTN Screen, not an independent nav entry)');
assert(!configuredIds.has('display'), 'FTN Display must not appear in data/nav-config.mjs\'s PRIMARY_NAV');

// FTN prefix requirement (CLAUDE.md §6): every registry-sourced primary label keeps its FTN
// prefix. The three literal, non-product structural entries are the sole exemption -- they are
// site navigation, not FTN products.
const NON_PRODUCT_LABELS = new Set(['FTN Directory', 'About FTN', 'Contact']);
for (const entry of PRIMARY_NAV) {
  if (!entry.registry) continue;
  const product = products.find((p) => p.id === entry.registry);
  assert.match(product.name, /^FTN /, `Registry-sourced primary nav entry '${product.name}' must keep its FTN prefix`);
}
const literalLabels = new Set(PRIMARY_NAV.filter((e) => !e.registry).map((e) => e.label));
assert.deepEqual(literalLabels, NON_PRODUCT_LABELS, 'The literal (non-registry) structural nav entries changed unexpectedly');

// Account/sign-in/identity controls (CLAUDE.md requirement: preserve them through this pass) --
// still wired in js/nav.js, untouched by the nav-content generation region.
const navJsSource = fs.readFileSync('js/nav.js', 'utf8');
for (const marker of ['data-sign-in-entry', 'mountAccountIdentity', 'maybeMountOwnerControl', 'ftn-account-chip']) {
  assert(navJsSource.includes(marker), `js/nav.js must still wire up account/identity control: ${marker}`);
}

// Structural sanity on every generated page: exactly one desktop + one mobile FTN:NAV region
// (guards against a future hand-edit duplicating or half-deleting a marker pair).
const PAGES = fs.readFileSync('scripts/sync-nav.mjs', 'utf8').match(/const PAGES = \[([\s\S]*?)\];/)[1];
const pageFiles = [...PAGES.matchAll(/'([^']+)'/g)].map((m) => m[1]);
for (const file of pageFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const starts = (html.match(/FTN:NAV:START/g) || []).length;
  const ends = (html.match(/FTN:NAV:END/g) || []).length;
  assert.equal(starts, 2, `${file} must have exactly 2 FTN:NAV:START markers (desktop + mobile), found ${starts}`);
  assert.equal(ends, 2, `${file} must have exactly 2 FTN:NAV:END markers (desktop + mobile), found ${ends}`);
  // Regression guard: the exact stale, drifted static content this pass found and fixed
  // (404.html/observatory/index.html and others independently hand-edited over time into a
  // "Home/About/News/Partners/InvestIn/Contact" list, missing FTN Directory entirely) must not
  // silently reappear via a future hand-edit outside the marker region.
  assert(!/>News<\/a>/.test(html), `${file} must not carry the stale hardcoded "News" nav link this pass removed`);
  assert(!/contact\/#commercial">Partners</.test(html), `${file} must not carry the stale hardcoded "Partners" nav link this pass removed`);
}

console.log(`Primary navigation is registry-driven and drift-free across js/nav.js and ${pageFiles.length} pages.`);
