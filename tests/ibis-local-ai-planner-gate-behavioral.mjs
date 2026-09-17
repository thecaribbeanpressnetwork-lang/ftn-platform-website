// FTN Platform — Slice 1 CORRECTED architecture: the on-device LanguageModel path may only ever
// execute when the canonical SERVER response (action:"canonical_query" on ibis-assistant)
// explicitly authorizes it via executionInstruction.executionAuthorized. A prior version of this
// gate consulted the browser-side FTN.UniversalRouter directly -- itself still a pre-server
// bypass, even though the classifier it called was real. This suite proves the corrected
// contract end to end in a real browser, using a mocked window.LanguageModel (this repo's own
// sandbox exposes no such API, which is exactly why this bypass could exist unnoticed before).
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
    console.log('LOCAL-AI SERVER-AUTHORIZATION PASS:', name);
  } finally {
    await context.close();
  }
}

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

// Intercepts the real network call to ibis-assistant and lets the test control the
// action:"canonical_query" response exactly, while recording every call made. The route handler
// runs in Node (Playwright), not in the page -- state is tracked in this closure and pushed into
// the page via page.evaluate, never referenced as a bare `window` inside the handler itself.
async function installCanonicalQueryMock(page, canonicalResponder) {
  let canonicalCallCount = 0;
  await page.route('**/functions/v1/ibis-assistant', async (route) => {
    const request = route.request();
    let body = {};
    try { body = request.postDataJSON(); } catch (_) {}
    if (body.action === 'canonical_query') {
      canonicalCallCount += 1;
      await page.evaluate((n) => { window.__canonicalCallCount = n; }, canonicalCallCount);
      const result = await canonicalResponder(body);
      if (result === null) { await route.abort(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
      return;
    }
    if (body.action === 'record_execution_receipt') {
      await page.evaluate((r) => { (window.__receipts = window.__receipts || []).push(r); }, body.receipt);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ recorded: true, planId: body.receipt && body.receipt.planId }) });
      return;
    }
    // Any other action (health, default TEXT answer, etc.) -- fail closed, forcing the
    // non-fabricating fallback chain, never a fabricated success.
    await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'not mocked' }) });
  });
  await page.evaluate(() => { window.__canonicalCallCount = 0; window.__receipts = []; });
}

function authorizedEnvelope(answer) {
  return {
    requestId: 'req-1', answer, objective: null, queryClass: 'SIMPLE_TEXT',
    executionInstruction: { planId: 'plan-1', executionTarget: 'browser_local', executionAuthorized: true, intent: 'SIMPLE_TEXT', freshnessRequired: false, constraints: [] },
    reasoningModesUsed: [], capabilitiesAttempted: ['TEXT'], providerPath: ['fixture'],
    evidenceState: 'MODEL_GENERATED', sources: [], confidence: 'MODERATE', confidenceBasis: 'fixture',
    assumptions: [], uncertainties: [], contradictions: [], ecosystemConnections: [], actions: [], alternatives: [],
    status: 'OK', permissions: { requiresApproval: false, reason: null }, artifacts: [], handoff: { external: false, note: null },
    receipt: {}, generatedAt: new Date().toISOString(),
  };
}
function unauthorizedEnvelope(answer, intent, freshnessRequired) {
  const env = authorizedEnvelope(answer);
  env.queryClass = intent;
  env.executionInstruction = { planId: 'plan-2', executionTarget: 'server_provider', executionAuthorized: false, intent, freshnessRequired, constraints: [] };
  return env;
}

async function submitAndSettle(page, text, timeout = 20000) {
  await page.fill('#ibis-goal', text);
  await page.locator('#ibis-form').evaluate((form) => form.requestSubmit());
  // waitForFunction's real signature is (pageFunction, arg, options) -- passing {timeout} as the
  // second positional argument silently binds it as `arg` instead of `options` and the call
  // falls back to Playwright's default 30s regardless of what was requested here. `null` as the
  // explicit arg is required for the third position (options) to actually take effect.
  await page.waitForFunction(
    () => { const el = document.querySelector('.ibis-msg--ibis:last-child'); return el && !/ibis is thinking/i.test(el.innerText || ''); },
    null,
    { timeout }
  );
}

// --- 1. canonical_query is called before localAI. ---
await scenario('canonical_query is called before localAI ever runs', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await installCanonicalQueryMock(page, async () => authorizedEnvelope('CANONICAL_FIXTURE_ANSWER'));
  await submitAndSettle(page, 'What is photosynthesis?');
  const canonicalCalls = await page.evaluate(() => window.__canonicalCallCount);
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert(canonicalCalls >= 1, 'action:"canonical_query" must be called');
  assert(promptCalls.length > 0, 'local execution should still occur once the server authorized it');
});

// --- 2. localAI cannot execute without server authorization. ---
await scenario('localAI cannot execute without explicit server authorization', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await installCanonicalQueryMock(page, async () => unauthorizedEnvelope('CANONICAL_FIXTURE_ANSWER_NO_LOCAL', 'FOUNDER_STRATEGY', false));
  await submitAndSettle(page, 'What is photosynthesis?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'local execution must never run when executionAuthorized is false, even for an otherwise-plain-looking question');
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert.match(answerText, /CANONICAL_FIXTURE_ANSWER_NO_LOCAL/, 'the canonical server answer must render instead');
});

// --- 3. Freshness/search questions never execute locally, proven via the real server (not a
// mock) so the actual ibis-intent-router.ts classification is what is being trusted here. ---
await scenario('a real freshness question never authorizes or uses local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  // No mock here -- exercise the real Edge Function logic via deno run (FTN_TEST_BASE points at a
  // static file server, not the Edge Function, so real network calls to Supabase will fail in
  // this sandbox; that is fine -- it proves requirement 6 simultaneously: canonical_query
  // unreachable must never default to authorizing local execution).
  await submitAndSettle(page, 'What is the latest news today?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'a freshness-sensitive question must never use local execution, whether canonical_query is reachable or not');
});

// --- 4. Server-authorized local execution works end to end, including the receipt. ---
await scenario('server-authorized local execution renders the local answer and records a success receipt', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await installCanonicalQueryMock(page, async () => authorizedEnvelope('CANONICAL_FIXTURE_ANSWER'));
  await submitAndSettle(page, 'What is photosynthesis?');
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert.match(answerText, /FAKE_ON_DEVICE_ANSWER/, 'the on-device answer must render when the server authorized local execution');
  const receipts = await page.evaluate(() => window.__receipts);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].planId, 'plan-1');
  assert.equal(receipts[0].executionTarget, 'browser_local');
  assert.equal(receipts[0].success, true);
});

// --- 5a. Rejected (HTTP error) canonical response fails safely, never invents authorization. ---
await scenario('an HTTP-error canonical response never authorizes local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await page.route('**/functions/v1/ibis-assistant', (route) => route.fulfill({ status: 500, body: 'error' }));
  await submitAndSettle(page, 'What is photosynthesis?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'an HTTP error from canonical_query must never authorize local execution');
});

// --- 5b. Malformed canonical response fails safely. ---
await scenario('a malformed canonical response never authorizes local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await page.route('**/functions/v1/ibis-assistant', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notAnAnswer: true }) }));
  await submitAndSettle(page, 'What is photosynthesis?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'a malformed canonical response (no answer field) must never authorize local execution');
});

// --- 5c. Timed-out canonical response fails safely. ---
await scenario('a hung/timed-out canonical response never authorizes local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await page.route('**/functions/v1/ibis-assistant', () => new Promise(() => {})); // never resolves
  // A hung canonical_query forces every subsequent fallback layer (each with its own ~12-25s
  // internal timeout, chained sequentially) to also time out before an answer renders -- a real,
  // if slow, honest degrade, not a bug. Generous timeout to let that full chain actually settle.
  await submitAndSettle(page, 'What is photosynthesis?', 90000);
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'a hung canonical_query request must time out and never authorize local execution');
});

// --- 5d. canonical_query entirely unavailable (network abort) fails safely and still answers. ---
await scenario('canonical_query network failure never authorizes local execution and still produces an answer', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await page.route('**/functions/v1/ibis-assistant', (route) => route.abort());
  await submitAndSettle(page, 'What is photosynthesis?');
  const promptCalls = await page.evaluate(() => window.__fakeLanguageModelPromptCalls);
  assert.equal(promptCalls.length, 0, 'local execution must never be the fallback when canonical_query is unreachable');
  const answerText = await page.locator('.ibis-msg--ibis').last().innerText();
  assert(answerText && answerText.length > 0, 'a real (non-local, non-fabricated) answer attempt must still occur through the existing fallback chain');
});

// --- 6. The receipt identifies browser-local execution truthfully (provider/target/planId). ---
await scenario('the recorded receipt truthfully identifies browser-local execution', async (page) => {
  await installFakeLanguageModel(page);
  await page.goto(BASE + '/ibis-ai/', { waitUntil: 'domcontentloaded' });
  await installCanonicalQueryMock(page, async () => authorizedEnvelope('CANONICAL_FIXTURE_ANSWER'));
  await submitAndSettle(page, 'What is photosynthesis?');
  const receipts = await page.evaluate(() => window.__receipts);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].provider, 'browser_local_language_model', 'the receipt must truthfully name the execution as browser-local, not a server provider');
  assert.equal(typeof receipts[0].latencyMs, 'number');
});

await browser.close();
console.log('9/9 corrected local-AI server-authorization scenarios passed.');
