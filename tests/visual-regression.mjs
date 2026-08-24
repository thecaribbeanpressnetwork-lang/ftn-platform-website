// FTN Platform Website — visual regression, smallest durable foundation.
//
// This is a change-detector for the flagship surfaces, not a pixel-perfect design tool. Every
// page here carries genuinely live content (clock digits, ticking counters, satellite imagery,
// current headlines) that differs between the moment a baseline was captured and the moment this
// runs -- a strict pixel diff would be red constantly and teach everyone to ignore it. The
// tolerance is deliberately generous (see BUDGET below): it catches what actually matters for a
// release gate -- a section disappearing, a layout collapsing, a color scheme changing -- without
// flagging normal minute-to-minute content churn.
//
// Baselines are real screenshots of an already-reviewed, already-correct production state,
// captured once with --update-baselines. Never baseline a page before it's passed real visual
// review; a baseline is a claim "this is what correct looks like", not "this is what exists".
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = path.join(__dirname, 'visual-baselines');
const DIFF_DIR = path.join(__dirname, 'visual-diffs');
const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const UPDATE = process.argv.includes('--update-baselines');

// Percentage of pixels allowed to differ before a surface is flagged. Generous on purpose --
// see the file header. Display's own compositions carry more live numeric content per pixel
// (six modules of ticking figures) so it gets a slightly wider allowance.
const BUDGET = { default: 8, display: 12 };

const SURFACES = [
  ['home', '/', 1366, 768],
  ['home-mobile', '/', 390, 844],
  ['observer', '/observatory/', 1366, 768],
  ['observer-mobile', '/observatory/', 390, 844],
  ['tv', '/tv/', 1366, 768],
  ['tv-mobile', '/tv/', 390, 844],
  ['screen', '/screen/', 1366, 768],
  ['screen-mobile', '/screen/', 390, 844],
  ['kaiso', '/kaiso/', 1366, 768],
  ['kaiso-mobile', '/kaiso/', 390, 844],
  ['parliament', '/parliament/', 1366, 768],
  ['parliament-mobile', '/parliament/', 390, 844],
  ['clock', '/clock/', 1366, 768],
  ['clock-mobile', '/clock/', 390, 844],
  ['radio', '/radio/', 1366, 768],
  ['radio-mobile', '/radio/', 390, 844],
];

async function captureDisplay(browser) {
  const shots = [];
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(BASE + '/display/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#display-pulse .pulse-card', { timeout: 20000 });
    shots.push(['display-focus', await page.screenshot()]);
    await page.click('#display-customize-toggle');
    await page.waitForSelector('.ftn-sheet.is-open');
    await page.click('input[name="display-density"][value="dense"]');
    await page.click('[data-sheet-close]');
    await page.evaluate(() => document.body.classList.add('display-fullscreen'));
    await page.waitForTimeout(400);
    shots.push(['display-dense', await page.screenshot()]);
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto(BASE + '/display/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#display-pulse .pulse-card', { timeout: 20000 });
    await page.click('[data-orientation-option="portrait"]');
    await page.evaluate(() => document.body.classList.add('display-fullscreen'));
    await page.waitForTimeout(400);
    shots.push(['display-portrait', await page.screenshot()]);
    await page.close();
  }
  return shots;
}

function compare(name, buf) {
  const baselinePath = path.join(BASELINE_DIR, name + '.png');
  if (UPDATE || !fs.existsSync(baselinePath)) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
    fs.writeFileSync(baselinePath, buf);
    return { name, status: UPDATE ? 'updated' : 'baseline-created' };
  }
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(buf);
  if (baseline.width !== current.width || baseline.height !== current.height) {
    return { name, status: 'fail', reason: `dimension mismatch: baseline ${baseline.width}x${baseline.height} vs current ${current.width}x${current.height}` };
  }
  const { width, height } = baseline;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, { threshold: 0.25 });
  const diffPct = (diffPixels / (width * height)) * 100;
  const budget = BUDGET[name.startsWith('display') ? 'display' : 'default'];
  if (diffPct > budget) {
    fs.mkdirSync(DIFF_DIR, { recursive: true });
    fs.writeFileSync(path.join(DIFF_DIR, name + '.diff.png'), PNG.sync.write(diff));
    fs.writeFileSync(path.join(DIFF_DIR, name + '.current.png'), buf);
    return { name, status: 'fail', reason: `${diffPct.toFixed(1)}% pixels differ, budget ${budget}%` };
  }
  return { name, status: 'pass', reason: `${diffPct.toFixed(1)}% pixels differ (budget ${budget}%)` };
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];

for (const [name, route, w, h] of SURFACES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const cs = page.locator('.country-switcher-dialog.is-open [data-country-code="TT"]');
    if (await cs.count()) { await cs.first().click().catch(() => {}); await page.waitForTimeout(300); }
    const buf = await page.screenshot();
    results.push(compare(name, buf));
  } catch (e) {
    results.push({ name, status: 'error', reason: e.message });
  }
  await page.close();
}

for (const [name, buf] of await captureDisplay(browser)) {
  results.push(compare(name, buf));
}

await browser.close();

console.log('\nFTN VISUAL REGRESSION');
for (const r of results) console.log(`${r.status.padEnd(16)} ${r.name.padEnd(20)} ${r.reason || ''}`);

const failures = results.filter(r => r.status === 'fail' || r.status === 'error');
if (failures.length) {
  console.error(`\n${failures.length} surface(s) failed visual regression. Diffs written to ${DIFF_DIR}.`);
  process.exit(1);
}
console.log(`\n${results.length} flagship surfaces within visual regression tolerance.`);
