// FTN Platform — canonical IBIS brain contract/behavioral tests. Run with:
//   deno test --allow-env supabase/functions/_shared/ibis-canonical-brain.test.ts
// No live network calls: every provider/search call in these tests is a local fake.
import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCanonicalRequest } from "./ibis-canonical-brain.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { searxngSearch } from "./ibis-search-adapter.ts";
import type { GatewayProvider } from "./ibis-intelligence-gateway.ts";

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
Deno.test("simple question classifies SIMPLE_TEXT and answers through the gateway", async () => {
  const res = await handleCanonicalRequest({ text: "What is photosynthesis?", providers: [fakeProvider("test", "Photosynthesis converts light into chemical energy.")] });
  assertEquals(res.queryClass, "SIMPLE_TEXT");
  assertMatch(res.answer, /Photosynthesis converts light/);
  assertEquals(res.status, "OK");
  assert(res.receipt.capabilitiesAttempted.includes("TEXT"));
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
Deno.test("outcome question classifies FOUNDER_STRATEGY and lists deeper modes as unavailable, not executed", async () => {
  const res = await handleCanonicalRequest({
    text: "I want to build a Caribbean-owned business that earns US dollars while helping local creators.",
    providers: [fakeProvider("test", "Decision: EXPERIMENT")],
  });
  assertEquals(res.queryClass, "FOUNDER_STRATEGY");
  assert(res.objective && res.objective.length > 0, "an outcome question must extract an objective string");
  const founderMode = res.reasoningModesUsed.find((m) => m.mode === "FOUNDER_COGNITIVE_LAYER");
  assert(founderMode, "FOUNDER_COGNITIVE_LAYER must be listed even when unavailable");
  assertEquals(founderMode!.executed, false);
  assertMatch(founderMode!.unavailableReason || "", /not yet ported/);
});

// --- Gate: correlation must never be silently upgraded to causation language. ---
Deno.test("correlation-flavored question with a live-data term still routes to research, never a guessed correlation claim", () => {
  // No CORRELATION marker exists yet in the server-side classifier (see the honesty note in
  // ibis-canonical-brain.ts: CORRELATION/PREDICTION are listed as unavailable modes, not
  // implemented ones). This question also contains "exchange rate", a genuine freshness marker,
  // so it correctly routes to CURRENT_WEB_RESEARCH rather than being answered from model memory
  // as if a correlation had already been established -- the honest behavior available today.
  const result = classifyIntent("Is there a correlation between remittances and the exchange rate?");
  assertEquals(result.queryClass, "CURRENT_WEB_RESEARCH");
});

// --- Gate: provider outage falls to the gateway's real rules-based founder-reasoning fallback,
// honestly labeled -- this is the gateway's actual designed behavior (ibis-intelligence-gateway.ts
// founderReasoningAnswer), not a bug; the deeper full-DEGRADED path only triggers when even that
// deterministic fallback has nothing to work with (see the next test). ---
Deno.test("unconfigured providers fall to the rules-based founder-reasoning fallback, honestly labeled", async () => {
  const res = await handleCanonicalRequest({
    text: "What is the capital of Trinidad and Tobago?",
    providers: [fakeProvider("a", "unused", { configured: false })],
  });
  assertEquals(res.status, "OK");
  const founderFallback = res.reasoningModesUsed.find((m) => m.mode === "FOUNDER_REASONING_RULES_FALLBACK");
  assert(founderFallback && founderFallback.executed, "the real deterministic fallback must be reported as executed, distinct from the deeper unported FOUNDER_COGNITIVE_LAYER");
});

// --- Gate: true provider exhaustion (deterministic fallback also has nothing to work with)
// degrades to DEGRADED, never fabricates an answer. ---
Deno.test("full provider exhaustion with no fallback degrades to DEGRADED, never fabricates an answer", async () => {
  const res = await handleCanonicalRequest({
    text: "x",
    providers: [fakeProvider("a", "unused", { configured: false })],
  });
  assertEquals(res.receipt.degradedStages.includes("ALL_TEXT_PROVIDERS_FAILED"), true);
  assertMatch(res.answer, /could not reach an answer provider/i);
});

Deno.test("response envelope never contains a literal API key/token/secret substring", async () => {
  const res = await handleCanonicalRequest({ text: "hello", providers: [fakeProvider("test", "Good day.")] });
  const serialized = JSON.stringify(res);
  assert(!/sk-[a-zA-Z0-9]{10,}/.test(serialized), "no OpenAI-style key pattern in response");
  assert(!/AIza[0-9A-Za-z_-]{10,}/.test(serialized), "no Google API key pattern in response");
});

Deno.test("empty text is rejected without attempting any provider", async () => {
  const res = await handleCanonicalRequest({ text: "   ", providers: [fakeProvider("test", "unused")] });
  assertEquals(res.status, "UNAVAILABLE");
  assertEquals(res.receipt.capabilitiesAttempted.length, 0);
});
