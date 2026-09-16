// FTN Platform — canonical server-side reasoning-engine adapters.
//
// Contract map (existing implementation -> this pass's status). See docs/ibis/acceptance-baseline.md
// for the committed, human-readable version of this table.
//
// | Engine                    | Existing implementation                     | Ported this pass? |
// |----------------------------|---------------------------------------------|--------------------|
// | Founder Thinking           | js/ibis-founder-cognitive-layer.js (an       | PARTIALLY. The     |
// |                             | append-only cognitive-event ledger keyed to  | browser module's   |
// |                             | an authenticated device/session, using       | ledger/hash-chain  |
// |                             | browser crypto.subtle + FTN.PersonalContext  | is NOT ported (it  |
// |                             | -- not a per-query decision engine at all).  | requires an        |
// |                             | The REAL per-query decision logic already    | authenticated      |
// |                             | lives in ibis-intelligence-gateway.ts's      | browser session).  |
// |                             | founderDomain()/FOUNDER_GUIDANCE (rules-     | Its DETERMINISTIC  |
// |                             | based domain classifier + decision table),   | decision logic IS  |
// |                             | which already runs server-side.              | ported/structured  |
// |                             |                                               | below.             |
// | EBR                        | js/ibis-evidence.js (192 lines; UI-focused   | PORTED, but NOT    |
// |                             | provenance/Trust-Card renderer, not a claim- | from that file --  |
// |                             | decomposition engine -- confirmed genuinely  | js/ibis-evidence.js|
// |                             | unrelated). The real methodology source is   | remains unrelated  |
// |                             | Ricardo Gill's published Evidence-Bounded    | and untouched. See |
// |                             | Retrodiction protocol (research/evidence-    | ibis-ebr-engine.ts |
// |                             | bounded-retrodiction/mathematics/index.html; | for the K_att/     |
// |                             | DOI 10.5281/zenodo.22681856) -- see          | K_rec/R/Φ(h)/      |
// |                             | GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md.       | Admissible/RankKey |
// |                             |                                               | port. Requires     |
// |                             |                                               | caller-supplied    |
// |                             |                                               | evidence items +   |
// |                             |                                               | candidate causal   |
// |                             |                                               | histories -- no    |
// |                             |                                               | automatic evidence-|
// |                             |                                               | retrieval/hypo-    |
// |                             |                                               | thesis-generation  |
// |                             |                                               | pipeline is wired  |
// |                             |                                               | server-side yet.   |
// | EcoMap Place/Pathway        | No file found under this name.               | NOT ported (does   |
// |                             |                                               | not exist).        |
// | EcoMap Relationship         | No file literally named this. Closest: js/   | NOT claimed as     |
// |                             | ibis-relationship-epistemics.js (10 lines,   | EcoMap Relationship|
// |                             | pure classify()/describe() epistemic typing).| -- its classify()/ |
// |                             |                                               | describe() ARE     |
// |                             |                                               | ported below, but  |
// |                             |                                               | only as internal    |
// |                             |                                               | support for         |
// |                             |                                               | runPrediction()'s   |
// |                             |                                               | fromRelationship()  |
// |                             |                                               | -- not exposed as   |
// |                             |                                               | its own engine mode |
// |                             |                                               | since the audit     |
// |                             |                                               | could not confirm   |
// |                             |                                               | it satisfies the    |
// |                             |                                               | founder's intended  |
// |                             |                                               | EcoMap methodology. |
// | Butterfly Engine            | js/ibis-butterfly-engine.js (12 lines, pure  | PORTED (effectValue/|
// |                             | math; formula matches GOVERNANCE/IBIS_       | value/chain -- see  |
// |                             | FOUNDER_COGNITIVE_LAYER.md's B(a)=ΣP·V·D     | runButterfly()      |
// |                             | exactly). record()'s FounderCognitiveLayer   | below). Requires    |
// |                             | append is browser-only and NOT ported (same  | caller-supplied     |
// |                             | reason as Founder Thinking's ledger).        | structured effects. |
// | Correlation Engine          | js/ibis-correlation-engine.js + js/ibis-     | PORTED (see        |
// |                             | math.js -- both confirmed pure/DOM-free      | ibis-correlation-  |
// |                             | before porting.                              | engine.ts).        |
// | Prediction/Foresight        | js/ibis-foresight-engine.js (13 lines, pure; | PORTED (daysUntil/  |
// |                             | contract's "PREDICTION" mode maps to this    | priority/           |
// |                             | file -- no separate "Prediction" module      | fromOpportunity/    |
// |                             | exists). Hardcodes probabilitiesEstimated:   | fromRelationship/   |
// |                             | false -- never invents a probability.        | generate below).    |
// |                             |                                               | Requires caller-    |
// |                             |                                               | supplied opportunity|
// |                             |                                               | /relationship data. |
// | Context Graph                | js/ibis-context-graph.js (25 lines, pure;    | PORTED, adapted.    |
// |                             | fromRegistries() needs browser FTN.          | Server-side graph   |
// |                             | NodeRegistry for dependency edges -- not     | is nodes-only (the  |
// |                             | available server-side).                      | request's own       |
// |                             |                                               | products list) --   |
// |                             |                                               | no dependency-edge  |
// |                             |                                               | data server-side    |
// |                             |                                               | yet, disclosed, not |
// |                             |                                               | fabricated.          |
// | Connection Fabric            | js/ibis-connection-fabric.js (26 lines,      | PORTED (resolve     |
// |                             | pure; ORDER/registerGateway/resolve/health/  | logic + static      |
// |                             | connectionPlan). Was also missing from the   | connectionPlan()).  |
// |                             | ReasoningMode/QueryClass contract entirely   | No gateway is       |
// |                             | -- fixed this pass (CONNECTION_FABRIC added  | registered server-  |
// |                             | to ibis-response-envelope.ts).               | side in this pass,  |
// |                             |                                               | so it truthfully     |
// |                             |                                               | reports              |
// |                             |                                               | NO_READY_CONNECTION_ |
// |                             |                                               | PATH rather than     |
// |                             |                                               | fabricating a route. |
// | Multi-Agent Orchestrator    | js/ibis-multi-agent-orchestrator.js --       | NOT ported this    |
// |                             | depends on FTN.UniversalRouter/browser        | pass (and requires |
// |                             | runtime context; not assessed for            | assessment before   |
// |                             | portability this pass.                        | any port attempt). |
//
// Do not extend this file's FAIL/NOT_PORTED list to PASS without following the same discipline:
// read the real implementation, confirm portability (or the lack of it) from evidence, and only
// port genuinely reusable deterministic logic -- never invent new "reasoning" to fill a gap.
import { founderDomain, relevantProducts, FOUNDER_GUIDANCE, type IbisProduct } from "./ibis-intelligence-gateway.ts";
import { analyzeCorrelation, type Series } from "./ibis-correlation-engine.ts";
import {
  attestedKnowledge, findContradictions, rankCandidates, rankKey, compareRankKeys,
  type EvidenceItem, type CandidateHistory,
} from "./ibis-ebr-engine.ts";

export type EngineName = "FOUNDER_THINKING" | "CORRELATION" | "BUTTERFLY" | "PREDICTION" | "CONTEXT_GRAPH" | "CONNECTION_FABRIC" | "EBR";

// The minimum common engine result every adapter returns, per the required contract.
export type EngineResult = {
  engine: EngineName;
  requested: boolean;
  executed: boolean;
  status: "OK" | "DEGRADED" | "SKIPPED" | "NOT_PORTED";
  reason: string | null;
  inputsUsed: Record<string, unknown>;
  findings: string[];
  assumptions: string[];
  evidenceReferences: string[];
  confidence: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  downstreamEffects: string[];
};

// --- FOUNDER THINKING -----------------------------------------------------------------------
// Structures the SAME real classification (founderDomain) and decision table (FOUNDER_GUIDANCE)
// ibis-intelligence-gateway.ts's founderReasoningAnswer() already uses for its prose output --
// this adapter does not reclassify or re-decide anything; it exposes the same real decision as
// structured fields (BUILD_NOW/PREPARE_NOW/EXPERIMENT + objective/leverage/risks/actions) instead
// of only a formatted string, per the requested engine-adapter contract.
export function runFounderThinking(text: string, products: IbisProduct[]): EngineResult {
  const normalizedText = text.toLowerCase().replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim();
  if (normalizedText.length < 4) {
    return { engine: "FOUNDER_THINKING", requested: true, executed: false, status: "SKIPPED", reason: "Request too short to classify a strategic domain.", inputsUsed: {}, findings: [], assumptions: [], evidenceReferences: [], confidence: "UNAVAILABLE", downstreamEffects: [] };
  }
  const domain = founderDomain(normalizedText);
  const guidance = FOUNDER_GUIDANCE[domain];
  const matchedProducts = relevantProducts(text, domain, products);
  const decisionMap: Record<string, string> = { "BUILD NOW": "BUILD_NOW", "PREPARE NOW": "PREPARE_NOW", "EXPERIMENT": "EXPERIMENT" };
  return {
    engine: "FOUNDER_THINKING",
    requested: true,
    executed: true,
    status: "OK",
    reason: null,
    inputsUsed: { domain, text: `${text.slice(0, 80)}${text.length > 80 ? "…" : ""}` },
    findings: [
      `Strategic domain classified: ${domain}.`,
      `Decision: ${decisionMap[guidance.decision] || guidance.decision}.`,
      `Objective: ${guidance.objective}`,
      `Strongest path: ${guidance.path}`,
    ],
    assumptions: [guidance.risks],
    evidenceReferences: matchedProducts.map((p) => `FTN product: ${p.name} (${p.route})`),
    confidence: "MODERATE",
    downstreamEffects: guidance.actions,
  };
}

// --- CORRELATION -----------------------------------------------------------------------------
// Wraps the real, ported deterministic Correlation Engine. Requires two actual numeric time
// series -- no FTN data source is wired into the canonical brain to supply these automatically
// for a free-text query yet, so for the vast majority of real conversational prompts this engine
// is honestly SKIPPED (never fabricated as executed) unless the caller explicitly supplies
// series data (e.g. a future FTN Statistics integration, or an API caller that already has two
// series to compare).
export function runCorrelation(seriesA: Series | null, seriesB: Series | null): EngineResult {
  if (!seriesA || !seriesB) {
    return { engine: "CORRELATION", requested: true, executed: false, status: "SKIPPED", reason: "No numeric time-series data was supplied with this request -- Correlation requires two real series (periods+values), not free text. No FTN data-source integration feeds this automatically yet.", inputsUsed: {}, findings: [], assumptions: [], evidenceReferences: [], confidence: "UNAVAILABLE", downstreamEffects: [] };
  }
  const result = analyzeCorrelation(seriesA, seriesB);
  if (!result.success) {
    return { engine: "CORRELATION", requested: true, executed: false, status: "DEGRADED", reason: `${result.errorType}: ${result.reason}`, inputsUsed: { seriesA: seriesA.id, seriesB: seriesB.id }, findings: [], assumptions: [], evidenceReferences: [], confidence: "UNAVAILABLE", downstreamEffects: [] };
  }
  return {
    engine: "CORRELATION",
    requested: true,
    executed: true,
    status: "OK",
    reason: null,
    inputsUsed: { seriesA: seriesA.id || seriesA.label, seriesB: seriesB.id || seriesB.label, alignedPeriods: result.n },
    findings: [
      `r = ${result.r.toFixed(3)} (${result.associationStrength}, ${result.direction}), n=${result.n}, sample depth ${result.sampleDepth}.`,
      result.warning,
    ],
    assumptions: ["Exact-period intersection only; no interpolation or imputation of missing periods."],
    evidenceReferences: [result.provenance.sourceA, result.provenance.sourceB].filter((s): s is string => !!s),
    confidence: result.sampleDepth === "DEEP" ? "HIGH" : result.sampleDepth === "MODERATE" ? "MODERATE" : "LOW",
    downstreamEffects: ["Correlation is never itself the answer -- it is evidence for or against a causal hypothesis stated elsewhere, and is explicitly labeled non-causal (causal:false) in this result."],
  };
}

// --- BUTTERFLY --------------------------------------------------------------------------------
// Exact port of js/ibis-butterfly-engine.js's pure math (clamp/effectValue/value/chain) -- the
// formula matches GOVERNANCE/IBIS_FOUNDER_COGNITIVE_LAYER.md's B(a) = Sum[ P(E_k|a) . V(E_k) . D_k ]
// exactly. The browser original's record() (which appends the chain to the browser-only Founder
// Cognitive Layer ledger) is NOT ported, same reason as Founder Thinking's ledger -- this adapter
// only returns the structured chain/value, never persists it anywhere.
// No caller in this canonical brain currently supplies real structured second-order-effect data
// for a free-text query (no such data source is wired in yet -- an external blocker, not a design
// choice) -- so for ordinary conversational text this is honestly SKIPPED, exactly like Correlation
// is honestly SKIPPED absent real series data. A caller that DOES supply a real action + at least
// one structured expected effect gets a genuine, executed result.
export type ButterflyEffect = { probability?: unknown; strategicValue?: unknown; connectivity?: unknown; observed?: boolean; label?: string };
export type ButterflyInput = {
  action: string;
  informationGain?: unknown;
  relationships?: unknown[];
  expectedEffects: ButterflyEffect[];
  unexpectedEffects?: ButterflyEffect[];
  outcome?: string | null;
  lesson?: string | null;
};

function clamp(value: unknown, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0;
}
function effectValue(effect: ButterflyEffect, observed: boolean): number {
  const e = effect || {};
  const probability = observed && e.observed ? 1 : clamp(e.probability, 0, 1);
  const value = clamp(e.strategicValue, -10, 10);
  const connectivity = clamp(e.connectivity, 0, 10);
  return probability * value * connectivity;
}
function butterflyValue(effects: ButterflyEffect[], observed: boolean): number {
  return (effects || []).reduce((sum, effect) => sum + effectValue(effect, observed), 0);
}

export function runButterfly(input: ButterflyInput | null): EngineResult {
  if (!input || !input.action || !Array.isArray(input.expectedEffects) || input.expectedEffects.length === 0) {
    return { engine: "BUTTERFLY", requested: true, executed: false, status: "SKIPPED", reason: "Butterfly requires an explicit action plus at least one structured expected second-order effect (probability/strategicValue/connectivity) -- free text alone cannot honestly supply these, and no such structured data source is wired into the canonical brain yet.", inputsUsed: {}, findings: [], assumptions: [], evidenceReferences: [], confidence: "UNAVAILABLE", downstreamEffects: [] };
  }
  const expected = input.expectedEffects;
  const unexpected = Array.isArray(input.unexpectedEffects) ? input.unexpectedEffects : [];
  const expectedButterflyValue = butterflyValue(expected, false);
  const actualButterflyValue = butterflyValue([...expected, ...unexpected], true);
  return {
    engine: "BUTTERFLY",
    requested: true,
    executed: true,
    status: "OK",
    reason: null,
    inputsUsed: { action: input.action, expectedEffectCount: expected.length, unexpectedEffectCount: unexpected.length },
    findings: [
      `Action: ${input.action}.`,
      `Expected second-order Butterfly value (sum of probability x strategicValue x connectivity over ${expected.length} effect(s)): ${expectedButterflyValue.toFixed(2)}.`,
      unexpected.length ? `Actual Butterfly value including ${unexpected.length} observed unexpected effect(s): ${actualButterflyValue.toFixed(2)}.` : "No unexpected effects reported yet.",
    ],
    assumptions: ["Second-order effect values (probability/strategicValue/connectivity) were supplied by the caller, not estimated by this engine."],
    evidenceReferences: [],
    confidence: expected.length >= 2 ? "MODERATE" : "LOW",
    downstreamEffects: [input.outcome ? `Recorded outcome: ${input.outcome}.` : null, input.lesson ? `Lesson: ${input.lesson}.` : null].filter((s): s is string => !!s),
  };
}

// --- PREDICTION / FORESIGHT --------------------------------------------------------------------
// Exact port of js/ibis-foresight-engine.js (daysUntil/priority/fromOpportunity/fromRelationship/
// generate). The contract's "PREDICTION" ReasoningMode name maps to this Foresight implementation
// -- no separate "Prediction" module exists anywhere in the repo. Hardcodes probabilitiesEstimated:
// false and every candidate's probability: null, matching the original exactly -- this engine never
// invents a probability or upgrades a correlation/hypothesis into a causal prediction.
// fromRelationship() reuses classifyRelationship()/describeRelationship() below, an exact port of
// js/ibis-relationship-epistemics.js's classify()/describe() -- included here as internal support
// logic only, not exposed as its own ECOMAP_RELATIONSHIP engine result (see contract-map above).
export type RelationshipEvidenceType = "OBSERVED_CORRELATION" | "TEMPORAL_SEQUENCE" | "KNOWN_RELATIONSHIP" | "POSSIBLE_CONTRIBUTOR" | "HYPOTHESIS" | "PREDICTIVE_SIGNAL" | "CONFIRMED_CAUSAL";
const RELATIONSHIP_TYPE_LABELS: Record<RelationshipEvidenceType, string> = {
  OBSERVED_CORRELATION: "Observed correlation",
  TEMPORAL_SEQUENCE: "Temporal sequence",
  KNOWN_RELATIONSHIP: "Known relationship",
  POSSIBLE_CONTRIBUTOR: "Possible contributor",
  HYPOTHESIS: "Hypothesis",
  PREDICTIVE_SIGNAL: "Predictive signal",
  CONFIRMED_CAUSAL: "Confirmed causal relationship",
};
export type RelationshipRecord = {
  id?: string;
  type?: string;
  classification?: string;
  confidence?: string;
  causalEvidence?: boolean;
  outOfSampleValidated?: boolean;
  evidenceType?: RelationshipEvidenceType;
  fromLabel?: string;
  toLabel?: string;
};
function classifyRelationship(r: RelationshipRecord): RelationshipEvidenceType {
  const rec = r || {};
  if (rec.evidenceType && RELATIONSHIP_TYPE_LABELS[rec.evidenceType]) return rec.evidenceType;
  if (rec.type === "parent-child" || rec.type === "dependency") return "KNOWN_RELATIONSHIP";
  if (rec.type === "causal" && rec.causalEvidence === true) return "CONFIRMED_CAUSAL";
  if (rec.type === "temporal") return "TEMPORAL_SEQUENCE";
  if (rec.type === "predictive" && rec.outOfSampleValidated === true) return "PREDICTIVE_SIGNAL";
  if (rec.type === "correlation" && ["High", "Medium"].includes(rec.confidence || "")) return "OBSERVED_CORRELATION";
  if (rec.confidence === "Low") return "POSSIBLE_CONTRIBUTOR";
  return "HYPOTHESIS";
}
function describeRelationship(r: RelationshipRecord): { evidenceType: RelationshipEvidenceType; label: string; causal: boolean; sourceAuthority: string | null; warning: string | null } {
  const t = classifyRelationship(r);
  return {
    evidenceType: t,
    label: RELATIONSHIP_TYPE_LABELS[t],
    causal: t === "CONFIRMED_CAUSAL",
    sourceAuthority: r?.classification || null,
    warning: t === "CONFIRMED_CAUSAL" ? null : "This relationship should not be interpreted as causal unless separate causal evidence is supplied.",
  };
}

export type OpportunityMatch = { opportunity: { id: string; title: string; deadline?: string | null; sourceUrl?: string | null; verifiedAt?: string | null }; sourceUrl?: string | null; verifiedAt?: string | null; eligibility?: string };
export type ForesightCandidate = {
  id: string; type: "OPPORTUNITY_TIMING" | "SIGNAL_WATCH"; headline: string; why: string;
  priority: "ACT_NOW" | "PREPARE_NOW" | "PREPARE" | "WATCH" | "EXPIRED"; horizonDays: number | null;
  confidenceBasis: string; probability: null; sourceUrl: string | null; verifiedAt: string | null;
  eligibility: string | null; action: string;
};
export type PredictionInput = { opportunityMatches?: OpportunityMatch[]; relationships?: RelationshipRecord[]; now?: string };

function daysUntil(date: string | null | undefined, now?: string): number | null {
  if (!date) return null;
  const target = new Date(date + "T23:59:59Z");
  const base = now ? new Date(now) : new Date();
  if (!Number.isFinite(target.getTime()) || !Number.isFinite(base.getTime())) return null;
  return Math.ceil((target.getTime() - base.getTime()) / 86400000);
}
function foresightPriority(days: number | null): ForesightCandidate["priority"] {
  if (days === null) return "WATCH";
  if (days < 0) return "EXPIRED";
  if (days <= 7) return "ACT_NOW";
  if (days <= 30) return "PREPARE_NOW";
  if (days <= 90) return "PREPARE";
  return "WATCH";
}
function fromOpportunity(match: OpportunityMatch, now?: string): ForesightCandidate | null {
  if (!match || !match.opportunity) return null;
  const o = match.opportunity;
  const d = daysUntil(o.deadline, now);
  if (d !== null && d < 0) return null;
  return {
    id: `foresight-opportunity-${o.id}`, type: "OPPORTUNITY_TIMING",
    headline: d === null ? "Keep this opportunity on watch." : d <= 30 ? `Prepare for ${o.title}.` : `Watch ${o.title}.`,
    why: d === null ? "A reviewed opportunity matched the user's stated intent, but no active deadline is recorded." : `A reviewed opportunity matched the user's stated intent and its recorded deadline is ${o.deadline}.`,
    priority: foresightPriority(d), horizonDays: d, confidenceBasis: "REVIEWED_OPPORTUNITY_PLUS_USER_INTENT", probability: null,
    sourceUrl: o.sourceUrl || match.sourceUrl || null, verifiedAt: o.verifiedAt || match.verifiedAt || null,
    eligibility: match.eligibility || "NOT_ASSESSED",
    action: d !== null && d <= 30 ? "Verify eligibility and required documents at the original source." : "Keep watching and verify source status before acting.",
  };
}
function fromRelationship(r: RelationshipRecord): ForesightCandidate | null {
  if (!r) return null;
  const e = describeRelationship(r);
  if (!["PREDICTIVE_SIGNAL", "TEMPORAL_SEQUENCE", "KNOWN_RELATIONSHIP"].includes(e.evidenceType)) return null;
  return {
    id: `foresight-relationship-${r.id || "signal"}`, type: "SIGNAL_WATCH",
    headline: `Watch ${r.toLabel || "the connected outcome"}.`,
    why: `${r.fromLabel || "A signal"} is linked to ${r.toLabel || "an outcome"} as ${e.label.toLowerCase()}.`,
    priority: "WATCH", horizonDays: null, confidenceBasis: e.evidenceType, probability: null,
    sourceUrl: null, verifiedAt: null, eligibility: null,
    action: "Watch the underlying observations; do not treat this relationship as causal unless separate causal evidence exists.",
  };
}

export function runPrediction(input: PredictionInput | null): EngineResult {
  const opportunityMatches = input?.opportunityMatches || [];
  const relationships = input?.relationships || [];
  if (opportunityMatches.length === 0 && relationships.length === 0) {
    return { engine: "PREDICTION", requested: true, executed: false, status: "SKIPPED", reason: "Prediction/Foresight requires real reviewed-opportunity deadlines or classified relationship signals -- no such structured data source is wired into the canonical brain yet for a free-text query.", inputsUsed: {}, findings: [], assumptions: [], evidenceReferences: [], confidence: "UNAVAILABLE", downstreamEffects: [] };
  }
  const candidates: ForesightCandidate[] = [];
  for (const m of opportunityMatches) { const c = fromOpportunity(m, input?.now); if (c) candidates.push(c); }
  for (const r of relationships) { const c = fromRelationship(r); if (c) candidates.push(c); }
  const order: Record<string, number> = { ACT_NOW: 0, PREPARE_NOW: 1, PREPARE: 2, WATCH: 3, EXPIRED: 4 };
  candidates.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9) || (a.horizonDays ?? 99999) - (b.horizonDays ?? 99999));
  return {
    engine: "PREDICTION", requested: true, executed: true, status: "OK", reason: null,
    inputsUsed: { opportunityMatchCount: opportunityMatches.length, relationshipCount: relationships.length },
    findings: candidates.length
      ? candidates.slice(0, 5).map((c) => `[${c.priority}] ${c.headline} ${c.why}`)
      : ["No opportunity deadline or predictive/known/temporal relationship signal produced a real candidate from the supplied data."],
    assumptions: ["probabilitiesEstimated:false -- no candidate's probability is ever estimated; ordinary correlation is never upgraded into a prediction."],
    evidenceReferences: candidates.map((c) => c.sourceUrl).filter((s): s is string => !!s),
    confidence: candidates.some((c) => c.priority === "ACT_NOW" || c.priority === "PREPARE_NOW") ? "MODERATE" : "LOW",
    downstreamEffects: candidates.map((c) => c.action),
  };
}

// --- CONTEXT GRAPH -----------------------------------------------------------------------------
// Adapted port of js/ibis-context-graph.js's Graph class + explainConnection (exact logic, same
// node/edge/key semantics). The original's fromRegistries() depends on the browser FTN.NodeRegistry
// singleton (product dependency/data-dependency edges) -- that registry is not available server-
// side, so this adapter builds a NODES-ONLY graph from the request's own IbisProduct[] list instead
// (the same list Founder Thinking already receives). No dependency-edge data exists server-side in
// this pass -- disclosed honestly in the findings, never fabricated as if the full browser graph ran.
export type ContextGraphNode = { type: string; id: string; label: string; key?: string; [extra: string]: unknown };
export type ContextGraphEdgeInput = { from: string; to: string; relation: string; provenance?: Record<string, unknown> | null; confidenceBasis?: string };
export type ContextGraphEdge = ContextGraphEdgeInput & { key: string };

export function contextGraphKey(type: string, id: string): string { return `${type}:${id}`; }

export class ContextGraph {
  nodes = new Map<string, ContextGraphNode>();
  edges: ContextGraphEdge[] = [];
  private edgeKeys = new Set<string>();
  addNode(node: ContextGraphNode): ContextGraphNode | null {
    if (!node || !node.type || !node.id) return null;
    const k = contextGraphKey(node.type, node.id);
    const existing = this.nodes.get(k) || ({} as ContextGraphNode);
    this.nodes.set(k, { ...existing, ...node, key: k });
    return this.nodes.get(k) || null;
  }
  addEdge(edge: ContextGraphEdgeInput): ContextGraphEdge | null {
    if (!edge || !edge.from || !edge.to || !edge.relation) return null;
    const ek = `${edge.from}|${edge.relation}|${edge.to}`;
    if (this.edgeKeys.has(ek)) return this.edges.find((e) => e.key === ek) || null;
    const record: ContextGraphEdge = { key: ek, provenance: null, confidenceBasis: "DIRECT_DECLARATION", ...edge };
    this.edges.push(record);
    this.edgeKeys.add(ek);
    return record;
  }
  get(type: string, id: string): ContextGraphNode | null {
    const n = this.nodes.get(contextGraphKey(type, id));
    return n ? JSON.parse(JSON.stringify(n)) : null;
  }
  neighbors(type: string, id: string, options: { direction?: "OUT" | "IN" | "BOTH"; relations?: string[] } = {}): { edge: ContextGraphEdge; node: ContextGraphNode | null }[] {
    const origin = contextGraphKey(type, id);
    const direction = options.direction || "BOTH";
    const relations = options.relations || null;
    return this.edges
      .filter((e) => {
        const directionMatch = direction === "OUT" ? e.from === origin : direction === "IN" ? e.to === origin : (e.from === origin || e.to === origin);
        const relationMatch = !relations || relations.includes(e.relation);
        return directionMatch && relationMatch;
      })
      .map((e) => {
        const other = e.from === origin ? e.to : e.from;
        return { edge: JSON.parse(JSON.stringify(e)), node: this.nodes.has(other) ? JSON.parse(JSON.stringify(this.nodes.get(other))) : null };
      });
  }
  findNodes(predicate?: (n: ContextGraphNode) => boolean): ContextGraphNode[] {
    return Array.from(this.nodes.values()).filter(predicate || (() => true)).map((n) => JSON.parse(JSON.stringify(n)));
  }
  toJSON() {
    return { schemaVersion: 1, scope: "GROUNDED_FTN_SLICE", nodes: this.findNodes(), edges: this.edges.map((e) => JSON.parse(JSON.stringify(e))) };
  }
}

export function explainConnection(g: ContextGraph, aType: string, aId: string, bType: string, bId: string) {
  const a = contextGraphKey(aType, aId), b = contextGraphKey(bType, bId);
  const direct = g.edges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  if (direct) return { connected: true, direct: true, path: [a, b], relations: [direct.relation], provenance: [direct.provenance ? JSON.parse(JSON.stringify(direct.provenance)) : null] };
  const first = g.edges.filter((e) => e.from === a || e.to === a);
  for (const f of first) {
    const mid = f.from === a ? f.to : f.from;
    const second = g.edges.find((e) => (e.from === mid && e.to === b) || (e.to === mid && e.from === b));
    if (second) return { connected: true, direct: false, path: [a, mid, b], relations: [f.relation, second.relation], provenance: [f.provenance ? JSON.parse(JSON.stringify(f.provenance)) : null, second.provenance ? JSON.parse(JSON.stringify(second.provenance)) : null] };
  }
  return { connected: false, direct: false, path: [] as string[], relations: [] as string[], provenance: [] as unknown[] };
}

export function runContextGraph(products: IbisProduct[], focusRoutes: string[] = []): EngineResult {
  const g = new ContextGraph();
  for (const p of products || []) g.addNode({ type: "FTN_PRODUCT", id: p.route, label: p.name, route: p.route });
  const focusNodes = focusRoutes.length ? g.findNodes((n) => focusRoutes.includes(n.id)) : [];
  return {
    engine: "CONTEXT_GRAPH", requested: true, executed: true, status: "OK", reason: null,
    inputsUsed: { productCount: (products || []).length, focusCount: focusNodes.length },
    findings: [
      (products || []).length
        ? `Grounded FTN-product slice: ${(products || []).length} node(s) built from this request's own product list.`
        : "No FTN product list was supplied with this request -- the graph contains zero nodes.",
      ...(focusNodes.length ? [`${focusNodes.length} node(s) directly relevant to this query: ${focusNodes.map((n) => n.label).join(", ")}.`] : []),
      "No dependency-edge data (project/data dependencies) is available in this server request context yet -- only the browser FTN.NodeRegistry carries that; this graph is nodes-only in this pass.",
    ],
    assumptions: ["Grounded strictly to the product list the caller supplied -- never invents an FTN product, organization or place node."],
    evidenceReferences: g.findNodes().map((n) => `FTN product: ${n.label} (${n.id})`),
    confidence: focusNodes.length ? "MODERATE" : "LOW",
    downstreamEffects: [],
  };
}

// --- CONNECTION FABRIC --------------------------------------------------------------------------
// Port of js/ibis-connection-fabric.js's ORDER/resolve logic and static connectionPlan(). This
// engine was previously missing from the ReasoningMode/QueryClass contract entirely (fixed this
// pass -- see ibis-response-envelope.ts). No connection gateway (DIRECT/MCP/ACTIVEPIECES/NANGO/REST)
// is registered anywhere in this server execution context in this pass -- FTN.AppRegistry and the
// gateway objects the browser registers are browser-only -- so resolve() here truthfully always
// reports NO_READY_CONNECTION_PATH server-side rather than fabricating a route that doesn't exist.
export const CONNECTION_FABRIC_ORDER = ["DIRECT", "MCP", "ACTIVEPIECES", "NANGO", "REST"] as const;

export function connectionPlan(provider: string) {
  return {
    provider,
    preferredOrder: [...CONNECTION_FABRIC_ORDER],
    principle: "Prefer product-native direct adapters when justified; otherwise use MCP or the broad open integration bus before bespoke OAuth glue.",
    security: "OAuth tokens and secrets stay in provider/gateway vaults. ibis stores only connection metadata/scopes and applies its own Permission Ledger to consequential actions.",
  };
}

export function runConnectionFabric(provider: string | null): EngineResult {
  if (!provider) {
    return { engine: "CONNECTION_FABRIC", requested: true, executed: false, status: "SKIPPED", reason: "No target app/provider was named in this request (e.g. \"connect my gmail\") -- Connection Fabric has nothing to resolve a route for.", inputsUsed: {}, findings: [], assumptions: [], evidenceReferences: [], confidence: "UNAVAILABLE", downstreamEffects: [] };
  }
  const plan = connectionPlan(provider);
  return {
    engine: "CONNECTION_FABRIC", requested: true, executed: true, status: "OK", reason: null,
    inputsUsed: { provider },
    findings: [
      `No connection gateway (${CONNECTION_FABRIC_ORDER.join("/")}) is registered in this server execution context yet -- routing for "${provider}" cannot be resolved here in this pass; the browser-side js/ibis-connection-fabric.js remains the only place a live route can actually be found.`,
      `Preferred routing order if/when gateways are registered server-side: ${plan.preferredOrder.join(" -> ")}.`,
    ],
    assumptions: [],
    evidenceReferences: [],
    confidence: "LOW",
    downstreamEffects: [plan.principle],
  };
}

// --- EBR (Evidence-Bounded Retrodiction) ---------------------------------------------------------
// See GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md and ibis-ebr-engine.ts's own header before extending
// this adapter. Wraps the real, ported evidence-separation/mechanism-gate/admissibility logic
// (ibis-ebr-engine.ts). Classified CONNECTED_CONDITIONAL (see EngineReadiness in
// ibis-response-envelope.ts): ibis-canonical-brain.ts CAN build real evidenceItems automatically
// from grounded search results for an ordinary query (see buildEbrInputFromSources() there), but
// genuine MECHANISM-GATED CAUSAL admissibility still requires a candidate causal history -- no
// automatic hypothesis-generation pipeline exists (inventing candidate causal edges from free text
// would be exactly the "invent reasoning to fill a gap" this codebase's discipline forbids). `actor`
// and `decisionTime` are OPTIONAL: an ordinary canonical request has no known actor/decision-time
// context, and actor access must NEVER be inferred merely because evidence exists -- when omitted,
// K_att/K_rec are honestly not evaluated (disclosed, not silently skipped) and the engine still
// runs the actor-independent parts (R(c), contradiction preservation, admissibility, ranking, ⊥).
export type EBRInput = {
  actor?: string | null;
  decisionTime?: string | null;
  auditCutoff: string;
  evidenceItems: EvidenceItem[];
  candidateHistories?: CandidateHistory[];
};

export function runEBR(input: EBRInput | null): EngineResult {
  if (!input || !Array.isArray(input.evidenceItems) || input.evidenceItems.length === 0) {
    return {
      engine: "EBR", requested: true, executed: false, status: "SKIPPED",
      reason: "Evidence-Bounded Retrodiction requires at least one real evidence item to evaluate -- free text alone cannot honestly supply one, and no grounded evidence (e.g. from search) was available for this request.",
      inputsUsed: {}, findings: [], assumptions: [], evidenceReferences: [], confidence: "UNAVAILABLE", downstreamEffects: [],
    };
  }
  const hasActorContext = !!(input.actor && input.decisionTime);
  const attested = hasActorContext ? attestedKnowledge(input.actor!, input.decisionTime!, input.evidenceItems) : [];
  const contradictions = findContradictions(input.evidenceItems);
  const candidateHistories = input.candidateHistories || [];
  const ranked = rankCandidates(candidateHistories, input.evidenceItems);
  const admissible = ranked.filter((r) => r.admissible);

  const findings: string[] = [
    hasActorContext
      ? `Contemporaneously attested knowledge (K_att) for "${input.actor}" at ${input.decisionTime}: ${attested.length} of ${input.evidenceItems.length} evidence item(s) -- later evidence can never rewrite this set.`
      : `No actor/decision-time context was supplied for this request -- K_att (contemporaneous actor knowledge) is not evaluated. Actor access is never inferred merely because evidence exists. This is a general causal-history reconstruction over ${input.evidenceItems.length} grounded evidence item(s), not an appraisal of a specific individual's decision.`,
    `${contradictions.length} contradiction(s) preserved across the evidence set (not collapsed into a single score).`,
  ];

  if (ranked.length === 0) {
    return {
      engine: "EBR", requested: true, executed: true, status: "OK", reason: null,
      inputsUsed: { evidenceItemCount: input.evidenceItems.length, candidateHistoryCount: 0, attestedCount: attested.length },
      findings: [
        ...findings,
        "No candidate causal history was supplied to evaluate for mechanism-gated admissibility -- reporting the grounded evidence view only. This is a CONDITIONAL finding, not a completed causal reconstruction.",
        "Unmodeled-history reserve (⊥) remains fully open: no candidate causal history has been tested against the mechanism gate for this request.",
      ],
      assumptions: ["No probability or causal claim is made without at least one candidate causal history to test against the mechanism gate."],
      evidenceReferences: Array.from(new Set(input.evidenceItems.map((i) => i.provenance))),
      confidence: "LOW",
      downstreamEffects: ["Do not treat the grounded evidence above as proof of any particular cause -- no mechanism-gated candidate was evaluated."],
    };
  }

  if (admissible.length === 0) {
    return {
      engine: "EBR", requested: true, executed: true, status: "OK", reason: null,
      inputsUsed: { evidenceItemCount: input.evidenceItems.length, candidateHistoryCount: candidateHistories.length, attestedCount: attested.length, admissibleCount: 0 },
      findings: [
        ...findings,
        `No candidate history among the ${ranked.length} examined is admissible (each has an unresolved required mechanism bridge and/or a hard contradiction) -- EBR abstains rather than forcing a pick.`,
        `Unmodeled-history reserve (⊥) remains the strongest possibility: the true causal history may not be among the ${ranked.length} candidate(s) examined.`,
      ],
      assumptions: ["No probability was assigned to any candidate; admissibility is a gate, not a score."],
      evidenceReferences: [],
      confidence: "UNAVAILABLE",
      downstreamEffects: ["Abstained: do not present any of the examined candidates as the answer."],
    };
  }

  const top = admissible[0];
  const tiedTop = admissible.filter((c) => compareRankKeys(rankKey(c.profile), rankKey(top.profile)) === 0);
  return {
    engine: "EBR", requested: true, executed: true, status: "OK", reason: null,
    inputsUsed: { evidenceItemCount: input.evidenceItems.length, candidateHistoryCount: candidateHistories.length, attestedCount: attested.length, admissibleCount: admissible.length },
    findings: [
      ...findings,
      tiedTop.length > 1
        ? `${tiedTop.length} admissible candidate histories are tied and kept incomparable: ${tiedTop.map((c) => c.history.label).join(", ")}.`
        : `Strongest admissible candidate among ${ranked.length} examined: "${top.history.label}" (mechanism coverage ${(top.profile.mechanismCoverage * 100).toFixed(0)}%, ${top.profile.provenanceRootCount} independent provenance root(s), ${top.profile.contradictionBurden} contradiction(s) carried).`,
      "This is the strongest candidate AMONG THOSE EXAMINED, not a claim of completeness -- the unmodeled-history reserve (⊥) stays open.",
    ],
    assumptions: [
      "No probability was invented for any candidate; ranking is a transparent, non-probabilistic display ordering only.",
      "Chronology/correlation alone never counted as a supported mechanism bridge.",
    ],
    evidenceReferences: Array.from(new Set(admissible.flatMap((c) => c.history.edges.flatMap((e) => e.provenanceRoots)))),
    confidence: top.profile.mechanismCoverage >= 0.75 ? "MODERATE" : "LOW",
    downstreamEffects: hasActorContext
      ? [`Do not appraise the ${input.decisionTime} decision using anything outside the ${attested.length}-item attested (K_att) set above.`]
      : ["No actor/decision-time context was supplied -- this result is a general causal-history reconstruction, not an appraisal of any specific individual's decision."],
  };
}
