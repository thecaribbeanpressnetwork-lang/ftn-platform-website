// FTN Platform — unit/behavioral tests for the newly-ported reasoning-engine adapters (Butterfly,
// Prediction/Foresight, Context Graph, Connection Fabric). Run with:
//   deno test --allow-env supabase/functions/_shared/ibis-reasoning-engines.test.ts
//
// Each engine is proven twice: (1) honestly SKIPPED with no structured input (the real state for an
// ordinary free-text canonical-brain query today -- no data source is wired in yet), and (2)
// genuinely EXECUTED with real structured input, so the port itself is proven correct and not just
// "present but permanently dead."
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runButterfly, runPrediction, runContextGraph, runConnectionFabric, runEBR, ContextGraph, explainConnection, connectionPlan, type EBRInput } from "./ibis-reasoning-engines.ts";
import type { IbisProduct } from "./ibis-intelligence-gateway.ts";
import type { EvidenceItem, CandidateHistory, CausalEdgeProposal } from "./ibis-ebr-engine.ts";

// --- BUTTERFLY -----------------------------------------------------------------------------------

Deno.test("Butterfly: no structured input -> honestly SKIPPED, never fabricated", () => {
  const result = runButterfly(null);
  assertEquals(result.executed, false);
  assertEquals(result.status, "SKIPPED");
  assert(result.reason && result.reason.length > 0);
});

Deno.test("Butterfly: real action + expected effects -> genuinely executes, formula matches B(a)=sum(P.V.D)", () => {
  const result = runButterfly({
    action: "Launch FTN Opportunities beta",
    expectedEffects: [
      { probability: 0.8, strategicValue: 6, connectivity: 4 }, // 0.8*6*4 = 19.2
      { probability: 0.5, strategicValue: 3, connectivity: 2 }, // 0.5*3*2 = 3
    ],
  });
  assertEquals(result.executed, true);
  assertEquals(result.status, "OK");
  assertEquals(result.engine, "BUTTERFLY");
  assert(result.findings.some((f) => f.includes("22.20")), `expected 22.20 in findings, got: ${result.findings.join(" | ")}`);
});

Deno.test("Butterfly: clamps out-of-range values instead of trusting untrusted magnitudes", () => {
  const result = runButterfly({ action: "test", expectedEffects: [{ probability: 5, strategicValue: 999, connectivity: -50 }] });
  // probability clamped to 1, strategicValue clamped to 10, connectivity clamped to 0 -> value 0
  assertEquals(result.executed, true);
  assert(result.findings.some((f) => f.includes("0.00")));
});

// --- PREDICTION / FORESIGHT -----------------------------------------------------------------------

Deno.test("Prediction: no structured input -> honestly SKIPPED, never fabricated", () => {
  const result = runPrediction(null);
  assertEquals(result.executed, false);
  assertEquals(result.status, "SKIPPED");
});

Deno.test("Prediction: real opportunity match with a near deadline -> genuinely executes with a real candidate", () => {
  const result = runPrediction({
    opportunityMatches: [{ opportunity: { id: "cdb-fund-1", title: "CDB Digital Fund", deadline: "2026-09-20" } }],
    now: "2026-09-16T00:00:00Z",
  });
  assertEquals(result.executed, true);
  assertEquals(result.status, "OK");
  assert(result.findings.some((f) => f.includes("CDB Digital Fund")));
  assert(result.assumptions.some((a) => a.includes("probabilitiesEstimated:false")), "must never invent a probability");
});

Deno.test("Prediction: a predictive-signal relationship produces a SIGNAL_WATCH candidate, never causal", () => {
  const result = runPrediction({ relationships: [{ id: "r1", type: "predictive", outOfSampleValidated: true, fromLabel: "Remittance volume", toLabel: "Local spend" }] });
  assertEquals(result.executed, true);
  assert(result.findings.some((f) => f.includes("Watch Local spend")));
});

Deno.test("Prediction: an expired-deadline opportunity is dropped, not reported as still actionable", () => {
  // A real (non-empty) input was genuinely supplied and evaluated, so this still executes -- it
  // just honestly produces zero candidates, distinct from SKIPPED (no input at all).
  const result = runPrediction({ opportunityMatches: [{ opportunity: { id: "x", title: "Expired grant", deadline: "2020-01-01" } }], now: "2026-09-16T00:00:00Z" });
  assertEquals(result.executed, true);
  assert(result.findings.some((f) => f.includes("No opportunity deadline")), "an expired-only opportunity must not be reported as an actionable candidate");
});

// --- CONTEXT GRAPH ---------------------------------------------------------------------------------

const PRODUCTS: IbisProduct[] = [
  { name: "FTN ibis", route: "/ibis-ai/" },
  { name: "FTN Opportunities", route: "/opportunities/" },
];

Deno.test("Context Graph: always executes deterministically (grounded to the request's own product list)", () => {
  const result = runContextGraph(PRODUCTS, ["/ibis-ai/"]);
  assertEquals(result.executed, true);
  assertEquals(result.status, "OK");
  assert(result.findings.some((f) => f.includes("2 node(s)")));
  assert(result.findings.some((f) => f.includes("FTN ibis")));
  assert(result.findings.some((f) => f.includes("No dependency-edge data")), "must disclose the server-side edge-data gap honestly");
});

Deno.test("Context Graph: empty product list still executes honestly with zero nodes, never invents one", () => {
  const result = runContextGraph([], []);
  assertEquals(result.executed, true);
  assert(result.findings[0].includes("zero nodes"));
});

Deno.test("Context Graph: Graph/explainConnection primitives work (direct + one-hop + not-connected)", () => {
  const g = new ContextGraph();
  g.addNode({ type: "FTN_PRODUCT", id: "ibis-ai", label: "FTN ibis" });
  g.addNode({ type: "ORGANIZATION", id: "cdb", label: "CDB" });
  g.addNode({ type: "PLACE", id: "trinidad", label: "Trinidad" });
  g.addEdge({ from: "FTN_PRODUCT:ibis-ai", to: "ORGANIZATION:cdb", relation: "RELEVANT_TO" });
  g.addEdge({ from: "ORGANIZATION:cdb", to: "PLACE:trinidad", relation: "APPLIES_IN" });

  const direct = explainConnection(g, "FTN_PRODUCT", "ibis-ai", "ORGANIZATION", "cdb");
  assertEquals(direct.connected, true);
  assertEquals(direct.direct, true);

  const oneHop = explainConnection(g, "FTN_PRODUCT", "ibis-ai", "PLACE", "trinidad");
  assertEquals(oneHop.connected, true);
  assertEquals(oneHop.direct, false);
  assertEquals(oneHop.path.length, 3);

  const none = explainConnection(g, "FTN_PRODUCT", "ibis-ai", "PLACE", "never-added-place");
  assertEquals(none.connected, false);

  // Re-adding the same edge must not duplicate it.
  g.addEdge({ from: "FTN_PRODUCT:ibis-ai", to: "ORGANIZATION:cdb", relation: "RELEVANT_TO" });
  assertEquals(g.edges.length, 2, "duplicate addEdge() must be deduplicated by from|relation|to");
});

// --- CONNECTION FABRIC -----------------------------------------------------------------------------

Deno.test("Connection Fabric: no provider named -> honestly SKIPPED", () => {
  const result = runConnectionFabric(null);
  assertEquals(result.executed, false);
  assertEquals(result.status, "SKIPPED");
});

Deno.test("Connection Fabric: a named provider genuinely executes and truthfully reports no server-side gateway", () => {
  const result = runConnectionFabric("gmail");
  assertEquals(result.executed, true);
  assertEquals(result.status, "OK");
  assert(result.findings[0].includes("gmail"));
  assert(result.findings[0].includes("No connection gateway"), "must not fabricate a ready route that does not exist server-side");
});

Deno.test("Connection Fabric: connectionPlan() preserves the exact DIRECT->MCP->ACTIVEPIECES->NANGO->REST order", () => {
  const plan = connectionPlan("hubspot");
  assertEquals(plan.preferredOrder, ["DIRECT", "MCP", "ACTIVEPIECES", "NANGO", "REST"]);
});

// --- EBR (Evidence-Bounded Retrodiction) ------------------------------------------------------
// See GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md. Source methodology: Ricardo Gill's published EBR
// protocol (DOI 10.5281/zenodo.22681856) -- NOT the separate Gill Cohesive Consciousness Hypothesis.

Deno.test("EBR: no structured input -> honestly SKIPPED, never fabricated", () => {
  const result = runEBR(null);
  assertEquals(result.executed, false);
  assertEquals(result.status, "SKIPPED");
  assert(result.reason && result.reason.length > 0);
});

const MECHANISM_EDGE: CausalEdgeProposal = {
  id: "e1", from: "warning-957", to: "operator-decision-958", nominatedBy: ["MECHANISM"],
  mechanismClass: "OPERATOR_PERCEIVED_WARNING_AND_ADJUSTED_PLAN", temporalStatus: "BEFORE",
  provenanceRoots: ["grid-sensor-7", "operator-interview"],
  testableImplication: "The control log should show a plan adjustment logged after 09:57.",
  knownContradictions: [], epistemicLabel: "DOCUMENTED",
};

function ebrInput(overrides: Partial<EBRInput> = {}): EBRInput {
  const items: EvidenceItem[] = [
    { id: "warning-957", eventTime: "2026-09-10T09:57:00Z", recordTime: "2026-09-10T09:57:30Z", provenance: "grid-sensor-7", epistemicStatus: "DOCUMENTED" },
  ];
  const histories: CandidateHistory[] = [{ id: "h1", label: "Operator saw the grid warning and adjusted plan", edges: [MECHANISM_EDGE] }];
  return { actor: "operator-1", decisionTime: "2026-09-10T09:58:00Z", auditCutoff: "2026-09-10T12:00:00Z", evidenceItems: items, candidateHistories: histories, ...overrides };
}

Deno.test("EBR: real evidence + an admissible candidate history genuinely executes with concrete findings", () => {
  const result = runEBR(ebrInput());
  assertEquals(result.executed, true);
  assertEquals(result.status, "OK");
  assertEquals(result.engine, "EBR");
  assert(result.findings.some((f) => f.includes("K_att")), "must name the attested-knowledge view explicitly");
  assert(result.findings.some((f) => f.includes("Strongest admissible candidate")), "must report a real, concrete result, not just executed:true");
  assert(result.findings.some((f) => f.includes("⊥")), "must always preserve the unmodeled-history reserve");
});

Deno.test("EBR: no candidate is admissible -> honestly abstains rather than forcing a pick", () => {
  const unsupportedEdge: CausalEdgeProposal = { ...MECHANISM_EDGE, id: "e2", mechanismClass: null, nominatedBy: ["CHRONOLOGY"], testableImplication: null, epistemicLabel: "UNKNOWN" };
  const result = runEBR(ebrInput({ candidateHistories: [{ id: "h1", label: "Chronology-only guess", edges: [unsupportedEdge] }] }));
  assertEquals(result.executed, true, "the engine genuinely ran and evaluated the input -- abstaining is a real outcome, not a skip");
  assert(result.findings.some((f) => f.includes("abstains")), "must state the abstention explicitly");
  assertEquals(result.confidence, "UNAVAILABLE");
});

Deno.test("EBR: contradictions are reported, never silently resolved into a single score", () => {
  const items: EvidenceItem[] = [
    { id: "a", eventTime: "t", recordTime: "t", provenance: "p1", epistemicStatus: "DOCUMENTED", contradicts: ["b"], contradictionSeverity: "SOFT" },
    { id: "b", eventTime: "t", recordTime: "t", provenance: "p2", epistemicStatus: "DOCUMENTED" },
  ];
  const result = runEBR(ebrInput({ evidenceItems: items }));
  assert(result.findings.some((f) => f.includes("1 contradiction")));
});

Deno.test("EBR: output never contains a fabricated probability or a consciousness claim", () => {
  const result = runEBR(ebrInput());
  const serialized = JSON.stringify(result);
  assert(!/"probability"\s*:/.test(serialized), "EBR must never attach a probability field to its result");
  assert(!/conscious/i.test(serialized), "EBR must never claim consciousness -- see GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md");
});

// --- Composability correction: real evidence with no candidate history, and no actor/decision-time
// context (the shape ibis-canonical-brain.ts's buildEbrInputFromSources() now produces from
// grounded search results for an ordinary query) -- must genuinely execute a CONDITIONAL,
// evidence-only finding, never SKIPPED (real evidence exists) and never a fabricated actor access.

Deno.test("EBR: real evidence with NO candidate history genuinely executes a CONDITIONAL evidence-only finding, never SKIPPED", () => {
  const result = runEBR({
    auditCutoff: "2026-09-16T12:00:00Z",
    evidenceItems: [
      { id: "src-1", eventTime: "2026-09-01T00:00:00Z", recordTime: "2026-09-16T11:00:00Z", provenance: "central-bank.org.tt", epistemicStatus: "DOCUMENTED" },
    ],
    // no candidateHistories, no actor, no decisionTime
  });
  assertEquals(result.executed, true, "real grounded evidence means this must genuinely run, not be SKIPPED");
  assertEquals(result.status, "OK");
  assert(result.findings.some((f) => f.includes("No candidate causal history was supplied")), "must disclose that no candidate was evaluated");
  assert(result.findings.some((f) => f.includes("⊥")), "must preserve the unmodeled-history reserve");
  assert(result.evidenceReferences.includes("central-bank.org.tt"), "must surface real provenance");
});

Deno.test("EBR: no actor/decisionTime supplied -> never infers actor access, honestly discloses K_att was not evaluated", () => {
  const result = runEBR({
    auditCutoff: "2026-09-16T12:00:00Z",
    evidenceItems: [{ id: "src-1", eventTime: "2026-09-01T00:00:00Z", recordTime: "2026-09-16T11:00:00Z", provenance: "central-bank.org.tt", epistemicStatus: "DOCUMENTED" }],
    candidateHistories: [{ id: "h1", label: "chronology only", edges: [{ id: "e1", from: "a", to: "b", nominatedBy: ["CHRONOLOGY"], mechanismClass: null, temporalStatus: "BEFORE", provenanceRoots: [], testableImplication: null, knownContradictions: [], epistemicLabel: "UNKNOWN" }] }],
  });
  assertEquals(result.executed, true);
  assert(result.findings.some((f) => f.includes("Actor access is never inferred merely because evidence exists")), "must explicitly disclose the no-actor-context limitation rather than silently omitting K_att");
  assert(!result.findings.some((f) => f.includes("K_att) for")), "must not fabricate a K_att computation for an unnamed actor");
});
