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
//      A PREVIEW deployment (Render/Hugging Face free tier) is prepared in
//      infra/searxng-preview/ -- see that folder's README.md for deploy steps and known
//      cold-start/availability limitations. This is the intended zero-marginal-cost PRIMARY
//      provider long-term; the other providers below exist for immediate demo capability and
//      redundancy, not to replace it.
//   2. Claude Web Search (ibis-claude-search-adapter.ts's claudeWebSearch()), if ANTHROPIC_API_KEY
//      is configured AND actually authenticates -- an immediate investor-demo option (works today
//      the moment a valid key exists, no deployment required), NOT the permanent zero-cost
//      foundation: every search costs real money (Anthropic's per-search tool fee + tokens), so it
//      sits after SearXNG and carries its own, more conservative budget.
//   3. BRAVE_SEARCH_API_KEY, if configured -- Brave Search's Web Search API. Brave's free tier
//      ("Data for AI" / "Free AI" plan, per Brave's own documented pricing at
//      https://brave.com/search/api/ at the time this adapter was written) is usage-capped and
//      requires a Brave account/API key -- this repo has no such key today (confirmed: no
//      BRAVE_SEARCH_API_KEY reference existed anywhere before this adapter). This code path is
//      real and tested against Brave's documented response contract; it simply has nothing to
//      call until a key is provisioned. See handleCanonicalRequest's search() call site / the
//      final report for the exact account action required.
//   4. Grounded Gemini (Gemini's "google_search" tool) is NOT implemented in this pass: enabling
//      it would require confirming, from Google's live billing dashboard, that grounding requests
//      are within a genuinely zero-cost allowance -- an account/billing fact this environment has
//      no way to verify without live secret access, and the existing GEMINI_API_KEY here is
//      already used for plain (paid-tier, per ibis-intelligence-gateway.ts's provider cost
//      ordering) text completions. Implementing a billing-uncertain path and calling it "search"
//      would violate the zero-cost-first policy this whole module exists to enforce.
//   5. SEARCH_UNAVAILABLE with a transparent external-handoff (official Caribbean sources plus a
//      general external search engine link) -- never a silent failure, never an answer that implies
//      research happened when it did not.
//
// Types (SourceRecord/SearchResult/ExternalHandoff) and the shared unavailable() builder live in
// ibis-search-types.ts and are re-exported below for backward compatibility -- split out so
// ibis-claude-search-adapter.ts can share them without a circular import (search() below calls
// claudeWebSearch(), so the reverse dependency direction is intentionally never taken).
export type { SourceRecord, SearchResult, ExternalHandoff } from "./ibis-search-types.ts";
import { unavailable, type SearchResult, type SourceRecord } from "./ibis-search-types.ts";
import { claudeWebSearch } from "./ibis-claude-search-adapter.ts";

type SearXNGResponseItem = { title?: string; url?: string; content?: string; engine?: string; publishedDate?: string };
type SearXNGResponse = { results?: SearXNGResponseItem[] };

// injectFetch lets tests substitute a fake HTTP server without a real SearXNG instance -- this
// repo's sandbox has no Docker, so a live SearXNG instance could not be run and tested here; this
// adapter is proven against SearXNG's documented JSON response contract, not against a live
// instance. That gap is real and is reported as such, not hidden behind a passing test.
// Cold-start resilience (PREVIEW-appropriate, disclosed): a free-tier SearXNG preview (Render/
// Hugging Face) sleeps after inactivity and can take well over this adapter's normal timeout to
// wake -- but the common case (already warm) answers in ~2 seconds, so the FIRST attempt keeps a
// short timeout rather than punishing every ordinary request with a long wait. Only a genuine
// TIMEOUT on that first attempt (never an HTTP error, empty-results, or malformed response --
// retrying those would not help and would only add latency) earns exactly ONE retry with a longer,
// still-bounded window, giving a cold instance a real chance to finish waking without ever
// approaching an unacceptable wait. If the retry ALSO fails, this still fails closed with an
// honest SEARCH_UNAVAILABLE -- never an infinite wait, never a fabricated answer. Evaluated and
// explicitly rejected for this pass: a scheduled warm-up ping to keep the free instance always
// awake -- that would consume Edge Function invocations on a recurring schedule and edge toward
// defeating the free tier's own sleep policy, which is a founder infrastructure decision, not one
// this repair makes unilaterally.
const SEARXNG_FIRST_TIMEOUT_MS = 8000;
const SEARXNG_RETRY_TIMEOUT_MS = 20000;

export async function searxngSearch(
  query: string,
  options: { baseUrl?: string; timeoutMs?: number; retryTimeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<SearchResult> {
  const baseUrl = (options.baseUrl ?? Deno.env.get("SEARXNG_BASE_URL") ?? "").replace(/\/$/, "");
  if (!baseUrl) return unavailable(query, "No SEARXNG_BASE_URL is configured -- no self-hosted search index is running yet.");
  const doFetch = options.fetchImpl ?? fetch;
  const retrievedAt = new Date().toISOString();

  async function attempt(timeoutMs: number): Promise<{ timedOut: true } | SearchResult> {
    try {
      const response = await doFetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&format=json`, {
        signal: AbortSignal.timeout(timeoutMs),
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
          // SearXNG's own result text -- real evidence a synthesis step can summarize from, but
          // still only ever what SearXNG's index snippet says, never a full-page fetch/read.
          snippet: r.content?.trim() || null,
          // A search result is a snippet, never treated as verified full-source content until a
          // RetrievalAdapter actually fetches and reads the page -- that fetch step is not
          // implemented in this pass (see module header); every source here is honestly SNIPPET.
          // The snippet field above does not change this -- it is still SNIPPET, never INSPECTED.
          evidenceDepth: "SNIPPET",
        }));
      if (!sources.length) return unavailable(query, "SearXNG returned results with no usable title/url.");
      return { status: "OK", provider: "searxng", query, sources, retrievedAt, cacheState: "LIVE" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") return { timedOut: true };
      return unavailable(query, "SearXNG request failed.");
    }
  }

  const first = await attempt(options.timeoutMs ?? SEARXNG_FIRST_TIMEOUT_MS);
  if (!("timedOut" in first)) return first;
  const retry = await attempt(options.retryTimeoutMs ?? SEARXNG_RETRY_TIMEOUT_MS);
  if (!("timedOut" in retry)) return retry;
  return unavailable(query, "SearXNG request timed out (including one retry with a longer window -- likely a cold, sleeping preview instance).");
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
        // Brave's own result text -- same discipline as SearXNG's `content` above: real evidence,
        // still only ever a snippet, never a full-page fetch/read.
        snippet: r.description?.trim() || null,
        evidenceDepth: "SNIPPET",
      }));
    if (!sources.length) return unavailable(query, "Brave Search returned results with no usable title/url.");
    return { status: "OK", provider: "brave-search", query, sources, retrievedAt, cacheState: "LIVE" };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return unavailable(query, timedOut ? "Brave Search request timed out." : "Brave Search request failed.");
  }
}

// --- Zero-cost controls (live-search P0 correction) --------------------------------------------
// Per FTN policy: search only when the canonical brain already decided freshness/evidence/discovery
// is required (that decision is made once, by ibis-intent-router.ts/planCapabilities(), before this
// module is ever called -- nothing here re-decides that); cache safe public-query results with a
// TTL; deduplicate identical in-flight queries; never make more than one default search per
// ordinary query (already true above -- SearXNG OR Brave, first success wins, never both); enforce
// a hard daily/monthly provider budget and fall through (with honest disclosure), never silently
// cross it or silently enable a paid route.
//
// Honest limitation: this cache/budget state is process-local (an in-memory Map/counter), not a
// database table. A Supabase Edge Function instance can be recycled at any time, so this reduces
// real duplicate calls within a warm instance's lifetime but is NOT a durable, cross-instance cache
// or a strictly enforced global daily cap -- a genuinely durable version would need a DB-backed
// table (out of scope for this pass; a natural next step once a search provider is actually live).

type CacheEntry = { result: SearchResult; expiresAt: number };
const DEFAULT_CACHE_TTL_MS = 15 * 60_000; // 15 minutes -- long enough to dedupe repeat questions in one session, short enough that "current" queries don't go stale.
const searchCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<SearchResult>>();

// Item 6 (rate-limit resilience, live-confirmed gap): the mission's own adversarial verification
// pass produced real SearXNG upstream-engine CAPTCHA/throttling (DuckDuckGo CAPTCHA, Brave/Google
// CSE "Suspended: too many requests") -- root-caused to repeated identical queries during automated
// verification, which the positive-only cache above does nothing to prevent: a FAILED attempt was
// never cached, so retrying the same already-failing query re-hit (and further hammered) the same
// throttled upstream engines every single time, with no cooldown. A short negative-result cache
// closes exactly that gap without touching freshness honesty: it never serves a stale SUCCESSFUL
// answer for longer than the normal positive TTL above; it only avoids re-attempting a query that
// JUST failed, for a much shorter window, so an upstream engine mid-throttle gets a real chance to
// recover instead of being hit again every retry. After the cooldown, the very next identical
// request tries again for real -- this is strictly less upstream load, never more staleness.
type NegativeCacheEntry = { result: SearchResult; expiresAt: number };
const DEFAULT_NEGATIVE_CACHE_TTL_MS = 45_000; // 45 seconds -- short enough that a genuine transient failure is retried well within any "current" freshness expectation.
const negativeCache = new Map<string, NegativeCacheEntry>();

function cacheKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function cacheTtlMs(): number {
  const configured = Number(Deno.env.get("IBIS_SEARCH_CACHE_TTL_MS"));
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CACHE_TTL_MS;
}

function negativeCacheTtlMs(): number {
  const configured = Number(Deno.env.get("IBIS_SEARCH_NEGATIVE_CACHE_TTL_MS"));
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_NEGATIVE_CACHE_TTL_MS;
}

// Test-only: real callers never need to reset shared module state -- a fresh Deno test run holds
// this same in-memory Map across Deno.test() blocks in one file, so tests that care about cache/
// dedup/budget behavior in isolation call this first.
export function resetSearchControlsForTests(): void {
  searchCache.clear();
  inFlight.clear();
  negativeCache.clear();
  for (const key of Object.keys(dailyCounters)) delete dailyCounters[key];
  for (const key of Object.keys(monthlyCounters)) delete monthlyCounters[key];
}

// Conservative defaults pending the founder's actual confirmed plan tier for whichever paid
// provider is configured (see this module's header comment on Brave's free-tier uncertainty at
// the time this adapter was written) -- override via IBIS_SEARCH_DAILY_BUDGET_<PROVIDER>/
// IBIS_SEARCH_MONTHLY_BUDGET_<PROVIDER> once the real dashboard limits are confirmed. SearXNG (self-
// hosted, zero marginal cost) has no default cap -- Infinity means "not budget-limited by this
// module"; a real infra-level rate limit, if any, belongs to the SearXNG deployment itself.
// Claude Web Search costs real money PER SEARCH (Anthropic's documented web-search-tool fee, plus
// ordinary token costs) -- a materially different cost profile from Brave's free tier or
// self-hosted SearXNG, so its default budget is deliberately far more conservative pending the
// founder's own confirmed comfort level from Anthropic's live billing dashboard.
const DEFAULT_DAILY_BUDGET: Record<string, number> = { searxng: Infinity, "claude-web-search": 20, "brave-search": 60 };
const DEFAULT_MONTHLY_BUDGET: Record<string, number> = { searxng: Infinity, "claude-web-search": 200, "brave-search": 1800 };
const dailyCounters: Record<string, { day: string; count: number }> = {};
const monthlyCounters: Record<string, { month: string; count: number }> = {};

function budgetFor(provider: string, kind: "DAILY" | "MONTHLY"): number {
  const envKey = `IBIS_SEARCH_${kind}_BUDGET_${provider.toUpperCase().replace(/-/g, "_")}`;
  const configured = Number(Deno.env.get(envKey));
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return (kind === "DAILY" ? DEFAULT_DAILY_BUDGET : DEFAULT_MONTHLY_BUDGET)[provider] ?? Infinity;
}

// Returns true (and reserves the call) only if the provider is still within BOTH its daily and
// monthly budget -- never partially reserves one and not the other. Deliberately synchronous and
// side-effecting in one step so two near-simultaneous checks for the same provider cannot both
// pass right at the boundary (best-effort within one warm instance -- see the module-level honesty
// note above about this not being a durable, cross-instance guarantee).
function tryReserveBudget(provider: string, now: Date): boolean {
  const day = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);
  const dailyLimit = budgetFor(provider, "DAILY");
  const monthlyLimit = budgetFor(provider, "MONTHLY");
  const dailyEntry = dailyCounters[provider]?.day === day ? dailyCounters[provider] : (dailyCounters[provider] = { day, count: 0 });
  const monthlyEntry = monthlyCounters[provider]?.month === month ? monthlyCounters[provider] : (monthlyCounters[provider] = { month, count: 0 });
  if (dailyEntry.count >= dailyLimit || monthlyEntry.count >= monthlyLimit) return false;
  dailyEntry.count += 1;
  monthlyEntry.count += 1;
  return true;
}

// Runs one provider only if it still has budget; returns its real result either way -- a budget
// exhaustion is reported as SEARCH_UNAVAILABLE (never silently skipped as if the provider simply
// wasn't configured), so a caller inspecting `reason` can tell the two apart, but the CONTROL FLOW
// treats both identically: not OK means try the next provider.
async function searchProviderWithBudget(
  provider: "searxng" | "claude-web-search" | "brave-search",
  label: string,
  query: string,
  run: () => Promise<SearchResult>,
): Promise<SearchResult> {
  if (!tryReserveBudget(provider, new Date())) {
    return unavailable(query, `${label}'s configured daily or monthly search budget has been reached -- falling through to the next provider rather than silently crossing it.`);
  }
  return run();
}

// The one exported entry point the canonical brain calls -- implements the fallback order in the
// module header, PLUS the zero-cost controls above (cache -> dedup -> per-provider budget ->
// SearXNG -> Claude Web Search -> Brave -> honest SEARCH_UNAVAILABLE). Adding a further real
// provider later means adding one more budgeted branch here, never changing what a caller passes
// in or gets back.
// Failure-diagnostics correction: when every provider in the cascade fails, the caller used to see
// only the LAST attempted provider's reason (e.g. "No BRAVE_SEARCH_API_KEY is configured."), which
// masks what actually went wrong upstream (a SearXNG timeout, an unauthenticated Claude key, etc.).
// This builds one honest, secret-free, per-provider diagnostic chain instead -- no stack traces, no
// credential values, just each provider's own already-sanitized reason under its own label. The
// SAME `alternatives` external handoffs are preserved (from the last attempt, identical to every
// other unavailable() result) so callers relying on that field are unaffected.
function combinedUnavailableReason(query: string, attempts: { label: string; result: SearchResult }[]): SearchResult {
  const chain = attempts
    .filter((a): a is { label: string; result: Extract<SearchResult, { status: "SEARCH_UNAVAILABLE" }> } => a.result.status === "SEARCH_UNAVAILABLE")
    .map((a) => `${a.label}: ${a.result.reason}`)
    .join(" ");
  return unavailable(query, chain || "Search is unavailable.");
}

export async function search(query: string, options: { fetchImpl?: typeof fetch } = {}): Promise<SearchResult> {
  if (options.fetchImpl) {
    // An explicit fetch override means the caller (a deterministic unit test, or an advanced
    // caller that wants full control of the network layer) is already fully in charge of what
    // "the provider" returns -- bypass the cache/dedup/budget layer below so this behaves exactly
    // like a fresh, real attempt every time, matching this function's behavior before the
    // zero-cost-controls correction (every existing test that injects a fetch double is
    // unaffected). Real production requests never supply this, so the controls below cover 100%
    // of genuine network traffic; the controls themselves are proven separately (see
    // ibis-search-adapter.test.ts's CACHE/DEDUP/BUDGET tests, which monkey-patch globalThis.fetch
    // instead, precisely so they exercise this real path).
    const searxngResult = await searxngSearch(query, options);
    if (searxngResult.status === "OK") return searxngResult;
    const claudeResult = await claudeWebSearch(query, options);
    if (claudeResult.status === "OK") return claudeResult;
    const braveResult = await braveSearch(query, options);
    if (braveResult.status === "OK") return braveResult;
    return combinedUnavailableReason(query, [
      { label: "SearXNG", result: searxngResult },
      { label: "Claude Web Search", result: claudeResult },
      { label: "Brave Search", result: braveResult },
    ]);
  }
  const key = cacheKey(query);
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...(cached.result as Extract<SearchResult, { status: "OK" }>), cacheState: "CACHED" };
  }
  const negative = negativeCache.get(key);
  if (negative && negative.expiresAt > Date.now()) {
    return negative.result;
  }
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<SearchResult> => {
    const searxngResult = await searchProviderWithBudget("searxng", "SearXNG", query, () => searxngSearch(query, options));
    if (searxngResult.status === "OK") {
      searchCache.set(key, { result: searxngResult, expiresAt: Date.now() + cacheTtlMs() });
      return searxngResult;
    }
    const claudeResult = await searchProviderWithBudget("claude-web-search", "Claude Web Search", query, () => claudeWebSearch(query, options));
    if (claudeResult.status === "OK") {
      searchCache.set(key, { result: claudeResult, expiresAt: Date.now() + cacheTtlMs() });
      return claudeResult;
    }
    const braveResult = await searchProviderWithBudget("brave-search", "Brave Search", query, () => braveSearch(query, options));
    if (braveResult.status === "OK") {
      searchCache.set(key, { result: braveResult, expiresAt: Date.now() + cacheTtlMs() });
      return braveResult;
    }
    // No provider produced a result -- report the full per-provider failure chain (never just the
    // last attempt's reason), so the true root cause (e.g. a SearXNG timeout) is never masked by a
    // later, unrelated provider's own honest "not configured" message. Cached briefly (see
    // negativeCache above) so an immediate identical retry does not re-hammer an already-throttled
    // upstream engine.
    const failure = combinedUnavailableReason(query, [
      { label: "SearXNG", result: searxngResult },
      { label: "Claude Web Search", result: claudeResult },
      { label: "Brave Search", result: braveResult },
    ]);
    negativeCache.set(key, { result: failure, expiresAt: Date.now() + negativeCacheTtlMs() });
    return failure;
  })();
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}
