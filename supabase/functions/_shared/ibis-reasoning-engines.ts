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
// | EBR                        | js/ibis-evidence.js (192 lines; UI-focused   | NOT ported.        |
// |                             | provenance/Trust-Card renderer, not a claim- |                    |
// |                             | decomposition engine).                       |                    |
// | EcoMap Place/Pathway/Relat.| No file found under this name (see the prior |NOT ported (does not|
// |                             | Phase-0 audit). Closest: js/ibis-            | exist as claimed). |
// |                             | relationship-epistemics.js.                  |                    |
// | Butterfly Engine            | js/ibis-butterfly-engine.js -- not read this | NOT ported this    |
// |                             | pass (time-boxed).                           | pass.              |
// | Correlation Engine          | js/ibis-correlation-engine.js + js/ibis-     | PORTED (see        |
// |                             | math.js -- both confirmed pure/DOM-free      | ibis-correlation-  |
// |                             | before porting.                              | engine.ts).        |
// | Prediction/Foresight        | js/ibis-foresight-engine.js -- not read this | NOT ported this    |
// |                             | pass (time-boxed).                           | pass.              |
// | Context Graph                | js/ibis-context-graph.js -- not read this    | NOT ported this    |
// |                             | pass (time-boxed).                           | pass.              |
// | Connection Fabric            | js/ibis-connection-fabric.js -- not read     | NOT ported this    |
// |                             | this pass (time-boxed).                      | pass.              |
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

export type EngineName = "FOUNDER_THINKING" | "CORRELATION";

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
