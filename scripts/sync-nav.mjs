// FTN Platform — primary navigation synchronization script.
//
// Phase 3 nav consolidation (see GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md). Canonical content
// lives in data/nav-config.mjs (which entries, in what order); each entry's label/href/description
// resolves from js/product-registry-data.js for real products, or is a literal for the three
// non-product structural entries (FTN Directory/About FTN/Contact). This script writes the
// resolved list into three kinds of target, all generated from the exact same resolution so a
// no-JS visitor, a JS visitor and a screen-reader all see the identical set of links in the
// identical order:
//   1. js/nav.js's own PRIMARY_NAV array (a plain synchronous JS literal -- kept that way
//      deliberately; the primary row must render on first paint with no registry fetch, so nothing
//      about the *runtime* becomes registry-dependent, only the *authoring* does).
//   2. Every configured page's static `<ul class="site-nav__list">` (desktop, no-JS fallback).
//   3. Every configured page's static `<div class="mobile-nav__links">` (mobile, no-JS fallback).
//
// Run: node scripts/sync-nav.mjs           -- writes every configured target.
// Run: node scripts/sync-nav.mjs --check   -- reports drift, exits 1 if anything would change.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadRegistry as loadRegistryShared } from './lib/registry-loader.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { PRIMARY_NAV } = await import(pathToFileURL(resolve(root, 'data/nav-config.mjs')));

// The 42 pages that carry the standard site-header shell (`.site-nav` + `.mobile-nav__links`).
// Explicit list, not a directory walk -- so a page with a genuinely different header shell (the
// chromeless riddim/dj, riddim/daw, riddim/fire consoles; the founder-only god-mode console; the
// legacy, _redirects-shadowed root dj-tube/index.html, unreachable in production and excluded on
// purpose) is never silently rewritten.
const PAGES = [
  'index.html', '404.html',
  'about/index.html', 'accessibility/index.html', 'account/index.html', 'applications/index.html',
  'clock/index.html', 'community-connect/index.html', 'contact/index.html',
  'display/index.html', 'display-network/index.html', 'events/index.html',
  'facethenation/index.html', 'glossary/index.html', 'govern/index.html', 'health/index.html',
  'ibis-ai/index.html', 'insights/index.html', 'invest/index.html', 'kaiso/index.html',
  'learn/index.html', 'legal/affiliate-disclosure/index.html', 'legal/community-guidelines/index.html',
  'legal/cookie-policy/index.html', 'legal/copyright/index.html', 'legal/data-retention/index.html',
  'legal/privacy-policy/index.html', 'legal/responsible-ai/index.html', 'legal/terms-of-service/index.html',
  'love/index.html', 'observatory/index.html', 'opportunities/index.html', 'parliament/index.html',
  'radio/index.html', 'resources/index.html', 'riddim/index.html', 'scenario-workspace/index.html',
  'screen/index.html', 'sitemap/index.html', 'statistics/index.html', 'top-picks/index.html',
  'trust/index.html', 'tv/index.html',
];

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escJs(v) {
  return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function resolveNav(Registry) {
  return PRIMARY_NAV.map((entry) => {
    if (entry.registry) {
      const product = Registry.get(entry.registry);
      if (!product) throw new Error(`data/nav-config.mjs references unknown registry id: ${entry.registry}`);
      if (!product.navPlacement || product.navPlacement.primary !== true) {
        throw new Error(`data/nav-config.mjs lists '${entry.registry}' but its navPlacement.primary is not true in js/product-registry-data.js`);
      }
      return { label: product.name, href: product.route, description: product.tagline };
    }
    return { label: entry.label, href: entry.href, description: entry.description };
  });
}

// The reverse direction of the same guarantee: every registry product marked navPlacement.primary
// must actually be listed in data/nav-config.mjs -- otherwise a product could silently claim
// primary placement without ever appearing anywhere real.
function assertNoOrphanedPrimaryFlags(Registry) {
  const listedIds = new Set(PRIMARY_NAV.filter((e) => e.registry).map((e) => e.registry));
  for (const product of Registry.all()) {
    if (product.navPlacement && product.navPlacement.primary === true && !listedIds.has(product.id)) {
      throw new Error(`${product.id} has navPlacement.primary=true but is absent from data/nav-config.mjs's PRIMARY_NAV`);
    }
  }
}

function isCurrent(route, canonicalPath) {
  if (!canonicalPath) return false;
  if (canonicalPath === route) return true;
  return route !== '/' && canonicalPath.indexOf(route) === 0;
}

function linkHtml(item, idx, extraClass, current) {
  return '<a href="' + esc(item.href) + '"' +
    (extraClass ? ' class="' + extraClass + '"' : '') +
    (current ? ' aria-current="page"' : '') +
    (idx != null ? ' data-nav-priority="' + idx + '"' : '') +
    ' title="' + esc(item.description) + '" aria-label="' + esc(item.label) + ' — ' + esc(item.description) + '">' +
    esc(item.label) + '</a>';
}

function desktopListHtml(items, canonicalPath) {
  return items.map((item, idx) =>
    '<li class="site-nav__item" data-nav-priority-item="' + idx + '">' +
      linkHtml(item, idx, 'site-nav__trigger site-nav__trigger--link', isCurrent(item.href, canonicalPath)) +
    '</li>'
  ).join('');
}

function mobileListHtml(items, canonicalPath) {
  return items.map((item) => linkHtml(item, null, 'mobile-nav__link--top', isCurrent(item.href, canonicalPath))).join('');
}

function navJsArrayLiteral(items) {
  return 'var PRIMARY_NAV=[\n' +
    items.map((item) => "    ['" + escJs(item.label) + "','" + escJs(item.href) + "','" + escJs(item.description) + "']").join(',\n') +
    '\n  ];';
}

// Depth-counts open/close tags of `tagName` starting from `openTag`'s match, so a region that
// legitimately nests other elements of the same tag name is never mismatched -- the same technique
// scripts/sync-footer.mjs uses (see its findBottomDivRange), generalized here for reuse across both
// the `<ul class="site-nav__list">` and `<div class="mobile-nav__links">` regions.
function findElementInnerRange(html, openTag, tagName) {
  const start = html.indexOf(openTag);
  if (start === -1) return null;
  const contentStart = start + openTag.length;
  let depth = 1;
  const tagRe = new RegExp(`<${tagName}[\\s>]|</${tagName}>`, 'g');
  tagRe.lastIndex = contentStart;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[0] === `</${tagName}>`) { depth -= 1; if (depth === 0) return { contentStart, contentEnd: m.index }; }
    else depth += 1;
  }
  return null;
}

const MARK_START_HTML = '<!-- FTN:NAV:START (generated by scripts/sync-nav.mjs -- do not hand-edit this region, edit data/nav-config.mjs instead) -->';
const MARK_END_HTML = '<!-- FTN:NAV:END -->';

function applyHtmlRegion(html, generated, openTag, tagName, file, regionName) {
  const startIdx = html.indexOf(MARK_START_HTML, html.indexOf(openTag));
  if (startIdx !== -1) {
    const endIdx = html.indexOf(MARK_END_HTML, startIdx);
    if (endIdx === -1) throw new Error(`${file}: ${regionName} has a start marker but no matching end marker`);
    return html.slice(0, startIdx) + MARK_START_HTML + generated + MARK_END_HTML + html.slice(endIdx + MARK_END_HTML.length);
  }
  const range = findElementInnerRange(html, openTag, tagName);
  if (!range) throw new Error(`${file}: no ${regionName} found to sync (expected ${openTag})`);
  return html.slice(0, range.contentStart) + MARK_START_HTML + generated + MARK_END_HTML + html.slice(range.contentEnd);
}

const MARK_START_JS = '// FTN:NAV:START (generated by scripts/sync-nav.mjs -- do not hand-edit, edit data/nav-config.mjs) //';
const MARK_END_JS = '// FTN:NAV:END //';

function applyNavJs(source, items) {
  const startIdx = source.indexOf(MARK_START_JS);
  const endIdx = source.indexOf(MARK_END_JS);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('js/nav.js is missing the FTN:NAV marker pair around PRIMARY_NAV -- expected both markers to already be present');
  }
  return source.slice(0, startIdx) + MARK_START_JS + '\n  ' + navJsArrayLiteral(items) + '\n  ' + source.slice(endIdx);
}

function canonicalPathOf(html) {
  const match = html.match(/<link rel=["']canonical["'] href=["']https:\/\/ftnplatform\.org([^"']*)["']/i);
  return match ? match[1] : null;
}

const Registry = loadRegistryShared(root);
assertNoOrphanedPrimaryFlags(Registry);
const items = resolveNav(Registry);

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

let changed = 0;
const drifted = [];

// 1. js/nav.js
{
  const file = 'js/nav.js';
  const path = resolve(root, file);
  const source = readFileSync(path, 'utf8');
  const next = applyNavJs(source, items);
  if (next !== source) {
    changed += 1;
    if (checkOnly) drifted.push(file); else writeFileSync(path, next);
  }
}

// 2. every configured page's desktop + mobile static nav
for (const file of PAGES) {
  const path = resolve(root, file);
  let html = readFileSync(path, 'utf8');
  const canonicalPath = canonicalPathOf(html);
  const desktop = desktopListHtml(items, canonicalPath);
  const mobile = mobileListHtml(items, canonicalPath);
  let next = applyHtmlRegion(html, desktop, '<ul class="site-nav__list">', 'ul', file, 'desktop primary nav');
  next = applyHtmlRegion(next, mobile, '<div class="mobile-nav__links">', 'div', file, 'mobile primary nav');
  if (next !== html) {
    changed += 1;
    if (checkOnly) drifted.push(file); else writeFileSync(path, next);
  }
}

if (checkOnly) {
  if (drifted.length) {
    console.error(`${drifted.length} nav target(s) drifted from data/nav-config.mjs:`);
    console.error(drifted.map((f) => '  ' + f).join('\n'));
    console.error('Run: node scripts/sync-nav.mjs');
    process.exit(1);
  }
  console.log(`All ${PAGES.length + 1} nav targets match data/nav-config.mjs.`);
} else {
  console.log(`Synced ${changed}/${PAGES.length + 1} nav target(s).`);
}
