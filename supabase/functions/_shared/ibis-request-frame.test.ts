// FTN / IBIS Canonical Architecture, Phase 1 -- unit tests for RequestFrame construction.
// Deliberately plain Deno.test (no network, no fetch): classifyTemporalRequirement()/
// buildRequestFrame() are pure functions over already-computed classification state, same pattern as
// ibis-search-query-normalizer.test.ts and ibis-search-quality-gate.test.ts.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { buildRequestFrame, classifyTemporalRequirement } from "./ibis-request-frame.ts";

function frameFor(text: string, isDeterministicAnswer = false) {
  const intent = classifyIntent(text);
  return buildRequestFrame({ requestId: "test-request", text, intent, isDeterministicAnswer });
}

Deno.test("TIMELESS: an ordinary factual question needs no fresh evidence", () => {
  const frame = frameFor("What is the capital of Barbados?");
  assertEquals(frame.temporalRequirement.type, "TIMELESS");
  assertEquals(frame.requiresFreshEvidence, false);
});

Deno.test("TODAY: an explicit 'today' question is classified TODAY, not just generically current", () => {
  const frame = frameFor("What is happening in Trinidad and Tobago today?");
  assertEquals(frame.temporalRequirement.type, "TODAY");
  assertEquals(frame.temporalRequirement.strictness, "HIGH");
  assertEquals(frame.requiresFreshEvidence, true);
});

Deno.test("THIS_WEEK: preserves the exact relative expression that fired", () => {
  const frame = frameFor("What changed in Trinidad and Tobago this week?");
  assertEquals(frame.temporalRequirement.type, "THIS_WEEK");
  assertEquals(frame.temporalRequirement.relativeExpression, "this week");
  assertEquals(frame.requiresFreshEvidence, true);
});

Deno.test("LATEST_AVAILABLE: distinct from TODAY -- 'most recently published' is not 'must be from today'", () => {
  const frame = frameFor("What are the latest available unemployment figures for Trinidad and Tobago?");
  assertEquals(frame.temporalRequirement.type, "LATEST_AVAILABLE");
  assert(frame.temporalRequirement.type !== "TODAY", "LATEST_AVAILABLE must never collapse into TODAY");
  assertEquals(frame.temporalRequirement.strictness, "MEDIUM");
});

Deno.test("HISTORICAL: an explicit past year with no freshness marker needs no fresh evidence", () => {
  const frame = frameFor("What happened in Trinidad in 1990?");
  assertEquals(frame.temporalRequirement.type, "HISTORICAL");
  assertEquals(frame.temporalRequirement.strictness, "NONE");
  assertEquals(frame.requiresFreshEvidence, false);
});

Deno.test("DATE_RANGE: an explicit bounded range is preserved, not discarded", () => {
  const frame = frameFor("What happened in Trinidad and Tobago between January 2026 and March 2026?");
  assertEquals(frame.temporalRequirement.type, "DATE_RANGE");
  assert(frame.temporalRequirement.start?.includes("January"), "start must preserve the real matched text");
  assert(frame.temporalRequirement.end?.includes("March"), "end must preserve the real matched text");
});

Deno.test("DATE_RANGE pattern does not false-positive on an unrelated 'relationship between X and Y' question", () => {
  const frame = frameFor("What is the relationship between the ministry and the agency?");
  assert(frame.temporalRequirement.type !== "DATE_RANGE", "a relationship question with no date/month/year token must never be mistaken for a date range");
});

Deno.test("AS_OF: preserves the as-of expression", () => {
  const frame = frameFor("What was the exchange rate as of September 2026?");
  assertEquals(frame.temporalRequirement.type, "AS_OF");
  assert(frame.temporalRequirement.asOf?.includes("September"), "asOf must preserve the real matched text");
});

Deno.test("No invented geography: a query with no place reference gets null geography, never an inferred Caribbean default", () => {
  const frame = frameFor("What is the capital of Barbados?");
  assertEquals(frame.geography, null);
  const frameWithRegion = frameFor("What changed in Trinidad and Tobago this week?");
  assertEquals(frameWithRegion.geography, null, "Phase 1 has no geography resolver at all -- even an explicit region mention must not be inferred/populated yet, since no real resolver exists to justify populating it");
});

Deno.test("No invented entities: entities is always empty in Phase 1 -- no entity resolver exists yet", () => {
  const frame = frameFor("What changed in Trinidad and Tobago this week?");
  assertEquals(frame.entities, []);
});

Deno.test("consequenceLevel is honestly UNRESOLVED, never a guessed default", () => {
  const frame = frameFor("I want to start a business in Trinidad.");
  assertEquals(frame.consequenceLevel, "UNRESOLVED");
});

Deno.test("requiresFreshEvidence exactly mirrors the existing production freshnessRequired computation", () => {
  for (const text of [
    "What is the capital of Barbados?",
    "What changed in Trinidad and Tobago this week?",
    "What happened in Trinidad in 1990?",
    "I want to start a business in Trinidad.",
  ]) {
    const intent = classifyIntent(text);
    const frame = frameFor(text);
    assertEquals(frame.requiresFreshEvidence, intent.queryClass === "CURRENT_WEB_RESEARCH", `mismatch for: ${text}`);
  }
});

Deno.test("requiresExternalAction is true only for TOOL_ACTION-classified requests", () => {
  const toolFrame = frameFor("Connect my Gmail account.");
  assertEquals(toolFrame.requiresExternalAction, true);
  const ordinaryFrame = frameFor("What is the capital of Barbados?");
  assertEquals(ordinaryFrame.requiresExternalAction, false);
});

Deno.test("requiresDeterministicEngine reflects the caller-supplied deterministic-answer check, not a second computation", () => {
  const frameTrue = frameFor("2 + 2", true);
  assertEquals(frameTrue.requiresDeterministicEngine, true);
  const frameFalse = frameFor("What is the capital of Barbados?", false);
  assertEquals(frameFalse.requiresDeterministicEngine, false);
});

Deno.test("outputType: TOOL_ACTION maps to ACTION_RESULT, everything else defaults to TEXT", () => {
  assertEquals(frameFor("Connect my Gmail account.").outputType, "ACTION_RESULT");
  assertEquals(frameFor("What is the capital of Barbados?").outputType, "TEXT");
});

Deno.test("RequestFrame construction never modifies the raw query text or invents an objective", () => {
  const text = "What is the capital of Barbados?";
  const frame = frameFor(text);
  assertEquals(frame.rawQuery, text);
  assertEquals(frame.intent, null, "an ordinary SIMPLE_TEXT question has no classifier-extracted objective -- must stay null, never a fabricated one");
});

Deno.test("classifyTemporalRequirement: bare mention of the CURRENT year alone is not treated as HISTORICAL", () => {
  const now = new Date();
  const result = classifyTemporalRequirement(`What is planned for ${now.getFullYear()}?`, false);
  assert(result.type !== "HISTORICAL", "the current year is not history");
});

console.log("ibis-request-frame.test.ts: RequestFrame construction is additive, non-fabricating, and requiresFreshEvidence exactly mirrors production's existing freshnessRequired computation.");
