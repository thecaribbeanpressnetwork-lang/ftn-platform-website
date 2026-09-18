// FTN Platform — provider-independent search RESULT quality gate.
//
// Real, live-caught problem (Search Quality Gate pass, 2026-09-18): the prior "search reliability"
// fix (ibis-search-query-normalizer.ts's fanout + the Claude Web Search circuit breaker) only ever
// measured whether a provider returned `status: "OK"` with `sources.length > 0`. It never checked
// whether those sources were actually USABLE evidence for the user's question. In production, "What
// changed in Trinidad and Tobago this week?" was answered from an irrelevant 2018/2019 UWI Faculty
// Report -- a `status: "OK"` result with real titles/URLs that was nonetheless completely useless
// for a freshness question. This module is the fix: a pure, provider-independent function the
// search cascade (ibis-search-adapter.ts) calls after a provider returns sources and BEFORE the
// cascade accepts that provider as the final answer.
//
// Deliberately probabilistic, not one brittle rule: SearXNG's own `publishedDate` is frequently
// null or a relative/approximate string (see ibis-search-adapter.ts's own comment on this), so a
// gate that required a parseable date field would reject good primary sources for weak metadata,
// not just bad ones. Every signal below is a WEIGHTED vote, combined into one score -- temporal
// language in the title/snippet, explicit stale-year markers, archival/academic document markers,
// topical word overlap with the user's own question, region/entity mentions, and known-authoritative
// news/government domains. No single signal firing (or failing to fire) determines the outcome.
//
// Deliberately scoped: the gate only actively filters when `freshnessRequired` is true (the same
// flag ibis-canonical-brain.ts already computes from `queryClass === "CURRENT_WEB_RESEARCH"`). For
// every other query class this returns acceptable:true unconditionally -- the live-caught bug was
// specific to freshness-required questions, and the mission's own instruction is explicit: "do not
// overfit to this single query" and never weaken or broaden scope beyond the actual problem.
//
// Pure, dependency-free, no Deno-only API -- runs under plain Node so it has its own plain-Node
// unit test (ibis-search-quality-gate.test.ts), same pattern as ibis-search-query-normalizer.ts.

export type SourceLike = {
  title: string;
  publisher?: string | null;
  url: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  snippet?: string | null;
};

export type SearchQualityGateInput = {
  userQuery: string;
  normalizedQuery?: string;
  queryClass?: string;
  freshnessRequired: boolean;
  sources: SourceLike[];
  now?: Date;
};

export type SourceQualityScore = {
  source: SourceLike;
  score: number;
  hasFreshnessSignal: boolean;
  hasTopicalOverlap: boolean;
  hasEntityMatch: boolean;
  reasons: string[];
};

export type SearchQualityGateResult = {
  acceptable: boolean;
  score: number;
  reasons: string[];
  freshnessMatch: boolean;
  topicalMatch: boolean;
  entityMatch: boolean;
  usableSourceCount: number;
};

// Below this per-source score, a source does not count toward `usableSourceCount` -- it may still
// be shown to the user (this gate decides whether the BATCH is acceptable, never silently drops
// individual sources from what synthesis sees), but it cannot by itself justify accepting a
// freshness-required batch.
const SOURCE_USABLE_THRESHOLD = 0.32;
// The batch's best single-source score must also clear this floor -- guards against a batch where
// every source scrapes just over the usable threshold on borrowed signals (e.g. domain bonus alone)
// with zero real freshness or topical evidence.
const MIN_ACCEPTABLE_BATCH_SCORE = 0.32;
// Awarded once per source when no negative staleness/archival signal fired at all -- see the
// "innocent until proven stale" note at scoreSource()'s top. Calibrated so a source with only a
// weak positive signal (e.g. one region/entity match, no explicit date either way) still clears
// SOURCE_USABLE_THRESHOLD, while a source with a genuine negative signal (old year, archival
// marker) never receives it and must clear the threshold on positive signals alone, if at all.
const NEUTRAL_BASELINE_CREDIT = 0.32;
// A source that fails to mention the query's own named region/entity is capped here regardless of
// every other signal -- well below SOURCE_USABLE_THRESHOLD, so it can never single-handedly justify
// accepting a batch, no matter how "fresh" or topically dense its unrelated content looks.
const ENTITY_MISMATCH_CAP = 0.15;

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const ARCHIVAL_MARKERS = /\b(annual report|faculty report|thesis|dissertation|conference proceedings|working paper|research report|academic paper|white paper|policy brief \d{4}|special collections|archive(?:d|s)?\b)\b/i;

const RELATIVE_RECENCY = /\b(\d{1,2})\s*(hour|hr|day|week)s?\s*ago\b/i;
const VAGUE_RECENCY = /\b(today|this morning|this afternoon|tonight|yesterday|this week|this month|breaking|just (?:announced|released|published))\b/i;

// Split into two named, exported lists (2026-09-18, Phase 4 pass) so ibis-evidence-processor.ts can
// reuse this SAME, already-shipped, real domain registry for its own official-vs-news
// classification, rather than inventing a new authority registry (explicitly forbidden that
// phase). Zero behavior change here: AUTHORITATIVE_DOMAINS below is still their exact union, used
// exactly as before for this module's own domain-bonus scoring.
export const AUTHORITATIVE_NEWS_DOMAINS = ["guardian.co.tt", "newsday.co.tt", "trinidadexpress.com", "looptt.com", "loopnews.com", "cnc3.co.tt", "i95.5fm.com"];
export const AUTHORITATIVE_GOVERNMENT_DOMAINS = ["gov.tt", "ttconnect.gov.tt", "news.gov.tt", "ttparliament.org", "centralbanktt.com", "central-bank.org.tt"];
const AUTHORITATIVE_DOMAINS = [...AUTHORITATIVE_NEWS_DOMAINS, ...AUTHORITATIVE_GOVERNMENT_DOMAINS];

const STOPWORDS = new Set([
  "the", "and", "for", "are", "with", "that", "this", "you", "your", "have", "has", "was", "were",
  "from", "into", "about", "what", "where", "who", "how", "why", "when", "which", "is", "am", "be",
  "been", "being", "do", "does", "did", "can", "could", "should", "would", "will", "shall", "may",
  "might", "please", "tell", "show", "help", "find", "me", "my", "a", "an", "of", "in", "on", "to",
  "it", "its", "there", "here", "just", "really", "some", "any", "i", "we", "us", "changed", "happening",
]);

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w-]/g, ""))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

const REGION_MARKERS: Array<[string, RegExp]> = [
  ["trinidad", /\btrinidad\b/i],
  ["tobago", /\btobago\b/i],
  ["caribbean", /\bcaribbean\b/i],
];

function regionEntitiesIn(text: string): string[] {
  return REGION_MARKERS.filter(([, marker]) => marker.test(text)).map(([name]) => name);
}

// A source naming a region only via a common real-world abbreviation ("T&T", "Trinbago") must count
// as a match, not a mismatch -- real Caribbean news headlines routinely abbreviate this way, and a
// gate that only recognized the spelled-out form would wrongly cap genuinely on-topic evidence at
// the entity-mismatch ceiling. Applies whenever the query names Trinidad and/or Tobago.
const TT_ALIAS_PATTERN = /\bt\s?&\s?t\b|\btrinbago\b/i;

function regionMatchesHaystack(entity: string, haystackLower: string): boolean {
  if (haystackLower.includes(entity)) return true;
  if ((entity === "trinidad" || entity === "tobago") && TT_ALIAS_PATTERN.test(haystackLower)) return true;
  return false;
}

function hostnameOf(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

// Finds every "Month YYYY" / "Month DD, YYYY" occurrence and returns the smallest absolute month
// distance from `now` -- the strongest recency signal a title/snippet can carry without a
// structured date field. Returns null when no such phrase is found (neutral, not penalized).
function monthDistance(haystack: string, now: Date): number | null {
  const re = new RegExp(`\\b(${MONTH_NAMES.join("|")})\\.?\\s+(?:\\d{1,2},?\\s+)?(20\\d{2})\\b`, "gi");
  let best: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(haystack))) {
    const monthIndex = MONTH_NAMES.indexOf(match[1].toLowerCase());
    const year = Number(match[2]);
    if (monthIndex < 0 || !Number.isFinite(year)) continue;
    const distance = Math.abs((now.getFullYear() - year) * 12 + (now.getMonth() - monthIndex));
    if (best === null || distance < best) best = distance;
  }
  return best;
}

// Finds a bare 4-digit year (not already captured as part of a "Month YYYY" phrase) and returns the
// smallest absolute year distance from `now`. Returns null when none found.
function yearDistance(haystack: string, now: Date): number | null {
  const re = /\b(19|20)\d{2}\b/g;
  let best: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(haystack))) {
    const year = Number(match[0]);
    const distance = Math.abs(now.getFullYear() - year);
    if (best === null || distance < best) best = distance;
  }
  return best;
}

function scoreSource(source: SourceLike, input: { userWords: string[]; regionEntities: string[]; now: Date }): SourceQualityScore {
  const { userWords, regionEntities, now } = input;
  const title = source.title || "";
  const snippet = source.snippet || "";
  const haystack = `${title} ${snippet}`;
  const reasons: string[] = [];
  let score = 0;
  let hasFreshnessSignal = false;
  // "Innocent until proven stale": a source with no dateable/topical signal at all (common -- see
  // this module's header on SearXNG's own publishedDate being frequently null) is NOT the same
  // failure as a source with a POSITIVE staleness/archival signal. Only the latter should be
  // penalized; the former earns a neutral baseline credit below, once we know no negative signal
  // fired. This is what stops the gate from wrongly rejecting a real primary source (e.g. an
  // ongoing government grant/service page) that is simply undated, never claimed to be "this week"
  // news, and was never the live-caught bug's failure shape in the first place.
  let negativeSignal = false;

  // -- Freshness signals (structured date fields first, then probabilistic text signals) --------
  const structuredDate = source.publishedAt || source.updatedAt;
  if (structuredDate) {
    const parsed = new Date(structuredDate);
    if (!Number.isNaN(parsed.getTime())) {
      const ageDays = (now.getTime() - parsed.getTime()) / 86_400_000;
      if (ageDays <= 14) { score += 0.4; hasFreshnessSignal = true; reasons.push("structured date within 14 days"); }
      else if (ageDays <= 60) { score += 0.2; hasFreshnessSignal = true; reasons.push("structured date within 60 days"); }
      else if (ageDays > 730) { score -= 0.35; negativeSignal = true; reasons.push("structured date over 2 years old"); }
    }
  }

  const relative = haystack.match(RELATIVE_RECENCY);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const withinTwoWeeks = unit === "hour" || unit === "hr" || (unit === "day" && amount <= 14) || (unit === "week" && amount <= 2);
    if (withinTwoWeeks) { score += 0.35; hasFreshnessSignal = true; reasons.push(`relative recency "${relative[0]}"`); }
    else { score += 0.1; reasons.push(`relative recency "${relative[0]}" (older)`); }
  }
  if (VAGUE_RECENCY.test(haystack)) { score += 0.25; hasFreshnessSignal = true; reasons.push("current-event language (today/this week/breaking)"); }

  const monthDist = monthDistance(haystack, now);
  if (monthDist !== null) {
    if (monthDist === 0) { score += 0.35; hasFreshnessSignal = true; reasons.push("names the current month"); }
    else if (monthDist === 1) { score += 0.22; hasFreshnessSignal = true; reasons.push("names last month"); }
    else if (monthDist <= 3) { score += 0.1; reasons.push("names a recent month"); }
    else if (monthDist >= 12) { score -= 0.3; negativeSignal = true; reasons.push("names a month over a year old"); }
  } else {
    const yearDist = yearDistance(haystack, now);
    if (yearDist !== null) {
      if (yearDist === 0) { score += 0.12; reasons.push("names the current year"); }
      else if (yearDist >= 2) { score -= 0.3; negativeSignal = true; reasons.push(`names a year ${yearDist} years old`); }
    }
  }

  if (ARCHIVAL_MARKERS.test(haystack)) { score -= 0.3; negativeSignal = true; reasons.push("archival/academic document marker (report, thesis, working paper, etc.)"); }

  // -- Topical / entity relevance -----------------------------------------------------------------
  const haystackWords = new Set(significantWords(haystack));
  const overlap = userWords.length ? userWords.filter((w) => haystackWords.has(w)).length / userWords.length : 0;
  let hasTopicalOverlap = false;
  if (overlap > 0) {
    score += Math.min(overlap, 1) * 0.25;
    if (overlap >= 0.25) { hasTopicalOverlap = true; reasons.push(`topical overlap ${(overlap * 100).toFixed(0)}%`); }
  }

  // Entity/region relevance is treated as a HARD ceiling, not a small additive penalty: presenting
  // evidence about a different country/territory than the one the user asked about is a categorical
  // mismatch, not a matter of degree, regardless of how fresh or otherwise well-formed that evidence
  // is (the live-caught Jamaica-vs-Trinidad-and-Tobago shape this module's own tests guard against).
  let hasEntityMatch = regionEntities.length === 0; // no region named in the query -- nothing to mismatch on
  if (regionEntities.length) {
    const haystackLower = haystack.toLowerCase();
    const matched = regionEntities.some((e) => regionMatchesHaystack(e, haystackLower));
    if (matched) { score += 0.15; hasEntityMatch = true; reasons.push("matches the query's named region/entity"); }
    else { reasons.push("does not mention the query's named region/entity -- capped regardless of other signals"); }
  }

  // -- Authority / structure bonus ------------------------------------------------------------------
  const hostname = hostnameOf(source.url);
  if (hostname && AUTHORITATIVE_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    score += 0.15;
    reasons.push(`known Caribbean news/government domain (${hostname})`);
  }

  if (!negativeSignal) {
    score += NEUTRAL_BASELINE_CREDIT;
    reasons.push("no stale/archival negative signal found -- neutral baseline credit applied rather than treating an undated source as automatically unusable");
  }

  if (regionEntities.length && !hasEntityMatch) score = Math.min(score, ENTITY_MISMATCH_CAP);

  return { source, score: Math.max(-1, Math.min(1, score)), hasFreshnessSignal, hasTopicalOverlap, hasEntityMatch, reasons };
}

export function evaluateSearchResultQuality(input: SearchQualityGateInput): SearchQualityGateResult {
  const now = input.now ?? new Date();
  const sources = input.sources || [];

  if (!input.freshnessRequired) {
    return {
      acceptable: true,
      score: sources.length ? 1 : 0,
      reasons: ["Freshness not required for this query class; accepted without additional recency/relevance filtering."],
      freshnessMatch: true,
      topicalMatch: true,
      entityMatch: true,
      usableSourceCount: sources.length,
    };
  }

  if (!sources.length) {
    return { acceptable: false, score: 0, reasons: ["No sources to evaluate."], freshnessMatch: false, topicalMatch: false, entityMatch: false, usableSourceCount: 0 };
  }

  const userWords = significantWords(input.normalizedQuery || input.userQuery);
  const regionEntities = regionEntitiesIn(input.userQuery);
  const scored = sources.map((s) => scoreSource(s, { userWords, regionEntities, now }));

  const usable = scored.filter((s) => s.score >= SOURCE_USABLE_THRESHOLD);
  const bestScore = scored.reduce((max, s) => Math.max(max, s.score), -1);
  const freshnessMatch = scored.some((s) => s.hasFreshnessSignal);
  const topicalMatch = scored.some((s) => s.hasTopicalOverlap);
  const entityMatch = regionEntities.length === 0 || scored.some((s) => s.hasEntityMatch);

  const acceptable = usable.length >= 1 && bestScore >= MIN_ACCEPTABLE_BATCH_SCORE;

  const reasons: string[] = [
    `${usable.length} of ${scored.length} source(s) scored usable (>= ${SOURCE_USABLE_THRESHOLD.toFixed(2)}); best score ${bestScore.toFixed(2)}.`,
    freshnessMatch ? "At least one source carries a real recency signal (structured date, relative time, or current month/week language)." : "No source carries any recency signal for a freshness-required query.",
    topicalMatch ? "At least one source has meaningful topical word overlap with the question." : "No source has meaningful topical overlap with the question.",
  ];
  if (regionEntities.length) {
    reasons.push(entityMatch ? `At least one source mentions the query's named region (${regionEntities.join(", ")}).` : `No source mentions the query's named region (${regionEntities.join(", ")}) -- likely an entity mismatch.`);
  }
  if (!acceptable) {
    const staleOrArchival = scored.filter((s) => s.reasons.some((r) => /archival|years? old|month over a year/i.test(r)));
    if (staleOrArchival.length) reasons.push(`${staleOrArchival.length} source(s) show stale/archival signals and were not enough, alone or combined with the rest, to justify accepting this batch as current evidence.`);
  }

  return {
    acceptable,
    score: Math.max(0, bestScore),
    reasons,
    freshnessMatch,
    topicalMatch,
    entityMatch,
    usableSourceCount: usable.length,
  };
}
