// Search Quality Gate pass (2026-09-18) -- unit tests for evaluateSearchResultQuality().
// Deliberately plain Deno.test (no network, no fetch) since this module is a pure function -- same
// pattern as ibis-search-query-normalizer.test.ts.
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateSearchResultQuality } from "./ibis-search-quality-gate.ts";

const NOW = new Date("2026-09-18T13:50:00Z");

Deno.test("live-caught bug case: a single stale 2018/2019 academic report is REJECTED for a freshness-required 'this week' query", () => {
  const result = evaluateSearchResultQuality({
    userQuery: "What changed in Trinidad and Tobago this week?",
    freshnessRequired: true,
    now: NOW,
    sources: [{
      title: "UWI Faculty Report 2018/2019 Annual Review",
      url: "https://sta.uwi.edu/reports/faculty-report-2018-2019.pdf",
      snippet: "This annual faculty report covers the academic year 2018/2019 for the St. Augustine campus.",
    }],
  });
  assertFalse(result.acceptable, "a single stale, off-topic academic report must not be accepted as evidence for a freshness-required question");
  assertEquals(result.usableSourceCount, 0);
});

Deno.test("real current sources (relative recency + region + topical overlap) are ACCEPTED for the same query class", () => {
  const result = evaluateSearchResultQuality({
    userQuery: "What changed in Trinidad and Tobago this week?",
    freshnessRequired: true,
    now: NOW,
    sources: [
      { title: "Trinidad and Tobago sea bridge capacity increases for October and beyond", url: "https://www.facebook.com/tobagochannel5/posts/x", snippet: "1 day ago ... The Port Authority of Trinidad and Tobago (PATT), in collaboration with NIDCO..." },
      { title: "Trinidad and Tobago Signs Agreements with U.S. Companies", url: "https://broadbandbreakfast.com/x", snippet: "Jul 12, 2026 ... PORT-OF-SPAIN, Trinidad" },
    ],
  });
  assert(result.acceptable, "genuinely current, on-topic sources must be accepted");
  assert(result.usableSourceCount >= 1);
  assert(result.freshnessMatch);
});

Deno.test("non-freshness query classes are never gated, even with the same stale sources", () => {
  const result = evaluateSearchResultQuality({
    userQuery: "What is FTN Opportunities?",
    freshnessRequired: false,
    now: NOW,
    sources: [{ title: "UWI Faculty Report 2018/2019 Annual Review", url: "https://sta.uwi.edu/x.pdf", snippet: "academic year 2018/2019" }],
  });
  assert(result.acceptable, "the gate must be a no-op for query classes that never required freshness -- do not overfit or broaden scope beyond the live-caught bug");
});

Deno.test("a source with NO structured date but strong topical/region/current-language signals is not wrongly rejected for weak metadata", () => {
  const result = evaluateSearchResultQuality({
    userQuery: "What happened in Trinidad politics this week?",
    freshnessRequired: true,
    now: NOW,
    sources: [{ title: "Trinidad and Tobago Parliament passes new bill", url: "https://ttparliament.org/news/x", snippet: "Parliament this week passed a new bill covering..." }],
  });
  assert(result.acceptable, "a good primary source must not be discarded merely for missing/weak date metadata -- see the mission's explicit probabilistic-evidence instruction");
});

Deno.test("empty source list is rejected outright for a freshness-required query", () => {
  const result = evaluateSearchResultQuality({ userQuery: "What is happening in Trinidad today?", freshnessRequired: true, now: NOW, sources: [] });
  assertFalse(result.acceptable);
  assertEquals(result.usableSourceCount, 0);
});

Deno.test("entity mismatch: sources about an unrelated place do not satisfy a Trinidad-and-Tobago-named freshness query", () => {
  const result = evaluateSearchResultQuality({
    userQuery: "What changed in Trinidad and Tobago this week?",
    freshnessRequired: true,
    now: NOW,
    sources: [{ title: "Jamaica tourism sees record growth this week", url: "https://example.com/jamaica", snippet: "This week, Jamaica's tourism sector reported record growth." }],
  });
  assertFalse(result.entityMatch, "a source that never mentions the query's named region should not count as an entity match");
  assertFalse(result.acceptable, "strong recency language about the wrong country must not satisfy a Trinidad-and-Tobago-specific freshness question");
});

Deno.test("a mixed batch with at least one good current source is accepted even when other sources in the same batch are weak/stale", () => {
  const result = evaluateSearchResultQuality({
    userQuery: "What changed in Trinidad and Tobago this week?",
    freshnessRequired: true,
    now: NOW,
    sources: [
      { title: "5 critical pivots for Trinidad and Tobago in 2026", url: "https://newsday.co.tt/2026/01/01/x", snippet: "a look back at 2026 predictions" },
      { title: "Trinidad and Tobago sea bridge capacity increases for October", url: "https://www.facebook.com/x", snippet: "1 day ago ... The Port Authority of Trinidad and Tobago..." },
    ],
  });
  assert(result.acceptable, "a genuinely good source must not be discarded just because the batch also contains a weaker one -- combined, probabilistic evidence, never one brittle rule");
});

console.log("ibis-search-quality-gate.test.ts: freshness-required stale/irrelevant evidence rejected, current/relevant evidence accepted, non-freshness queries never gated, weak metadata alone never disqualifies a good source.");
