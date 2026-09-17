// FTN Platform — canonical server-side intent/outcome classifier.
//
// Every prompt passes through here before any answer is produced. This is deliberately a small,
// inspectable, deterministic classifier -- not a second copy of js/ibis-universal-router.js (that
// module reasons over capability/agent selection for the browser-side multi-agent runtime; this
// one only decides which SERVER-SIDE query route(s) the canonical brain takes: does this need live
// web research, does it describe a desired outcome, or is it an ordinary question). A wrong
// classification here must fail toward MORE scrutiny (research/outcome), never toward silently
// skipping evidence a freshness- or outcome-sensitive question needed.
//
// Composability correction: a real question can require SEVERAL capabilities at once (e.g. "why
// has X happened, what evidence supports the possible causes" needs research AND a bounded causal
// reconstruction AND a correlation check). `queryClass` remains a single PRIMARY class, computed
// with the exact same priority order as before, for legacy code that only understands one class.
// `signals` exposes every independently-matched marker so ibis-canonical-brain.ts can build an
// ADDITIVE capability plan instead of only acting on whichever single class won the priority race.
import type { QueryClass } from "./ibis-response-envelope.ts";

// "recent(ly)" added (independent live audit, commit 50a849e+): "What are the most recent business
// developments in Tobago?" matched none of these markers and fell through to SIMPLE_TEXT, so a
// question that plainly wants current information never reached search grounding at all. Confirmed
// no existing test asserts a query containing "recent" classifies as anything other than
// CURRENT_WEB_RESEARCH -- it does not overlap RETRODICTION_MARKERS (which requires a "why.../what
// caused..." framing, not the bare word "recent").
const FRESHNESS_MARKERS = /\b(today|latest|recent(?:ly)?|current(?:ly)?|right now|this week|this month|breaking|as of \d{4}|news|price|exchange rate|fx rate|selling rate|indicators?|shortage|election result|score)\b/i;

const OUTCOME_MARKERS = /\b(i want to (build|start|launch|create|design|grow)|help me (build|start|launch|create|design)|how do i (build|start|launch|create)|i(?:'m| am) trying to (build|start|launch|create|earn)|i need to (build|achieve|design|change|accomplish))\b/i;

const PATHWAY_MARKERS = /\b(steps? to|how do i apply|apply for|eligibility|documents? (?:needed|required)|deadline)\b/i;

const PLACE_MARKERS = /\b(near me|nearby|in my area|close to me|around (?:here|me))\b/i;

const RELATIONSHIP_MARKERS = /\b(which organi[sz]ations|who connects|relationship between|how (?:is|are) .* connected)\b/i;

// Added alongside wiring the real (ported) Correlation Engine into the canonical brain -- this
// marker was previously absent, meaning "CORRELATION" was a defined QueryClass enum value with no
// classifier path that could ever reach it (confirmed dead code before this addition). Checked
// AFTER freshness so a correlation question that also needs live data (e.g. "is there a
// correlation between remittances and the exchange rate") still correctly routes to
// CURRENT_WEB_RESEARCH first -- current evidence takes priority over historical-analysis framing.
const CORRELATION_MARKERS = /\b(correlat(?:e|es|ed|ion|ing)|is there a (?:relationship|link) between)\b/i;

// Added alongside wiring the ported (pure, no server-side gateway registered yet) Connection
// Fabric into the canonical brain -- TOOL_ACTION was previously a defined QueryClass enum value
// with no classifier path that could ever reach it (same dead-code situation CORRELATION was in
// before it was wired). Captures the named app/provider so the caller can be told honestly whether
// a real connection route exists, rather than answering a connect-my-X request as plain text.
const TOOL_ACTION_MARKERS = /\b(?:connect|integrate|link|sync)\s+(?:my|with|to)?\s*([a-z][\w.-]{1,40})/i;

// Added alongside wiring the ported Evidence-Bounded Retrodiction engine (ibis-ebr-engine.ts; see
// GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md) into the canonical brain -- RETRODICTION was previously a
// defined QueryClass enum value with no classifier path that could ever reach it (same dead-code
// situation CORRELATION/TOOL_ACTION were in before they were wired). Matches a question asking WHY
// something happened / what caused it / what an actor knew at a past decision time, as distinct
// from an ordinary factual question -- these need the K_att/K_rec/R evidence separation, not a
// single fact. Broadened beyond "why did" to also catch "why has/does/is/are/was/were" phrasing
// (e.g. "why has Trinidad and Tobago experienced forex shortages") -- still checked AFTER
// freshness/correlation/tool-action for PRIMARY classification purposes so a retrodiction question
// that also needs live current data still gets CURRENT_WEB_RESEARCH as its primary class, but the
// RETRODICTION signal itself is independent and additive (see IntentSignals below).
const RETRODICTION_MARKERS = /\b(why (?:has|have|did|does|do|is|are|was|were)\b|what (?:really )?caused|what led to|in hindsight|looking back(?:,| at)|reconstruct (?:what|why|how)|given what we (?:now |later )?know|what did .+ know at the time|knowing what we know now)\b/i;

// New this checkpoint: detects a request explicitly asking for EVIDENCE behind a cause, distinct
// from a bare "why" question. This independently signals that (a) grounded sources should be
// attempted even when no freshness marker matched, and (b) a correlation check is a reasonable
// complementary capability for evidence-based cause analysis, even without the literal word
// "correlation" -- assessing whether patterns/associations exist among the available evidence is a
// natural preparatory step before treating anything as a supported cause.
const CAUSE_EVIDENCE_MARKERS = /\b(evidence (?:supports?|for|shows?)|possible causes?|root cause|contributing factors?|what evidence)\b/i;

// EcoMap signals (this checkpoint -- see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md). Deliberately
// SEPARATE, broader regexes from the legacy PATHWAY_MARKERS/PLACE_MARKERS/RELATIONSHIP_MARKERS
// above: those three drive PRIMARY classification and must keep their exact prior matching
// behavior for backward compatibility (an existing test may depend on which single class a given
// text resolves to). These new markers are used ONLY for additive capability planning in
// ibis-canonical-brain.ts and never touch `queryClass` -- so broadening them here is safe and
// carries zero risk of changing any existing classification result.
const ECOMAP_PLACE_SIGNAL_MARKERS = /\b(map (?:the )?(?:services|organizations?)|which services|find services|organizations? that could help|where (?:is|are|can i find)|nearest|near me|nearby|in my area|close to me|around (?:here|me))\b/i;
const ECOMAP_PATHWAY_SIGNAL_MARKERS = /\b(steps? (?:and|to|needed|required|involved)|requirements? (?:i need|needed|to follow|to register)|how do i (?:apply|register|start)|register (?:a|my)|what (?:steps|documents) (?:are|is) required|eligibility|documents? (?:needed|required)|deadline)\b/i;
// Broadened to a bare "relationship(s)" (in addition to the more specific referral/funding
// phrasings) -- additive capability planning only, never primary classification, so erring toward
// MORE scrutiny here just plans a capability that honestly reports SKIPPED_MISSING_INPUT when it
// turns out not to be relevant, never a false claim of execution.
const ECOMAP_RELATIONSHIP_SIGNAL_MARKERS = /\b(relationships?|referrals?|which organi[sz]ations (?:fund|refer|support|help)|who (?:connects|refers|funds)|fund or refer)\b/i;

export type IntentSignals = {
  freshness: boolean;
  causeEvidence: boolean;
  retrodiction: boolean;
  correlation: boolean;
  toolAction: string | null;
  pathway: boolean;
  place: boolean;
  relationship: boolean;
  outcome: boolean;
  ecomapPlace: boolean;
  ecomapPathway: boolean;
  ecomapRelationship: boolean;
};

export type IntentClassification = {
  queryClass: QueryClass;
  objective: string | null;
  reasons: string[];
  signals: IntentSignals;
};

export function classifyIntent(text: string): IntentClassification {
  const q = (text || "").trim();
  const toolActionMatch = q.match(TOOL_ACTION_MARKERS);
  const signals: IntentSignals = {
    freshness: FRESHNESS_MARKERS.test(q),
    causeEvidence: CAUSE_EVIDENCE_MARKERS.test(q),
    retrodiction: RETRODICTION_MARKERS.test(q),
    correlation: CORRELATION_MARKERS.test(q),
    toolAction: toolActionMatch ? toolActionMatch[1] : null,
    pathway: PATHWAY_MARKERS.test(q),
    place: PLACE_MARKERS.test(q),
    relationship: RELATIONSHIP_MARKERS.test(q),
    outcome: OUTCOME_MARKERS.test(q),
    ecomapPlace: ECOMAP_PLACE_SIGNAL_MARKERS.test(q),
    ecomapPathway: ECOMAP_PATHWAY_SIGNAL_MARKERS.test(q),
    ecomapRelationship: ECOMAP_RELATIONSHIP_SIGNAL_MARKERS.test(q),
  };
  const reasons: string[] = [];

  // PRIMARY classification: identical priority order to every prior checkpoint, so existing
  // callers that only read `queryClass` see no behavior change whatsoever.
  if (signals.freshness) {
    reasons.push("matched a freshness marker (e.g. \"today\", \"latest\", \"current\", a live-data term) -- model memory cannot honestly answer this without live retrieval.");
    return { queryClass: "CURRENT_WEB_RESEARCH", objective: null, reasons, signals };
  }
  if (signals.correlation) {
    reasons.push("matched a correlation marker (\"correlation\", \"is there a relationship between...\") -- routed to the Correlation engine rather than answered as a plain fact.");
    return { queryClass: "CORRELATION", objective: null, reasons, signals };
  }
  if (signals.toolAction) {
    reasons.push("matched a tool-connection marker (\"connect my/integrate with/link my/sync my <app>\") -- routed to the Connection Fabric capability-check rather than answered as a plain fact.");
    return { queryClass: "TOOL_ACTION", objective: signals.toolAction, reasons, signals };
  }
  if (signals.retrodiction) {
    reasons.push("matched a retrodiction marker (\"why did/has/does ... \", \"what caused\", \"in hindsight\", \"what did ... know at the time\") -- this asks for a causal-history reconstruction bounded by what was actually known when, not a single fact.");
    return { queryClass: "RETRODICTION", objective: extractObjective(q), reasons, signals };
  }
  if (signals.pathway) {
    reasons.push("matched a pathway marker (steps/apply/eligibility/deadline) -- the user needs an ordered plan, not a single fact.");
    return { queryClass: "PATHWAY", objective: extractObjective(q), reasons, signals };
  }
  if (signals.place) {
    reasons.push("matched a place marker (near me/nearby/in my area) -- location-relevant, requires consent before use.");
    return { queryClass: "PLACE", objective: extractObjective(q), reasons, signals };
  }
  if (signals.relationship) {
    reasons.push("matched a relationship marker (which organizations/who connects) -- an ecosystem-connection question, not a single fact.");
    return { queryClass: "RELATIONSHIP", objective: extractObjective(q), reasons, signals };
  }
  if (signals.outcome) {
    reasons.push("matched an outcome marker (\"I want to build/start/launch...\") -- this describes a desired outcome, not a single-fact question.");
    return { queryClass: "FOUNDER_STRATEGY", objective: extractObjective(q), reasons, signals };
  }
  reasons.push("no freshness, pathway, place, relationship or outcome marker matched -- treated as an ordinary question.");
  return { queryClass: "SIMPLE_TEXT", objective: null, reasons, signals };
}

function extractObjective(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 300);
}
