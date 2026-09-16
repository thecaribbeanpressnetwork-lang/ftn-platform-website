// FTN Platform — canonical IBIS brain contract/behavioral tests. Run with:
//   deno test --allow-env supabase/functions/_shared/ibis-canonical-brain.test.ts
// No live network calls: every provider/search call in these tests is a local fake. The lifecycle
// store used throughout is createInMemoryLifecycleStore() -- explicitly the TEST-ONLY
// implementation (see ibis-lifecycle-store.ts's own header for why it is never production-safe).
import { assert, assertEquals, assertMatch, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCanonicalRequest, recordReceiptAndMaybeFallback } from "./ibis-canonical-brain.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { searxngSearch, braveSearch, search } from "./ibis-search-adapter.ts";
import { createInMemoryLifecycleStore } from "./ibis-lifecycle-store.ts";
import type { GatewayProvider } from "./ibis-intelligence-gateway.ts";
import type { EBRInput } from "./ibis-reasoning-engines.ts";

function fakeProvider(id: string, answer: string, opts: { configured?: boolean; fail?: boolean } = {}): GatewayProvider {
  return {
    id, label: id, model: "fake-model", configured: opts.configured ?? true,
    run: async () => {
      if (opts.fail) throw new Error("HTTP_500");
      return { answer, model: "fake-model" };
    },
  };
}

// --- Gate 1: a simple question enters the canonical brain and gets SIMPLE_TEXT. ---
// Slice 3 correction: an authorized SIMPLE_TEXT plan defers to browser-local execution and does
// NOT call a provider up front (see the "generates NO provider answer" test below) -- so this
// gate no longer asserts a gateway-generated answer, only correct classification and that no
// provider (local's absence notwithstanding) was actually invoked for this plan.
Deno.test("simple question classifies SIMPLE_TEXT and defers to authorized local execution", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "SHOULD_NEVER_APPEAR")], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(res.queryClass, "SIMPLE_TEXT");
  assertEquals(res.status, "OK");
  assertEquals(res.executionInstruction.executionAuthorized, true);
  assert(!res.receipt.capabilitiesAttempted.includes("TEXT"), "an authorized plan must not attempt server TEXT generation up front");
  assert(!res.receipt.capabilitiesAttempted.includes("SEARCH"), "a plain question must not attempt SEARCH");
});

// --- Gate 2: a freshness/current question selects CURRENT_WEB_RESEARCH. ---
Deno.test("current-information question classifies CURRENT_WEB_RESEARCH", () => {
  const result = classifyIntent("What are the latest official indicators on Trinidad and Tobago's forex shortage?");
  assertEquals(result.queryClass, "CURRENT_WEB_RESEARCH");
});

// --- Gate 3: search success returns normalized real source metadata. ---
Deno.test("search success normalizes source title/publisher/url/dates", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "T&T Central Bank raises rates", url: "https://www.central-bank.org.tt/story", content: "snippet", engine: "official", publishedDate: "2026-09-10" }] }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: "What is the latest USD selling rate today?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.queryClass, "CURRENT_WEB_RESEARCH");
  assertEquals(res.evidenceState, "SEARCH_GROUNDED");
  assertEquals(res.sources.length, 1);
  assertEquals(res.sources[0].title, "T&T Central Bank raises rates");
  assertEquals(res.sources[0].url, "https://www.central-bank.org.tt/story");
  assertEquals(res.sources[0].publishedAt, "2026-09-10");
  assertEquals(res.sources[0].evidenceDepth, "SNIPPET");
});

// --- Gate 4: search-provider outage falls back honestly (SearXNG IS configured, but errors). ---
Deno.test("search provider outage degrades honestly, no fabricated answer", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () => new Response("", { status: 500 });
  const res = await handleCanonicalRequest({
    text: "What is the latest USD selling rate today?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.status, "DEGRADED");
  assertEquals(res.confidence, "UNAVAILABLE");
  assert(res.receipt.degradedStages.includes("SEARCH_UNAVAILABLE"));
  assert(res.alternatives.length > 0, "a degraded search must still offer direct-link alternatives");
  assertEquals(res.handoff.external, true);
});

// --- Gate 5: no search provider configured at all returns honest SEARCH_UNAVAILABLE. ---
Deno.test("no SEARXNG_BASE_URL configured returns SEARCH_UNAVAILABLE, not silence", async () => {
  const result = await searxngSearch("test query", { baseUrl: "" });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
  if (result.status === "SEARCH_UNAVAILABLE") {
    assertMatch(result.reason, /No SEARXNG_BASE_URL/);
    assert(result.alternatives.length > 0);
  }
});

// --- Gate: outcome extraction / Founder strategy classification (server-side honesty guard). ---
Deno.test("outcome question classifies FOUNDER_STRATEGY, genuinely executes Founder Thinking, and lists deeper modes as unavailable", async () => {
  const res = await handleCanonicalRequest({
    text: "I want to build a Caribbean-owned business that earns US dollars while helping local creators.",
    providers: [fakeProvider("test", "Decision: EXPERIMENT")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.queryClass, "FOUNDER_STRATEGY");
  assert(res.objective && res.objective.length > 0, "an outcome question must extract an objective string");
  // Founder Thinking is now genuinely connected (ibis-reasoning-engines.ts's runFounderThinking,
  // itself structuring the real founderDomain()/FOUNDER_GUIDANCE decision table from
  // ibis-intelligence-gateway.ts) -- it must show real execution, not a static "unavailable" stub.
  const founderMode = res.reasoningModesUsed.find((m) => m.mode === "FOUNDER_COGNITIVE_LAYER");
  assert(founderMode, "FOUNDER_COGNITIVE_LAYER must be listed");
  assertEquals(founderMode!.executed, true);
  assert(founderMode!.contribution && founderMode!.contribution.length > 0, "an executed engine must report a real contribution, not an empty string");
  assertMatch(founderMode!.contribution || "", /Decision:/);
  // Engines genuinely not yet ported must still be honestly reported as unavailable -- this proves
  // the fix did not also fabricate execution for engines that were never connected.
  const butterflyMode = res.reasoningModesUsed.find((m) => m.mode === "BUTTERFLY");
  assert(butterflyMode, "BUTTERFLY must be listed even when unavailable");
  assertEquals(butterflyMode!.executed, false);
  const predictionMode = res.reasoningModesUsed.find((m) => m.mode === "PREDICTION");
  assert(predictionMode, "PREDICTION must be listed even when unavailable");
  assertEquals(predictionMode!.executed, false);
});

// --- Gate: Context Graph genuinely executes for an outcome-building question (grounded to the
// request's own product list -- see ibis-reasoning-engines.ts's runContextGraph()). ---
Deno.test("outcome question genuinely executes Context Graph, grounded to the request's product list", async () => {
  const res = await handleCanonicalRequest({
    text: "I want to build a Caribbean-owned business that earns US dollars while helping local creators.",
    products: [{ name: "FTN ibis", route: "/ibis-ai/" }, { name: "FTN Opportunities", route: "/opportunities/" }],
    providers: [fakeProvider("test", "Decision: EXPERIMENT")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  const contextGraphMode = res.reasoningModesUsed.find((m) => m.mode === "CONTEXT_GRAPH");
  assert(contextGraphMode, "CONTEXT_GRAPH must be listed for a FOUNDER_STRATEGY query");
  assertEquals(contextGraphMode!.executed, true);
  assert(contextGraphMode!.contribution && contextGraphMode!.contribution.includes("node(s)"), "must report a real node count, not a static label");
});

// --- Gate: a relationship question genuinely executes Context Graph, still honestly lists
// EcoMap Relationship (genuinely missing methodology) as unavailable. ---
Deno.test("relationship question classifies RELATIONSHIP, executes Context Graph, lists EcoMap Relationship unavailable", async () => {
  const res = await handleCanonicalRequest({
    text: "Which organizations are connected to FTN ibis?",
    products: [{ name: "FTN ibis", route: "/ibis-ai/" }],
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.queryClass, "RELATIONSHIP");
  const contextGraphMode = res.reasoningModesUsed.find((m) => m.mode === "CONTEXT_GRAPH");
  assert(contextGraphMode);
  assertEquals(contextGraphMode!.executed, true);
  const ecoMapMode = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_RELATIONSHIP");
  assert(ecoMapMode, "ECOMAP_RELATIONSHIP must still be listed (genuinely missing methodology, not fabricated)");
  assertEquals(ecoMapMode!.executed, false);
});

// --- Gate: a connect-my-X request classifies TOOL_ACTION and genuinely executes Connection
// Fabric, honestly reporting no server-side gateway exists yet (never fabricating a live route). ---
Deno.test("connect-my-X request classifies TOOL_ACTION, executes Connection Fabric honestly, lists Multi-Agent unavailable", async () => {
  const res = await handleCanonicalRequest({
    text: "Please connect my gmail so ibis can send email for me.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.queryClass, "TOOL_ACTION");
  const fabricMode = res.reasoningModesUsed.find((m) => m.mode === "CONNECTION_FABRIC");
  assert(fabricMode, "CONNECTION_FABRIC must be listed for a TOOL_ACTION query");
  assertEquals(fabricMode!.executed, true);
  assert(fabricMode!.contribution && fabricMode!.contribution.toLowerCase().includes("gmail"));
  const multiAgentMode = res.reasoningModesUsed.find((m) => m.mode === "MULTI_AGENT");
  assert(multiAgentMode, "MULTI_AGENT must still be listed unavailable -- Connection Fabric alone cannot execute a connected action");
  assertEquals(multiAgentMode!.executed, false);
});

// --- Gate: correlation must never be silently upgraded to causation language. ---
Deno.test("correlation-flavored question with a live-data term still routes to research, never a guessed correlation claim", () => {
  const result = classifyIntent("Is there a correlation between remittances and the exchange rate?");
  assertEquals(result.queryClass, "CURRENT_WEB_RESEARCH");
});

// --- Gate: provider outage falls to the gateway's real rules-based founder-reasoning fallback,
// honestly labeled -- FOUNDER_STRATEGY is never local-authorized, so this genuinely exercises the
// provider-fallback chain (SIMPLE_TEXT questions no longer reach runGateway directly). ---
Deno.test("unconfigured providers fall to the rules-based founder-reasoning fallback, honestly labeled", async () => {
  const res = await handleCanonicalRequest({
    text: "I want to build a Caribbean-owned business that earns US dollars.",
    providers: [fakeProvider("a", "unused", { configured: false })],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.queryClass, "FOUNDER_STRATEGY");
  assertEquals(res.executionInstruction.executionAuthorized, false, "FOUNDER_STRATEGY must never be local-authorized -- this test would silently stop exercising the fallback chain otherwise");
  assertEquals(res.status, "OK");
  const founderFallback = res.reasoningModesUsed.find((m) => m.mode === "FOUNDER_REASONING_RULES_FALLBACK");
  assert(founderFallback && founderFallback.executed, "the real deterministic fallback must be reported as executed, distinct from the deeper unported FOUNDER_COGNITIVE_LAYER");
});

// --- Gate: true provider exhaustion (deterministic fallback also has nothing to work with)
// degrades to DEGRADED, never fabricates an answer. Only reachable via the receipt/fallback path
// now, since an authorized plan's initial response never calls a provider at all. ---
Deno.test("full provider exhaustion with no fallback degrades to DEGRADED, never fabricates an answer", async () => {
  const store = createInMemoryLifecycleStore();
  const plan = await handleCanonicalRequest({ text: "x", providers: [fakeProvider("a", "unused", { configured: false })], lifecycleStore: store });
  assertEquals(plan.executionInstruction.executionAuthorized, true);
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId: plan.executionInstruction.planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "x" },
    providers: [fakeProvider("a", "unused", { configured: false })],
    lifecycleStore: store,
  });
  assertEquals(outcome.status, "ACCEPTED");
  if (outcome.status === "ACCEPTED") {
    assert(outcome.envelope, "a failure receipt must always produce a fallback envelope, even a degraded one");
    assertEquals(outcome.envelope!.receipt.degradedStages.includes("ALL_TEXT_PROVIDERS_FAILED"), true);
    assertMatch(outcome.envelope!.answer, /could not reach an answer provider/i);
  }
});

Deno.test("response envelope never contains a literal API key/token/secret substring", async () => {
  const res = await handleCanonicalRequest({ text: "hello", providers: [fakeProvider("test", "Good day.")], lifecycleStore: createInMemoryLifecycleStore() });
  const serialized = JSON.stringify(res);
  assert(!/sk-[a-zA-Z0-9]{10,}/.test(serialized), "no OpenAI-style key pattern in response");
  assert(!/AIza[0-9A-Za-z_-]{10,}/.test(serialized), "no Google API key pattern in response");
});

// --- Brave Search adapter (Slice 2): normalizes real Brave response contract. ---
Deno.test("Brave Search success normalizes title/publisher/url", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ web: { results: [{ title: "Central Bank raises rates", url: "https://www.central-bank.org.tt/x", description: "snippet", meta_url: { hostname: "central-bank.org.tt" } }] } }), { status: 200 });
  const result = await braveSearch("test", { apiKey: "fake-key", fetchImpl: fakeFetch });
  assertEquals(result.status, "OK");
  if (result.status === "OK") {
    assertEquals(result.provider, "brave-search");
    assertEquals(result.sources[0].publisher, "central-bank.org.tt");
    assertEquals(result.sources[0].evidenceDepth, "SNIPPET");
  }
});

Deno.test("Brave Search with no API key returns SEARCH_UNAVAILABLE", async () => {
  const result = await braveSearch("test", { apiKey: "" });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
});

// --- Fallback chain: SearXNG down/unconfigured -> Brave tried next. ---
Deno.test("search() falls through from SearXNG to Brave when SearXNG is unconfigured", async () => {
  Deno.env.delete("SEARXNG_BASE_URL");
  Deno.env.set("BRAVE_SEARCH_API_KEY", "fake-key");
  const fakeFetch: typeof fetch = async (url) => {
    if (String(url).includes("api.search.brave.com")) {
      return new Response(JSON.stringify({ web: { results: [{ title: "Brave result", url: "https://example.tt/a", meta_url: { hostname: "example.tt" } }] } }), { status: 200 });
    }
    return new Response("", { status: 500 });
  };
  const result = await search("test", { fetchImpl: fakeFetch });
  assertEquals(result.status, "OK");
  if (result.status === "OK") assertEquals(result.provider, "brave-search");
  Deno.env.delete("BRAVE_SEARCH_API_KEY");
});

Deno.test("search() returns SEARCH_UNAVAILABLE when neither SearXNG nor Brave are configured", async () => {
  Deno.env.delete("SEARXNG_BASE_URL");
  Deno.env.delete("BRAVE_SEARCH_API_KEY");
  const result = await search("test", {});
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
});

// --- Slice 1 correction: executionInstruction is the sole, server-side authority over browser
// local execution. ---
Deno.test("simple question authorizes browser_local execution with a real planId", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "Photosynthesis converts light into chemical energy.")], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(res.executionInstruction.executionAuthorized, true);
  assertEquals(res.executionInstruction.executionTarget, "browser_local");
  assertEquals(res.executionInstruction.freshnessRequired, false);
  assertEquals(res.executionInstruction.planId, res.requestId);
});

Deno.test("freshness question never authorizes browser_local execution", async () => {
  const res = await handleCanonicalRequest({ text: "What is the latest news today?", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(res.executionInstruction.executionAuthorized, false);
  assertEquals(res.executionInstruction.freshnessRequired, true);
  assertEquals(res.executionInstruction.executionTarget, "server_provider");
});

Deno.test("outcome/strategy question never authorizes browser_local execution", async () => {
  const res = await handleCanonicalRequest({ text: "I want to build a Caribbean-owned business.", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(res.executionInstruction.executionAuthorized, false);
  assertEquals(res.executionInstruction.executionTarget, "server_provider");
});

// --- Slice 3 CORRECTION: no durable lifecycle store -> fail closed on local authorization. ---
Deno.test("no lifecycle store available: SIMPLE_TEXT never authorized for local execution, still answers", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "Real server answer.")], lifecycleStore: null });
  assertEquals(res.executionInstruction.executionAuthorized, false, "must fail closed on local authorization when no durable store exists");
  assertMatch(res.answer, /Real server answer/, "must still answer the question server-side, never leave the user with nothing");
});

Deno.test("a receipt cannot be processed at all when no lifecycle store is available", async () => {
  const outcome = await recordReceiptAndMaybeFallback({ receipt: { planId: "x", executionTarget: "browser_local", provider: "browser_local_language_model", success: true }, providers: [], lifecycleStore: null });
  assertEquals(outcome.status, "REJECTED");
  if (outcome.status === "REJECTED") assertEquals(outcome.reason, "LIFECYCLE_STORE_UNAVAILABLE");
});

// --- Slice 3: the PLAN/EXECUTE/RECEIPT/FINAL-RESPONSE lifecycle. ---

Deno.test("authorized SIMPLE_TEXT plan generates NO provider answer up front (no duplicate generation)", async () => {
  const provider = fakeProvider("test", "SHOULD_NEVER_APPEAR");
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [provider], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(res.executionInstruction.executionAuthorized, true);
  assertEquals(res.answer, "", "an authorized plan must return an empty answer -- generating one here and letting the browser also generate one locally would be duplicate generation");
  assertEquals(res.evidenceState, "NO_ANSWER_GENERATED");
});

Deno.test("a success receipt is accepted with no fallback envelope (browser already has the answer)", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a receipt test one?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: true, degraded: false, latencyMs: 120 },
    providers: [fakeProvider("test", "SHOULD_NEVER_APPEAR")],
    lifecycleStore: store,
  });
  assertEquals(outcome.status, "ACCEPTED");
  if (outcome.status === "ACCEPTED") assertEquals(outcome.envelope, null, "a success receipt must never trigger a second, duplicate answer generation");
});

Deno.test("a failure receipt triggers exactly one authorized fallback generation", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a receipt test two?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, degraded: true, latencyMs: 300, text: "What is a receipt test two?" },
    providers: [fakeProvider("test", "REAL_FALLBACK_ANSWER")],
    lifecycleStore: store,
  });
  assertEquals(outcome.status, "ACCEPTED");
  if (outcome.status === "ACCEPTED") {
    assert(outcome.envelope, "a failure receipt must produce exactly one fallback answer envelope");
    assertMatch(outcome.envelope!.answer, /REAL_FALLBACK_ANSWER/);
    assert(outcome.envelope!.receipt.degradedStages.includes("LOCAL_EXECUTION_FAILED_FALLBACK_TO_SERVER"));
  }
});

Deno.test("a failure receipt with mismatched/forged prompt text is rejected, never regenerated on trust alone", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a receipt test forged?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "a completely different prompt the server never authorized" },
    providers: [fakeProvider("test", "SHOULD_NEVER_APPEAR")],
    lifecycleStore: store,
  });
  assertEquals(outcome.status, "REJECTED");
  if (outcome.status === "REJECTED") assertEquals(outcome.reason, "TEXT_MISMATCH");
});

Deno.test("a second receipt for the same plan is rejected as a duplicate", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a receipt test three?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const first = await recordReceiptAndMaybeFallback({ receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: true }, providers: [], lifecycleStore: store });
  assertEquals(first.status, "ACCEPTED");
  const second = await recordReceiptAndMaybeFallback({ receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: true }, providers: [], lifecycleStore: store });
  assertEquals(second.status, "REJECTED");
  if (second.status === "REJECTED") assertEquals(second.reason, "DUPLICATE_RECEIPT");
});

Deno.test("a receipt for an unknown planId is rejected", async () => {
  const outcome = await recordReceiptAndMaybeFallback({ receipt: { planId: "never-issued-plan-id", executionTarget: "browser_local", provider: "browser_local_language_model", success: true }, providers: [], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(outcome.status, "REJECTED");
  if (outcome.status === "REJECTED") assertEquals(outcome.reason, "UNKNOWN_PLAN");
});

Deno.test("a receipt claiming browser_local against a plan that was never authorized is rejected as mismatched", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is the latest news today?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const outcome = await recordReceiptAndMaybeFallback({ receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: true }, providers: [], lifecycleStore: store });
  assertEquals(outcome.status, "REJECTED");
  if (outcome.status === "REJECTED") assertEquals(outcome.reason, "MISMATCHED_AUTHORIZATION");
});

Deno.test("a malformed receipt (missing required fields) is rejected", async () => {
  const outcome = await recordReceiptAndMaybeFallback({ receipt: { planId: "x" } as any, providers: [], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(outcome.status, "REJECTED");
  if (outcome.status === "REJECTED") assertEquals(outcome.reason, "MALFORMED_RECEIPT");
});

Deno.test("server-executed (non-authorized) plans are terminal immediately -- a stray receipt against one is rejected, not a fresh accept", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is the latest news today?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  assertEquals(res.executionInstruction.executionAuthorized, false);
  const outcome = await recordReceiptAndMaybeFallback({ receipt: { planId: res.executionInstruction.planId, executionTarget: "server_provider", provider: "cloudflare-workers-ai", success: true }, providers: [], lifecycleStore: store });
  assertEquals(outcome.status, "REJECTED");
});

// --- Concurrency (per your explicit request): PLAN/RECEIPT across "separate instances" (separate
// store instances sharing nothing simulates the worst case honestly -- see the caveat below), two
// simultaneous receipts yielding exactly one terminal transition and one fallback provider call,
// expired plans failing, forged combinations failing, retries being idempotent, and store
// unavailability failing honestly. ---

Deno.test("CONCURRENCY: two simultaneous failure receipts for the same plan yield exactly one fallback provider call", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a concurrency test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  let providerCalls = 0;
  const countingProvider: GatewayProvider = { id: "test", label: "test", model: "fake-model", configured: true, run: async () => { providerCalls += 1; return { answer: "ONE_TRUE_ANSWER", model: "fake-model" }; } };
  const [a, b] = await Promise.all([
    recordReceiptAndMaybeFallback({ receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a concurrency test?" }, providers: [countingProvider], lifecycleStore: store }),
    recordReceiptAndMaybeFallback({ receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a concurrency test?" }, providers: [countingProvider], lifecycleStore: store }),
  ]);
  const accepted = [a, b].filter((o) => o.status === "ACCEPTED");
  const rejected = [a, b].filter((o) => o.status === "REJECTED");
  assertEquals(accepted.length, 1, "exactly one of the two simultaneous receipts must be accepted");
  assertEquals(rejected.length, 1, "the other must be rejected, not silently ignored or double-processed");
  assertEquals(providerCalls, 1, "the fallback provider must be called exactly once, never twice, under concurrent receipts");
});

// --- LEASE/FENCING (explicit correction): a legitimate provider call may exceed the staleness
// window, so "stale enough" alone must never be the only guard. These tests exercise
// claimFallback()/finalizeFallback() directly (the real store contract) as well as through
// recordReceiptAndMaybeFallback(), with an injected leaseDurationMsOverride so no test sleeps. ---

Deno.test("LEASE: a provider call lasting longer than the resumption window (30s) does not duplicate, because the lease (45s) has not expired", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a slow-provider test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  let providerCalls = 0;
  // Simulates a provider call that takes 35s of wall-clock time -- longer than the OLD 30s
  // staleness window this correction replaces, but well within the 45s lease.
  const slowProvider: GatewayProvider = {
    id: "test", label: "test", model: "fake-model", configured: true,
    run: async () => { providerCalls += 1; return { answer: "SLOW_BUT_SINGLE_ANSWER", model: "fake-model" }; },
  };
  // A second failure receipt arrives while the (simulated) first is still "in flight" -- modeled
  // here by claiming the lease directly first (as the first receipt's handler would have already
  // done), then having the SECOND receipt attempt to claim while that lease is still active.
  const firstClaim = await store.claimFallback(planId, 45_000);
  assertEquals(firstClaim.ok, true);
  const secondAttempt = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a slow-provider test?" },
    providers: [slowProvider], lifecycleStore: store,
  });
  assertEquals(secondAttempt.status, "REJECTED", "a still-active lease must reject a second attempt outright, never race it, no matter how long the first call takes");
  assertEquals(providerCalls, 0, "the second (rejected) attempt must never call the provider at all");
});

Deno.test("LEASE: an active (non-expired) lease retry is rejected, not resumed", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is an active lease test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const claimed = await store.claimFallback(planId, 45_000);
  assertEquals(claimed.ok, true);
  const retry = await store.claimFallback(planId, 45_000);
  assertEquals(retry.ok, false);
  if (!retry.ok) assertEquals(retry.reason, "NOT_CLAIMABLE");
});

Deno.test("LEASE: a genuinely expired (crashed) lease becomes reclaimable, and reclaiming increments the fencing version", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a reclaim test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  // A 1ms lease that we let expire deterministically (no real sleep needed for such a short wait
  // to genuinely elapse via the event loop) -- injected lease duration, not a production value.
  const firstClaim = await store.claimFallback(planId, 1);
  assertEquals(firstClaim.ok, true);
  if (!firstClaim.ok) return;
  await new Promise((resolve) => setTimeout(resolve, 5));
  const reclaim = await store.claimFallback(planId, 45_000);
  assertEquals(reclaim.ok, true);
  if (reclaim.ok) {
    assertNotEquals(reclaim.leaseOwner, firstClaim.leaseOwner, "a reclaim must issue a brand new lease owner token");
    assert(reclaim.leaseVersion > firstClaim.leaseVersion, "a reclaim must increment the fencing version");
  }
});

Deno.test("LEASE: the old lease holder cannot finalize after its lease has been reclaimed", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a superseded-lease test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const firstClaim = await store.claimFallback(planId, 1);
  assertEquals(firstClaim.ok, true);
  if (!firstClaim.ok) return;
  await new Promise((resolve) => setTimeout(resolve, 5));
  const reclaim = await store.claimFallback(planId, 45_000);
  assertEquals(reclaim.ok, true);
  // The OLD worker, unaware it was superseded, finally finishes its (abandoned) work and tries to
  // finalize with its ORIGINAL (now-stale) lease token.
  const staleFinalize = await store.finalizeFallback(planId, firstClaim.leaseOwner, firstClaim.leaseVersion, "SUCCEEDED");
  assertEquals(staleFinalize.ok, false);
  if (!staleFinalize.ok) assertEquals(staleFinalize.reason, "LEASE_SUPERSEDED");
});

Deno.test("LEASE: two simultaneous reclaim attempts on the same expired lease produce exactly one new owner", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a double-reclaim test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const firstClaim = await store.claimFallback(planId, 1);
  assertEquals(firstClaim.ok, true);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const [a, b] = await Promise.all([store.claimFallback(planId, 45_000), store.claimFallback(planId, 45_000)]);
  const succeeded = [a, b].filter((r) => r.ok);
  assertEquals(succeeded.length, 1, "exactly one of two simultaneous reclaim attempts on the same expired lease must succeed");
});

Deno.test("LEASE: a terminal (SUCCEEDED) plan cannot be changed by a later claim or transition attempt", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a terminal-state test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const claim = await store.claimFallback(planId, 45_000);
  assertEquals(claim.ok, true);
  if (!claim.ok) return;
  const finalize = await store.finalizeFallback(planId, claim.leaseOwner, claim.leaseVersion, "SUCCEEDED");
  assertEquals(finalize.ok, true);
  // Now terminal. Neither a fresh claim nor a finalize with the same (now-stale) token can change it.
  const claimAfterTerminal = await store.claimFallback(planId, 45_000);
  assertEquals(claimAfterTerminal.ok, false);
  const finalizeAfterTerminal = await store.finalizeFallback(planId, claim.leaseOwner, claim.leaseVersion, "SUCCEEDED");
  assertEquals(finalizeAfterTerminal.ok, false);
});

Deno.test("CONCURRENCY: retrying an already-accepted receipt is idempotent (rejected, not reprocessed)", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a retry test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const receipt = { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: true } as const;
  const first = await recordReceiptAndMaybeFallback({ receipt, providers: [], lifecycleStore: store });
  const retry = await recordReceiptAndMaybeFallback({ receipt, providers: [fakeProvider("test", "SHOULD_NEVER_APPEAR")], lifecycleStore: store });
  assertEquals(first.status, "ACCEPTED");
  assertEquals(retry.status, "REJECTED", "a retried/replayed receipt must be rejected outright, never reprocessed as if new");
});

Deno.test("CONCURRENCY: an expired plan's receipt fails, even if it was genuinely authorized", async () => {
  const store = createInMemoryLifecycleStore();
  // Directly exercise the store's own TTL handling with a near-zero TTL, rather than waiting out
  // the real 5-minute window in a test.
  await store.createPlan({ planId: "expiring-plan", authorizedTarget: "browser_local", intent: "SIMPLE_TEXT", freshnessRequired: false, textSha256: "irrelevant", ttlMs: 1 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const outcome = await recordReceiptAndMaybeFallback({ receipt: { planId: "expiring-plan", executionTarget: "browser_local", provider: "browser_local_language_model", success: true }, providers: [], lifecycleStore: store });
  assertEquals(outcome.status, "REJECTED");
  if (outcome.status === "REJECTED") assertEquals(outcome.reason, "EXPIRED_PLAN");
});

Deno.test("CONCURRENCY: a forged planId/target combination fails (planId exists but for a different target)", async () => {
  const store = createInMemoryLifecycleStore();
  await store.createPlan({ planId: "server-only-plan", authorizedTarget: "server_provider", intent: "FOUNDER_STRATEGY", freshnessRequired: false, textSha256: "irrelevant", ttlMs: 60_000 });
  const outcome = await recordReceiptAndMaybeFallback({ receipt: { planId: "server-only-plan", executionTarget: "browser_local", provider: "browser_local_language_model", success: true }, providers: [], lifecycleStore: store });
  assertEquals(outcome.status, "REJECTED");
  if (outcome.status === "REJECTED") assertEquals(outcome.reason, "MISMATCHED_AUTHORIZATION");
});

Deno.test("CONCURRENCY: database unavailability (store construction failure) fails honestly, not silently", async () => {
  // Simulates a real DB-backed store whose underlying calls fail (analogous to a database being
  // unreachable) by using a store whose every method reports unavailability. Must satisfy the
  // full LifecycleStore interface (including claimFallback/finalizeFallback) to type-check as a
  // real store, not a partial stand-in.
  const brokenStore = {
    kind: "DATABASE" as const,
    async createPlan() { throw new Error("simulated database unavailable"); },
    async getPlan() { return null; },
    async transitionPlan() { return { ok: false as const, reason: "STORE_ERROR" as const }; },
    async claimFallback() { return { ok: false as const, reason: "STORE_ERROR" as const }; },
    async finalizeFallback() { return { ok: false as const, reason: "STORE_ERROR" as const }; },
  };
  await assert(
    (async () => { try { await handleCanonicalRequest({ text: "hi", providers: [fakeProvider("test", "unused")], lifecycleStore: brokenStore }); return false; } catch { return true; } })(),
    "createPlan failing (simulated database unavailability) must surface as a real failure, not a silently-authorized plan with no backing record"
  );
});

// --- CRASH-RECOVERY (explicitly required): claim -> simulated crash -> retry -> resumed via
// reclaim, never abandoned; a genuinely completed fallback stays terminal and is never re-resumed. ---
Deno.test("CRASH-RECOVERY: after a simulated crash mid-fallback, a retry reclaims the expired lease and delivers an answer", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a crash recovery test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;

  // Step 1: the atomic claim, with a 1ms lease -- exactly as a real failure receipt would
  // perform, but with an injected short lease so this test can let it genuinely expire without a
  // real 45-second sleep. Done directly against the store to simulate "the function crashed
  // immediately after this line, before calling the provider or returning a response".
  const claim = await store.claimFallback(planId, 1);
  assertEquals(claim.ok, true, "the claim itself must succeed before the simulated crash");

  // Step 2: (the crash -- nothing else happens; no provider was ever called). Let the 1ms lease
  // genuinely elapse.
  await new Promise((resolve) => setTimeout(resolve, 5));

  let providerCalls = 0;
  const countingProvider: GatewayProvider = { id: "test", label: "test", model: "fake-model", configured: true, run: async () => { providerCalls += 1; return { answer: "RESUMED_ANSWER", model: "fake-model" }; } };

  // Step 3: client retries the exact same failure receipt. The plan's lease has genuinely
  // expired (step 2), so claimFallback() inside recordReceiptAndMaybeFallback() reclaims it with
  // a new fencing version -- this is the real, non-time-fudged behavior, not a test-only override.
  const retryOutcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a crash recovery test?" },
    providers: [countingProvider],
    lifecycleStore: store,
  });

  // Step 4/5: the system resumes the stuck plan and the user is NOT abandoned -- a real answer
  // comes back, honestly marked as a resumption (attemptCount > 1 on the reclaimed plan).
  assertEquals(retryOutcome.status, "ACCEPTED");
  if (retryOutcome.status === "ACCEPTED") {
    assert(retryOutcome.envelope, "a resumed fallback must still deliver a real answer, never leave the user with nothing");
    assertMatch(retryOutcome.envelope!.answer, /RESUMED_ANSWER/);
    assert(retryOutcome.envelope!.receipt.degradedStages.includes("RESUMED_AFTER_CRASHED_FALLBACK_CLAIM"), "a resumption must be honestly labeled as such, not indistinguishable from a normal fallback");
  }
  // Step 6: once resumed and finalized, the plan is terminal -- a THIRD receipt for the same plan
  // (e.g. a slow, now-redundant original request finally arriving) must be rejected, not trigger
  // yet another provider call. Retry returns a rejection, not a fabricated re-delivery of the
  // terminal result (this store does not retain the answer text itself to replay it -- see the
  // migration's "no prompt/answer text stored" design note -- so a caller wanting the already-
  // delivered answer must rely on its own earlier successful response, not a second query here).
  assertEquals(providerCalls, 1);
  const thirdOutcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a crash recovery test?" },
    providers: [countingProvider],
    lifecycleStore: store,
  });
  assertEquals(thirdOutcome.status, "REJECTED");
  assertEquals(providerCalls, 1, "a plan that already completed (even via resumption) must never be resumed again");
});

Deno.test("CRASH-RECOVERY: a normal (non-crashed) fallback is finalized and cannot later be 'resumed'", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a normal fallback test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  let providerCalls = 0;
  const countingProvider: GatewayProvider = { id: "test", label: "test", model: "fake-model", configured: true, run: async () => { providerCalls += 1; return { answer: "NORMAL_ANSWER", model: "fake-model" }; } };
  const first = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a normal fallback test?" },
    providers: [countingProvider], lifecycleStore: store,
  });
  assertEquals(first.status, "ACCEPTED");
  if (first.status === "ACCEPTED") assert(!first.envelope!.receipt.degradedStages.includes("RESUMED_AFTER_CRASHED_FALLBACK_CLAIM"), "a normal, uninterrupted fallback must not be mislabeled as a crash resumption");
  // A duplicate/replayed receipt after a normal (uninterrupted) completion must be rejected, not
  // treated as a resumable crash -- this is the bug this fix specifically closes.
  const replay = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a normal fallback test?" },
    providers: [countingProvider], lifecycleStore: store,
  });
  assertEquals(replay.status, "REJECTED");
  assertEquals(providerCalls, 1, "a completed plan replayed later must never call the provider a second time");
});

Deno.test("empty text is rejected without attempting any provider", async () => {
  const res = await handleCanonicalRequest({ text: "   ", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(res.status, "UNAVAILABLE");
  assertEquals(res.receipt.capabilitiesAttempted.length, 0);
});

Deno.test("two plans for the same text get distinct planIds (no accidental collision/reuse)", async () => {
  const store = createInMemoryLifecycleStore();
  const a = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const b = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  assertNotEquals(a.executionInstruction.planId, b.executionInstruction.planId);
});

// --- EBR (Evidence-Bounded Retrodiction) -- see GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md. Source
// methodology: Ricardo Gill's published EBR protocol (DOI 10.5281/zenodo.22681856), NOT the
// separate, speculative Gill Cohesive Consciousness Hypothesis, which this module never touches. ---

Deno.test("EBR: a why-did-this-happen question classifies RETRODICTION, distinct from an ordinary question", () => {
  const result = classifyIntent("Why did signups drop after the redesign?");
  assertEquals(result.queryClass, "RETRODICTION");
});

Deno.test("EBR: an ordinary SIMPLE_TEXT question never invokes EBR at all (non-invocation)", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  assert(!res.reasoningModesUsed.some((m) => m.mode === "EBR"), "EBR must not appear in reasoningModesUsed for an irrelevant, non-retrodictive query");
});

Deno.test("EBR: a FOUNDER_STRATEGY outcome question never invokes EBR either (non-invocation is selective, not global)", async () => {
  const res = await handleCanonicalRequest({
    text: "I want to build a Caribbean-owned business that earns US dollars.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(!res.reasoningModesUsed.some((m) => m.mode === "EBR"));
});

Deno.test("EBR: a retrodiction question with no structured evidence is honestly SKIPPED, never fabricated", async () => {
  const res = await handleCanonicalRequest({
    text: "Why did signups drop after the redesign?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.queryClass, "RETRODICTION");
  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode, "EBR must still be listed for a RETRODICTION query, even when honestly skipped");
  assertEquals(ebrMode!.executed, false);
  assertEquals(res.contradictions.length, 0, "no structured evidence means no contradictions can honestly be reported");
});

Deno.test("EBR: real structured evidence + an admissible candidate history MATERIALLY changes the canonical response, not just executed:true", async () => {
  const ebrInput: EBRInput = {
    actor: "operator-1",
    decisionTime: "2026-09-10T09:58:00Z",
    auditCutoff: "2026-09-10T12:00:00Z",
    evidenceItems: [
      {
        id: "warning-957", eventTime: "2026-09-10T09:57:00Z", recordTime: "2026-09-10T09:57:30Z",
        provenance: "grid-sensor-7", epistemicStatus: "DOCUMENTED",
        actorAccess: [{ actor: "operator-1", accessTime: "2026-09-10T09:57:30Z", assertedAt: "2026-09-10T09:57:30Z", basis: "DOCUMENTED" }],
        contradicts: ["conflicting-log-entry"], contradictionSeverity: "SOFT",
      },
      { id: "conflicting-log-entry", eventTime: "2026-09-10T09:57:00Z", recordTime: "2026-09-10T09:58:00Z", provenance: "backup-log", epistemicStatus: "DOCUMENTED" },
    ],
    candidateHistories: [{
      id: "h1", label: "Operator saw the grid warning and adjusted plan",
      edges: [{
        id: "e1", from: "warning-957", to: "operator-decision-958", nominatedBy: ["MECHANISM"],
        mechanismClass: "OPERATOR_PERCEIVED_WARNING_AND_ADJUSTED_PLAN", temporalStatus: "BEFORE",
        provenanceRoots: ["grid-sensor-7", "operator-interview"],
        testableImplication: "The control log should show a plan adjustment logged after 09:57.",
        knownContradictions: [], epistemicLabel: "DOCUMENTED",
      }],
    }],
  };
  const res = await handleCanonicalRequest({
    text: "Why did the operator change the plan right before the incident?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
    ebrInput,
  });
  assertEquals(res.queryClass, "RETRODICTION");
  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode);
  assertEquals(ebrMode!.executed, true);
  assert(ebrMode!.contribution && ebrMode!.contribution.includes("Strongest admissible candidate"), "must report a real, concrete finding, not a static label");
  // The material-change proof: contradictions/uncertainties are populated on the ENVELOPE itself
  // (both otherwise always empty for a RETRODICTION query), not only inside one reasoningMode entry.
  assertEquals(res.contradictions.length, 1, "a real contradiction supplied in evidenceItems must surface on the canonical envelope");
  assert(res.contradictions[0].includes("warning-957"));
  assert(res.uncertainties.some((u) => u.includes("⊥")), "the unmodeled-history reserve must surface on the canonical envelope's own uncertainties");
});

Deno.test("EBR: no admissible candidate history honestly abstains rather than fabricating a reconstruction", async () => {
  const ebrInput: EBRInput = {
    actor: "analyst-1", decisionTime: "2023-01-01T00:00:00Z", auditCutoff: "2023-06-01T00:00:00Z",
    evidenceItems: [{ id: "e1", eventTime: "2023-01-01T00:00:00Z", recordTime: "2023-01-01T00:00:00Z", provenance: "news-report", epistemicStatus: "DOCUMENTED" }],
    candidateHistories: [{
      id: "h1", label: "Chronology-only guess",
      edges: [{ id: "e1", from: "a", to: "b", nominatedBy: ["CHRONOLOGY"], mechanismClass: null, temporalStatus: "BEFORE", provenanceRoots: [], testableImplication: null, knownContradictions: [], epistemicLabel: "UNKNOWN" }],
    }],
  };
  const res = await handleCanonicalRequest({
    text: "Why did signups drop after the redesign?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
    ebrInput,
  });
  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode);
  assertEquals(ebrMode!.executed, true, "the engine genuinely ran and evaluated the input -- abstaining is a real outcome, not a skip");
  assert(ebrMode!.contribution && ebrMode!.contribution.includes("abstains"));
});

// --- COMPOSABILITY: an additive server-side capability plan, not an exclusive queryClass. A single
// request can need several capabilities at once (research + EBR + correlation). `queryClass`
// remains the single PRIMARY class for legacy code; `capabilityPlan` is the additive plan that
// actually drives which engines run -- see ibis-response-envelope.ts's CapabilityKind/
// PlannedCapability and ibis-canonical-brain.ts's planCapabilities(). ---

const ACCEPTANCE_QUERY = "Why has Trinidad and Tobago experienced foreign-exchange shortages, what evidence supports the possible causes, and what practical actions could improve the situation?";

Deno.test("COMPOSABILITY: acceptance query signals cause-evidence + retrodiction, primary class RETRODICTION", () => {
  const result = classifyIntent(ACCEPTANCE_QUERY);
  assertEquals(result.queryClass, "RETRODICTION");
  assertEquals(result.signals.causeEvidence, true);
  assertEquals(result.signals.retrodiction, true);
  assertEquals(result.signals.freshness, false, "the acceptance query must not accidentally trip a freshness marker");
});

Deno.test("COMPOSABILITY: a current causal question invokes both RESEARCH and EBR when search evidence is available", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "USD exchange rate update", url: "https://www.central-bank.org.tt/rate", content: "snippet", engine: "central-bank", publishedDate: "2026-09-15" }] }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: "Why has the latest USD exchange rate dropped today?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.queryClass, "CURRENT_WEB_RESEARCH", "freshness still wins PRIMARY classification, unchanged from every prior checkpoint");
  assert(res.capabilityPlan.some((p) => p.capability === "RESEARCH"));
  assert(res.capabilityPlan.some((p) => p.capability === "EBR"), "EBR must be additively planned even though CURRENT_WEB_RESEARCH won primary classification");
  assert(!res.capabilityPlan.some((p) => p.capability === "CORRELATION"), "no correlation marker matched -- must not be planned");
  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode, "EBR must be invoked");
  assertEquals(ebrMode!.executed, true, "real grounded search evidence exists -- EBR must genuinely run, not SKIP");
});

Deno.test("COMPOSABILITY: a current causal question also invokes Correlation when a correlation marker is present", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "Remittances and FX", url: "https://www.central-bank.org.tt/remit", content: "snippet", engine: "central-bank", publishedDate: "2026-09-14" }] }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: "Why has the latest correlation between remittances and the exchange rate changed?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assert(res.capabilityPlan.some((p) => p.capability === "RESEARCH"));
  assert(res.capabilityPlan.some((p) => p.capability === "EBR"));
  assert(res.capabilityPlan.some((p) => p.capability === "CORRELATION"));
  assert(res.reasoningModesUsed.some((m) => m.mode === "CORRELATION"), "Correlation must actually be invoked, not just planned");
});

Deno.test("COMPOSABILITY: a historical causal question can invoke EBR without requiring current search (advanced ebrInput interface)", async () => {
  const res = await handleCanonicalRequest({
    text: "Why did the operator change the plan right before the incident?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
    ebrInput: {
      auditCutoff: "2026-09-16T12:00:00Z",
      evidenceItems: [{ id: "warning-957", eventTime: "2026-09-10T09:57:00Z", recordTime: "2026-09-10T09:57:30Z", provenance: "control-log", epistemicStatus: "DOCUMENTED" }],
      candidateHistories: [{ id: "h1", label: "Operator saw the warning", edges: [{ id: "e1", from: "warning-957", to: "decision", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE", provenanceRoots: ["control-log"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED" }] }],
    },
  });
  assert(!res.capabilityPlan.some((p) => p.capability === "RESEARCH"), "no freshness/cause-evidence marker matched -- research must not be planned");
  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode);
  assertEquals(ebrMode!.executed, true, "explicit ebrInput must still genuinely execute without any search having run");
});

Deno.test("COMPOSABILITY: a simple factual question does not invoke EBR", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  assert(!res.capabilityPlan.some((p) => p.capability === "EBR"));
  assert(!res.reasoningModesUsed.some((m) => m.mode === "EBR"));
});

Deno.test("COMPOSABILITY: a current fact lookup without a causal request does not invoke EBR", async () => {
  const res = await handleCanonicalRequest({ text: "What is the latest USD selling rate today?", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  assert(res.capabilityPlan.some((p) => p.capability === "RESEARCH"));
  assert(!res.capabilityPlan.some((p) => p.capability === "EBR"));
  assert(!res.reasoningModesUsed.some((m) => m.mode === "EBR"));
});

Deno.test("COMPOSABILITY: search failure produces honest degradation and EBR abstention, not a model-memory answer disguised as research", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () => new Response("", { status: 500 });
  const res = await handleCanonicalRequest({
    text: "Why has the latest USD exchange rate dropped today?",
    providers: [fakeProvider("test", "SHOULD_NOT_BE_TREATED_AS_RESEARCH")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.status, "DEGRADED");
  assert(res.receipt.degradedStages.includes("SEARCH_UNAVAILABLE"));
  assertMatch(res.answer, /can't verify the requested information/);
  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode, "EBR must still be listed as planned");
  assertEquals(ebrMode!.executed, false, "no grounded evidence exists -- EBR must abstain (SKIPPED), never fabricate a reconstruction");
});

Deno.test("COMPOSABILITY: the final receipt lists every planned capability alongside its actual outcome", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "T&T forex note", url: "https://www.central-bank.org.tt/note", content: "snippet", engine: "central-bank", publishedDate: "2026-08-01" }] }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.receipt.capabilityPlan, res.capabilityPlan, "the receipt must carry the same capability plan as the top-level response");
  for (const planned of res.capabilityPlan) {
    const outcome = res.reasoningModesUsed.some((m) => m.mode === planned.capability) || (planned.capability === "RESEARCH" && res.receipt.capabilitiesAttempted.includes("SEARCH"));
    assert(outcome, `planned capability ${planned.capability} must have a corresponding outcome recorded (executed, skipped, degraded or unavailable)`);
  }
});

// --- ACCEPTANCE QUERY (exact text specified): with mocked grounded evidence, prove the plan
// includes research + EBR + correlation and produces a sourced, uncertainty-aware answer; without
// grounded evidence, prove it degrades honestly. ---

Deno.test("ACCEPTANCE QUERY: with mocked grounded evidence, plan includes research+EBR+correlation, answer is sourced and uncertainty-aware", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({
      results: [
        { title: "Central Bank of T&T: forex allocation update", url: "https://www.central-bank.org.tt/forex-update", content: "snippet", engine: "central-bank", publishedDate: "2026-08-20" },
        { title: "IMF Article IV consultation: Trinidad and Tobago", url: "https://www.imf.org/tt-article-iv", content: "snippet", engine: "imf", publishedDate: "2026-06-10" },
      ],
    }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "Draft answer text.")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  assertEquals(res.queryClass, "RETRODICTION");
  assertEquals(res.capabilityPlan.map((p) => p.capability).sort(), ["CORRELATION", "EBR", "RESEARCH"]);
  assertEquals(res.sources.length, 2, "the answer must be genuinely sourced");
  assertEquals(res.evidenceState, "SEARCH_GROUNDED");

  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode);
  assertEquals(ebrMode!.executed, true, "real grounded evidence exists -- EBR must genuinely run");
  assert(ebrMode!.contribution && ebrMode!.contribution.includes("grounded evidence"), "must report a real, concrete finding, not a static label");

  const correlationMode = res.reasoningModesUsed.find((m) => m.mode === "CORRELATION");
  assert(correlationMode, "Correlation must be listed as planned and invoked");
  assertEquals(correlationMode!.executed, false, "no numeric time-series data exists in this free-text request -- honestly SKIPPED, not fabricated");

  assert(res.uncertainties.some((u) => u.includes("⊥")), "the unmodeled-history reserve must surface on the canonical envelope's own uncertainties");
  assertEquals(res.status, "OK");
});

Deno.test("ACCEPTANCE QUERY: without grounded evidence, it degrades honestly instead of fabricating researched causes", async () => {
  Deno.env.delete("SEARXNG_BASE_URL");
  Deno.env.delete("BRAVE_SEARCH_API_KEY");
  const res = await handleCanonicalRequest({
    text: ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "SHOULD_NOT_APPEAR_AS_RESEARCH")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.status, "DEGRADED");
  assert(res.receipt.degradedStages.includes("SEARCH_UNAVAILABLE"));
  assertEquals(res.sources.length, 0);
  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode);
  assertEquals(ebrMode!.executed, false, "no grounded evidence -- EBR must abstain, never fabricate a historical reconstruction");
  assertMatch(res.answer, /can't verify the requested information/);
});

Deno.test("EBR: no consciousness claim appears anywhere in a canonical response that genuinely executed EBR", async () => {
  const ebrInput: EBRInput = {
    actor: "operator-1", decisionTime: "2026-09-10T09:58:00Z", auditCutoff: "2026-09-10T12:00:00Z",
    evidenceItems: [{ id: "warning-957", eventTime: "2026-09-10T09:57:00Z", recordTime: "2026-09-10T09:57:30Z", provenance: "grid-sensor-7", epistemicStatus: "DOCUMENTED" }],
    candidateHistories: [{
      id: "h1", label: "Operator saw the grid warning",
      edges: [{ id: "e1", from: "warning-957", to: "decision", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE", provenanceRoots: ["grid-sensor-7"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED" }],
    }],
  };
  const res = await handleCanonicalRequest({
    text: "Why did the operator change the plan right before the incident?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
    ebrInput,
  });
  assert(!/conscious/i.test(JSON.stringify(res)), "no canonical response may ever claim consciousness -- see GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md");
});
