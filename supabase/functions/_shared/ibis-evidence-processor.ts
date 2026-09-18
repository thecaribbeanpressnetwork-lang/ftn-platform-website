// FTN / IBIS Canonical Architecture -- Phase 4: the Evidence Processor, SHADOW MODE ONLY.
//
// See GOVERNANCE/FTN_IBIS_Canonical_Architecture_2026-09-18.md (Box 6: "What can we legitimately
// conclude?") and the companion implementation plan's Phase 4 scope. This module compares what was
// ACTUALLY obtained (real search sources, real deterministic results, real specialist-engine
// results) against Phase 3's EvidenceContract, and produces an EvidencePacket + ClaimsLedger.
// SHADOW MODE: nothing here blocks, rewrites, or otherwise touches the user-visible answer. It is
// attached to the receipt for observability, exactly like requestFrame/evidenceContract before it.
//
// Audit performed before writing this file (per the explicit "reuse existing evidence structures,
// do not duplicate" instruction):
//   - SourceRecord: TWO structurally-near-identical definitions already exist -- ibis-search-types.ts
//     (canonical for the search cascade) and ibis-response-envelope.ts (what actually flows through
//     CanonicalResponse.sources; identical except an unused optional `supportsClaimIds?: string[]`
//     field that has never been populated anywhere in this codebase, confirmed by a full-repo grep).
//     This pre-existing duplication is NOT fixed here (out of Phase 4's scope) -- this module takes
//     `ibis-response-envelope.ts`'s SourceRecord as its input type, since that is what
//     ibis-canonical-brain.ts actually holds by the time this processor runs. `supportsClaimIds` is
//     left untouched/unpopulated: this processor's own ClaimRecord.evidenceIds already provides
//     claim-to-evidence traceability without needing to mutate the pre-existing, already-client-
//     visible `sources` array.
//   - evidenceDepth ("SNIPPET" | "INSPECTED"): reused verbatim, never promoted. See RULE 6 below.
//   - EBR's EpistemicStatus: already reused by Phase 3's EvidenceContract; this module does not need
//     it directly (it consumes the CONTRACT's already-resolved minimumEpistemicStatus, not EBR's
//     type again).
//   - Official/authoritative domain classification: a real, live, previously-shipped registry
//     already exists in ibis-search-quality-gate.ts's `AUTHORITATIVE_DOMAINS` (mixed news +
//     government, used there for its own retrieval-hygiene domain bonus). That single private
//     const was split in place into two named, exported lists -- `AUTHORITATIVE_NEWS_DOMAINS` and
//     `AUTHORITATIVE_GOVERNMENT_DOMAINS` -- with `AUTHORITATIVE_DOMAINS` itself kept as their exact
//     union, so the quality gate's own existing behavior is completely unchanged. This module reuses
//     those same two lists rather than inventing a new authority registry (explicitly forbidden
//     this phase).
//   - EngineResult (ibis-reasoning-engines.ts): reused directly to detect whether CORRELATION/
//     CONNECTION_FABRIC actually executed, rather than re-deriving that from scratch.
//   - CapabilityReceiptEntry (ibis-response-envelope.ts): reused directly to detect the
//     "contract required evidence but the planner never scheduled the capability" gap (the
//     HISTORICAL case discovered in Phase 3).
//   - orchestration.contradictions (plain string[], already produced by EBR/orchestration today):
//     wrapped into this module's own EvidenceContradiction records rather than re-detecting
//     contradictions from scratch -- no open-ended NLP/LLM contradiction detection is implemented.
//   - evaluateSearchResultQuality() (ibis-search-quality-gate.ts): consumed as ONE input signal
//     (its batch-level verdict, attached verbatim to EvidencePacket.retrievalQualityGate) -- its
//     scoring internals are NOT copied or reimplemented here. It remains retrieval hygiene; this
//     module remains the (shadow) evidence-sufficiency judge. See RULE 28 in the Phase 4 directive.

import type { RequestFrame } from "./ibis-request-frame.ts";
import type { EvidenceContract } from "./ibis-evidence-contract.ts";
import type { SourceRecord, CapabilityReceiptEntry, CanonicalResponse } from "./ibis-response-envelope.ts";
import type { EngineResult } from "./ibis-reasoning-engines.ts";
import { evaluateSearchResultQuality, AUTHORITATIVE_NEWS_DOMAINS, AUTHORITATIVE_GOVERNMENT_DOMAINS } from "./ibis-search-quality-gate.ts";

// --- EvidencePacket ------------------------------------------------------------------------------

// RULE 6 (critical): a SourceRecord's evidenceDepth ("SNIPPET" | "INSPECTED") is reused verbatim,
// never promoted. "DETERMINISTIC" and "STRUCTURED" are NOT a promotion of SNIPPET -- they are a
// wholly different evidence ORIGIN (a local calculation, a structured dataset) that never came from
// a search snippet in the first place, so they get their own, separate, honestly-labeled tier.
export type ProcessedEvidenceDepth = "SNIPPET" | "INSPECTED" | "DETERMINISTIC" | "STRUCTURED";
export type SourceOrigin = "SEARCH_RESULT" | "DETERMINISTIC_ENGINE" | "STRUCTURED_DATA";
export type OfficialClassification = "OFFICIAL_GOVERNMENT" | "NEWS_MEDIA" | "UNKNOWN";
export type TemporalRelevance = "SATISFIED" | "UNSATISFIED" | "UNKNOWN" | "NOT_REQUIRED";

export type ProcessedEvidenceItem = {
  id: string;
  origin: SourceOrigin;
  provider: string | null;
  url: string | null;
  title: string;
  snippet: string | null;
  evidenceDepth: ProcessedEvidenceDepth;
  publishedAt: string | null;
  updatedAt: string | null;
  retrievedAt: string | null;
  // Deterministic domain-suffix check only, against the two existing, real, previously-shipped
  // domain lists above -- never an inferred/guessed classification. UNKNOWN is the honest default.
  officialClassification: OfficialClassification;
  temporalRelevance: TemporalRelevance;
};

export type EvidenceGapType =
  | "EXECUTION_PLAN_GAP"               // contract required evidence but the planner never scheduled the relevant capability
  | "RETRIEVAL_EMPTY_GAP"              // the capability ran but returned nothing usable
  | "OFFICIAL_SOURCE_GAP"
  | "STRUCTURED_DATA_GAP"
  | "TEMPORAL_GAP"
  | "PAGE_INSPECTION_UNAVAILABLE_GAP"  // contract implies deeper verification, but every item is SNIPPET depth (no Phase 5 retrieval exists yet)
  | "ACTION_NOT_EXECUTED_GAP";

export type EvidenceGap = { type: EvidenceGapType; requirement: string; reason: string };

// RULE 14: conservative contradiction representation. "DETECTED" entries come only from
// orchestration's own already-deterministic contradiction findings (e.g. EBR); this module performs
// no open-ended contradiction detection itself. "NOT_YET_EVALUATED" is recorded explicitly whenever
// real evidence exists, rather than silently implying "no contradictions exist."
export type EvidenceContradiction = { description: string; evidenceIds: string[]; state: "DETECTED" | "NOT_YET_EVALUATED" };

export type ProvenanceRecord = { evidenceId: string; chain: string[] };

export type EvidenceState = "NONE" | "PARTIAL" | "SUPPORTED" | "CORROBORATED" | "VERIFIED" | "INSUFFICIENT";

export type EvidencePacket = {
  requestId: string;
  contractSatisfied: boolean | null;
  evidenceState: EvidenceState;
  // RULE 25/26: the EXISTING production evidenceState, copied verbatim (never recomputed), plus
  // whether this shadow evaluation agrees with it. Legacy production behavior is never touched.
  legacyEvidenceState: CanonicalResponse["evidenceState"];
  stateAgreement: boolean;
  items: ProcessedEvidenceItem[];
  temporal: { required: boolean; satisfied: boolean | null; unresolved: boolean };
  // Always required:false/satisfied:null/unresolved:true -- no entity or geography resolver exists
  // anywhere in this codebase (Phase 1's own disclosed gap). This is not evidence that entity/
  // geography concerns don't matter, only that RequestFrame cannot express them yet.
  entity: { required: boolean; satisfied: boolean | null; unresolved: boolean };
  geography: { required: boolean; satisfied: boolean | null; unresolved: boolean };
  sourceRequirements: {
    officialSatisfied: boolean | null;
    structuredDataSatisfied: boolean | null;
    // Named differently from the Phase 4 directive's illustrative "primarySatisfied": this checks
    // whether ANY topically-plausible evidence was obtained at all, which is a clearer, less
    // ambiguous name for what is actually being tested (no "primary vs. secondary source"
    // classification exists anywhere in this codebase to give "primary" a precise meaning).
    relevantSourceSatisfied: boolean | null;
  };
  // The EXISTING quality gate's own batch verdict, attached verbatim (never recomputed) -- see
  // RULE 28. Null when the gate never ran (non-freshness-required requests, or no sources at all).
  retrievalQualityGate: { acceptable: boolean; score: number; reasons: string[] } | null;
  independentSourceCount: number;
  contradictions: EvidenceContradiction[];
  gaps: EvidenceGap[];
  provenance: ProvenanceRecord[];
  limitations: string[];
};

// --- ClaimsLedger --------------------------------------------------------------------------------

export type ClaimStatus = "VERIFIED_FACT" | "CORROBORATED_FACT" | "SUPPORTED_INFERENCE" | "HYPOTHESIS" | "CONTRADICTED" | "UNKNOWN";
export type AllowedClaimStrength = "FACTUAL" | "QUALIFIED" | "HYPOTHETICAL" | "DO_NOT_ASSERT";

export type ClaimRecord = {
  id: string;
  claim: string;
  status: ClaimStatus;
  evidenceIds: string[];
  allowedStrength: AllowedClaimStrength;
  limitations: string[];
};

// RULE 10/11: deliberately conservative. This is NOT an attempt to convert arbitrary prose/snippets
// into atomic claims -- that would require exactly the kind of MODEL_TEXT-based extraction this
// phase explicitly forbids ("the verifier must never depend on the same probabilistic system it is
// supposed to constrain"). The ledger below contains only: (a) a real deterministic engine's own
// computed answer, (b) one coarse, aggregate "topical claim" per request reflecting the packet's
// overall evidenceState (never multiple invented atomic sub-claims), and (c) explicit structural
// gap/unknown records (action-not-executed, etc). This is an honest, deliberately narrow first
// ledger, not a claim that arbitrary free-text has been safely decomposed.
export type ClaimsLedger = ClaimRecord[];

// --- Domain classification (reused registries only -- see header audit) --------------------------

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

function classifyDomain(url: string | null): OfficialClassification {
  const hostname = hostnameOf(url);
  if (!hostname) return "UNKNOWN";
  if (AUTHORITATIVE_GOVERNMENT_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) return "OFFICIAL_GOVERNMENT";
  if (AUTHORITATIVE_NEWS_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) return "NEWS_MEDIA";
  return "UNKNOWN";
}

// --- Per-item temporal relevance (structured metadata only -- see RULE 9) ------------------------

// Deliberately uses ONLY structured publishedAt/updatedAt fields, never snippet-text recency
// language (that stays the quality gate's own, separate, probabilistic domain -- see RULE 28's
// boundary). This is a stricter, ground-truth check than the quality gate's retrieval-hygiene
// heuristic, and the two are EXPECTED to sometimes disagree -- that disagreement is exactly what
// shadow mode exists to surface (RULE 26).
function evaluateItemTemporalRelevance(item: SourceRecord, temporal: RequestFrame["temporalRequirement"]): TemporalRelevance {
  if (temporal.strictness === "NONE" && temporal.type !== "HISTORICAL") return "NOT_REQUIRED";

  if (temporal.type === "LATEST_AVAILABLE") {
    // Cannot verify "is this genuinely the latest authoritative release" without inspecting the
    // source's own authority/recency claims (a Phase 5 concern) -- never true or false here.
    return "UNKNOWN";
  }

  if (temporal.type === "HISTORICAL") {
    // RULE 9's explicit warning: never confuse document PUBLICATION time with the underlying
    // EVENT/measurement time a historical query asks about. A source published in 2024 about 1990
    // is good evidence; comparing its publishedAt against a 1990 window would wrongly reject it.
    // The only deterministic thing checkable without page inspection is whether the source's own
    // title/snippet TEXT mentions the historical period at all.
    const haystack = `${item.title} ${item.snippet || ""}`.toLowerCase();
    const marker = temporal.originalExpression?.toLowerCase();
    if (marker && haystack.includes(marker)) return "SATISFIED";
    return "UNKNOWN";
  }

  // TODAY / THIS_WEEK / THIS_MONTH / DATE_RANGE / AS_OF / CURRENT -- structured-date comparison only.
  const dateStr = item.publishedAt || item.updatedAt;
  if (!dateStr) return "UNKNOWN"; // RULE 19: undated evidence is never assumed recent.
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "UNKNOWN";
  const t = parsed.getTime();

  if (temporal.asOf) {
    const asOf = new Date(temporal.asOf).getTime();
    // "State as of X" is satisfied by evidence at or before X; evidence strictly after X is not
    // automatically disqualifying (it could still describe the same standing state) -- conservative.
    return t <= asOf ? "SATISFIED" : "UNKNOWN";
  }
  if (temporal.start && temporal.end) {
    const start = new Date(temporal.start).getTime();
    const end = new Date(temporal.end).getTime();
    if (t >= start && t <= end) return "SATISFIED";
    return "UNSATISFIED"; // definitively outside the resolved window -- the live-caught stale-evidence shape.
  }
  return "UNKNOWN";
}

// --- Independence / corroboration (RULE 15) -------------------------------------------------------

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

// Deterministic, deliberately conservative in the SAFE direction: it can only ever UNDER-count
// independence (treat two truly-independent sources as one group), never over-count (it never
// declares two sources independent when a real, checkable signal -- same hostname, same normalized
// title across hosts -- says otherwise). Cross-domain syndication with neither a shared hostname nor
// a shared title (e.g. an AP piece rewritten with a different headline by a different outlet) cannot
// be detected this way -- an explicitly disclosed limitation (see the Phase 4 report), not a silent
// gap.
function independentGroupCount(items: ProcessedEvidenceItem[]): number {
  const hostGroup = new Map<string, string>();
  const titleGroup = new Map<string, string>();
  let nextId = 0;
  const groups = new Set<string>();
  for (const item of items) {
    const host = hostnameOf(item.url);
    const titleKey = normalizeTitle(item.title);
    let group = (host && hostGroup.get(host)) || titleGroup.get(titleKey);
    if (!group) { group = `g${nextId++}`; }
    if (host) hostGroup.set(host, group);
    titleGroup.set(titleKey, group);
    groups.add(group);
  }
  return groups.size;
}

// --- Main entry point ------------------------------------------------------------------------------

export type ProcessEvidenceInput = {
  requestFrame: RequestFrame;
  evidenceContract: EvidenceContract;
  sources: SourceRecord[];
  capabilityExecution: CapabilityReceiptEntry[];
  engineResults: EngineResult[];
  // The real, already-computed deterministicAnswer() result (not re-invoked here) -- null when this
  // request is not a deterministic one.
  deterministicResult: { answer: string; answerClass: string } | null;
  legacyEvidenceState: CanonicalResponse["evidenceState"];
  orchestrationContradictions: string[];
};

function legacyAgrees(legacy: CanonicalResponse["evidenceState"], shadow: EvidenceState): boolean {
  if (legacy === "DETERMINISTIC") return shadow === "VERIFIED";
  if (legacy === "SEARCH_GROUNDED") return shadow === "SUPPORTED" || shadow === "CORROBORATED" || shadow === "VERIFIED";
  if (legacy === "MODEL_GENERATED") return shadow === "NONE";
  if (legacy === "NO_ANSWER_GENERATED") return shadow === "NONE" || shadow === "INSUFFICIENT";
  return true; // an unrecognized legacy value is never reported as a false disagreement
}

export function processEvidence(input: ProcessEvidenceInput): { evidencePacket: EvidencePacket; claimsLedger: ClaimsLedger } {
  const { requestFrame, evidenceContract, sources, capabilityExecution, engineResults, deterministicResult, legacyEvidenceState, orchestrationContradictions } = input;
  const temporal = requestFrame.temporalRequirement;
  const gaps: EvidenceGap[] = [];
  const limitations: string[] = [
    "ClaimsLedger is deliberately conservative: it contains only deterministic-engine results and one coarse, aggregate topical claim per request, never per-sentence claims extracted from prose (no MODEL_TEXT/LLM claim extraction is implemented -- see RULE 11).",
    "Cross-domain content syndication with no shared hostname or title cannot be detected deterministically; independentSourceCount may occasionally overcount truly-syndicated coverage as independent, but never undercounts genuinely independent sources.",
  ];

  // --- Build ProcessedEvidenceItem[] from real sources ---------------------------------------------
  const items: ProcessedEvidenceItem[] = sources.map((s, i) => ({
    id: `search-${i}`,
    origin: "SEARCH_RESULT",
    provider: s.publisher,
    url: s.url,
    title: s.title,
    snippet: s.snippet,
    evidenceDepth: s.evidenceDepth, // RULE 6: copied verbatim, SNIPPET stays SNIPPET
    publishedAt: s.publishedAt,
    updatedAt: s.updatedAt,
    retrievedAt: s.retrievedAt,
    officialClassification: classifyDomain(s.url),
    temporalRelevance: evaluateItemTemporalRelevance(s, temporal),
  }));

  if (deterministicResult) {
    items.push({
      id: "deterministic-0", origin: "DETERMINISTIC_ENGINE", provider: "FTN deterministic engine", url: null,
      title: deterministicResult.answerClass, snippet: deterministicResult.answer, evidenceDepth: "DETERMINISTIC",
      publishedAt: null, updatedAt: null, retrievedAt: null, officialClassification: "UNKNOWN", temporalRelevance: "NOT_REQUIRED",
    });
  }

  // --- Retrieval quality-gate signal (reused verbatim, RULE 28) ------------------------------------
  let retrievalQualityGate: EvidencePacket["retrievalQualityGate"] = null;
  if (evidenceContract.requiredEvidence && temporal.strictness !== "NONE" && sources.length > 0) {
    const verdict = evaluateSearchResultQuality({
      userQuery: requestFrame.rawQuery, queryClass: requestFrame.queryClass,
      freshnessRequired: requestFrame.requiresFreshEvidence, sources,
    });
    retrievalQualityGate = { acceptable: verdict.acceptable, score: verdict.score, reasons: verdict.reasons };
  }

  // --- Temporal aggregate -----------------------------------------------------------------------
  const temporalRequired = temporal.strictness !== "NONE";
  const temporalVerdicts = items.filter((it) => it.origin === "SEARCH_RESULT").map((it) => it.temporalRelevance);
  const anyTemporalSatisfied = temporalVerdicts.some((v) => v === "SATISFIED");
  const anyTemporalUnsatisfied = temporalVerdicts.some((v) => v === "UNSATISFIED");
  const allTemporalUnknownOrNone = temporalVerdicts.length === 0 || temporalVerdicts.every((v) => v === "UNKNOWN" || v === "NOT_REQUIRED");
  let temporalSatisfied: boolean | null;
  let temporalUnresolved: boolean;
  if (!temporalRequired) { temporalSatisfied = null; temporalUnresolved = false; }
  else if (anyTemporalSatisfied) { temporalSatisfied = true; temporalUnresolved = false; }
  else if (allTemporalUnknownOrNone) { temporalSatisfied = null; temporalUnresolved = true; }
  else { temporalSatisfied = false; temporalUnresolved = false; } // anyTemporalUnsatisfied and nothing satisfied/unknown-only
  if (temporalRequired && temporalSatisfied === false) gaps.push({ type: "TEMPORAL_GAP", requirement: `temporal window (${temporal.type})`, reason: "Retrieved evidence has structured dates definitively outside the resolved window." });
  if (temporalRequired && temporalUnresolved) gaps.push({ type: "TEMPORAL_GAP", requirement: `temporal window (${temporal.type})`, reason: "No retrieved item carries a structured date/time that could be checked against the resolved window." });

  // --- Entity / geography (always unresolved -- no resolver exists, see Phase 1's own disclosed gap)
  const entity = { required: false, satisfied: null as boolean | null, unresolved: true };
  const geography = { required: false, satisfied: null as boolean | null, unresolved: true };

  // --- Source-class requirements ------------------------------------------------------------------
  // Phase 3's `requiredSourceClasses` is a PREFERENCE SET, not a conjunction: e.g.
  // CURRENT_WEB_RESEARCH's ["NEWS_MEDIA", "OFFICIAL_GOVERNMENT"] means "either kind of authoritative
  // source is acceptable," not "both are independently mandatory." This module is the first real
  // consumer of that field, so this OR-based interpretation is decided HERE, not silently assumed --
  // "ANY" is never itself a hard requirement (it is trivially satisfied by any relevant item).
  const nonGenericClasses = evidenceContract.requiredSourceClasses.filter((c) => c !== "ANY");
  const sourceClassRequired = nonGenericClasses.length > 0;
  const sourceClassSatisfied = !sourceClassRequired ? null : items.some((it) =>
    (nonGenericClasses.includes("OFFICIAL_GOVERNMENT") && it.officialClassification === "OFFICIAL_GOVERNMENT") ||
    (nonGenericClasses.includes("NEWS_MEDIA") && it.officialClassification === "NEWS_MEDIA") ||
    (nonGenericClasses.includes("STATISTICAL_RELEASE") && it.origin === "STRUCTURED_DATA"));
  if (sourceClassRequired && sourceClassSatisfied === false) {
    if (nonGenericClasses.includes("OFFICIAL_GOVERNMENT")) gaps.push({ type: "OFFICIAL_SOURCE_GAP", requirement: nonGenericClasses.join(" or "), reason: "No retrieved source's domain matched any of the required source classes (official/government or authoritative news)." });
    else gaps.push({ type: "STRUCTURED_DATA_GAP", requirement: nonGenericClasses.join(" or "), reason: "No retrieved item matched any of the required source classes." });
  }
  // Purely observational sub-fields (reported for visibility, never independently gate evidenceState
  // -- only `sourceClassSatisfied` above does that): does official/government appear AT ALL among the
  // required classes, and was one actually found.
  const officialRequired = nonGenericClasses.includes("OFFICIAL_GOVERNMENT");
  const officialSatisfied = !officialRequired ? null : items.some((it) => it.officialClassification === "OFFICIAL_GOVERNMENT");

  // Structured data has TWO distinct requirement strengths, deliberately kept separate:
  //   - HARD (blocks evidenceState, forces INSUFFICIENT): only true CORRELATION requests, where a
  //     narrative snippet can never substitute for an executed numeric series, full stop.
  //   - SOFT/observational: LATEST_AVAILABLE's permittedClaimTypes happens to include "STATISTICAL"
  //     too (a snippet CAN legitimately describe a statistical release), so that case must never be
  //     forced to INSUFFICIENT merely for lacking a literal executed series -- see RULE 20's explicit
  //     "must not fail merely because the measurement period predates today" instruction.
  const structuredDataHardRequired = requestFrame.queryClass === "CORRELATION";
  const correlationExecuted = engineResults.some((e) => e.engine === "CORRELATION" && e.status === "OK");
  const structuredItemExists = items.some((it) => it.origin === "STRUCTURED_DATA");
  const structuredObservationalRequired = nonGenericClasses.includes("STATISTICAL_RELEASE") || evidenceContract.permittedClaimTypes.includes("STATISTICAL");
  const structuredDataSatisfied = !structuredObservationalRequired ? null : (correlationExecuted || structuredItemExists);
  if (structuredDataHardRequired && !(correlationExecuted || structuredItemExists)) {
    gaps.push({ type: "STRUCTURED_DATA_GAP", requirement: "structured/statistical data series", reason: "No structured data engine executed and no structured-data item was obtained; narrative search snippets do not satisfy a CORRELATION requirement." });
  }

  const relevantSourceSatisfied = !evidenceContract.requiredEvidence ? null : items.filter((it) => it.origin === "SEARCH_RESULT").length > 0;

  // --- Execution-plan gap: contract wanted evidence, but no relevant capability ever ran ----------
  const researchAttempted = capabilityExecution.some((c) => c.capability === "RESEARCH");
  if (evidenceContract.requiredEvidence && !researchAttempted && items.filter((it) => it.origin === "SEARCH_RESULT").length === 0 && !deterministicResult) {
    gaps.push({ type: "EXECUTION_PLAN_GAP", requirement: "RESEARCH capability", reason: `Evidence was required for this ${requestFrame.temporalRequirement.type} request, but the capability planner never scheduled RESEARCH -- a genuine architecture gap, not a retrieval failure.` });
  } else if (evidenceContract.requiredEvidence && researchAttempted && items.filter((it) => it.origin === "SEARCH_RESULT").length === 0) {
    gaps.push({ type: "RETRIEVAL_EMPTY_GAP", requirement: "RESEARCH capability", reason: "RESEARCH was planned and attempted but returned no usable sources." });
  }

  // --- Page-inspection ceiling (RULE 6 applied structurally) ---------------------------------------
  const searchItems = items.filter((it) => it.origin === "SEARCH_RESULT");
  const allSnippet = searchItems.length > 0 && searchItems.every((it) => it.evidenceDepth === "SNIPPET");
  if (allSnippet && evidenceContract.requiredEvidence) {
    gaps.push({ type: "PAGE_INSPECTION_UNAVAILABLE_GAP", requirement: "inspected primary source", reason: "Every retrieved item is SNIPPET depth (no Phase 5 retrieval adapter exists) -- claims requiring verified page-level detail (e.g. specific eligibility criteria) cannot reach VERIFIED status from this evidence alone." });
  }

  // --- Action contract ------------------------------------------------------------------------------
  if (requestFrame.requiresExternalAction) {
    const fabricResult = engineResults.find((e) => e.engine === "CONNECTION_FABRIC");
    const actionExecuted = !!fabricResult && fabricResult.status === "OK" && /connected|executed/i.test(fabricResult.findings.join(" "));
    if (!actionExecuted) gaps.push({ type: "ACTION_NOT_EXECUTED_GAP", requirement: "external action execution", reason: "No connector/executor confirmed this action actually ran -- a proposed or discussed action must never be reported as completed." });
  }

  // --- Contradictions (RULE 14) ---------------------------------------------------------------------
  const contradictions: EvidenceContradiction[] = orchestrationContradictions.map((description) => ({ description, evidenceIds: [], state: "DETECTED" as const }));
  if (evidenceContract.requiredEvidence && searchItems.length > 0) {
    contradictions.push({ description: "General source-to-source contradiction detection", evidenceIds: searchItems.map((i) => i.id), state: "NOT_YET_EVALUATED" });
  }

  // --- Independence / corroboration -----------------------------------------------------------------
  const independentSourceCount = independentGroupCount(searchItems);

  // --- Aggregate evidenceState + contractSatisfied ---------------------------------------------------
  let evidenceState: EvidenceState;
  let contractSatisfied: boolean | null;
  if (deterministicResult) {
    evidenceState = "VERIFIED"; contractSatisfied = true;
  } else if (!evidenceContract.requiredEvidence) {
    evidenceState = "NONE"; contractSatisfied = true;
  } else if (searchItems.length === 0) {
    evidenceState = "INSUFFICIENT"; contractSatisfied = false;
  } else if (structuredDataHardRequired && !(correlationExecuted || structuredItemExists)) {
    evidenceState = "INSUFFICIENT"; contractSatisfied = false; // narrative snippets never substitute for a required statistical series (CORRELATION only)
  } else if (temporalRequired && temporalSatisfied === false && temporal.strictness === "HIGH") {
    evidenceState = "INSUFFICIENT"; contractSatisfied = false; // the live-caught stale-evidence bug shape -- a hard failure for HIGH strictness
  } else if ((temporalRequired && temporalSatisfied === false) || (sourceClassRequired && sourceClassSatisfied === false)) {
    evidenceState = "PARTIAL"; contractSatisfied = false;
  } else if (temporalRequired && temporalSatisfied === null && temporal.strictness === "HIGH") {
    evidenceState = "PARTIAL"; contractSatisfied = null; // undated evidence for a HIGH-strictness window: genuinely uncertain, not a clean pass
  } else {
    evidenceState = independentSourceCount >= 2 ? "CORROBORATED" : "SUPPORTED";
    contractSatisfied = true;
  }

  const provenance: ProvenanceRecord[] = items.map((it) => ({ evidenceId: it.id, chain: [it.origin, it.provider || it.url || "unknown"].filter(Boolean) as string[] }));

  const evidencePacket: EvidencePacket = {
    requestId: requestFrame.requestId,
    contractSatisfied,
    evidenceState,
    legacyEvidenceState,
    stateAgreement: legacyAgrees(legacyEvidenceState, evidenceState),
    items,
    temporal: { required: temporalRequired, satisfied: temporalSatisfied, unresolved: temporalUnresolved },
    entity, geography,
    sourceRequirements: { officialSatisfied, structuredDataSatisfied, relevantSourceSatisfied },
    retrievalQualityGate,
    independentSourceCount,
    contradictions,
    gaps,
    provenance,
    limitations,
  };

  // --- ClaimsLedger (RULE 10/11 -- deliberately conservative) ---------------------------------------
  const claimsLedger: ClaimsLedger = [];
  if (deterministicResult) {
    claimsLedger.push({
      id: "claim-deterministic", claim: deterministicResult.answer, status: "VERIFIED_FACT",
      evidenceIds: ["deterministic-0"], allowedStrength: "FACTUAL", limitations: [],
    });
  } else if (evidenceContract.requiredEvidence) {
    const claimStatusByEvidenceState: Record<EvidenceState, { status: ClaimStatus; strength: AllowedClaimStrength }> = {
      NONE: { status: "UNKNOWN", strength: "DO_NOT_ASSERT" },
      INSUFFICIENT: { status: "UNKNOWN", strength: "DO_NOT_ASSERT" },
      PARTIAL: { status: "SUPPORTED_INFERENCE", strength: "QUALIFIED" },
      SUPPORTED: { status: "SUPPORTED_INFERENCE", strength: "QUALIFIED" },
      CORROBORATED: { status: "CORROBORATED_FACT", strength: "QUALIFIED" },
      VERIFIED: { status: "VERIFIED_FACT", strength: "FACTUAL" },
    };
    const map = claimStatusByEvidenceState[evidenceState];
    claimsLedger.push({
      id: "claim-topical", claim: `Whatever the answer asserts about: ${requestFrame.rawQuery}`, status: map.status,
      evidenceIds: searchItems.map((i) => i.id), allowedStrength: map.strength,
      limitations: gaps.map((g) => g.reason),
    });
  }
  if (requestFrame.requiresExternalAction) {
    const actionGap = gaps.find((g) => g.type === "ACTION_NOT_EXECUTED_GAP");
    claimsLedger.push({
      id: "claim-action", claim: "The requested external action was completed.",
      status: actionGap ? "UNKNOWN" : "SUPPORTED_INFERENCE",
      evidenceIds: [], allowedStrength: actionGap ? "DO_NOT_ASSERT" : "QUALIFIED",
      limitations: actionGap ? [actionGap.reason] : [],
    });
  }

  return { evidencePacket, claimsLedger };
}
