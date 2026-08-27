import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'tests', 'scripts', 'test-artifacts', 'ux-guardian-report', 'GOVERNANCE']);

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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
const failures = [];
const pages = (await htmlFiles()).map(routeFor).sort();
const clickTargets = new Map();
let renderedAnchors = 0;
let protocolLinks = 0;

// Pass 1: open every deployable HTML surface and validate every rendered anchor definition.
for (const route of pages) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert(response && response.ok(), `${route} returned ${response?.status()}`);
    await page.waitForTimeout(100);
    const anchors = await page.locator('a[href]').evaluateAll(nodes => nodes.map((a, index) => ({
      index,
      href: a.getAttribute('href') || '',
      target: a.getAttribute('target') || '',
      text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    })));
    renderedAnchors += anchors.length;
    for (const anchor of anchors) {
      const parsed = normalizeHref(anchor.href, BASE + route);
      if (!parsed) continue;
      if (parsed.kind === 'unsafe') { failures.push(`${route}: unsafe/non-navigable href ${anchor.href}`); continue; }
      if (parsed.kind === 'invalid') { failures.push(`${route}: invalid href ${anchor.href}`); continue; }
      if (parsed.kind === 'protocol') {
        if (!/^(mailto|tel):[^\s]+$/i.test(parsed.raw)) failures.push(`${route}: malformed ${parsed.raw}`);
        else protocolLinks += 1;
        continue;
      }
      // Absolute URL is the interaction identity. Hash links on different source pages remain distinct,
      // while repeated global footer/nav destinations are clicked once after every occurrence is validated.
      const key = parsed.url.href;
      if (!clickTargets.has(key)) clickTargets.set(key, { route, href: anchor.href, target: anchor.target, text: anchor.text, url: parsed.url });
    }
    if (pageErrors.length) failures.push(`${route}: page error during discovery: ${pageErrors.join(' | ')}`);
    console.log(`ANCHOR PAGE PASS ${route} (${anchors.length} rendered anchors)`);
  } catch (e) {
    failures.push(`${route}: ${e.message}`);
  } finally { await page.close().catch(() => {}); }
}

// Pass 2: physically click every unique destination/action in Chromium from a real source page.
let clicked = 0;
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
    let locator = matches.first();
    for (let i = 0; i < await matches.count(); i++) {
      if (await matches.nth(i).isVisible().catch(() => false)) { locator = matches.nth(i); break; }
    }
    const before = page.url();
    const targetBlank = (await locator.getAttribute('target')) === '_blank';
    if (targetBlank) {
      const popupPromise = context.waitForEvent('page', { timeout: 3500 }).catch(() => null);
      await locator.click({ timeout: 5000, force: true });
      const popup = await popupPromise;
      assert(popup, `${target.route}: target=_blank link did not open: ${target.href}`);
      await popup.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
      assert(!popup.url().startsWith('chrome-error://'), `${target.route}: browser error opening ${target.href}`);
      await popup.close();
    } else {
      await locator.click({ timeout: 5000, force: true });
      await page.waitForTimeout(120);
      const after = page.url();
      const expectedHashOnly = target.url.origin === new URL(before).origin && target.url.pathname === new URL(before).pathname && target.url.hash;
      assert(after !== before || expectedHashOnly, `${target.route}: click produced no navigation/state change: ${target.href}`);
      assert(!after.startsWith('chrome-error://'), `${target.route}: browser error opening ${target.href}`);
      if (after.startsWith(BASE)) {
        const body = (await page.locator('body').innerText().catch(() => '')).trim();
        assert(body.length > 20, `${target.route}: internal destination appears blank: ${target.href}`);
      }
    }
    if (pageErrors.length) throw new Error(`page error after ${target.href}: ${pageErrors.join(' | ')}`);
    clicked += 1;
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
console.log(`\nBrowser link-click audit passed: ${pages.length} deployable HTML surfaces, ${renderedAnchors} rendered anchors validated, ${clicked} unique browser-clicked destinations/actions, ${protocolLinks} mail/tel links validated.`);
