// FTN Platform — shared search-provider types + the common "no result" builder.
//
// Split out from ibis-search-adapter.ts so every provider adapter in the fallback cascade
// (searxngSearch/braveSearch in ibis-search-adapter.ts, claudeWebSearch in
// ibis-claude-search-adapter.ts) can share the exact same SourceRecord/SearchResult contract and
// the exact same honest-degradation/external-handoff construction, without ibis-search-adapter.ts
// and ibis-claude-search-adapter.ts needing to import from each other (search() in
// ibis-search-adapter.ts calls claudeWebSearch(), so the reverse import would be circular).
// ibis-search-adapter.ts re-exports everything below for backward compatibility -- nothing
// elsewhere in the codebase needs to change which file it imports these from.

export type SourceRecord = {
  title: string;
  publisher: string | null;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  retrievedAt: string;
  // The search provider's own result text (SearXNG's `content`, Brave's `description`) -- real
  // evidence a synthesis step can summarize from, but still only ever a snippet: never treated as,
  // or relabeled as, having inspected the full source page. null when the provider returned none.
  snippet: string | null;
  // SNIPPET: only a search-result snippet was inspected, never treated as verified full-source
  // content. INSPECTED: reserved, never produced (kept for backward compatibility with any external
  // reader of this union). Phase 5 (see ibis-retrieval-adapter.ts): RETRIEVED_PAGE -- the Retrieval
  // Adapter actually fetched and read an HTML/text page body. PRIMARY_DOCUMENT -- a PDF/document was
  // fetched from a known official-government domain (see AUTHORITATIVE_GOVERNMENT_DOMAINS in
  // ibis-search-quality-gate.ts), the one case the adapter is willing to call a primary record
  // without a human review step.
  evidenceDepth: "SNIPPET" | "INSPECTED" | "RETRIEVED_PAGE" | "PRIMARY_DOCUMENT";
};

export type SearchResult =
  // cacheState is always present on a real result so a caller/UI can honestly say "live" vs
  // "cached" rather than implying every answer just made a fresh network call -- LIVE means this
  // exact call reached the provider just now; CACHED means an earlier LIVE result within the TTL
  // window was reused (ibis-search-adapter.ts's cache), never a stale result served past its TTL.
  | { status: "OK"; provider: string; query: string; sources: SourceRecord[]; retrievedAt: string; cacheState: "LIVE" | "CACHED" }
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

export function unavailable(query: string, reason: string): SearchResult {
  return { status: "SEARCH_UNAVAILABLE", query, reason, alternatives: [...OFFICIAL_CARIBBEAN_HANDOFFS, genericSearchHandoff(query)] };
}
