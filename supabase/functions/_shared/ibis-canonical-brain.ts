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
import { buildEnvelope, type CanonicalResponse, type ExecutionInstruction, type QueryClass, type ReasoningModeRecord, type SourceRecord } from "./ibis-response-envelope.ts";

export type CanonicalRequest = {
  text: string;
  products?: IbisProduct[];
  providers: GatewayProvider[];
  requestId?: string;
  searchFetchImpl?: typeof fetch;
};

// PLAN store (Slice 3 lifecycle correction). Module-level, in-memory, process-local. This is a
// REAL, TESTABLE mechanism for the plan/receipt lifecycle within one running process (a local
// `deno run`, or a single warm Supabase Edge Function instance) -- but it is NOT durable across a
// cold start or across multiple concurrently-scaled instances of the same function, which Supabase
// may run. That is a genuine gap: durable persistence needs a real table (see
// supabase/migrations/ for the drafted, NOT-YET-APPLIED schema and the final report for why it was
// not applied in this pass). Do not present this Map as durable provenance.
type PlanRecord = {
  planId: string;
  text: string;
  products: IbisProduct[];
  queryClass: QueryClass;
  executionAuthorized: boolean;
  executionTarget: ExecutionInstruction["executionTarget"];
  createdAt: number;
  used: boolean;
};
const planStore = new Map<string, PlanRecord>();
const PLAN_TTL_MS = 5 * 60_000;

export type ExecutionReceiptInput = {
  planId: unknown;
  executionTarget: unknown;
  provider: unknown;
  success: unknown;
  degraded?: unknown;
  latencyMs?: unknown;
};

export type ReceiptOutcome =
  | { status: "REJECTED"; reason: "MALFORMED_RECEIPT" | "UNKNOWN_PLAN" | "DUPLICATE_RECEIPT" | "EXPIRED_PLAN" | "MISMATCHED_AUTHORIZATION" }
  | { status: "ACCEPTED"; terminal: true; envelope: CanonicalResponse | null };

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
      executionInstruction: { planId: requestId, executionTarget: null, executionAuthorized: false, intent: "SIMPLE_TEXT", freshnessRequired: false, constraints: ["empty_request_no_execution"] },
      reasoningModesUsed: [], capabilitiesAttempted: [], providerPath: [],
      evidenceState: "NO_ANSWER_GENERATED", confidence: "UNAVAILABLE", confidenceBasis: "Empty request.",
      status: "UNAVAILABLE", degradedStages: ["EMPTY_REQUEST"],
    });
  }

  // 3. INTENT/OUTCOME CLASSIFICATION.
  const intent = classifyIntent(text);

  // Slice 1 correction: the execution-authorization decision lives here, server-side, and ONLY
  // here. A client (regular IBIS, Headspace, any future surface) must never independently decide
  // a question is "plain" or "non-fresh" and run an on-device/local model before this endpoint has
  // classified it. Local (browser-side, zero-cost) execution is authorized only for genuinely
  // plain SIMPLE_TEXT questions -- never for freshness-sensitive, outcome/strategy, pathway,
  // place or relationship questions, all of which need either real search or reasoning this
  // endpoint cannot fabricate on a local model's behalf.
  const freshnessRequired = intent.queryClass === "CURRENT_WEB_RESEARCH";
  const executionAuthorized = intent.queryClass === "SIMPLE_TEXT";
  const executionInstruction: ExecutionInstruction = {
    planId: requestId,
    executionTarget: executionAuthorized ? "browser_local" : "server_provider",
    executionAuthorized,
    intent: intent.queryClass,
    freshnessRequired,
    constraints: executionAuthorized
      ? ["do_not_invent_current_facts", "max_output_tokens_600"]
      : freshnessRequired
        ? ["freshness_required_local_execution_prohibited"]
        : ["specialist_reasoning_required_local_execution_prohibited"],
  };
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

  // Slice 3 correction: when local execution is authorized, this endpoint must NOT also generate
  // a provider answer -- doing so and then letting the browser generate a second, local answer is
  // duplicate answer generation, exactly what this correction removes. The plan is recorded (so a
  // later failure receipt can request the ONE authorized fallback generation), and the response
  // returns with no answer text at all; the browser's executionInstruction gate is what decides
  // what happens next, not a redundant answer this endpoint already computed and would discard.
  if (executionAuthorized) {
    planStore.set(requestId, {
      planId: requestId, text, products, queryClass: intent.queryClass,
      executionAuthorized: true, executionTarget: "browser_local", createdAt: Date.now(), used: false,
    });
    return buildEnvelope({
      requestId, startedAt, answer: "", objective: intent.objective, queryClass: intent.queryClass,
      executionInstruction,
      reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState: "NO_ANSWER_GENERATED", sources,
      confidence: "UNVERIFIED", confidenceBasis: "Execution deferred to authorized browser-local generation; no server provider was called.",
      status: "OK", degradedStages, handoff, alternatives,
      uncertainties: intent.reasons,
    });
  }

  // 7. REASONING / execution for the answer text itself -- reuses the already-real deterministic +
  // provider-fallback + rules-based-founder-reasoning chain (ibis-intelligence-gateway.ts). This is
  // the one piece of "reasoning" this pass can honestly claim ran. Only reached when local
  // execution was NOT authorized above -- so this is always the sole answer-generation attempt for
  // any given plan, never a duplicate of one the browser might also produce.
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

  // Recorded even though this plan was never authorized for local execution -- so a receipt
  // claiming browser_local success/failure against THIS planId is rejected as a mismatch (the
  // plan exists, but never carried executionAuthorized:true), rather than silently accepted
  // because no record existed to check against.
  planStore.set(requestId, {
    planId: requestId, text, products, queryClass: intent.queryClass,
    executionAuthorized: false, executionTarget: "server_provider", createdAt: Date.now(), used: true,
  });

  return buildEnvelope({
    requestId, startedAt, answer, objective: intent.objective, queryClass: intent.queryClass,
    executionInstruction,
    reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState, sources,
    confidence, confidenceBasis, status, degradedStages, handoff, alternatives,
    uncertainties: intent.reasons,
  });
}

function pruneExpiredPlans() {
  const now = Date.now();
  for (const [id, plan] of planStore) if (now - plan.createdAt > PLAN_TTL_MS) planStore.delete(id);
}

// The RECEIPT stage of the lifecycle. Validates a browser's report against the plan this
// endpoint itself created and returned earlier -- never trusts an arbitrary client-declared
// provider/success claim on its own. A local failure is the ONLY thing that triggers a fallback
// generation here, and it happens exactly once per plan (the `used` flag makes a second receipt
// for the same planId -- forged, duplicated, or genuinely repeated -- rejected as DUPLICATE_RECEIPT).
export async function recordReceiptAndMaybeFallback(input: {
  receipt: ExecutionReceiptInput;
  providers: GatewayProvider[];
}): Promise<ReceiptOutcome> {
  pruneExpiredPlans();
  const r = input.receipt;
  if (typeof r.planId !== "string" || typeof r.executionTarget !== "string" || typeof r.provider !== "string" || typeof r.success !== "boolean") {
    return { status: "REJECTED", reason: "MALFORMED_RECEIPT" };
  }
  const plan = planStore.get(r.planId);
  if (!plan) return { status: "REJECTED", reason: "UNKNOWN_PLAN" };
  if (Date.now() - plan.createdAt > PLAN_TTL_MS) { planStore.delete(r.planId); return { status: "REJECTED", reason: "EXPIRED_PLAN" }; }
  // Authorization mismatch is checked BEFORE the used/duplicate check: a non-authorized plan is
  // marked `used` the moment the server answers it (see handleCanonicalRequest), so without this
  // ordering a receipt against one would be rejected as DUPLICATE_RECEIPT -- true, but hiding the
  // more specific and more important fact that this plan was never authorized for local execution
  // at all.
  if (!plan.executionAuthorized || plan.executionTarget !== r.executionTarget || r.executionTarget !== "browser_local") {
    return { status: "REJECTED", reason: "MISMATCHED_AUTHORIZATION" };
  }
  if (plan.used) return { status: "REJECTED", reason: "DUPLICATE_RECEIPT" };

  plan.used = true; // terminal regardless of success/failure below -- one plan, one accepted result.

  if (r.success) {
    // Browser-local execution succeeded; the browser already has and is rendering its own answer.
    // Nothing further to generate -- returning an envelope here would risk exactly the duplicate
    // generation this correction removes.
    return { status: "ACCEPTED", terminal: true, envelope: null };
  }

  // Authorized fallback: local execution failed despite authorization. This is the ONE place a
  // second generation attempt is legitimate, and it only ever runs once per plan.
  const startedAt = new Date().toISOString();
  const gatewayResult = await runGateway({ text: plan.text, products: plan.products, providers: input.providers, requestId: plan.planId });
  const envelope = buildEnvelope({
    requestId: plan.planId, startedAt, answer: gatewayResult.answer, objective: null, queryClass: plan.queryClass,
    executionInstruction: { planId: plan.planId, executionTarget: "server_provider", executionAuthorized: false, intent: plan.queryClass, freshnessRequired: false, constraints: ["fallback_after_local_execution_failure"] },
    reasoningModesUsed: gatewayResult.answerClass === "FOUNDER_REASONING_FALLBACK"
      ? [{ mode: "FOUNDER_REASONING_RULES_FALLBACK", executed: true, contribution: "Deterministic rules-based planning framework applied as the authorized fallback after local execution failed." }]
      : [{ mode: "MODEL_TEXT", executed: true, contribution: `Authorized fallback after local execution failed; answered by ${gatewayResult.provider}.` }],
    capabilitiesAttempted: ["TEXT"], providerPath: [gatewayResult.provider],
    evidenceState: gatewayResult.evidenceState === "DETERMINISTIC" ? "DETERMINISTIC" : "MODEL_GENERATED",
    sources: [], confidence: gatewayResult.confidence === "HIGH" ? "HIGH" : gatewayResult.confidence === "MODERATE" ? "MODERATE" : "UNVERIFIED",
    confidenceBasis: gatewayResult.uncertainty || "Authorized fallback after browser-local execution failed.",
    status: gatewayResult.answerClass === "DEGRADED" ? "DEGRADED" : "OK",
    degradedStages: gatewayResult.answerClass === "DEGRADED" ? ["ALL_TEXT_PROVIDERS_FAILED"] : ["LOCAL_EXECUTION_FAILED_FALLBACK_TO_SERVER"],
  });
  return { status: "ACCEPTED", terminal: true, envelope };
}

export { gatewayHealth };
