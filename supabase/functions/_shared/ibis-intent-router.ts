// FTN Platform — canonical server-side intent/outcome classifier.
//
// Every prompt passes through here before any answer is produced. This is deliberately a small,
// inspectable, deterministic classifier -- not a second copy of js/ibis-universal-router.js (that
// module reasons over capability/agent selection for the browser-side multi-agent runtime; this
// one only decides which SERVER-SIDE query route the canonical brain takes: does this need live
// web research, does it describe a desired outcome, or is it an ordinary question). A wrong
// classification here must fail toward MORE scrutiny (research/outcome), never toward silently
// skipping evidence a freshness- or outcome-sensitive question needed.
import type { QueryClass } from "./ibis-response-envelope.ts";

const FRESHNESS_MARKERS = /\b(today|latest|current(?:ly)?|right now|this week|this month|breaking|as of \d{4}|news|price|exchange rate|fx rate|selling rate|indicators?|shortage|election result|score)\b/i;

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

export type IntentClassification = {
  queryClass: QueryClass;
  objective: string | null;
  reasons: string[];
};

export function classifyIntent(text: string): IntentClassification {
  const q = (text || "").trim();
  const reasons: string[] = [];

  if (FRESHNESS_MARKERS.test(q)) {
    reasons.push("matched a freshness marker (e.g. \"today\", \"latest\", \"current\", a live-data term) -- model memory cannot honestly answer this without live retrieval.");
    return { queryClass: "CURRENT_WEB_RESEARCH", objective: null, reasons };
  }
  if (CORRELATION_MARKERS.test(q)) {
    reasons.push("matched a correlation marker (\"correlation\", \"is there a relationship between...\") -- routed to the Correlation engine rather than answered as a plain fact.");
    return { queryClass: "CORRELATION", objective: null, reasons };
  }
  const toolActionMatch = q.match(TOOL_ACTION_MARKERS);
  if (toolActionMatch) {
    reasons.push("matched a tool-connection marker (\"connect my/integrate with/link my/sync my <app>\") -- routed to the Connection Fabric capability-check rather than answered as a plain fact.");
    return { queryClass: "TOOL_ACTION", objective: toolActionMatch[1], reasons };
  }
  if (PATHWAY_MARKERS.test(q)) {
    reasons.push("matched a pathway marker (steps/apply/eligibility/deadline) -- the user needs an ordered plan, not a single fact.");
    return { queryClass: "PATHWAY", objective: extractObjective(q), reasons };
  }
  if (PLACE_MARKERS.test(q)) {
    reasons.push("matched a place marker (near me/nearby/in my area) -- location-relevant, requires consent before use.");
    return { queryClass: "PLACE", objective: extractObjective(q), reasons };
  }
  if (RELATIONSHIP_MARKERS.test(q)) {
    reasons.push("matched a relationship marker (which organizations/who connects) -- an ecosystem-connection question, not a single fact.");
    return { queryClass: "RELATIONSHIP", objective: extractObjective(q), reasons };
  }
  if (OUTCOME_MARKERS.test(q)) {
    reasons.push("matched an outcome marker (\"I want to build/start/launch...\") -- this describes a desired outcome, not a single-fact question.");
    return { queryClass: "FOUNDER_STRATEGY", objective: extractObjective(q), reasons };
  }
  reasons.push("no freshness, pathway, place, relationship or outcome marker matched -- treated as an ordinary question.");
  return { queryClass: "SIMPLE_TEXT", objective: null, reasons };
}

function extractObjective(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 300);
}
