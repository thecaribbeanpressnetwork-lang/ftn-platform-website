// FTN Platform — search-query normalization + bounded fanout for the zero-cost search cascade.
//
// Real, live-caught problem (FTN Quality & UX Closure pass, 2026-09-18): the exact user-facing
// phrasing was passed directly to SearXNG as the search query, and several completely reasonable
// questions ("What changed in Trinidad this week?") returned zero results while a near-identical
// question ("What is happening in Trinidad and Tobago today?") succeeded -- the difference is
// retrieval-language quality, not the underlying question. This module NEVER changes what the user
// sees; it only produces a short, ordered list of alternative strings to send to the search engine,
// which ibis-search-adapter.ts's searxngSearchWithFanout() tries in sequence, stopping at the first
// real result. The original (already-disambiguated) query is always attempt #1, so every query that
// already works today keeps working exactly as before -- this only ever ADDS fallback attempts.
//
// Pure, dependency-free, no Deno-only API -- runs under plain Node so it has its own plain-Node
// unit test (ibis-search-query-normalizer.test.ts) independent of the Deno test runner.

export type SearchCategory =
  | "CURRENT_EVENTS" | "PARLIAMENT" | "GOVERNMENT" | "GRANTS" | "OPPORTUNITIES"
  | "COURSES" | "BUSINESS" | "TOURISM" | "GENERAL";

// Order matters: a more specific category (e.g. PARLIAMENT) must be checked before a broader one
// (e.g. GOVERNMENT) that could also match its wording.
const CATEGORY_MARKERS: Array<[SearchCategory, RegExp]> = [
  ["PARLIAMENT", /\b(parliament|hansard|order paper|house of representatives|senate sitting)\b/i],
  ["GRANTS", /\b(grants?|funding|funder|donor|scholarships?)\b/i],
  ["COURSES", /\b(courses?|training|workshop|certificat\w*|apprenticeship|programmes?|degree)\b/i],
  ["GOVERNMENT", /\b(government service|ministry|passport|licen[cs]e|permit|registration|official service|renew\w*)\b/i],
  ["TOURISM", /\b(tourism|tourists?|visitors?|hotels?|resorts?)\b/i],
  ["OPPORTUNITIES", /\b(opportunit\w*|jobs?|hiring|vacanc\w*)\b/i],
  ["BUSINESS", /\b(business\w*|startups?|entrepreneur\w*|compan\w*|market|economy|economic)\b/i],
  ["CURRENT_EVENTS", /\b(today|this week|this month|latest|current(?:ly)?|right now|breaking|recent(?:ly)?)\b/i],
];

export function categorize(text: string): SearchCategory {
  for (const [category, marker] of CATEGORY_MARKERS) if (marker.test(text)) return category;
  return "GENERAL";
}

const TOBAGO_MARKER = /\btobago\b/i;
const TRINIDAD_MARKER = /\btrinidad\b/i;
const CARIBBEAN_MARKER = /\bcaribbean\b/i;

function regionPhrase(text: string): string {
  const hasTobago = TOBAGO_MARKER.test(text);
  const hasTrinidad = TRINIDAD_MARKER.test(text);
  if (hasTrinidad && hasTobago) return "Trinidad and Tobago";
  if (hasTrinidad) return "Trinidad and Tobago";
  if (hasTobago) return "Tobago";
  if (CARIBBEAN_MARKER.test(text)) return "Caribbean";
  // Default to Trinidad and Tobago rather than a bare "Caribbean" -- FTN's primary market, and the
  // same default the civic-term disambiguator (ibis-ftn-disambiguation.ts) already uses.
  return "Trinidad and Tobago";
}

// Official, real, previously-verified-relevant domains per category (the same outlets that
// actually appeared in this pass's own benchmark's successful SEARCH_GROUNDED results, plus the
// mission's own named examples) -- used only to NARROW a search, never to fabricate a result if
// these domains have nothing indexed for the query.
const OFFICIAL_SITE_GROUPS: Partial<Record<SearchCategory, string[]>> = {
  PARLIAMENT: ["ttparliament.org"],
  GOVERNMENT: ["gov.tt", "ttconnect.gov.tt", "news.gov.tt"],
  CURRENT_EVENTS: ["guardian.co.tt", "newsday.co.tt", "trinidadexpress.com"],
};

function currentYear(): string {
  return String(new Date().getFullYear());
}

// A search index matches on content words, not conversational framing -- rather than trying to
// pattern-match every possible question-opener (fragile: "What relationships are missing..." does
// not fit a simple "what is/are X" template), this strips a fixed stopword/question-word list from
// EVERY position in the text and keeps the real nouns/verbs/entities in their original order. Real
// bug caught while building this: an early prefix-regex version left the entire original sentence
// glued onto the category phrase for questions like "What relationships are missing between...",
// producing a bloated, duplicate-heavy query -- worse than the raw text, not better.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "with", "that", "this", "you", "your", "have", "has", "was", "were",
  "from", "into", "about", "what", "where", "who", "how", "why", "when", "which", "is", "am", "be",
  "been", "being", "do", "does", "did", "can", "could", "should", "would", "will", "shall", "may",
  "might", "please", "tell", "show", "help", "find", "me", "my", "a", "an", "of", "in", "on", "to",
  "it", "its", "there", "here", "just", "really", "some", "any", "i", "we", "us",
]);

function significantWords(text: string, max: number): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^\w$-]/g, ""))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()))
    .slice(0, max);
}

// Returns an ordered list of query strings to try, deduplicated, ALWAYS starting with `userText`
// itself unchanged (attempt #1, the exact current behavior). Bounded to at most 4 total attempts
// (the original plus at most 3 fallbacks) -- "keep retries bounded", never an unbounded fanout.
const CATEGORY_BOOST: Partial<Record<SearchCategory, (region: string) => string>> = {
  CURRENT_EVENTS: (region) => `${region} latest news developments ${currentYear()}`,
  PARLIAMENT: (region) => `${region} Parliament`,
  GRANTS: (region) => `${region} grants funding ${currentYear()}`,
  COURSES: (region) => `${region} training course`,
  GOVERNMENT: (region) => `${region} government official service`,
  TOURISM: (region) => `${region} tourism ${currentYear()}`,
  OPPORTUNITIES: (region) => `${region} opportunities ${currentYear()}`,
  BUSINESS: (region) => `${region} business`,
};

export function buildQueryAttempts(userText: string): string[] {
  const text = String(userText || "").trim();
  if (!text) return [];
  const category = categorize(text);
  const region = regionPhrase(text);
  const attempts: string[] = [text];

  const wordsWide = significantWords(text, 7);
  const wordsNarrow = significantWords(text, 4);

  // Attempt 2: a category-specific boost phrase plus up to 7 real content words from the question
  // -- keyword-dense retrieval language a search index actually matches on, never the conversational
  // framing ("what is", "can you tell me") a search engine ignores or mismatches on anyway.
  const boost = CATEGORY_BOOST[category];
  const boostPhrase = boost ? boost(region) : region;
  if (wordsWide.length) attempts.push(`${boostPhrase} ${wordsWide.join(" ")}`.trim());

  // Attempt 3: a short, high-precision query (region + up to 4 real content words) -- when a long
  // natural-language query returns nothing, a shorter keyword query often does better precisely
  // because it stops requiring every word to match.
  if (wordsNarrow.length) attempts.push(`${region} ${wordsNarrow.join(" ")}`.trim());

  // Attempt 4: official-source-restricted, only for categories with a real, known-good domain set
  // -- narrows retrieval to primary/credible sources rather than fabricating an answer when generic
  // search has nothing.
  const sites = OFFICIAL_SITE_GROUPS[category];
  if (sites && sites.length) {
    const siteClause = sites.map((s) => `site:${s}`).join(" OR ");
    attempts.push(`${siteClause} ${region} ${wordsNarrow.slice(0, 2).join(" ")}`.trim());
  }

  const seen = new Set<string>();
  const unique = attempts.filter((a) => {
    const key = a.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, 4);
}
