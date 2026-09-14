// FTN Platform — provider-independent SearchAdapter + RetrievalAdapter.
//
// Confirmed by a full audit of every configured provider (Gemini, Anthropic, Cloudflare Workers
// AI, both OpenAI-compatible slots, Ollama, Bytez): NONE of them request search grounding or a
// search tool -- every one is a plain chat/completion call. SearXNG and Crawl4AI exist only as
// DISCOVERED/CANDIDATE catalogue entries (data/ibis-capability-registry.json), never wired to a
// real adapter, and no Docker/infra config for either exists in this repo. So today, general web
// search genuinely does not exist anywhere in this codebase -- this module is the first real one,
// not a wrapper around something already working.
//
// Fallback order (zero-cost-first, per FTN policy):
//   1. SEARXNG_BASE_URL, if configured -- a self-hosted, zero-cost, open-source metasearch index.
//   2. BRAVE_SEARCH_API_KEY, if configured -- Brave Search's Web Search API. Brave's free tier
//      ("Data for AI" / "Free AI" plan, per Brave's own documented pricing at
//      https://brave.com/search/api/ at the time this adapter was written) is usage-capped and
//      requires a Brave account/API key -- this repo has no such key today (confirmed: no
//      BRAVE_SEARCH_API_KEY reference existed anywhere before this adapter). This code path is
//      real and tested against Brave's documented response contract; it simply has nothing to
//      call until a key is provisioned. See handleCanonicalRequest's search() call site / the
//      final report for the exact account action required.
//   3. Grounded Gemini (Gemini's "google_search" tool) is NOT implemented in this pass: enabling
//      it would require confirming, from Google's live billing dashboard, that grounding requests
//      are within a genuinely zero-cost allowance -- an account/billing fact this environment has
//      no way to verify without live secret access, and the existing GEMINI_API_KEY here is
//      already used for plain (paid-tier, per ibis-intelligence-gateway.ts's provider cost
//      ordering) text completions. Implementing a billing-uncertain path and calling it "search"
//      would violate the zero-cost-first policy this whole module exists to enforce.
//   4. SEARCH_UNAVAILABLE with a transparent external-handoff (official Caribbean sources plus a
//      general external search engine link) -- never a silent failure, never an answer that implies
//      research happened when it did not.

export type SourceRecord = {
  title: string;
  publisher: string | null;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  retrievedAt: string;
  evidenceDepth: "SNIPPET" | "INSPECTED";
};

export type SearchResult =
  | { status: "OK"; provider: string; query: string; sources: SourceRecord[]; retrievedAt: string }
  | { status: "SEARCH_UNAVAILABLE"; query: string; reason: string; alternatives: ExternalHandoff[] };

export type ExternalHandoff = {
  label: string;
  url: string;
  costStatus: "FREE" | "FREE_TIER" | "PAID" | "UNKNOWN";
  signInRequired: boolean;
  caribbeanAvailability: "AVAILABLE" | "UNKNOWN" | "RESTRICTED";
  privacyNote: string;
};

// Official/primary Caribbean sources worth naming directly as a handoff when internal search
// cannot run, rather than only a generic external search engine -- a user asking about a T&T FX
// shortage is better served pointed at the Central Bank than at a bare Google query.
const OFFICIAL_CARIBBEAN_HANDOFFS: ExternalHandoff[] = [
  { label: "Central Bank of Trinidad and Tobago", url: "https://www.central-bank.org.tt/", costStatus: "FREE", signInRequired: false, caribbeanAvailability: "AVAILABLE", privacyNote: "Official government source; no FTN data is shared by following this link." },
  { label: "Trinidad and Tobago Government News", url: "https://news.gov.tt/", costStatus: "FREE", signInRequired: false, caribbeanAvailability: "AVAILABLE", privacyNote: "Official government source; no FTN data is shared by following this link." },
];

function genericSearchHandoff(query: string): ExternalHandoff {
  return {
    label: "Search the web directly (DuckDuckGo)",
    url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    costStatus: "FREE",
    signInRequired: false,
    caribbeanAvailability: "AVAILABLE",
    privacyNote: "You are leaving FTN. DuckDuckGo does not require sign-in for a basic search; review its own privacy policy before searching sensitive terms.",
  };
}

function unavailable(query: string, reason: string): SearchResult {
  return { status: "SEARCH_UNAVAILABLE", query, reason, alternatives: [...OFFICIAL_CARIBBEAN_HANDOFFS, genericSearchHandoff(query)] };
}

type SearXNGResponseItem = { title?: string; url?: string; content?: string; engine?: string; publishedDate?: string };
type SearXNGResponse = { results?: SearXNGResponseItem[] };

// injectFetch lets tests substitute a fake HTTP server without a real SearXNG instance -- this
// repo's sandbox has no Docker, so a live SearXNG instance could not be run and tested here; this
// adapter is proven against SearXNG's documented JSON response contract, not against a live
// instance. That gap is real and is reported as such, not hidden behind a passing test.
export async function searxngSearch(
  query: string,
  options: { baseUrl?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<SearchResult> {
  const baseUrl = (options.baseUrl ?? Deno.env.get("SEARXNG_BASE_URL") ?? "").replace(/\/$/, "");
  if (!baseUrl) return unavailable(query, "No SEARXNG_BASE_URL is configured -- no self-hosted search index is running yet.");
  const doFetch = options.fetchImpl ?? fetch;
  const retrievedAt = new Date().toISOString();
  try {
    const response = await doFetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&format=json`, {
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
    });
    if (!response.ok) return unavailable(query, `SearXNG responded HTTP ${response.status}.`);
    const data = (await response.json().catch(() => ({}))) as SearXNGResponse;
    const results = Array.isArray(data.results) ? data.results : [];
    if (!results.length) return unavailable(query, "SearXNG returned no results for this query.");
    const sources: SourceRecord[] = results.slice(0, 8)
      .filter((r): r is Required<Pick<SearXNGResponseItem, "title" | "url">> & SearXNGResponseItem => !!r.title && !!r.url)
      .map((r) => ({
        title: r.title!,
        publisher: r.engine || null,
        url: r.url!,
        publishedAt: r.publishedDate || null,
        updatedAt: null,
        retrievedAt,
        // A search result is a snippet, never treated as verified full-source content until a
        // RetrievalAdapter actually fetches and reads the page -- that fetch step is not
        // implemented in this pass (see module header); every source here is honestly SNIPPET.
        evidenceDepth: "SNIPPET",
      }));
    if (!sources.length) return unavailable(query, "SearXNG returned results with no usable title/url.");
    return { status: "OK", provider: "searxng", query, sources, retrievedAt };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return unavailable(query, timedOut ? "SearXNG request timed out." : "SearXNG request failed.");
  }
}

type BraveResponseItem = { title?: string; url?: string; description?: string; age?: string; page_age?: string; meta_url?: { hostname?: string } };
type BraveResponse = { web?: { results?: BraveResponseItem[] } };

export async function braveSearch(
  query: string,
  options: { apiKey?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<SearchResult> {
  const apiKey = options.apiKey ?? Deno.env.get("BRAVE_SEARCH_API_KEY") ?? "";
  if (!apiKey) return unavailable(query, "No BRAVE_SEARCH_API_KEY is configured.");
  const doFetch = options.fetchImpl ?? fetch;
  const retrievedAt = new Date().toISOString();
  try {
    const response = await doFetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
    });
    if (!response.ok) return unavailable(query, `Brave Search responded HTTP ${response.status}.`);
    const data = (await response.json().catch(() => ({}))) as BraveResponse;
    const results = Array.isArray(data.web?.results) ? data.web!.results! : [];
    if (!results.length) return unavailable(query, "Brave Search returned no results for this query.");
    const sources: SourceRecord[] = results.slice(0, 8)
      .filter((r): r is Required<Pick<BraveResponseItem, "title" | "url">> & BraveResponseItem => !!r.title && !!r.url)
      .map((r) => ({
        title: r.title!,
        publisher: r.meta_url?.hostname || null,
        url: r.url!,
        // Brave's "age"/"page_age" fields are relative/approximate strings (e.g. "2 days ago"),
        // not ISO dates -- honestly left null rather than fabricating a parsed date from them.
        publishedAt: null,
        updatedAt: null,
        retrievedAt,
        evidenceDepth: "SNIPPET",
      }));
    if (!sources.length) return unavailable(query, "Brave Search returned results with no usable title/url.");
    return { status: "OK", provider: "brave-search", query, sources, retrievedAt };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return unavailable(query, timedOut ? "Brave Search request timed out." : "Brave Search request failed.");
  }
}

// The one exported entry point the canonical brain calls -- implements the fallback order in the
// module header. Adding a further real provider later means adding one more branch here, never
// changing what a caller passes in or gets back.
export async function search(query: string, options: { fetchImpl?: typeof fetch } = {}): Promise<SearchResult> {
  const searxngResult = await searxngSearch(query, options);
  if (searxngResult.status === "OK") return searxngResult;
  const braveResult = await braveSearch(query, options);
  if (braveResult.status === "OK") return braveResult;
  return braveResult;
}
