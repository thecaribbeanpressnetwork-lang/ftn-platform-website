// FTN Platform — canonical IBIS response envelope.
//
// One stable shape every canonical-brain response returns, regardless of which query route or
// reasoning modes ran. The visible UI answer leads; everything else here is expandable provenance.
// Nothing in this module invents a field's value -- a mode that did not run is listed as such
// (executed:false with a reason), never omitted or silently implied to have happened.

export type QueryClass =
  | "SIMPLE_TEXT"
  | "CURRENT_WEB_RESEARCH"
  | "FTN_RESOURCE"
  | "PLACE"
  | "PATHWAY"
  | "RELATIONSHIP"
  | "FOUNDER_STRATEGY"
  | "CAUSAL_BUTTERFLY"
  | "CORRELATION"
  | "PREDICTION"
  | "RETRODICTION"
  | "GENERATION"
  | "TOOL_ACTION"
  | "MIXED";

export type ReasoningMode =
  | "DETERMINISTIC"
  | "MODEL_TEXT"
  | "FOUNDER_REASONING_RULES_FALLBACK"
  | "FOUNDER_COGNITIVE_LAYER"
  | "EBR"
  | "ECOMAP_PLACE"
  | "ECOMAP_PATHWAY"
  | "ECOMAP_RELATIONSHIP"
  | "BUTTERFLY"
  | "CORRELATION"
  | "PREDICTION"
  | "CONTEXT_GRAPH"
  | "OPPORTUNITY_GRAPH"
  | "CONNECTION_FABRIC"
  | "MULTI_AGENT";

export type ReasoningModeRecord = {
  mode: ReasoningMode;
  executed: boolean;
  // Only present when executed is true; a short, real description of what this mode actually
  // contributed to the answer -- never a static label copy-pasted regardless of outcome.
  contribution?: string;
  // Only present when executed is false; states WHY (not yet ported server-side, not relevant to
  // this query class, provider unavailable, etc.) -- a mode is never silently dropped from the list.
  unavailableReason?: string;
};

// Composability correction: a single request can need several capabilities at once (e.g. a
// current causal question needs live research AND a bounded causal reconstruction AND, when
// relationships are being assessed, a correlation check). CapabilityKind names the additive,
// server-side-only capabilities the canonical brain can plan for a given request -- this is
// SEPARATE from and additive to the single legacy `queryClass`, which callers that only understand
// one class may keep reading. EcoMap Place/Pathway/Relationship are each independently selectable
// (see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md). MULTI_AGENT (this checkpoint -- see GOVERNANCE/
// MULTI_AGENT_SOURCE_AND_BOUNDARY.md) is the internal dependency-aware execution SCHEDULER over
// these other capabilities -- it is NOT the browser's role-playing/external-action orchestrator,
// which remains genuinely absent server-side (disclosed via Connection Fabric's own
// NO_READY_CONNECTION_PATH finding, not a separate unavailable record).
export type CapabilityKind =
  | "RESEARCH"
  | "EBR"
  | "CORRELATION"
  | "FOUNDER_THINKING"
  | "BUTTERFLY"
  | "PREDICTION"
  | "CONTEXT_GRAPH"
  | "CONNECTION_FABRIC"
  | "ECOMAP_PLACE"
  | "ECOMAP_PATHWAY"
  | "ECOMAP_RELATIONSHIP"
  | "MULTI_AGENT";

export type PlannedCapability = {
  capability: CapabilityKind;
  // Why this capability was selected for THIS request -- a real, inspectable reason derived from
  // the classifier's signals, never a static label copy-pasted regardless of the query.
  reason: string;
};

// Per-engine operational readiness, distinct from a single request's runtime outcome
// (ReasoningModeRecord.executed/unavailableReason above). CONNECTED_OPERATIONAL: an ordinary
// canonical query can supply this engine's real inputs without any caller-supplied structured
// data. CONNECTED_CONDITIONAL: the adapter is real and genuinely invoked, but genuine execution
// still depends on structured input an ordinary free-text query does not automatically produce
// (e.g. Butterfly/Prediction's structured effects/opportunities, or EBR's candidate causal
// histories). UNAVAILABLE: not ported / no methodology exists yet. An engine must never be
// reported CONNECTED_OPERATIONAL merely because its adapter exists or because a test manually
// injected structured data -- that is exactly the overclaim this type exists to prevent.
export type EngineReadiness = "CONNECTED_OPERATIONAL" | "CONNECTED_CONDITIONAL" | "UNAVAILABLE";

// Execution-state contract (this checkpoint -- see GOVERNANCE/MULTI_AGENT_SOURCE_AND_BOUNDARY.md).
// Every capability in a request's `capabilityPlan` ends in EXACTLY ONE terminal state below.
// SELECTED and INPUT_READY are TRANSIENT -- a capability that never reaches EXECUTED/DEGRADED/
// FAILED still shows them in its own `history`, but its `finalState` is always one of the other
// six. A capability must never be counted operational merely because it was SELECTED.
export type CapabilityExecutionState =
  | "SELECTED"             // in the additive capabilityPlan for this request
  | "INPUT_READY"          // real, non-fabricated structured input was prepared for it
  | "EXECUTED"             // ran and genuinely produced a result
  | "SKIPPED_MISSING_INPUT" // selected, but no real input could be prepared without fabrication
  | "SKIPPED_NOT_RELEVANT"  // selected in error or superseded -- reserved for future use
  | "SKIPPED_BUDGET"        // the execution budget was exhausted before this capability ran
  | "DEGRADED"              // ran, but with a real, disclosed reduction in quality/certainty
  | "UNAVAILABLE"           // not ported / no methodology exists (e.g. Multi-Agent's own external-action mode)
  | "FAILED";               // threw an unexpected error -- never silently substituted with a fabricated result

export type CapabilityStateTransition = {
  state: CapabilityExecutionState;
  at: string; // ISO 8601
  reason?: string;
};

export type CapabilityReceiptEntry = {
  capability: CapabilityKind;
  history: CapabilityStateTransition[]; // full transition history, including SELECTED/INPUT_READY
  finalState: CapabilityExecutionState; // the one terminal state this capability ended in
};

export type SourceRecord = {
  title: string;
  publisher: string | null;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  retrievedAt: string;
  // The search provider's own result text (SearXNG's `content`, Brave's `description`) -- real
  // evidence a synthesis step can summarize from, but still only ever a snippet: never treated as
  // having inspected the full source page. null when the provider returned none.
  snippet: string | null;
  // SNIPPET: only a search-result snippet was inspected, never treated as verified full-source
  // content. INSPECTED: the retrieval adapter actually fetched and read the page body.
  evidenceDepth: "SNIPPET" | "INSPECTED";
  supportsClaimIds?: string[];
};

// Slice 1 correction: the browser must never independently decide a question is "plain" or
// "non-fresh" and run local execution before the canonical planner has seen it. Every
// canonical_query response now carries this instruction; a client may invoke browser-local
// execution (e.g. an on-device LanguageModel) ONLY when executionAuthorized is explicitly true on
// a response that actually came from this endpoint -- never inferred client-side.
export type ExecutionInstruction = {
  planId: string;
  executionTarget: "browser_local" | "server_provider" | null;
  executionAuthorized: boolean;
  intent: QueryClass;
  freshnessRequired: boolean;
  constraints: string[];
};

export type ExecutionReceipt = {
  planId: string;
  executionTarget: "browser_local" | "server_provider";
  provider: string;
  success: boolean;
  degraded: boolean;
  latencyMs: number | null;
  recordedAt: string;
};

export type AlternativeRecord = {
  label: string;
  url: string;
  costStatus: "FREE" | "FREE_TIER" | "PAID" | "UNKNOWN";
  signInRequired: boolean;
  caribbeanAvailability: "AVAILABLE" | "UNKNOWN" | "RESTRICTED";
  privacyNote?: string;
};

export type CanonicalReceipt = {
  requestId: string;
  queryClass: QueryClass;
  capabilityPlan: PlannedCapability[];
  // Complete per-capability execution receipt (this checkpoint) -- distinguishes SELECTED from
  // genuinely EXECUTED; see CapabilityExecutionState above.
  capabilityExecution: CapabilityReceiptEntry[];
  capabilitiesAttempted: string[];
  providerPath: string[];
  reasoningModesUsed: ReasoningModeRecord[];
  degradedStages: string[];
  startedAt: string;
  respondedAt: string;
};

export type CanonicalResponse = {
  requestId: string;
  answer: string;
  objective: string | null;
  queryClass: QueryClass;
  // Additive, server-side-only capability plan for THIS request (see CapabilityKind above) -- what
  // was decided as relevant, independent of the single legacy `queryClass`. Every capability that
  // was planned appears in `reasoningModesUsed` too, with its actual executed/skipped/degraded
  // outcome -- this field is the PLAN, reasoningModesUsed is the OUTCOME.
  capabilityPlan: PlannedCapability[];
  // Complete per-capability execution receipt (this checkpoint -- see GOVERNANCE/
  // MULTI_AGENT_SOURCE_AND_BOUNDARY.md): one entry per planned capability, with its full state
  // history and single terminal state. capabilityPlan says what was SELECTED; capabilityExecution
  // says what actually happened.
  capabilityExecution: CapabilityReceiptEntry[];
  reasoningModesUsed: ReasoningModeRecord[];
  capabilitiesAttempted: string[];
  providerPath: string[];
  evidenceState: "DETERMINISTIC" | "MODEL_GENERATED" | "SEARCH_GROUNDED" | "NO_ANSWER_GENERATED";
  // Live-search UX correction: lets a caller honestly show "live" vs "cached" rather than implying
  // every grounded answer just made a fresh network call. null when no search ran this request (no
  // RESEARCH capability was planned) -- distinct from "unavailable", which is `handoff.external`.
  searchCacheState: "LIVE" | "CACHED" | null;
  sources: SourceRecord[];
  confidence: "HIGH" | "MODERATE" | "UNVERIFIED" | "UNAVAILABLE";
  confidenceBasis: string;
  assumptions: string[];
  uncertainties: string[];
  contradictions: string[];
  ecosystemConnections: string[];
  actions: string[];
  alternatives: AlternativeRecord[];
  status: "OK" | "DEGRADED" | "UNAVAILABLE";
  permissions: { requiresApproval: boolean; reason: string | null };
  artifacts: unknown[];
  handoff: { external: boolean; note: string | null };
  receipt: CanonicalReceipt;
  executionInstruction: ExecutionInstruction;
  generatedAt: string;
};

export function buildEnvelope(input: {
  requestId: string;
  startedAt: string;
  answer: string;
  objective?: string | null;
  queryClass: QueryClass;
  capabilityPlan?: PlannedCapability[];
  capabilityExecution?: CapabilityReceiptEntry[];
  executionInstruction: ExecutionInstruction;
  reasoningModesUsed: ReasoningModeRecord[];
  capabilitiesAttempted: string[];
  providerPath: string[];
  evidenceState: CanonicalResponse["evidenceState"];
  searchCacheState?: CanonicalResponse["searchCacheState"];
  sources?: SourceRecord[];
  confidence: CanonicalResponse["confidence"];
  confidenceBasis: string;
  assumptions?: string[];
  uncertainties?: string[];
  contradictions?: string[];
  ecosystemConnections?: string[];
  actions?: string[];
  alternatives?: AlternativeRecord[];
  status: CanonicalResponse["status"];
  degradedStages?: string[];
  permissions?: CanonicalResponse["permissions"];
  handoff?: CanonicalResponse["handoff"];
}): CanonicalResponse {
  const respondedAt = new Date().toISOString();
  return {
    requestId: input.requestId,
    answer: input.answer,
    objective: input.objective ?? null,
    queryClass: input.queryClass,
    capabilityPlan: input.capabilityPlan || [],
    capabilityExecution: input.capabilityExecution || [],
    reasoningModesUsed: input.reasoningModesUsed,
    capabilitiesAttempted: input.capabilitiesAttempted,
    providerPath: input.providerPath,
    evidenceState: input.evidenceState,
    searchCacheState: input.searchCacheState ?? null,
    sources: input.sources || [],
    confidence: input.confidence,
    confidenceBasis: input.confidenceBasis,
    assumptions: input.assumptions || [],
    uncertainties: input.uncertainties || [],
    contradictions: input.contradictions || [],
    ecosystemConnections: input.ecosystemConnections || [],
    actions: input.actions || [],
    alternatives: input.alternatives || [],
    status: input.status,
    permissions: input.permissions || { requiresApproval: false, reason: null },
    artifacts: [],
    handoff: input.handoff || { external: false, note: null },
    executionInstruction: input.executionInstruction,
    receipt: {
      requestId: input.requestId,
      queryClass: input.queryClass,
      capabilityPlan: input.capabilityPlan || [],
      capabilityExecution: input.capabilityExecution || [],
      capabilitiesAttempted: input.capabilitiesAttempted,
      providerPath: input.providerPath,
      reasoningModesUsed: input.reasoningModesUsed,
      degradedStages: input.degradedStages || [],
      startedAt: input.startedAt,
      respondedAt,
    },
    generatedAt: respondedAt,
  };
}
