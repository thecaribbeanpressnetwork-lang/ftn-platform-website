// FTN Platform — one-time cleanup for FTN Consolidation (2026-09-18).
//
// data/footer-config.mjs / scripts/sync-footer.mjs only own the "bottom" bar on 'bottom-only'
// variant pages (see that script's own header comment) -- their "Platform"/"Resources" style
// footer columns are deliberately hand-curated per page and were never touched by this
// consolidation's registry/nav/footer-config changes. This script surgically removes just the
// anchor tags pointing at routes that are now absorbed capabilities (their route stays live, but
// they must stop being advertised as independent products in every footer that hand-links them),
// leaving every other hand-curated link on each page untouched.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const ABSORBED_ROUTES = [
  '/scenario-workspace/', '/riddim/', '/kaiso/', '/learn/', '/display/', '/tv/',
  '/parliament/', '/top-picks/', '/riddim/fire/', '/riddim/daw/',
];

const PAGES = [
  'clock/index.html', 'display/index.html', 'display-network/index.html', 'events/index.html',
  'facethenation/index.html', 'ibis-ai/index.html', 'index.html', 'kaiso/index.html', 'learn/index.html',
  'opportunities/index.html', 'radio/index.html', 'riddim/index.html', 'screen/index.html', 'tv/index.html',
  'community-connect/index.html', 'top-picks/index.html', 'riddim/fire/index.html', 'riddim/dj/index.html',
  'riddim/daw/index.html',
];

let changedFiles = 0;
let removedTotal = 0;
for (const page of PAGES) {
  const file = resolve(root, page);
  const before = readFileSync(file, 'utf8');
  let after = before;
  let removed = 0;
  for (const route of ABSORBED_ROUTES) {
    // Exact href match only (route + closing quote), never a substring of a longer route like
    // /riddim/dj/ or /riddim/fire/ when stripping the bare /riddim/ entry.
    const re = new RegExp('<a href="' + route.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '"[^>]*>[^<]*</a>', 'g');
    const matches = after.match(re);
    if (matches) { removed += matches.length; after = after.replace(re, ''); }
  }
  if (after !== before) {
    changedFiles += 1;
    removedTotal += removed;
    if (!CHECK) writeFileSync(file, after);
    console.log((CHECK ? '[would change] ' : '[changed] ') + page + ': removed ' + removed + ' stale footer link(s)');
  }
}
console.log(`\n${changedFiles} file(s) ${CHECK ? 'would be' : 'were'} changed, ${removedTotal} stale absorbed-product footer link(s) ${CHECK ? 'found' : 'removed'} total.`);
if (CHECK && changedFiles > 0) process.exit(1);
