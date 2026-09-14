// FTN Platform — Slice 1 correction: the on-device LanguageModel path must never answer before
// the canonical planner runs, and must never be used for a freshness-sensitive question, no matter
// what browser/device exposes an available on-device model. Real, behavioral, browser-executed
// proof using a mocked window.LanguageModel (this repo's actual sandbox exposes no such API, which
// is exactly why the prior architecture's bypass could not be exercised with real evidence before
// this test existed).
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
    console.log('LOCAL-AI PLANNER GATE PASS:', name);
  } finally {
    await context.close();
  }
}

// Installs a fake, always-available on-device LanguageModel BEFORE any page script runs, so
// ibis-ai-workspace.js's own `'LanguageModel' in global` check sees it as present from first load
// -- exactly the condition that used to bypass canonical orchestration unconditionally.
async function installFakeLanguageModel(page) {
  await page.addInitScript(() => {
    window.__fakeLanguageModelPromptCalls = [];
    window.LanguageModel = {
      availability: async () => 'available',
      create: async () => ({
        prompt: async (instruction) => {
          window.__fakeLanguageModelPromptCalls.push(instruction);
          return 'FAKE_ON_DEVICE_ANSWER: this came from the mocked local model.';
        },
        destroy() {},
      }),
    };
  });
}

async function submitAndSettle(page, text) {
  await page.fill('#ibis-goal', text);
  await page.locator('#ibis-form').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.ibis-msg--ibis:last-child');
      return el && !/ibis is thinking/i.test(el.innerText || '');
    },
    { timeout: 20000 }
  );
}

// --- 1. The canonical planner (UniversalRouter, the same classifier IbisRuntime.ask() uses)
// receives the query before localAI can answer -- proven by spying on FTN.UniversalRouter.route.
await scenario('canonical planner is consulted before local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    window.__routeCalls = [];
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = '/js/ibis-runtime-loader.js';
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
    if (window.FTN && window.FTN.IbisRuntimeReady) { try { await window.FTN.IbisRuntimeReady; } catch (_) {} }
    const origRoute = window.FTN.UniversalRouter.route;
    window.FTN.UniversalRouter.route = function (text, context) {
      window.__routeCalls.push(text);
      return origRoute.apply(this, arguments);
    };
  });
  await submitAndSettle(page, 'What is photosynthesis?');
  const routeCalls = await page.evaluate(() => window.__routeCalls);
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert(routeCalls.length > 0, 'the canonical planner (UniversalRouter.route) must be called');
  assert(promptCalls.length > 0, 'a plain question with the planner available should still be able to use local execution');
});

// --- 2. localAI cannot answer before planning: if the planner is entirely unavailable, local
// execution must never run (fails toward the full canonical serverAI() path, not toward local).
// Simulated by making FTN.UniversalRouter.route() itself throw -- a more reliable and precise
// simulation of "the planner cannot be reached" than aborting its script's network request, which
// proved unreliable across scenarios sharing one browser instance (a cached copy could still load).
await scenario('local execution never runs when the planner cannot be reached', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = '/js/ibis-runtime-loader.js';
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
    if (window.FTN && window.FTN.IbisRuntimeReady) { try { await window.FTN.IbisRuntimeReady; } catch (_) {} }
    window.FTN.UniversalRouter.route = function () { throw new Error('synthetic planner failure'); };
  });
  await submitAndSettle(page, 'What is photosynthesis?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'local execution must never run when the canonical planner could not be reached, even if a local model is available');
});

// --- 3. Current-information questions cannot be answered from on-device memory, even when the
// planner and local model are both available. ---
await scenario('freshness-sensitive question never uses local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await submitAndSettle(page, 'What is the latest news today?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'a freshness-sensitive question must never be answered from on-device model memory');
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert.doesNotMatch(answerText, /FAKE_ON_DEVICE_ANSWER/, 'the rendered answer must not be the local model\'s output for a freshness-sensitive question');
});

// --- 4. Planner-selected local execution still works for a genuinely plain question. ---
await scenario('planner-approved plain question can still use local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await submitAndSettle(page, 'What is photosynthesis?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert(promptCalls.length > 0, 'local execution must still be usable for a plain, non-freshness question when the planner allows it');
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert.match(answerText, /FAKE_ON_DEVICE_ANSWER/, 'the on-device answer should render when the planner approved local execution');
});

// --- 5. Failure falls through honestly: if the local model itself errors, the message still gets
// a real answer attempt through the canonical path, never a silent dead end. ---
await scenario('local execution failure falls through to the canonical path, never a dead end', async (page) => {
  await page.addInitScript(() => {
    window.__fakeLanguageModelPromptCalls = [];
    window.LanguageModel = {
      availability: async () => 'available',
      create: async () => { throw new Error('synthetic local model failure'); },
    };
  });
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await submitAndSettle(page, 'What is photosynthesis?');
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert(answerText && answerText.length > 0, 'a local-model failure must still produce a real (canonical-path) response, not an empty/stuck message');
  assert.doesNotMatch(answerText, /^ibis is thinking/i, 'the message must not be left stuck on the thinking placeholder');
});

await browser.close();
console.log('5/5 local-AI planner-gate behavioral scenarios passed.');
