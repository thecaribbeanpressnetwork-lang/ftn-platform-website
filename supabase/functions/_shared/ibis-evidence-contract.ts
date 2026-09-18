// FTN / IBIS Canonical Architecture -- Phase 3: the CEBOS Evidence & Reasoning Contract, SHADOW MODE.
//
// See GOVERNANCE/FTN_IBIS_Canonical_Architecture_2026-09-18.md (Box 3: "What would count as proof?
// What claims may ultimately be made?") and the companion implementation plan's Phase 3 scope. This
// module answers, deterministically and BEFORE any retrieval happens, what kind of evidence a
// request would need and what claims it would license -- it does not retrieve anything, judge
// anything retrieved, or change what the user sees. It is attached to the response envelope's
// `receipt` purely for observability, exactly like Phase 1's `requestFrame` and Phase 2's resolved
// `temporalRequirement` inside it.
//
// Audit performed before writing this file (per this phase's explicit "reuse existing CEBOS
// concepts wherever semantically correct" instruction): "CEBOS" itself does not exist as code
// anywhere in this repository -- grepped the full tree, confirmed only the architecture doc's own
// prose describes it ("evidence states, event/record/access time, decision authority..."). The real
// code those words describe already exists, but it belongs to EBR (Evidence-Bounded Retrodiction,
// ibis-ebr-engine.ts) -- `EpistemicStatus` ("DOCUMENTED" | "INFERRED" | "SPECULATIVE" | "UNKNOWN"),
// `EvidenceItem` (eventTime/recordTime/provenance/epistemicStatus), `ActorAccessAssertion`. Per this
// phase's explicit instruction ("EBR remains specific to causal/retrodictive analysis, not general
// evidence handling"), this module does NOT import EBR's causal machinery (K_att/K_rec/R,
// CandidateHistory, ActorAccessAssertion) -- it reuses only the one genuinely general-purpose
// vocabulary item, `EpistemicStatus`, as this contract's `minimumEpistemicStatus` field, since
// "how well-attested must evidence be" is a real general-evidence concept EBR merely happened to
// define first, not something inherently causal. No other existing type in this codebase names a
// research plan, source class, or claim-type concept -- those are newly introduced here, grounded
// entirely in deterministic derivation from RequestFrame, never invented per-request judgment.

import type { QueryClass } from "./ibis-response-envelope.ts";
import type { RequestFrame, TemporalRequirement, TemporalStrictness } from "./ibis-request-frame.ts";
import type { EpistemicStatus } from "./ibis-ebr-engine.ts";

export type { EpistemicStatus };

// What kind of source would actually satisfy this request -- coarse, deterministic categories, not
// a live source-authority registry (that is a future, separate resolver; see the architecture doc's
// Caribbean Regional Source Authority Registry, not scheduled). "ANY" is the honest default when
// this contract has no specific basis to prefer one source class over another.
export type RequiredSourceClass = "OFFICIAL_GOVERNMENT" | "NEWS_MEDIA" | "STATISTICAL_RELEASE" | "ANY";

// What KIND of claim the eventual answer would be licensed to make -- not whether it can actually
// make it (that depends on what evidence is really found, a future Evidence Processor's job).
export type ClaimType = "FACTUAL" | "STATISTICAL" | "CAUSAL" | "STRATEGIC_JUDGMENT" | "DETERMINISTIC_CALCULATION";

// How many independent sources a claim of this kind should ideally rest on. NOT_APPLICABLE when no
// evidence is required at all (a deterministic calculation, or an ordinary timeless factual question
// answerable from general knowledge).
export type EvidenceSufficiency = "NOT_APPLICABLE" | "SINGLE_SOURCE_ACCEPTABLE" | "CORROBORATION_PREFERRED";

export type EvidenceContract = {
  requestId: string;
  queryClass: QueryClass;
  // Echoes RequestFrame.temporalRequirement's own bounds/strictness -- duplicated here (not just
  // referenced) so a reader of ONE contract object sees the complete "what would count as proof"
  // picture without also having to open requestFrame separately; the source of truth for these
  // exact values remains ibis-temporal-resolver.ts, never recomputed here.
  temporalWindow: { start: string | null; end: string | null; asOf: string | null; strictness: TemporalStrictness };
  requiredEvidence: boolean;
  requiredSourceClasses: RequiredSourceClass[];
  permittedClaimTypes: ClaimType[];
  minimumEpistemicStatus: EpistemicStatus;
  sufficiency: EvidenceSufficiency;
  // Deterministic, human-readable justification for the fields above -- same discipline as
  // ibis-intent-router.ts's IntentClassification.reasons: every value here is traceable to a real
  // RequestFrame field, never an unexplained judgment call.
  rationale: string[];
};

function sourceClassesFor(queryClass: QueryClass, temporal: TemporalRequirement): RequiredSourceClass[] {
  if (temporal.type === "LATEST_AVAILABLE") return ["STATISTICAL_RELEASE", "OFFICIAL_GOVERNMENT"];
  if (queryClass === "CURRENT_WEB_RESEARCH") return ["NEWS_MEDIA", "OFFICIAL_GOVERNMENT"];
  if (queryClass === "PATHWAY" || queryClass === "PLACE" || queryClass === "RELATIONSHIP") return ["OFFICIAL_GOVERNMENT", "ANY"];
  return ["ANY"];
}

function claimTypesFor(queryClass: QueryClass, requiresDeterministicEngine: boolean, temporal: TemporalRequirement): ClaimType[] {
  if (requiresDeterministicEngine) return ["DETERMINISTIC_CALCULATION"];
  if (queryClass === "RETRODICTION") return ["CAUSAL", "FACTUAL"]; // CAUSAL is permitted here as a claim CATEGORY only -- the actual causal reconstruction stays EBR's exclusive job, never performed by this module.
  if (queryClass === "CORRELATION") return ["STATISTICAL"];
  if (queryClass === "FOUNDER_STRATEGY") return ["STRATEGIC_JUDGMENT", "FACTUAL"];
  if (temporal.type === "LATEST_AVAILABLE") return ["STATISTICAL", "FACTUAL"];
  return ["FACTUAL"];
}

// A calculation needs no external evidence. An ordinary timeless factual SIMPLE_TEXT question
// ("What is the capital of Barbados?") is answerable from general knowledge -- this contract does
// not require grounding for it. Everything else -- including HISTORICAL questions, which today's
// capability planner does NOT actually plan real research for (a genuine architecture gap this
// shadow contract surfaces rather than hides, see the Phase 3 report) -- is marked as wanting real
// evidence, even though nothing yet enforces or acts on that want.
function requiresEvidenceFor(requestFrame: RequestFrame): boolean {
  if (requestFrame.requiresDeterministicEngine) return false;
  if (requestFrame.queryClass === "SIMPLE_TEXT" && requestFrame.temporalRequirement.type === "TIMELESS") return false;
  return true;
}

// Stricter timing pressure demands more solidly-attested evidence: a "today"/"this week" claim
// resting on merely SPECULATIVE material is exactly the live-caught 2018/2019-report failure shape
// this session's Search Quality Gate pass already fixed at the retrieval-hygiene layer -- this
// contract states the same principle as a general, provider-independent expectation, once evidence
// exists to check against (a future Evidence Processor's job, never this module's).
function minimumEpistemicStatusFor(strictness: TemporalStrictness): EpistemicStatus {
  if (strictness === "HIGH") return "DOCUMENTED";
  if (strictness === "MEDIUM") return "INFERRED";
  return "SPECULATIVE";
}

function sufficiencyFor(requiredEvidence: boolean, strictness: TemporalStrictness): EvidenceSufficiency {
  if (!requiredEvidence) return "NOT_APPLICABLE";
  return strictness === "HIGH" ? "CORROBORATION_PREFERRED" : "SINGLE_SOURCE_ACCEPTABLE";
}

// Pure function of a single RequestFrame -- no capabilityPlan, no search results, no I/O. Matches
// this phase's explicit "must be deterministically derived from the live RequestFrame" instruction:
// the SAME RequestFrame always produces the SAME EvidenceContract, and nothing about deriving it can
// itself require evidence, a provider call, or added latency.
export function buildEvidenceContract(requestFrame: RequestFrame): EvidenceContract {
  const { queryClass, temporalRequirement, requiresDeterministicEngine } = requestFrame;
  const requiredEvidence = requiresEvidenceFor(requestFrame);
  const minimumEpistemicStatus = minimumEpistemicStatusFor(temporalRequirement.strictness);
  const sufficiency = sufficiencyFor(requiredEvidence, temporalRequirement.strictness);
  const requiredSourceClasses = requiredEvidence ? sourceClassesFor(queryClass, temporalRequirement) : ["ANY" as const];
  const permittedClaimTypes = claimTypesFor(queryClass, requiresDeterministicEngine, temporalRequirement);

  const rationale: string[] = [];
  if (requiresDeterministicEngine) rationale.push("A deterministic engine answers this request -- no external evidence is needed.");
  else if (!requiredEvidence) rationale.push("An ordinary timeless factual question -- general knowledge is an acceptable basis, no evidence contract requirement.");
  else rationale.push(`queryClass=${queryClass}, temporal type=${temporalRequirement.type} -- real evidence is expected for this request.`);
  rationale.push(`Temporal strictness=${temporalRequirement.strictness} -> minimum epistemic status ${minimumEpistemicStatus}, sufficiency ${sufficiency}.`);

  return {
    requestId: requestFrame.requestId,
    queryClass,
    temporalWindow: { start: temporalRequirement.start, end: temporalRequirement.end, asOf: temporalRequirement.asOf, strictness: temporalRequirement.strictness },
    requiredEvidence,
    requiredSourceClasses,
    permittedClaimTypes,
    minimumEpistemicStatus,
    sufficiency,
    rationale,
  };
}
