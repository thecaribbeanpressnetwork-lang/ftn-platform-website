// FTN Platform — FTN Directory synchronization script (FTN Consolidation, 2026-09-18).
//
// Before this script existed, applications/index.html's product cards were hand-authored HTML that
// had already drifted from js/product-registry-data.js (no generator kept them in sync, unlike
// nav/footer which scripts/sync-nav.mjs and scripts/sync-footer.mjs own). This script makes the
// Directory registry-driven the same way, and gives it the three-tier structure Phase 9 of the
// consolidation calls for: PRODUCTS (real, independent top-level products and specialized
// interfaces), CAPABILITIES (what used to be separate products, now real, callable capabilities
// inside their parent -- most visibly inside FTN ibis), and DATA SERVICES (shared, authoritative
// state every product consumes, owned by none of them).
//
// Run: node scripts/sync-directory.mjs           -- writes applications/index.html.
// Run: node scripts/sync-directory.mjs --check   -- reports drift, exits 1 if anything would change.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadRegistry } from './lib/registry-loader.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(root, 'applications/index.html');
const CHECK = process.argv.includes('--check');

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const Registry = loadRegistry(root);
const all = Registry.all();

function childrenOf(id) {
  return all.filter((p) => p.absorbedInto === id);
}

function productCard(product) {
  const kids = childrenOf(product.id);
  const includesLine = kids.length
    ? '<p class="ftn-directory-card__includes">Includes: ' + kids.map((k) => '<a href="' + esc(k.route) + '">' + esc(k.shortName || k.name) + '</a>').join(', ') + '</p>'
    : '';
  const url = 'https://ftnplatform.org' + product.route;
  return '<article class="ftn-directory-card" style="--product-accent:' + esc(product.atmosphere && product.atmosphere.accent || 'var(--color-red-on-dark)') + '">' +
    '<div class="ftn-directory-card__body">' +
      '<div class="ftn-directory-card__title"><span class="ftn-directory-card__mark" aria-hidden="true"></span><h3>' + esc(product.name) + '</h3><span class="ftn-directory-card__status" data-status="' + esc(product.status) + '">' + esc(product.status) + '</span></div>' +
      '<p>' + esc(product.description) + '</p>' +
      '<small>' + esc(product.visualMnemonic || '') + '</small>' +
      includesLine +
    '</div>' +
    '<div class="ftn-directory-card__actions">' +
      '<a href="' + esc(product.route) + '" aria-label="Open ' + esc(product.name) + '">Open</a>' +
      '<button type="button" data-copy="' + esc(url) + '" data-product="' + esc(product.name) + '" aria-label="Copy link to ' + esc(product.name) + '">Copy link</button>' +
      '<button type="button" data-share="' + esc(url) + '" data-product="' + esc(product.name) + '" data-purpose="' + esc(product.tagline || '') + '" aria-label="Share ' + esc(product.name) + '">Share</button>' +
    '</div>' +
  '</article>';
}

function capabilityTile(product) {
  const parent = Registry.get(product.absorbedInto);
  return '<article class="ftn-directory-capability">' +
    '<div class="ftn-directory-capability__title"><h4>' + esc(product.name.replace(/^FTN\s+/, '')) + '</h4><span class="ftn-directory-capability__badge">CAPABILITY</span></div>' +
    '<p>' + esc(product.purposeStatement || product.description) + '</p>' +
    '<div class="ftn-directory-capability__actions">' +
      '<a href="' + esc(parent ? parent.route : '/ibis-ai/') + '">Use inside ' + esc(parent ? parent.name : 'FTN ibis') + ' &rarr;</a>' +
      '<a href="' + esc(product.route) + '" class="ftn-directory-capability__legacy">Legacy route</a>' +
    '</div>' +
  '</article>';
}

function dataServiceCard(product) {
  const url = 'https://ftnplatform.org' + product.route;
  return '<article class="ftn-directory-card ftn-directory-card--data-service" style="--product-accent:' + esc(product.atmosphere && product.atmosphere.accent || 'var(--color-red)') + '">' +
    '<div class="ftn-directory-card__body">' +
      '<div class="ftn-directory-card__title"><span class="ftn-directory-card__mark" aria-hidden="true"></span><h3>' + esc(product.name) + '</h3><span class="ftn-directory-card__status" data-status="DATA SERVICE">DATA SERVICE</span></div>' +
      '<p>' + esc(product.description) + '</p>' +
      '<small>Consumed by: ' + esc((product.integrations || []).map((i) => i.productId).join(', ') || 'ibis, FTN Live and other FTN products') + '</small>' +
    '</div>' +
    '<div class="ftn-directory-card__actions">' +
      '<a href="' + esc(product.route) + '" aria-label="Open ' + esc(product.name) + '">Open</a>' +
      '<button type="button" data-copy="' + esc(url) + '" data-product="' + esc(product.name) + '" aria-label="Copy link to ' + esc(product.name) + '">Copy link</button>' +
    '</div>' +
  '</article>';
}

// A product (most visibly ibis-ai) can legitimately belong to more than one ecosystem group
// conceptually, but the Directory must never show the SAME product card twice -- rendered once,
// in the first group that claims it, in group-declaration order.
const renderedOnce = new Set();
function groupSection(group) {
  const fresh = group.products.filter((p) => !renderedOnce.has(p.id));
  fresh.forEach((p) => renderedOnce.add(p.id));
  if (!fresh.length) return '';
  const id = 'ftn-directory-' + group.id;
  return '<section class="ftn-directory-group" aria-labelledby="' + id + '"><h3 id="' + id + '">' + esc(group.title) + '</h3>' +
    '<p class="ftn-directory-group__description">' + esc(group.description) + '</p>' +
    '<div class="ftn-directory-group__list">' + fresh.map(productCard).join('') + '</div></section>';
}

const groups = Registry.ecosystemGroups();
const productsHtml = groups.map(groupSection).join('');

// CAPABILITIES: every absorbed product, grouped by its new parent -- most are inside ibis, a
// couple (Parliament/TV/Display/Kaiso/Top Picks) inside their own respective parent. Rendered as
// a flat capability grid rather than nested product cards, since Phase 9's whole point is that
// these are no longer peers of a product -- they are things a parent product/ibis can DO.
const absorbedProducts = all.filter((p) => p.absorbedInto);
const capabilitiesHtml = absorbedProducts.length
  ? '<div class="ftn-directory-capabilities-grid">' + absorbedProducts.map(capabilityTile).join('') + '</div>'
  : '';

const dataServices = all.filter((p) => p.productType === 'data-service' && !p.absorbedInto);
const dataServicesHtml = dataServices.length
  ? '<div class="ftn-directory-group__list">' + dataServices.map(dataServiceCard).join('') + '</div>'
  : '';

const generated =
  '<div class="ftn-directory__intro"><span>FTN DIRECTORY</span><h2 id="ftn-directory-title">Explore the complete FTN ecosystem.</h2>' +
  '<p>Each public product has one job, one truthful release state and a direct route. Capabilities that used to be separate products are grouped under the system that now runs them -- most inside FTN ibis. Private and vaulted work stays outside public discovery; FTN Account appears only as shared access.</p></div>' +
  '<div class="ftn-directory__section"><h2 class="ftn-directory__section-title">Products</h2><div class="ftn-directory__groups">' + productsHtml + '</div></div>' +
  (capabilitiesHtml
    ? '<div class="ftn-directory__section"><h2 class="ftn-directory__section-title">Capabilities</h2><p class="ftn-directory__section-lede">These used to be separate FTN products. Each one\'s real, reusable logic now runs as a genuine capability of the product named below -- nothing was deleted, and every legacy route still works.</p>' + capabilitiesHtml + '</div>'
    : '') +
  (dataServicesHtml
    ? '<div class="ftn-directory__section"><h2 class="ftn-directory__section-title">Data services</h2><p class="ftn-directory__section-lede">Shared, source-verified state that FTN products consume -- owned by none of them, so one verified figure is checked once and reused everywhere.</p>' + dataServicesHtml + '</div>'
    : '');

const MARK_START = '<!-- FTN:DIRECTORY:START (generated by scripts/sync-directory.mjs -- do not hand-edit this region, edit js/product-registry-data.js instead) -->';
const MARK_END = '<!-- FTN:DIRECTORY:END -->';

const html = readFileSync(FILE, 'utf8');
const anchorOpen = '<div class="container" data-ftn-directory>';
const anchorClose = '<aside class="ftn-account-utility"';
const anchorStart = html.indexOf(anchorOpen);
if (anchorStart === -1) throw new Error('applications/index.html: could not find the ftn-directory container anchor');
const contentStart = anchorStart + anchorOpen.length;
const contentEnd = html.indexOf(anchorClose, contentStart);
if (contentEnd === -1) throw new Error('applications/index.html: could not find the ftn-account-utility anchor after the directory container');

const already = html.slice(contentStart, contentEnd);
const alreadyGenerated = already.trim().startsWith(MARK_START) ? already : null;
const replacement = MARK_START + generated + MARK_END;

if (alreadyGenerated !== null && alreadyGenerated.trim() === replacement.trim()) {
  console.log('FTN Directory already matches the registry -- no changes.');
  process.exit(0);
}

if (CHECK) {
  console.error('FTN Directory has drifted from js/product-registry-data.js -- run node scripts/sync-directory.mjs.');
  process.exit(1);
}

const next = html.slice(0, contentStart) + replacement + html.slice(contentEnd);
writeFileSync(FILE, next);
console.log('FTN Directory synced: ' + renderedOnce.size + ' products, ' + absorbedProducts.length + ' capabilities, ' + dataServices.length + ' data service(s).');
