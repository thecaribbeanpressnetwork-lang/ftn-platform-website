// FTN Platform — Phase 4B ibis evidence disclosure behavioral release gate (real browser).
//
// Complements tests/ibis-evidence-audit.mjs (pure decision-matrix/mapping logic) with real DOM
// rendering: safe escaping of externally-sourced content (malicious/malformed provenance fields),
// keyboard/screen-reader interaction with the compact trigger and the shared Trust Card modal,
// visual states across breakpoints/zoom/reduced-motion, and confirmation that no secret/internal
// detail is ever rendered. Uses fixture provenance objects passed directly to
// FTN.IbisEvidence.mount() in-page -- this exercises the real rendering code without needing a
// live AI provider response (no test here may incur provider cost, per the founder's instruction).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

async function scenario(name, fn, viewport) {
  const context = await browser.newContext({ viewport: viewport || { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  try {
    await fn(page);
    if (errors.length) throw new Error(errors.join('\n'));
    results.push('PASS ' + name);
  } catch (e) {
    failures.push({ name, error: e?.stack || String(e) });
    results.push('FAIL ' + name + ' — ' + e.message);
  } finally {
    await context.close();
  }
}

async function loadEvidenceModules(page) {
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'load' });
  await page.evaluate(() => new Promise((resolve) => {
    function load(src) {
      return new Promise((res) => {
        if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = res;
        document.head.appendChild(s);
      });
    }
    load('/js/ibis-provenance.js')
      .then(() => load('/js/ibis-evidence.js'))
      .then(() => (window.FTN && window.FTN.TrustCard ? null : load('/js/trust-card.js')))
      .then(resolve);
  }));
  await page.waitForFunction(() => window.FTN && window.FTN.IbisEvidence && window.FTN.IbisProvenance && window.FTN.TrustCard);
}

await scenario('evidence-trigger-appears-for-factual-topic-and-live-intelligence', async (page) => {
  await loadEvidenceModules(page);
  const outcome = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const factual = window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'TEXT', provider: 'ibis-query-gemini' }), { prompt: 'What percentage of the population voted in the last election?' });
    const live = window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'LIVE_INTELLIGENCE', provider: 'ibis-local-live-research' }), { prompt: 'ferries today' });
    return { factualMounted: Boolean(factual), liveMounted: Boolean(live), triggerCount: host.querySelectorAll('.trust-trigger').length };
  });
  assert.equal(outcome.factualMounted, true, 'a factual-topic TEXT response must get a compact evidence trigger');
  assert.equal(outcome.liveMounted, true, 'a LIVE_INTELLIGENCE response must always get a compact evidence trigger');
  assert.equal(outcome.triggerCount, 2);
});

await scenario('evidence-trigger-absent-for-casual-creative-response', async (page) => {
  await loadEvidenceModules(page);
  const outcome = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const casual = window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'TEXT', provider: 'ibis-query-gemini' }), { prompt: 'Write me a short poem about a Caribbean sunset.' });
    const localTool = window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'BPM_DETECTION', provider: 'ibis-local-dsp' }), { prompt: 'estimate the bpm of this track' });
    return { casualMounted: Boolean(casual), localToolMounted: Boolean(localTool), triggerCount: host.querySelectorAll('.trust-trigger').length };
  });
  assert.equal(outcome.casualMounted, false, 'a casual/creative response must not get a Trust Card beneath it');
  assert.equal(outcome.localToolMounted, false, 'a clearly labelled deterministic tool must not get a Trust Card by default');
  assert.equal(outcome.triggerCount, 0);
});

await scenario('degraded-state-always-shown-even-for-optional-capability', async (page) => {
  await loadEvidenceModules(page);
  const outcome = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const degraded = window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'BPM_DETECTION', provider: 'ibis-local-dsp', degradedState: 'ALL_PROVIDERS_FAILED' }), { prompt: 'estimate bpm' });
    return { mounted: Boolean(degraded), label: degraded ? degraded.textContent : null };
  });
  assert.equal(outcome.mounted, true, 'a degraded state must never be hidden merely because the capability is normally evidence-optional');
  assert.match(outcome.label, /what happened/i);
});

await scenario('trust-card-opens-with-safe-rendering-of-malicious-source-fields', async (page) => {
  await loadEvidenceModules(page);
  await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const provenance = window.FTN.IbisProvenance.build({
      capability: 'LIVE_INTELLIGENCE', provider: 'ibis-local-live-research', costToIbis: 'ZERO_COST_TO_IBIS',
      // A real external post's title/publisher could contain anything -- including something that
      // looks like markup. This must render as inert text, never execute or break the DOM.
      sourceIdentity: '<img src=x onerror=window.__xss=true>Real headline with <b>tags</b>',
      sourceUrl: 'https://news.ycombinator.com/item?id=1" onmouseover="window.__xss2=true',
      publisher: '</dd></dl><script>window.__xss3=true<' + '/script>',
      sourceReferenceDate: '2026-08-20', sourceRetrievedAt: '2026-08-25T10:00:00Z',
      retrievalMethod: 'LIVE_API_FETCH', confidenceBasis: 'MODERATE',
      licensingNote: '"><svg onload=window.__xss4=true>',
    });
    window.FTN.IbisEvidence.mount(host, provenance, { prompt: 'ferries today' });
    host.querySelector('.trust-trigger').click();
  });
  await page.waitForSelector('.trust-card-dialog.is-open');
  const xssFired = await page.evaluate(() => Boolean(window.__xss || window.__xss2 || window.__xss3 || window.__xss4));
  assert.equal(xssFired, false, 'no injected script/handler from a malicious provenance field must ever execute');
  const titleText = await page.locator('#trustCardTitle').innerText();
  // Correctly-escaped content is SUPPOSED to display the original characters as literal, inert
  // text (that's what escaping means -- "&lt;img..." renders visibly as "<img...") -- the real
  // safety property is that no live element/handler was created from it, already proven by
  // xssFired above. What must never be true is a genuine DOM element existing.
  assert.match(titleText, /Real headline with/, 'the real text content must still render');
  const imgElementCount = await page.locator('#trustCardTitle img').count();
  assert.equal(imgElementCount, 0, 'no live <img> element may be created from a malicious sourceIdentity field');
  const panelHTML = await page.locator('.trust-card-dialog__panel').innerHTML();
  assert(!/<script/i.test(panelHTML), 'no live <script> tag may end up in the rendered card');
  assert(panelHTML.includes('&lt;img'), 'the malicious markup must appear HTML-entity-escaped in the source, not as a live tag');
  assert(!panelHTML.includes('sb_publishable'), 'no Supabase key or other credential-shaped string may ever appear in the rendered card');
});

await scenario('trust-card-keyboard-and-focus-behavior', async (page) => {
  await loadEvidenceModules(page);
  await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'LIVE_INTELLIGENCE', provider: 'ibis-local-live-research', costToIbis: 'ZERO_COST_TO_IBIS' }), { prompt: 'ferries today' });
    host.querySelector('.trust-trigger').focus();
  });
  await page.keyboard.press('Enter');
  await page.waitForSelector('.trust-card-dialog.is-open');
  const dialog = page.locator('#trust-card-dialog');
  assert.equal(await dialog.getAttribute('role'), 'dialog');
  assert.equal(await dialog.getAttribute('aria-modal'), 'true');
  assert.equal(await dialog.getAttribute('aria-labelledby'), 'trustCardTitle');
  const activeIsClose = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-trust-close'));
  assert.equal(activeIsClose, true, 'focus must move into the dialog (its close button) when opened');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('trust-card-dialog').classList.contains('is-open'));
  const focusReturned = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('ibis-evidence-trigger'));
  assert.equal(focusReturned, true, 'Escape must close the dialog and return focus to the trigger that opened it');
});

await scenario('video-generation-mode-not-publicly-selectable', async (page) => {
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'load' });
  await page.waitForSelector('#ibis-creative-studio');
  assert.equal(await page.locator('[data-studio-mode="video"]').count(), 0, 'VIDEO mode must not be publicly selectable');
  const bodyText = await page.locator('#ibis-creative-studio').innerText();
  assert(!/\bVIDEO\b/.test(bodyText.split('\n').find((l) => /IMAGE|AUTO CAMPAIGN/.test(l)) || ''), 'the mode tablist itself must not offer a VIDEO option');
});

await scenario('mobile-viewport-evidence-trigger-usable', async (page) => {
  await loadEvidenceModules(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 3, `horizontal overflow ${overflow}px at mobile width`);
  const rect = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'LIVE_INTELLIGENCE', provider: 'ibis-local-live-research', costToIbis: 'ZERO_COST_TO_IBIS' }), { prompt: 'ferries today' });
    const btn = host.querySelector('.trust-trigger');
    const r = btn.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  assert(rect.width > 0 && rect.height > 0, 'evidence trigger must have a real, visible size on a mobile viewport');
}, { width: 375, height: 812 });

await scenario('tablet-and-200-percent-zoom-no-overflow', async (page) => {
  // 200% page zoom is simulated as half the effective CSS-pixel viewport (the actual layout
  // consequence of zooming), not via document.body.style.zoom -- that legacy CSS property
  // measurably distorts document.documentElement.scrollWidth/clientWidth in a way that doesn't
  // reflect real rendering (confirmed while writing this test: it reported a false ~416px
  // "overflow" that a genuinely narrower viewport at the same effective width does not show).
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'load' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 3, `horizontal overflow ${overflow}px at tablet width, 200%-zoom-equivalent viewport`);
}, { width: 384, height: 512 });

await scenario('reduced-motion-trust-card-still-opens', async (page) => {
  await loadEvidenceModules(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    window.FTN.IbisEvidence.mount(host, window.FTN.IbisProvenance.build({ capability: 'LIVE_INTELLIGENCE', provider: 'ibis-local-live-research', costToIbis: 'ZERO_COST_TO_IBIS' }), { prompt: 'ferries today' });
    host.querySelector('.trust-trigger').click();
  });
  await page.waitForSelector('.trust-card-dialog.is-open');
  const visible = await page.locator('.trust-card-dialog__panel').isVisible();
  assert.equal(visible, true, 'the Trust Card must still open and be visible with reduced motion enabled');
});

console.log(results.join('\n'));
if (failures.length) {
  console.error('\nFAILED SCENARIOS\n');
  for (const f of failures) console.error(`### ${f.name}\n${f.error}\n`);
  await browser.close();
  process.exit(1);
}
console.log(`\n${results.length} ibis evidence disclosure scenarios passed.`);
await browser.close();
