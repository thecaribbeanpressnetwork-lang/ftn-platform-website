// FTN / IBIS Canonical Architecture -- Phase 1 (additive contract) + Phase 2 (canonical temporal
// authority). See GOVERNANCE/FTN_IBIS_Canonical_Architecture_2026-09-18.md and the companion
// implementation plan.
//
// Phase 1 audit (kept for history): the canonical request input type is CanonicalRequest
// (ibis-canonical-brain.ts); query classification is QueryClass (ibis-response-envelope.ts) and
// IntentClassification/IntentSignals (ibis-intent-router.ts), reused directly, not duplicated; no
// entity/geography resolver exists anywhere in the codebase (ibis-ftn-disambiguation.ts resolves
// exactly one named entity, the literal string "FTN"; the search adapter/normalizer's region
// detection is provider-facing query construction that defaults to Trinidad and Tobago when nothing
// is mentioned, which would silently invent a geography this contract must never invent) --
// RequestFrame.entities/.geography stay [] and null, honest placeholders, until a real resolver
// exists.
//
// Phase 2 (this pass) replaces Phase 1's shadow-only, raw-text `classifyTemporalRequirement()` with
// `resolveTemporalRequirement()` (ibis-temporal-resolver.ts): real ISO-resolved bounds, explicit
// timezone handling, and injected-clock determinism. `requiresFreshEvidence` is now DERIVED from
// `temporalRequirement.strictness` via `requiresFreshEvidenceFor()` -- the single temporal authority
// every consumer (ibis-canonical-brain.ts, ibis-search-adapter.ts, ibis-lifecycle-store.ts's
// ExecutionInstruction/PlanRecord.freshnessRequired, ibis-assistant/index.ts's legacy-route safety
// net) now reads, instead of each independently recomputing `queryClass === "CURRENT_WEB_RESEARCH"`.
// See ibis-temporal-resolver.ts's own header for the full period-semantics/timezone/strictness
// documentation -- this file only wires that resolver into RequestFrame construction.

import type { QueryClass } from "./ibis-response-envelope.ts";
import type { IntentClassification } from "./ibis-intent-router.ts";
import {
  resolveTemporalRequirement, requiresFreshEvidenceFor, DEFAULT_TIMEZONE,
  type TemporalRequirement, type TemporalRequirementType, type TemporalStrictness, type TimezoneSource,
} from "./ibis-temporal-resolver.ts";

// Re-exported for backward compatibility -- Phase 1 code importing these types from
// ibis-request-frame.ts (this file) keeps working; their canonical home is now the resolver module.
export type { TemporalRequirement, TemporalRequirementType, TemporalStrictness, TimezoneSource };

// Honest placeholders for future phases -- no resolver for either exists yet (see the Phase 1 audit
// note above). Typed now so later phases have a stable shape to populate, per Phase 1's explicit goal
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
// like "LOW" here would be inventing a judgment this phase has no basis for.
export type ConsequenceLevel = "LOW" | "MEDIUM" | "HIGH" | "UNRESOLVED";

// The canonical, provider-independent request contract. Deliberately carries no provider, model, or
// search-engine name anywhere -- SearXNG/Claude/Brave/Gemini/Cloudflare/Bytez selection is an
// EXECUTION decision made later (Execution Broker / Synthesis Router in the frozen architecture),
// never part of this contract.
export type RequestFrame = {
  requestId: string;
  rawQuery: string;

  // The classifier's own free-text objective when one was extracted (PATHWAY/PLACE/RELATIONSHIP/
  // FOUNDER_STRATEGY/RETRODICTION classes) -- null otherwise. Deliberately nullable: inventing a
  // non-null placeholder would misrepresent the real absence of an extracted objective for e.g. an
  // ordinary SIMPLE_TEXT or CURRENT_WEB_RESEARCH query.
  intent: string | null;
  queryClass: QueryClass;

  // Always [] / null -- see the Phase 1 audit note above. Never an inferred/default value.
  entities: ResolvedEntity[];
  geography: GeographyConstraint | null;

  temporalRequirement: TemporalRequirement;

  outputType: OutputType;
  consequenceLevel: ConsequenceLevel;

  requiresExternalAction: boolean;
  requiresFreshEvidence: boolean;
  requiresDeterministicEngine: boolean;
};

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
  // -- the SAME function ibis-canonical-brain.ts already calls when building reasoningSynthesis.
  // Passed in as a plain boolean rather than re-imported and re-invoked here, so this module never
  // runs a second, possibly out-of-sync deterministic check.
  isDeterministicAnswer: boolean;
  // Phase 2 clock/timezone injection (see ibis-temporal-resolver.ts's own mandate: no unpredictable
  // `new Date()` calls scattered through the parser). `now` defaults to the real current time in
  // production; every test passes a fixed value for determinism. `timezone`/`timezoneSource` default
  // to UTC/DEFAULT_FALLBACK -- audited and confirmed no client or session anywhere in this codebase
  // currently sends a timezone (see ibis-temporal-resolver.ts's header for the full audit and the
  // Phase 2 report for the disclosed limitation this leaves). Never defaults to Trinidad and Tobago's
  // zone merely because ibis is Caribbean-focused -- that would silently misrepresent precision this
  // system does not have for a caller anywhere else in the world.
  now?: Date;
  timezone?: string;
  timezoneSource?: TimezoneSource;
};

// Builds a RequestFrame entirely from state ibis-canonical-brain.ts has already computed by the time
// this is called (classifyIntent()'s output, deterministicAnswer()'s result) plus the injected clock/
// timezone. No second classification pass, no search, no provider call, no added latency -- a pure,
// synchronous function over already-in-memory values (resolveTemporalRequirement() is itself pure
// date arithmetic, never I/O).
export function buildRequestFrame(input: BuildRequestFrameInput): RequestFrame {
  const { requestId, text, intent, isDeterministicAnswer } = input;
  const rawQuery = (text || "").trim();
  const now = input.now ?? new Date();
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const timezoneSource: TimezoneSource = input.timezoneSource ?? "DEFAULT_FALLBACK";

  const temporalRequirement = resolveTemporalRequirement({
    query: rawQuery, now, timezone, timezoneSource, freshnessSignalMatched: intent.signals.freshness,
  });

  return {
    requestId,
    rawQuery,
    intent: intent.objective,
    queryClass: intent.queryClass,
    entities: [],
    geography: null,
    temporalRequirement,
    outputType: outputTypeFor(intent.queryClass),
    consequenceLevel: "UNRESOLVED",
    requiresExternalAction: intent.queryClass === "TOOL_ACTION",
    // Phase 2: derived from the resolved TemporalRequirement, the single temporal authority -- no
    // longer an independent `queryClass === "CURRENT_WEB_RESEARCH"` check. See
    // requiresFreshEvidenceFor()'s own doc comment in ibis-temporal-resolver.ts.
    requiresFreshEvidence: requiresFreshEvidenceFor(temporalRequirement),
    requiresDeterministicEngine: isDeterministicAnswer,
  };
}
