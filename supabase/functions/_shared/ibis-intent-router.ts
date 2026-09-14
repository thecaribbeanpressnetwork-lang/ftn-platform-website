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
