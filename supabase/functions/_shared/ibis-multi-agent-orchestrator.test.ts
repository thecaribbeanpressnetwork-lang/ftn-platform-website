// FTN Platform — unit tests for the internal Multi-Agent execution scheduler. Run with:
//   deno test --allow-env supabase/functions/_shared/ibis-multi-agent-orchestrator.test.ts
//
// See GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md for the source/boundary this follows: this is
// NOT a port of js/ibis-multi-agent-orchestrator.js -- it is a new, internal, dependency-aware
// scheduler over the canonical brain's own pure reasoning engines.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  runOrchestration, deriveButterflyInputFromPathway, deriveForesightInputFromPlace,
  BUTTERFLY_BRIDGE_DISCLOSURE, type OrchestrationInput,
} from "./ibis-multi-agent-orchestrator.ts";
import type { PlannedCapability, CapabilityReceiptEntry } from "./ibis-response-envelope.ts";
import type { PlaceEntity, PathwayStep } from "./ibis-ecomap-engine.ts";

function baseInput(overrides: Partial<OrchestrationInput> = {}): OrchestrationInput {
  return {
    text: "I want to start a community food business in Tobago.",
    objective: "I want to start a community food business in Tobago.",
    products: [],
    toolAction: null,
    sources: [],
    researchReceipt: null,
    advanced: {},
    ...overrides,
  };
}

function plan(...capabilities: PlannedCapability["capability"][]): PlannedCapability[] {
  return capabilities.map((capability) => ({ capability, reason: "test" }));
}

function findReceipt(receipts: CapabilityReceiptEntry[], capability: string): CapabilityReceiptEntry | undefined {
  return receipts.find((r) => r.capability === capability);
}

// --- Basic scheduling: empty/simple plans do nothing unnecessary ---------------------------------

Deno.test("Orchestrator: an empty plan produces no reasoning modes and no receipts", () => {
  const result = runOrchestration([], baseInput());
  assertEquals(result.reasoningModesUsed.length, 0);
  assertEquals(result.capabilityExecution.length, 0);
});

Deno.test("Orchestrator: FOUNDER_THINKING alone genuinely executes and ends EXECUTED", () => {
  const result = runOrchestration(plan("FOUNDER_THINKING"), baseInput());
  const receipt = findReceipt(result.capabilityExecution, "FOUNDER_THINKING")!;
  assert(receipt);
  assertEquals(receipt.finalState, "EXECUTED");
  assert(receipt.history.some((h) => h.state === "SELECTED"));
  assert(receipt.history.some((h) => h.state === "INPUT_READY"));
  assert(result.reasoningModesUsed.some((m) => m.mode === "FOUNDER_COGNITIVE_LAYER" && m.executed === true));
});

// --- Distinguishing SELECTED from genuinely operational (the concern this checkpoint fixes) ------

Deno.test("Orchestrator: BUTTERFLY selected with no pathway output and no advanced input ends SKIPPED_MISSING_INPUT, never fabricated EXECUTED", () => {
  const result = runOrchestration(plan("FOUNDER_THINKING", "BUTTERFLY"), baseInput());
  const receipt = findReceipt(result.capabilityExecution, "BUTTERFLY")!;
  assertEquals(receipt.finalState, "SKIPPED_MISSING_INPUT");
  assert(!receipt.history.some((h) => h.state === "INPUT_READY"), "must never claim INPUT_READY without a real, non-fabricated input");
  const record = result.reasoningModesUsed.find((m) => m.mode === "BUTTERFLY")!;
  assertEquals(record.executed, false);
});

Deno.test("Orchestrator: PREDICTION selected with no place output and no advanced input ends SKIPPED_MISSING_INPUT", () => {
  const result = runOrchestration(plan("PREDICTION"), baseInput());
  const receipt = findReceipt(result.capabilityExecution, "PREDICTION")!;
  assertEquals(receipt.finalState, "SKIPPED_MISSING_INPUT");
});

Deno.test("Orchestrator: CORRELATION selected with no advanced series ends SKIPPED_MISSING_INPUT; with a real series pair genuinely EXECUTES", () => {
  const withoutSeries = runOrchestration(plan("CORRELATION"), baseInput());
  assertEquals(findReceipt(withoutSeries.capabilityExecution, "CORRELATION")!.finalState, "SKIPPED_MISSING_INPUT");

  const seriesA = { id: "a", periods: ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05"], values: [1, 2, 3, 4, 5] };
  const seriesB = { id: "b", periods: ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05"], values: [2, 4, 6, 8, 10] };
  const withSeries = runOrchestration(plan("CORRELATION"), baseInput({ advanced: { correlationInput: { seriesA, seriesB } } }));
  const receipt = findReceipt(withSeries.capabilityExecution, "CORRELATION")!;
  assertEquals(receipt.finalState, "EXECUTED");
  assert(receipt.history.some((h) => h.state === "INPUT_READY"));
});

// --- Dependency graph: EcoMap Place/Pathway feed Context Graph/Butterfly/Prediction ----------------

const PATHWAY_SOURCES = [{ id: "s1", title: "Free Food Safety Certification Workshop (No Cost)", text: "Free Food Safety Certification Workshop (No Cost)", url: "https://example.tt/a", publisher: "gov.tt", origin: "SEARCH" as const, recordedAt: "2026-01-01T00:00:00Z", confidence: "INFERRED" as const }];
const PLACE_SOURCES = [{ id: "s2", title: "Tobago Youth Entrepreneurship Grant Programme", text: "Tobago Youth Entrepreneurship Grant Programme", url: "https://example.tt/b", publisher: "gov.tt", origin: "SEARCH" as const, recordedAt: "2026-01-01T00:00:00Z", confidence: "INFERRED" as const }];

Deno.test("Orchestrator: BUTTERFLY genuinely executes using EcoMap Pathway's real steps, discloses the heuristic transformation", () => {
  const result = runOrchestration(plan("ECOMAP_PATHWAY", "BUTTERFLY"), baseInput({ sources: [], advanced: { ecomapPathwayContext: { outcome: "Register a food business", sources: PATHWAY_SOURCES } } }));
  const pathwayReceipt = findReceipt(result.capabilityExecution, "ECOMAP_PATHWAY")!;
  assertEquals(pathwayReceipt.finalState, "EXECUTED");
  const butterflyReceipt = findReceipt(result.capabilityExecution, "BUTTERFLY")!;
  assertEquals(butterflyReceipt.finalState, "EXECUTED", "Butterfly must genuinely execute once EcoMap Pathway produced real steps");
  const butterflyRecord = result.reasoningModesUsed.find((m) => m.mode === "BUTTERFLY")!;
  assert(butterflyRecord.contribution!.includes("fixed, disclosed heuristic"), "the qualitative-to-bounded-category transformation must be disclosed");
});

Deno.test("Orchestrator: PREDICTION genuinely executes using EcoMap Place's real OPPORTUNITY entity, never a fabricated deadline", () => {
  const result = runOrchestration(plan("ECOMAP_PLACE", "PREDICTION"), baseInput({ advanced: { ecomapPlaceContext: { sources: PLACE_SOURCES, jurisdiction: "Tobago" } } }));
  const placeReceipt = findReceipt(result.capabilityExecution, "ECOMAP_PLACE")!;
  assertEquals(placeReceipt.finalState, "EXECUTED");
  const predictionReceipt = findReceipt(result.capabilityExecution, "PREDICTION")!;
  assertEquals(predictionReceipt.finalState, "EXECUTED");
  const predictionRecord = result.reasoningModesUsed.find((m) => m.mode === "PREDICTION")!;
  // No deadline was ever stated by the source, so the real (unmodified) foresight engine correctly
  // reports "Keep this opportunity on watch" -- never a fabricated deadline or urgency.
  assert(predictionRecord.contribution!.includes("Keep this opportunity on watch"));
  assert(!/"probability"\s*:\s*[0-9.]/.test(JSON.stringify(predictionRecord)), "must never attach a fabricated numeric probability");
});

Deno.test("Orchestrator: CONTEXT_GRAPH consumes EcoMap Place's entities (dependency), even with zero FTN products", () => {
  const result = runOrchestration(plan("ECOMAP_PLACE", "CONTEXT_GRAPH"), baseInput({ advanced: { ecomapPlaceContext: { sources: PLACE_SOURCES, jurisdiction: "Tobago" } } }));
  const record = result.reasoningModesUsed.find((m) => m.mode === "CONTEXT_GRAPH")!;
  assertEquals(record.executed, true);
  assert(record.contribution!.includes("additional node"));
});

Deno.test("deriveButterflyInputFromPathway: empty steps -> null (no fabricated input)", () => {
  assertEquals(deriveButterflyInputFromPathway("goal", []), null);
});

Deno.test("deriveForesightInputFromPlace: no OPPORTUNITY-kind entities -> null", () => {
  const entities: PlaceEntity[] = [{
    id: "x", name: "Some Service Office", kind: "SERVICE", jurisdiction: null, locationPrecision: "UNSPECIFIED",
    confirmedLocation: null, inferredCoverage: null, availability: "UNKNOWN", eligibility: null, accessibilityNotes: null,
    geographicConstraints: null, provenance: "p", confidence: "INFERRED", lastCheckedAt: "2026-01-01T00:00:00Z",
  }];
  assertEquals(deriveForesightInputFromPlace(entities), null);
});

// --- MULTI_AGENT itself ---------------------------------------------------------------------------

Deno.test("Orchestrator: MULTI_AGENT genuinely executes, summarizes real dependency relationships, and never claims external-action authority", () => {
  const result = runOrchestration(
    plan("ECOMAP_PLACE", "ECOMAP_PATHWAY", "CONTEXT_GRAPH", "BUTTERFLY", "PREDICTION", "MULTI_AGENT"),
    baseInput({ advanced: { ecomapPlaceContext: { sources: PLACE_SOURCES, jurisdiction: "Tobago" }, ecomapPathwayContext: { outcome: "Register", sources: PATHWAY_SOURCES } } }),
  );
  const receipt = findReceipt(result.capabilityExecution, "MULTI_AGENT")!;
  assertEquals(receipt.finalState, "EXECUTED");
  const record = result.reasoningModesUsed.find((m) => m.mode === "MULTI_AGENT")!;
  assertEquals(record.executed, true);
  assert(record.contribution!.includes("Context Graph re-grounded"));
  assert(record.contribution!.includes("Butterfly's input was derived"));
  assert(record.contribution!.includes("Prediction/Foresight's input was derived"));
  assert(record.contribution!.includes("no external-action or connected-app authority"));
});

// --- Failure and budget discipline -----------------------------------------------------------------

Deno.test("Orchestrator: one capability throwing produces FAILED for that capability only, never crashes the scheduler", () => {
  const poisoned = new Proxy({}, { get() { throw new Error("boom"); } });
  const result = runOrchestration(
    plan("EBR", "FOUNDER_THINKING"),
    baseInput({ sources: [poisoned as unknown as OrchestrationInput["sources"][number]] }),
  );
  const ebrReceipt = findReceipt(result.capabilityExecution, "EBR")!;
  assertEquals(ebrReceipt.finalState, "FAILED");
  assert(ebrReceipt.history.some((h) => h.reason?.includes("boom")));
  // The OTHER capability must still have genuinely run -- one throw must not crash the whole request.
  const founderReceipt = findReceipt(result.capabilityExecution, "FOUNDER_THINKING")!;
  assertEquals(founderReceipt.finalState, "EXECUTED");
});

Deno.test("Orchestrator: execution-budget exhaustion produces SKIPPED_BUDGET for capabilities never reached, never a crash", () => {
  const result = runOrchestration(plan("FOUNDER_THINKING", "CONTEXT_GRAPH", "CONNECTION_FABRIC"), baseInput({ executionBudgetMs: -1 }));
  for (const capability of ["FOUNDER_THINKING", "CONTEXT_GRAPH", "CONNECTION_FABRIC"]) {
    const receipt = findReceipt(result.capabilityExecution, capability)!;
    assertEquals(receipt.finalState, "SKIPPED_BUDGET", `${capability} must honestly report budget exhaustion, not silently succeed or vanish`);
  }
});

Deno.test("Orchestrator: every capability in the plan ends in exactly one terminal, non-transient state", () => {
  const TRANSIENT = new Set(["SELECTED", "INPUT_READY"]);
  const result = runOrchestration(
    plan("FOUNDER_THINKING", "BUTTERFLY", "PREDICTION", "CORRELATION", "ECOMAP_PLACE", "ECOMAP_PATHWAY", "ECOMAP_RELATIONSHIP", "CONTEXT_GRAPH", "CONNECTION_FABRIC", "EBR"),
    baseInput(),
  );
  for (const receipt of result.capabilityExecution) {
    assert(!TRANSIENT.has(receipt.finalState), `${receipt.capability} must not end in a transient state (${receipt.finalState})`);
  }
});

Deno.test("Orchestrator: no consciousness claim anywhere in orchestration output", () => {
  const result = runOrchestration(plan("MULTI_AGENT", "FOUNDER_THINKING"), baseInput());
  assert(!/conscious/i.test(JSON.stringify(result)));
});
