// FTN Platform — the canonical IBIS request orchestrator (server-brain, Phase 1 slice).
//
// This is the one function every canonical-contract request enters. It is deliberately NOT a
// mechanical merge of the three existing Edge Functions (ibis-assistant/ibis-text-cloudflare/
// ibis-query) -- those remain as they are, and this module composes the ALREADY-REAL pieces
// (runGateway's deterministic + provider-fallback + rules-based founder-reasoning chain, the new
// intent classifier, the new search adapter, the lifecycle store) behind one typed contract.
//
// Honesty boundary (read before extending this file): EcoMap Place/Pathway/Relationship,
// Opportunity Graph and the Multi-Agent Orchestrator remain BROWSER-ONLY or genuinely missing --
// they have not been ported or reproduced as server-safe modules. Founder Cognitive Layer,
// Correlation, Butterfly, Prediction/Foresight, Context Graph, Connection Fabric and EBR (Evidence-
// Bounded Retrodiction -- see GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md) are now real, genuinely
// invoked server-side engines (ibis-reasoning-engines.ts) -- this orchestrator calls them directly
// and reports their ACTUAL result, which for Butterfly/Prediction/Correlation/EBR on an ordinary
// free-text query is often honestly executed:false/SKIPPED or a CONDITIONAL evidence-only finding
// (structured effects/opportunity/series/candidate-history data is not automatically produced by
// an ordinary query for those -- an external blocker, disclosed, never silently upgraded). See
// EngineReadiness in ibis-response-envelope.ts for the per-engine CONNECTED_OPERATIONAL /
// CONNECTED_CONDITIONAL / UNAVAILABLE classification this drives in docs/ibis/acceptance-
// baseline.md and tests/ibis-investor-readiness.mjs.
//
// COMPOSABILITY (this checkpoint): a single request can need several capabilities at once (e.g. a
// current causal question needs live research AND a bounded causal reconstruction AND, when
// relationships/patterns are being assessed, a correlation check). `intent.queryClass` remains a
// single PRIMARY class (computed by ibis-intent-router.ts with the exact same priority order as
// every prior checkpoint, so legacy code that only reads `queryClass` sees no change), but capability
// SELECTION for what actually runs is driven by the ADDITIVE `capabilityPlan` built from
// `intent.signals` by planCapabilities() below -- the ONE place that decision is made, entirely
// server-side (a browser never sees or influences this). This is still the single canonical
// orchestrator -- no second router or duplicate planner exists.
import { runGateway, gatewayHealth, type GatewayProvider, type IbisProduct } from "./ibis-intelligence-gateway.ts";
import { classifyIntent, type IntentSignals } from "./ibis-intent-router.ts";
import { search as runSearch, type SearchResult } from "./ibis-search-adapter.ts";
import { buildEnvelope, type CanonicalResponse, type ExecutionInstruction, type QueryClass, type ReasoningModeRecord, type SourceRecord, type CapabilityKind, type PlannedCapability } from "./ibis-response-envelope.ts";
import { sha256Hex, type LifecycleStore } from "./ibis-lifecycle-store.ts";
import { runFounderThinking, runCorrelation, runButterfly, runPrediction, runContextGraph, runConnectionFabric, runEBR, type EBRInput } from "./ibis-reasoning-engines.ts";
import { findContradictions, type EvidenceItem } from "./ibis-ebr-engine.ts";

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
  // Optional real, structured Evidence-Bounded Retrodiction input (see GOVERNANCE/
  // EBR_SOURCE_AND_BOUNDARY.md and ibis-ebr-engine.ts). No automatic evidence-retrieval pipeline
  // is wired into the canonical brain yet, so an ordinary free-text RETRODICTION query has none of
  // this and EBR is honestly SKIPPED -- a caller that already has real evidence items and candidate
  // causal histories (e.g. a governance/audit tool built on top of this endpoint) may supply them
  // here for genuine execution.
  ebrInput?: EBRInput | null;
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

const NOT_PORTED = "not yet ported to the server-side canonical brain -- currently exists only as a browser module (js/ibis-*.js); this response does not claim it ran.";

function unavailableMode(mode: ReasoningModeRecord["mode"], reason = NOT_PORTED): ReasoningModeRecord {
  return { mode, executed: false, unavailableReason: reason };
}

// Slice: FOUNDER_COGNITIVE_LAYER, CORRELATION, BUTTERFLY, PREDICTION, CONTEXT_GRAPH and
// CONNECTION_FABRIC are no longer statically listed as unavailable here -- all six are now REAL,
// genuinely invoked server-side engines (ibis-reasoning-engines.ts, extracted/adapted from the real
// existing implementations, not invented). handleCanonicalRequest calls them directly and reports
// their ACTUAL result, which for CORRELATION/BUTTERFLY/PREDICTION/CONNECTION_FABRIC on an ordinary
// free-text query is honestly executed:false/SKIPPED (no series/effects/opportunity/provider data
// exists for a plain question) -- never silently upgraded to executed:true. EBR, EcoMap Place/
// Pathway/Relationship and Multi-Agent Orchestrator remain genuinely unported; see
// ibis-reasoning-engines.ts's own header for the full contract map and why.
function relevantUnavailableModes(queryClass: QueryClass): ReasoningModeRecord[] {
  switch (queryClass) {
    case "PATHWAY":
      return [unavailableMode("ECOMAP_PATHWAY")];
    case "PLACE":
      return [unavailableMode("ECOMAP_PLACE", "not yet ported server-side; also requires explicit user location consent not collected by this endpoint.")];
    case "RELATIONSHIP":
      return [unavailableMode("ECOMAP_RELATIONSHIP")];
    case "TOOL_ACTION":
      return [unavailableMode("MULTI_AGENT", "not yet ported server-side (browser-only, depends on FTN.Auth/PermissionLedger/UniversalRouter and unassessed real-world portability); Connection Fabric alone can only report route READINESS, not execute a connected action.")];
    default:
      return [];
  }
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
  if (signals.freshness) {
    addCapability(plan, "RESEARCH", "A freshness marker matched (\"today\", \"latest\", a live-data term) -- model memory cannot honestly answer this without live retrieval.");
  } else if (signals.causeEvidence) {
    addCapability(plan, "RESEARCH", "The request explicitly asks for evidence behind a cause -- grounded sources are needed even without a live-freshness marker.");
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
  return plan;
}

// Builds real EBR evidence items from grounded search results already retrieved for THIS request --
// never a second retrieval, never invented data. Deliberately does NOT set actorAccess: an ordinary
// canonical request has no known actor or decision time, and actor access must never be inferred
// merely because evidence exists (see GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md and
// ibis-reasoning-engines.ts's EBR contract comment). Returns null when there is no grounded evidence
// to build from (search never ran, or ran and failed) -- runEBR() then honestly reports SKIPPED
// rather than this function fabricating a placeholder item.
function evidenceItemFromSource(source: SourceRecord, index: number): EvidenceItem {
  return {
    id: `search-source-${index}`,
    eventTime: source.publishedAt || source.updatedAt || source.retrievedAt,
    recordTime: source.retrievedAt,
    provenance: source.publisher || source.url,
    // A SNIPPET-only result was never actually read in full -- honestly weaker (INFERRED) than an
    // INSPECTED result whose page body the retrieval adapter actually fetched (DOCUMENTED). This is
    // a direct, non-fabricated translation of a distinction the search adapter already tracks.
    epistemicStatus: source.evidenceDepth === "INSPECTED" ? "DOCUMENTED" : "INFERRED",
    scope: "CURRENT_WEB_RESEARCH",
    observerMetadata: { url: source.url, title: source.title },
  };
}

function buildEbrInputFromSources(sources: SourceRecord[]): EBRInput | null {
  if (!sources.length) return null;
  return {
    auditCutoff: new Date().toISOString(),
    evidenceItems: sources.map(evidenceItemFromSource),
    candidateHistories: [], // no automatic hypothesis generation -- see ibis-reasoning-engines.ts's EBR contract comment
  };
}

function founderThinkingRecord(text: string, products: IbisProduct[]): ReasoningModeRecord {
  const result = runFounderThinking(text, products);
  if (!result.executed) return { mode: "FOUNDER_COGNITIVE_LAYER", executed: false, unavailableReason: result.reason || "skipped" };
  return {
    mode: "FOUNDER_COGNITIVE_LAYER",
    executed: true,
    contribution: `${result.findings.join(" ")} This classification and decision directly produced the answer text below (same domain/guidance table, extracted from the real founderReasoningAnswer() logic in ibis-intelligence-gateway.ts, not reinvented).`,
  };
}

function correlationRecord(): ReasoningModeRecord {
  // No FTN data-source integration feeds real time-series data into the canonical brain for an
  // ordinary text query yet -- honestly invoked with no series, honestly reported as skipped.
  const result = runCorrelation(null, null);
  return { mode: "CORRELATION", executed: false, unavailableReason: result.reason || "skipped" };
}

function butterflyRecord(): ReasoningModeRecord {
  // No caller supplies real structured second-order-effect data for a free-text query yet --
  // honestly invoked with no input, honestly reported as skipped (never fabricated).
  const result = runButterfly(null);
  return { mode: "BUTTERFLY", executed: false, unavailableReason: result.reason || "skipped" };
}

function predictionRecord(): ReasoningModeRecord {
  // No caller supplies real reviewed-opportunity/relationship data for a free-text query yet --
  // honestly invoked with no input, honestly reported as skipped (never fabricated).
  const result = runPrediction(null);
  return { mode: "PREDICTION", executed: false, unavailableReason: result.reason || "skipped" };
}

function contextGraphRecord(products: IbisProduct[]): ReasoningModeRecord {
  const result = runContextGraph(products, []);
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

// EBR materially changes the canonical envelope beyond its own reasoningModesUsed entry: real
// contradictions and the ⊥ unmodeled-history reserve are threaded into the envelope's own
// contradictions/uncertainties fields (both otherwise always empty for a RETRODICTION query) --
// this is the concrete, inspectable proof that EBR changes the canonical result, not just an
// executed:true flag on one record among many.
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
  const contradictions: string[] = [];
  const extraUncertainties: string[] = [];
  let handoff: CanonicalResponse["handoff"] = { external: false, note: null };
  let alternatives: CanonicalResponse["alternatives"] = [];

  // 4. CAPABILITY PLANNING -- the ONE place capability selection happens, entirely server-side,
  // entirely from intent.signals (see planCapabilities() above). Additive: a single request can
  // plan several capabilities at once, unlike the single `queryClass` it is built alongside.
  const capabilityPlan = planCapabilities(intent.signals);

  // 5/6. RETRIEVAL + SEARCH -- runs whenever RESEARCH is planned (freshness marker, OR an explicit
  // evidence-behind-a-cause request), regardless of which single class won PRIMARY classification.
  // This MUST run before any evidence-dependent reasoning below (EBR's evidence is built from these
  // sources) -- search failing degrades honestly here; it never silently falls through to an answer
  // that claims research happened.
  if (hasCapability(capabilityPlan, "RESEARCH")) {
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

  // Real engine invocation, selective and now composable -- every capability planned above is
  // invoked; a capability NOT planned is never invoked, avoiding unnecessary reasoning cost on
  // simple queries (the required selection rule). Founder Thinking/Butterfly/Prediction/Context
  // Graph run together when an outcome-building question is detected; Context Graph also runs
  // alone for a relationship question; Correlation runs for an explicit correlation marker OR as a
  // complementary check for evidence-based cause analysis; Connection Fabric runs for a named
  // connect/integrate target; EBR runs for a why-did/what-caused question.
  if (hasCapability(capabilityPlan, "FOUNDER_THINKING")) {
    reasoningModesUsed.push(founderThinkingRecord(text, products));
    reasoningModesUsed.push(butterflyRecord());
    reasoningModesUsed.push(predictionRecord());
  }
  if (hasCapability(capabilityPlan, "CONTEXT_GRAPH")) reasoningModesUsed.push(contextGraphRecord(products));
  if (hasCapability(capabilityPlan, "CORRELATION")) reasoningModesUsed.push(correlationRecord());
  if (hasCapability(capabilityPlan, "CONNECTION_FABRIC")) reasoningModesUsed.push(connectionFabricRecord(intent.signals.toolAction));
  if (hasCapability(capabilityPlan, "EBR")) {
    // Advanced/internal interface preserved: an explicit input.ebrInput always takes precedence.
    // Otherwise, build real EBR evidence server-side from the grounded search results already
    // retrieved above (never from the browser, never inferring actor access) -- an ordinary user
    // never needs to construct ebrInput themselves for EBR to genuinely run on real evidence.
    const ebr = ebrRecord(input.ebrInput ?? buildEbrInputFromSources(sources));
    reasoningModesUsed.push(ebr.record);
    contradictions.push(...ebr.contradictions);
    extraUncertainties.push(...ebr.uncertainties);
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
      capabilityPlan,
      executionInstruction,
      reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState: "NO_ANSWER_GENERATED", sources,
      confidence: "UNVERIFIED", confidenceBasis: "Execution deferred to authorized browser-local generation; no server provider was called.",
      status: "OK", degradedStages, handoff, alternatives,
      uncertainties: [...intent.reasons, ...extraUncertainties],
      contradictions,
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
    capabilityPlan,
    executionInstruction,
    reasoningModesUsed, capabilitiesAttempted, providerPath, evidenceState, sources,
    confidence, confidenceBasis, status, degradedStages, handoff, alternatives,
    uncertainties: [...intent.reasons, ...extraUncertainties],
    contradictions,
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
  const gatewayResult = await runGateway({ text: resentText, products, providers: input.providers, requestId: plan.planId });

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
