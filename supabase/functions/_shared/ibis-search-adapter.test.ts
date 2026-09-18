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
import { search, resetSearchControlsForTests, searxngSearch } from "./ibis-search-adapter.ts";

function withPatchedFetch<T>(impl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return run().finally(() => { globalThis.fetch = original; });
}

function braveResponse(title: string): Response {
  return new Response(JSON.stringify({ web: { results: [{ title, url: `https://example.com/${encodeURIComponent(title)}`, description: "snippet", meta_url: { hostname: "example.com" } }] } }), { status: 200 });
}

function clearSearchEnv() {
  for (const key of ["SEARXNG_BASE_URL", "BRAVE_SEARCH_API_KEY", "ANTHROPIC_API_KEY", "IBIS_SEARCH_CACHE_TTL_MS", "IBIS_SEARCH_NEGATIVE_CACHE_TTL_MS", "IBIS_SEARCH_DAILY_BUDGET_BRAVE_SEARCH", "IBIS_SEARCH_MONTHLY_BUDGET_BRAVE_SEARCH", "IBIS_SEARCH_DAILY_BUDGET_CLAUDE_WEB_SEARCH", "IBIS_SEARCH_MONTHLY_BUDGET_CLAUDE_WEB_SEARCH"]) {
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

// Item 6 (rate-limit resilience): live adversarial testing produced real SearXNG upstream-engine
// CAPTCHA/throttling from repeated identical queries. A failed attempt was never cached before this
// fix, so an immediate retry of an already-failing query re-hammered the same throttled upstream
// every time. These tests prove the fix without needing a live SearXNG instance: any provider
// failure (here, Brave returning HTTP 500) is cached for a short cooldown.
Deno.test("NEGATIVE CACHE: two identical failing queries within the cooldown window make only one real network attempt", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  let fetchCalls = 0;
  await withPatchedFetch(async () => { fetchCalls++; return new Response("upstream throttled", { status: 500 }); }, async () => {
    const first = await search("throttled query");
    assertEquals(first.status, "SEARCH_UNAVAILABLE");
    const second = await search("throttled query");
    assertEquals(second.status, "SEARCH_UNAVAILABLE");
    assert(second.status === "SEARCH_UNAVAILABLE" && second.reason === (first as { reason: string }).reason, "the cached failure must be returned verbatim, not silently reattempted");
  });
  assertEquals(fetchCalls, 1, "a repeat of an already-failing query within the cooldown must never re-hit the throttled upstream");
  clearSearchEnv();
});

Deno.test("NEGATIVE CACHE: once the cooldown elapses, the next identical query genuinely retries", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  Deno.env.set("IBIS_SEARCH_NEGATIVE_CACHE_TTL_MS", "10");
  let fetchCalls = 0;
  await withPatchedFetch(async () => { fetchCalls++; return new Response("upstream throttled", { status: 500 }); }, async () => {
    await search("cooldown expiry query");
    await new Promise((resolve) => setTimeout(resolve, 60));
    await search("cooldown expiry query");
  });
  assertEquals(fetchCalls, 2, "once the cooldown genuinely elapses, the next identical query must make a real new attempt (never stuck permanently unavailable)");
  clearSearchEnv();
});

Deno.test("NEGATIVE CACHE: a successful result is never affected -- only failures are cooled down", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  let fetchCalls = 0;
  await withPatchedFetch(async () => { fetchCalls++; return braveResponse("Positive result unaffected"); }, async () => {
    const first = await search("positive path query");
    assertEquals(first.status, "OK");
  });
  assertEquals(fetchCalls, 1, "a successful call must never be treated as a failure or double-attempted by the negative-cache logic");
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

Deno.test("CASCADE: Claude Web Search sits between SearXNG and Brave -- tried only once SearXNG genuinely has nothing", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  // No SEARXNG_BASE_URL -- SearXNG short-circuits without a network call.
  let claudeCalls = 0, braveCalls = 0;
  await withPatchedFetch(async (url) => {
    if (String(url).includes("api.anthropic.com")) { claudeCalls++; return new Response(JSON.stringify({ content: [{ type: "web_search_tool_result", tool_use_id: "a", content: [{ type: "web_search_result", url: "https://example.tt/cascade", title: "Cascade result" }] }] }), { status: 200 }); }
    braveCalls++;
    return braveResponse("should not be reached");
  }, async () => {
    const result = await search("cascade order query");
    assertEquals(result.status, "OK");
    assert(result.status === "OK" && result.provider === "claude-web-search", "Claude must be tried (and win) before Brave once SearXNG has nothing");
  });
  assertEquals(claudeCalls, 1);
  assertEquals(braveCalls, 0, "Brave must never be called once an earlier tier in the cascade succeeded");
  clearSearchEnv();
});

Deno.test("CASCADE: Claude Web Search's own budget exhaustion falls through to Brave, independent of Brave's own budget", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-key");
  Deno.env.set("IBIS_SEARCH_DAILY_BUDGET_CLAUDE_WEB_SEARCH", "0");
  await withPatchedFetch(async (url) => {
    if (String(url).includes("api.anthropic.com")) throw new Error("must never be called -- Claude budget is already zero");
    return braveResponse("Brave took over after Claude's budget was exhausted");
  }, async () => {
    const result = await search("claude budget exhausted query");
    assertEquals(result.status, "OK");
    assert(result.status === "OK" && result.provider === "brave-search");
  });
  clearSearchEnv();
});

Deno.test("DIAGNOSTICS: when every provider fails, the combined reason names each provider's own real failure, not just the last one's", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  // BRAVE_SEARCH_API_KEY left unset -- Brave will report "not configured", but that must not be
  // the ONLY thing the caller sees.
  await withPatchedFetch(async (url) => {
    if (String(url).includes("fake-searxng.test")) return new Response("", { status: 500 });
    if (String(url).includes("api.anthropic.com")) return new Response(JSON.stringify({ error: { type: "authentication_error", message: "invalid x-api-key" } }), { status: 401 });
    throw new Error("must never reach Brave's real endpoint -- no key is configured");
  }, async () => {
    const result = await search("all providers fail query");
    assertEquals(result.status, "SEARCH_UNAVAILABLE");
    assert(result.status === "SEARCH_UNAVAILABLE");
    assert(result.reason.includes("SearXNG:"), "the combined reason must name SearXNG's own failure");
    assert(result.reason.includes("Claude Web Search:"), "the combined reason must name Claude Web Search's own failure");
    assert(result.reason.includes("Brave Search:"), "the combined reason must name Brave Search's own failure");
    assert(result.reason.includes("HTTP 500"), "SearXNG's real failure detail (HTTP 500) must be preserved, not masked by a later provider's message");
    assert(result.reason.includes("No BRAVE_SEARCH_API_KEY is configured"), "Brave's own honest reason must still appear");
    assert(!/x-api-key|Bearer |sk-ant-|Authorization:/i.test(result.reason), "no credential/header value may ever appear in the combined reason");
    assert(!/at\s+\S+:\d+:\d+|\.ts:\d+/.test(result.reason), "no stack trace must ever appear in the combined reason");
  });
  clearSearchEnv();
});

Deno.test("DIAGNOSTICS: the combined-failure result still carries the standard external-handoff alternatives", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  await withPatchedFetch(async () => new Response("", { status: 500 }), async () => {
    const result = await search("no providers configured query");
    assert(result.status === "SEARCH_UNAVAILABLE");
    assert(result.alternatives.length > 0, "the same honest external-handoff alternatives must still be offered");
  });
  clearSearchEnv();
});

// --- COLD-START RESILIENCE: a genuine timeout on SearXNG's first (short) attempt earns exactly
// one retry with a longer, still-bounded window; any OTHER failure (HTTP error, empty results)
// never retries, since retrying those would not help. ---

function abortAwareFetch(delaysMs: number[], onCall: (callIndex: number) => Response): typeof fetch {
  let call = 0;
  return ((_url: unknown, init?: RequestInit) => {
    const thisCall = call;
    const delay = delaysMs[Math.min(call, delaysMs.length - 1)];
    call++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(onCall(thisCall)), delay);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("The signal has been aborted", "TimeoutError"));
      });
    });
  }) as typeof fetch;
}

Deno.test("COLD START: a genuine timeout on the first attempt gets exactly one retry with a longer window, which succeeds", async () => {
  let calls = 0;
  const fetchImpl = abortAwareFetch([50, 5], () => {
    calls++;
    return new Response(JSON.stringify({ results: [{ title: "Cold start recovered", url: "https://example.tt/cold", content: "warmed up", engine: "test" }] }), { status: 200 });
  });
  const result = await searxngSearch("cold start query", { baseUrl: "http://fake-searxng.test", timeoutMs: 10, retryTimeoutMs: 200, fetchImpl });
  assertEquals(result.status, "OK");
  assert(result.status === "OK" && result.sources[0].title === "Cold start recovered");
  assertEquals(calls, 1, "the slow first attempt must time out and abort before completing; only the fast retry actually resolves");
});

Deno.test("COLD START: if the retry ALSO times out, the final result is an honest SEARCH_UNAVAILABLE naming the retry, never an infinite wait", async () => {
  let calls = 0;
  const alwaysSlowFetch: typeof fetch = (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => {
      const timer = setTimeout(() => {}, 10_000);
      (init as RequestInit)?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("aborted", "TimeoutError")); });
    });
  };
  const result = await searxngSearch("always cold query", { baseUrl: "http://fake-searxng.test", timeoutMs: 5, retryTimeoutMs: 15, fetchImpl: alwaysSlowFetch });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
  assert(result.status === "SEARCH_UNAVAILABLE" && /retry/i.test(result.reason));
  assertEquals(calls, 2, "exactly two attempts total -- never more, never an unbounded loop");
});

Deno.test("COLD START: a non-timeout failure (HTTP error) never retries -- retrying would not help", async () => {
  let calls = 0;
  const httpErrorFetch: typeof fetch = async () => { calls++; return new Response("", { status: 500 }); };
  const result = await searxngSearch("http error query", { baseUrl: "http://fake-searxng.test", timeoutMs: 10, retryTimeoutMs: 200, fetchImpl: httpErrorFetch });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
  assertEquals(calls, 1, "an HTTP error must never trigger the cold-start retry -- only a genuine timeout does");
});

Deno.test("COLD START: empty results never retries -- retrying would not help", async () => {
  let calls = 0;
  const emptyResultsFetch: typeof fetch = async () => { calls++; return new Response(JSON.stringify({ results: [] }), { status: 200 }); };
  const result = await searxngSearch("empty results query", { baseUrl: "http://fake-searxng.test", timeoutMs: 10, retryTimeoutMs: 200, fetchImpl: emptyResultsFetch });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
  assertEquals(calls, 1, "an empty-results response must never trigger the cold-start retry");
});

// FTN Quality & UX Closure pass (2026-09-18): SearXNG fanout tests -- attempt #1 is always the
// caller's literal query (a currently-working query must keep working with exactly one call); a
// query that genuinely returns nothing tries normalized/precision retrieval-language variants next.
Deno.test("FANOUT: a literal query with real results never triggers a second (normalized) attempt", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  let calls = 0;
  await withPatchedFetch(async () => {
    calls++;
    return new Response(JSON.stringify({ results: [{ title: "Real result", url: "https://example.tt/real", content: "snippet" }] }), { status: 200 });
  }, async () => {
    const result = await search("What is happening in Trinidad and Tobago today?");
    assertEquals(result.status, "OK");
  });
  assertEquals(calls, 1, "a query that already works must still make exactly one SearXNG call -- fanout must never fire when attempt #1 already succeeded");
  clearSearchEnv();
});

Deno.test("FANOUT: a literal query with zero results falls through to a normalized retrieval-language attempt, which succeeds", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  const queriesSeen: string[] = [];
  await withPatchedFetch(async (url) => {
    const q = new URL(String(url)).searchParams.get("q") || "";
    queriesSeen.push(q);
    // The literal, unmodified user text returns nothing; any normalized fanout variant succeeds.
    if (q === "What changed in Trinidad this week?") return new Response(JSON.stringify({ results: [] }), { status: 200 });
    return new Response(JSON.stringify({ results: [{ title: "Normalized result", url: "https://example.tt/normalized", content: "snippet" }] }), { status: 200 });
  }, async () => {
    const result = await search("What changed in Trinidad this week?");
    assertEquals(result.status, "OK", "a normalized fanout variant must recover a real result when the literal query returns nothing");
  });
  assert(queriesSeen.length >= 2 && queriesSeen.length <= 4, `fanout must be bounded (2-4 total attempts), got ${queriesSeen.length}`);
  assertEquals(queriesSeen[0], "What changed in Trinidad this week?", "attempt #1 must always be the literal original query");
  assert(queriesSeen[1] !== queriesSeen[0], "attempt #2 must be a genuinely different, normalized retrieval-language variant");
  clearSearchEnv();
});

Deno.test("FANOUT: when every fanout attempt genuinely returns nothing, the reported `query` is still the user's original text, never an internal retrieval variant", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("SEARXNG_BASE_URL", "http://fake-searxng.test");
  await withPatchedFetch(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }), async () => {
    const result = await search("What changed in Trinidad this week?");
    assertEquals(result.status, "SEARCH_UNAVAILABLE");
    assert(result.status === "SEARCH_UNAVAILABLE" && result.query === "What changed in Trinidad this week?", "the reported query must be the user's real question, never a normalized search string");
  });
  clearSearchEnv();
});

// FTN Quality & UX Closure pass (2026-09-18): Claude Web Search circuit-breaker tests -- live-caught
// via the Wave 1 benchmark, Claude Web Search was failing on every single call (an invalid
// credential), yet the cascade kept making a real network round-trip to Anthropic on every request.
Deno.test("CIRCUIT: after 2 consecutive Claude Web Search failures, the circuit opens and the next call is skipped with zero network calls", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  // No SEARXNG_BASE_URL, no BRAVE_SEARCH_API_KEY -- isolates the cascade to Claude Web Search alone.
  let claudeCalls = 0;
  await withPatchedFetch(async () => { claudeCalls++; return new Response("", { status: 400 }); }, async () => {
    await search("circuit failure query one");
    await search("circuit failure query two");
    assertEquals(claudeCalls, 2, "both genuine failures must have actually reached the network");
    const third = await search("circuit failure query three");
    assertEquals(third.status, "SEARCH_UNAVAILABLE");
    assert(third.status === "SEARCH_UNAVAILABLE" && /circuit is open/i.test(third.reason), "the third call's failure reason must explicitly name the open circuit, not a generic network error");
  });
  assertEquals(claudeCalls, 2, "the third call must be skipped entirely -- no network call once the circuit is open, to avoid wasting latency on a known-broken credential");
  clearSearchEnv();
});

Deno.test("CIRCUIT: a successful Claude Web Search call resets the failure count (one earlier failure does not linger toward opening the circuit)", async () => {
  resetSearchControlsForTests();
  clearSearchEnv();
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  let call = 0, claudeCalls = 0;
  await withPatchedFetch(async () => {
    claudeCalls++;
    call++;
    if (call === 1) return new Response("", { status: 400 });
    return new Response(JSON.stringify({ content: [{ type: "web_search_tool_result", tool_use_id: "a", content: [{ type: "web_search_result", url: "https://example.tt/recovered", title: "Recovered result" }] }] }), { status: 200 });
  }, async () => {
    const first = await search("circuit recovery query one");
    assertEquals(first.status, "SEARCH_UNAVAILABLE");
    const second = await search("circuit recovery query two");
    assertEquals(second.status, "OK", "a single failure must never open the circuit -- only 2 CONSECUTIVE failures do");
    // A third, fresh failure after the reset-by-success must count as failure #1 again, not #3.
    call = 0;
    const third = await search("circuit recovery query three");
    assertEquals(third.status, "SEARCH_UNAVAILABLE");
  });
  assertEquals(claudeCalls, 3, "every call in this sequence must have genuinely reached the network -- the circuit must still be closed throughout");
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
