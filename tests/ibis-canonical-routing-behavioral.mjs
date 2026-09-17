// FTN Platform — canonical IBIS routing correction: real, behavioral, browser-executed proof.
//
// Prior audits in this suite verified serverAI()'s source contained certain calls (source-string
// assertions). This file instead loads the REAL /ibis-ai/ and /ibis-headspace-preview/ pages in a
// real headless browser, installs a spy on the real FTN.IbisRuntime.ask before submitting a
// question, and asserts on what the browser actually did -- not what the source text merely
// contains. It guards the specific correction this pass made: the client-side "is this question
// plain enough to skip canonical orchestration" gate (isPlainAnswer()) was removed from both
// js/ibis-ai-workspace.js and js/ibis-headspace-universal.js; every prompt must now reach
// FTN.IbisRuntime.ask() unconditionally, with the classification decision made INSIDE that
// canonical planner (js/ibis-runtime.js calls FTN.UniversalRouter.route() itself).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });

async function scenario(name, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  try {
    await run(page);
    assert.equal(pageErrors.length, 0, `unexpected page errors: ${pageErrors.join('\n')}`);
    console.log('CANONICAL ROUTING PASS:', name);
  } finally {
    await context.close();
  }
}

// Installs a spy on window.FTN.IbisRuntime.ask the moment it is defined (it is lazy-loaded), by
// polling until the runtime attaches, then wrapping it. Returns a handle whose .calls() reads the
// list of prompts actually passed to ask() so far.
async function spyOnRuntimeAsk(page) {
  await page.evaluate(() => {
    window.__askCalls = [];
    window.__armAskSpy = function () {
      if (window.__askSpyArmed) return true;
      if (!(window.FTN && window.FTN.IbisRuntime && window.FTN.IbisRuntime.ask)) return false;
      const orig = window.FTN.IbisRuntime.ask;
      window.FTN.IbisRuntime.ask = function (text, context) {
        window.__askCalls.push(text);
        return orig.apply(this, arguments);
      };
      window.__askSpyArmed = true;
      return true;
    };
  });
  // Force-load the runtime primitives immediately (rather than waiting for a submit to trigger
  // ensureRuntime()) so the spy can attach before the scenario submits its question. Must wait for
  // the script's real onload event first -- window.FTN.IbisRuntimeReady does not exist until the
  // script executes, so awaiting it immediately after appendChild races the network fetch and
  // resolves to undefined instead of the real readiness promise.
  await page.evaluate(async () => {
    if (!(window.FTN && window.FTN.IbisRuntime)) {
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = '/js/ibis-runtime-loader.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      });
      if (window.FTN && window.FTN.IbisRuntimeReady) {
        try { await window.FTN.IbisRuntimeReady; } catch (_) {}
      }
    }
    window.__armAskSpy();
  });
  await page.waitForFunction(() => window.__askSpyArmed === true, null, { timeout: 20000 });
}

// --- 1. Regular IBIS loads the canonical runtime primitives (not just the bare TEXT client). ---
await scenario('regular-ibis-loads-canonical-runtime-primitives', async (page) => {
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await spyOnRuntimeAsk(page);
  const loaded = await page.evaluate(() => ({
    router: !!(window.FTN && window.FTN.UniversalRouter),
    runtime: !!(window.FTN && window.FTN.IbisRuntime),
    orchestrator: !!(window.FTN && window.FTN.MultiAgentOrchestrator),
    founder: !!(window.FTN && window.FTN.FounderCognitiveLayer),
    butterfly: !!(window.FTN && window.FTN.ButterflyEngine),
    connectionFabric: !!(window.FTN && window.FTN.ConnectionFabric),
  }));
  assert.equal(loaded.router, true, 'FTN.UniversalRouter must be loadable/loaded on regular IBIS');
  assert.equal(loaded.runtime, true, 'FTN.IbisRuntime must be loadable/loaded on regular IBIS');
  assert.equal(loaded.orchestrator, true, 'FTN.MultiAgentOrchestrator must be reachable from regular IBIS');
  assert.equal(loaded.founder, true, 'FTN.FounderCognitiveLayer must be reachable from regular IBIS');
  assert.equal(loaded.butterfly, true, 'FTN.ButterflyEngine must be reachable from regular IBIS');
  assert.equal(loaded.connectionFabric, true, 'FTN.ConnectionFabric must be reachable from regular IBIS');
});

// --- 2. A simple question enters the canonical planner (no client-side plain-question bypass). ---
await scenario('simple-question-enters-canonical-orchestrator', async (page) => {
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await spyOnRuntimeAsk(page);
  await page.fill('#ibis-goal', 'What is photosynthesis?');
  await page.locator('#ibis-form').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => window.__askCalls && window.__askCalls.length > 0, null, { timeout: 20000 });
  const calls = await page.evaluate(() => window.__askCalls);
  assert.deepEqual(calls, ['What is photosynthesis?'], 'a plain question must still be handed to FTN.IbisRuntime.ask() -- the browser must not decide it is "simple" and skip canonical orchestration');
});

// --- 3. Both regular IBIS and Headspace call the identical canonical entry point. ---
await scenario('headspace-also-enters-canonical-orchestrator-unconditionally', async (page) => {
  await page.goto(BASE + '/ibis-headspace-preview/', { waitUntil: 'domcontentloaded' });
  await spyOnRuntimeAsk(page);
  const input = page.locator('#headspaceQuery');
  await input.fill('What is photosynthesis?');
  await page.locator('#inputOrbit').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => window.__askCalls && window.__askCalls.length > 0, null, { timeout: 20000 });
  const calls = await page.evaluate(() => window.__askCalls);
  assert.deepEqual(calls, ['What is photosynthesis?'], 'Headspace must also hand every question to FTN.IbisRuntime.ask() unconditionally -- no client-side isPlainAnswer() gate may remain');
});

// Loads /js/ibis-runtime-loader.js and waits for the real onload event plus FTN.IbisRuntimeReady
// before returning, so a caller can safely overwrite FTN.IbisRuntime.ask immediately afterward
// without racing the script's own async load chain.
async function loadRuntimeAndWait(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = '/js/ibis-runtime-loader.js';
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
    if (window.FTN && window.FTN.IbisRuntimeReady) {
      try { await window.FTN.IbisRuntimeReady; } catch (_) {}
    }
  });
}

// --- 4. An orchestration failure returns DEGRADED, never disguised as a canonical success. ---
await scenario('orchestration-failure-marks-response-degraded-not-silently-canonical', async (page) => {
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  // Force the runtime to exist but fail, so serverAI() must take its explicit degraded path
  // (RUNTIME failure), not silently succeed and not crash.
  await loadRuntimeAndWait(page);
  await page.evaluate(() => {
    window.FTN.IbisRuntime.ask = function () { return Promise.reject(new Error('synthetic orchestration failure')); };
  });
  // The direct-provider fallback itself has no network in this test (no route stub for
  // ibis-assistant/ibis-text-cloudflare), so it will also fail -- proving the full chain fails
  // closed (never fabricates an answer) end to end, exactly as it must with no reachable provider.
  await page.fill('#ibis-goal', 'What is photosynthesis?');
  await page.locator('#ibis-form').evaluate((form) => form.requestSubmit());
  // The fallback attempt makes a real network call (ibis-client.js's own 20s AbortController
  // timeout) with no route stub in this scenario, so the final render can take up to ~20s.
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.ibis-msg--ibis:last-child');
      return el && !/ibis is thinking/i.test(el.innerText || '');
    },
    null,
    { timeout: 30000 }
  );
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert.doesNotMatch(answerText, /Photosynthesis is the process/i, 'must never fabricate a plausible-looking answer when orchestration and the fallback provider both fail');
  assert.match(answerText, /No server answer was claimed|failed/i, 'a failed orchestration + failed fallback must say so honestly, not go silent or invent an answer');
});

// --- 5. A successful canonical run surfaces the runtime's answer, not the raw TEXT provider path. ---
await scenario('successful-runtime-answer-is-rendered-as-runtime-response', async (page) => {
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await loadRuntimeAndWait(page);
  await page.evaluate(() => {
    window.FTN.IbisRuntime.ask = function () {
      return Promise.resolve({
        success: true,
        route: { sideEffect: 'READ_ONLY', capabilityCandidates: ['TEXT'], agents: ['GENERAL'] },
        run: { result: { outputs: [{ output: { data: { answer: 'Photosynthesis converts light energy into chemical energy.' } } }] } },
      });
    };
  });
  await page.fill('#ibis-goal', 'What is photosynthesis?');
  await page.locator('#ibis-form').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.ibis-msg--ibis:last-child');
      return el && !/ibis is thinking/i.test(el.innerText || '');
    },
    null,
    { timeout: 20000 }
  );
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert.match(answerText, /Photosynthesis converts light energy into chemical energy\./, 'the canonical planner\'s real answer must reach the rendered page');
});

await browser.close();
console.log('5/5 canonical routing behavioral scenarios passed: regular IBIS loads the runtime, a plain question still enters the orchestrator, Headspace enters the identical orchestrator, orchestration failure degrades honestly, and a real canonical answer renders.');
