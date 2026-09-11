export type CebosRequestClass = "INFORMATION" | "TASK" | "DECISION" | "CREATIVE";
export type CebosEvidenceStatus = "VERIFIED" | "CORROBORATED" | "STRONG_INFERENCE" | "WORKING_INFERENCE" | "MODEL_ASSUMPTION" | "SPECULATIVE_LEAD" | "CONTRADICTED" | "UNRESOLVED";
export type CebosTraceStatus = "FOUND" | "ABSENT_AFTER_SEARCH" | "CONTRADICTED" | "NOT_YET_SEARCHED" | "INACCESSIBLE";
export type CebosSourceClass = "PRIMARY_EVIDENCE" | "OFFICIAL_GOVERNMENT" | "LEGISLATION_PUBLIC_RECORD" | "ACADEMIC" | "REPUTABLE_JOURNALISM" | "CORPORATE_STATEMENT" | "COMMUNITY_DISCUSSION" | "CREATOR_SOCIAL" | "PERSONAL_COMMENTARY" | "MARKETING_ADVOCACY" | "UNKNOWN";

export type CebosEvidence = {
  id: string;
  claim: string;
  status: CebosEvidenceStatus;
  sourceClass: CebosSourceClass;
  sourceUrl?: string | null;
  publisher?: string | null;
  eventTime?: string | null;
  recordTime?: string | null;
  actorAccessTime?: string | null;
  retrievedAt?: string | null;
  discoveryUtility: number;
  decisionAuthority: number;
  geographicRelevance?: string | null;
  contradictions?: string[];
};

export type CebosExpectedTrace = {
  hypothesis: string;
  trace: string;
  status: CebosTraceStatus;
  evidenceIds: string[];
};

export type CebosOpportunitySignal = {
  signal: string;
  mechanism: string;
  controllable: boolean;
  valueDimensions: Array<"CASH" | "ASSET" | "CONTROL" | "DATA" | "STRATEGIC" | "OPTION">;
  confidence: CebosEvidenceStatus;
};

export type CebosReasoningState = {
  version: string;
  requestClass: CebosRequestClass;
  request: string;
  objective: string;
  decision: string | null;
  locationContext: string | null;
  caribbeanRelevant: boolean;
  requiredConditions: string[];
  hypotheses: string[];
  expectedTraces: CebosExpectedTrace[];
  evidence: CebosEvidence[];
  alternatives: string[];
  fixedVariables: string[];
  controllableVariables: string[];
  risks: string[];
  opportunitySignals: CebosOpportunitySignal[];
  unknowns: string[];
  nextBottleneck: string | null;
};

export const CEBOS_VERSION = "cebos-2026-09-11.1";

const AUTHORITY: Record<CebosSourceClass, number> = {
  PRIMARY_EVIDENCE: 100,
  OFFICIAL_GOVERNMENT: 95,
  LEGISLATION_PUBLIC_RECORD: 95,
  ACADEMIC: 85,
  REPUTABLE_JOURNALISM: 75,
  CORPORATE_STATEMENT: 60,
  COMMUNITY_DISCUSSION: 35,
  CREATOR_SOCIAL: 30,
  PERSONAL_COMMENTARY: 20,
  MARKETING_ADVOCACY: 10,
  UNKNOWN: 0,
};

// Discovery utility is deliberately not the same as authority. Social/community material can be
// excellent for finding names, phone numbers, aliases, historical traces and non-indexed activity
// even when it is not strong enough to support a transaction-grade conclusion.
const DISCOVERY: Record<CebosSourceClass, number> = {
  PRIMARY_EVIDENCE: 85,
  OFFICIAL_GOVERNMENT: 70,
  LEGISLATION_PUBLIC_RECORD: 65,
  ACADEMIC: 65,
  REPUTABLE_JOURNALISM: 80,
  CORPORATE_STATEMENT: 75,
  COMMUNITY_DISCUSSION: 80,
  CREATOR_SOCIAL: 85,
  PERSONAL_COMMENTARY: 60,
  MARKETING_ADVOCACY: 45,
  UNKNOWN: 20,
};

export function sourceScores(sourceClass: CebosSourceClass) {
  return { discoveryUtility: DISCOVERY[sourceClass] ?? 20, decisionAuthority: AUTHORITY[sourceClass] ?? 0 };
}

export function classifyRequest(text: string): CebosRequestClass {
  const q = String(text || "").toLowerCase();
  if (/\b(create|generate|design|draw|write|compose|render|make)\b/.test(q) && /\b(image|video|audio|song|poster|graphic|file|document|spreadsheet|presentation|logo|website)\b/.test(q)) return "CREATIVE";
  if (/\b(open|send|submit|apply|book|buy|download|upload|convert|transcribe|translate|edit|fix|deploy|publish|schedule|connect|call|email)\b/.test(q)) return "TASK";
  if (/\b(should i|which is better|compare|worth it|buy|invest|finance|mortgage|decision|recommend|best option|viable|feasible)\b/.test(q)) return "DECISION";
  return "INFORMATION";
}

export function inferCaribbeanRelevance(text: string, locationContext?: string | null) {
  const q = `${text || ""} ${locationContext || ""}`.toLowerCase();
  return /\b(caribbean|trinidad|tobago|tt\b|t&t|caricom|jamaica|barbados|guyana|grenada|st lucia|saint lucia|dominica|antigua|st kitts|saint kitts|bahamas|belize|suriname|haiti|san fernando|chaguanas|port of spain|scarborough)\b/.test(q);
}

export function createReasoningState(input: { request: string; objective?: string | null; decision?: string | null; locationContext?: string | null }): CebosReasoningState {
  const request = String(input.request || "").trim();
  const requestClass = classifyRequest(request);
  return {
    version: CEBOS_VERSION,
    requestClass,
    request,
    objective: String(input.objective || request).trim(),
    decision: input.decision || null,
    locationContext: input.locationContext || null,
    caribbeanRelevant: inferCaribbeanRelevance(request, input.locationContext),
    requiredConditions: [], hypotheses: [], expectedTraces: [], evidence: [], alternatives: [], fixedVariables: [], controllableVariables: [], risks: [], opportunitySignals: [], unknowns: [], nextBottleneck: null,
  };
}

export function addEvidence(state: CebosReasoningState, input: Omit<CebosEvidence, "discoveryUtility" | "decisionAuthority"> & Partial<Pick<CebosEvidence, "discoveryUtility" | "decisionAuthority">>) {
  const scores = sourceScores(input.sourceClass);
  const evidence: CebosEvidence = {
    ...input,
    discoveryUtility: input.discoveryUtility ?? scores.discoveryUtility,
    decisionAuthority: input.decisionAuthority ?? scores.decisionAuthority,
    contradictions: Array.isArray(input.contradictions) ? input.contradictions : [],
  };
  state.evidence.push(evidence);
  return evidence;
}

export function addExpectedTrace(state: CebosReasoningState, hypothesis: string, trace: string, status: CebosTraceStatus = "NOT_YET_SEARCHED") {
  const item: CebosExpectedTrace = { hypothesis, trace, status, evidenceIds: [] };
  state.expectedTraces.push(item);
  return item;
}

export function recordOpportunity(state: CebosReasoningState, signal: CebosOpportunitySignal) {
  // Opportunity scanning is intentionally low-priority: it records without changing the current
  // objective or next bottleneck. The caller decides whether/when to surface it later.
  state.opportunitySignals.push(signal);
  return signal;
}

export function evidenceSummary(state: CebosReasoningState) {
  const counts: Record<string, number> = {};
  for (const item of state.evidence) counts[item.status] = (counts[item.status] || 0) + 1;
  const strongest = [...state.evidence].sort((a, b) => b.decisionAuthority - a.decisionAuthority)[0] || null;
  return { count: state.evidence.length, byStatus: counts, strongestAuthority: strongest?.decisionAuthority ?? 0, strongestSourceClass: strongest?.sourceClass ?? null };
}

export function chooseNextBottleneck(state: CebosReasoningState) {
  const unresolvedTrace = state.expectedTraces.find((t) => t.status === "NOT_YET_SEARCHED" || t.status === "INACCESSIBLE");
  if (unresolvedTrace) return (state.nextBottleneck = `Resolve discriminating trace: ${unresolvedTrace.trace}`);
  if (state.unknowns.length) return (state.nextBottleneck = `Resolve highest-impact unknown: ${state.unknowns[0]}`);
  if (!state.evidence.length && (state.requestClass === "INFORMATION" || state.requestClass === "DECISION")) return (state.nextBottleneck = "Acquire external evidence before making factual or consequential claims.");
  return state.nextBottleneck;
}

export function researchSourcePlan(state: CebosReasoningState) {
  const base: Array<{ class: CebosSourceClass; purpose: "PROVE" | "DISCOVER" | "BOTH"; priority: number }> = [
    { class: "PRIMARY_EVIDENCE", purpose: "PROVE", priority: 100 },
    { class: "OFFICIAL_GOVERNMENT", purpose: "PROVE", priority: 95 },
    { class: "LEGISLATION_PUBLIC_RECORD", purpose: "PROVE", priority: 94 },
    { class: "ACADEMIC", purpose: "PROVE", priority: 80 },
    { class: "REPUTABLE_JOURNALISM", purpose: "BOTH", priority: 78 },
    { class: "CORPORATE_STATEMENT", purpose: "BOTH", priority: 65 },
    { class: "CREATOR_SOCIAL", purpose: "DISCOVER", priority: state.caribbeanRelevant ? 62 : 40 },
    { class: "COMMUNITY_DISCUSSION", purpose: "DISCOVER", priority: state.caribbeanRelevant ? 60 : 38 },
    { class: "PERSONAL_COMMENTARY", purpose: "DISCOVER", priority: 25 },
    { class: "MARKETING_ADVOCACY", purpose: "DISCOVER", priority: 15 },
  ];
  return base.sort((a, b) => b.priority - a.priority);
}

export function providerReasoningDirective(state: CebosReasoningState) {
  const regional = state.caribbeanRelevant
    ? "Use Caribbean-native context and search assumptions: fragmented/non-indexed evidence, island-specific institutions, informal commerce, diaspora, FX/USD/payment constraints, local media/social/directory traces, and country/island differences may be material. Do not infer absence from poor indexing."
    : "Use Caribbean context only if it is relevant to the user's objective; do not force regional framing into unrelated subjects.";
  return [
    "Use CEBOS internally. Reason backward from the desired outcome and eventual decision.",
    "Maintain whole-system awareness but expose only the useful conclusion, evidence boundary, what could change it, and the next action.",
    "Separate discovery utility from decision authority: weak sources may reveal leads; strong sources are required to prove consequential claims.",
    "For hypotheses, ask what traces should exist if true and seek corroboration and contradiction. Preserve uncertainty; never promote an inference to fact.",
    "Translate important facts into consequences for money, risk, time, control, ownership, data, feasibility and optionality when relevant.",
    "For decisions, compare alternatives, search negative evidence, distinguish fixed from controllable variables, and identify the single missing fact most likely to change the decision.",
    "For opportunities, look for controllable friction and bounded-downside/upside asymmetry without derailing the user's current task.",
    regional,
    `Request class: ${state.requestClass}.`,
  ].join(" ");
}
