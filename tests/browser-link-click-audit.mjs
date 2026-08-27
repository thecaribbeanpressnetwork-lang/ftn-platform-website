import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'test-artifacts', 'ux-guardian-report']);

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
  if (!raw || raw.startsWith('javascript:') || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
  if (raw.startsWith('mailto:') || raw.startsWith('tel:')) return { kind: 'protocol', raw };
  try {
    return { kind: 'url', raw, url: new URL(raw, sourceUrl) };
  } catch {
    return { kind: 'invalid', raw };
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
const failures = [];
const pages = (await htmlFiles()).map(routeFor).sort();
let clicked = 0;
let protocolLinks = 0;

for (const route of pages) {
  const discovery = await context.newPage();
  try {
    const response = await discovery.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert(response && response.ok(), `${route} returned ${response?.status()}`);
    await discovery.waitForTimeout(120);

    const links = await discovery.locator('a[href]').evaluateAll((nodes) => {
      const seen = new Set();
      return nodes.map((a) => ({ href: a.getAttribute('href') || '', target: a.getAttribute('target') || '', text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120) }))
        .filter((x) => x.href && !seen.has(x.href) && seen.add(x.href));
    });

    for (const link of links) {
      const parsed = normalizeHref(link.href, BASE + route);
      if (!parsed) continue;
      if (parsed.kind === 'invalid') {
        failures.push(`${route}: invalid href ${link.href}`);
        continue;
      }
      if (parsed.kind === 'protocol') {
        assert(/^(mailto|tel):[^\s]+$/i.test(parsed.raw), `${route}: malformed ${parsed.raw}`);
        protocolLinks += 1;
        continue;
      }

      const source = await context.newPage();
      const pageErrors = [];
      source.on('pageerror', (e) => pageErrors.push(e.message));
      try {
        const start = await source.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert(start && start.ok(), `${route} reload returned ${start?.status()}`);
        await source.waitForTimeout(80);

        const locator = source.locator(`a[href=${JSON.stringify(link.href)}]`).first();
        assert(await locator.count(), `${route}: rendered link disappeared: ${link.href}`);

        const targetBlank = (await locator.getAttribute('target')) === '_blank';
        if (targetBlank) {
          const popupPromise = context.waitForEvent('page', { timeout: 7000 }).catch(() => null);
          await locator.click({ timeout: 7000, force: true });
          const popup = await popupPromise;
          assert(popup, `${route}: target=_blank link did not open: ${link.href}`);
          await popup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
          assert(!popup.url().startsWith('chrome-error://'), `${route}: browser error opening ${link.href}`);
          await popup.close();
        } else {
          const before = source.url();
          await locator.click({ timeout: 7000, force: true });
          await source.waitForTimeout(180);
          const after = source.url();
          const expectedHashOnly = parsed.url.origin === new URL(before).origin && parsed.url.pathname === new URL(before).pathname && parsed.url.hash;
          assert(after !== before || expectedHashOnly, `${route}: click produced no navigation/state change: ${link.href}`);
          assert(!after.startsWith('chrome-error://'), `${route}: browser error opening ${link.href}`);
          if (after.startsWith(BASE)) {
            const body = (await source.locator('body').innerText().catch(() => '')).trim();
            assert(body.length > 20, `${route}: internal destination appears blank: ${link.href}`);
          }
        }
        if (pageErrors.length) throw new Error(`page error after ${link.href}: ${pageErrors.join(' | ')}`);
        clicked += 1;
      } catch (e) {
        failures.push(`${route} -> ${link.href}${link.text ? ` [${link.text}]` : ''}: ${e.message}`);
      } finally {
        await source.close().catch(() => {});
      }
    }
    console.log(`CLICK PAGE PASS ${route} (${links.length} unique hrefs discovered)`);
  } catch (e) {
    failures.push(`${route}: ${e.message}`);
  } finally {
    await discovery.close().catch(() => {});
  }
}

await context.close();
await browser.close();

if (failures.length) {
  console.error(`\nBrowser link-click audit failed with ${failures.length} issue(s):`);
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log(`\nBrowser link-click audit passed: ${pages.length} HTML surfaces, ${clicked} browser-clicked links, ${protocolLinks} validated mail/tel links.`);
