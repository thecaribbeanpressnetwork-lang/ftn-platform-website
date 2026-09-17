// FTN Platform — internal canonical execution scheduler ("Multi-Agent Orchestration").
//
// SOURCE/BOUNDARY: see GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md before extending this file.
// This is NOT a port of js/ibis-multi-agent-orchestrator.js (a role-playing, permission-gated,
// external-action orchestrator that depends on FTN.Auth/FTN.PermissionLedger/FTN.UniversalRouter/
// FTN.HeadspaceFabric -- none of which exist or are reproduced server-side). This module is a NEW,
// internal, read-only, dependency-aware SCHEDULER over the canonical brain's own already-real
// reasoning engines (ibis-reasoning-engines.ts). It never issues a new provider/LLM call of its
// own -- every engine it schedules is a pure, synchronous, zero-cost function -- and it never
// gains external-action authority.
//
// ibis-canonical-brain.ts remains the one canonical orchestrator/endpoint. This module is a
// function it calls, not a competing router or brain.
//
// Dependency graph this scheduler applies (fixed, documented, never a generic graph-executor --
// the graph is small and worth keeping literally readable):
//   PHASE A (independent -- only need the request's own text/products/advanced input or the
//            evidence already normalized once from search):
//     FOUNDER_THINKING, CONNECTION_FABRIC, CORRELATION, EBR, ECOMAP_PLACE, ECOMAP_PATHWAY,
//     ECOMAP_RELATIONSHIP
//   PHASE B (depend on Phase A outputs):
//     CONTEXT_GRAPH   <- EcoMap Place's entities (grounds the graph to real discovered services)
//     BUTTERFLY       <- EcoMap Pathway's steps (a disclosed confidence->P/V/D heuristic bridge)
//     PREDICTION      <- EcoMap Place's OPPORTUNITY-kind entities (a real, non-fabricated bridge)
//   PHASE C:
//     MULTI_AGENT itself -- summarizes what was actually coordinated, once everything else is done.
// RESEARCH is NOT scheduled here: it is the one genuinely asynchronous, real-I/O capability, and
// stays in ibis-canonical-brain.ts (already real, already tested); its own CapabilityReceiptEntry
// is built there and passed in via `researchReceipt` so it still appears in one complete receipt.

import type { IbisProduct } from "./ibis-intelligence-gateway.ts";
import type { Series } from "./ibis-correlation-engine.ts";
import {
  runFounderThinking, runCorrelation, runButterfly, runPrediction, runContextGraph, runConnectionFabric, runEBR,
  runEcoMapPlace, runEcoMapPathway, runEcoMapRelationship,
  type EBRInput, type EcoMapPlaceInput, type EcoMapPathwayInput, type EcoMapRelationshipInput,
  type ButterflyInput, type PredictionInput, type EngineResult,
} from "./ibis-reasoning-engines.ts";
import { findContradictions, type EvidenceItem } from "./ibis-ebr-engine.ts";
import {
  buildPlaceMap, buildPathwayMap, extractStatedJurisdiction,
  type EcoMapSourceRecord, type PlaceEntity, type PathwayStep, type EvidenceConfidence,
} from "./ibis-ecomap-engine.ts";
import type {
  SourceRecord, ReasoningMode, ReasoningModeRecord, CapabilityKind, PlannedCapability,
  CapabilityExecutionState, CapabilityReceiptEntry,
} from "./ibis-response-envelope.ts";

// --- Evidence normalization (run ONCE, reused by every capability that needs it) -----------------

export function evidenceItemFromSource(source: SourceRecord, index: number): EvidenceItem {
  return {
    id: `search-source-${index}`,
    eventTime: source.publishedAt || source.updatedAt || source.retrievedAt,
    recordTime: source.retrievedAt,
    provenance: source.publisher || source.url,
    epistemicStatus: source.evidenceDepth === "INSPECTED" ? "DOCUMENTED" : "INFERRED",
    scope: "CURRENT_WEB_RESEARCH",
    observerMetadata: { url: source.url, title: source.title },
  };
}

export function buildEbrInputFromSources(sources: SourceRecord[]): EBRInput | null {
  if (!sources.length) return null;
  return { auditCutoff: new Date().toISOString(), evidenceItems: sources.map(evidenceItemFromSource), candidateHistories: [] };
}

export function ecoMapSourceFromSearchResult(source: SourceRecord, index: number): EcoMapSourceRecord {
  return {
    id: `search-source-${index}`, title: source.title, text: source.title, url: source.url, publisher: source.publisher,
    origin: "SEARCH", recordedAt: source.retrievedAt, confidence: source.evidenceDepth === "INSPECTED" ? "CONFIRMED" : "INFERRED",
  };
}

export function buildEcoMapSourcesFromSearch(sources: SourceRecord[]): EcoMapSourceRecord[] {
  return sources.map(ecoMapSourceFromSearchResult);
}

// --- Structured-input bridges (this checkpoint) ---------------------------------------------------
// See GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md's "Structured-input bridges" section. Both
// bridges below build REAL input from EcoMap's already-real, already-sourced output -- never from
// raw free text -- and disclose any qualitative-to-bounded-category conversion explicitly.

// Prediction/Foresight <- EcoMap Place's OPPORTUNITY-kind entities. No deadline is fabricated
// (null unless a source stated one, which none do in this pass); probabilitiesEstimated:false is
// preserved automatically by runPrediction() itself.
export function deriveForesightInputFromPlace(entities: PlaceEntity[]): PredictionInput | null {
  const opportunities = entities.filter((e) => e.kind === "OPPORTUNITY");
  if (!opportunities.length) return null;
  return {
    opportunityMatches: opportunities.map((e) => ({
      opportunity: {
        id: e.id, title: e.name, deadline: null,
        sourceUrl: /^https?:\/\//.test(e.provenance) ? e.provenance : null,
        verifiedAt: e.lastCheckedAt,
      },
    })),
  };
}

// Butterfly <- EcoMap Pathway's steps. Converts each step's qualitative `confidence` label into a
// bounded probability/strategicValue via a FIXED, DISCLOSED heuristic table -- never a measured or
// predicted value. `BUTTERFLY_BRIDGE_DISCLOSURE` states this transformation and must be appended to
// any Butterfly result produced this way.
const CONFIDENCE_TO_PROBABILITY: Record<EvidenceConfidence, number> = {
  CONFIRMED: 0.9, INFERRED: 0.5, CONDITIONAL: 0.3, MISSING: 0.1, UNKNOWN: 0.1,
};
const ZERO_COST_STRATEGIC_VALUE = 5;
const DEFAULT_STRATEGIC_VALUE = 2;
const DEFAULT_CONNECTIVITY = 3;

export function deriveButterflyInputFromPathway(outcome: string, steps: PathwayStep[]): ButterflyInput | null {
  if (!steps.length) return null;
  return {
    action: outcome,
    expectedEffects: steps.map((s) => ({
      label: s.description,
      probability: CONFIDENCE_TO_PROBABILITY[s.confidence] ?? 0.1,
      strategicValue: s.zeroCostAlternative ? ZERO_COST_STRATEGIC_VALUE : DEFAULT_STRATEGIC_VALUE,
      connectivity: DEFAULT_CONNECTIVITY,
    })),
  };
}

export const BUTTERFLY_BRIDGE_DISCLOSURE =
  `Probability/strategicValue for each effect were derived from EcoMap Pathway step confidence labels via a fixed, disclosed heuristic (CONFIRMED=${CONFIDENCE_TO_PROBABILITY.CONFIRMED}/INFERRED=${CONFIDENCE_TO_PROBABILITY.INFERRED}/CONDITIONAL=${CONFIDENCE_TO_PROBABILITY.CONDITIONAL}/MISSING or UNKNOWN=${CONFIDENCE_TO_PROBABILITY.MISSING}; a zero-cost-flagged step gets strategicValue=${ZERO_COST_STRATEGIC_VALUE}, otherwise ${DEFAULT_STRATEGIC_VALUE}; connectivity is defaulted to ${DEFAULT_CONNECTIVITY}, not independently assessed) -- never a measured or predicted value.`;

// --- Per-capability record builders (moved from ibis-canonical-brain.ts this checkpoint) ---------

function founderThinkingRecord(text: string, products: IbisProduct[]): ReasoningModeRecord {
  const result = runFounderThinking(text, products);
  if (!result.executed) return { mode: "FOUNDER_COGNITIVE_LAYER", executed: false, unavailableReason: result.reason || "skipped" };
  return {
    mode: "FOUNDER_COGNITIVE_LAYER",
    executed: true,
    contribution: `${result.findings.join(" ")} This classification and decision directly produced the answer text below (same domain/guidance table, extracted from the real founderReasoningAnswer() logic in ibis-intelligence-gateway.ts, not reinvented).`,
  };
}

function correlationRecord(input: { seriesA: Series; seriesB: Series } | null): ReasoningModeRecord {
  const result = runCorrelation(input?.seriesA ?? null, input?.seriesB ?? null);
  return result.executed
    ? { mode: "CORRELATION", executed: true, contribution: result.findings.join(" ") }
    : { mode: "CORRELATION", executed: false, unavailableReason: result.reason || "skipped" };
}

function butterflyRecord(input: ButterflyInput | null, disclosure?: string): ReasoningModeRecord {
  const result = runButterfly(input);
  if (!result.executed) return { mode: "BUTTERFLY", executed: false, unavailableReason: result.reason || "skipped" };
  return { mode: "BUTTERFLY", executed: true, contribution: `${result.findings.join(" ")}${disclosure ? ` ${disclosure}` : ""}` };
}

function predictionRecord(input: PredictionInput | null): ReasoningModeRecord {
  const result = runPrediction(input);
  return result.executed
    ? { mode: "PREDICTION", executed: true, contribution: result.findings.join(" ") }
    : { mode: "PREDICTION", executed: false, unavailableReason: result.reason || "skipped" };
}

function contextGraphRecord(products: IbisProduct[], ecoMapEntities: PlaceEntity[]): ReasoningModeRecord {
  const result = runContextGraph(products, [], ecoMapEntities);
  return result.executed
    ? { mode: "CONTEXT_GRAPH", executed: true, contribution: result.findings.join(" ") }
    : { mode: "CONTEXT_GRAPH", executed: false, unavailableReason: result.reason || "skipped" };
}

function connectionFabricRecord(provider: string | null): ReasoningModeRecord {
  const result = runConnectionFabric(provider);
  return result.executed
    ? { mode: "CONNECTION_FABRIC", executed: true, contribution: result.findings.join(" ") }
    : { mode: "CONNECTION_FABRIC", executed: false, unavailableReason: result.reason || "skipped" };
}

function ebrRecord(input: EBRInput | null): { record: ReasoningModeRecord; contradictions: string[]; uncertainties: string[] } {
  const result = runEBR(input);
  if (!result.executed || !input) {
    return { record: { mode: "EBR", executed: false, unavailableReason: result.reason || "skipped" }, contradictions: [], uncertainties: [] };
  }
  const contradictions = findContradictions(input.evidenceItems).map(
    (p) => `EBR: evidence "${p.a}" contradicts "${p.b}" (${p.severity}) -- preserved, not resolved into a single score.`,
  );
  const uncertainties = ["EBR: an unmodeled-history reserve (⊥) is preserved -- the candidate histories examined are not claimed to exhaust reality."];
  return { record: { mode: "EBR", executed: true, contribution: result.findings.join(" ") }, contradictions, uncertainties };
}

function ecoMapPlaceRecord(input: EcoMapPlaceInput | null): { record: ReasoningModeRecord; missing: string[] } {
  const result = runEcoMapPlace(input);
  if (!result.executed) return { record: { mode: "ECOMAP_PLACE", executed: false, unavailableReason: result.reason || "skipped" }, missing: [] };
  return { record: { mode: "ECOMAP_PLACE", executed: true, contribution: result.findings.join(" ") }, missing: result.downstreamEffects };
}

function ecoMapPathwayRecord(input: EcoMapPathwayInput | null): { record: ReasoningModeRecord; actions: string[] } {
  const result = runEcoMapPathway(input);
  if (!result.executed) return { record: { mode: "ECOMAP_PATHWAY", executed: false, unavailableReason: result.reason || "skipped" }, actions: [] };
  const actions = result.findings.filter((f) => f.startsWith("Step ") || f.toLowerCase().includes("zero-cost"));
  return { record: { mode: "ECOMAP_PATHWAY", executed: true, contribution: result.findings.join(" ") }, actions: actions.length ? actions : result.findings.slice(0, 3) };
}

function ecoMapRelationshipRecord(input: EcoMapRelationshipInput | null): { record: ReasoningModeRecord; ecosystemConnections: string[] } {
  const result = runEcoMapRelationship(input);
  if (!result.executed) return { record: { mode: "ECOMAP_RELATIONSHIP", executed: false, unavailableReason: result.reason || "skipped" }, ecosystemConnections: [] };
  const ecosystemConnections = result.findings.filter((f) => f.includes("->"));
  return { record: { mode: "ECOMAP_RELATIONSHIP", executed: true, contribution: result.findings.join(" ") }, ecosystemConnections };
}

// --- Execution-state tracking ----------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function newReceipt(capability: CapabilityKind): CapabilityReceiptEntry {
  return { capability, history: [{ state: "SELECTED", at: nowIso() }], finalState: "SELECTED" };
}

function move(entry: CapabilityReceiptEntry, state: CapabilityExecutionState, reason?: string): void {
  entry.history.push({ state, at: nowIso(), reason });
  entry.finalState = state;
}

function terminalStateFor(result: EngineResult): CapabilityExecutionState {
  if (result.executed) return result.status === "DEGRADED" ? "DEGRADED" : "EXECUTED";
  if (result.status === "DEGRADED") return "DEGRADED";
  if (result.status === "NOT_PORTED") return "UNAVAILABLE";
  return "SKIPPED_MISSING_INPUT";
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// CapabilityKind and ReasoningMode share the same string for every capability this scheduler
// handles except FOUNDER_THINKING (-> FOUNDER_COGNITIVE_LAYER) and RESEARCH (not scheduled here --
// see the module header).
function modeFor(capability: CapabilityKind): ReasoningMode | null {
  if (capability === "FOUNDER_THINKING") return "FOUNDER_COGNITIVE_LAYER";
  if (capability === "RESEARCH") return null;
  return capability as ReasoningMode;
}

// --- Public orchestration contract -----------------------------------------------------------

export type OrchestrationAdvancedInputs = {
  ebrInput?: EBRInput | null;
  correlationInput?: { seriesA: Series; seriesB: Series } | null;
  butterflyInput?: ButterflyInput | null;
  predictionInput?: PredictionInput | null;
  ecomapPlaceContext?: EcoMapPlaceInput | null;
  ecomapPathwayContext?: EcoMapPathwayInput | null;
  ecomapRelationshipContext?: EcoMapRelationshipInput | null;
};

export type OrchestrationInput = {
  text: string;
  objective: string | null;
  products: IbisProduct[];
  toolAction: string | null;
  sources: SourceRecord[];
  // Pre-built by ibis-canonical-brain.ts (the one place the real, asynchronous search call
  // happens) -- included here so ONE complete receipt covers every planned capability, RESEARCH
  // included, without this module ever performing I/O itself.
  researchReceipt: CapabilityReceiptEntry | null;
  advanced: OrchestrationAdvancedInputs;
  // Test-only override; production code should omit this. Default is generous because every
  // scheduled engine is synchronous and effectively instant -- this exists as a defensive ceiling,
  // not a tuning knob for normal operation.
  executionBudgetMs?: number;
};

export type OrchestrationResult = {
  reasoningModesUsed: ReasoningModeRecord[];
  capabilityExecution: CapabilityReceiptEntry[];
  contradictions: string[];
  uncertainties: string[];
  actions: string[];
  ecosystemConnections: string[];
};

const DEFAULT_EXECUTION_BUDGET_MS = 5_000;

export function runOrchestration(plan: PlannedCapability[], input: OrchestrationInput): OrchestrationResult {
  const budgetMs = input.executionBudgetMs ?? DEFAULT_EXECUTION_BUDGET_MS;
  const startedAt = Date.now();
  const reasoningModesUsed: ReasoningModeRecord[] = [];
  const contradictions: string[] = [];
  const uncertainties: string[] = [];
  const actions: string[] = [];
  const ecosystemConnections: string[] = [];

  const receipts = new Map<CapabilityKind, CapabilityReceiptEntry>();
  if (input.researchReceipt) receipts.set("RESEARCH", input.researchReceipt);
  for (const p of plan) if (!receipts.has(p.capability)) receipts.set(p.capability, newReceipt(p.capability));

  const has = (c: CapabilityKind): boolean => plan.some((p) => p.capability === c);
  const budgetExceeded = (): boolean => Date.now() - startedAt > budgetMs;
  function skipForBudget(capability: CapabilityKind): void {
    const entry = receipts.get(capability);
    if (!entry || entry.finalState !== "SELECTED") return;
    move(entry, "SKIPPED_BUDGET", "Execution budget exhausted before this capability could be scheduled.");
    const mode = modeFor(capability);
    if (mode) reasoningModesUsed.push({ mode, executed: false, unavailableReason: "Execution budget exhausted before this capability could be scheduled." });
  }

  // Normalize evidence ONCE (lazily -- only if an EcoMap mode is actually planned, so a request
  // with none of them does no wasted work), shared by all three EcoMap modes -- never a duplicate
  // search. Wrapped defensively: a normalization failure degrades to "no evidence" for EcoMap
  // capabilities rather than crashing the whole scheduler (EBR has its own, separate, independently
  // try/caught evidence-preparation call and is unaffected either way).
  let ecoMapSourcesCache: ReturnType<typeof buildEcoMapSourcesFromSearch> | null = null;
  function getEcoMapSources(): ReturnType<typeof buildEcoMapSourcesFromSearch> {
    if (ecoMapSourcesCache === null) {
      try { ecoMapSourcesCache = buildEcoMapSourcesFromSearch(input.sources); }
      catch { ecoMapSourcesCache = []; }
    }
    return ecoMapSourcesCache;
  }
  const jurisdiction = extractStatedJurisdiction(input.text);
  const goal = input.objective || input.text;
  let placeEntities: PlaceEntity[] = [];
  let pathwaySteps: PathwayStep[] = [];

  // --- PHASE A: independent capabilities ----------------------------------------------------

  if (has("FOUNDER_THINKING")) {
    const entry = receipts.get("FOUNDER_THINKING")!;
    if (budgetExceeded()) skipForBudget("FOUNDER_THINKING");
    else {
      move(entry, "INPUT_READY"); // text+products are always structurally present
      try {
        const result = runFounderThinking(input.text, input.products);
        reasoningModesUsed.push(founderThinkingRecord(input.text, input.products));
        move(entry, terminalStateFor(result));
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "FOUNDER_COGNITIVE_LAYER", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("CONNECTION_FABRIC")) {
    const entry = receipts.get("CONNECTION_FABRIC")!;
    if (budgetExceeded()) skipForBudget("CONNECTION_FABRIC");
    else {
      if (input.toolAction) move(entry, "INPUT_READY");
      try {
        const record = connectionFabricRecord(input.toolAction);
        reasoningModesUsed.push(record);
        move(entry, input.toolAction ? (record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "CONNECTION_FABRIC", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("CORRELATION")) {
    const entry = receipts.get("CORRELATION")!;
    if (budgetExceeded()) skipForBudget("CORRELATION");
    else {
      const corrInput = input.advanced.correlationInput ?? null;
      if (corrInput) move(entry, "INPUT_READY");
      try {
        const record = correlationRecord(corrInput);
        reasoningModesUsed.push(record);
        move(entry, corrInput ? (record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "CORRELATION", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("EBR")) {
    const entry = receipts.get("EBR")!;
    if (budgetExceeded()) skipForBudget("EBR");
    else {
      // Input preparation is wrapped in the SAME try/catch as the engine call: a malformed source
      // must produce FAILED, never crash the whole scheduler (the "one engine throws" requirement).
      try {
        const ebrInput = input.advanced.ebrInput ?? buildEbrInputFromSources(input.sources);
        if (ebrInput) move(entry, "INPUT_READY");
        const ebr = ebrRecord(ebrInput);
        reasoningModesUsed.push(ebr.record);
        contradictions.push(...ebr.contradictions);
        uncertainties.push(...ebr.uncertainties);
        move(entry, ebrInput ? (ebr.record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "EBR", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("ECOMAP_PLACE")) {
    const entry = receipts.get("ECOMAP_PLACE")!;
    if (budgetExceeded()) skipForBudget("ECOMAP_PLACE");
    else {
      try {
        const ecoMapSources = getEcoMapSources();
        const placeInputUsed = input.advanced.ecomapPlaceContext ?? (ecoMapSources.length ? { sources: ecoMapSources, jurisdiction } : null);
        if (placeInputUsed) move(entry, "INPUT_READY");
        const place = ecoMapPlaceRecord(placeInputUsed);
        reasoningModesUsed.push(place.record);
        uncertainties.push(...place.missing.map((m) => `EcoMap Place: ${m}`));
        move(entry, placeInputUsed ? (place.record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
        if (place.record.executed && placeInputUsed) {
          placeEntities = buildPlaceMap(placeInputUsed.sources, placeInputUsed.jurisdiction).entities;
        }
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "ECOMAP_PLACE", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("ECOMAP_PATHWAY")) {
    const entry = receipts.get("ECOMAP_PATHWAY")!;
    if (budgetExceeded()) skipForBudget("ECOMAP_PATHWAY");
    else {
      try {
        const ecoMapSources = getEcoMapSources();
        const pathwayInputUsed = input.advanced.ecomapPathwayContext ?? (ecoMapSources.length ? { outcome: goal, sources: ecoMapSources } : null);
        if (pathwayInputUsed) move(entry, "INPUT_READY");
        const pathway = ecoMapPathwayRecord(pathwayInputUsed);
        reasoningModesUsed.push(pathway.record);
        actions.push(...pathway.actions);
        move(entry, pathwayInputUsed ? (pathway.record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
        if (pathway.record.executed && pathwayInputUsed) {
          pathwaySteps = buildPathwayMap(pathwayInputUsed.outcome, pathwayInputUsed.sources).steps;
        }
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "ECOMAP_PATHWAY", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("ECOMAP_RELATIONSHIP")) {
    const entry = receipts.get("ECOMAP_RELATIONSHIP")!;
    if (budgetExceeded()) skipForBudget("ECOMAP_RELATIONSHIP");
    else {
      try {
        const ecoMapSources = getEcoMapSources();
        const relationshipInput = input.advanced.ecomapRelationshipContext ?? (ecoMapSources.length ? { subject: goal, sources: ecoMapSources } : null);
        if (relationshipInput) move(entry, "INPUT_READY");
        const relationship = ecoMapRelationshipRecord(relationshipInput);
        reasoningModesUsed.push(relationship.record);
        ecosystemConnections.push(...relationship.ecosystemConnections);
        move(entry, relationshipInput ? (relationship.record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "ECOMAP_RELATIONSHIP", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  // --- PHASE B: dependent capabilities (consume Phase A's real output) ---------------------

  if (has("CONTEXT_GRAPH")) {
    const entry = receipts.get("CONTEXT_GRAPH")!;
    if (budgetExceeded()) skipForBudget("CONTEXT_GRAPH");
    else {
      move(entry, "INPUT_READY"); // product list (possibly empty) + any EcoMap entities found above
      try {
        const record = contextGraphRecord(input.products, placeEntities);
        reasoningModesUsed.push(record);
        move(entry, record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT");
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "CONTEXT_GRAPH", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("BUTTERFLY")) {
    const entry = receipts.get("BUTTERFLY")!;
    if (budgetExceeded()) skipForBudget("BUTTERFLY");
    else {
      try {
        const usingBridge = !input.advanced.butterflyInput;
        const derived = input.advanced.butterflyInput ?? deriveButterflyInputFromPathway(goal, pathwaySteps);
        if (derived) move(entry, "INPUT_READY");
        const record = butterflyRecord(derived, derived && usingBridge ? BUTTERFLY_BRIDGE_DISCLOSURE : undefined);
        reasoningModesUsed.push(record);
        move(entry, derived ? (record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "BUTTERFLY", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  if (has("PREDICTION")) {
    const entry = receipts.get("PREDICTION")!;
    if (budgetExceeded()) skipForBudget("PREDICTION");
    else {
      try {
        const derived = input.advanced.predictionInput ?? deriveForesightInputFromPlace(placeEntities);
        if (derived) move(entry, "INPUT_READY");
        const record = predictionRecord(derived);
        reasoningModesUsed.push(record);
        move(entry, derived ? (record.executed ? "EXECUTED" : "SKIPPED_MISSING_INPUT") : "SKIPPED_MISSING_INPUT");
      } catch (err) {
        move(entry, "FAILED", describeError(err));
        reasoningModesUsed.push({ mode: "PREDICTION", executed: false, unavailableReason: `Threw an unexpected error: ${describeError(err)}` });
      }
    }
  }

  // --- PHASE C: the scheduler's own record ---------------------------------------------------

  if (has("MULTI_AGENT")) {
    const entry = receipts.get("MULTI_AGENT")!;
    move(entry, "INPUT_READY"); // the plan itself is always sufficient input for the scheduler
    const genuinelyRan = Array.from(receipts.values()).filter((r) => r.finalState === "EXECUTED" || r.finalState === "DEGRADED").map((r) => r.capability);
    const dependencyNotes: string[] = [];
    if (placeEntities.length && has("CONTEXT_GRAPH")) dependencyNotes.push(`Context Graph re-grounded with ${placeEntities.length} EcoMap Place entit${placeEntities.length === 1 ? "y" : "ies"}.`);
    if (pathwaySteps.length && has("BUTTERFLY")) dependencyNotes.push(`Butterfly's input was derived from ${pathwaySteps.length} EcoMap Pathway step(s), not invented.`);
    if (placeEntities.some((e) => e.kind === "OPPORTUNITY") && has("PREDICTION")) dependencyNotes.push("Prediction/Foresight's input was derived from EcoMap Place's real opportunity entities.");
    reasoningModesUsed.push({
      mode: "MULTI_AGENT",
      executed: true,
      contribution: `Internal execution scheduler coordinated ${plan.length} planned capabilit${plan.length === 1 ? "y" : "ies"} in dependency order (evidence normalized once, before EBR/EcoMap; EcoMap before Context Graph/Butterfly/Prediction). ${genuinelyRan.length} genuinely executed: ${genuinelyRan.length ? genuinelyRan.join(", ") : "none"}.${dependencyNotes.length ? " " + dependencyNotes.join(" ") : ""} This is an internal reasoning-engine scheduler only -- it has no external-action or connected-app authority (see GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md).`,
    });
    move(entry, "EXECUTED");
  }

  // Final sweep: anything still SELECTED (never reached above -- e.g. the budget was exhausted
  // before its phase) becomes SKIPPED_BUDGET, never left in a transient, non-terminal state.
  for (const entry of receipts.values()) {
    if (entry.finalState === "SELECTED") {
      move(entry, "SKIPPED_BUDGET", "Execution budget exhausted before this capability could be scheduled.");
      const mode = modeFor(entry.capability);
      if (mode && !reasoningModesUsed.some((r) => r.mode === mode)) {
        reasoningModesUsed.push({ mode, executed: false, unavailableReason: "Execution budget exhausted before this capability could be scheduled." });
      }
    }
  }

  return { reasoningModesUsed, capabilityExecution: Array.from(receipts.values()), contradictions, uncertainties, actions, ecosystemConnections };
}
