// FTN Statistics (Phase 5A) -- release verification for the /statistics/ public vertical slice.
// Covers what the phase brief requires beyond the schema/adapter unit tests: chart/table numeric
// agreement, Trust Card integration, keyboard/ARIA on the page's own chrome, reduced motion, and
// mobile/tablet/200%-zoom-equivalent layout. Uses the same system-Chrome/temporary-patch pattern
// as the other *-release.mjs suites (see GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

async function scenario(name, fn, viewport = { width: 1280, height: 900 }, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await fn(page);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('STATISTICS PASS', name);
  } finally {
    await context.close();
  }
}

async function open(page, path) {
  const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert(r && r.ok(), `${path} returned ${r?.status()}`);
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 3, `${path} horizontal overflow ${overflow}px`);
}

await scenario('page-loads-with-real-chart-and-verified-source', async (page) => {
  await open(page, '/statistics/');
  assert.equal(await page.locator('main').count(), 1, 'must have exactly one main landmark');
  await page.waitForSelector('[data-crime-chart] svg', { timeout: 10000 });
  assert(await page.locator('[data-crime-chart] .crime-chart__dot').count() >= 5, 'chart must render real data points');
  const bodyText = await page.locator('body').innerText();
  assert.match(bodyText, /ttps\.gov\.tt|Trinidad and Tobago Police Service/i, 'source attribution must be visible on the page');
  const crimeSectionText = await page.locator('#crime-intelligence').innerText();
  assert.doesNotMatch(crimeSectionText, /\blive\b/i, 'the crime data section itself must never describe historical/reported figures as live');
});

await scenario('chart-and-table-numeric-agreement', async (page) => {
  await open(page, '/statistics/');
  await page.waitForSelector('[data-crime-chart] svg');
  const chartValues = await page.locator('[data-crime-chart] .crime-chart__value').allTextContents();
  await page.locator('.crime-table-disclosure summary').click();
  const tableValues = await page.locator('[data-crime-table] tbody td:nth-child(2)').allInnerTexts();
  assert(chartValues.length > 0 && tableValues.length > 0, 'both chart and table must have real rows');
  assert.deepEqual(chartValues, tableValues, 'chart-plotted values and the accessible table must agree exactly');
});

await scenario('accessible-table-has-real-semantics', async (page) => {
  await open(page, '/statistics/');
  const details = page.locator('.crime-table-disclosure');
  assert.equal(await details.count(), 1);
  await details.locator('summary').click();
  assert.equal(await page.locator('[data-crime-table] table caption').count(), 1, 'table needs a caption');
  assert(await page.locator('[data-crime-table] table th[scope="col"]').count() >= 2, 'table needs column headers');
  assert(await page.locator('[data-crime-table] table th[scope="row"]').count() >= 5, 'table needs row headers');
});

await scenario('trust-card-opens-with-real-provenance', async (page) => {
  await open(page, '/statistics/');
  await page.waitForSelector('.crime-intel__evidence-trigger', { timeout: 10000 });
  await page.locator('.crime-intel__evidence-trigger').click();
  await page.waitForSelector('#trust-card-dialog', { state: 'visible', timeout: 5000 });
  const panel = page.locator('#trust-card-dialog .trust-card-dialog__panel');
  const panelText = await panel.innerText();
  const sourceHref = await panel.locator('a[href*="ttps.gov.tt"]').first().getAttribute('href');
  assert.match(sourceHref || '', /ttps\.gov\.tt/i, 'Trust Card must link directly to the real TTPS source');
  assert.match(panelText, /Reported Murders|Murder/i, 'Trust Card must name the real indicator');
});

await scenario('keyboard-reaches-evidence-trigger-and-table-disclosure', async (page) => {
  await open(page, '/statistics/');
  await page.waitForSelector('.crime-intel__evidence-trigger');
  await page.locator('.crime-intel__evidence-trigger').focus();
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('crime-intel__evidence-trigger')), true);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#trust-card-dialog', { state: 'visible', timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('#trust-card-dialog', { state: 'hidden', timeout: 5000 });
  await page.locator('.crime-table-disclosure summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.crime-table-disclosure[open]').count(), 1, 'Enter on the summary must open the table disclosure');
});

await scenario('reduced-motion-still-renders-and-opens-trust-card', async (page) => {
  await open(page, '/statistics/');
  await page.waitForSelector('[data-crime-chart] svg');
  assert(await page.locator('[data-crime-chart] .crime-chart__dot').count() >= 5, 'chart must still render under reduced motion');
  await page.locator('.crime-intel__evidence-trigger').click();
  await page.waitForSelector('#trust-card-dialog', { state: 'visible', timeout: 5000 });
}, { width: 1280, height: 900 }, { reducedMotion: 'reduce' });

await scenario('mobile-viewport-no-overflow', async (page) => {
  await open(page, '/statistics/');
  await page.waitForSelector('[data-crime-chart] svg');
}, { width: 375, height: 812 });

await scenario('tablet-and-200-percent-zoom-no-overflow', async (page) => {
  // Same technique as tests/ibis-evidence-release.mjs: 200% zoom modeled as half the effective
  // CSS-pixel viewport, not document.body.style.zoom (confirmed unreliable there).
  await open(page, '/statistics/');
}, { width: 384, height: 512 });

await scenario('no-unsupported-live-claim-for-historical-series', async (page) => {
  await open(page, '/statistics/');
  const methodologyText = await page.locator('.statistics-methodology').innerText();
  assert.match(methodologyText, /not.{0,20}live daily counter/i, 'methodology must explicitly disclaim a live-daily-counter framing');
});

await browser.close();
console.log('9/9 FTN Statistics release scenarios passed.');
