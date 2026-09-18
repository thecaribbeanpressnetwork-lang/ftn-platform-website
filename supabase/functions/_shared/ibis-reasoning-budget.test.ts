import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assessReasoningBudget, reasoningBudgetToDeepSeekEffort } from "./ibis-reasoning-budget.ts";

console.log("ibis-reasoning-budget.test.ts: the provider-neutral 0-5 Reasoning Budget scale and MODEL_TEXT_STANDARD/MODEL_TEXT_REASONING/MODEL_TOOL_REASONING task-class assignment are deterministic and match the Phase 5 directive's own worked examples (2+2 -> 0, founder strategy -> 4, major cross-domain/external-action decision -> 5).");

const BASE = { queryClass: "SIMPLE_TEXT" as const, isDeterministicAnswer: false, requiresExternalAction: false, founderConsequential: false, freshnessRequired: false, capabilityCount: 0 };

Deno.test("a deterministic calculation (2 + 2) is budget 0, MODEL_TEXT_STANDARD, no LLM involved", () => {
  const r = assessReasoningBudget({ ...BASE, isDeterministicAnswer: true });
  assertEquals(r.level, 0);
  assertEquals(r.taskClass, "MODEL_TEXT_STANDARD");
});

Deno.test("an ordinary factual question with no signal is budget 1 (minimal)", () => {
  const r = assessReasoningBudget(BASE);
  assertEquals(r.level, 1);
});

Deno.test("a freshness-required / CURRENT_WEB_RESEARCH question is budget 2 (standard, grounded synthesis)", () => {
  const r = assessReasoningBudget({ ...BASE, queryClass: "CURRENT_WEB_RESEARCH", freshnessRequired: true });
  assertEquals(r.level, 2);
  assertEquals(r.taskClass, "MODEL_TEXT_STANDARD");
});

Deno.test("a CORRELATION/comparison question is budget 3 (analytical), MODEL_TEXT_REASONING", () => {
  const r = assessReasoningBudget({ ...BASE, queryClass: "CORRELATION" });
  assertEquals(r.level, 3);
  assertEquals(r.taskClass, "MODEL_TEXT_REASONING");
});

Deno.test("two or more planned capabilities alone reach budget 3, even for an otherwise-plain queryClass", () => {
  const r = assessReasoningBudget({ ...BASE, capabilityCount: 2 });
  assertEquals(r.level, 3);
});

Deno.test("a founder-consequential request is budget 4 (deep), MODEL_TEXT_REASONING", () => {
  const r = assessReasoningBudget({ ...BASE, queryClass: "FOUNDER_STRATEGY", founderConsequential: true });
  assertEquals(r.level, 4);
  assertEquals(r.taskClass, "MODEL_TEXT_REASONING");
});

Deno.test("a plain TOOL_ACTION request (no consequential/cross-domain signal) is budget 3, MODEL_TOOL_REASONING", () => {
  const r = assessReasoningBudget({ ...BASE, queryClass: "TOOL_ACTION", requiresExternalAction: true });
  assertEquals(r.level, 3);
  assertEquals(r.taskClass, "MODEL_TOOL_REASONING");
});

Deno.test("an external action combined with founder-consequential breadth reaches budget 5 (maximum), MODEL_TOOL_REASONING", () => {
  const r = assessReasoningBudget({ ...BASE, queryClass: "TOOL_ACTION", requiresExternalAction: true, founderConsequential: true });
  assertEquals(r.level, 5);
  assertEquals(r.taskClass, "MODEL_TOOL_REASONING");
});

Deno.test("an external action combined with 2+ planned capabilities also reaches budget 5", () => {
  const r = assessReasoningBudget({ ...BASE, requiresExternalAction: true, capabilityCount: 3 });
  assertEquals(r.level, 5);
});

Deno.test("deterministic short-circuit wins even if founderConsequential/requiresExternalAction are also true (0 is always checked first)", () => {
  const r = assessReasoningBudget({ ...BASE, isDeterministicAnswer: true, founderConsequential: true, requiresExternalAction: true });
  assertEquals(r.level, 0);
});

Deno.test("DeepSeek reasoning_effort translation: budgets 0-1 omit the parameter entirely", () => {
  assertEquals(reasoningBudgetToDeepSeekEffort(0), null);
  assertEquals(reasoningBudgetToDeepSeekEffort(1), null);
});

Deno.test("DeepSeek reasoning_effort translation: 2 -> low, 3 -> medium, 4/5 -> high", () => {
  assertEquals(reasoningBudgetToDeepSeekEffort(2), "low");
  assertEquals(reasoningBudgetToDeepSeekEffort(3), "medium");
  assertEquals(reasoningBudgetToDeepSeekEffort(4), "high");
  assertEquals(reasoningBudgetToDeepSeekEffort(5), "high");
});
