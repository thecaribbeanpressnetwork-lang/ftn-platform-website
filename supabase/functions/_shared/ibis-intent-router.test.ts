import { assert, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyIntent, isFounderConsequential } from "./ibis-intent-router.ts";

console.log("ibis-intent-router.test.ts: isFounderConsequential() (Phase 5, Item G) -- the one place 'should the Founder Cognitive Layer be included' is decided, reused identically by ibis-assistant/index.ts's system-prompt construction.");

Deno.test("FCL off: an ordinary factual question", () => {
  assertFalse(isFounderConsequential(classifyIntent("What is the capital of Barbados?")));
});

Deno.test("FCL off: a current-news lookup", () => {
  assertFalse(isFounderConsequential(classifyIntent("What is the latest exchange rate today?")));
});

Deno.test("FCL off: a calculation", () => {
  assertFalse(isFounderConsequential(classifyIntent("What is 12 * 7?")));
});

Deno.test("FCL off: a simple government-facts question", () => {
  assertFalse(isFounderConsequential(classifyIntent("How do I register a business in Trinidad?")));
});

Deno.test("FCL on: an explicit founder-strategy outcome question (queryClass FOUNDER_STRATEGY)", () => {
  const intent = classifyIntent("I want to build a fintech product for the Caribbean market.");
  assert(intent.queryClass === "FOUNDER_STRATEGY");
  assert(isFounderConsequential(intent));
});

Deno.test("FCL on: a consequential business-judgment question that does NOT phrase itself as an outcome/build request", () => {
  assert(isFounderConsequential(classifyIntent("Should FTN acquire this vendor or build the capability in-house?")));
});

Deno.test("FCL on: an FTN architecture / vendor-dependency question", () => {
  assert(isFounderConsequential(classifyIntent("What is our vendor lock-in risk if we depend on this provider for FTN architecture?")));
});

Deno.test("FCL on: a monetization / revenue-model question", () => {
  assert(isFounderConsequential(classifyIntent("What revenue model should we use to monetize this product?")));
});

Deno.test("FCL off: a plain 'what could go wrong' risk question still classifies FOUNDER_STRATEGY via the existing OUTCOME_MARKERS -- confirms the two signals are independent, not required to both fire", () => {
  const intent = classifyIntent("What could go wrong if FTN depends too heavily on free AI providers?");
  assert(intent.queryClass === "FOUNDER_STRATEGY");
  assert(isFounderConsequential(intent)); // queryClass alone is sufficient
});
