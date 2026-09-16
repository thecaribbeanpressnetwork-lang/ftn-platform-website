// FTN Platform — the canonical IBIS request orchestrator (server-brain, Phase 1 slice).
//
// This is the one function every canonical-contract request enters. It is deliberately NOT a
// mechanical merge of the three existing Edge Functions (ibis-assistant/ibis-text-cloudflare/
// ibis-query) -- those remain as they are, and this module composes the ALREADY-REAL pieces
// (runGateway's deterministic + provider-fallback + rules-based founder-reasoning chain, the new
// intent classifier, the new search adapter, the lifecycle store) behind one typed contract.
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
import { sha256Hex, type LifecycleStore } from "./ibis-lifecycle-store.ts";

export type CanonicalRequest = {
  text: string;
  products?: IbisProduct[];
  providers: GatewayProvider[];
  requestId?: string;
  searchFetchImpl?: typeof fetch;
  // Slice 3 serverless correction: the lifecycle store is INJECTED, never resolved internally --
  // this module must not decide for itself whether it's "ok" to fall back to in-memory state.
  // The caller (ibis-assistant/index.ts) resolves it once via resolveLifecycleStore() and is the
  // one place that decision is made, honestly, from real environment configuration.
  lifecycleStore: LifecycleStore | null;
};

const PLAN_TTL_MS = 5 * 60_000;
// A plan stuck in FALLBACK_REQUESTED is only eligible for crash-recovery resumption once it has
// been untouched for longer than any real provider call could plausibly still be running -- see
// the resumption note in recordReceiptAndMaybeFallback for why this matters.
const RESUMPTION_STALE_MS = 30_000;

export type ExecutionReceiptInput = {
  planId: unknown;
  executionTarget: unknown;
  provider: unknown;
  success: unknown;
  degraded?: unknown;
  latencyMs?: unknown;
  // The client resends the original prompt text (it already has it from its own submission) so
  // the fallback generation can run without this server ever persisting prompt text durably --
  // see supabase/migrations/20260916120000_ibis_execution_receipts.sql's header for why.
  text?: unknown;
  products?: unknown;
};

export type ReceiptOutcome =
  | { status: "REJECTED"; reason: "MALFORMED_RECEIPT" | "UNKNOWN_PLAN" | "DUPLICATE_RECEIPT" | "EXPIRED_PLAN" | "MISMATCHED_AUTHORIZATION" | "TEXT_MISMATCH" | "LIFECYCLE_STORE_UNAVAILABLE" }
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
  // here. Slice 3 correction: it ALSO now depends on whether a durable lifecycle store is
  // actually available -- authorizing browser-local execution without durable backing means a
  // later failure receipt has nowhere real to validate against, so this endpoint FAILS CLOSED on
  // the local-execution optimization (never on answering the user): it still answers the
  // question, just always server-side, exactly as if the query were never local-eligible.
  const durableStoreAvailable = !!input.lifecycleStore;
  const freshnessRequired = intent.queryClass === "CURRENT_WEB_RESEARCH";
  const executionAuthorized = intent.queryClass === "SIMPLE_TEXT" && durableStoreAvailable;
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
        : !durableStoreAvailable && intent.queryClass === "SIMPLE_TEXT"
          ? ["lifecycle_store_unavailable_local_execution_disabled"]
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
  // duplicate answer generation. The plan is persisted (never in this module's own memory -- see
  // input.lifecycleStore) so a later failure receipt can request the ONE authorized fallback
  // generation, and the response returns with no answer text at all.
  if (executionAuthorized && input.lifecycleStore) {
    const textSha256 = await sha256Hex(text);
    await input.lifecycleStore.createPlan({
      planId: requestId, authorizedTarget: "browser_local", intent: intent.queryClass,
      freshnessRequired, textSha256, ttlMs: PLAN_TTL_MS,
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
  // execution was NOT authorized above (including the fail-closed case where no durable lifecycle
  // store exists) -- so this is always the sole answer-generation attempt for any given plan.
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

  // Recorded (when a store exists) even though this plan was never authorized for local execution
  // -- so a receipt claiming browser_local success/failure against THIS planId is rejected as a
  // mismatch, rather than silently accepted because no record existed to check against. When no
  // durable store is configured at all (fully local/offline dev, say), there is nothing to record
  // against and nothing to mismatch-check -- the answer above was already generated safely either way.
  if (input.lifecycleStore) {
    const textSha256 = await sha256Hex(text);
    await input.lifecycleStore.createPlan({
      planId: requestId, authorizedTarget: "server_provider", intent: intent.queryClass,
      freshnessRequired, textSha256, ttlMs: PLAN_TTL_MS,
    });
    // Immediately terminal: mark it SUCCEEDED so any later receipt against it is rejected as
    // NOT_PENDING/duplicate rather than treated as a fresh, still-open plan.
    await input.lifecycleStore.transitionPlan(requestId, "SUCCEEDED").catch(() => {});
  }

  return buildEnvelope({
    requestId, startedAt, answer, objective: intent.objective, queryClass: intent.queryClass,
    executionInstruction,
    reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState, sources,
    confidence, confidenceBasis, status, degradedStages, handoff, alternatives,
    uncertainties: intent.reasons,
  });
}

// The RECEIPT stage of the lifecycle. Validates a browser's report against the plan THIS endpoint
// itself created and persisted earlier -- never trusts an arbitrary client-declared
// provider/success claim on its own. A local failure is the ONLY thing that triggers a fallback
// generation here, and the store's atomic PENDING -> terminal transition (see
// ibis-lifecycle-store.ts) guarantees it happens at most once per plan even under concurrent
// duplicate/retried receipt requests -- two simultaneous callers racing the same planId can never
// both "win" the transition, so at most one fallback provider call is ever made.
export async function recordReceiptAndMaybeFallback(input: {
  receipt: ExecutionReceiptInput;
  providers: GatewayProvider[];
  lifecycleStore: LifecycleStore | null;
  // Test-only override for RESUMPTION_STALE_MS, so crash-recovery tests can prove real behavior
  // deterministically and fast rather than sleeping 30+ real seconds. Never pass this in
  // production request handling.
  resumptionStaleMsOverride?: number;
}): Promise<ReceiptOutcome> {
  const resumptionStaleMs = input.resumptionStaleMsOverride ?? RESUMPTION_STALE_MS;
  const r = input.receipt;
  if (typeof r.planId !== "string" || typeof r.executionTarget !== "string" || typeof r.provider !== "string" || typeof r.success !== "boolean") {
    return { status: "REJECTED", reason: "MALFORMED_RECEIPT" };
  }
  if (!input.lifecycleStore) return { status: "REJECTED", reason: "LIFECYCLE_STORE_UNAVAILABLE" };
  const store = input.lifecycleStore;

  const plan = await store.getPlan(r.planId);
  if (!plan) return { status: "REJECTED", reason: "UNKNOWN_PLAN" };
  if (plan.state === "EXPIRED") return { status: "REJECTED", reason: "EXPIRED_PLAN" };
  // Authorization mismatch is checked BEFORE attempting the transition: a non-authorized plan
  // (or one for a different target) must be rejected as a mismatch, never as a generic
  // NOT_PENDING/duplicate, even though both would technically be true for an already-terminal
  // non-authorized plan -- the more specific reason is more useful and more honest.
  if (plan.authorizedTarget !== "browser_local" || r.executionTarget !== "browser_local") {
    return { status: "REJECTED", reason: "MISMATCHED_AUTHORIZATION" };
  }

  const toState = r.success ? "SUCCEEDED" : "FALLBACK_REQUESTED";
  const transition = await store.transitionPlan(r.planId, toState);
  let resumedFromCrash = false;
  if (!transition.ok) {
    if (transition.reason === "UNKNOWN_PLAN") return { status: "REJECTED", reason: "UNKNOWN_PLAN" };
    if (transition.reason === "EXPIRED_PLAN") return { status: "REJECTED", reason: "EXPIRED_PLAN" };
    // CRASH-RECOVERY resumption: a failure receipt (r.success===false) against a plan already in
    // FALLBACK_REQUESTED means a PRIOR call already claimed the fallback but never reached a
    // terminal state -- i.e. that process crashed after the atomic claim but before (or during)
    // calling the provider. The user must not be permanently abandoned, so this caller is allowed
    // to resume: it will attempt the provider call again and then atomically transition
    // FALLBACK_REQUESTED -> SUCCEEDED itself. This makes the fallback-provider-call guarantee
    // honestly AT-LEAST-ONCE (a rare concurrent double-resume could call the provider twice), not
    // exactly-once -- but answer DELIVERY to any given client remains exactly-once, since only one
    // resumer's final SUCCEEDED transition can ever win (see below).
    if (!r.success) {
      const current = await store.getPlan(r.planId);
      // Lease/staleness check: a plan can only be resumed once its last update is old enough that
      // a genuinely still-in-flight (non-crashed) call could not plausibly be the one that made
      // it. Without this, two truly CONCURRENT failure receipts for the same plan would each see
      // the other's fresh, in-progress claim and both treat it as "crashed", both call the
      // provider -- exactly the double-call this gate exists to prevent. RESUMPTION_STALE_MS is
      // set well above any realistic provider call latency (the gateway's own PROVIDER_BUDGET_MS
      // in ibis-intelligence-gateway.ts is 9s per provider, ~24s total budget).
      const staleEnoughToResume = !!current && current.state === "FALLBACK_REQUESTED" && (Date.now() - new Date(current.updatedAt).getTime()) >= resumptionStaleMs;
      if (staleEnoughToResume) {
        resumedFromCrash = true;
      } else {
        // Either unrelated to a resumable state, or genuinely still in progress (not yet stale --
        // another request is actively handling this exact plan right now). Reject rather than race it.
        return { status: "REJECTED", reason: "DUPLICATE_RECEIPT" };
      }
    } else {
      // NOT_PENDING / STORE_ERROR on a SUCCESS receipt always means a real duplicate/concurrent
      // receipt or a store failure -- there is nothing to "resume" for a success report.
      return { status: "REJECTED", reason: "DUPLICATE_RECEIPT" };
    }
  }

  if (r.success) {
    // Browser-local execution succeeded; the browser already has and is rendering its own answer.
    // Nothing further to generate -- returning an envelope here would risk exactly the duplicate
    // generation this correction removes.
    return { status: "ACCEPTED", terminal: true, envelope: null };
  }

  // Authorized fallback: local execution failed despite authorization, and this caller won the
  // atomic transition to FALLBACK_REQUESTED -- it is the one and only caller allowed to generate.
  // The client must resend the original prompt text; verified against the hash taken at PLAN time
  // (this server never persisted the text itself -- see the migration header) before it is trusted.
  const resentText = typeof r.text === "string" ? r.text.trim() : "";
  if (!resentText) return { status: "REJECTED", reason: "TEXT_MISMATCH" };
  const resentHash = await sha256Hex(resentText);
  if (resentHash !== plan.textSha256) return { status: "REJECTED", reason: "TEXT_MISMATCH" };
  const products: IbisProduct[] = Array.isArray(r.products) ? (r.products as IbisProduct[]) : [];

  const startedAt = new Date().toISOString();
  const gatewayResult = await runGateway({ text: resentText, products, providers: input.providers, requestId: plan.planId });

  // Finalize: FALLBACK_REQUESTED -> SUCCEEDED. This is what makes a genuinely COMPLETED fallback
  // terminal (unresumable) while leaving a truly CRASHED one (never reaches this line) resumable
  // -- without this, a replayed/duplicate failure receipt for an already-completed fallback would
  // be indistinguishable from a real crash and would call the provider again. If this transition
  // itself loses a race (another concurrent resumer already finalized it first), this caller's own
  // freshly-generated answer is discarded and rejected as a duplicate -- exactly-once ANSWER
  // DELIVERY, even though the provider call itself is only at-least-once (see the resumption note
  // above).
  const finalize = await store.transitionPlan(plan.planId, "SUCCEEDED", "FALLBACK_REQUESTED");
  if (!finalize.ok) return { status: "REJECTED", reason: "DUPLICATE_RECEIPT" };

  const envelope = buildEnvelope({
    requestId: plan.planId, startedAt, answer: gatewayResult.answer, objective: null, queryClass: plan.intent as QueryClass,
    executionInstruction: { planId: plan.planId, executionTarget: "server_provider", executionAuthorized: false, intent: plan.intent as QueryClass, freshnessRequired: plan.freshnessRequired, constraints: ["fallback_after_local_execution_failure"] },
    reasoningModesUsed: gatewayResult.answerClass === "FOUNDER_REASONING_FALLBACK"
      ? [{ mode: "FOUNDER_REASONING_RULES_FALLBACK", executed: true, contribution: "Deterministic rules-based planning framework applied as the authorized fallback after local execution failed." }]
      : [{ mode: "MODEL_TEXT", executed: true, contribution: `Authorized fallback after local execution failed; answered by ${gatewayResult.provider}.` }],
    capabilitiesAttempted: ["TEXT"], providerPath: [gatewayResult.provider],
    evidenceState: gatewayResult.evidenceState === "DETERMINISTIC" ? "DETERMINISTIC" : "MODEL_GENERATED",
    sources: [], confidence: gatewayResult.confidence === "HIGH" ? "HIGH" : gatewayResult.confidence === "MODERATE" ? "MODERATE" : "UNVERIFIED",
    confidenceBasis: gatewayResult.uncertainty || "Authorized fallback after browser-local execution failed.",
    status: gatewayResult.answerClass === "DEGRADED" ? "DEGRADED" : "OK",
    degradedStages: [
      ...(gatewayResult.answerClass === "DEGRADED" ? ["ALL_TEXT_PROVIDERS_FAILED"] : ["LOCAL_EXECUTION_FAILED_FALLBACK_TO_SERVER"]),
      ...(resumedFromCrash ? ["RESUMED_AFTER_CRASHED_FALLBACK_CLAIM"] : []),
    ],
  });
  return { status: "ACCEPTED", terminal: true, envelope };
}

export { gatewayHealth };
