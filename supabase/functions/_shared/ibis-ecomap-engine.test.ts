// FTN Platform — unit tests for the EcoMap (Place/Pathway/Relationship) core module. Run with:
//   deno test --allow-env supabase/functions/_shared/ibis-ecomap-engine.test.ts
//
// See GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md for the source/boundary this implementation follows
// (methodology classification: PARTIAL / FOUNDER-AUTHORIZED, never claimed as externally validated).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyPlaceKind,
  extractStatedJurisdiction,
  buildPlaceMap,
  buildPathwayMap,
  buildRelationshipMap,
  type EcoMapSourceRecord,
  type RelationshipEdge,
} from "./ibis-ecomap-engine.ts";

function fixtureSource(overrides: Partial<EcoMapSourceRecord> = {}): EcoMapSourceRecord {
  return {
    id: "src-1", title: "Tobago Business Development Office", text: "Tobago Business Development Office",
    url: "https://example.tt/tbdo", publisher: "gov.tt", origin: "SEARCH", recordedAt: "2026-09-16T00:00:00Z",
    confidence: "INFERRED", ...overrides,
  };
}

// --- classifyPlaceKind: a real, inspectable heuristic, never a silent guess -----------------------

Deno.test("EcoMap: classifyPlaceKind recognizes real keyword categories, defaults to UNKNOWN", () => {
  assertEquals(classifyPlaceKind("Tobago Youth Business Grant"), "OPPORTUNITY");
  assertEquals(classifyPlaceKind("Entrepreneurship Workshop for Food Vendors"), "EVENT");
  assertEquals(classifyPlaceKind("Ministry of Agriculture, Land and Fisheries"), "ORGANIZATION");
  assertEquals(classifyPlaceKind("Tobago Business Development Office"), "SERVICE");
  assertEquals(classifyPlaceKind("Economic Impact Study 2026"), "REPORT");
  assertEquals(classifyPlaceKind("Something with no matching keyword at all"), "UNKNOWN", "must never guess a kind it has no keyword support for");
});

Deno.test("EcoMap: extractStatedJurisdiction reads only the request's own text, never a location API", () => {
  assertEquals(extractStatedJurisdiction("I want to start a business in Tobago"), "Tobago");
  assertEquals(extractStatedJurisdiction("What about Port of Spain?"), "Port of Spain");
  assertEquals(extractStatedJurisdiction("no place mentioned here"), null);
});

// --- EcoMap Place: location privacy + honest gaps -------------------------------------------------

Deno.test("EcoMap Place: never produces a COORDINATES precision or a confirmed address from a search source", () => {
  const result = buildPlaceMap([fixtureSource()], "Tobago");
  assertEquals(result.entities.length, 1);
  assertEquals(result.entities[0].locationPrecision, "JURISDICTION", "must prefer jurisdiction-level precision, never coordinates");
  assertEquals(result.entities[0].confirmedLocation, null, "must never fabricate a confirmed address from a search snippet");
  assert(result.entities[0].inferredCoverage?.includes("inferred"), "inferred coverage must be explicitly labeled as inferred, kept separate from confirmedLocation");
});

Deno.test("EcoMap Place: discloses missing jurisdiction/eligibility/availability rather than fabricating them", () => {
  const result = buildPlaceMap([fixtureSource({ title: "Something with no matching keyword at all", text: "Something with no matching keyword at all" })], null);
  assert(result.missing.some((m) => m.includes("No jurisdiction")));
  assert(result.missing.some((m) => m.includes("Eligibility")));
  assert(result.missing.some((m) => m.includes("availability")));
});

Deno.test("EcoMap Place: empty sources still returns a real, honest result with disclosed gaps, never fabricated entities", () => {
  const result = buildPlaceMap([], "Tobago");
  assertEquals(result.entities.length, 0);
  assert(Array.isArray(result.missing));
});

// --- EcoMap Pathway: never confirms a step without evidence ---------------------------------------

Deno.test("EcoMap Pathway: every auto-built step is INFERRED, never CONFIRMED, and a missing-steps disclosure is always present", () => {
  const result = buildPathwayMap("Register a food business in Tobago", [fixtureSource(), fixtureSource({ id: "src-2", title: "Food Badge licensing requirements" })]);
  assertEquals(result.steps.length, 2);
  assert(result.steps.every((s) => s.status === "INFERRED"), "a pathway must not pretend a step is confirmed when evidence is absent");
  assert(result.missing.some((m) => m.includes("not confirmed by any source")));
  assertEquals(result.steps[1].dependsOn, ["step-0"], "steps must record real dependency ordering");
});

Deno.test("EcoMap Pathway: zero sources still returns the outcome and an honest missing-steps disclosure, never a fabricated step", () => {
  const result = buildPathwayMap("Register a food business", []);
  assertEquals(result.steps.length, 0);
  assertEquals(result.outcome, "Register a food business");
  assert(result.missing.length > 0);
  assertEquals(result.lastVerifiedAt, null);
});

// --- EcoMap Relationship: sensitivity suppression, never inferring a person-level relationship ----

Deno.test("EcoMap Relationship: auto-built edges are PUBLIC and generic (POTENTIAL_REFERRAL), never a specific fabricated relation type", () => {
  const result = buildRelationshipMap("My food business", [fixtureSource()]);
  assertEquals(result.edges.length, 1);
  assertEquals(result.edges[0].relationType, "POTENTIAL_REFERRAL");
  assertEquals(result.edges[0].sensitivity, "PUBLIC");
  assertEquals(result.publicEdgeCount, 1);
  assertEquals(result.suppressedCount, 0);
});

Deno.test("EcoMap Relationship: SENSITIVE/PRIVATE explicit edges are counted as suppressed, distinct from public edges", () => {
  const sensitiveEdge: RelationshipEdge = {
    id: "edge-sensitive", sourceEntity: "Person A", targetEntity: "Person B", relationType: "FAMILY_REFERRAL",
    direction: "SOURCE_TO_TARGET", influence: "CONFIRMED", dependency: true, incentive: null, reciprocalValue: null,
    trustConfidence: "CONFIRMED", provenance: "internal-case-note", sensitivity: "SENSITIVE",
  };
  const result = buildRelationshipMap("My food business", [fixtureSource()], [sensitiveEdge]);
  assertEquals(result.edges.length, 2, "the sensitive edge must still be present in the structured result for an authorized advanced caller");
  assertEquals(result.publicEdgeCount, 1);
  assertEquals(result.suppressedCount, 1, "the sensitive edge must be counted as suppressed, never silently mixed into the public count");
});

Deno.test("EcoMap Relationship: never builds a person-to-person edge from generic search sources", () => {
  const result = buildRelationshipMap("My food business", [fixtureSource({ title: "John Smith's personal blog" })]);
  assertEquals(result.edges[0].sourceEntity, "My food business", "auto-built edges only ever connect the request's own subject to a discovered entity, never two named individuals");
});

Deno.test("EcoMap Relationship: no consciousness claim and no fake probability anywhere in output", () => {
  const result = buildRelationshipMap("subject", [fixtureSource()]);
  const serialized = JSON.stringify(result);
  assert(!/conscious/i.test(serialized));
  assert(!/"probability"\s*:/.test(serialized));
});
