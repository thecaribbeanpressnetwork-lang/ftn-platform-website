// FTN Platform — the canonical IBIS request orchestrator (server-brain, Phase 1 slice).
//
// This is the one function every canonical-contract request enters. It is deliberately NOT a
// mechanical merge of the three existing Edge Functions (ibis-assistant/ibis-text-cloudflare/
// ibis-query) -- those remain as they are, and this module composes the ALREADY-REAL pieces
// (runGateway's deterministic + provider-fallback + rules-based founder-reasoning chain, the new
// intent classifier, the new search adapter, the lifecycle store) behind one typed contract.
//
// Honesty boundary (read before extending this file): Founder Cognitive Layer, Correlation,
// Butterfly, Prediction/Foresight, Context Graph, Connection Fabric, EBR (Evidence-Bounded
// Retrodiction -- see GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md), EcoMap Place/Pathway/Relationship (a
// founder-authorized product contract, methodology PARTIAL / FOUNDER-AUTHORIZED -- see GOVERNANCE/
// ECOMAP_SOURCE_AND_BOUNDARY.md) and, this checkpoint, MULTI_AGENT (an internal, dependency-aware
// execution SCHEDULER over these other engines -- NOT the browser's role-playing/external-action
// orchestrator, which remains genuinely absent server-side -- see GOVERNANCE/
// MULTI_AGENT_SOURCE_AND_BOUNDARY.md) are now real, genuinely invoked server-side engines. This
// orchestrator calls them (via ibis-multi-agent-orchestrator.ts's runOrchestration()) and reports
// their ACTUAL result, which for several of them on an ordinary free-text query with no grounded
// evidence is honestly executed:false/SKIPPED (an external blocker, disclosed, never silently
// upgraded). See EngineReadiness in ibis-response-envelope.ts for the per-engine
// CONNECTED_OPERATIONAL / CONNECTED_CONDITIONAL / UNAVAILABLE classification this drives in
// docs/ibis/acceptance-baseline.md and tests/ibis-investor-readiness.mjs.
//
// COMPOSABILITY + ORCHESTRATION (introduced two checkpoints ago, extended this one): a single
// request can need several capabilities at once. `intent.queryClass` remains a single PRIMARY
// class (computed by ibis-intent-router.ts with the exact same priority order as every prior
// checkpoint, so legacy code that only reads `queryClass` sees no change), but capability SELECTION
// is the ADDITIVE `capabilityPlan` built from `intent.signals` by planCapabilities() below -- the
// ONE place that decision is made, entirely server-side. Actually RUNNING the selected engines in
// dependency order, tracking a complete per-capability execution receipt
// (SELECTED/INPUT_READY/EXECUTED/SKIPPED_*/DEGRADED/UNAVAILABLE/FAILED), is delegated to
// ibis-multi-agent-orchestrator.ts's runOrchestration() -- this file remains the single canonical
// orchestrator/endpoint; that module is a function it calls, not a competing router or brain.
import { runGateway, gatewayHealth, type GatewayProvider, type IbisProduct, type IbisTurn } from "./ibis-intelligence-gateway.ts";
import { classifyIntent, type IntentSignals } from "./ibis-intent-router.ts";
import { search as runSearch, type SearchResult } from "./ibis-search-adapter.ts";
import {
  buildEnvelope, type CanonicalResponse, type ExecutionInstruction, type QueryClass, type ReasoningModeRecord,
  type SourceRecord, type CapabilityKind, type PlannedCapability, type CapabilityReceiptEntry,
} from "./ibis-response-envelope.ts";
import { sha256Hex, type LifecycleStore } from "./ibis-lifecycle-store.ts";
import type { EBRInput, EcoMapPlaceInput, EcoMapPathwayInput, EcoMapRelationshipInput, ButterflyInput, PredictionInput } from "./ibis-reasoning-engines.ts";
import type { Series } from "./ibis-correlation-engine.ts";
import { runOrchestration, type OrchestrationAdvancedInputs } from "./ibis-multi-agent-orchestrator.ts";

export type CanonicalRequest = {
  text: string;
  products?: IbisProduct[];
  providers: GatewayProvider[];
  // Live-search evidence-grounding correction: a provider built from the plain `providers` array
  // was constructed by the caller BEFORE this function ever ran, so it has no way to know what (if
  // anything) search retrieved -- the answer-generation call below was genuinely ungrounded even on
  // a successful search (sources were returned to the caller to read, never given to the model).
  // When supplied, `providerFactory` is called AFTER search completes, with a real evidence block
  // (numbered source titles/publishers/dates/URLs) when sources exist, or null when RESEARCH wasn't
  // planned or produced none -- so the SAME provider construction that already reads real secrets
  // (ibis-assistant/index.ts's cloudflare()/anthropic()/gemini()/etc.) can bake the evidence into
  // its own system prompt before calling out. Optional and purely additive: every existing caller
  // that only supplies `providers` keeps its exact prior (evidence-blind) behavior unchanged.
  providerFactory?: (evidenceBlock: string | null) => GatewayProvider[];
  requestId?: string;
  searchFetchImpl?: typeof fetch;
  // Slice 3 serverless correction: the lifecycle store is INJECTED, never resolved internally --
  // this module must not decide for itself whether it's "ok" to fall back to in-memory state.
  // The caller (ibis-assistant/index.ts) resolves it once via resolveLifecycleStore() and is the
  // one place that decision is made, honestly, from real environment configuration.
  lifecycleStore: LifecycleStore | null;
  // Optional real, structured Evidence-Bounded Retrodiction input (see GOVERNANCE/
  // EBR_SOURCE_AND_BOUNDARY.md and ibis-ebr-engine.ts). No automatic evidence-retrieval pipeline
  // is wired into the canonical brain yet, so an ordinary free-text RETRODICTION query has none of
  // this and EBR is honestly SKIPPED -- a caller that already has real evidence items and candidate
  // causal histories (e.g. a governance/audit tool built on top of this endpoint) may supply them
  // here for genuine execution.
  ebrInput?: EBRInput | null;
  // Optional real, structured EcoMap inputs (see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md and
  // ibis-ecomap-engine.ts). An ordinary user never needs to construct these -- ibis-multi-agent-
  // orchestrator.ts auto-builds them server-side from whatever search evidence it already
  // retrieved. An advanced/internal caller (e.g. a governance/audit tool with real place/pathway/
  // relationship data, including SENSITIVE/PRIVATE relationship edges) may supply these directly,
  // which always takes precedence over the auto-built version.
  ecomapPlaceContext?: EcoMapPlaceInput | null;
  ecomapPathwayContext?: EcoMapPathwayInput | null;
  ecomapRelationshipContext?: EcoMapRelationshipInput | null;
  // Optional real, structured advanced inputs for engines with no automatic bridge (Correlation --
  // no data source in this codebase produces a real numeric time series from text) or where a
  // caller wants to bypass the disclosed EcoMap-derived heuristic bridge (Butterfly/Prediction)
  // with its own real data. Added this checkpoint for interface symmetry with ebrInput/EcoMap's
  // advanced contexts -- see GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md.
  correlationInput?: { seriesA: Series; seriesB: Series } | null;
  butterflyInput?: ButterflyInput | null;
  predictionInput?: PredictionInput | null;
  // Test-only override for the internal scheduler's defensive execution-budget ceiling. Never pass
  // this in production request handling.
  executionBudgetMsOverride?: number;
};

const PLAN_TTL_MS = 5 * 60_000;
// How long a fallback-generation lease is held before it becomes eligible for reclaim by another
// worker. Set well above the gateway's own real worst-case latency (ibis-intelligence-gateway.ts's
// PROVIDER_BUDGET_MS is 9s per provider, TOTAL_BUDGET_MS ~24s across all providers) so an
// ordinary, non-crashed call is never at risk of being reclaimed out from under it.
const LEASE_DURATION_MS = 45_000;

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

// As of this checkpoint, EVERY reasoning engine in the contract map (ibis-reasoning-engines.ts) is
// genuinely invoked server-side, including MULTI_AGENT (the internal execution scheduler -- see
// GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md). There is no longer a query class with a
// statically unavailable mode: this function is retained (returning []) for any future engine that
// genuinely remains unported, per the same discipline. The fact that MULTI_AGENT cannot execute an
// EXTERNAL, side-effecting action (send a message, invoke a connected app) is disclosed through
// Connection Fabric's own `NO_READY_CONNECTION_PATH` finding -- never fabricated as a separate
// "MULTI_AGENT unavailable" record, since MULTI_AGENT (this checkpoint's internal scheduler) and
// "external-action multi-agent execution" are two different capabilities that happened to share one
// enum name in the browser-only era (see the GOVERNANCE note's reconciliation section).
function relevantUnavailableModes(_queryClass: QueryClass): ReasoningModeRecord[] {
  return [];
}

function addCapability(plan: PlannedCapability[], capability: CapabilityKind, reason: string): void {
  if (plan.some((p) => p.capability === capability)) return; // first reason wins; never duplicate an entry
  plan.push({ capability, reason });
}

function hasCapability(plan: PlannedCapability[], capability: CapabilityKind): boolean {
  return plan.some((p) => p.capability === capability);
}

// The ONE place capability selection happens for a request -- entirely from classifyIntent()'s
// signals, entirely server-side. Every capability added here is added under the SAME condition the
// prior checkpoint's exclusive `queryClass ===` branch used for that engine, so a query matching
// only ONE signal is invoked identically to before; only a MULTI-signal query now gets more than
// one capability (previously impossible, since only the single highest-priority class ever ran).
function planCapabilities(signals: IntentSignals): PlannedCapability[] {
  const plan: PlannedCapability[] = [];
  const ecomapRequested = signals.ecomapPlace || signals.ecomapPathway || signals.ecomapRelationship;
  if (signals.freshness) {
    addCapability(plan, "RESEARCH", "A freshness marker matched (\"today\", \"latest\", a live-data term) -- model memory cannot honestly answer this without live retrieval.");
  } else if (signals.causeEvidence) {
    addCapability(plan, "RESEARCH", "The request explicitly asks for evidence behind a cause -- grounded sources are needed even without a live-freshness marker.");
  } else if (ecomapRequested) {
    addCapability(plan, "RESEARCH", "Mapping real services/organizations/steps/relationships requires grounded evidence, not internal FTN product data alone.");
  }
  if (signals.retrodiction) {
    addCapability(plan, "EBR", "The request asks why something happened / what caused it -- a bounded, evidence-based causal-history reconstruction (Evidence-Bounded Retrodiction) is relevant.");
  }
  if (signals.correlation) {
    addCapability(plan, "CORRELATION", "An explicit correlation/relationship-between-variables marker matched.");
  } else if (signals.causeEvidence) {
    addCapability(plan, "CORRELATION", "Evidence-based cause analysis benefits from checking for correlational patterns among the available evidence, even without the literal word \"correlation\".");
  }
  if (signals.outcome) {
    addCapability(plan, "FOUNDER_THINKING", "An outcome/build marker matched (\"I want to build/start/launch...\").");
    addCapability(plan, "BUTTERFLY", "Outcome-building questions may involve second-order effects worth surfacing if structured effect data exists.");
    addCapability(plan, "PREDICTION", "Outcome-building questions may involve timing/opportunity foresight worth surfacing if structured opportunity data exists.");
    addCapability(plan, "CONTEXT_GRAPH", "An outcome/build marker matched -- grounding the answer to FTN's own product ecosystem is relevant.");
  }
  if (signals.relationship) {
    addCapability(plan, "CONTEXT_GRAPH", "A relationship marker matched (which organizations/who connects) -- an ecosystem-connection question.");
  }
  if (signals.toolAction) {
    addCapability(plan, "CONNECTION_FABRIC", `A named connection target ("${signals.toolAction}") was requested.`);
  }
  // EcoMap (this checkpoint -- see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md): Place, Pathway and
  // Relationship are each independently selectable -- one query may plan all three at once.
  if (signals.ecomapPlace) {
    addCapability(plan, "ECOMAP_PLACE", "The request asks to map real services/organizations/opportunities in a place.");
  }
  if (signals.ecomapPathway) {
    addCapability(plan, "ECOMAP_PATHWAY", "The request asks for the steps/requirements toward a stated outcome.");
  }
  if (signals.ecomapRelationship) {
    addCapability(plan, "ECOMAP_RELATIONSHIP", "The request asks about relationships/referrals between ecosystem entities.");
  }
  // MULTI_AGENT (this checkpoint -- see GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md): the
  // internal dependency-aware scheduler is only worth selecting when there is genuinely more than
  // one OTHER capability to coordinate -- never for a single-capability or zero-capability request,
  // where sequential/dependency ordering has nothing to do.
  if (plan.length >= 2) {
    addCapability(plan, "MULTI_AGENT", `${plan.length} other capabilities were planned for this request -- dependency-aware scheduling is relevant.`);
  }
  return plan;
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
    snippet: s.snippet,
    evidenceDepth: s.evidenceDepth,
  }));
}

// Builds the evidence context handed to `providerFactory` (see CanonicalRequest.providerFactory
// above). Deliberately plain, numbered, inspectable text -- never a hidden system-only claim of
// certainty -- with an explicit instruction that anything NOT listed here remains unverified, so a
// provider cannot treat this block as license to assert unlisted "current" facts either. Returns
// null (never an empty string) when there is nothing to ground, so callers can tell "no evidence
// block" apart from "an evidence block with zero sources" (which should never occur, since this is
// only ever called with sources.length > 0).
// Grounded-synthesis correction: each source's own snippet text is now included (SearXNG's
// `content`, Brave's `description`) so the model can actually SUMMARIZE current developments,
// not just list sources to visit -- the prior version omitted snippet text entirely, which is why
// a genuinely search-grounded answer still degraded to "check Al Jazeera / BBC / Guardian"
// instead of describing what those sources actually say. The instruction below is explicit that a
// snippet is still only search-result evidence, never a full-page read, so this must never be
// misread as license to claim deeper verification than a snippet supports.
function buildEvidenceBlock(sources: SourceRecord[]): string | null {
  if (!sources.length) return null;
  const lines = sources.map((s, i) => {
    const meta = [s.publisher, s.publishedAt ? `published ${s.publishedAt}` : null, `retrieved ${s.retrievedAt}`].filter(Boolean).join(", ");
    const header = `[${i + 1}] "${s.title}"${meta ? ` (${meta})` : ""} -- ${s.url}`;
    return s.snippet ? `${header}\n    Snippet: ${s.snippet}` : header;
  });
  return [
    "Retrieved evidence for this request (from a real search just performed for this question):",
    ...lines,
    "Each numbered item above is search-result evidence (a title plus a short snippet of the page's own text where available) -- it is NOT equivalent to a full-page inspection, and none of it has been independently verified beyond what the snippet itself states. Summarize and describe current developments using ONLY what these snippets actually support; where several snippets describe different current events, synthesize them into an actual summary rather than merely listing the sources. Cite a source by its [n] when you rely on it directly. Do not present any current or specific fact as true unless a snippet above supports it -- if part of the question isn't covered by the evidence, say so plainly rather than filling the gap from memory.",
  ].join("\n");
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
  let searchCacheState: CanonicalResponse["searchCacheState"] = null;
  let degradedStages: string[] = [];
  const contradictions: string[] = [];
  const extraUncertainties: string[] = [];
  const actions: string[] = [];
  const ecosystemConnections: string[] = [];
  let handoff: CanonicalResponse["handoff"] = { external: false, note: null };
  let alternatives: CanonicalResponse["alternatives"] = [];

  // 4. CAPABILITY PLANNING -- the ONE place capability selection happens, entirely server-side,
  // entirely from intent.signals (see planCapabilities() above). Additive: a single request can
  // plan several capabilities at once, unlike the single `queryClass` it is built alongside.
  const capabilityPlan = planCapabilities(intent.signals);

  // 5/6. RETRIEVAL + SEARCH -- runs whenever RESEARCH is planned (freshness marker, OR an explicit
  // evidence-behind-a-cause request), regardless of which single class won PRIMARY classification.
  // This MUST run before any evidence-dependent reasoning below (EBR/EcoMap's evidence is built
  // from these sources) -- search failing degrades honestly here; it never silently falls through
  // to an answer that claims research happened. RESEARCH is the one genuinely asynchronous, real-
  // I/O capability, so it stays here (never inside the synchronous internal scheduler) -- its own
  // complete CapabilityReceiptEntry is built right here and handed to the scheduler below so ONE
  // receipt still covers every planned capability.
  let researchReceipt: CapabilityReceiptEntry | null = null;
  if (hasCapability(capabilityPlan, "RESEARCH")) {
    const startedAtIso = new Date().toISOString();
    researchReceipt = { capability: "RESEARCH", history: [{ state: "SELECTED", at: startedAtIso }, { state: "INPUT_READY", at: startedAtIso }], finalState: "INPUT_READY" };
    capabilitiesAttempted.push("SEARCH");
    const result = await runSearch(text, { fetchImpl: input.searchFetchImpl });
    if (result.status === "OK") {
      providerPath.push(`search:${result.provider}`);
      sources = sourcesFromSearch(result);
      evidenceState = "SEARCH_GROUNDED";
      searchCacheState = result.cacheState;
      // No reasoningModesUsed entry is pushed here (live-search evidence-grounding correction):
      // this used to claim "no synthesis model was called on them in this pass -- sources are
      // returned directly for the caller to read, not summarized", which was true before that
      // correction but is no longer accurate -- the answer-generation step below now genuinely
      // receives this same evidence (via providerFactory) and reports its own real MODEL_TEXT
      // contribution once it runs, so pushing a second, now-stale claim here would be misleading.
      researchReceipt.history.push({ state: "EXECUTED", at: new Date().toISOString() });
      researchReceipt.finalState = "EXECUTED";
    } else {
      degradedStages.push("SEARCH_UNAVAILABLE");
      handoff = { external: true, note: result.reason };
      alternatives = result.alternatives;
      reasoningModesUsed.push({ mode: "MODEL_TEXT", executed: false, unavailableReason: `Search unavailable: ${result.reason}` });
      researchReceipt.history.push({ state: "DEGRADED", at: new Date().toISOString(), reason: result.reason });
      researchReceipt.finalState = "DEGRADED";
    }
  }

  // 7-ish. CAPABILITY EXECUTION -- delegated to the internal dependency-aware scheduler (see
  // GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md and ibis-multi-agent-orchestrator.ts). This is
  // the ONE place every OTHER planned capability actually runs, in dependency order (evidence
  // normalized once; EcoMap before Context Graph/Butterfly/Prediction), with a complete
  // SELECTED/INPUT_READY/EXECUTED/SKIPPED_*/DEGRADED/UNAVAILABLE/FAILED state history per
  // capability. Advanced/internal structured inputs are preserved and always take precedence over
  // the auto-built/derived version; an ordinary user never needs to construct any of them.
  const orchestration = runOrchestration(capabilityPlan, {
    text, objective: intent.objective, products, toolAction: intent.signals.toolAction, sources, researchReceipt,
    advanced: {
      ebrInput: input.ebrInput, correlationInput: input.correlationInput, butterflyInput: input.butterflyInput,
      predictionInput: input.predictionInput, ecomapPlaceContext: input.ecomapPlaceContext,
      ecomapPathwayContext: input.ecomapPathwayContext, ecomapRelationshipContext: input.ecomapRelationshipContext,
    },
    executionBudgetMs: input.executionBudgetMsOverride,
  });
  reasoningModesUsed.push(...orchestration.reasoningModesUsed);
  contradictions.push(...orchestration.contradictions);
  extraUncertainties.push(...orchestration.uncertainties);
  actions.push(...orchestration.actions);
  ecosystemConnections.push(...orchestration.ecosystemConnections);
  // Duplicate-receipt correction: runOrchestration() already seeds its own internal receipts Map
  // with `researchReceipt` (when present) BEFORE building every other capability's entry, and
  // `orchestration.capabilityExecution` is that same Map's values -- it already contains the one
  // RESEARCH entry. Prepending `researchReceipt` again here used to produce two RESEARCH entries
  // in the final receipt for a single search execution.
  const capabilityExecution: CapabilityReceiptEntry[] = orchestration.capabilityExecution;
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
      capabilityPlan, capabilityExecution,
      executionInstruction,
      reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState: "NO_ANSWER_GENERATED", sources,
      confidence: "UNVERIFIED", confidenceBasis: "Execution deferred to authorized browser-local generation; no server provider was called.",
      status: "OK", degradedStages, handoff, alternatives,
      uncertainties: [...intent.reasons, ...extraUncertainties],
      contradictions, actions, ecosystemConnections,
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

  if (hasCapability(capabilityPlan, "RESEARCH") && sources.length === 0) {
    // Search was genuinely needed (and, for EBR, evidence-dependent reasoning above already
    // honestly SKIPPED for the same reason) but unavailable: say so plainly rather than falling
    // back to model memory and implying research happened -- this is the one hard rule this
    // module must never violate, regardless of which single primary class the query landed in.
    answer = `I don't have a working live-search route yet, so I can't verify the requested information for "${text}". ${handoff.note} Use one of the direct sources below instead.`;
    confidence = "UNAVAILABLE";
    confidenceBasis = "No search provider is configured; answering from model memory would misrepresent freshness.";
    status = "DEGRADED";
  } else {
    capabilitiesAttempted.push("TEXT");
    const evidenceBlock = sources.length ? buildEvidenceBlock(sources) : null;
    const effectiveProviders = input.providerFactory ? input.providerFactory(evidenceBlock) : input.providers;
    const gatewayResult = await runGateway({ text, products, providers: effectiveProviders, requestId });
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
      reasoningModesUsed.push({ mode: "MODEL_TEXT", executed: true, contribution: evidenceBlock ? `Answered by ${gatewayResult.provider}, grounded in ${sources.length} retrieved source(s) from this request's own search.` : `Answered by ${gatewayResult.provider}.` });
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
    capabilityPlan, capabilityExecution,
    executionInstruction,
    reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState, searchCacheState, sources,
    confidence, confidenceBasis, status, degradedStages, handoff, alternatives,
    uncertainties: [...intent.reasons, ...extraUncertainties],
    contradictions, actions, ecosystemConnections,
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
  // Optional: rebuilds `providers` with the ACTUAL resent user text as the one real user turn,
  // right before the fallback provider call. Without this, `input.providers` are whatever the
  // caller built when the ORIGINAL action:"record_execution_receipt" request arrived -- a request
  // that carries only {action, receipt}, no `messages` -- so every provider closure was built with
  // an empty turns array. The fallback call below still worked (recordSuccess/recordFailure, the
  // deterministic/founder-reasoning checks against `resentText` were already correct), but the
  // external model itself received a system prompt with no user message at all, and answered a
  // generic greeting instead of the user's real question (confirmed live: "What is photosynthesis?"
  // returned "Wah gwaan? How can I assist you today?"). Callers that omit this (existing tests, any
  // future non-HTTP caller) keep the exact prior behavior.
  providerFactory?: (turns: IbisTurn[]) => GatewayProvider[];
  // Test-only override for LEASE_DURATION_MS, so lease/fencing tests can prove real behavior
  // deterministically and fast rather than sleeping 45+ real seconds for a lease to expire. Never
  // pass this in production request handling.
  leaseDurationMsOverride?: number;
}): Promise<ReceiptOutcome> {
  const leaseDurationMs = input.leaseDurationMsOverride ?? LEASE_DURATION_MS;
  const r = input.receipt;
  if (typeof r.planId !== "string" || typeof r.executionTarget !== "string" || typeof r.provider !== "string" || typeof r.success !== "boolean") {
    return { status: "REJECTED", reason: "MALFORMED_RECEIPT" };
  }
  if (!input.lifecycleStore) return { status: "REJECTED", reason: "LIFECYCLE_STORE_UNAVAILABLE" };
  const store = input.lifecycleStore;

  const plan = await store.getPlan(r.planId);
  if (!plan) return { status: "REJECTED", reason: "UNKNOWN_PLAN" };
  if (plan.state === "EXPIRED") return { status: "REJECTED", reason: "EXPIRED_PLAN" };
  // Authorization mismatch is checked BEFORE attempting any transition: a non-authorized plan (or
  // one for a different target) must be rejected as a mismatch, never as a generic duplicate,
  // even though both would technically be true for an already-terminal non-authorized plan -- the
  // more specific reason is more useful and more honest.
  if (plan.authorizedTarget !== "browser_local" || r.executionTarget !== "browser_local") {
    return { status: "REJECTED", reason: "MISMATCHED_AUTHORIZATION" };
  }

  if (r.success) {
    // Browser-local execution succeeded; no provider call is ever involved on this path, so no
    // lease is needed -- a plain atomic PENDING -> SUCCEEDED acknowledgement is sufficient. The
    // browser already has and is rendering its own answer; nothing further to generate here.
    const transition = await store.transitionPlan(r.planId, "SUCCEEDED");
    if (!transition.ok) return { status: "REJECTED", reason: "DUPLICATE_RECEIPT" };
    return { status: "ACCEPTED", terminal: true, envelope: null };
  }

  // Authorized fallback: local execution failed despite authorization. This is the ONLY path that
  // calls an external provider, and it goes through a proper LEASED CLAIM WITH FENCING (see
  // ibis-lifecycle-store.ts's module header for the full contract) -- not a plain atomic
  // transition -- because a legitimate provider call can legitimately run longer than any fixed
  // staleness window, so "stale enough" alone cannot safely gate a second attempt. claimFallback()
  // either performs a fresh claim (first failure receipt for this plan) or, if the plan is already
  // FALLBACK_REQUESTED, an atomic RECLAIM that only succeeds once the existing lease has actually
  // EXPIRED -- an active (non-expired) lease is correctly rejected as still-in-progress, never raced.
  const claim = await store.claimFallback(r.planId, leaseDurationMs);
  if (!claim.ok) {
    if (claim.reason === "UNKNOWN_PLAN") return { status: "REJECTED", reason: "UNKNOWN_PLAN" };
    if (claim.reason === "EXPIRED_PLAN") return { status: "REJECTED", reason: "EXPIRED_PLAN" };
    // NOT_CLAIMABLE (an active, non-expired lease already held by another worker) or STORE_ERROR:
    // both mean this caller must not proceed. Rejected as a duplicate, never a fabricated success.
    return { status: "REJECTED", reason: "DUPLICATE_RECEIPT" };
  }
  // attemptCount > 1 on the claimed plan means this claim is a RECLAIM of an expired lease -- i.e.
  // crash recovery, not a first attempt. Recorded honestly in the receipt below, never disguised
  // as an ordinary first-attempt fallback.
  const resumedFromCrash = claim.plan.attemptCount > 1;

  // The client must resend the original prompt text; verified against the hash taken at PLAN time
  // (this server never persisted the text itself -- see the migration header) before it is trusted.
  // A text mismatch leaves the lease claimed-but-unfinalized -- it will simply expire naturally
  // and become reclaimable, rather than needing its own explicit release path.
  const resentText = typeof r.text === "string" ? r.text.trim() : "";
  if (!resentText) return { status: "REJECTED", reason: "TEXT_MISMATCH" };
  const resentHash = await sha256Hex(resentText);
  if (resentHash !== plan.textSha256) return { status: "REJECTED", reason: "TEXT_MISMATCH" };
  const products: IbisProduct[] = Array.isArray(r.products) ? (r.products as IbisProduct[]) : [];

  const startedAt = new Date().toISOString();
  const fallbackProviders = input.providerFactory ? input.providerFactory([{ role: "user", content: resentText }]) : input.providers;
  const gatewayResult = await runGateway({ text: resentText, products, providers: fallbackProviders, requestId: plan.planId });

  // Finalize: requires the EXACT (leaseOwner, leaseVersion) this call was issued at claim time.
  // If another worker reclaimed this plan's lease in the meantime (this worker's own call ran
  // long enough for its lease to expire and someone else reclaimed it), this finalize call's
  // fencing check fails and this caller's freshly-generated answer is discarded, never delivered
  // -- exactly-once ANSWER DELIVERY at the database-state level, even though the underlying
  // external PROVIDER CALL itself is only AT-LEAST-ONCE (a reclaim after a real crash, or after a
  // lease genuinely too short for an unusually slow call, can cause a second real provider call;
  // this is disclosed, not claimed away).
  const finalize = await store.finalizeFallback(plan.planId, claim.leaseOwner, claim.leaseVersion, "SUCCEEDED");
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
