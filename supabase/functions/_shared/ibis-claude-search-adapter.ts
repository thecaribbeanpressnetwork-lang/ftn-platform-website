// FTN Platform — Claude Web Search adapter (server-only, never exposed to the browser).
//
// This is NOT a wrapper around the plain Anthropic text-completion provider already used
// elsewhere (ibis-assistant/index.ts's anthropic()) -- that call never requests search grounding
// and answers purely from model memory. This module explicitly requests Anthropic's server-side
// "web_search_20250305" tool on the Messages API, which makes Anthropic itself perform a real web
// search and return real result URLs/titles as `web_search_tool_result` content blocks -- those
// are what this adapter normalizes into IBIS's existing SourceRecord/SearchResult contract (the
// SAME contract searxngSearch()/braveSearch() already produce), so the result flows into
// EBR/EcoMap/canonical reasoning exactly like any other provider's sources, with zero special
// casing downstream.
//
// Immediate investor-demo option, NOT the permanent zero-cost foundation: unlike SearXNG (self-
// hosted, zero marginal cost) or Brave's free tier, every Claude web search costs real money
// (Anthropic's documented per-search tool fee, plus ordinary token costs for the response) --
// this is why it sits in the fallback cascade AFTER SearXNG, carries its OWN, more conservative
// budget than Brave's, and is capped at one search per call (`max_uses: 1`) by default; a deeper,
// multi-search research pass is never triggered automatically.
//
// Live-verification status when this module was written: a real HTTP call to the deployed
// ibis-provider-health-preview Edge Function confirmed ANTHROPIC_API_KEY IS configured server-side
// on the live project, but Anthropic's own API currently rejects it with HTTP 401 -- this adapter
// is therefore implemented and unit-tested against Anthropic's documented web-search-tool response
// contract, but has NOT been proven against a real, authenticating request. See
// GOVERNANCE or docs/ibis/acceptance-baseline.md's "Live Search Infrastructure" section for the
// exact account action required (a fresh key from console.anthropic.com, not a claude.ai chat
// subscription) before this can be live-verified.

import { unavailable, type SearchResult, type SourceRecord } from "./ibis-search-types.ts";

type ClaudeCitation = { type?: string; url?: string; title?: string };
type ClaudeWebSearchResultItem = { type?: string; url?: string; title?: string; page_age?: string | null };
type ClaudeContentBlock =
  | { type: "text"; text?: string; citations?: ClaudeCitation[] }
  | { type: "web_search_tool_result"; tool_use_id?: string; content?: ClaudeWebSearchResultItem[] | { type: "web_search_tool_result_error"; error_code?: string } }
  | { type: string; [key: string]: unknown };
type ClaudeMessagesResponse = { content?: ClaudeContentBlock[]; stop_reason?: string; error?: { type?: string; message?: string } };

function hostnameOf(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

// Flattens every web_search_tool_result block's real result items into SourceRecord[]. Never
// invents a publishedAt: Anthropic's `page_age` is a relative/approximate string (e.g. "3 days
// ago"), not a parseable ISO date -- left null, same discipline braveSearch() already applies to
// Brave's own relative "age"/"page_age" fields (see ibis-search-adapter.ts).
function sourcesFromClaudeResponse(response: ClaudeMessagesResponse, retrievedAt: string): SourceRecord[] {
  const blocks = Array.isArray(response.content) ? response.content : [];
  const seen = new Set<string>();
  const sources: SourceRecord[] = [];
  for (const block of blocks) {
    if (block.type !== "web_search_tool_result") continue;
    const content = (block as { content?: unknown }).content;
    if (!Array.isArray(content)) continue; // a web_search_tool_result_error object, not results -- honestly skipped, not fabricated
    for (const item of content as ClaudeWebSearchResultItem[]) {
      if (!item || item.type !== "web_search_result" || !item.url || !item.title) continue;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      sources.push({
        title: item.title,
        publisher: hostnameOf(item.url),
        url: item.url,
        publishedAt: null,
        updatedAt: null,
        retrievedAt,
        // Anthropic's web_search_result items carry no readable excerpt field (only an opaque
        // encrypted_content blob used internally for citation verification, never exposed as
        // text) -- honestly null rather than fabricating a snippet.
        snippet: null,
        evidenceDepth: "SNIPPET",
      });
    }
  }
  return sources;
}

export type ClaudeWebSearchOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  // Hard per-call cap on how many searches Anthropic itself may perform while answering this ONE
  // request -- never raised automatically; a caller wanting a deeper research pass must pass this
  // explicitly (see this module's header comment on "one search by default").
  maxUses?: number;
};

export async function claudeWebSearch(query: string, options: ClaudeWebSearchOptions = {}): Promise<SearchResult> {
  const apiKey = options.apiKey ?? Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!apiKey) return unavailable(query, "No ANTHROPIC_API_KEY is configured -- Claude Web Search has no credential to use.");
  const model = options.model ?? Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
  const maxUses = Number.isInteger(options.maxUses) && (options.maxUses as number) > 0 ? (options.maxUses as number) : 1;
  const doFetch = options.fetchImpl ?? fetch;
  const retrievedAt = new Date().toISOString();
  try {
    const response = await doFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: query }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxUses }],
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 12000),
    });
    if (!response.ok) return unavailable(query, `Claude Web Search responded HTTP ${response.status}.`);
    const data = (await response.json().catch(() => ({}))) as ClaudeMessagesResponse;
    if (data.error) return unavailable(query, `Claude Web Search error: ${data.error.type || "unknown"}.`);
    const sources = sourcesFromClaudeResponse(data, retrievedAt);
    if (!sources.length) return unavailable(query, "Claude did not return any real web-search results for this query (it may have chosen not to search, or found nothing).");
    return { status: "OK", provider: "claude-web-search", query, sources, retrievedAt, cacheState: "LIVE" };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return unavailable(query, timedOut ? "Claude Web Search request timed out." : "Claude Web Search request failed.");
  }
}
