// FTN / IBIS Canonical Architecture, Phase 1 + Phase 2 -- unit tests for RequestFrame construction.
// Deliberately plain Deno.test (no network, no fetch): buildRequestFrame() is a pure function over
// already-computed classification state, same pattern as ibis-search-query-normalizer.test.ts and
// ibis-search-quality-gate.test.ts. Detailed temporal-resolution tests (period semantics, timezone
// handling, ISO bound resolution) live in ibis-temporal-resolver.test.ts, the resolver's own test
// file -- this file only proves buildRequestFrame() wires that resolver in correctly.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { buildRequestFrame } from "./ibis-request-frame.ts";

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

Deno.test("DATE_RANGE: an explicit bounded range is resolved to real ISO bounds, and the original wording is preserved separately", () => {
  const frame = frameFor("What happened in Trinidad and Tobago between January 2026 and March 2026?");
  assertEquals(frame.temporalRequirement.type, "DATE_RANGE");
  assertEquals(frame.temporalRequirement.start, "2026-01-01T00:00:00.000Z");
  assertEquals(frame.temporalRequirement.end, "2026-03-31T00:00:00.000Z");
  assert(frame.temporalRequirement.originalExpression?.includes("January"), "originalExpression must preserve the real matched text verbatim");
});

Deno.test("DATE_RANGE pattern does not false-positive on an unrelated 'relationship between X and Y' question", () => {
  const frame = frameFor("What is the relationship between the ministry and the agency?");
  assert(frame.temporalRequirement.type !== "DATE_RANGE", "a relationship question with no date/month/year token must never be mistaken for a date range");
});

Deno.test("AS_OF: resolved to a real ISO date, with the original wording preserved separately", () => {
  const frame = frameFor("What was the exchange rate as of September 2026?");
  assertEquals(frame.temporalRequirement.type, "AS_OF");
  // A month-year-only "as of" resolves to the END of that month (day unspecified -> last day is the
  // defensible reading for "as of a month", matching parseDateBound's boundary="end" for AS_OF).
  assertEquals(frame.temporalRequirement.asOf, "2026-09-30T00:00:00.000Z");
  assert(frame.temporalRequirement.originalExpression?.includes("September"), "originalExpression must preserve the real matched text verbatim");
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

// Phase 2 note: requiresFreshEvidence is no longer LITERALLY `queryClass === "CURRENT_WEB_RESEARCH"`
// -- it is derived from the resolved TemporalRequirement's strictness (see ibis-temporal-resolver.ts),
// which is deliberately MORE precise than the old coarse check for some real queries (e.g. "this
// morning" now correctly requires fresh evidence even though it never matched the old FRESHNESS_
// MARKERS regex -- see ibis-temporal-resolver.test.ts's dedicated coverage of that gap). This test
// keeps checking agreement on these specific representative queries, where the two computations still
// coincide, as a regression guard against an UNINTENDED divergence -- not as a claim that the two are
// architecturally guaranteed to always match.
Deno.test("requiresFreshEvidence agrees with the legacy queryClass-based check on these representative queries", () => {
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

Deno.test("bare mention of the CURRENT year alone is not treated as HISTORICAL", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const intent = classifyIntent(`What is planned for ${now.getFullYear()}?`);
  const frame = buildRequestFrame({ requestId: "test-request", text: `What is planned for ${now.getFullYear()}?`, intent, isDeterministicAnswer: false, now });
  assert(frame.temporalRequirement.type !== "HISTORICAL", "the current year is not history");
});

Deno.test("Phase 2: temporalRequirement is populated with real resolved bounds through buildRequestFrame, not left as Phase 1's raw text", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const text = "What is happening in Trinidad and Tobago today?";
  const intent = classifyIntent(text);
  const frame = buildRequestFrame({ requestId: "test-request", text, intent, isDeterministicAnswer: false, now });
  assertEquals(frame.temporalRequirement.type, "TODAY");
  assertEquals(frame.temporalRequirement.start, "2026-09-18T00:00:00.000Z");
  assertEquals(frame.temporalRequirement.timezone, "UTC");
  assertEquals(frame.temporalRequirement.timezoneSource, "DEFAULT_FALLBACK");
  assertEquals(frame.requiresFreshEvidence, true);
});

console.log("ibis-request-frame.test.ts: RequestFrame construction is additive, non-fabricating, and requiresFreshEvidence is now derived from the resolved TemporalRequirement (Phase 2), not an independent queryClass check.");
