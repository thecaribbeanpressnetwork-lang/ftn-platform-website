// FTN / IBIS Canonical Architecture -- Phase 5, Items I/J/N: provider-neutral model task classes and
// the ibis Reasoning Budget.
//
// Audit performed before writing this file: no task-class or reasoning-budget concept exists
// anywhere in this codebase today (confirmed by the Phase 5 provider/routing audit) -- model/
// provider ROUTING is currently a single fixed array order iterated linearly by runGateway()
// (ibis-intelligence-gateway.ts), with no per-request notion of task difficulty at all. This module
// adds the classification ONLY; it does not itself call a provider or rewrite runGateway()'s core
// loop. Item W ("production safety") explicitly forbids changing existing credentials, deleting
// providers, or changing provider health semantics without tests -- so this phase's real, bounded
// consumption of this classification is limited to ONE safe, disclosed decision (see
// ibis-assistant/index.ts's `providersForBudget()`: for DEEP/MAXIMUM budgets, Anthropic -- already a
// proven, configured provider in this stack -- is tried before the free Cloudflare allocation,
// consistent with Item O's "complex/high-consequence synthesis -> Claude where justified"; every
// other budget level keeps the EXACT existing provider order, so an ordinary query's routing is
// byte-for-byte unchanged). The assessment itself is computed and attached to the receipt for
// observability regardless, so its accuracy can be reviewed against real traffic before any future
// phase widens how much it actually controls -- the same "shadow-first, activate narrowly" pattern
// RequestFrame/EvidenceContract/EvidencePacket each followed in Phases 1/3/4.

import type { QueryClass } from "./ibis-response-envelope.ts";

export type ModelTaskClass = "MODEL_TEXT_STANDARD" | "MODEL_TEXT_REASONING" | "MODEL_TOOL_REASONING" | "MODEL_VISION";

// 0 = deterministic/no LLM reasoning ... 5 = maximum/consequential (exact scale from the Phase 5
// directive, Item J).
export type ReasoningBudgetLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ReasoningBudgetAssessment = {
  level: ReasoningBudgetLevel;
  taskClass: ModelTaskClass;
  rationale: string;
};

export type AssessReasoningBudgetInput = {
  queryClass: QueryClass;
  isDeterministicAnswer: boolean;
  requiresExternalAction: boolean;
  founderConsequential: boolean; // see isFounderConsequential() in ibis-intent-router.ts
  freshnessRequired: boolean;
  capabilityCount: number; // capabilityPlan.length -- a rough, honest proxy for cross-domain breadth
};

// A pure, deterministic classification -- no model call, no heuristic requiring an LLM to judge
// itself. Every branch is derived from state ibis-canonical-brain.ts already computes (queryClass,
// requestFrame fields, capabilityPlan length) -- never a new, separate judgment call.
export function assessReasoningBudget(input: AssessReasoningBudgetInput): ReasoningBudgetAssessment {
  if (input.isDeterministicAnswer) {
    return { level: 0, taskClass: "MODEL_TEXT_STANDARD", rationale: "A deterministic engine (arithmetic/greeting/product-lookup) answers this; no LLM reasoning is involved at all." };
  }
  if (input.requiresExternalAction && (input.founderConsequential || input.capabilityCount >= 2)) {
    return { level: 5, taskClass: "MODEL_TOOL_REASONING", rationale: "An external-action request combined with consequential/cross-domain breadth -- the highest-stakes class this scale defines." };
  }
  if (input.queryClass === "TOOL_ACTION") {
    return { level: 3, taskClass: "MODEL_TOOL_REASONING", rationale: "A tool-connection request needs model-directed structured tool use, but carries no additional consequential/cross-domain signal on its own." };
  }
  if (input.founderConsequential) {
    return { level: 4, taskClass: "MODEL_TEXT_REASONING", rationale: "Founder strategy / FTN architecture / investment / ownership / monetization / prioritization / vendor-dependency territory -- deep reasoning is warranted." };
  }
  if (input.capabilityCount >= 2) {
    return { level: 3, taskClass: "MODEL_TEXT_REASONING", rationale: `${input.capabilityCount} capabilities were planned for this request -- genuine cross-domain synthesis, not a single-fact lookup.` };
  }
  if (input.queryClass === "CORRELATION" || input.queryClass === "PREDICTION" || input.queryClass === "CAUSAL_BUTTERFLY" || input.queryClass === "RETRODICTION" || input.queryClass === "PATHWAY" || input.queryClass === "RELATIONSHIP") {
    return { level: 3, taskClass: "MODEL_TEXT_REASONING", rationale: `${input.queryClass} requires comparison/analysis beyond a single grounded fact.` };
  }
  if (input.freshnessRequired || input.queryClass === "CURRENT_WEB_RESEARCH" || input.queryClass === "FTN_RESOURCE" || input.queryClass === "PLACE") {
    return { level: 2, taskClass: "MODEL_TEXT_STANDARD", rationale: "Grounded synthesis over retrieved evidence -- a standard, economical route is sufficient." };
  }
  return { level: 1, taskClass: "MODEL_TEXT_STANDARD", rationale: "An ordinary factual/explanatory question with no freshness, cross-domain, tool-action, or founder-consequential signal." };
}

// Item N: bounded, disclosed provider-side translation. DeepSeek's documented `reasoning_effort`
// parameter is confirmed (official API docs, fetched 2026-09-18) to exist and to accept at least
// "high" (shown in the docs' own example); the low/medium/high three-tier convention below mirrors
// the same reasoning-effort shape already common to OpenAI-compatible reasoning APIs, but was NOT
// exhaustively confirmed value-by-value against DeepSeek's docs -- a disclosed limitation, not an
// invented one. Budget 0/1 omit the parameter entirely (no reasoning-effort call needed for a
// trivial/no-LLM request); an incorrect value here can only ever make ONE optional, already-
// UNCONFIGURED-safe provider (see ibis-deepseek-provider.ts) fail over to the next provider in the
// existing fallback chain -- it cannot affect any other provider or degrade existing routes.
export function reasoningBudgetToDeepSeekEffort(level: ReasoningBudgetLevel): "low" | "medium" | "high" | null {
  if (level <= 1) return null;
  if (level === 2) return "low";
  if (level === 3) return "medium";
  return "high"; // 4-5
}
