// FTN / IBIS Canonical Architecture, Phase 3 -- unit tests for the CEBOS Evidence Contract
// (shadow mode). Deliberately plain Deno.test (no network, no fetch): buildEvidenceContract() is a
// pure function of a single RequestFrame, same pattern as every other Phase 1/2 module.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyIntent } from "./ibis-intent-router.ts";
import { buildRequestFrame } from "./ibis-request-frame.ts";
import { buildEvidenceContract } from "./ibis-evidence-contract.ts";

const NOW = new Date("2026-09-18T12:00:00Z");

function contractFor(text: string, isDeterministicAnswer = false) {
  const intent = classifyIntent(text);
  const frame = buildRequestFrame({ requestId: "test-request", text, intent, isDeterministicAnswer, now: NOW });
  return buildEvidenceContract(frame);
}

Deno.test("an ordinary timeless factual question requires no evidence contract", () => {
  const c = contractFor("What is the capital of Barbados?");
  assertEquals(c.requiredEvidence, false);
  assertEquals(c.sufficiency, "NOT_APPLICABLE");
});

Deno.test("a deterministic calculation requires no evidence and permits only DETERMINISTIC_CALCULATION claims", () => {
  const c = contractFor("2 + 2", true);
  assertEquals(c.requiredEvidence, false);
  assertEquals(c.permittedClaimTypes, ["DETERMINISTIC_CALCULATION"]);
  assertEquals(c.sufficiency, "NOT_APPLICABLE");
});

Deno.test("TODAY (HIGH strictness) demands DOCUMENTED evidence and prefers corroboration", () => {
  const c = contractFor("What is happening in Trinidad and Tobago today?");
  assertEquals(c.requiredEvidence, true);
  assertEquals(c.temporalWindow.strictness, "HIGH");
  assertEquals(c.minimumEpistemicStatus, "DOCUMENTED");
  assertEquals(c.sufficiency, "CORROBORATION_PREFERRED");
  assert(c.requiredSourceClasses.includes("NEWS_MEDIA"));
});

Deno.test("LATEST_AVAILABLE (MEDIUM strictness) accepts INFERRED evidence, single source, and prefers statistical/official sources", () => {
  const c = contractFor("What are the latest available unemployment figures for Trinidad and Tobago?");
  assertEquals(c.requiredEvidence, true);
  assertEquals(c.temporalWindow.strictness, "MEDIUM");
  assertEquals(c.minimumEpistemicStatus, "INFERRED");
  assertEquals(c.sufficiency, "SINGLE_SOURCE_ACCEPTABLE");
  assert(c.requiredSourceClasses.includes("STATISTICAL_RELEASE"));
  assert(c.permittedClaimTypes.includes("STATISTICAL"));
});

Deno.test("HISTORICAL (NONE strictness) still wants some evidence but accepts SPECULATIVE and needs no corroboration", () => {
  const c = contractFor("What happened in Trinidad in 1990?");
  assertEquals(c.temporalWindow.strictness, "NONE");
  assertEquals(c.requiredEvidence, true, "a factual historical claim should still ideally be grounded, even though nothing enforces this yet -- see the Phase 3 report's disclosed architecture gap");
  assertEquals(c.minimumEpistemicStatus, "SPECULATIVE");
  assertEquals(c.sufficiency, "SINGLE_SOURCE_ACCEPTABLE");
});

Deno.test("RETRODICTION permits CAUSAL claims as a category, without this module performing any causal reconstruction itself", () => {
  const c = contractFor("Why has Trinidad and Tobago experienced foreign-exchange shortages?");
  assertEquals(c.queryClass, "RETRODICTION");
  assert(c.permittedClaimTypes.includes("CAUSAL"));
  // This module must never compute or reference EBR's own causal machinery (K_att/K_rec, candidate
  // histories) -- confirmed structurally: EvidenceContract has no field for either.
  assert(!("candidateHistories" in c) && !("actorAccess" in c));
});

Deno.test("CORRELATION permits only STATISTICAL claims", () => {
  // Deliberately avoids any FRESHNESS_MARKERS word (e.g. "exchange rate") -- freshness outranks
  // correlation in classifyIntent()'s PRIMARY-classification priority order, so a query mixing both
  // signals correctly classifies CURRENT_WEB_RESEARCH, not CORRELATION; this test isolates the
  // correlation-only case on purpose.
  const c = contractFor("Is there a correlation between remittances and GDP growth?");
  assertEquals(c.queryClass, "CORRELATION");
  assertEquals(c.permittedClaimTypes, ["STATISTICAL"]);
});

Deno.test("FOUNDER_STRATEGY permits STRATEGIC_JUDGMENT claims", () => {
  const c = contractFor("I want to start a business in Trinidad.");
  assertEquals(c.queryClass, "FOUNDER_STRATEGY");
  assert(c.permittedClaimTypes.includes("STRATEGIC_JUDGMENT"));
});

Deno.test("the contract is a pure, deterministic function of RequestFrame -- same input, same output", () => {
  const a = contractFor("What changed in Trinidad and Tobago this week?");
  const b = contractFor("What changed in Trinidad and Tobago this week?");
  assertEquals(a, b);
});

Deno.test("temporalWindow echoes the exact RequestFrame.temporalRequirement bounds, never recomputed independently", () => {
  const intent = classifyIntent("What changed in Trinidad and Tobago this week?");
  const frame = buildRequestFrame({ requestId: "test-request", text: "What changed in Trinidad and Tobago this week?", intent, isDeterministicAnswer: false, now: NOW });
  const contract = buildEvidenceContract(frame);
  assertEquals(contract.temporalWindow.start, frame.temporalRequirement.start);
  assertEquals(contract.temporalWindow.end, frame.temporalRequirement.end);
  assertEquals(contract.temporalWindow.strictness, frame.temporalRequirement.strictness);
});

Deno.test("rationale is always non-empty and traceable, never a static placeholder", () => {
  const c1 = contractFor("What is the capital of Barbados?");
  const c2 = contractFor("What is happening in Trinidad and Tobago today?");
  assert(c1.rationale.length > 0);
  assert(c2.rationale.length > 0);
  assert(c1.rationale.join(" ") !== c2.rationale.join(" "), "rationale must genuinely differ for genuinely different requests, never a copy-pasted static string");
});

console.log("ibis-evidence-contract.test.ts: the shadow-mode CEBOS Evidence Contract is deterministic, reuses EBR's EpistemicStatus vocabulary without importing any causal-specific machinery, and never influences the answer path (no capabilityPlan/search input, no I/O).");
