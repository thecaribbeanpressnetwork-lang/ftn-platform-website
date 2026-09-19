import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateRelease, applyDeterministicRevision, buildWithholdAnswer, computeCanonicalPublicEvidenceState, type ValidateReleaseInput } from "./ibis-release-validator.ts";
import type { EvidencePacket } from "./ibis-evidence-processor.ts";
import type { EvidenceContract } from "./ibis-evidence-contract.ts";
import type { RequestFrame } from "./ibis-request-frame.ts";

console.log("ibis-release-validator.test.ts: the Phase 6 Release Validator -- RELEASE/REVISE/WITHHOLD decisions, deterministic (not LLM) bounded revision, framework-leak/temporal/claim-strength/capability-truth checks, and the canonical public evidenceState mapping (Items 2-9).");

function frame(overrides: Partial<RequestFrame> = {}): RequestFrame {
  return {
    requestId: "r1", rawQuery: "q", intent: null, queryClass: "CURRENT_WEB_RESEARCH",
    entities: [], geography: null,
    temporalRequirement: { type: "THIS_WEEK", strictness: "HIGH", start: "2026-09-14T00:00:00.000Z", end: "2026-09-20T23:59:59.999Z", asOf: null, originalExpression: "this week", relativeExpression: "this week", resolved: true, timezone: "UTC", timezoneSource: "DEFAULT_FALLBACK" },
    outputType: "TEXT", consequenceLevel: "UNRESOLVED",
    requiresExternalAction: false, requiresFreshEvidence: true, requiresDeterministicEngine: false,
    ...overrides,
  };
}

function contract(overrides: Partial<EvidenceContract> = {}): EvidenceContract {
  return {
    requestId: "r1", queryClass: "CURRENT_WEB_RESEARCH", temporalWindow: { start: null, end: null, asOf: null, strictness: "HIGH" },
    requiredEvidence: true, requiredSourceClasses: ["NEWS_MEDIA", "OFFICIAL_GOVERNMENT"], permittedClaimTypes: ["FACTUAL"],
    minimumEpistemicStatus: "DOCUMENTED", sufficiency: "SINGLE_SOURCE_ACCEPTABLE", rationale: ["test"],
    ...overrides,
  };
}

function packet(overrides: Partial<EvidencePacket> = {}): EvidencePacket {
  return {
    requestId: "r1", contractSatisfied: false, evidenceState: "PARTIAL", legacyEvidenceState: "SEARCH_GROUNDED", stateAgreement: false,
    items: [], temporal: { required: true, satisfied: false, unresolved: false },
    entity: { required: false, satisfied: null, unresolved: true }, geography: { required: false, satisfied: null, unresolved: true },
    sourceRequirements: { officialSatisfied: null, structuredDataSatisfied: null, relevantSourceSatisfied: true },
    retrievalQualityGate: null, independentSourceCount: 1, contradictions: [], gaps: [], provenance: [], limitations: [],
    ...overrides,
  };
}

const BASE_INPUT: ValidateReleaseInput = {
  draftAnswer: "", requestFrame: frame(), evidenceContract: contract(), evidencePacket: packet(),
  claimsLedger: [{ id: "claim-topical", claim: "x", status: "SUPPORTED_INFERENCE", evidenceIds: [], allowedStrength: "DO_NOT_ASSERT", limitations: [] }],
  engineResults: [], actionExecuted: false,
};

Deno.test("RELEASE: a well-hedged answer against a temporally-unsatisfied packet passes cleanly", () => {
  const r = validateRelease({ ...BASE_INPUT, draftAnswer: "I found relevant reporting, but I could not verify that it falls within the requested period." });
  assertEquals(r.decision, "RELEASE");
  assertEquals(r.failures.length, 0);
});

Deno.test("REVISE: a confident, unqualified answer against a temporally-unsatisfied HIGH-strictness packet is flagged and fixed deterministically", () => {
  const draft = "Trinidad and Tobago's economy grew significantly this week.";
  const r = validateRelease({ ...BASE_INPUT, draftAnswer: draft });
  assertEquals(r.decision, "REVISE");
  assert(r.failures.some((f) => f.type === "TEMPORAL_OVERCLAIM"));
  const revised = applyDeterministicRevision(draft, r.failures, frame());
  const revalidated = validateRelease({ ...BASE_INPUT, draftAnswer: revised });
  assertEquals(revalidated.decision, "RELEASE", "the deterministic revision must satisfy its own trigger, or every revision would end in WITHHOLD");
});

Deno.test("RELEASE: a temporally-satisfied packet needs no qualifier at all", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "Trinidad and Tobago's economy grew this week.",
    evidencePacket: packet({ temporal: { required: true, satisfied: true, unresolved: false }, evidenceState: "SUPPORTED", contractSatisfied: true }),
    claimsLedger: [{ id: "claim-topical", claim: "x", status: "CORROBORATED_FACT", evidenceIds: [], allowedStrength: "FACTUAL", limitations: [] }],
  });
  assertEquals(r.decision, "RELEASE");
});

Deno.test("REVISE: framework-leak vocabulary is detected and stripped deterministically", () => {
  const draft = "Based on the EvidenceContract and the Founder Cognitive Layer, here is my answer. The weather in Tobago is generally warm.";
  const r = validateRelease({ ...BASE_INPUT, draftAnswer: draft, evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }), claimsLedger: [] });
  assertEquals(r.decision, "REVISE");
  assert(r.failures.some((f) => f.type === "FRAMEWORK_LEAKAGE"));
  const revised = applyDeterministicRevision(draft, r.failures, frame());
  assertFalse(/EvidenceContract|Founder Cognitive Layer/i.test(revised));
  assert(revised.includes("Tobago"), "stripping the leaked sentence must not destroy the rest of a genuinely useful answer");
});

// Investor-critical fix (2026-09-19): live-caught -- "2 + 2" leaked js/ibis-founder-cognitive-
// layer.js's PUBLIC_DECISION_GATE vocabulary verbatim ("Considering the decision gate: user value;
// ecosystem value; ownership; data value..."). The real fix is upstream routing (see
// js/ibis-multi-agent-orchestrator.js's taskFor(), now gated to STRATEGY tasks only); this proves
// the expanded deterministic safety net here would also have caught and stripped it on its own.
Deno.test("REVISE: the expanded internal-vocabulary set (decision gate / lens names) is detected and stripped", () => {
  const draft = "The result is 4. Considering the decision gate: user value; ecosystem value; ownership; data value; revenue and economic value; execution cost; future optionality, this calculation is complete.";
  const r = validateRelease({ ...BASE_INPUT, draftAnswer: draft, evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }), claimsLedger: [] });
  assertEquals(r.decision, "REVISE");
  assert(r.failures.some((f) => f.type === "FRAMEWORK_LEAKAGE"));
  const revised = applyDeterministicRevision(draft, r.failures, frame());
  assertFalse(/decision gate|ecosystem value|ownership value|data value/i.test(revised));
  assert(revised.includes("The result is 4."), "stripping the leaked sentence must not destroy the real answer");
});

Deno.test("RELEASE: ordinary legitimate use of common words the leak vocabulary is drawn from is never flagged", () => {
  const r = validateRelease({
    ...BASE_INPUT,
    draftAnswer: "Land ownership records in Trinidad are held by the Land Registry, and property data is publicly searchable.",
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }),
    claimsLedger: [],
  });
  assertFalse(r.failures.some((f) => f.type === "FRAMEWORK_LEAKAGE"), "bare common words like 'ownership' or 'data' must not be flagged outside the specific internal compound phrases");
});

Deno.test("WITHHOLD: a deliberately leaking model response that also fails a non-revisable check is sanitized, and stays sanitized after withholding", () => {
  const draft = "The correlation is strong (r=0.8). Considering the decision gate: user value; ecosystem value.";
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: draft,
    requestFrame: frame({ queryClass: "CORRELATION" }),
    evidenceContract: contract({ queryClass: "CORRELATION" }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }),
    claimsLedger: [],
    engineResults: [],
  });
  assertEquals(r.decision, "WITHHOLD", "a capability overclaim (no CORRELATION engine ran) is not revisable, regardless of the co-occurring framework leak");
  const withheld = buildWithholdAnswer({ requestFrame: frame({ queryClass: "CORRELATION" }), evidencePacket: packet(), failures: r.failures, originalText: "is there a correlation" });
  assertFalse(/decision gate|ecosystem value/i.test(withheld), "the final withheld answer must never carry the original leaked draft's internal vocabulary");
});

Deno.test("RELEASE: a deterministic-engine answer skips evidence/temporal checks entirely", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "2 + 2 = 4.",
    evidencePacket: packet({ evidenceState: "VERIFIED", items: [{ id: "deterministic-0", origin: "DETERMINISTIC_ENGINE", provider: "x", url: null, title: "CALCULATION", snippet: "2 + 2 = 4.", evidenceDepth: "DETERMINISTIC", publishedAt: null, updatedAt: null, retrievedAt: null, officialClassification: "UNKNOWN", temporalRelevance: "NOT_REQUIRED" }] }),
    claimsLedger: [{ id: "claim-deterministic", claim: "2 + 2 = 4.", status: "VERIFIED_FACT", evidenceIds: ["deterministic-0"], allowedStrength: "FACTUAL", limitations: [] }],
  });
  assertEquals(r.decision, "RELEASE");
});

// Live-caught (Phase 6 acceptance testing, 2026-09-18): "Is there a correlation between social
// media use and teenage anxiety?" produced "Research suggests a link between excessive social media
// use and increased anxiety... studies have found that excessive social media use can lead to
// increased symptoms of anxiety..." -- confident relationship language with no real executed
// CORRELATION engine behind it, but the ORIGINAL narrow pattern (requiring the literal word
// "correlation" or an "r=" statistic) missed this common paraphrase entirely.
Deno.test("WITHHOLD: a paraphrased correlation overclaim ('research suggests a link', 'studies have found') is caught, not just the literal word 'correlation'", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "Research suggests a link between excessive social media use and increased anxiety in teenagers. Studies have found that excessive use can lead to increased symptoms of anxiety.",
    requestFrame: frame({ queryClass: "CORRELATION" }), evidenceContract: contract({ queryClass: "CORRELATION" }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }),
    claimsLedger: [],
  });
  assertEquals(r.decision, "WITHHOLD");
  assert(r.failures.some((f) => f.type === "CAPABILITY_OVERCLAIM_CORRELATION"));
});

Deno.test("WITHHOLD: a claimed correlation with no executed CORRELATION engine cannot be revised, only withheld", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "There is a strong correlation between the two variables.",
    requestFrame: frame({ queryClass: "CORRELATION" }), evidenceContract: contract({ queryClass: "CORRELATION" }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }),
    claimsLedger: [],
  });
  assertEquals(r.decision, "WITHHOLD");
  assert(r.failures.some((f) => f.type === "CAPABILITY_OVERCLAIM_CORRELATION" && !f.revisable));
});

Deno.test("WITHHOLD: a claimed completed action with no confirmed executor cannot be revised", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "I've connected your Slack account successfully.",
    requestFrame: frame({ requiresExternalAction: true, queryClass: "TOOL_ACTION" }),
    evidenceContract: contract({ queryClass: "TOOL_ACTION", requiredEvidence: false }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }),
    claimsLedger: [], actionExecuted: false,
  });
  assertEquals(r.decision, "WITHHOLD");
  assert(r.failures.some((f) => f.type === "CAPABILITY_OVERCLAIM_ACTION"));
});

Deno.test("RELEASE: a claimed completed action IS allowed once the executor genuinely confirmed it", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "I've connected your Slack account successfully.",
    requestFrame: frame({ requiresExternalAction: true, queryClass: "TOOL_ACTION" }),
    evidenceContract: contract({ queryClass: "TOOL_ACTION", requiredEvidence: false }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false } }),
    claimsLedger: [], actionExecuted: true,
  });
  assertEquals(r.decision, "RELEASE");
});

Deno.test("WITHHOLD: confirmed eligibility language with no primary/official page inspected cannot be revised", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "Based on the details you gave, you are eligible for this grant.",
    requestFrame: frame({ queryClass: "PATHWAY" }), evidenceContract: contract({ queryClass: "PATHWAY" }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false }, items: [{ id: "search-0", origin: "SEARCH_RESULT", provider: "x", url: "https://example.com", title: "Grant page", snippet: "s", evidenceDepth: "SNIPPET", publishedAt: null, updatedAt: null, retrievedAt: null, officialClassification: "UNKNOWN", temporalRelevance: "NOT_REQUIRED" }] }),
    claimsLedger: [],
  });
  assertEquals(r.decision, "WITHHOLD");
  assert(r.failures.some((f) => f.type === "CAPABILITY_OVERCLAIM_ELIGIBILITY"));
});

Deno.test("RELEASE: hedged eligibility language ('appears potentially eligible') from a SNIPPET-only page is fine", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "Based on the details you gave, you appear potentially eligible for this grant, but the criteria still need to be verified.",
    requestFrame: frame({ queryClass: "PATHWAY" }), evidenceContract: contract({ queryClass: "PATHWAY" }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false }, items: [{ id: "search-0", origin: "SEARCH_RESULT", provider: "x", url: "https://example.com", title: "Grant page", snippet: "s", evidenceDepth: "SNIPPET", publishedAt: null, updatedAt: null, retrievedAt: null, officialClassification: "UNKNOWN", temporalRelevance: "NOT_REQUIRED" }] }),
    claimsLedger: [],
  });
  assertEquals(r.decision, "RELEASE");
});

Deno.test("RELEASE: FOUNDER_STRATEGY/STRATEGIC_JUDGMENT answers are exempt from the topical claim-strength check", () => {
  const r = validateRelease({
    ...BASE_INPUT, draftAnswer: "Decision: BUILD NOW. Focus on one customer and one workflow.",
    requestFrame: frame({ queryClass: "FOUNDER_STRATEGY" }), evidenceContract: contract({ queryClass: "FOUNDER_STRATEGY", permittedClaimTypes: ["STRATEGIC_JUDGMENT", "FACTUAL"] }),
    evidencePacket: packet({ temporal: { required: false, satisfied: null, unresolved: false }, evidenceState: "INSUFFICIENT" }),
    claimsLedger: [{ id: "claim-topical", claim: "x", status: "UNKNOWN", evidenceIds: [], allowedStrength: "DO_NOT_ASSERT", limitations: [] }],
  });
  assertEquals(r.decision, "RELEASE", "a planning/decision framework is not a factual assertion needing evidentiary hedging");
});

Deno.test("buildWithholdAnswer never produces an empty string and never sounds like a generic refusal", () => {
  const answer = buildWithholdAnswer({ requestFrame: frame(), evidencePacket: packet({ items: [] }), failures: [], originalText: "q" });
  assert(answer.length > 0);
  assertFalse(/i (?:cannot|can't|am unable to) help with that/i.test(answer));
});

// --- Items 6/7/8: canonical public evidenceState mapping -------------------------------------------

Deno.test("canonical mapping: VERIFIED via deterministic engine -> DETERMINISTIC", () => {
  const p = packet({ evidenceState: "VERIFIED", items: [{ id: "deterministic-0", origin: "DETERMINISTIC_ENGINE", provider: "x", url: null, title: "t", snippet: "s", evidenceDepth: "DETERMINISTIC", publishedAt: null, updatedAt: null, retrievedAt: null, officialClassification: "UNKNOWN", temporalRelevance: "NOT_REQUIRED" }] });
  assertEquals(computeCanonicalPublicEvidenceState(p, true), "DETERMINISTIC");
});

Deno.test("canonical mapping: VERIFIED via a genuinely inspected primary document (non-deterministic) -> VERIFIED", () => {
  const p = packet({ evidenceState: "VERIFIED", items: [{ id: "search-0", origin: "SEARCH_RESULT", provider: "x", url: "https://gov.tt/order", title: "t", snippet: "s", evidenceDepth: "PRIMARY_DOCUMENT", publishedAt: null, updatedAt: null, retrievedAt: null, officialClassification: "OFFICIAL_GOVERNMENT", temporalRelevance: "SATISFIED" }] });
  assertEquals(computeCanonicalPublicEvidenceState(p, true), "VERIFIED");
});

Deno.test("canonical mapping: SUPPORTED/CORROBORATED with contractSatisfied:true -> SEARCH_GROUNDED (Item 7)", () => {
  assertEquals(computeCanonicalPublicEvidenceState(packet({ evidenceState: "SUPPORTED", contractSatisfied: true }), true), "SEARCH_GROUNDED");
  assertEquals(computeCanonicalPublicEvidenceState(packet({ evidenceState: "CORROBORATED", contractSatisfied: true }), true), "SEARCH_GROUNDED");
});

Deno.test("canonical mapping: SUPPORTED with contractSatisfied:false is NEVER SEARCH_GROUNDED (Item 7's core rule)", () => {
  const state = computeCanonicalPublicEvidenceState(packet({ evidenceState: "SUPPORTED", contractSatisfied: false }), true);
  assertFalse(state === "SEARCH_GROUNDED");
  assertEquals(state, "MODEL_GENERATED");
});

Deno.test("canonical mapping: INSUFFICIENT -> INSUFFICIENT (distinct from NO_ANSWER_GENERATED)", () => {
  assertEquals(computeCanonicalPublicEvidenceState(packet({ evidenceState: "INSUFFICIENT" }), true), "INSUFFICIENT");
});

Deno.test("canonical mapping: no answer produced -> NO_ANSWER_GENERATED regardless of packet state", () => {
  assertEquals(computeCanonicalPublicEvidenceState(packet({ evidenceState: "SUPPORTED", contractSatisfied: true }), false), "NO_ANSWER_GENERATED");
});

// --- Item 14: a MODEL_TEXT provider (including DeepSeek) can never self-certify canonical states ---

Deno.test("Item 14: which PROVIDER answered is irrelevant to the canonical evidenceState -- only the packet matters", () => {
  // Two packets identical except evidenceState -- the provider/model identity never appears anywhere
  // in computeCanonicalPublicEvidenceState()'s signature, so it structurally cannot special-case any
  // provider (DeepSeek included) into a stronger canonical state.
  const weak = computeCanonicalPublicEvidenceState(packet({ evidenceState: "NONE" }), true);
  const strong = computeCanonicalPublicEvidenceState(packet({ evidenceState: "VERIFIED", items: [{ id: "search-0", origin: "SEARCH_RESULT", provider: "DeepSeek", url: "https://gov.tt/x", title: "t", snippet: "s", evidenceDepth: "PRIMARY_DOCUMENT", publishedAt: null, updatedAt: null, retrievedAt: null, officialClassification: "OFFICIAL_GOVERNMENT", temporalRelevance: "SATISFIED" }] }), true);
  assertEquals(weak, "MODEL_GENERATED");
  assertEquals(strong, "VERIFIED");
  // The point: VERIFIED came from evidenceDepth/origin (a real inspected document), never from the
  // `provider` string "DeepSeek" itself -- a DeepSeek-labeled SNIPPET-only item would stay MODEL_GENERATED.
});
