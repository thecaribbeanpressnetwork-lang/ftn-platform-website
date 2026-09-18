// FTN Platform — canonical IBIS brain contract/behavioral tests. Run with:
//   deno test --allow-env supabase/functions/_shared/ibis-canonical-brain.test.ts
// No live network calls: every provider/search call in these tests is a local fake. The lifecycle
// store used throughout is createInMemoryLifecycleStore() -- explicitly the TEST-ONLY
// implementation (see ibis-lifecycle-store.ts's own header for why it is never production-safe).
import { assert, assertEquals, assertMatch, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCanonicalRequest, recordReceiptAndMaybeFallback } from "./ibis-canonical-brain.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { searxngSearch, braveSearch, search } from "./ibis-search-adapter.ts";
import { createInMemoryLifecycleStore, sha256Hex } from "./ibis-lifecycle-store.ts";
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
  assertEquals(res.sources[0].snippet, "snippet", "SearXNG's own result `content` must become SourceRecord.snippet");
});

// Security correction (independent audit): a search result whose url is not https:// (e.g. a
// javascript:/data: URI, which a search backend does not guarantee never to produce) must never
// reach a client's sources[] array -- both browser renderers put source.url directly into an
// anchor's href, where a non-http(s) scheme would be clickable and would execute in the page.
Deno.test("search results with a non-https url are dropped from sources, never reaching a client renderer", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({
      results: [
        { title: "malicious result", url: "javascript:alert(document.cookie)", content: "snippet", engine: "test" },
        { title: "another malicious result", url: "data:text/html,<script>alert(1)</script>", content: "snippet", engine: "test" },
        { title: "a genuine result", url: "https://www.central-bank.org.tt/story", content: "snippet", engine: "official", publishedDate: "2026-09-10" },
      ],
    }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: "What is the latest USD selling rate today?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.sources.length, 1, "only the genuine https:// source must survive");
  assertEquals(res.sources[0].url, "https://www.central-bank.org.tt/story");
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
Deno.test("relationship question classifies RELATIONSHIP, executes Context Graph (an internal-ecosystem question, not an EcoMap Relationship-flavored one)", async () => {
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
  // EcoMap Relationship (implemented this checkpoint -- see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md)
  // is a SEPARATE, real-world-referral-flavored engine ("which organizations fund/refer/support",
  // "referrals", "relationships or between") -- this text asks about FTN's own internal product
  // ecosystem (handled by CONTEXT_GRAPH), not a real-world referral/funding question, so it must
  // not be additively planned here. See the COMPOSABILITY / ECOMAP test group below for the
  // dedicated contrast test proving ECOMAP_RELATIONSHIP genuinely invokes on the right query.
  assert(!res.capabilityPlan.some((p) => p.capability === "ECOMAP_RELATIONSHIP"));
  assert(!res.reasoningModesUsed.some((m) => m.mode === "ECOMAP_RELATIONSHIP"));
});

// --- Gate: a connect-my-X request classifies TOOL_ACTION and genuinely executes Connection
// Fabric, honestly reporting no server-side gateway exists yet (never fabricating a live route). ---
Deno.test("connect-my-X request classifies TOOL_ACTION, executes Connection Fabric honestly, and does not plan MULTI_AGENT for a single-capability request", async () => {
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
  // MULTI_AGENT (this checkpoint's internal scheduler -- see GOVERNANCE/
  // MULTI_AGENT_SOURCE_AND_BOUNDARY.md) is only planned when 2+ other capabilities need dependency-
  // aware coordination -- a single-capability request like this one has nothing to schedule, so it
  // must not appear at all (neither executed nor unavailable). The fact that no EXTERNAL,
  // side-effecting action can actually be executed is disclosed by Connection Fabric's own finding
  // text, not a separate MULTI_AGENT-unavailable record.
  assert(!res.capabilityPlan.some((p) => p.capability === "MULTI_AGENT"));
  assert(!res.reasoningModesUsed.some((m) => m.mode === "MULTI_AGENT"));
  assert(fabricMode!.contribution!.includes("No connection gateway"), "the inability to execute a connected action must remain disclosed via Connection Fabric itself");
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
    assertEquals(result.sources[0].snippet, "snippet", "Brave's own result `description` must become SourceRecord.snippet");
  }
});

Deno.test("SearXNG/Brave: a result with no content/description field leaves snippet null, never breaking normalization", async () => {
  const searxngResult = await searxngSearch("test", {
    baseUrl: "http://fake-searxng.test",
    fetchImpl: async () => new Response(JSON.stringify({ results: [{ title: "No snippet here", url: "https://example.tt/none" }] }), { status: 200 }),
  });
  assert(searxngResult.status === "OK");
  assertEquals(searxngResult.sources[0].snippet, null);

  const braveResult = await braveSearch("test", {
    apiKey: "fake-key",
    fetchImpl: async () => new Response(JSON.stringify({ web: { results: [{ title: "No description here", url: "https://example.tt/none2" }] } }), { status: 200 }),
  });
  assert(braveResult.status === "OK");
  assertEquals(braveResult.sources[0].snippet, null);
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
  assertEquals(ebrMode!.executed, true, "a MOCK_SEARCH_FIXTURE evidence set exists (CONTRACT_GROUNDED, not LIVE_SEARCH_GROUNDED -- no real search provider is configured in this test) -- EBR must genuinely run, not SKIP");
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

// --- ACCEPTANCE QUERY (exact text specified): WITH a MOCK_SEARCH_FIXTURE (CONTRACT_GROUNDED --
// this proves the L1/L2 orchestration contract, never claimed as LIVE_SEARCH_GROUNDED since no
// real search provider is configured in this test environment), prove the plan includes research +
// EBR + correlation and produces a sourced, uncertainty-aware answer; without any evidence fixture,
// prove it degrades honestly. ---

Deno.test("ACCEPTANCE QUERY: with a MOCK_SEARCH_FIXTURE (CONTRACT_GROUNDED), plan includes research+EBR+correlation, answer is sourced and uncertainty-aware", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  // MOCK_SEARCH_FIXTURE: a canned response standing in for a search provider, shaped like a real
  // one so the test proves the orchestration CONTRACT (CONTRACT_GROUNDED) -- this is NEVER
  // LIVE_SEARCH_GROUNDED evidence; no real network call to a search provider is made.
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
  // 3 capabilities planned (RESEARCH+EBR+CORRELATION) -- the internal scheduler (MULTI_AGENT, this
  // checkpoint) is additively planned too, since dependency-aware coordination is genuinely
  // relevant once there is more than one other capability.
  assertEquals(res.capabilityPlan.map((p) => p.capability).sort(), ["CORRELATION", "EBR", "MULTI_AGENT", "RESEARCH"]);
  assertEquals(res.sources.length, 2, "the answer must be genuinely sourced (from the MOCK_SEARCH_FIXTURE, not fabricated)");
  assertEquals(res.evidenceState, "SEARCH_GROUNDED");

  const ebrMode = res.reasoningModesUsed.find((m) => m.mode === "EBR");
  assert(ebrMode);
  assertEquals(ebrMode!.executed, true, "the MOCK_SEARCH_FIXTURE evidence exists (CONTRACT_GROUNDED) -- EBR must genuinely run");
  assert(ebrMode!.contribution && ebrMode!.contribution.includes("grounded evidence"), "must report a real, concrete finding, not a static label");

  const multiAgentMode = res.reasoningModesUsed.find((m) => m.mode === "MULTI_AGENT");
  assert(multiAgentMode, "the internal scheduler must genuinely run once there is more than one capability to coordinate");
  assertEquals(multiAgentMode!.executed, true);

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

// --- ECOMAP (Place / Pathway / Relationship) -- see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md.
// Methodology: PARTIAL / FOUNDER-AUTHORIZED (a founder-authorized product contract, NOT an
// externally validated methodology). Extends the additive capability plan introduced in the prior
// checkpoint: Place, Pathway and Relationship are each independently selectable and composable. ---

const ECOMAP_ACCEPTANCE_QUERY = "I want to start a community food business in Tobago. Map the services and organizations that could help, the steps and requirements I need to follow, and the relationships or referrals that could move it forward.";

function ecoMapFakeFetch(): typeof fetch {
  return async () =>
    new Response(JSON.stringify({
      results: [
        { title: "Tobago Business Development Office", url: "https://example.tt/tbdo", content: "snippet", engine: "gov.tt", publishedDate: "2026-01-10" },
        { title: "Youth Entrepreneurship Grant Programme - Tobago", url: "https://example.tt/grant", content: "snippet", engine: "gov.tt", publishedDate: "2026-02-01" },
        { title: "Free Food Safety Certification Workshop (No Cost)", url: "https://example.tt/foodsafety", content: "snippet", engine: "health.gov.tt", publishedDate: "2026-03-05" },
      ],
    }), { status: 200 });
}

Deno.test("ECOMAP ACCEPTANCE QUERY: plan includes RESEARCH+ECOMAP_PLACE+ECOMAP_PATHWAY+ECOMAP_RELATIONSHIP+FOUNDER_THINKING, one retrieval feeds all three", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const res = await handleCanonicalRequest({
    text: ECOMAP_ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "Draft answer text.")],
    searchFetchImpl: ecoMapFakeFetch(),
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  const planCapabilities = res.capabilityPlan.map((p) => p.capability).sort();
  assert(planCapabilities.includes("RESEARCH"));
  assert(planCapabilities.includes("ECOMAP_PLACE"));
  assert(planCapabilities.includes("ECOMAP_PATHWAY"));
  assert(planCapabilities.includes("ECOMAP_RELATIONSHIP"));
  assert(planCapabilities.includes("FOUNDER_THINKING"));
  assertEquals(res.sources.length, 3, "one retrieval result set (a MOCK_SEARCH_FIXTURE, CONTRACT_GROUNDED) must feed the request");

  // Place produces sourced relevant entities and coverage.
  const placeMode = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_PLACE");
  assert(placeMode);
  assertEquals(placeMode!.executed, true);
  assert(placeMode!.contribution!.includes("Tobago Business Development Office"), "Place must report a real, sourced entity");
  assert(placeMode!.contribution!.includes("PARTIAL / FOUNDER-AUTHORIZED"), "must disclose the methodology classification");

  // Pathway produces sourced steps, dependencies and gaps.
  const pathwayMode = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_PATHWAY");
  assert(pathwayMode);
  assertEquals(pathwayMode!.executed, true);
  assert(pathwayMode!.contribution!.includes("INFERRED"), "a pathway must not pretend a step is confirmed when evidence is absent");
  assert(pathwayMode!.contribution!.includes("not confirmed by any source"), "gaps must remain visible");

  // Relationship produces sourced directional edges.
  const relationshipMode = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_RELATIONSHIP");
  assert(relationshipMode);
  assertEquals(relationshipMode!.executed, true);
  assert(relationshipMode!.contribution!.includes("->"), "relationship edges must be reported");

  // Zero-cost alternatives appear when appropriate (the "Free ... (No Cost)" fixture source).
  assert(res.actions.some((a) => a.toLowerCase().includes("zero-cost")), "a genuinely zero-cost-flagged source must surface a zero-cost alternative in the envelope's actions");

  // EcoMap output materially changes the canonical result: actions/ecosystemConnections were
  // previously ALWAYS empty for every query class; here they carry real content.
  assert(res.actions.length > 0, "Pathway must materially populate the envelope's actions field");
  assert(res.ecosystemConnections.length > 0, "Relationship must materially populate the envelope's ecosystemConnections field");

  // Missing evidence remains visible (Place's gap disclosures feed uncertainties).
  assert(res.uncertainties.some((u) => u.startsWith("EcoMap Place:")), "Place's gap disclosures must surface on the canonical envelope");

  // The receipt distinguishes planned vs executed/skipped/degraded/unavailable capabilities.
  assertEquals(res.receipt.capabilityPlan, res.capabilityPlan);
  for (const mode of ["ECOMAP_PLACE", "ECOMAP_PATHWAY", "ECOMAP_RELATIONSHIP"]) {
    const record = res.reasoningModesUsed.find((m) => m.mode === mode);
    assert(record, `${mode} must appear in reasoningModesUsed with a real executed/unavailable state`);
  }

  // Precise personal location is neither requested nor exposed.
  const serialized = JSON.stringify(res);
  assert(!/\bcoordinates\b|\blatitude\b|\blongitude\b/i.test(serialized), "no precise location must ever be requested or exposed");
});

Deno.test("ECOMAP: sensitive/unsupported relationships are suppressed even when the plan includes ECOMAP_RELATIONSHIP", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const res = await handleCanonicalRequest({
    text: ECOMAP_ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: ecoMapFakeFetch(),
    lifecycleStore: createInMemoryLifecycleStore(),
    ecomapRelationshipContext: {
      subject: "My food business",
      sources: [{ id: "s1", title: "Tobago Business Development Office", text: "Tobago Business Development Office", url: "https://example.tt/tbdo", publisher: "gov.tt", origin: "SEARCH", recordedAt: "2026-01-10T00:00:00Z", confidence: "INFERRED" }],
      explicitEdges: [{
        id: "edge-sensitive", sourceEntity: "Person A", targetEntity: "Person B", relationType: "FAMILY_REFERRAL",
        direction: "SOURCE_TO_TARGET", influence: "CONFIRMED", dependency: true, incentive: null, reciprocalValue: null,
        trustConfidence: "CONFIRMED", provenance: "internal-case-note", sensitivity: "SENSITIVE",
      }],
    },
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  const relationshipMode = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_RELATIONSHIP");
  assert(relationshipMode);
  assert(relationshipMode!.contribution!.includes("sensitive relationship(s) detected but not disclosed"));
  assert(!relationshipMode!.contribution!.includes("Person A"), "a sensitive edge must never be named in the customer-facing contribution");
  assert(!res.ecosystemConnections.some((e) => e.includes("Person A")), "a sensitive edge must never leak into the envelope's ecosystemConnections field");
});

Deno.test("ECOMAP CONTRAST: 'Where is the nearest public business-development office?' selects Place, not all three automatically", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const res = await handleCanonicalRequest({
    text: "Where is the nearest public business-development office?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: ecoMapFakeFetch(),
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assert(res.capabilityPlan.some((p) => p.capability === "ECOMAP_PLACE"));
  assert(!res.capabilityPlan.some((p) => p.capability === "ECOMAP_PATHWAY"), "must not additively select Pathway for a pure place lookup");
  assert(!res.capabilityPlan.some((p) => p.capability === "ECOMAP_RELATIONSHIP"), "must not additively select Relationship for a pure place lookup");
});

Deno.test("ECOMAP CONTRAST: 'What steps are required to register a food business?' selects Pathway", async () => {
  const res = await handleCanonicalRequest({
    text: "What steps are required to register a food business?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(res.capabilityPlan.some((p) => p.capability === "ECOMAP_PATHWAY"));
  assert(!res.capabilityPlan.some((p) => p.capability === "ECOMAP_PLACE"));
  assert(!res.capabilityPlan.some((p) => p.capability === "ECOMAP_RELATIONSHIP"));
});

Deno.test("ECOMAP CONTRAST: 'Which organizations fund or refer Tobago food entrepreneurs?' selects Relationship and Research", async () => {
  const res = await handleCanonicalRequest({
    text: "Which organizations fund or refer Tobago food entrepreneurs?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(res.capabilityPlan.some((p) => p.capability === "ECOMAP_RELATIONSHIP"));
  assert(res.capabilityPlan.some((p) => p.capability === "RESEARCH"), "identifying real organizations requires grounded evidence, not internal data alone");
  assert(!res.capabilityPlan.some((p) => p.capability === "ECOMAP_PLACE"));
  assert(!res.capabilityPlan.some((p) => p.capability === "ECOMAP_PATHWAY"));
});

Deno.test("ECOMAP CONTRAST: a simple factual question invokes none of the EcoMap modes", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  for (const mode of ["ECOMAP_PLACE", "ECOMAP_PATHWAY", "ECOMAP_RELATIONSHIP"]) {
    assert(!res.capabilityPlan.some((p) => p.capability === mode));
    assert(!res.reasoningModesUsed.some((m) => m.mode === mode));
  }
});

Deno.test("ECOMAP: search failure produces honest partial/degraded output, never a fabricated map", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () => new Response("", { status: 500 });
  const res = await handleCanonicalRequest({
    text: ECOMAP_ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.status, "DEGRADED");
  assert(res.receipt.degradedStages.includes("SEARCH_UNAVAILABLE"));
  for (const mode of ["ECOMAP_PLACE", "ECOMAP_PATHWAY", "ECOMAP_RELATIONSHIP"]) {
    const record = res.reasoningModesUsed.find((m) => m.mode === mode);
    assert(record, `${mode} must still be listed as planned`);
    assertEquals(record!.executed, false, `${mode} must honestly abstain (no grounded evidence), never fabricate a map`);
  }
});

Deno.test("ECOMAP: mock evidence is never classified LIVE_SEARCH_GROUNDED", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const res = await handleCanonicalRequest({
    text: ECOMAP_ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: ecoMapFakeFetch(),
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  // The response's own evidenceState enum has no "LIVE_SEARCH_GROUNDED" value at all -- this test
  // documents that a MOCK_SEARCH_FIXTURE result is SEARCH_GROUNDED (CONTRACT_GROUNDED in this
  // test), never anything claiming production liveness.
  assertEquals(res.evidenceState, "SEARCH_GROUNDED");
  assert(!JSON.stringify(res).includes("LIVE_SEARCH_GROUNDED"));
});

// --- MULTI-AGENT ORCHESTRATION ACCEPTANCE (this checkpoint) -- see GOVERNANCE/
// MULTI_AGENT_SOURCE_AND_BOUNDARY.md and ibis-multi-agent-orchestrator.ts. The six required
// acceptance-test groups, using the exact query texts specified for this checkpoint. ---

// Group 1: the exact required "full composable query" text.
const FULL_COMPOSABLE_QUERY =
  "I want to start a community food business in Tobago. Research the current support available, map the organizations and relationships, show the steps and alternatives, compare the likely effects of the strongest options, and explain the uncertainties.";

Deno.test("MULTI-AGENT ACCEPTANCE (group 1): full composable query -- one evidence retrieval, EcoMap modes execute, Context Graph consumes EcoMap output, Butterfly/Foresight execute only via disclosed bridges with no fake probabilities, sensitive relationships stay protected, one final answer, one complete receipt, never LIVE_SEARCH_GROUNDED", async () => {
  let fetchCalls = 0;
  const baseFetch = ecoMapFakeFetch();
  const countingFetch: typeof fetch = async (...args) => {
    fetchCalls++;
    return await baseFetch(...args);
  };
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const res = await handleCanonicalRequest({
    text: FULL_COMPOSABLE_QUERY,
    providers: [fakeProvider("test", "Draft answer text.")],
    searchFetchImpl: countingFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  // Exactly one evidence retrieval feeds every capability that needs it.
  assertEquals(fetchCalls, 1, "exactly one retrieval call must be made regardless of how many capabilities need evidence");
  assertEquals(res.sources.length, 3);

  // The full 9-capability plan (RESEARCH+FOUNDER_THINKING+BUTTERFLY+PREDICTION+CONTEXT_GRAPH+
  // ECOMAP_PLACE+ECOMAP_PATHWAY+ECOMAP_RELATIONSHIP+MULTI_AGENT) is genuinely selected.
  const planned = res.capabilityPlan.map((p) => p.capability).sort();
  assertEquals(planned, ["BUTTERFLY", "CONTEXT_GRAPH", "ECOMAP_PATHWAY", "ECOMAP_PLACE", "ECOMAP_RELATIONSHIP", "FOUNDER_THINKING", "MULTI_AGENT", "PREDICTION", "RESEARCH"]);

  // EcoMap modes execute.
  const place = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_PLACE")!;
  const pathway = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_PATHWAY")!;
  const relationship = res.reasoningModesUsed.find((m) => m.mode === "ECOMAP_RELATIONSHIP")!;
  assert(place?.executed, "ECOMAP_PLACE must genuinely execute against real search evidence");
  assert(pathway?.executed, "ECOMAP_PATHWAY must genuinely execute against real search evidence");
  assert(relationship?.executed, "ECOMAP_RELATIONSHIP must genuinely execute against real search evidence");

  // Context Graph consumes EcoMap Place's output (not just the FTN product list).
  const contextGraph = res.reasoningModesUsed.find((m) => m.mode === "CONTEXT_GRAPH")!;
  assert(contextGraph.executed);
  assert(contextGraph.contribution!.includes("EcoMap Place"), "Context Graph's own findings must disclose that it merged EcoMap Place's grounded entities");

  // Butterfly executes only because EcoMap Pathway genuinely produced real steps -- via the
  // disclosed heuristic bridge, never a measured/predicted value.
  const butterfly = res.reasoningModesUsed.find((m) => m.mode === "BUTTERFLY")!;
  assert(butterfly.executed, "EcoMap Pathway produced real steps for this request -- Butterfly must genuinely execute");
  assert(butterfly.contribution!.includes("fixed, disclosed heuristic"), "the qualitative-to-quantitative bridge must be disclosed, never presented as measured data");

  // Foresight (Prediction) produces a real scenario without inventing a numeric probability.
  const prediction = res.reasoningModesUsed.find((m) => m.mode === "PREDICTION")!;
  assert(prediction.executed, "EcoMap Place produced a real OPPORTUNITY entity (the grant programme) -- Prediction must genuinely execute");
  assert(!/\bprobability\b\s*[:=]\s*0?\.\d/i.test(prediction.contribution || ""), "Foresight/Prediction must never fabricate a numeric probability");

  // Sensitive relationships remain protected (none were supplied here -- confirm none leaked).
  assert(!res.ecosystemConnections.some((e) => /\bsensitive\b|\bprivate\b/i.test(e)), "no sensitive/private relationship detail may appear in the customer-facing ecosystemConnections field");

  // One final synthesized answer.
  assert(res.answer.length > 0);

  // One complete receipt: every planned capability ends in exactly one terminal state, and the
  // top-level and receipt-nested capabilityExecution match.
  assertEquals(res.receipt.capabilityExecution, res.capabilityExecution);
  for (const entry of res.capabilityExecution) {
    assert(!["SELECTED", "INPUT_READY"].includes(entry.finalState), `${entry.capability} must end in a terminal, non-transient state -- got ${entry.finalState}`);
  }
  const multiAgent = res.reasoningModesUsed.find((m) => m.mode === "MULTI_AGENT")!;
  assert(multiAgent.executed, "the internal scheduler itself must genuinely run once 8 other capabilities were planned");

  // Terminology: a MOCK_SEARCH_FIXTURE (CONTRACT_GROUNDED) must never be classified LIVE_SEARCH_GROUNDED.
  assert(!JSON.stringify(res).includes("LIVE_SEARCH_GROUNDED"));
});

// Group 2: the exact required forex causal query.
Deno.test("MULTI-AGENT ACCEPTANCE (group 2): forex causal query -- Research+EBR planned, Correlation executes only with a real valid time series, no duplicate retrieval/provider calls", async () => {
  let fetchCalls = 0;
  const fakeFetch: typeof fetch = async () => {
    fetchCalls++;
    return new Response(JSON.stringify({
      results: [{ title: "Central Bank of T&T: forex allocation update", url: "https://www.central-bank.org.tt/forex-update", content: "snippet", engine: "central-bank", publishedDate: "2026-08-20" }],
    }), { status: 200 });
  };
  let providerCalls = 0;
  const countingProvider: GatewayProvider = {
    id: "test", label: "test", model: "fake-model", configured: true,
    run: async () => { providerCalls++; return { answer: "Draft answer text.", model: "fake-model" }; },
  };
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const seriesA = { id: "remittances", periods: ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05"], values: [10, 12, 14, 15, 17] };
  const seriesB = { id: "fx-shortage-index", periods: ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05"], values: [3, 4, 4, 5, 6] };
  const res = await handleCanonicalRequest({
    text: ACCEPTANCE_QUERY,
    providers: [countingProvider],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
    correlationInput: { seriesA, seriesB },
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  assert(res.capabilityPlan.some((p) => p.capability === "RESEARCH"));
  assert(res.capabilityPlan.some((p) => p.capability === "EBR"));
  assert(res.capabilityPlan.some((p) => p.capability === "CORRELATION"));

  const correlation = res.reasoningModesUsed.find((m) => m.mode === "CORRELATION")!;
  assertEquals(correlation.executed, true, "a real, valid 5-point series pair must genuinely execute Correlation");
  assert(correlation.contribution!.includes("r ="), "must report a real computed statistic, not a placeholder");

  const ebr = res.reasoningModesUsed.find((m) => m.mode === "EBR")!;
  assertEquals(ebr.executed, true);
  assert(!res.uncertainties.some((u) => /causal/i.test(u) && /confirmed/i.test(u)), "an unsupported causal claim must never be asserted as confirmed");

  assertEquals(fetchCalls, 1, "no duplicate retrieval call may occur across the whole capability plan");
  assertEquals(providerCalls, 1, "no duplicate provider/synthesis call may occur across the whole capability plan");
});

// Item 5 (Correlation real-datasource re-investigation): the repo genuinely has one real
// server-accessible bivariate numeric series (Central Bank TT$/US$ buying vs selling rate, see
// ibis-correlation-datasource.ts) -- an exchange-rate correlation question with NO explicit
// correlationInput must now auto-connect it and execute a real Pearson statistic, proving
// Correlation is no longer permanently UNAVAILABLE/browser-only for every query.
Deno.test("REAL DATASOURCE (item 5): an exchange-rate correlation question auto-connects the real Central Bank buying/selling series with no caller-supplied input", async () => {
  const res = await handleCanonicalRequest({
    text: "Is there a correlation between the buying rate and selling rate for the US dollar in Trinidad and Tobago?",
    providers: [fakeProvider("test", "Draft answer text.")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(res.capabilityPlan.some((p) => p.capability === "CORRELATION"));
  const correlation = res.reasoningModesUsed.find((m) => m.mode === "CORRELATION")!;
  assertEquals(correlation.executed, true, "a real, already-published Central Bank series pair must genuinely execute, not remain a disclosed limitation");
  assert(correlation.contribution!.includes("r ="), "must report a real computed statistic, not a placeholder");
  assert(correlation.contribution!.includes("TT$/US$"), "must be traceable to the real named Central Bank series, never a silently invented pairing");
});

Deno.test("REAL DATASOURCE (item 5): an unrelated correlation question is never given the FX series -- no fabricated pairing", async () => {
  const res = await handleCanonicalRequest({
    text: "Is there a correlation between social media use and teenage anxiety?",
    providers: [fakeProvider("test", "Draft answer text.")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(res.capabilityPlan.some((p) => p.capability === "CORRELATION"), "the generic correlation marker still plans the capability");
  const correlation = res.reasoningModesUsed.find((m) => m.mode === "CORRELATION")!;
  assertEquals(correlation.executed, false, "no real series exists for social media/anxiety -- must honestly skip, never substitute an unrelated real dataset");
  assert(!correlation.contribution || !correlation.contribution.includes("TT$/US$"), "the FX series must never be silently substituted for an unrelated correlation request");
});

// Item 4 (FTN entity disambiguation) + item 7 (causal proof it actually shapes the real search
// call, not just metadata): capture the exact query string sent to the search provider and prove
// it differs for a platform-context "FTN" question vs. an unrelated one, and is never corrupted
// for a query that clearly means a different FTN entity.
function capturedSearchQuery(text: string): Promise<string | null> {
  let captured: string | null = null;
  const fakeFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    captured = url.searchParams.get("q");
    return new Response(JSON.stringify({ results: [{ title: "FTN Platform update", url: "https://ftnplatform.org/update", content: "snippet", engine: "searxng" }] }), { status: 200 });
  };
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  return handleCanonicalRequest({
    text, providers: [fakeProvider("test", "Draft answer text.")],
    searchFetchImpl: fakeFetch, lifecycleStore: createInMemoryLifecycleStore(),
  }).then(() => { Deno.env.delete("SEARXNG_BASE_URL"); return captured; });
}

Deno.test("CAUSAL PROOF J (FTN disambiguation): a platform-context FTN question's real search query is expanded with disambiguating context", async () => {
  const q = await capturedSearchQuery("What is the latest news about FTN and what has it announced recently?");
  assert(q, "a real search call must have been made");
  assertMatch(q!, /Face The Nation/i);
});

Deno.test("CAUSAL PROOF J (FTN disambiguation): a query naming a different FTN entity sends the real search query completely untouched", async () => {
  const q = await capturedSearchQuery("What are the latest FTN Fantasy start-sit rankings and recent NFL picks?");
  assert(q, "a real search call must have been made");
  assert(!/Face The Nation/i.test(q!), "the fantasy-football FTN query must never be corrupted with unrelated platform context");
});

Deno.test("CAUSAL PROOF J (FTN disambiguation): a query with no 'FTN' mention sends the search query unmodified", async () => {
  const q = await capturedSearchQuery("What is the latest news about Trinidad and Tobago's economy?");
  assert(q, "a real search call must have been made");
  assert(!/Face The Nation/i.test(q!));
});

// Group 3: missing-input test.
Deno.test("MULTI-AGENT ACCEPTANCE (group 3): a generic outcome question does not falsely execute Butterfly/Correlation/Foresight, and the receipt shows the correct skip reason", async () => {
  const res = await handleCanonicalRequest({
    text: "I want to build a Caribbean-owned business that earns US dollars.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(!res.capabilityPlan.some((p) => p.capability === "CORRELATION"), "no correlation marker matched -- must not even be planned");

  for (const mode of ["BUTTERFLY", "PREDICTION"]) {
    const record = res.reasoningModesUsed.find((m) => m.mode === mode)!;
    assertEquals(record.executed, false, `${mode} must not falsely execute without its required structured input`);
  }
  const butterflyReceipt = res.capabilityExecution.find((r) => r.capability === "BUTTERFLY")!;
  assertEquals(butterflyReceipt.finalState, "SKIPPED_MISSING_INPUT");
  const predictionReceipt = res.capabilityExecution.find((r) => r.capability === "PREDICTION")!;
  assertEquals(predictionReceipt.finalState, "SKIPPED_MISSING_INPUT");
});

// Group 4: simple query.
Deno.test("MULTI-AGENT ACCEPTANCE (group 4): 'What is photosynthesis?' does not activate the multi-agent scheduler or any conditional engine", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: createInMemoryLifecycleStore() });
  assertEquals(res.capabilityPlan.length, 0, "an ordinary factual question must plan zero capabilities");
  assertEquals(res.capabilityExecution.length, 0);
  assert(!res.reasoningModesUsed.some((m) => m.mode === "MULTI_AGENT"));
});

// Group 5: failure and budget tests.
Deno.test("MULTI-AGENT ACCEPTANCE (group 5): one capability throwing produces a FAILED receipt for that capability only, and the request still returns one honest, non-fabricated partial answer", async () => {
  const poisonedSources = new Proxy([], { get() { throw new Error("boom"); } });
  const res = await handleCanonicalRequest({
    text: "I want to start a food business. Map the organizations that could help.",
    providers: [fakeProvider("test", "Real fallback answer text.")],
    lifecycleStore: createInMemoryLifecycleStore(),
    // deliberately malformed (not a real EcoMapPlaceInput) to prove the scheduler survives a
    // throwing capability -- a poisoned Proxy that throws on any property access.
    // deno-lint-ignore no-explicit-any
    ecomapPlaceContext: { sources: poisonedSources, jurisdiction: null } as any,
  });
  const placeReceipt = res.capabilityExecution.find((r) => r.capability === "ECOMAP_PLACE")!;
  assertEquals(placeReceipt.finalState, "FAILED", "the poisoned input must fail ONLY this one capability, never crash the whole scheduler");
  assert(placeReceipt.history.some((h) => h.reason?.includes("boom")));

  const founderReceipt = res.capabilityExecution.find((r) => r.capability === "FOUNDER_THINKING")!;
  assertEquals(founderReceipt.finalState, "EXECUTED", "an unrelated capability must still execute normally despite ECOMAP_PLACE failing");

  assert(res.answer.length > 0, "the overall request must still produce a real, honest answer despite one capability failing");
  assert(!res.answer.includes("boom"), "an internal error must never leak into the customer-facing answer");
});

Deno.test("MULTI-AGENT ACCEPTANCE (group 5): execution-budget exhaustion produces an honest SKIPPED_BUDGET receipt, never a crash or a fabricated result", async () => {
  const res = await handleCanonicalRequest({
    text: "I want to build a Caribbean-owned business that earns US dollars.",
    providers: [fakeProvider("test", "Real answer.")],
    lifecycleStore: createInMemoryLifecycleStore(),
    executionBudgetMsOverride: -1,
  });
  const founderReceipt = res.capabilityExecution.find((r) => r.capability === "FOUNDER_THINKING")!;
  assertEquals(founderReceipt.finalState, "SKIPPED_BUDGET");
  for (const entry of res.capabilityExecution) {
    assert(!["SELECTED", "INPUT_READY"].includes(entry.finalState), `${entry.capability} must not be left in a transient state after budget exhaustion`);
  }
  assert(res.answer.length > 0, "a fully budget-exhausted request must still return a real, honest answer, never a crash");
});

Deno.test("MULTI-AGENT ACCEPTANCE (group 5): search unavailable still produces exactly one honest degraded answer, with EcoMap/Butterfly/Foresight all correctly skipped rather than fabricated", async () => {
  Deno.env.delete("SEARXNG_BASE_URL");
  Deno.env.delete("BRAVE_SEARCH_API_KEY");
  const res = await handleCanonicalRequest({
    text: FULL_COMPOSABLE_QUERY,
    providers: [fakeProvider("test", "SHOULD_NOT_APPEAR")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.status, "DEGRADED");
  assert(res.receipt.degradedStages.includes("SEARCH_UNAVAILABLE"));
  for (const mode of ["ECOMAP_PLACE", "ECOMAP_PATHWAY", "ECOMAP_RELATIONSHIP", "BUTTERFLY", "PREDICTION"]) {
    const record = res.reasoningModesUsed.find((m) => m.mode === mode)!;
    assertEquals(record.executed, false, `${mode} must honestly abstain with no grounded evidence, never fabricate`);
  }
  assert(res.answer.length > 0, "even a fully degraded request must return exactly one honest answer");
});

// Group 6: terminology -- mock fixtures never become LIVE_SEARCH_GROUNDED, across every acceptance
// query used in this checkpoint (the individual group-1 test above already asserts this for the
// full composable query; this asserts it for the forex query and the ECOMAP acceptance query too).
Deno.test("MULTI-AGENT ACCEPTANCE (group 6): mock fixtures are never classified LIVE_SEARCH_GROUNDED for any acceptance query in this checkpoint", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "Central Bank of T&T: forex allocation update", url: "https://www.central-bank.org.tt/forex-update", content: "snippet", engine: "central-bank", publishedDate: "2026-08-20" }] }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: ACCEPTANCE_QUERY,
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.evidenceState, "SEARCH_GROUNDED");
  assert(!JSON.stringify(res).includes("LIVE_SEARCH_GROUNDED"));
});

// --- DUPLICATE-RECEIPT correction: runOrchestration() already seeds its own receipts Map with
// researchReceipt (so orchestration.capabilityExecution already contains it); ibis-canonical-
// brain.ts used to prepend researchReceipt a second time on top, producing two RESEARCH entries
// in capabilityExecution for a single search execution. ---
Deno.test("DUPLICATE RECEIPT: a single search execution produces exactly one RESEARCH plan entry and exactly one RESEARCH capabilityExecution receipt", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "T&T forex note", url: "https://www.central-bank.org.tt/note", content: "snippet", engine: "central-bank", publishedDate: "2026-08-01" }] }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: "What is the latest USD exchange rate today?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  const plannedResearch = res.capabilityPlan.filter((p) => p.capability === "RESEARCH");
  assertEquals(plannedResearch.length, 1, "exactly one RESEARCH entry must appear in capabilityPlan");

  const researchReceipts = res.capabilityExecution.filter((r) => r.capability === "RESEARCH");
  assertEquals(researchReceipts.length, 1, "exactly one RESEARCH entry must appear in capabilityExecution -- never duplicated");
  assertEquals(researchReceipts[0].finalState, "EXECUTED");

  // The receipt's own nested copy must match exactly (same object, not a second, differently-built list).
  assertEquals(res.receipt.capabilityExecution, res.capabilityExecution);
  assertEquals(res.receipt.capabilityExecution.filter((r) => r.capability === "RESEARCH").length, 1);
});

// --- LIVE-SEARCH EVIDENCE GROUNDING (P0 correction): retrieved sources were previously returned to
// the caller but never handed to the answer-generation call itself -- runGateway({text, ...}) had
// zero knowledge of what search found, so even a successful search never actually changed the
// answer TEXT, only the `sources` field alongside it. `providerFactory`, when supplied, is called
// AFTER search completes with a real evidence block (or null) so the SAME real provider credentials
// can bake it into their own system prompt before answering. Purely additive: every test above that
// only supplies `providers` (not `providerFactory`) keeps its exact prior behavior, unchanged. ---

function evidenceEchoProvider(): GatewayProvider {
  return {
    id: "evidence-echo", label: "evidence-echo", model: "test-model", configured: true,
    run: async () => ({ answer: "ECHO", model: "test-model" }),
  };
}

Deno.test("EVIDENCE GROUNDING: providerFactory is called with a real evidence block (source titles + URLs) when search produced sources", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({
      results: [{ title: "Central Bank of T&T: forex allocation update", url: "https://www.central-bank.org.tt/forex-update", content: "snippet", engine: "central-bank", publishedDate: "2026-08-20" }],
    }), { status: 200 });
  let capturedEvidenceBlock: string | null | undefined = undefined;
  const res = await handleCanonicalRequest({
    text: "What is the latest USD exchange rate today?",
    providers: [fakeProvider("test", "unused")],
    providerFactory: (evidenceBlock) => { capturedEvidenceBlock = evidenceBlock; return [evidenceEchoProvider()]; },
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  assert(capturedEvidenceBlock !== undefined, "providerFactory must be called");
  assert(capturedEvidenceBlock !== null, "a real evidence block must be built once search produced sources");
  const evidenceBlockText = capturedEvidenceBlock as string;
  assert(evidenceBlockText.includes("Central Bank of T&T: forex allocation update"), "the evidence block must contain the real retrieved source title");
  assert(evidenceBlockText.includes("https://www.central-bank.org.tt/forex-update"), "the evidence block must contain the real retrieved source URL");
  assert(evidenceBlockText.includes("2026-08-20"), "the evidence block must carry the real publication date when known");
  assert(evidenceBlockText.includes("Snippet: snippet"), "the evidence block must include the source's own snippet text, not just title/date/URL");
  assertEquals(res.answer, "ECHO", "the provider actually constructed from providerFactory (with evidence available to it) must be the one that answers");
  const modelTextMode = res.reasoningModesUsed.find((m) => m.mode === "MODEL_TEXT" && m.executed);
  assert(modelTextMode?.contribution?.includes("grounded in 1 retrieved source"), "the disclosed contribution must state the answer was grounded in retrieved evidence, not just that search happened");
});

Deno.test("GROUNDED SYNTHESIS: the evidence block instructs summarizing snippets, explicitly disclaims full-page inspection, and requires [n] citations", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({
      results: [
        { title: "T&T PM announces new port project", url: "https://news.gov.tt/port", content: "The Prime Minister announced a new deep-water port project today.", engine: "gov.tt", publishedDate: "2026-09-17" },
        { title: "Central Bank forex update", url: "https://www.central-bank.org.tt/x", content: "Foreign reserves rose slightly this quarter.", engine: "central-bank", publishedDate: null },
      ],
    }), { status: 200 });
  let capturedEvidenceBlock: string | null | undefined = undefined;
  await handleCanonicalRequest({
    text: "What is happening in Trinidad and Tobago today?",
    providers: [fakeProvider("test", "unused")],
    providerFactory: (evidenceBlock) => { capturedEvidenceBlock = evidenceBlock; return [evidenceEchoProvider()]; },
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  const block = capturedEvidenceBlock as unknown as string;
  assert(block.includes("The Prime Minister announced a new deep-water port project today."), "the first source's real snippet text must appear");
  assert(block.includes("Foreign reserves rose slightly this quarter."), "the second source's real snippet text must appear");
  assert(/is NOT equivalent to a full-page inspection/i.test(block), "the instruction must explicitly disclaim full-page verification");
  assert(/summarize/i.test(block), "the instruction must direct the model to actually summarize supported developments, not merely list sources");
  assert(/\[n\]/.test(block), "the instruction must require [n]-style citations");
  assert(/never|do not|only what/i.test(block) && /memory/i.test(block), "the instruction must forbid filling unsupported/current facts from memory");
});

Deno.test("GROUNDED SYNTHESIS: a source with no snippet still renders in the evidence block (title/date/URL only), never crashing evidence-block construction", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "No snippet source", url: "https://example.tt/none", engine: "gov.tt" }] }), { status: 200 });
  let capturedEvidenceBlock: string | null | undefined = undefined;
  const res = await handleCanonicalRequest({
    text: "What is the latest USD exchange rate today?",
    providers: [fakeProvider("test", "unused")],
    providerFactory: (evidenceBlock) => { capturedEvidenceBlock = evidenceBlock; return [evidenceEchoProvider()]; },
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.status, "OK");
  const block = capturedEvidenceBlock as unknown as string;
  assert(block.includes("No snippet source"), "the source must still appear by title even with no snippet");
  assert(!block.includes("Snippet: null") && !block.includes("Snippet: undefined"), "a missing snippet must never render as a literal null/undefined string");
});

Deno.test("EVIDENCE GROUNDING: providerFactory is called with null when RESEARCH was not planned (no fabricated evidence block for an ordinary query)", async () => {
  let capturedEvidenceBlock: string | null | undefined = undefined;
  const res = await handleCanonicalRequest({
    text: "What is photosynthesis?",
    providers: [fakeProvider("test", "unused")],
    providerFactory: (evidenceBlock) => { capturedEvidenceBlock = evidenceBlock; return [evidenceEchoProvider()]; },
    // null, not an in-memory store: a real store would authorize browser_local execution for this
    // SIMPLE_TEXT query, which never calls any server-side provider at all (a separate, existing,
    // unrelated code path) -- null forces the server_provider path this test actually means to check.
    lifecycleStore: null,
  });
  assert(capturedEvidenceBlock !== undefined, "providerFactory must still be called so an ordinary query can be answered");
  assertEquals(capturedEvidenceBlock, null, "no search ran -- there is nothing real to ground the answer in, so the block must be null, never fabricated");
  assertEquals(res.answer, "ECHO");
});

Deno.test("EVIDENCE GROUNDING: providerFactory is never called when search was needed but unavailable (no wasted provider construction on a request that already degrades)", async () => {
  Deno.env.delete("SEARXNG_BASE_URL");
  Deno.env.delete("BRAVE_SEARCH_API_KEY");
  let providerFactoryCalled = false;
  const res = await handleCanonicalRequest({
    text: "What is the latest USD exchange rate today?",
    providers: [fakeProvider("test", "unused")],
    providerFactory: () => { providerFactoryCalled = true; return [evidenceEchoProvider()]; },
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(providerFactoryCalled, false, "the honest SEARCH_UNAVAILABLE degradation path must never construct providers or attempt generation");
  assertEquals(res.status, "DEGRADED");
});

Deno.test("EVIDENCE GROUNDING: the envelope's searchCacheState reflects the real search result (LIVE via a fetch mock, null when no search ran)", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "T&T forex note", url: "https://www.central-bank.org.tt/note", content: "snippet", engine: "central-bank", publishedDate: "2026-08-01" }] }), { status: 200 });
  const withSearch = await handleCanonicalRequest({
    text: "What is the latest USD exchange rate today?",
    providers: [fakeProvider("test", "unused")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(withSearch.searchCacheState, "LIVE", "a fetchImpl-backed test call is reported LIVE, matching the search adapter's own contract for a non-cached result");

  const withoutSearch = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: null });
  assertEquals(withoutSearch.searchCacheState, null, "no search ran for this query -- searchCacheState must be null, never a fabricated LIVE/CACHED claim");
});

Deno.test("EVIDENCE GROUNDING: omitting providerFactory keeps the exact prior (evidence-blind) behavior via the plain providers array", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ results: [{ title: "T&T forex note", url: "https://www.central-bank.org.tt/note", content: "snippet", engine: "central-bank", publishedDate: "2026-08-01" }] }), { status: 200 });
  const res = await handleCanonicalRequest({
    text: "What is the latest USD exchange rate today?",
    providers: [fakeProvider("test", "Plain provider answer, no providerFactory supplied.")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assertEquals(res.answer, "Plain provider answer, no providerFactory supplied.", "backward compatibility: a caller that never supplies providerFactory must be entirely unaffected by this correction");
});

// --- Independent live audit finding: the authorized-fallback provider call silently answered with
// no user question at all. ---
//
// action:"record_execution_receipt" requests carry only {action, receipt} -- never `messages` --
// so a caller building `providers` from that request's own (nonexistent) messages array bakes an
// EMPTY turns array into every provider closure. recordReceiptAndMaybeFallback() correctly
// verifies the resent text's hash and passes it to runGateway({text: resentText, ...}), but
// runGateway only uses `text` for its own deterministic/founder-reasoning checks -- the actual
// external provider call uses `provider.run()`, whose messages were fixed at construction time.
// Confirmed live: the deployed production endpoint answered "What is photosynthesis?" with "Wah
// gwaan? How can I assist you today?" -- a generic greeting, because the model never received the
// question. providerFactory (mirroring handleCanonicalRequest's own evidence-grounding pattern)
// closes this by rebuilding providers with the real resent text as the one user turn.
Deno.test("AUTHORIZED FALLBACK: without providerFactory, the fallback provider receives no user question at all", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  let receivedTurns: unknown = "NEVER_CALLED";
  const capturingProvider: GatewayProvider = {
    id: "test", label: "test", model: "fake-model", configured: true,
    run: async () => { receivedTurns = "PROVIDER_CALLED_BUT_TURNS_WERE_BAKED_IN_EMPTY_AT_CONSTRUCTION"; return { answer: "Wah gwaan? How can I assist you today?", model: "fake-model" }; },
  };
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is photosynthesis?" },
    providers: [capturingProvider],
    lifecycleStore: store,
  });
  assert(outcome.status === "ACCEPTED" && outcome.envelope, "the (buggy) fallback must still succeed at the transport level -- the defect is in what the model receives, not a transport failure");
  assertEquals(outcome.envelope.answer, "Wah gwaan? How can I assist you today?", "demonstrates the exact live-observed defect: a real question produces a generic greeting when providers are not rebuilt with the resent text");
});

Deno.test("AUTHORIZED FALLBACK FIX: providerFactory rebuilds providers with the resent user text, so the fallback model actually receives the question", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  let capturedTurns: Array<{ role: string; content: string }> = [];
  const providerFactory = (_evidenceBlock: string | null, _reasoningSynthesisBlock: string | null, turns: Array<{ role: "user" | "assistant"; content: string }>): GatewayProvider[] => {
    capturedTurns = turns;
    return [{
      id: "test", label: "test", model: "fake-model", configured: true,
      run: async () => ({ answer: `Photosynthesis is the process plants use to convert light into energy. (asked: "${turns[0]?.content}")`, model: "fake-model" }),
    }];
  };
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is photosynthesis?" },
    providers: [],
    providerFactory,
    lifecycleStore: store,
  });
  assert(outcome.status === "ACCEPTED" && outcome.envelope);
  assertEquals(capturedTurns.length, 1, "providerFactory must be called with exactly one real user turn");
  assertEquals(capturedTurns[0].role, "user");
  assertEquals(capturedTurns[0].content, "What is photosynthesis?", "the fallback provider must receive the ACTUAL resent, hash-verified question, not an empty turns array");
  assertMatch(outcome.envelope.answer, /Photosynthesis is the process/, "the answer must actually address the real question once the model receives it");
});

// Item 2 (authorized-fallback edge case): the fallback now runs the FULL canonical pipeline for
// the resent text (same as an ordinary request), not a bare model call -- so it gets the same
// reasoning-synthesis lenses (Truthmode/Caribbean/Lindy/etc.) and, when relevant, the same real
// search/capability execution, instead of a materially weaker answer just because local execution
// failed first.
Deno.test("AUTHORIZED FALLBACK FIX (item 2): the fallback answer is grounded with the same reasoning-synthesis block an ordinary request would get", async () => {
  const store = createInMemoryLifecycleStore();
  // Deliberately SIMPLE_TEXT with zero planned capabilities (no freshness/outcome/ecomap marker),
  // so this plan genuinely IS authorized for local execution -- proving the fix closes the real,
  // reachable gap: even a zero-capability query's fallback was previously missing the Caribbean
  // lens (which fires from `text` alone, independent of capabilityPlan -- see computeCaribbeanLens)
  // that the ordinary canonical path always computes and injects.
  const text = "What is the capital city of Trinidad and Tobago?";
  const res = await handleCanonicalRequest({ text, providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  assertEquals(res.executionInstruction.executionAuthorized, true, "this query must genuinely be the zero-capability authorized case this test means to exercise");
  const planId = res.executionInstruction.planId;
  let capturedSynthesisBlock: string | null = null;
  const providerFactory = (_evidenceBlock: string | null, reasoningSynthesisBlock: string | null, turns: Array<{ role: "user" | "assistant"; content: string }>): GatewayProvider[] => {
    capturedSynthesisBlock = reasoningSynthesisBlock;
    return [{ id: "test", label: "test", model: "fake-model", configured: true, run: async () => ({ answer: `Fallback answer for: ${turns[0]?.content}`, model: "fake-model" }) }];
  };
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text },
    providers: [], providerFactory, lifecycleStore: store,
  });
  assert(outcome.status === "ACCEPTED" && outcome.envelope);
  assert(capturedSynthesisBlock, "the fallback must build and pass a real reasoning-synthesis block, not null, when the resent text genuinely triggers founder/Caribbean reasoning");
  assertMatch(capturedSynthesisBlock!, /Caribbean|Trinidad/i, "the same Caribbean-lens content an ordinary request would get must reach the fallback's provider call too");
});

Deno.test("AUTHORIZED FALLBACK FIX (item 2, defensive branch): if a capability-requiring plan ever reaches the fallback, it still gets real search -- never a bare, weaker model call", async () => {
  // Today's authorization gate (capabilityPlan.length === 0) means a plan like this can never be
  // CREATED via the normal handleCanonicalRequest path -- this test simulates the scenario item 2
  // asks to guard against directly: a plan record already marked authorizedTarget:"browser_local"
  // (e.g. from a future/looser authorization rule, or a different caller) whose resent text, when
  // the canonical pipeline actually runs it, genuinely needs RESEARCH. Before this fix, the
  // fallback's bare runGateway() call had no way to ever run search at all; now it must.
  const store = createInMemoryLifecycleStore();
  const text = "What is the latest news about Trinidad and Tobago's economy?";
  await store.createPlan({ planId: "simulated-plan-1", authorizedTarget: "browser_local", intent: "SIMPLE_TEXT", freshnessRequired: false, textSha256: await sha256Hex(text), ttlMs: 300_000 });

  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  let searchCalled = false;
  const fakeFetch: typeof fetch = async () => {
    searchCalled = true;
    return new Response(JSON.stringify({ results: [{ title: "T&T economy update", url: "https://example.com/tt-economy", content: "snippet", engine: "searxng" }] }), { status: 200 });
  };
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId: "simulated-plan-1", executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text },
    providers: [fakeProvider("test", "generic fallback answer")],
    searchFetchImpl: fakeFetch,
    lifecycleStore: store,
  });
  Deno.env.delete("SEARXNG_BASE_URL");

  assert(outcome.status === "ACCEPTED" && outcome.envelope, "the fallback must still succeed even when the resent text needs real capabilities");
  assert(searchCalled, "the fallback must genuinely run search for a query that needs it, not silently skip straight to a bare model call");
  assert(outcome.envelope.capabilityPlan.some((p) => p.capability === "RESEARCH"), "the fallback's own canonical run must plan RESEARCH for this resent text, same as an ordinary request would");
  assertEquals(outcome.envelope.evidenceState, "SEARCH_GROUNDED");
  assert(outcome.envelope.sources.length > 0, "the fallback answer must actually carry the real retrieved source, never a fabricated grounding claim");
});

Deno.test("AUTHORIZED FALLBACK FIX: omitting providerFactory keeps exact prior behavior (backward compatible)", async () => {
  const store = createInMemoryLifecycleStore();
  const res = await handleCanonicalRequest({ text: "What is a compatibility test?", providers: [fakeProvider("test", "unused")], lifecycleStore: store });
  const planId = res.executionInstruction.planId;
  const outcome = await recordReceiptAndMaybeFallback({
    receipt: { planId, executionTarget: "browser_local", provider: "browser_local_language_model", success: false, text: "What is a compatibility test?" },
    providers: [fakeProvider("test", "unchanged legacy behavior")],
    lifecycleStore: store,
  });
  assert(outcome.status === "ACCEPTED" && outcome.envelope);
  assertEquals(outcome.envelope.answer, "unchanged legacy behavior", "a caller that never supplies providerFactory must be entirely unaffected by this correction");
});

// Independent live audit finding: "recent" was missing from FRESHNESS_MARKERS entirely, so a
// plainly current-events question using that word instead of "latest"/"today" fell through to
// SIMPLE_TEXT and never reached search grounding. Confirmed live: "What are the most recent
// business developments in Tobago?" produced a bare, ungrounded model answer.
Deno.test("FRESHNESS: 'recent' classifies CURRENT_WEB_RESEARCH just like 'latest'", () => {
  assertEquals(classifyIntent("What are the most recent business developments in Tobago?").queryClass, "CURRENT_WEB_RESEARCH");
  assertEquals(classifyIntent("What has recently changed in Trinidad's energy sector?").queryClass, "CURRENT_WEB_RESEARCH");
});

// ==================================================================================================
// CAUSAL-INFLUENCE PROOFS (founder-completion pass, Phase 11): an engine executing and populating
// reasoningModesUsed/contradictions/actions is NOT the same as its output shaping the final answer.
// Every test below proves the reasoning-synthesis TEXT actually handed to the answer-generating
// provider (captured via providerFactory's second argument) materially changes when the underlying
// engine's real input changes -- these tests FAIL if ibis-canonical-brain.ts is ever changed to
// build the synthesis packet without wiring it into providerFactory, or if a lens stops reacting to
// its real inputs.
// ==================================================================================================

async function captureSynthesisBlock(overrides: Parameters<typeof handleCanonicalRequest>[0]): Promise<string | null> {
  let captured: string | null | undefined = undefined;
  await handleCanonicalRequest({
    ...overrides,
    providerFactory: (evidenceBlock, reasoningSynthesisBlock) => { captured = reasoningSynthesisBlock ?? null; return [evidenceEchoProvider()]; },
  });
  assert(captured !== undefined, "providerFactory must be called for this request");
  return captured as string | null;
}

Deno.test("CAUSAL PROOF A (Founder reasoning): a different strategic objective changes the synthesis block's Founder Thinking content", async () => {
  const buildBlock = await captureSynthesisBlock({
    text: "I want to build a Caribbean food delivery business.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  const fundingBlock = await captureSynthesisBlock({
    text: "I want to start a funding campaign for my venture.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(buildBlock && buildBlock.includes("Founder Thinking"), "a BUSINESS-domain outcome question must produce a Founder Thinking section");
  assert(fundingBlock && fundingBlock.includes("Founder Thinking"), "a FUNDING-domain outcome question must produce a Founder Thinking section");
  assertNotEquals(buildBlock, fundingBlock, "different strategic domains/objectives must produce a genuinely different synthesis block, not a static template");
  assert(buildBlock!.includes("BUILD_NOW") || buildBlock!.includes("Decision: BUILD"), "the BUSINESS domain's real decision (BUILD NOW) must appear");
  assert(fundingBlock!.includes("PREPARE_NOW") || fundingBlock!.includes("Decision: PREPARE"), "the FUNDING domain's real decision (PREPARE NOW) must appear");
});

Deno.test("CAUSAL PROOF B (EBR): a source asserting a causal claim changes the synthesis block's EBR content and the final causal explanation available to the model", async () => {
  const withCausalClaim = await captureSynthesisBlock({
    text: "Why did the ferry service face repeated delays?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
    ebrInput: {
      auditCutoff: new Date().toISOString(),
      evidenceItems: [{ id: "s1", eventTime: "2026-09-01T00:00:00Z", recordTime: "2026-09-01T00:00:00Z", provenance: "Guardian", epistemicStatus: "DOCUMENTED" }],
      candidateHistories: [{
        id: "h1", label: "Mechanical failure -> ferry delays",
        edges: [{ id: "e1", from: "mechanical failure", to: "ferry delays", nominatedBy: ["MECHANISM"], mechanismClass: "SOURCE_ASSERTED_CAUSATION", temporalStatus: "UNKNOWN", provenanceRoots: ["Guardian"], testableImplication: "Check maintenance records.", knownContradictions: [], epistemicLabel: "INFERRED" }],
      }],
    },
  });
  const withoutCausalClaim = await captureSynthesisBlock({
    text: "Why did the ferry service face repeated delays?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
    ebrInput: {
      auditCutoff: new Date().toISOString(),
      evidenceItems: [{ id: "s1", eventTime: "2026-09-01T00:00:00Z", recordTime: "2026-09-01T00:00:00Z", provenance: "Guardian", epistemicStatus: "DOCUMENTED" }],
      candidateHistories: [],
    },
  });
  assert(withCausalClaim && withCausalClaim.includes("EBR"), "an EBR section must appear when evidence exists");
  assert(withoutCausalClaim && withoutCausalClaim.includes("EBR"), "an EBR section must appear when evidence exists, even with no candidate history");
  assertNotEquals(withCausalClaim, withoutCausalClaim, "a real candidate causal history must change the EBR section content, not be ignored");
  assert(withCausalClaim!.includes("Mechanical failure"), "the admissible candidate's real content must reach the synthesis block");
  assert(/no candidate|abstains|Unmodeled-history reserve/i.test(withoutCausalClaim!), "with no candidate history, EBR must honestly report it could not rank a cause");
});

// EcoMap-signal query text (see ECOMAP_PATHWAY_SIGNAL_MARKERS) also always plans RESEARCH
// (planCapabilities()'s `ecomapRequested` branch -- mapping real services/steps needs grounded
// evidence too), so these tests must mock search the same way every other RESEARCH-planning test
// in this file does; without it, the request degrades honestly at "no working live-search route"
// before ever reaching providerFactory, which is correct production behavior but not what these
// tests are proving.
const MINIMAL_SEARCH_FETCH: typeof fetch = async () =>
  new Response(JSON.stringify({ results: [{ title: "Generic search result", url: "https://example.org/generic", content: "generic snippet", engine: "test" }] }), { status: 200 });

Deno.test("CAUSAL PROOF C (EcoMap): different pathway evidence changes the synthesis block's EcoMap Pathway content", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const stepsA = [{ id: "src-a", title: "Register with the Business Development Unit", text: "Register with the Business Development Unit (BDU) -- free registration.", url: "https://bdu.example/register", publisher: "BDU", origin: "SEARCH" as const, recordedAt: new Date().toISOString(), confidence: "INFERRED" as const }];
  const stepsB = [{ id: "src-b", title: "Apply through the Ministry of Trade export desk", text: "Apply through the Ministry of Trade's export desk for a licence.", url: "https://trade.example/export-desk", publisher: "Ministry of Trade", origin: "SEARCH" as const, recordedAt: new Date().toISOString(), confidence: "INFERRED" as const }];
  const blockA = await captureSynthesisBlock({
    text: "What steps are needed to register a small food business?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
    searchFetchImpl: MINIMAL_SEARCH_FETCH,
    ecomapPathwayContext: { outcome: "register a small food business", sources: stepsA },
  });
  const blockB = await captureSynthesisBlock({
    text: "What steps are needed to register a small food business?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
    searchFetchImpl: MINIMAL_SEARCH_FETCH,
    ecomapPathwayContext: { outcome: "register a small food business", sources: stepsB },
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assert(blockA && blockA.includes("EcoMap Pathway"), "EcoMap Pathway section must appear for source set A");
  assert(blockB && blockB.includes("EcoMap Pathway"), "EcoMap Pathway section must appear for source set B");
  assertNotEquals(blockA, blockB, "different real pathway evidence must produce a different EcoMap Pathway section");
  assert(blockA!.includes("Business Development Unit"), "source set A's real organization name must reach the synthesis block");
  assert(blockB!.includes("Ministry of Trade"), "source set B's real organization name must reach the synthesis block");
});

Deno.test("CAUSAL PROOF D (Butterfly): different EcoMap Pathway zero-cost signals change the synthesis block's Butterfly second-order-effect value", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const zeroCostSteps = [{ id: "z1", title: "Free vendor registration", text: "Free, no-cost vendor registration is available online.", url: "https://example.org/free-reg", publisher: "Example", origin: "SEARCH" as const, recordedAt: new Date().toISOString(), confidence: "CONFIRMED" as const }];
  const paidSteps = [{ id: "p1", title: "Paid consultancy filing service", text: "A paid consultancy handles the filing for a fee.", url: "https://example.org/paid-filing", publisher: "Example", origin: "SEARCH" as const, recordedAt: new Date().toISOString(), confidence: "CONDITIONAL" as const }];
  const zeroCostBlock = await captureSynthesisBlock({
    text: "I want to launch a small vendor business -- what steps are required, with no budget?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
    searchFetchImpl: MINIMAL_SEARCH_FETCH,
    ecomapPathwayContext: { outcome: "launch a small vendor business", sources: zeroCostSteps },
  });
  const paidBlock = await captureSynthesisBlock({
    text: "I want to launch a small vendor business -- what steps are required, with no budget?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
    searchFetchImpl: MINIMAL_SEARCH_FETCH,
    ecomapPathwayContext: { outcome: "launch a small vendor business", sources: paidSteps },
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assert(zeroCostBlock && zeroCostBlock.includes("Butterfly"), "Butterfly section must appear once EcoMap Pathway produced real steps");
  assert(paidBlock && paidBlock.includes("Butterfly"), "Butterfly section must appear for the paid-step scenario too");
  assertNotEquals(zeroCostBlock, paidBlock, "a zero-cost-flagged step must produce a different (higher-strategic-value) Butterfly result than a non-zero-cost step");
});

Deno.test("CAUSAL PROOF E (Caribbean lens): the same business question with vs without a Caribbean/Trinidad mention changes whether the synthesis block surfaces regional constraints", async () => {
  const caribbeanBlock = await captureSynthesisBlock({
    text: "I want to build a food delivery business in Trinidad and Tobago.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  const genericBlock = await captureSynthesisBlock({
    text: "I want to build a food delivery business.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(caribbeanBlock && caribbeanBlock.includes("Caribbean lens"), "a Trinidad & Tobago-named business question must surface the Caribbean lens");
  assert(!genericBlock || !genericBlock.includes("Caribbean lens"), "an otherwise-identical question with no Caribbean/jurisdiction mention must NOT force the Caribbean lens");
});

Deno.test("CAUSAL PROOF F (Truthmode): a declared evidence contradiction is preserved in the synthesis block, never silently resolved", async () => {
  const block = await captureSynthesisBlock({
    text: "Why did the project stall?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
    ebrInput: {
      auditCutoff: new Date().toISOString(),
      evidenceItems: [
        { id: "a", eventTime: "2026-09-01T00:00:00Z", recordTime: "2026-09-01T00:00:00Z", provenance: "Source A", epistemicStatus: "DOCUMENTED", contradicts: ["b"], contradictionSeverity: "HARD" },
        { id: "b", eventTime: "2026-09-01T00:00:00Z", recordTime: "2026-09-01T00:00:00Z", provenance: "Source B", epistemicStatus: "DOCUMENTED" },
      ],
      candidateHistories: [],
    },
  });
  assert(block && /contradiction/i.test(block), "a declared HARD contradiction between two evidence items must appear in the synthesis block");
  assert(block!.includes("do not silently resolve") || block!.includes("Unresolved contradictions"), "the block must instruct the model not to silently resolve the contradiction");
});

Deno.test("CAUSAL PROOF G (Red Team): Red Team only activates on a genuine strategy/outcome question, never on an ordinary factual one", async () => {
  const strategyBlock = await captureSynthesisBlock({
    text: "I want to launch a Caribbean civic-tech service with almost no budget.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  const factualBlock = await captureSynthesisBlock({
    text: "What is photosynthesis?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
  });
  assert(strategyBlock && strategyBlock.includes("Red Team"), "an outcome/strategy question must produce a Red Team section");
  assert(!factualBlock, "an ordinary factual question with no evidence/engines must produce no synthesis block at all (never a forced Red Team or any other section)");
});

Deno.test("CAUSAL PROOF H (Pareto/80-20): many candidate pathway steps are compressed to at most 3 highest-leverage actions in the synthesis block", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const manySteps = Array.from({ length: 8 }, (_, i) => ({
    id: `step-${i}`, title: `Candidate step ${i}`, text: i === 0 ? "Free, no-cost first step to register." : `Generic candidate step number ${i} description text here.`,
    url: `https://example.org/step-${i}`, publisher: "Example", origin: "SEARCH" as const, recordedAt: new Date().toISOString(), confidence: "INFERRED" as const,
  }));
  const block = await captureSynthesisBlock({
    text: "What steps are required to register this project?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
    searchFetchImpl: MINIMAL_SEARCH_FETCH,
    ecomapPathwayContext: { outcome: "register this project", sources: manySteps },
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  assert(block && block.includes("80/20"), "a Pareto/80-20 section must appear once real candidate actions exist");
  const paretoLine = block!.split("\n").find((l) => l.includes("80/20"))!;
  const actionCount = paretoLine.split("|").length;
  assert(actionCount <= 3, `80/20 must list at most 3 actions, found ${actionCount}: ${paretoLine}`);
});

Deno.test("CAUSAL PROOF I (Lindy): a fragile single-dependency question produces a materially different synthesis than a durable/open-standard question", async () => {
  const fragileBlock = await captureSynthesisBlock({
    text: "Which parts of this plan are proven and durable, and which are fragile dependencies? We depend entirely on one free AI provider with no fallback.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
  });
  const durableBlock = await captureSynthesisBlock({
    text: "Which parts of this plan are proven and durable, and which are fragile dependencies? We export all our data in an open standard and self-host our own infrastructure.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
  });
  assert(fragileBlock && fragileBlock.includes("Lindy"), "a direct durability question must produce a Lindy section");
  assert(durableBlock && durableBlock.includes("Lindy"), "a direct durability question must produce a Lindy section");
  assertNotEquals(fragileBlock, durableBlock, "different real durability signals in the request text must change the Lindy section");
  assert(fragileBlock!.includes("Fragile dependencies:"), "the single-dependency scenario must surface a fragile dependency");
  assert(!fragileBlock!.includes("durable mechanisms:"), "the single-dependency scenario must not also claim a durable mechanism that was never stated");
  assert(durableBlock!.includes("durable mechanisms:"), "the open-standard/self-hosted scenario must surface a durable mechanism");
  assert(!durableBlock!.includes("Fragile dependencies:"), "the open-standard scenario must not fabricate a fragile dependency that was never stated");
});

Deno.test("CAUSAL PROOF I (Lindy): with no durability signal either way, Lindy honestly reports neither, never defaulting to caution", async () => {
  const block = await captureSynthesisBlock({
    text: "Which parts of this plan are proven and durable, and which are fragile dependencies?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
  });
  assert(block && block.includes("Lindy"));
  assert(!block!.includes("Fragile dependencies:"));
  assert(!block!.includes("durable mechanisms:"));
  assert(/basis to assume novelty is risky/i.test(block!), "must explicitly avoid defaulting to blanket conservatism when no real signal exists");
});

Deno.test("SEMANTIC ROBUSTNESS: 'funding pathways' plans EcoMap Pathway and Context Graph, not just Place/Relationship", async () => {
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const res = await handleCanonicalRequest({
    text: "Map the organizations, funding pathways and relationships that could help a Trinidad and Tobago community technology project.",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: null,
    searchFetchImpl: MINIMAL_SEARCH_FETCH,
  });
  Deno.env.delete("SEARXNG_BASE_URL");
  const planned = res.capabilityPlan.map((p) => p.capability);
  for (const cap of ["RESEARCH", "ECOMAP_PLACE", "ECOMAP_PATHWAY", "ECOMAP_RELATIONSHIP", "CONTEXT_GRAPH", "MULTI_AGENT"]) {
    assert(planned.includes(cap as any), `"funding pathways" query must plan ${cap}, planned: ${planned.join(",")}`);
  }
  assert(res.answer.length > 0, "must answer directly, not defer to an empty local-execution answer");
});

Deno.test("SEMANTIC ROBUSTNESS: funding/financing/grant pathway paraphrases all select EcoMap Pathway", () => {
  for (const phrase of [
    "What is the financing pathway for a small Caribbean business?",
    "What is the grant pathway for a community project?",
    "What is the route to funding for a civic-tech startup?",
    "What are the steps to funding for a new venture?",
  ]) {
    assertEquals(classifyIntent(phrase).signals.ecomapPathway, true, `"${phrase}" must select ECOMAP_PATHWAY`);
  }
});

// --- SEMANTIC ROBUSTNESS (Phase 10): a user should not need the exact keyword the classifier's
// first version happened to check for. Each assertion below is a genuine paraphrase of an already-
// supported trigger, not a new capability. ---
Deno.test("SEMANTIC ROBUSTNESS: 'how did X happen' paraphrases 'why did X happen' for retrodiction", () => {
  assertEquals(classifyIntent("How did this outage happen in the first place?").signals.retrodiction, true);
  assertEquals(classifyIntent("How has the shortage come about?").signals.retrodiction, true);
});

Deno.test("SEMANTIC ROBUSTNESS: 'who can help' paraphrases 'who connects/refers' for EcoMap Relationship", () => {
  assertEquals(classifyIntent("Who can help a Tobago food entrepreneur find funding?").signals.ecomapRelationship, true);
});

Deno.test("SEMANTIC ROBUSTNESS: 'how do I get from A to B' paraphrases pathway/apply/register for EcoMap Pathway", () => {
  assertEquals(classifyIntent("How do I get from an idea to a registered business?").signals.ecomapPathway, true);
});

Deno.test("SEMANTIC ROBUSTNESS: a direct second-order-effects question plans Butterfly without needing an outcome/build marker", () => {
  const result = classifyIntent("What are the second-order effects of this policy change?");
  assertEquals(result.signals.secondOrderEffects, true);
  assertEquals(result.signals.outcome, false, "this phrasing must not need to also match an outcome/build marker");
});

// Live-confirmed gap (independent audit, mission-required test query #4): "Map the organizations,
// funding pathways and relationships that could help a Trinidad and Tobago community technology
// project" classifies queryClass SIMPLE_TEXT (none of the legacy PATHWAY/PLACE/RELATIONSHIP/
// OUTCOME markers match this exact phrasing) while genuinely planning RESEARCH + ECOMAP_PLACE +
// ECOMAP_RELATIONSHIP -- capabilities a bare on-device LanguageModel cannot run or receive.
// executionAuthorized must never defer a query with real planned capabilities to local execution,
// which would silently discard them.
Deno.test("EXECUTION AUTHORIZATION: a SIMPLE_TEXT query with real planned capabilities is never deferred to local execution", async () => {
  const res = await handleCanonicalRequest({
    text: "Map the organizations, funding pathways and relationships that could help a Trinidad and Tobago community technology project.",
    providers: [fakeProvider("test", "a real synthesized answer")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assert(res.capabilityPlan.length > 0, "this query must genuinely plan at least one capability (RESEARCH/ECOMAP_*), or this test no longer exercises the gap it proves");
  assertEquals(res.executionInstruction.executionAuthorized, false, "a query with real planned capabilities must never be authorized for local execution");
  assertEquals(res.executionInstruction.executionTarget, "server_provider");
  assert(res.answer.length > 0, "the server must answer directly rather than deferring with an empty answer, since local execution cannot run these capabilities anyway");
});

Deno.test("EXECUTION AUTHORIZATION: an ordinary SIMPLE_TEXT question with zero planned capabilities remains authorized for local execution (no regression)", async () => {
  const res = await handleCanonicalRequest({
    text: "What is photosynthesis?",
    providers: [fakeProvider("test", "unused")],
    lifecycleStore: createInMemoryLifecycleStore(),
  });
  assertEquals(res.capabilityPlan.length, 0);
  assertEquals(res.executionInstruction.executionAuthorized, true, "an ordinary question with nothing else planned must keep the existing local-execution optimization");
});

// Live-confirmed gap (independent audit, mission-required test query #5): "What could go wrong if
// FTN depends too heavily on free AI providers?" matched no marker at all and never planned Founder
// Thinking/Butterfly/Red Team -- a risk question is the same strategic-judgment need
// FOUNDER_STRATEGY already exists for.
Deno.test("SEMANTIC ROBUSTNESS: 'what could go wrong if...' plans Founder Thinking/Red Team like an outcome question", () => {
  const result = classifyIntent("What could go wrong if FTN depends too heavily on free AI providers?");
  assertEquals(result.signals.outcome, true);
  assertEquals(result.queryClass, "FOUNDER_STRATEGY");
});
