// FTN / IBIS Canonical Architecture -- Phase 1: the RequestFrame contract (additive, non-behavioral).
//
// See GOVERNANCE/FTN_IBIS_Canonical_Architecture_2026-09-18.md (the frozen target architecture) and
// GOVERNANCE/FTN_IBIS_Canonical_Architecture_Implementation_Plan_2026-09-18.md (this phase's exact
// scope and exit criteria). This module does exactly one thing: define the RequestFrame type and a
// pure, zero-latency adapter, buildRequestFrame(), that derives it from what ibis-intent-router.ts's
// classifyIntent() and ibis-intelligence-gateway.ts's deterministicAnswer() ALREADY compute today.
//
// Audit performed before writing this file (per Phase 1's explicit instruction to reuse existing
// types rather than duplicate them):
//   - Canonical request input type: CanonicalRequest (ibis-canonical-brain.ts) -- the
//     canonical_query endpoint's actual input shape (text, products, providers, ...). RequestFrame
//     is NOT a replacement for this; it is a derived, provider-independent VIEW built from the
//     already-computed classification of one such request.
//   - Query classification type: QueryClass (ibis-response-envelope.ts) -- reused directly, not
//     duplicated. IntentClassification / IntentSignals (ibis-intent-router.ts) -- reused directly as
//     buildRequestFrame()'s primary input; no new classification logic is added here.
//   - Freshness flag: `freshnessRequired = intent.queryClass === "CURRENT_WEB_RESEARCH"`
//     (ibis-canonical-brain.ts) remains the SOLE production authority for search-cascade behavior.
//     RequestFrame.requiresFreshEvidence is defined to EQUAL this exact boolean (not an independently
//     computed value) so this phase introduces zero risk of a second, divergent freshness signal.
//     The richer TemporalRequirement below is a genuinely additive, shadow-only representation.
//   - Geography/entity fields: audited and confirmed NOT to exist anywhere in the codebase today.
//     ibis-ftn-disambiguation.ts resolves exactly one named entity (the literal string "FTN"), not a
//     general entity resolver. ibis-search-quality-gate.ts's regionEntitiesIn()/
//     ibis-search-query-normalizer.ts's regionPhrase() detect Trinidad/Tobago/Caribbean mentions for
//     SEARCH-QUERY CONSTRUCTION only (provider-facing, not provider-independent) and default to
//     Trinidad and Tobago when nothing is mentioned -- reusing that default here would silently
//     invent a geography ibis-request-frame.ts must never invent (see the explicit "no invented
//     geography" test below). RequestFrame.entities/.geography are therefore honest placeholders in
//     this phase: [] and null respectively, always -- never a guess.
//   - Canonical-query endpoint input / browser-client equivalents: CanonicalRequest (server) and
//     js/ibis-universal-router.js (browser-side capability/agent selection -- a genuinely different,
//     already-documented system per ibis-intent-router.ts's own header comment, not duplicated here
//     and not touched by this phase).
//   - No duplicated types were found in `_shared` for any of the above; nothing pre-existing is
//     replaced by this file.
//
// Deliberately NOT done in this phase (see the implementation plan's explicit non-goals): nothing in
// the canonical brain reads or branches on RequestFrame yet. It is computed once per request and
// attached to the response envelope's `receipt` purely for observability (see
// ibis-canonical-brain.ts's call site) -- existing execution continues to use intent/capabilityPlan/
// freshnessRequired exactly as before.

import type { QueryClass } from "./ibis-response-envelope.ts";
import type { IntentClassification } from "./ibis-intent-router.ts";

// Honest placeholders for future phases -- no resolver for either exists yet (see the audit note
// above). Typed now so later phases have a stable shape to populate, per this phase's explicit goal
// of being "stable enough for later EvidenceContract / EvidencePacket work."
export type ResolvedEntity = {
  name: string;
  type: string;
  confidence: "RESOLVED" | "AMBIGUOUS";
};

export type GeographyConstraint = {
  region: string;
  raw: string;
};

export type TemporalRequirementType =
  | "TIMELESS"
  | "CURRENT"
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "DATE_RANGE"
  | "AS_OF"
  | "LATEST_AVAILABLE"
  | "HISTORICAL";

// NONE: no freshness requirement at all (TIMELESS/HISTORICAL). HIGH: an explicit, narrow window
// (today/this week/an explicit date range or as-of date) where stale evidence is a real failure, not
// a matter of degree. MEDIUM: a looser currentness expectation (this month, "latest available"
// figures where "available" itself concedes the true publish date may lag) where a source a few
// weeks old is still legitimate evidence, unlike the live-caught 2018/2019-report bug this session's
// Search Quality Gate pass fixed for the HIGH case.
export type TemporalStrictness = "NONE" | "MEDIUM" | "HIGH";

export type TemporalRequirement = {
  type: TemporalRequirementType;
  // Raw, non-normalized text as captured from the query -- e.g. "January and March 2026" for a
  // DATE_RANGE, or "September 2026" for an AS_OF. Deliberately NOT parsed into ISO dates in this
  // phase: inventing a resolved calendar date from an ambiguous phrase (e.g. "March" with no year)
  // would be exactly the kind of fabrication Phase 1 must not do. Real date resolution is future
  // work, once this type already exists and is stable to extend.
  start: string | null;
  end: string | null;
  asOf: string | null;
  relativeExpression: string | null;
  strictness: TemporalStrictness;
};

// Derived, deterministic view of an already-classified QueryClass -- GENERATION and TOOL_ACTION are
// the only classes with a non-text output shape today. GENERATION exists in the QueryClass enum but
// (confirmed by reading ibis-intent-router.ts's classifyIntent() in full) no classifier branch ever
// returns it -- the same "defined enum value, currently unreachable" situation CORRELATION and
// TOOL_ACTION were in before their own markers were wired, per that file's own comments. Included
// here for completeness/forward-compatibility, not because it fires today.
export type OutputType = "TEXT" | "ARTIFACT" | "ACTION_RESULT";

// UNRESOLVED, not a guessed default: consequence/risk assessment is explicitly a Decision Gate
// responsibility in the frozen architecture (see the architecture doc's Box 2 and the implementation
// plan's Phase 8/9), and no such assessment exists anywhere in the codebase today. Forcing a value
// like "LOW" here would be inventing a judgment this phase has no basis for -- the exact thing Phase
// 1's own instructions warn against ("If current architecture does not yet resolve a field, represent
// that truthfully").
export type ConsequenceLevel = "LOW" | "MEDIUM" | "HIGH" | "UNRESOLVED";

// The canonical, provider-independent request contract (Phase 1). Deliberately carries no provider,
// model, or search-engine name anywhere -- SearXNG/Claude/Brave/Gemini/Cloudflare/Bytez selection is
// an EXECUTION decision made later (Execution Broker / Synthesis Router in the frozen architecture),
// never part of this contract.
export type RequestFrame = {
  requestId: string;
  rawQuery: string;

  // The classifier's own free-text objective when one was extracted (PATHWAY/PLACE/RELATIONSHIP/
  // FOUNDER_STRATEGY/RETRODICTION classes) -- null otherwise. Deliberately nullable, unlike the
  // illustrative schema in this phase's own instructions: IntentClassification.objective is already
  // `string | null` today, and inventing a non-null placeholder here would misrepresent the real
  // absence of an extracted objective for e.g. an ordinary SIMPLE_TEXT or CURRENT_WEB_RESEARCH query.
  intent: string | null;
  queryClass: QueryClass;

  // Always [] / null in this phase -- see the audit note above. Never an inferred/default value.
  entities: ResolvedEntity[];
  geography: GeographyConstraint | null;

  temporalRequirement: TemporalRequirement;

  outputType: OutputType;
  consequenceLevel: ConsequenceLevel;

  requiresExternalAction: boolean;
  requiresFreshEvidence: boolean;
  requiresDeterministicEngine: boolean;
};

const MONTH_NAMES = "january|february|march|april|may|june|july|august|september|october|november|december";

// A "between X and Y" / "from X to Y" span only counts as a date range when a year or month name
// actually appears inside each side of the span -- otherwise this would false-positive on completely
// unrelated phrasing like "the relationship between the ministry and the agency" (a real ECOMAP
// RELATIONSHIP-class question, not a temporal one). Checked before HISTORICAL/AS_OF so an explicit
// range is never mistaken for a single bare year.
const DATE_RANGE_PATTERN = new RegExp(
  `\\b(?:between|from)\\s+([^,.?!]*?(?:${MONTH_NAMES}|\\d{4})[^,.?!]*?)\\s+(?:and|to)\\s+([^,.?!]*?(?:${MONTH_NAMES}|\\d{4})[^,.?!]*)`,
  "i",
);
const AS_OF_PATTERN = /\bas of\s+([^.?!]+)/i;
const BARE_YEAR_PATTERN = /\b(19\d{2}|20\d{2})\b/;
const LATEST_AVAILABLE_PATTERN = /\blatest available\b|\bmost recently available\b|\b(?:latest|most recent)\b[^.?!]{0,30}\b(?:figures?|data|statistics|numbers?|indicators?|report)\b/i;
const TODAY_PATTERN = /\btoday\b|\bright now\b|\bthis (?:morning|afternoon|evening|tonight)\b/i;
const THIS_WEEK_PATTERN = /\bthis week\b/i;
const THIS_MONTH_PATTERN = /\bthis month\b/i;

function currentYear(): number {
  return new Date().getFullYear();
}

// Pure, text-pattern-only classification -- deliberately independent of (never reads)
// intent.queryClass, since its entire purpose (per the architecture doc) is to eventually carry more
// nuance than the single CURRENT_WEB_RESEARCH class can. `freshnessSignalMatched` is the ALREADY
// -computed IntentSignals.freshness boolean (reused, not recomputed) and is used only as the final,
// generic fallback (`CURRENT`) when none of the more specific patterns below match, so a query the
// existing classifier already treats as needing live evidence is never silently classified TIMELESS
// here merely because it used different freshness wording than the specific patterns recognize.
export function classifyTemporalRequirement(text: string, freshnessSignalMatched: boolean): TemporalRequirement {
  const q = text || "";

  const rangeMatch = q.match(DATE_RANGE_PATTERN);
  if (rangeMatch) {
    return { type: "DATE_RANGE", start: rangeMatch[1].trim(), end: rangeMatch[2].trim(), asOf: null, relativeExpression: null, strictness: "HIGH" };
  }

  const asOfMatch = q.match(AS_OF_PATTERN);
  if (asOfMatch) {
    return { type: "AS_OF", start: null, end: null, asOf: asOfMatch[1].trim(), relativeExpression: null, strictness: "HIGH" };
  }

  if (LATEST_AVAILABLE_PATTERN.test(q)) {
    return { type: "LATEST_AVAILABLE", start: null, end: null, asOf: null, relativeExpression: "latest available", strictness: "MEDIUM" };
  }

  if (TODAY_PATTERN.test(q)) {
    return { type: "TODAY", start: null, end: null, asOf: null, relativeExpression: "today", strictness: "HIGH" };
  }

  if (THIS_WEEK_PATTERN.test(q)) {
    return { type: "THIS_WEEK", start: null, end: null, asOf: null, relativeExpression: "this week", strictness: "HIGH" };
  }

  if (THIS_MONTH_PATTERN.test(q)) {
    return { type: "THIS_MONTH", start: null, end: null, asOf: null, relativeExpression: "this month", strictness: "MEDIUM" };
  }

  // A bare year, checked only after every more-specific pattern above has had a chance to match (so
  // "as of September 2026" or a "between ... and ..." range is never mistaken for a plain historical
  // year mention), and only when it is NOT the current year (a bare mention of the current year, with
  // no other freshness language, carries no reliable temporal signal either way and is left to the
  // generic freshness fallback below).
  const yearMatch = q.match(BARE_YEAR_PATTERN);
  if (yearMatch && Number(yearMatch[1]) < currentYear()) {
    return { type: "HISTORICAL", start: null, end: null, asOf: null, relativeExpression: yearMatch[1], strictness: "NONE" };
  }

  if (freshnessSignalMatched) {
    return { type: "CURRENT", start: null, end: null, asOf: null, relativeExpression: null, strictness: "MEDIUM" };
  }

  return { type: "TIMELESS", start: null, end: null, asOf: null, relativeExpression: null, strictness: "NONE" };
}

function outputTypeFor(queryClass: QueryClass): OutputType {
  if (queryClass === "GENERATION") return "ARTIFACT";
  if (queryClass === "TOOL_ACTION") return "ACTION_RESULT";
  return "TEXT";
}

export type BuildRequestFrameInput = {
  requestId: string;
  text: string;
  intent: IntentClassification;
  // Reused directly from ibis-intelligence-gateway.ts's already-existing deterministicAnswer() check
  // -- the SAME function ibis-canonical-brain.ts already calls when building reasoningSynthesis
  // (`isDeterministicAnswer: !!deterministicAnswer(text, products)`). Passed in as a plain boolean
  // rather than re-imported and re-invoked here, so this module never runs a second, possibly
  // out-of-sync deterministic check -- the caller computes it once and this function just records it.
  isDeterministicAnswer: boolean;
};

// The Phase 1 adapter: builds a RequestFrame entirely from state ibis-canonical-brain.ts has already
// computed by the time this is called (classifyIntent()'s output, deterministicAnswer()'s result).
// No second classification pass, no search, no provider call, no added latency -- a pure,
// synchronous function over already-in-memory values.
export function buildRequestFrame(input: BuildRequestFrameInput): RequestFrame {
  const { requestId, text, intent, isDeterministicAnswer } = input;
  const rawQuery = (text || "").trim();

  return {
    requestId,
    rawQuery,
    intent: intent.objective,
    queryClass: intent.queryClass,
    entities: [],
    geography: null,
    temporalRequirement: classifyTemporalRequirement(rawQuery, intent.signals.freshness),
    outputType: outputTypeFor(intent.queryClass),
    consequenceLevel: "UNRESOLVED",
    requiresExternalAction: intent.queryClass === "TOOL_ACTION",
    // Deliberately EQUAL to ibis-canonical-brain.ts's own `freshnessRequired` computation
    // (`queryClass === "CURRENT_WEB_RESEARCH"`), not an independent judgment -- see this file's
    // header note on why Phase 1 must not create a second, potentially divergent freshness signal.
    requiresFreshEvidence: intent.queryClass === "CURRENT_WEB_RESEARCH",
    requiresDeterministicEngine: isDeterministicAnswer,
  };
}
