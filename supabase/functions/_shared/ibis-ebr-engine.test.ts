// FTN Platform — unit tests for the Evidence-Bounded Retrodiction (EBR) core module. Run with:
//   deno test --allow-env supabase/functions/_shared/ibis-ebr-engine.test.ts
//
// See GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md for the source/boundary this implementation follows.
// These tests enforce the acceptance boundary listed at the end of that note.
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attestedKnowledge,
  reconstructedKnowledge,
  retrospectiveEvidence,
  findContradictions,
  mechanismGate,
  evidenceProfile,
  isAdmissible,
  rankCandidates,
  type EvidenceItem,
  type CausalEdgeProposal,
  type CandidateHistory,
} from "./ibis-ebr-engine.ts";

const DECISION_TIME = "2026-09-10T09:58:00Z";
const AUDIT_CUTOFF = "2026-09-10T12:00:00Z";

// --- 1. Retrospective evidence must never overwrite K_att (append-only invariant) ----------------

Deno.test("EBR invariant: appending a later-recorded item never changes K_att for an earlier decision time", () => {
  const baseItems: EvidenceItem[] = [
    {
      id: "warning-957", eventTime: "2026-09-10T09:57:00Z", recordTime: "2026-09-10T09:57:30Z",
      provenance: "grid-sensor-7", epistemicStatus: "DOCUMENTED",
      actorAccess: [{ actor: "operator-1", accessTime: "2026-09-10T09:57:30Z", assertedAt: "2026-09-10T09:57:30Z", basis: "DOCUMENTED" }],
    },
  ];
  const before = attestedKnowledge("operator-1", DECISION_TIME, baseItems);

  // A late-ingested archive item, recorded AFTER the decision time -- append-only, never back-written.
  const laterItems: EvidenceItem[] = [
    ...baseItems,
    {
      id: "late-archive-1130", eventTime: "2026-09-10T09:56:00Z", recordTime: "2026-09-10T11:30:00Z",
      provenance: "archive-import", epistemicStatus: "DOCUMENTED",
      actorAccess: [{ actor: "operator-1", accessTime: "2026-09-10T09:56:30Z", assertedAt: "2026-09-10T11:30:00Z", basis: "INFERRED" }],
    },
  ];
  const after = attestedKnowledge("operator-1", DECISION_TIME, laterItems);

  assertEquals(after.map((i) => i.id), before.map((i) => i.id), "K_att(a, decisionTime) must be identical before and after a later item is appended");
  assertEquals(after.length, 1);
});

Deno.test("EBR: a later-discovered access assertion CAN expand K_rec without changing K_att", () => {
  const items: EvidenceItem[] = [
    {
      id: "late-archive-1130", eventTime: "2026-09-10T09:56:00Z", recordTime: "2026-09-10T11:30:00Z",
      provenance: "archive-import", epistemicStatus: "DOCUMENTED",
      // The access itself happened before the decision, but was only ASSERTED (discovered) at 11:30.
      actorAccess: [{ actor: "operator-1", accessTime: "2026-09-10T09:56:30Z", assertedAt: "2026-09-10T11:30:00Z", basis: "INFERRED" }],
    },
  ];
  const att = attestedKnowledge("operator-1", DECISION_TIME, items);
  const rec = reconstructedKnowledge("operator-1", DECISION_TIME, AUDIT_CUTOFF, items);
  assertEquals(att.length, 0, "the assertion was not yet on record by the decision time -- K_att must not include it");
  assertEquals(rec.length, 1, "K_rec may legitimately include a later-discovered access assertion, since it does not rewrite K_att");
});

// --- 2. Actor-access assumptions remain explicit -------------------------------------------------

Deno.test("EBR: an evidence item with no actor-access assertion is excluded from K_att even if recorded in time", () => {
  const items: EvidenceItem[] = [
    { id: "no-access-record", eventTime: DECISION_TIME, recordTime: "2026-09-10T09:00:00Z", provenance: "log", epistemicStatus: "DOCUMENTED" },
  ];
  assertEquals(attestedKnowledge("operator-1", DECISION_TIME, items).length, 0, "no actor-access assertion means the actor's contemporaneous access is never assumed");
});

// --- 3. Retrospective evidence set R(c) is independent of any actor's access ---------------------

Deno.test("EBR: R(c) includes evidence regardless of actor access, unlike K_att/K_rec", () => {
  const items: EvidenceItem[] = [
    { id: "inspection-1120", eventTime: "2026-09-10T09:56:00Z", recordTime: "2026-09-10T11:20:00Z", provenance: "post-event-inspection", epistemicStatus: "DOCUMENTED" },
  ];
  const r = retrospectiveEvidence(AUDIT_CUTOFF, items);
  assertEquals(r.length, 1, "R(c) is the detective's evidence set -- it must not require actor access");
  assertEquals(attestedKnowledge("operator-1", DECISION_TIME, items).length, 0);
});

// --- 4. Contradictory evidence survives, never collapsed -----------------------------------------

Deno.test("EBR: contradictions are preserved as explicit pairs, never silently resolved", () => {
  const items: EvidenceItem[] = [
    { id: "a", eventTime: "t", recordTime: "t", provenance: "p1", epistemicStatus: "DOCUMENTED", contradicts: ["b"], contradictionSeverity: "SOFT" },
    { id: "b", eventTime: "t", recordTime: "t", provenance: "p2", epistemicStatus: "DOCUMENTED" },
  ];
  const pairs = findContradictions(items);
  assertEquals(pairs.length, 1);
  assertEquals(pairs[0].severity, "SOFT");
  assert((pairs[0].a === "a" && pairs[0].b === "b") || (pairs[0].a === "b" && pairs[0].b === "a"));
});

// --- 5. Unsupported causal edges fail the mechanism gate ------------------------------------------

Deno.test("EBR: an edge nominated only by chronology fails the mechanism gate", () => {
  const edge: CausalEdgeProposal = {
    id: "e1", from: "warning", to: "decision", nominatedBy: ["CHRONOLOGY"],
    mechanismClass: null, temporalStatus: "BEFORE", provenanceRoots: ["grid-sensor-7"],
    testableImplication: null, knownContradictions: [], epistemicLabel: "UNKNOWN",
  };
  const gate = mechanismGate(edge);
  assertEquals(gate.supported, false);
  assert(gate.reason.includes("chronology"), `expected the reason to name chronology, got: ${gate.reason}`);
});

Deno.test("EBR: an edge nominated only by correlation, with no mechanism, fails the mechanism gate", () => {
  const edge: CausalEdgeProposal = {
    id: "e2", from: "remittances", to: "local-spend", nominatedBy: ["CORRELATION"],
    mechanismClass: null, temporalStatus: "UNKNOWN", provenanceRoots: ["central-bank"],
    testableImplication: null, knownContradictions: [], epistemicLabel: "UNKNOWN",
  };
  assertEquals(mechanismGate(edge).supported, false);
});

Deno.test("EBR: an edge with a real mechanism, testable implication, provenance root and epistemic label is supported", () => {
  const edge: CausalEdgeProposal = {
    id: "e3", from: "warning-957", to: "operator-decision-958", nominatedBy: ["MECHANISM"],
    mechanismClass: "OPERATOR_PERCEIVED_WARNING_AND_ADJUSTED_PLAN", temporalStatus: "BEFORE",
    provenanceRoots: ["grid-sensor-7", "operator-interview"],
    testableImplication: "If the operator saw the warning, the control log should show a plan adjustment logged after 09:57.",
    knownContradictions: [], epistemicLabel: "DOCUMENTED",
  };
  const gate = mechanismGate(edge);
  assertEquals(gate.supported, true);
  assert(gate.reason.includes("OPERATOR_PERCEIVED_WARNING_AND_ADJUSTED_PLAN"));
});

// --- 6/7. Admissibility gate + evidence profile never invents a probability -----------------------

Deno.test("EBR: a candidate with an unresolved required bridge is never admissible, regardless of other support", () => {
  const supportedEdge: CausalEdgeProposal = {
    id: "supported", from: "a", to: "b", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE",
    provenanceRoots: ["root1", "root2", "root3"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED",
  };
  const unresolvedEdge: CausalEdgeProposal = {
    id: "unresolved", from: "b", to: "c", nominatedBy: ["CHRONOLOGY"], mechanismClass: null, temporalStatus: "BEFORE",
    provenanceRoots: [], testableImplication: null, knownContradictions: [], epistemicLabel: "UNKNOWN",
  };
  const history: CandidateHistory = { id: "h1", label: "Strong-looking but incomplete history", edges: [supportedEdge, unresolvedEdge] };
  const profile = evidenceProfile(history, []);
  assertEquals(profile.unresolvedRequiredBridges, 1);
  assertEquals(isAdmissible(profile), false, "many supporting roots must never compensate for a missing required bridge");
});

Deno.test("EBR: a hard contradiction blocks admissibility even with full mechanism coverage", () => {
  const items: EvidenceItem[] = [{ id: "contra-1", eventTime: "t", recordTime: "t", provenance: "p", epistemicStatus: "DOCUMENTED", contradictionSeverity: "HARD" }];
  const edge: CausalEdgeProposal = {
    id: "e1", from: "a", to: "b", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE",
    provenanceRoots: ["root1"], testableImplication: "x", knownContradictions: ["contra-1"], epistemicLabel: "DOCUMENTED",
  };
  const history: CandidateHistory = { id: "h1", label: "Fully mechanistic but hard-contradicted", edges: [edge] };
  const profile = evidenceProfile(history, items);
  assertEquals(profile.mechanismCoverage, 1);
  assertEquals(profile.hardContradictionCount, 1);
  assertEquals(isAdmissible(profile), false, "an adjudicated hard contradiction must never be outweighed by full mechanism coverage");
});

Deno.test("EBR: evidenceProfile never produces a probability field -- only counts/ratios grounded in real input", () => {
  const edge: CausalEdgeProposal = {
    id: "e1", from: "a", to: "b", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE",
    provenanceRoots: ["root1"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED",
  };
  const profile = evidenceProfile({ id: "h1", label: "h1", edges: [edge] }, []);
  assert(!("probability" in profile), "EvidenceProfile must never carry a probability field");
});

// --- 8. Ranking preserves ties/incomparability rather than forcing a fake unique winner -----------

Deno.test("EBR: rankCandidates keeps two equally-supported candidates tied, not arbitrarily ordered as distinct", () => {
  const makeEdge = (id: string): CausalEdgeProposal => ({
    id, from: "a", to: "b", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE",
    provenanceRoots: ["root1"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED",
  });
  const h1: CandidateHistory = { id: "h1", label: "History 1", edges: [makeEdge("e1")] };
  const h2: CandidateHistory = { id: "h2", label: "History 2", edges: [makeEdge("e2")] };
  const ranked = rankCandidates([h1, h2], []);
  assertEquals(ranked.length, 2);
  assertEquals(ranked[0].profile.mechanismCoverage, ranked[1].profile.mechanismCoverage);
  assertEquals(ranked[0].admissible, true);
  assertEquals(ranked[1].admissible, true);
});

Deno.test("EBR: an inadmissible candidate never outranks an admissible one, however high its raw coverage looks", () => {
  const admissibleEdge: CausalEdgeProposal = {
    id: "e1", from: "a", to: "b", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE",
    provenanceRoots: ["root1"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED",
  };
  const items: EvidenceItem[] = [{ id: "contra-1", eventTime: "t", recordTime: "t", provenance: "p", epistemicStatus: "DOCUMENTED", contradictionSeverity: "HARD" }];
  const hardContradictedEdge: CausalEdgeProposal = { ...admissibleEdge, id: "e2", knownContradictions: ["contra-1"] };
  const admissibleHistory: CandidateHistory = { id: "admissible", label: "Admissible", edges: [admissibleEdge] };
  const contradictedHistory: CandidateHistory = { id: "contradicted", label: "Hard-contradicted", edges: [hardContradictedEdge] };
  const ranked = rankCandidates([contradictedHistory, admissibleHistory], items);
  assertEquals(ranked[0].history.id, "admissible", "admissibility must dominate the ranking regardless of input order");
});

Deno.test("EBR: no consciousness claim can appear anywhere in this module's exported behavior", () => {
  const edge: CausalEdgeProposal = {
    id: "e1", from: "a", to: "b", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE",
    provenanceRoots: ["root1"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED",
  };
  const gate = mechanismGate(edge);
  const profile = evidenceProfile({ id: "h1", label: "h1", edges: [edge] }, []);
  const serialized = JSON.stringify({ gate, profile });
  assert(!/conscious/i.test(serialized), "EBR output must never contain a consciousness claim");
});

Deno.test("EBR: mechanismGate is a pure function -- same input always yields the same verdict", () => {
  const edge: CausalEdgeProposal = {
    id: "e1", from: "a", to: "b", nominatedBy: ["MECHANISM"], mechanismClass: "M", temporalStatus: "BEFORE",
    provenanceRoots: ["root1"], testableImplication: "x", knownContradictions: [], epistemicLabel: "DOCUMENTED",
  };
  const first = mechanismGate(edge);
  const second = mechanismGate(edge);
  assertEquals(first.supported, second.supported);
  assertNotEquals(edge.epistemicLabel, "UNKNOWN");
});
