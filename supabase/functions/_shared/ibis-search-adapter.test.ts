// FTN Platform -- zero-cost search controls (cache/dedup/budget), live-search P0 correction.
//
// These tests exercise search()'s REAL cache/dedup/budget path, which only activates when no
// `fetchImpl` override is supplied (every OTHER test in this repo that calls search()/
// handleCanonicalRequest() injects a fetchImpl double and is completely unaffected by this layer --
// see ibis-search-adapter.ts's search() header comment). To exercise the real path deterministically
// without a live network call, these tests monkey-patch globalThis.fetch for their own duration and
// always restore it afterward, and call resetSearchControlsForTests() first so no cache/budget
// state leaks between tests (module-level state is process-wide within one Deno test run).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { search, resetSearchControlsForTests } from "./ibis-search-adapter.ts";

function withPatchedFetch<T>(impl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return run().finally(() => { globalThis.fetch = original; });
}

function braveResponse(title: string): Response {
  return new Response(JSON.stringify({ web: { results: [{ title, url: `https://example.com/${encodeURIComponent(title)}`, description: "snippet", meta_url: { hostname: "example.com" } }] } }), { status: 200 });
}

function clearSearchEnv() {
  for (const key of ["SEARXNG_BASE_URL", "BRAVE_SEARCH_API_KEY", "IBIS_SEARCH_CACHE_TTL_MS", "IBIS_SEARCH_DAILY_BUDGET_BRAVE_SEARCH", "IBIS_SEARCH_MONTHLY_BUDGET_BRAVE_SEARCH"]) {
    Deno.env.delete(key);
  }
}

Deno.test("CACHE: a second identical query within the TTL window is served from cache, without a second network call", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  let fetchCalls = 0;
  await withPatchedFetch(async () => { fetchCalls++; return braveResponse("Cache test result"); }, async () => {
    const first = await search("cache test query");
    assertEquals(first.status, "OK");
    assert(first.status === "OK" && first.cacheState === "LIVE", "the first real call must be reported LIVE");
    const second = await search("cache test query");
    assertEquals(second.status, "OK");
    assert(second.status === "OK" && second.cacheState === "CACHED", "a repeat query within the TTL must be reported CACHED");
  });
  assertEquals(fetchCalls, 1, "only one real network call may occur for two identical queries within the cache TTL");
  clearSearchEnv();
});

Deno.test("CACHE: a query is case/whitespace-insensitively normalized for cache purposes, but a genuinely different query is never served from another query's cache", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  let fetchCalls = 0;
  await withPatchedFetch(async () => { fetchCalls++; return braveResponse("Normalized cache result"); }, async () => {
    await search("  Tobago   Funding  ");
    await search("tobago funding");
    await search("a completely different query");
  });
  assertEquals(fetchCalls, 2, "the two differently-whitespaced/cased forms of the same query must share one cache entry; the unrelated query must not");
  clearSearchEnv();
});

Deno.test("CACHE: an expired cache entry (TTL elapsed) triggers a fresh real network call", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  Deno.env.set("IBIS_SEARCH_CACHE_TTL_MS", "10");
  let fetchCalls = 0;
  await withPatchedFetch(async () => { fetchCalls++; return braveResponse("TTL test result"); }, async () => {
    const first = await search("ttl expiry query");
    assert(first.status === "OK" && first.cacheState === "LIVE");
    await new Promise((resolve) => setTimeout(resolve, 60));
    const second = await search("ttl expiry query");
    assert(second.status === "OK" && second.cacheState === "LIVE", "once the TTL has genuinely elapsed, the next call must be a real (LIVE) call again, never a stale cache hit");
  });
  assertEquals(fetchCalls, 2, "an expired cache entry must be refreshed by exactly one new real call");
  clearSearchEnv();
});

Deno.test("DEDUP: two concurrent identical in-flight queries share exactly one real network call", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  let fetchCalls = 0;
  await withPatchedFetch(async () => {
    fetchCalls++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return braveResponse("Dedup test result");
  }, async () => {
    const [a, b] = await Promise.all([search("concurrent dedup query"), search("concurrent dedup query")]);
    assertEquals(a.status, "OK");
    assertEquals(b.status, "OK");
  });
  assertEquals(fetchCalls, 1, "two genuinely concurrent identical queries must never each trigger their own network call");
  clearSearchEnv();
});

Deno.test("BUDGET: a hard daily/monthly cap on a provider is honored -- once reached, that provider is skipped with an honest disclosure, never silently exceeded", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  // No SEARXNG_BASE_URL is configured -- SearXNG short-circuits to unavailable without any network
  // call, isolating this test cleanly to Brave's own budget.
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  Deno.env.set("IBIS_SEARCH_DAILY_BUDGET_BRAVE_SEARCH", "1");
  Deno.env.set("IBIS_SEARCH_MONTHLY_BUDGET_BRAVE_SEARCH", "1");
  let fetchCalls = 0;
  await withPatchedFetch(async () => { fetchCalls++; return braveResponse("Budget test result"); }, async () => {
    const first = await search("budget query one");
    assertEquals(first.status, "OK", "the first call is within budget and must genuinely execute");
    const second = await search("budget query two"); // a DIFFERENT query -- proves this is a budget exhaustion, not a cache hit
    assertEquals(second.status, "SEARCH_UNAVAILABLE");
    assert(second.status === "SEARCH_UNAVAILABLE" && /budget/i.test(second.reason), "the disclosed reason must honestly name the budget as the cause, never a generic/misleading failure");
  });
  assertEquals(fetchCalls, 1, "once the daily/monthly budget is exhausted, no further real call may be made to that provider");
  clearSearchEnv();
});

Deno.test("BUDGET: exhaustion never silently falls back to a paid or unconfigured route -- it produces the same honest SEARCH_UNAVAILABLE alternatives as any other unavailability", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  Deno.env.set("IBIS_SEARCH_DAILY_BUDGET_BRAVE_SEARCH", "0");
  await withPatchedFetch(async () => { throw new Error("must never be called -- budget is already zero"); }, async () => {
    const result = await search("zero budget query");
    assertEquals(result.status, "SEARCH_UNAVAILABLE");
    assert(result.status === "SEARCH_UNAVAILABLE" && result.alternatives.length > 0, "the same honest external-handoff alternatives must be offered as any other SEARCH_UNAVAILABLE result");
  });
  clearSearchEnv();
});

Deno.test("An explicit fetchImpl override (every existing test in this repo) bypasses cache/dedup/budget entirely -- always a fresh attempt", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  let fetchCalls = 0;
  const fakeFetch: typeof fetch = async () => { fetchCalls++; return braveResponse("Override test result"); };
  await search("override query", { fetchImpl: fakeFetch });
  await search("override query", { fetchImpl: fakeFetch });
  assertEquals(fetchCalls, 2, "a caller-supplied fetchImpl must never be short-circuited by the cache -- each call is a fresh, fully caller-controlled attempt");
  clearSearchEnv();
});
