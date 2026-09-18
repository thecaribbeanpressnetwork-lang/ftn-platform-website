// FTN Platform — the canonical reasoning synthesis packet.
//
// CORE PROBLEM THIS FILE FIXES: every advanced reasoning engine (Founder Thinking, EBR, EcoMap
// Place/Pathway/Relationship, Butterfly, Prediction, Correlation, Context Graph, Connection Fabric)
// could genuinely execute and populate reasoningModesUsed/contradictions/uncertainties/actions/
// ecosystemConnections/capabilityExecution -- but the final ANSWER model only ever received
// user text + products + the search evidence block. An engine could run for real and still not
// materially shape the prose the user reads. This module builds the ONE bounded, typed,
// inspectable packet that closes that gap: ibis-canonical-brain.ts builds it right after
// runOrchestration() and hands it to providerFactory() alongside the evidence block, and
// ibis-assistant/index.ts's system prompt explicitly instructs the model to treat it as decision
// support (see FOUNDER_REASONING_INSTRUCTION).
//
// Discipline (same as every engine adapter this composes): bounded size (every array here is
// sliced to a small cap), deterministic, free of secrets, safe to inject into a model's system
// prompt, and structured so a test can assert on exactly what changed when an engine's output
// changes -- never a giant verbatim dump of the internal receipt.
import type { QueryClass, ReasoningModeRecord, CapabilityReceiptEntry, CapabilityKind, SourceRecord } from "./ibis-response-envelope.ts";
import type { EngineResult, EngineName } from "./ibis-reasoning-engines.ts";
import {
  computeTruthmode, computeRedTeam, computePareto, computeFutureYou, computeValueLens, computeLindy, computeCaribbeanLens,
  type TruthmodeResult, type RedTeamResult, type ParetoResult, type FutureYouResult, type ValueLensResult, type LindyResult, type CaribbeanLensResult,
} from "./ibis-founder-lenses.ts";

const MAX_FINDINGS_PER_ENGINE = 4;

export type EngineSynthesis = { findings: string[]; confidence: EngineResult["confidence"] } | null;

export type ReasoningSynthesisPacket = {
  objective: string | null;
  queryClass: QueryClass;
  selectedCapabilities: CapabilityKind[];
  executedCapabilities: CapabilityKind[];
  skippedCapabilities: { capability: CapabilityKind; reason: string }[];
  founderThinking: EngineSynthesis;
  ebr: EngineSynthesis;
  ecomapPlace: EngineSynthesis;
  ecomapPathway: EngineSynthesis;
  ecomapRelationship: EngineSynthesis;
  butterfly: EngineSynthesis;
  prediction: EngineSynthesis;
  correlation: EngineSynthesis;
  contextGraph: EngineSynthesis;
  connectionFabric: EngineSynthesis;
  contradictions: string[];
  uncertaintyReserve: string[];
  ecosystemConnections: string[];
  actions: string[];
  sourceGrounding: { count: number; cacheState: "LIVE" | "CACHED" | null; evidenceState: string };
  // Founder lenses -- see ibis-founder-lenses.ts for the deterministic logic behind each.
  truthmode: TruthmodeResult;
  redTeam: RedTeamResult | null;
  pareto: ParetoResult | null;
  futureYou: FutureYouResult | null;
  valueLens: ValueLensResult | null;
  lindy: LindyResult | null;
  caribbean: CaribbeanLensResult;
  // Convenience derived fields (Phase 1's requested field list) -- each references a lens above
  // rather than recomputing anything, so there is exactly one place each judgment is made.
  ownershipControl: string | null;
  publicTrust: string | null;
  reversibility: string | null;
  secondOrderEffects: string[];
  futureOptionality: string | null;
  executionCost: string | null;
  evidenceVsAssumption: string;
};

function engineSynthesis(result: EngineResult | undefined): EngineSynthesis {
  if (!result || !result.executed) return null;
  return { findings: result.findings.slice(0, MAX_FINDINGS_PER_ENGINE), confidence: result.confidence };
}

function findEngine(results: EngineResult[], name: EngineName): EngineResult | undefined {
  return results.find((r) => r.engine === name);
}

function skipReason(entry: CapabilityReceiptEntry): string {
  const last = entry.history[entry.history.length - 1];
  return last?.reason || entry.finalState;
}

export function buildReasoningSynthesisPacket(input: {
  objective: string | null;
  queryClass: QueryClass;
  text: string;
  jurisdiction: string | null;
  capabilityPlan: { capability: CapabilityKind }[];
  capabilityExecution: CapabilityReceiptEntry[];
  engineResults: EngineResult[];
  contradictions: string[];
  uncertainties: string[];
  ecosystemConnections: string[];
  actions: string[];
  sourceCount: number;
  sources: SourceRecord[];
  searchCacheState: "LIVE" | "CACHED" | null;
  evidenceState: string;
  isDeterministicAnswer: boolean;
  durabilityQuestionAsked: boolean;
}): ReasoningSynthesisPacket {
  const founder = findEngine(input.engineResults, "FOUNDER_THINKING");
  const ebr = findEngine(input.engineResults, "EBR");
  const ecomapPlace = findEngine(input.engineResults, "ECOMAP_PLACE");
  const ecomapPathway = findEngine(input.engineResults, "ECOMAP_PATHWAY");
  const ecomapRelationship = findEngine(input.engineResults, "ECOMAP_RELATIONSHIP");
  const butterfly = findEngine(input.engineResults, "BUTTERFLY");
  const prediction = findEngine(input.engineResults, "PREDICTION");
  const correlation = findEngine(input.engineResults, "CORRELATION");
  const contextGraph = findEngine(input.engineResults, "CONTEXT_GRAPH");
  const connectionFabric = findEngine(input.engineResults, "CONNECTION_FABRIC");

  const founderThinkingPlanned = input.capabilityPlan.some((p) => p.capability === "FOUNDER_THINKING");
  const hasZeroCostSignal = !!(ecomapPathway?.executed && ecomapPathway.findings.some((f) => f.toLowerCase().includes("zero-cost")));

  const truthmode = computeTruthmode({
    sources: [], // sources themselves are already carried on the response envelope; Truthmode here
    // reasons over the ENGINE-LEVEL evidence trail (EBR/founder), not a second copy of source text --
    // kept intentionally empty to avoid duplicating the envelope's own `sources` array in the prompt.
    ebrResult: ebr ?? null,
    founderResult: founder ?? null,
    uncertainties: input.uncertainties,
    deterministicAnswer: input.isDeterministicAnswer,
  });
  const redTeam = computeRedTeam({ queryClass: input.queryClass, founderThinkingPlanned, founderResult: founder ?? null, ecoMapPathwayResult: ecomapPathway ?? null });
  const pareto = computePareto(input.actions);
  const futureYou = computeFutureYou({ founderResult: founder ?? null, hasZeroCostSignal, text: input.text });
  const valueLens = computeValueLens(founder ?? null);
  const lindy = computeLindy({
    text: input.text, durabilityQuestionAsked: input.durabilityQuestionAsked,
    founderResult: founder ?? null, ecoMapPlaceResult: ecomapPlace ?? null, sources: input.sources,
  });
  const caribbean = computeCaribbeanLens({ text: input.text, jurisdiction: input.jurisdiction, founderThinkingPlanned, hasZeroCostSignal, ecosystemConnections: input.ecosystemConnections });

  const executedCapabilities = input.capabilityExecution.filter((e) => e.finalState === "EXECUTED" || e.finalState === "DEGRADED").map((e) => e.capability);
  const skippedCapabilities = input.capabilityExecution
    .filter((e) => e.finalState.startsWith("SKIPPED") || e.finalState === "UNAVAILABLE" || e.finalState === "FAILED")
    .map((e) => ({ capability: e.capability, reason: skipReason(e) }));

  return {
    objective: input.objective,
    queryClass: input.queryClass,
    selectedCapabilities: input.capabilityPlan.map((p) => p.capability),
    executedCapabilities,
    skippedCapabilities,
    founderThinking: engineSynthesis(founder),
    ebr: engineSynthesis(ebr),
    ecomapPlace: engineSynthesis(ecomapPlace),
    ecomapPathway: engineSynthesis(ecomapPathway),
    ecomapRelationship: engineSynthesis(ecomapRelationship),
    butterfly: engineSynthesis(butterfly),
    prediction: engineSynthesis(prediction),
    correlation: engineSynthesis(correlation),
    contextGraph: engineSynthesis(contextGraph),
    connectionFabric: engineSynthesis(connectionFabric),
    contradictions: input.contradictions.slice(0, 6),
    uncertaintyReserve: input.uncertainties.slice(0, 6),
    ecosystemConnections: input.ecosystemConnections.slice(0, 6),
    actions: input.actions.slice(0, 6),
    sourceGrounding: { count: input.sourceCount, cacheState: input.searchCacheState, evidenceState: input.evidenceState },
    truthmode,
    redTeam,
    pareto,
    futureYou,
    valueLens,
    lindy,
    caribbean,
    ownershipControl: futureYou?.control ?? (caribbean.ownershipImplications[0] || null),
    publicTrust: founderThinkingPlanned && founder?.executed ? "Public trust depends on this decision being explained honestly, including what remains unverified above -- see uncertaintyReserve." : null,
    reversibility: futureYou?.reversibility ?? null,
    secondOrderEffects: butterfly?.executed ? butterfly.findings.slice(0, 3) : [],
    futureOptionality: futureYou?.optionality ?? null,
    executionCost: valueLens?.effort ?? null,
    evidenceVsAssumption: truthmode.verified.length || truthmode.inferred.length
      ? `${truthmode.verified.length} verified/admissible item(s), ${truthmode.inferred.length} inferred (snippet-level) item(s), ${truthmode.assumed.length} assumed (heuristic-judgment) item(s), ${truthmode.unknown.length} explicitly unknown item(s).`
      : "No evidence-vs-assumption trail was built for this request (no search evidence, EBR or Founder Thinking ran).",
  };
}

// Renders the packet into a BOUNDED, plain-text system-context block -- deliberately never the raw
// JSON packet (that stays available in the response envelope for inspection/tests, see
// ibis-response-envelope.ts's `reasoningSynthesis` field). Only sections with real content are
// rendered; an inapplicable lens (e.g. Caribbean lens on an unrelated question, Red Team on a
// factual question) is silently omitted rather than printed empty -- this is what keeps an ordinary
// factual answer free of forced framework mentions (see FOUNDER_REASONING_INSTRUCTION for the
// matching behavioral instruction on the model side).
export function buildReasoningSynthesisBlock(packet: ReasoningSynthesisPacket): string | null {
  const sections: string[] = [];

  if (packet.founderThinking) sections.push(`Founder Thinking: ${packet.founderThinking.findings.join(" ")}`);
  if (packet.ebr) sections.push(`EBR (causal evidence): ${packet.ebr.findings.join(" ")}`);
  if (packet.ecomapPlace) sections.push(`EcoMap Place: ${packet.ecomapPlace.findings.join(" ")}`);
  if (packet.ecomapPathway) sections.push(`EcoMap Pathway: ${packet.ecomapPathway.findings.join(" ")}`);
  if (packet.ecomapRelationship) sections.push(`EcoMap Relationship: ${packet.ecomapRelationship.findings.join(" ")}`);
  if (packet.butterfly) sections.push(`Butterfly (second-order effects): ${packet.butterfly.findings.join(" ")}`);
  if (packet.prediction) sections.push(`Prediction/Foresight: ${packet.prediction.findings.join(" ")}`);
  if (packet.correlation) sections.push(`Correlation: ${packet.correlation.findings.join(" ")}`);
  if (packet.contextGraph) sections.push(`Context Graph: ${packet.contextGraph.findings.join(" ")}`);
  if (packet.connectionFabric) sections.push(`Connection Fabric: ${packet.connectionFabric.findings.join(" ")}`);

  if (packet.contradictions.length) sections.push(`Unresolved contradictions (do not silently resolve these): ${packet.contradictions.join(" ")}`);
  if (packet.uncertaintyReserve.length) sections.push(`Material uncertainty to preserve in the answer: ${packet.uncertaintyReserve.join(" ")}`);

  if (packet.redTeam) sections.push(`Red Team -- strongest failure mode: ${packet.redTeam.failureMode} Weakest assumption: ${packet.redTeam.weakAssumption} Mitigation: ${packet.redTeam.mitigation}`);
  if (packet.pareto) sections.push(`80/20 -- highest-leverage action(s), do not list more than these: ${packet.pareto.highestLeverageActions.join(" | ")}`);
  if (packet.futureYou) sections.push(`FutureYou -- optionality: ${packet.futureYou.optionality} Control: ${packet.futureYou.control} Recurring value: ${packet.futureYou.recurringValue} Reversibility: ${packet.futureYou.reversibility}`);
  if (packet.valueLens) sections.push(`Value lens -- outcome: ${packet.valueLens.outcome} Likelihood: ${packet.valueLens.likelihood} Delay: ${packet.valueLens.delay} Effort: ${packet.valueLens.effort}`);
  if (packet.lindy) {
    const l = packet.lindy;
    sections.push(`Lindy (durability vs fragility, ${l.relevance} relevance)${l.durableMechanisms.length ? ` -- durable mechanisms: ${l.durableMechanisms.join(" ")}` : ""}${l.fragileDependencies.length ? ` Fragile dependencies: ${l.fragileDependencies.join(" ")}` : ""}${l.provenAlternatives.length ? ` Proven alternatives: ${l.provenAlternatives.join(" ")}` : ""} Recommendation: ${l.recommendation}`);
  }
  if (packet.caribbean.relevance !== "NONE") {
    const c = packet.caribbean;
    sections.push(`Caribbean lens (${c.relevance} relevance)${c.constraints.length ? ` -- constraints: ${c.constraints.join(" ")}` : ""}${c.regionalAdvantages.length ? ` Regional advantages: ${c.regionalAdvantages.join(" ")}` : ""}${c.ownershipImplications.length ? ` Ownership: ${c.ownershipImplications.join(" ")}` : ""}`);
  }

  if (!sections.length) return null;
  return [
    "Reasoning synthesis for this request (structured decision support from FTN's own reasoning engines -- use it to shape the answer's substance; never print any label below as a heading, and never name one conversationally either -- not as an aside, not inside an ordinary sentence, not as a description of how you reasoned. The label names below exist for you to read, not to repeat in any form. Evidence above always outranks a heuristic/lens judgment; never resolve a listed contradiction beyond what the evidence itself resolves):",
    ...sections.map((s, i) => `[R${i + 1}] ${s}`),
  ].join("\n");
}
