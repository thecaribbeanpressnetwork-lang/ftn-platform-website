// FTN Platform — Claude Web Search adapter unit tests.
//
// Anthropic's live API currently rejects the ANTHROPIC_API_KEY configured on the deployed project
// (confirmed this checkpoint via a real call to ibis-provider-health-preview: HTTP 401) -- these
// tests therefore exercise this adapter against Anthropic's DOCUMENTED web-search-tool response
// contract via an injected fetchImpl, the same discipline every other MOCK_SEARCH_FIXTURE test in
// this repo already uses for a provider with no working live credential. None of this is
// LIVE_SEARCH_GROUNDED or CLAUDE_WEB_SEARCH-live-verified; see docs/ibis/acceptance-baseline.md.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { claudeWebSearch } from "./ibis-claude-search-adapter.ts";

function messagesResponse(content: unknown[]): Response {
  return new Response(JSON.stringify({ content }), { status: 200 });
}

Deno.test("claudeWebSearch: no ANTHROPIC_API_KEY configured -> honestly SEARCH_UNAVAILABLE, never a fabricated call", async () => {
  let fetchCalls = 0;
  const result = await claudeWebSearch("What happened in Trinidad and Tobago today?", {
    apiKey: "",
    fetchImpl: async () => { fetchCalls++; throw new Error("must never be called"); },
  });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
  assertEquals(fetchCalls, 0);
});

Deno.test("claudeWebSearch: a real web_search_tool_result response is normalized into SourceRecord[], labeled claude-web-search, never LIVE_SEARCH_GROUNDED-claimed", async () => {
  const fakeFetch: typeof fetch = async () => messagesResponse([
    { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "Trinidad Tobago forex" } },
    {
      type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: [
        { type: "web_search_result", url: "https://www.central-bank.org.tt/forex-update", title: "Central Bank of T&T: forex allocation update", page_age: "2 days ago" },
        { type: "web_search_result", url: "https://news.gov.tt/forex-note", title: "T&T Government forex note", page_age: "1 week ago" },
      ],
    },
    { type: "text", text: "Here is what I found...", citations: [{ type: "web_search_result_location", url: "https://www.central-bank.org.tt/forex-update", title: "Central Bank of T&T: forex allocation update" }] },
  ]);
  const result = await claudeWebSearch("What is the latest on T&T forex?", { apiKey: "test-key", fetchImpl: fakeFetch });
  assertEquals(result.status, "OK");
  assert(result.status === "OK");
  assertEquals(result.provider, "claude-web-search");
  assertEquals(result.cacheState, "LIVE");
  assertEquals(result.sources.length, 2);
  assertEquals(result.sources[0].title, "Central Bank of T&T: forex allocation update");
  assertEquals(result.sources[0].url, "https://www.central-bank.org.tt/forex-update");
  assertEquals(result.sources[0].publisher, "central-bank.org.tt");
  assertEquals(result.sources[0].publishedAt, null, "a relative page_age string (\"2 days ago\") must never be fabricated into a parsed ISO date");
  assertEquals(result.sources[0].evidenceDepth, "SNIPPET");
  assert(!JSON.stringify(result).includes("LIVE_SEARCH_GROUNDED"));
});

Deno.test("claudeWebSearch: deduplicates the same URL appearing in multiple result blocks", async () => {
  const fakeFetch: typeof fetch = async () => messagesResponse([
    { type: "web_search_tool_result", tool_use_id: "a", content: [{ type: "web_search_result", url: "https://example.tt/x", title: "X" }] },
    { type: "web_search_tool_result", tool_use_id: "b", content: [{ type: "web_search_result", url: "https://example.tt/x", title: "X (again)" }, { type: "web_search_result", url: "https://example.tt/y", title: "Y" }] },
  ]);
  const result = await claudeWebSearch("test", { apiKey: "test-key", fetchImpl: fakeFetch });
  assert(result.status === "OK");
  assertEquals(result.sources.length, 2, "a URL seen twice across result blocks must be counted once");
});

Deno.test("claudeWebSearch: HTTP error status -> honest SEARCH_UNAVAILABLE, never a crash", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ error: { type: "authentication_error", message: "invalid x-api-key" } }), { status: 401 });
  const result = await claudeWebSearch("test", { apiKey: "bad-key", fetchImpl: fakeFetch });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
  assert(result.status === "SEARCH_UNAVAILABLE" && result.alternatives.length > 0);
});

Deno.test("claudeWebSearch: Claude chose not to search (no web_search_tool_result block at all) -> honest SEARCH_UNAVAILABLE, never a fabricated source", async () => {
  const fakeFetch: typeof fetch = async () => messagesResponse([{ type: "text", text: "I can answer this directly without searching." }]);
  const result = await claudeWebSearch("What is photosynthesis?", { apiKey: "test-key", fetchImpl: fakeFetch });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
});

Deno.test("claudeWebSearch: a web_search_tool_result_error (search itself failed) produces honest SEARCH_UNAVAILABLE, never a crash", async () => {
  const fakeFetch: typeof fetch = async () => messagesResponse([
    { type: "web_search_tool_result", tool_use_id: "a", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } },
  ]);
  const result = await claudeWebSearch("test", { apiKey: "test-key", fetchImpl: fakeFetch });
  assertEquals(result.status, "SEARCH_UNAVAILABLE");
});

Deno.test("claudeWebSearch: requests exactly one search by default (max_uses: 1), never an unauthorized deeper research pass", async () => {
  let capturedBody: any = null;
  const fakeFetch: typeof fetch = async (_url, init) => {
    capturedBody = JSON.parse(String((init as RequestInit).body));
    return messagesResponse([{ type: "web_search_tool_result", tool_use_id: "a", content: [{ type: "web_search_result", url: "https://example.tt/z", title: "Z" }] }]);
  };
  await claudeWebSearch("test", { apiKey: "test-key", fetchImpl: fakeFetch });
  assert(Array.isArray(capturedBody.tools));
  assertEquals(capturedBody.tools[0].type, "web_search_20250305");
  assertEquals(capturedBody.tools[0].max_uses, 1, "a deeper research pass must never be requested unless explicitly authorized via the maxUses option");
});

Deno.test("claudeWebSearch: an explicitly authorized deeper pass raises max_uses only when the caller opts in", async () => {
  let capturedBody: any = null;
  const fakeFetch: typeof fetch = async (_url, init) => {
    capturedBody = JSON.parse(String((init as RequestInit).body));
    return messagesResponse([{ type: "web_search_tool_result", tool_use_id: "a", content: [{ type: "web_search_result", url: "https://example.tt/z", title: "Z" }] }]);
  };
  await claudeWebSearch("test", { apiKey: "test-key", fetchImpl: fakeFetch, maxUses: 5 });
  assertEquals(capturedBody.tools[0].max_uses, 5);
});
