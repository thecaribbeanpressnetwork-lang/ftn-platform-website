// FTN Platform — the canonical IBIS request orchestrator (server-brain, Phase 1 slice).
//
// This is the one function every canonical-contract request enters. It is deliberately NOT a
// mechanical merge of the three existing Edge Functions (ibis-assistant/ibis-text-cloudflare/
// ibis-query) -- those remain as they are, and this module composes the ALREADY-REAL pieces
// (runGateway's deterministic + provider-fallback + rules-based founder-reasoning chain, the new
// intent classifier, the new search adapter) behind one typed request/response contract.
//
// Honesty boundary (read before extending this file): Founder Cognitive Layer, EBR, EcoMap
// Place/Pathway/Relationship, Butterfly Engine, Correlation Engine, Prediction/Foresight Engine,
// Context Graph, Opportunity Graph and the Multi-Agent Orchestrator are all currently BROWSER-ONLY
// (js/ibis-*.js) -- they have not been ported or reproduced as server-safe modules in this pass.
// This orchestrator must never claim one of those modes executed. When a query's classification
// suggests one would be relevant (e.g. FOUNDER_STRATEGY, PATHWAY, RELATIONSHIP), it is listed in
// reasoningModesUsed with executed:false and an honest unavailableReason -- the rules-based
// founderReasoningAnswer() already inside ibis-intelligence-gateway.ts IS real and IS executed
// where it applies, and is reported as FOUNDER_REASONING_RULES_FALLBACK, never conflated with the
// deeper browser-only FOUNDER_COGNITIVE_LAYER mode.
import { runGateway, gatewayHealth, type GatewayProvider, type IbisProduct } from "./ibis-intelligence-gateway.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { search as runSearch, type SearchResult } from "./ibis-search-adapter.ts";
import { buildEnvelope, type CanonicalResponse, type QueryClass, type ReasoningModeRecord, type SourceRecord } from "./ibis-response-envelope.ts";

export type CanonicalRequest = {
  text: string;
  products?: IbisProduct[];
  providers: GatewayProvider[];
  requestId?: string;
  searchFetchImpl?: typeof fetch;
};

const NOT_PORTED = "not yet ported to the server-side canonical brain -- currently exists only as a browser module (js/ibis-*.js); this response does not claim it ran.";

function unavailableMode(mode: ReasoningModeRecord["mode"], reason = NOT_PORTED): ReasoningModeRecord {
  return { mode, executed: false, unavailableReason: reason };
}

function relevantUnavailableModes(queryClass: QueryClass): ReasoningModeRecord[] {
  switch (queryClass) {
    case "FOUNDER_STRATEGY":
      return [unavailableMode("FOUNDER_COGNITIVE_LAYER"), unavailableMode("BUTTERFLY"), unavailableMode("CORRELATION"), unavailableMode("PREDICTION")];
    case "PATHWAY":
      return [unavailableMode("ECOMAP_PATHWAY")];
    case "PLACE":
      return [unavailableMode("ECOMAP_PLACE", "not yet ported server-side; also requires explicit user location consent not collected by this endpoint.")];
    case "RELATIONSHIP":
      return [unavailableMode("ECOMAP_RELATIONSHIP"), unavailableMode("CONTEXT_GRAPH")];
    case "CAUSAL_BUTTERFLY":
      return [unavailableMode("BUTTERFLY")];
    case "CORRELATION":
      return [unavailableMode("CORRELATION")];
    case "PREDICTION":
      return [unavailableMode("PREDICTION")];
    default:
      return [];
  }
}

function sourcesFromSearch(result: SearchResult): SourceRecord[] {
  if (result.status !== "OK") return [];
  return result.sources.map((s) => ({
    title: s.title,
    publisher: s.publisher,
    url: s.url,
    publishedAt: s.publishedAt,
    updatedAt: s.updatedAt,
    retrievedAt: s.retrievedAt,
    evidenceDepth: s.evidenceDepth,
  }));
}

export async function handleCanonicalRequest(input: CanonicalRequest): Promise<CanonicalResponse> {
  const startedAt = new Date().toISOString();
  const requestId = input.requestId || crypto.randomUUID();
  const text = (input.text || "").trim();
  const products = input.products || [];

  // 1. INTAKE + 2. SAFETY/PRIVACY (minimal in this pass: length bound + non-empty; the deeper
  // consent/redaction boundary already lives in each Edge Function's own request handling).
  if (!text) {
    return buildEnvelope({
      requestId, startedAt, answer: "Ask ibis something first.", queryClass: "SIMPLE_TEXT",
      reasoningModesUsed: [], capabilitiesAttempted: [], providerPath: [],
      evidenceState: "NO_ANSWER_GENERATED", confidence: "UNAVAILABLE", confidenceBasis: "Empty request.",
      status: "UNAVAILABLE", degradedStages: ["EMPTY_REQUEST"],
    });
  }

  // 3. INTENT/OUTCOME CLASSIFICATION.
  const intent = classifyIntent(text);
  const reasoningModesUsed: ReasoningModeRecord[] = [];
  const capabilitiesAttempted: string[] = [];
  const providerPath: string[] = [];
  let sources: SourceRecord[] = [];
  let evidenceState: CanonicalResponse["evidenceState"] = "NO_ANSWER_GENERATED";
  let degradedStages: string[] = [];
  let handoff: CanonicalResponse["handoff"] = { external: false, note: null };
  let alternatives: CanonicalResponse["alternatives"] = [];

  // 5/6. RETRIEVAL + SEARCH -- only for the one query class this pass genuinely implements
  // (CURRENT_WEB_RESEARCH). Every other non-SIMPLE_TEXT class is honestly marked unavailable
  // below rather than silently answered as if it were a plain question.
  if (intent.queryClass === "CURRENT_WEB_RESEARCH") {
    capabilitiesAttempted.push("SEARCH");
    const result = await runSearch(text, { fetchImpl: input.searchFetchImpl });
    if (result.status === "OK") {
      providerPath.push(`search:${result.provider}`);
      sources = sourcesFromSearch(result);
      evidenceState = "SEARCH_GROUNDED";
      reasoningModesUsed.push({ mode: "MODEL_TEXT", executed: true, contribution: "Search results retrieved; no synthesis model was called on them in this pass -- sources are returned directly for the caller to read, not summarized." });
    } else {
      degradedStages.push("SEARCH_UNAVAILABLE");
      handoff = { external: true, note: result.reason };
      alternatives = result.alternatives;
      reasoningModesUsed.push({ mode: "MODEL_TEXT", executed: false, unavailableReason: `Search unavailable: ${result.reason}` });
    }
  }

  reasoningModesUsed.push(...relevantUnavailableModes(intent.queryClass));

  // 7. REASONING / execution for the answer text itself -- reuses the already-real deterministic +
  // provider-fallback + rules-based-founder-reasoning chain (ibis-intelligence-gateway.ts). This is
  // the one piece of "reasoning" this pass can honestly claim ran.
  let answer: string;
  let confidence: CanonicalResponse["confidence"];
  let confidenceBasis: string;
  let status: CanonicalResponse["status"] = "OK";

  if (intent.queryClass === "CURRENT_WEB_RESEARCH" && sources.length === 0) {
    // Search genuinely unavailable: say so plainly rather than falling back to model memory and
    // implying research happened -- this is the one hard rule this module must never violate.
    answer = `I don't have a working live-search route yet, so I can't verify current information for "${text}". ${handoff.note} Use one of the direct sources below instead.`;
    confidence = "UNAVAILABLE";
    confidenceBasis = "No search provider is configured; answering from model memory would misrepresent freshness.";
    status = "DEGRADED";
  } else {
    capabilitiesAttempted.push("TEXT");
    const gatewayResult = await runGateway({ text, products, providers: input.providers, requestId });
    providerPath.push(gatewayResult.provider);
    answer = gatewayResult.answer;
    evidenceState = evidenceState === "SEARCH_GROUNDED" ? "SEARCH_GROUNDED" : (gatewayResult.evidenceState === "DETERMINISTIC" ? "DETERMINISTIC" : "MODEL_GENERATED");
    confidence = gatewayResult.confidence === "HIGH" ? "HIGH" : gatewayResult.confidence === "MODERATE" ? "MODERATE" : gatewayResult.confidence === "UNAVAILABLE" ? "UNAVAILABLE" : "UNVERIFIED";
    confidenceBasis = gatewayResult.uncertainty || (gatewayResult.answerClass === "CALCULATION" ? "Deterministic local calculation." : "See gateway provenance.");
    if (gatewayResult.answerClass === "DEGRADED") { status = "DEGRADED"; degradedStages.push("ALL_TEXT_PROVIDERS_FAILED"); }
    if (gatewayResult.answerClass === "FOUNDER_REASONING_FALLBACK") {
      reasoningModesUsed.push({ mode: "FOUNDER_REASONING_RULES_FALLBACK", executed: true, contribution: "Deterministic rules-based planning framework applied (ibis-intelligence-gateway.ts founderReasoningAnswer) -- this is NOT the deeper browser-only Founder Cognitive Layer." });
    } else if (gatewayResult.answerClass === "CALCULATION") {
      reasoningModesUsed.push({ mode: "DETERMINISTIC", executed: true, contribution: "Local arithmetic, no model call." });
    } else if (gatewayResult.answerClass === "MODEL_RESPONSE") {
      reasoningModesUsed.push({ mode: "MODEL_TEXT", executed: true, contribution: `Answered by ${gatewayResult.provider}.` });
    }
  }

  return buildEnvelope({
    requestId, startedAt, answer, objective: intent.objective, queryClass: intent.queryClass,
    reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState, sources,
    confidence, confidenceBasis, status, degradedStages, handoff, alternatives,
    uncertainties: intent.reasons,
  });
}

export { gatewayHealth };
