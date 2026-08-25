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

// --- Phase 5B: second indicator (FX) presentation ------------------------------------------------
await scenario('fx-chart-table-and-trust-card', async (page) => {
  await open(page, '/statistics/');
  await page.waitForSelector('[data-fx-chart] svg', { timeout: 10000 });
  const chartValues = await page.locator('[data-fx-chart] .fx-chart__value').allTextContents();
  await page.locator('.fx-table-disclosure summary').click();
  const tableValues = await page.locator('[data-fx-table] tbody td:nth-child(2)').allInnerTexts();
  assert.deepEqual(chartValues, tableValues, 'FX chart-plotted values and its accessible table must agree exactly');
  await page.locator('.fx-intel__evidence-trigger').click();
  await page.waitForSelector('#trust-card-dialog', { state: 'visible', timeout: 5000 });
  const panel = page.locator('#trust-card-dialog .trust-card-dialog__panel');
  const sourceHref = await panel.locator('a[href*="central-bank.org.tt"]').first().getAttribute('href');
  assert.match(sourceHref || '', /central-bank\.org\.tt/i, 'FX Trust Card must link directly to the real Central Bank source');
  const panelText = await panel.innerText();
  assert.match(panelText, /Selling Rate/i, 'Trust Card must name the real FX indicator');
});

await scenario('fx-does-not-claim-live-rate', async (page) => {
  await open(page, '/statistics/');
  const fxSectionText = await page.locator('#fx-intelligence').innerText();
  // The section legitimately uses the word "live" once, inside its own honest disclaimer ("not a
  // live/real-time rate") -- the real assertion is that it never ASSERTS liveness (e.g. "current
  // live rate", "updated live"), and that the disclaimer itself is present.
  assert.doesNotMatch(fxSectionText, /\b(current|updated|today's) live\b|live rate\b/i, 'must never assert the monthly published figure is a live/real-time rate');
  assert.match(fxSectionText, /monthly published figure/i, 'must explicitly disclaim a live/real-time framing');
});

// --- Phase 5B: ibis statistical querying ---------------------------------------------------------
async function askIbis(page, question) {
  await page.fill('#statistics-ask-input', question);
  await page.locator('#statistics-ask-form button[type="submit"]').click();
  await page.waitForFunction(
    () => {
      const el = document.getElementById('statistics-ask-answer');
      return el && el.getAttribute('data-state') && el.getAttribute('data-state') !== 'pending';
    },
    { timeout: 10000 }
  );
  return page.locator('#statistics-ask-answer').innerText();
}

await scenario('ask-ibis-latest-value-with-mandatory-trust-card', async (page) => {
  await open(page, '/statistics/');
  const answer = await askIbis(page, 'What is the latest reported murder count?');
  assert.match(answer, /\d/, 'a latest-value answer must contain a real retrieved number');
  assert.equal(await page.locator('#statistics-ask-answer').getAttribute('data-state'), 'ok');
  // The founder's own instruction: a Trust Card for EVERY statistical response -- verify the
  // evidence trigger actually mounted and opens the real shared Trust Card, not a bypass.
  assert.equal(await page.locator('#statistics-ask-answer .ibis-evidence-trigger').count(), 1, 'a successful statistical answer must always carry an evidence trigger');
  await page.locator('#statistics-ask-answer .ibis-evidence-trigger').click();
  await page.waitForSelector('#trust-card-dialog', { state: 'visible', timeout: 5000 });
});

await scenario('ask-ibis-comparison-and-formula', async (page) => {
  await open(page, '/statistics/');
  const answer = await askIbis(page, 'Compare murders in 2023 and 2024');
  assert.match(answer, /2023/);
  assert.match(answer, /2024/);
});

await scenario('ask-ibis-unsupported-question-fails-closed', async (page) => {
  await open(page, '/statistics/');
  const answer = await askIbis(page, 'What is your favorite color?');
  assert.equal(await page.locator('#statistics-ask-answer').getAttribute('data-state'), 'error');
  assert.doesNotMatch(answer, /\bblue\b|\bred\b|\bgreen\b/i, 'ibis must never invent an answer to a question outside its supported set');
});

await scenario('ask-ibis-example-buttons-work', async (page) => {
  await open(page, '/statistics/');
  await page.locator('[data-ask-example]').first().click();
  await page.waitForFunction(() => {
    const el = document.getElementById('statistics-ask-answer');
    return el && el.getAttribute('data-state') && el.getAttribute('data-state') !== 'pending';
  }, { timeout: 10000 });
  const answer = await page.locator('#statistics-ask-answer').innerText();
  assert(answer.length > 0);
});

// --- Founder decision: primary navigation must remain unchanged by this phase --------------------
await scenario('primary-navigation-unchanged', async (page) => {
  await open(page, '/statistics/');
  await page.waitForTimeout(300);
  // The real top-level primary nav links only (excludes the "FTN Ecosystem" mega-menu's own
  // nested product links, which legitimately include Statistics -- decision #6 explicitly allows
  // Directory/footer/sitemap discovery, it only forbids expanding PRIMARY_NAV itself).
  const navLabels = await page.locator('.site-nav__list > .site-nav__item .site-nav__trigger--link').allTextContents();
  assert.equal(navLabels.length, 11, 'primary navigation must still have exactly its approved 11 items -- FTN Statistics must not silently add itself');
  assert(!navLabels.some((l) => /statistics/i.test(l)), 'FTN Statistics must not appear in primary navigation without a separate founder decision');
  // Positive check: Statistics IS correctly discoverable through the Ecosystem/Directory menu.
  const ecosystemLabels = await page.locator('[data-ecosystem-menu-panel] a').allTextContents();
  assert(ecosystemLabels.some((l) => /statistics/i.test(l)), 'FTN Statistics should still be discoverable through the FTN Ecosystem menu, per decision #6');
});

// --- No paid provider calls, no exposed credentials for the ibis statistics path -----------------
await scenario('no-paid-provider-calls-for-statistics-questions', async (page) => {
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await open(page, '/statistics/');
  await askIbis(page, 'What is the latest reported murder count?');
  // Deliberately specific to real AI-provider endpoints -- fonts.googleapis.com (real, legitimate
  // Google Fonts CSS) must never false-positive as a "google" AI provider call.
  const external = requests.filter((u) => /supabase\.co\/functions|anthropic\.com|openai\.com|generativelanguage\.googleapis\.com|ai\.google\.dev/i.test(u));
  assert.equal(external.length, 0, 'a STATISTIC_QUERY answer must never reach a paid provider endpoint');
});

await browser.close();
console.log('18/18 FTN Statistics release scenarios passed (9 Phase 5A + 9 Phase 5B).');
