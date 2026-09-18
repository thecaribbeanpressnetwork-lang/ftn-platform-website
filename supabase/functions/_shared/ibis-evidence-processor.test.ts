// FTN / IBIS Canonical Architecture, Phase 4 -- unit tests for the Evidence Processor (shadow mode).
// Covers every scenario the Phase 4 directive requires (section 27). Deliberately plain Deno.test:
// processEvidence() is a pure function of already-computed inputs -- no network, no fetch.
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { buildRequestFrame } from "./ibis-request-frame.ts";
import { buildEvidenceContract } from "./ibis-evidence-contract.ts";
import { processEvidence, type ProcessEvidenceInput } from "./ibis-evidence-processor.ts";
import type { SourceRecord } from "./ibis-response-envelope.ts";

const NOW = new Date("2026-09-18T12:00:00Z");

function frameFor(text: string, isDeterministicAnswer = false) {
  const intent = classifyIntent(text);
  return buildRequestFrame({ requestId: "test-request", text, intent, isDeterministicAnswer, now: NOW });
}

// Defaults to a real, registry-classified news domain (newsday.co.tt) so tests isolating ONE
// dimension (temporal, corroboration, etc.) don't accidentally also trip the separate source-class
// requirement -- test 12 below deliberately overrides `url` to a non-classifiable domain to test
// THAT dimension specifically.
function source(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    title: "Trinidad and Tobago update", publisher: "test", url: "https://newsday.co.tt/x",
    publishedAt: null, updatedAt: null, retrievedAt: NOW.toISOString(), snippet: "Trinidad and Tobago news.",
    evidenceDepth: "SNIPPET", ...overrides,
  };
}

function run(text: string, opts: Partial<ProcessEvidenceInput> & { isDeterministicAnswer?: boolean } = {}) {
  const frame = frameFor(text, opts.isDeterministicAnswer ?? false);
  const contract = buildEvidenceContract(frame);
  return processEvidence({
    requestFrame: frame, evidenceContract: contract,
    sources: opts.sources ?? [], capabilityExecution: opts.capabilityExecution ?? [],
    engineResults: opts.engineResults ?? [], deterministicResult: opts.deterministicResult ?? null,
    legacyEvidenceState: opts.legacyEvidenceState ?? "NO_ANSWER_GENERATED",
    orchestrationContradictions: opts.orchestrationContradictions ?? [],
  });
}

// 1. Deterministic calculation with a real deterministic result.
Deno.test("1. deterministic calculation produces a VERIFIED item and a VERIFIED_FACT claim, no evidence required", () => {
  const { evidencePacket, claimsLedger } = run("2 + 2", { isDeterministicAnswer: true, deterministicResult: { answer: "4", answerClass: "CALCULATION" }, legacyEvidenceState: "DETERMINISTIC" });
  assertEquals(evidencePacket.evidenceState, "VERIFIED");
  assertEquals(evidencePacket.contractSatisfied, true);
  assertEquals(evidencePacket.stateAgreement, true);
  assert(claimsLedger.some((c) => c.status === "VERIFIED_FACT" && c.claim === "4"));
});

// 2. No-evidence simple question.
Deno.test("2. an ordinary timeless factual question needs no evidence and produces an empty ledger", () => {
  const { evidencePacket, claimsLedger } = run("What is the capital of Barbados?", { legacyEvidenceState: "MODEL_GENERATED" });
  assertEquals(evidencePacket.evidenceState, "NONE");
  assertEquals(evidencePacket.contractSatisfied, true);
  assertEquals(evidencePacket.stateAgreement, true);
  assertEquals(claimsLedger.length, 0);
});

// 3. Current query with in-window dated sources.
Deno.test("3. THIS_WEEK query with a source dated inside the resolved window is temporally SATISFIED", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [source({ publishedAt: "2026-09-16T00:00:00Z" })],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.temporal.satisfied, true);
  assertEquals(evidencePacket.temporal.unresolved, false);
  assertEquals(evidencePacket.evidenceState, "SUPPORTED");
  assertEquals(evidencePacket.contractSatisfied, true);
  assert(evidencePacket.stateAgreement);
});

// 4. Current query with stale sources -- the CORE regression case this architecture exists for.
Deno.test("4. THIS_WEEK query with definitively stale dated sources is temporally UNSATISFIED and INSUFFICIENT, never VERIFIED", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [source({ publishedAt: "2019-01-01T00:00:00Z", title: "UWI Faculty Report 2018/2019" })],
    legacyEvidenceState: "SEARCH_GROUNDED", // legacy would have called this grounded -- exactly the bug
  });
  assertEquals(evidencePacket.temporal.satisfied, false);
  assertEquals(evidencePacket.evidenceState, "INSUFFICIENT");
  assertEquals(evidencePacket.contractSatisfied, false);
  assert(evidencePacket.evidenceState !== "VERIFIED");
  assertFalse(evidencePacket.stateAgreement, "this is exactly the legacy-vs-shadow disagreement Phase 4 exists to surface");
});

// 5. Current query with undated sources.
Deno.test("5. THIS_WEEK query with an undated source is temporally UNKNOWN (null), never assumed recent", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [source({ publishedAt: null, updatedAt: null })],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.temporal.satisfied, null);
  assertEquals(evidencePacket.temporal.unresolved, true);
  assertEquals(evidencePacket.evidenceState, "PARTIAL");
  assertEquals(evidencePacket.contractSatisfied, null);
});

// 6. Duplicate/syndicated sources not falsely corroborated.
Deno.test("6. two sources from the SAME hostname never count as independent corroboration", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [
      source({ url: "https://newsday.co.tt/a", publishedAt: "2026-09-16T00:00:00Z", title: "Story A" }),
      source({ url: "https://newsday.co.tt/b", publishedAt: "2026-09-17T00:00:00Z", title: "Story B" }),
    ],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.independentSourceCount, 1);
  assertEquals(evidencePacket.evidenceState, "SUPPORTED", "one publisher's voice, however many articles, must not reach CORROBORATED");
});

Deno.test("6b. two DIFFERENT hostnames with the same syndicated title also count as one independent voice", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [
      source({ url: "https://apnews.com/x", publishedAt: "2026-09-16T00:00:00Z", title: "Trinidad ends state of emergency" }),
      source({ url: "https://ca.news.yahoo.com/y", publishedAt: "2026-09-16T00:00:00Z", title: "Trinidad ends state of emergency" }),
    ],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.independentSourceCount, 1);
});

Deno.test("6c. two genuinely different hostnames with different titles DO count as independent, reaching CORROBORATED", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [
      source({ url: "https://guardian.co.tt/a", publishedAt: "2026-09-16T00:00:00Z", title: "Story A about the situation" }),
      source({ url: "https://newsday.co.tt/b", publishedAt: "2026-09-17T00:00:00Z", title: "Completely different headline" }),
    ],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.independentSourceCount, 2);
  assertEquals(evidencePacket.evidenceState, "CORROBORATED");
});

// 7. Latest-available structured/statistical evidence -- measurement period predating today is fine.
Deno.test("7. LATEST_AVAILABLE never forces the measurement period to equal today; temporal stays UNKNOWN by design", () => {
  const { evidencePacket } = run("What are the latest available unemployment figures for Trinidad and Tobago?", {
    sources: [source({ url: "https://gov.tt/stats", publishedAt: "2026-06-01T00:00:00Z", title: "Q1 2026 unemployment release" })],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.temporal.satisfied, null);
  assertEquals(evidencePacket.sourceRequirements.officialSatisfied, true);
  assert(evidencePacket.evidenceState === "SUPPORTED" || evidencePacket.evidenceState === "CORROBORATED", "an older measurement period must not by itself sink evidenceState below SUPPORTED for a MEDIUM-strictness LATEST_AVAILABLE request");
});

// 8. Historical query with no retrieval capability -- the discovered Phase 3 gap, exposed not patched.
Deno.test("8. HISTORICAL query with no RESEARCH capability ever scheduled surfaces an EXECUTION_PLAN_GAP and INSUFFICIENT/false", () => {
  const { evidencePacket } = run("What happened in Trinidad in 1990?", {
    sources: [], capabilityExecution: [], legacyEvidenceState: "MODEL_GENERATED",
  });
  assertEquals(evidencePacket.evidenceState, "INSUFFICIENT");
  assertEquals(evidencePacket.contractSatisfied, false);
  assert(evidencePacket.gaps.some((g) => g.type === "EXECUTION_PLAN_GAP"));
});

// 9. Grant/opportunity: programme snippet exists but no eligibility/page-inspection evidence.
Deno.test("9. a PATHWAY-class opportunity snippet can be SUPPORTED for existence but never VERIFIED (no page inspection exists)", () => {
  const { evidencePacket } = run("What are the steps and eligibility to apply for this grant?", {
    sources: [source({ url: "https://gov.tt/grant-programme", title: "Youth Business Grant Programme", snippet: "A grant programme exists for youth entrepreneurs." })],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assert(evidencePacket.evidenceState !== "VERIFIED", "eligibility-type claims must never reach VERIFIED from a snippet alone");
  assert(evidencePacket.gaps.some((g) => g.type === "PAGE_INSPECTION_UNAVAILABLE_GAP"), "must record that deeper verification (e.g. real eligibility criteria) requires page inspection this architecture cannot yet do");
});

// 10. Correlation contract without structured series.
Deno.test("10. CORRELATION contract with no structured series executed is INSUFFICIENT, never satisfied by narrative sources", () => {
  const { evidencePacket } = run("Is there a correlation between remittances and GDP growth?", {
    sources: [source({ title: "An article discussing remittances and GDP" })],
    engineResults: [], legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.sourceRequirements.structuredDataSatisfied, false);
  assertEquals(evidencePacket.evidenceState, "INSUFFICIENT");
  assertEquals(evidencePacket.contractSatisfied, false);
  assert(evidencePacket.gaps.some((g) => g.type === "STRUCTURED_DATA_GAP"));
});

Deno.test("10b. CORRELATION contract WITH a real executed structured series is not blocked by the structured-data gap", () => {
  const { evidencePacket } = run("Is there a correlation between remittances and GDP growth?", {
    engineResults: [{ engine: "CORRELATION", requested: true, executed: true, status: "OK", reason: null, inputsUsed: {}, findings: ["r=0.6"], assumptions: [], evidenceReferences: [], confidence: "MODERATE", downstreamEffects: [] }],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.sourceRequirements.structuredDataSatisfied, true);
  assertFalse(evidencePacket.gaps.some((g) => g.type === "STRUCTURED_DATA_GAP"));
});

// 11. Action contract without executor result.
Deno.test("11. a TOOL_ACTION request with no executor confirmation records ACTION_NOT_EXECUTED, never claims completion", () => {
  const { evidencePacket, claimsLedger } = run("Connect my Gmail account.", { legacyEvidenceState: "MODEL_GENERATED" });
  assert(evidencePacket.gaps.some((g) => g.type === "ACTION_NOT_EXECUTED_GAP"));
  const actionClaim = claimsLedger.find((c) => c.id === "claim-action");
  assert(actionClaim);
  assertEquals(actionClaim!.allowedStrength, "DO_NOT_ASSERT");
});

// 12. Official-source requirement unmet.
Deno.test("12. CURRENT_WEB_RESEARCH with no official-government-domain source records OFFICIAL_SOURCE_GAP", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [source({ url: "https://randomblog.example/x", publishedAt: "2026-09-16T00:00:00Z" })],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assertEquals(evidencePacket.sourceRequirements.officialSatisfied, false);
  assert(evidencePacket.gaps.some((g) => g.type === "OFFICIAL_SOURCE_GAP"));
});

// 13. Page-inspection requirement unmet because all evidence is SNIPPET.
Deno.test("13. every source being SNIPPET-depth always records PAGE_INSPECTION_UNAVAILABLE_GAP when evidence is required", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", {
    sources: [source({ evidenceDepth: "SNIPPET", publishedAt: "2026-09-16T00:00:00Z" })],
    legacyEvidenceState: "SEARCH_GROUNDED",
  });
  assert(evidencePacket.gaps.some((g) => g.type === "PAGE_INSPECTION_UNAVAILABLE_GAP"));
  assert(evidencePacket.items.every((i) => i.origin !== "SEARCH_RESULT" || i.evidenceDepth === "SNIPPET"), "RULE 6: a snippet must never be silently promoted");
});

// 14. Unresolved geography/entity requirements remain unresolved.
Deno.test("14. entity and geography are always required:false, satisfied:null, unresolved:true -- no resolver exists yet", () => {
  const { evidencePacket } = run("What changed in Trinidad and Tobago this week?", { legacyEvidenceState: "SEARCH_GROUNDED" });
  assertEquals(evidencePacket.entity, { required: false, satisfied: null, unresolved: true });
  assertEquals(evidencePacket.geography, { required: false, satisfied: null, unresolved: true });
});

// 15. deterministic/pure processor behavior.
Deno.test("15. processEvidence is a pure, deterministic function -- same input, same output", () => {
  const a = run("What changed in Trinidad and Tobago this week?", { sources: [source({ publishedAt: "2026-09-16T00:00:00Z" })], legacyEvidenceState: "SEARCH_GROUNDED" });
  const b = run("What changed in Trinidad and Tobago this week?", { sources: [source({ publishedAt: "2026-09-16T00:00:00Z" })], legacyEvidenceState: "SEARCH_GROUNDED" });
  assertEquals(a.evidencePacket, b.evidencePacket);
  assertEquals(a.claimsLedger, b.claimsLedger);
});

// 16. end-to-end receipt integration -- see ibis-canonical-brain.test.ts's PHASE 4 tests for the
// real handleCanonicalRequest() proof; this file covers the pure-function contract directly.

// 17. no user-visible behavior change -- processEvidence never touches an answer string; structural
// proof: its return type has no `answer` field, and it is a pure function with no side effects.
Deno.test("17. processEvidence output never contains an 'answer' field or anything resembling user-facing prose", () => {
  const { evidencePacket, claimsLedger } = run("What changed in Trinidad and Tobago this week?", { sources: [source({ publishedAt: "2026-09-16T00:00:00Z" })], legacyEvidenceState: "SEARCH_GROUNDED" });
  assertFalse("answer" in evidencePacket);
  assertFalse(claimsLedger.some((c) => "answer" in c));
});

console.log("ibis-evidence-processor.test.ts: EvidencePacket/ClaimsLedger are deterministic, snippets never promoted, stale/undated/latest-available/historical temporal semantics are distinct and correct, corroboration requires real independence, and every required-but-missing capability produces an explicit gap rather than a silent pass.");
