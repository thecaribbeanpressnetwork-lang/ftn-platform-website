// FTN Platform — sitemap.xml generator.
//
// Phase 3 (Product Registry consolidation) eliminates sitemap.xml as a hand-maintained duplicate
// of product routes — see GOVERNANCE/FTN_Phase3_Product_Registry_and_Live_Consolidation_2026-08-24.md
// §4. Product URLs are derived from js/product-registry-data.js's sitemapProducts(); everything
// else here is a page with no registry entry by design (legal pages, the directory/sitemap/trust
// utility pages themselves) — that list is explicit and documented, not silently inferred, so a
// removed page doesn't silently vanish from search results without someone noticing the diff.
//
// Run: node scripts/generate-sitemap.mjs
// Verify without writing: node scripts/generate-sitemap.mjs --check (exits 1 if sitemap.xml's
// URL set would change — used the same way as the other tests/*-audit.mjs scripts).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadRegistry as loadRegistryShared } from './lib/registry-loader.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Non-product utility/legal pages: real, crawlable, but not "FTN products" and so correctly
// absent from the Product Registry. Keeping this list explicit (rather than e.g. globbing every
// index.html) means a genuinely private/vaulted page never accidentally ends up here.
const UTILITY_PAGES = [
  '/about/',
  '/applications/',
  '/clock/',
  '/resources/',
  '/contact/',
  '/insights/',
  '/sitemap/',
  '/accessibility/',
  '/trust/',
  '/glossary/',
  '/legal/privacy-policy/',
  '/legal/terms-of-service/',
  '/legal/cookie-policy/',
  '/legal/data-retention/',
  '/legal/community-guidelines/',
  '/legal/copyright/',
  '/legal/affiliate-disclosure/',
  '/legal/responsible-ai/',
];

function buildUrlList() {
  const Registry = loadRegistryShared(root);
  // Fragment routes (e.g. '/radio/#ftn-epk') are the same crawlable document as their base path —
  // an XML sitemap should list the document once, not once per in-page anchor.
  const productRoutes = Registry.sitemapProducts()
    .map((p) => p.route)
    .filter((route) => !route.includes('#'));
  const seen = new Set();
  const ordered = [];
  for (const route of [...productRoutes, ...UTILITY_PAGES]) {
    if (seen.has(route)) continue;
    seen.add(route);
    ordered.push(route);
  }
  return ordered;
}

function renderXml(urls) {
  const body = urls
    .map((u) => `  <url><loc>https://ftnplatform.org${u}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

const urls = buildUrlList();
const xml = renderXml(urls);
const targetPath = resolve(root, 'sitemap.xml');

if (process.argv.includes('--check')) {
  const current = readFileSync(targetPath, 'utf8');
  const currentUrls = [...current.matchAll(/<loc>https:\/\/ftnplatform\.org([^<]*)<\/loc>/g)].map((m) => m[1]);
  const currentSet = new Set(currentUrls);
  const newSet = new Set(urls);
  const added = urls.filter((u) => !currentSet.has(u));
  const removed = currentUrls.filter((u) => !newSet.has(u));
  if (added.length || removed.length) {
    if (added.length) console.log('Would add:', added.join(', '));
    if (removed.length) console.log('Would remove:', removed.join(', '));
    console.error(`sitemap.xml is stale relative to the Product Registry (${added.length} to add, ${removed.length} to remove). Run: node scripts/generate-sitemap.mjs`);
    process.exit(1);
  }
  console.log(`sitemap.xml is current: ${urls.length} URLs, all registry-derivable or explicit utility pages.`);
} else {
  writeFileSync(targetPath, xml);
  console.log(`Wrote sitemap.xml: ${urls.length} URLs (${urls.length - UTILITY_PAGES.length} from the Product Registry, ${UTILITY_PAGES.length} explicit utility pages).`);
}
