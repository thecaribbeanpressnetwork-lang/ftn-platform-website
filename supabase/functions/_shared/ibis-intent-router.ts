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

// "what could go wrong if/with ..." / "what are the risks of ..." added (semantic-robustness pass,
// independent audit, live-confirmed gap: "What could go wrong if FTN depends too heavily on free AI
// providers?" matched nothing and never planned Founder Thinking/Butterfly/Red Team at all). A risk
// question is the same kind of strategic-judgment question FOUNDER_STRATEGY already exists for --
// this is a genuine paraphrase, not a new capability.
// "highest-leverage way to", "what should ... do next" and "compare ... strategies" added (FTN
// Quality Pass, 2026-09-18 Wave 3 calibration): three genuinely strategic-judgment questions from
// the Wave 1 benchmark ("I have TT$10,000, what is the highest-leverage way to test a business?",
// "what should a solo founder do next?", "compare three strategies for launching X") each matched
// nothing here and reached FOUNDER_STRATEGY's reasoning engines zero times -- the exact "failing
// to fire where useful" gap Wave 3 asks to find, for a query shape indistinguishable in kind from
// the "what could go wrong" paraphrase already recognized just above.
const OUTCOME_MARKERS = /\b(i want to (build|start|launch|create|design|grow)|help me (build|start|launch|create|design)|how do i (build|start|launch|create)|i(?:'m| am) trying to (build|start|launch|create|earn)|i need to (build|achieve|design|change|accomplish)|what could go wrong (?:if|with)|what might go wrong|what are the risks (?:of|with)|(?:highest|most)[- ]leverage way to|what should .{0,40} do next|compare .{0,40} strateg(?:y|ies)|compare .{0,40} (?:options|approaches))\b/i;

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
// Semantic-robustness pass (independent audit): "how did this happen"/"how did X come about" is a
// genuine paraphrase of "why did this happen" -- same evidence-bounded-retrodiction need, just a
// "how" framing instead of "why". Added as its own alternative rather than folded into the
// existing "why ..." branch so neither pattern's specificity is loosened.
const RETRODICTION_MARKERS = /\b(why (?:has|have|did|does|do|is|are|was|were)\b|how (?:did|has|have) .{0,60}(?:happen|come about|occur)|what (?:really )?caused|what led to|in hindsight|looking back(?:,| at)|reconstruct (?:what|why|how)|given what we (?:now |later )?know|what did .+ know at the time|knowing what we know now)\b/i;

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
// "how do i get from Trinidad's public registry to a business licence" / "how do i get to X" is a
// genuine A-to-B pathway paraphrase, distinct from the existing "how do i apply/register/start"
// phrasings -- added as its own alternative (additive capability planning only, same discipline as
// the rest of this signal's broadening history below).
// "funding/financing/grant pathway(s)", "route/steps to funding/support", "support pathway" added
// (independent audit, live-confirmed gap: "Map the organizations, funding pathways and
// relationships that could help a Trinidad and Tobago community technology project" did not plan
// ECOMAP_PATHWAY at all -- the word "pathway" itself was not a trigger). Additive capability
// planning only, same discipline as the rest of this signal's broadening history: an honest
// SKIPPED_MISSING_INPUT when it turns out not to be relevant, never a fabricated execution.
const ECOMAP_PATHWAY_SIGNAL_MARKERS = /\b(steps? (?:and|to|needed|required|involved)|requirements? (?:i need|needed|to follow|to register)|how do i (?:apply|register|start|get (?:from|to))|register (?:a|my)|what (?:steps|documents) (?:are|is) required|eligibility|documents? (?:needed|required)|deadline|(?:funding|financing|grant|support) pathways?|route to (?:funding|support)|steps to (?:funding|support))\b/i;
// Broadened to a bare "relationship(s)" (in addition to the more specific referral/funding
// phrasings) -- additive capability planning only, never primary classification, so erring toward
// MORE scrutiny here just plans a capability that honestly reports SKIPPED_MISSING_INPUT when it
// turns out not to be relevant, never a false claim of execution. "who can help" added (semantic-
// robustness pass, independent audit) as a plain-language paraphrase of "who connects/refers".
// "who influences" added (FTN Quality Pass, 2026-09-18 Wave 1 benchmark): "Who influences the
// Caribbean civic-tech funding ecosystem?" -- the mission's own example ECOMAP phrasing -- planned
// zero ECOMAP modes at all before this, the exact "failing to fire where useful" gap Wave 3 asks
// to find. Same additive-only safety as every other broadening here.
const ECOMAP_RELATIONSHIP_SIGNAL_MARKERS = /\b(relationships?|referrals?|which organi[sz]ations (?:fund|refer|support|help)|who (?:connects|refers|funds|can help|influences)|fund or refer)\b/i;

// Semantic-robustness pass (independent audit): a direct ask for second-order/downstream/ripple
// effects should plan BUTTERFLY even without an accompanying "I want to build/start/launch..."
// outcome marker -- e.g. "What are the second-order effects of this decision?" alone. Additive
// capability planning only (see planCapabilities() in ibis-canonical-brain.ts): Butterfly's own
// adapter already honestly reports SKIPPED when no real structured effect data can be derived, so
// broadening what SELECTS it only ever risks an honest skip, never a fabricated result.
const SECOND_ORDER_EFFECT_MARKERS = /\b(second-order effects?|downstream effects?|unintended consequences?|knock-on effects?|ripple effects?)\b/i;

// A direct ask about durability/proven-vs-fragile mechanisms (the Lindy lens -- see
// ibis-founder-lenses.ts's computeLindy()). Activates Founder Thinking directly (see
// planCapabilities() in ibis-canonical-brain.ts) so Lindy has real context to work from, even when
// no accompanying outcome/build marker is present -- e.g. "Which parts of this plan are proven and
// durable, and which are fragile dependencies?" alone.
const DURABILITY_MARKERS = /\b(proven and durable|durable (?:vs\.?|versus) fragile|fragile dependenc(?:y|ies)|battle-tested|time-tested|lindy effect|which parts? (?:of this|are) .{0,40}(?:proven|durable|fragile))\b/i;

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
  secondOrderEffects: boolean;
  durability: boolean;
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
    secondOrderEffects: SECOND_ORDER_EFFECT_MARKERS.test(q),
    durability: DURABILITY_MARKERS.test(q),
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
