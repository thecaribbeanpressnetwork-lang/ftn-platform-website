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

export type SourceRecord = {
  title: string;
  publisher: string | null;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  retrievedAt: string;
  // SNIPPET: only a search-result snippet was inspected, never treated as verified full-source
  // content. INSPECTED: the retrieval adapter actually fetched and read the page body.
  evidenceDepth: "SNIPPET" | "INSPECTED";
  supportsClaimIds?: string[];
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
  reasoningModesUsed: ReasoningModeRecord[];
  capabilitiesAttempted: string[];
  providerPath: string[];
  evidenceState: "DETERMINISTIC" | "MODEL_GENERATED" | "SEARCH_GROUNDED" | "NO_ANSWER_GENERATED";
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
  generatedAt: string;
};

export function buildEnvelope(input: {
  requestId: string;
  startedAt: string;
  answer: string;
  objective?: string | null;
  queryClass: QueryClass;
  reasoningModesUsed: ReasoningModeRecord[];
  capabilitiesAttempted: string[];
  providerPath: string[];
  evidenceState: CanonicalResponse["evidenceState"];
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
    reasoningModesUsed: input.reasoningModesUsed,
    capabilitiesAttempted: input.capabilitiesAttempted,
    providerPath: input.providerPath,
    evidenceState: input.evidenceState,
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
    receipt: {
      requestId: input.requestId,
      queryClass: input.queryClass,
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
