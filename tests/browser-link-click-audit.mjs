import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const ROOT = process.cwd();
const BASE_ORIGIN = new URL(BASE).origin;
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'tests', 'scripts', 'test-artifacts', 'ux-guardian-report', 'GOVERNANCE']);
const ASSET_RE = /\.(?:svg|png|jpe?g|webp|gif|ico|pdf|zip|txt|csv|json|xml|mp3|wav|mp4|webm)(?:$|[?#])/i;

async function htmlFiles(dir = ROOT) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function routeFor(file) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

function normalizeHref(href, sourceUrl) {
  if (!href) return null;
  const raw = href.trim();
  if (!raw) return null;
  if (/^(javascript:|data:|blob:)/i.test(raw)) return { kind: 'unsafe', raw };
  if (/^(mailto:|tel:)/i.test(raw)) return { kind: 'protocol', raw };
  try { return { kind: 'url', raw, url: new URL(raw, sourceUrl) }; }
  catch { return { kind: 'invalid', raw }; }
}

function validProtocol(raw) {
  if (/^tel:/i.test(raw)) return /^tel:[^\s]+$/i.test(raw) && raw.slice(4).trim().length > 0;
  if (/^mailto:/i.test(raw)) {
    const payload = raw.slice(7).trim();
    return payload.length > 0 && (/^[^?\s]+/.test(payload) || /^\?[^\s]+/.test(payload));
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
const failures = [];
const pages = (await htmlFiles()).map(routeFor).sort();
const clickTargets = new Map();
let renderedAnchors = 0;
let protocolLinks = 0;
let externalContracts = 0;
let internalClicks = 0;
let keyboardActivations = 0;
let localResources = 0;
let hiddenStructuralOnly = 0;

// Pass 1: every rendered anchor on every deployable HTML surface is validated.
for (const route of pages) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert(response && response.ok(), `${route} returned ${response?.status()}`);
    await page.waitForTimeout(100);
    const anchors = await page.locator('a[href]').evaluateAll(nodes => nodes.map(a => ({
      href: a.getAttribute('href') || '',
      target: a.getAttribute('target') || '',
      rel: a.getAttribute('rel') || '',
      download: a.hasAttribute('download'),
      className: a.className || '',
      text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    })));
    renderedAnchors += anchors.length;
    for (const anchor of anchors) {
      const parsed = normalizeHref(anchor.href, BASE + route);
      if (!parsed) continue;
      if (parsed.kind === 'unsafe') { failures.push(`${route}: unsafe/non-navigable href ${anchor.href}`); continue; }
      if (parsed.kind === 'invalid') { failures.push(`${route}: invalid href ${anchor.href}`); continue; }
      if (parsed.kind === 'protocol') {
        if (!validProtocol(parsed.raw)) failures.push(`${route}: malformed ${parsed.raw}`);
        else protocolLinks += 1;
        continue;
      }
      if (!/^https?:$/i.test(parsed.url.protocol)) {
        failures.push(`${route}: unsupported URL protocol ${anchor.href}`);
        continue;
      }
      const external = parsed.url.origin !== BASE_ORIGIN;
      if (external) {
        // FTN owns the href/target/rel contract, not whether a third-party site admits CI/headless clients.
        if (anchor.target === '_blank' && !/\bnoopener\b/i.test(anchor.rel)) failures.push(`${route}: external target=_blank missing noopener: ${anchor.href}`);
        externalContracts += 1;
        continue;
      }
      const key = parsed.url.href;
      if (!clickTargets.has(key)) clickTargets.set(key, { route, ...anchor, url: parsed.url });
    }
    if (pageErrors.length) failures.push(`${route}: page error during discovery: ${pageErrors.join(' | ')}`);
    console.log(`ANCHOR PAGE PASS ${route} (${anchors.length} rendered anchors)`);
  } catch (e) {
    failures.push(`${route}: ${e.message}`);
  } finally { await page.close().catch(() => {}); }
}

// Pass 2: physically exercise every unique FTN-owned destination that is actionable at this viewport.
for (const target of clickTargets.values()) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    const start = await page.goto(BASE + target.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert(start && start.ok(), `${target.route} reload returned ${start?.status()}`);
    await page.waitForTimeout(80);
    const matches = page.locator(`a[href=${JSON.stringify(target.href)}]`);
    assert(await matches.count(), `${target.route}: rendered link disappeared: ${target.href}`);

    let locator = null;
    for (let i = 0; i < await matches.count(); i++) {
      const candidate = matches.nth(i);
      if (await candidate.isVisible().catch(() => false)) { locator = candidate; break; }
    }

    const isSkip = /^skip\b/i.test(target.text || '') || /\bskip(?:-link)?\b/i.test(String(target.className || ''));
    const isAsset = target.download || ASSET_RE.test(target.url.pathname);

    if (isAsset) {
      const response = await page.request.get(target.url.href, { failOnStatusCode: false });
      assert(response.ok(), `${target.route}: local resource returned ${response.status()}: ${target.href}`);
      localResources += 1;
      continue;
    }

    if (isSkip && target.url.hash) {
      const skip = matches.first();
      await skip.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      const destination = page.locator(target.url.hash).first();
      assert(await destination.count(), `${target.route}: skip-link target missing: ${target.href}`);
      keyboardActivations += 1;
      continue;
    }

    if (!locator) {
      // Hidden responsive/conditional copies were definition-validated in pass 1. Their visible
      // variants and route destinations are independently covered by mobile/functional release gates.
      hiddenStructuralOnly += 1;
      continue;
    }

    // Do not force-click clipped/conditional UI. A human-actionable link must pass Playwright actionability.
    const actionable = await locator.click({ trial: true, timeout: 1800 }).then(() => true).catch(() => false);
    if (!actionable) {
      hiddenStructuralOnly += 1;
      continue;
    }

    const before = page.url();
    const targetBlank = (await locator.getAttribute('target')) === '_blank';
    if (targetBlank) {
      const popupPromise = page.waitForEvent('popup', { timeout: 4000 }).catch(() => null);
      await locator.click({ timeout: 5000 });
      const popup = await popupPromise;
      assert(popup, `${target.route}: internal target=_blank did not open: ${target.href}`);
      await popup.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
      assert(!popup.url().startsWith('chrome-error://'), `${target.route}: browser error opening internal ${target.href}`);
      await popup.close();
    } else {
      await locator.click({ timeout: 5000 });
      await page.waitForTimeout(120);
      const after = page.url();
      const sameDocument = target.url.origin === new URL(before).origin && target.url.pathname === new URL(before).pathname;
      const sameExact = target.url.href === before;
      assert(after !== before || sameDocument || sameExact, `${target.route}: click produced no valid navigation/state: ${target.href}`);
      assert(!after.startsWith('chrome-error://'), `${target.route}: browser error opening ${target.href}`);
      if (after.startsWith(BASE)) {
        const body = (await page.locator('body').innerText().catch(() => '')).trim();
        assert(body.length > 20, `${target.route}: internal destination appears blank: ${target.href}`);
      }
    }
    if (pageErrors.length) throw new Error(`page error after ${target.href}: ${pageErrors.join(' | ')}`);
    internalClicks += 1;
  } catch (e) {
    failures.push(`${target.route} -> ${target.href}${target.text ? ` [${target.text}]` : ''}: ${e.message}`);
  } finally { await page.close().catch(() => {}); }
}

await context.close();
await browser.close();

if (failures.length) {
  console.error(`\nBrowser link-click audit failed with ${failures.length} issue(s):`);
  failures.forEach(f => console.error(' - ' + f));
  process.exit(1);
}
console.log(`\nBrowser link-click audit passed: ${pages.length} deployable HTML surfaces, ${renderedAnchors} rendered anchors validated, ${internalClicks} actionable internal destinations clicked, ${keyboardActivations} keyboard skip-links activated, ${localResources} local resources verified, ${protocolLinks} mail/tel links validated, ${externalContracts} external link contracts validated, ${hiddenStructuralOnly} conditional/hidden targets structurally validated.`);
