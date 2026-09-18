// FTN Platform — ibis-ftn-disambiguation.ts unit tests (item 4).
import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDisambiguatedSearchQuery, FTN_DISAMBIGUATION_SUFFIX } from "./ibis-ftn-disambiguation.ts";

Deno.test("DISAMBIGUATION: a bare platform-context FTN mention gets the disambiguating suffix appended", () => {
  const out = buildDisambiguatedSearchQuery("What has FTN done this month?");
  assertMatch(out, /What has FTN done this month\?/);
  assertMatch(out, new RegExp(FTN_DISAMBIGUATION_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

Deno.test("DISAMBIGUATION: lowercase 'ftn' is matched the same as uppercase", () => {
  const out = buildDisambiguatedSearchQuery("who runs ftn right now");
  assertMatch(out, /Face The Nation/i);
});

Deno.test("DISAMBIGUATION: a query naming a different well-known FTN entity is never touched", () => {
  const q = "FTN Fantasy start-sit advice for week 4";
  assertEquals(buildDisambiguatedSearchQuery(q), q, "a fantasy-football FTN query must pass through completely unmodified");
});

Deno.test("DISAMBIGUATION: even phrasing that already says 'FTN Platform' still gets the suffix (live-verified: a bare 'FTN Platform' query still surfaced FTN Fantasy results)", () => {
  const q = "FTN Platform roadmap for Q4";
  const out = buildDisambiguatedSearchQuery(q);
  assertMatch(out, /FTN Platform roadmap for Q4/);
  assertMatch(out, /Face The Nation/i);
});

Deno.test("DISAMBIGUATION: a query with no 'FTN' mention at all is never touched", () => {
  const q = "What is photosynthesis?";
  assertEquals(buildDisambiguatedSearchQuery(q), q);
});

Deno.test("DISAMBIGUATION: 'FTN' as part of a longer unrelated word is never matched (word boundary only)", () => {
  const q = "How does FTNXCorp handle onboarding?";
  assertEquals(buildDisambiguatedSearchQuery(q), q, "FTN must only match as a standalone word, never as a substring of an unrelated token");
});

// Live-caught (2026-09-18, consolidation matrix): "Show me Parliament records about the latest
// bill" returned UK Parliament results with no Trinidad and Tobago context at all.
Deno.test("DISAMBIGUATION (civic): a bare 'Parliament' query with no jurisdiction named is biased toward Trinidad and Tobago", () => {
  const out = buildDisambiguatedSearchQuery("Show me Parliament records about the latest bill.");
  assertMatch(out, /Show me Parliament records about the latest bill\./);
  assertMatch(out, /Trinidad and Tobago Parliament/);
});

Deno.test("DISAMBIGUATION (civic): a query that already names another jurisdiction is left alone", () => {
  const q = "What is the UK Parliament debating this week?";
  assertEquals(buildDisambiguatedSearchQuery(q), q, "an explicitly-named jurisdiction must never be overridden");
});

Deno.test("DISAMBIGUATION (civic): a query that already names Trinidad and Tobago is left alone (no redundant suffix)", () => {
  const q = "What did Trinidad and Tobago's Parliament decide today?";
  assertEquals(buildDisambiguatedSearchQuery(q), q, "already-explicit T&T context needs no additional suffix");
});

Deno.test("DISAMBIGUATION (civic): a query with no civic term at all is never touched by the civic rule", () => {
  const q = "What is photosynthesis?";
  assertEquals(buildDisambiguatedSearchQuery(q), q);
});

Deno.test("DISAMBIGUATION: both FTN and civic corrections can apply to the same query independently", () => {
  const out = buildDisambiguatedSearchQuery("Does FTN cover Parliament sittings?");
  assertMatch(out, /Face The Nation/i);
  assertMatch(out, /Trinidad and Tobago Parliament/);
});
