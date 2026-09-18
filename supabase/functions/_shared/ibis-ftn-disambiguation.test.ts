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

Deno.test("DISAMBIGUATION: a query that already names the platform unambiguously is left alone", () => {
  const q = "What is Face The Nation's next release?";
  assertEquals(buildDisambiguatedSearchQuery(q), q, "already-unambiguous phrasing needs no expansion");
  const q2 = "FTN Platform roadmap for Q4";
  assertEquals(buildDisambiguatedSearchQuery(q2), q2);
});

Deno.test("DISAMBIGUATION: a query with no 'FTN' mention at all is never touched", () => {
  const q = "What is photosynthesis?";
  assertEquals(buildDisambiguatedSearchQuery(q), q);
});

Deno.test("DISAMBIGUATION: 'FTN' as part of a longer unrelated word is never matched (word boundary only)", () => {
  const q = "How does FTNXCorp handle onboarding?";
  assertEquals(buildDisambiguatedSearchQuery(q), q, "FTN must only match as a standalone word, never as a substring of an unrelated token");
});
