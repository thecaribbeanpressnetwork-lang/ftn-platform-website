// FTN Quality & UX Closure pass (2026-09-18) -- unit tests for the search-query normalizer.
// Deliberately plain Deno.test (no network, no fetch) since categorize()/buildQueryAttempts() are
// pure functions -- these should also be run under plain Node via
// `node --experimental-strip-types --test` for a second, independent runtime check.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildQueryAttempts, categorize } from "./ibis-search-query-normalizer.ts";
import { resolveTemporalRequirement } from "./ibis-temporal-resolver.ts";

Deno.test("attempt #1 is always the original, unmodified text", () => {
  const text = "What changed in Trinidad this week?";
  const attempts = buildQueryAttempts(text);
  assertEquals(attempts[0], text, "the first attempt must be the literal original query -- every currently-working query must keep working exactly as before");
});

Deno.test("bounded: never more than 4 total attempts", () => {
  for (const text of [
    "What changed in Trinidad this week?",
    "Where can I find an official government service for renewing a passport in Trinidad and Tobago?",
    "Find current grants available to a Trinidad and Tobago civic-tech startup.",
  ]) {
    assert(buildQueryAttempts(text).length <= 4, `too many fanout attempts for: ${text}`);
  }
});

Deno.test("categorize: recognizes each mission-named category", () => {
  assertEquals(categorize("Show me recent Parliament records about the budget"), "PARLIAMENT");
  assertEquals(categorize("Find current grants available to a startup"), "GRANTS");
  assertEquals(categorize("Find training available in Trinidad"), "COURSES");
  assertEquals(categorize("Where can I renew my passport"), "GOVERNMENT");
  assertEquals(categorize("What is happening in Tobago tourism right now"), "TOURISM");
  assertEquals(categorize("Find current opportunities for musicians"), "OPPORTUNITIES");
  assertEquals(categorize("What could go wrong with this business plan"), "BUSINESS");
  assertEquals(categorize("What changed in Trinidad this week"), "CURRENT_EVENTS");
});

Deno.test("no attempt is ever empty or duplicate", () => {
  const attempts = buildQueryAttempts("What changed in Trinidad this week?");
  const seen = new Set<string>();
  for (const a of attempts) {
    assert(a.trim().length > 0, "an attempt must never be an empty string");
    const key = a.toLowerCase();
    assert(!seen.has(key), `duplicate attempt: ${a}`);
    seen.add(key);
  }
});

Deno.test("region defaults to Trinidad and Tobago, not a bare Caribbean, when unspecified", () => {
  const attempts = buildQueryAttempts("What changed this week?");
  assert(attempts.some((a) => /Trinidad and Tobago/i.test(a)), "should default to FTN's primary market, matching the civic disambiguator's own default");
});

Deno.test("Tobago-specific question stays Tobago, not diluted to a generic Trinidad and Tobago phrase", () => {
  const attempts = buildQueryAttempts("What is happening in Tobago tourism right now?");
  assert(attempts.some((a) => /\bTobago\b/i.test(a) && !/Trinidad and Tobago/i.test(a)), "a Tobago-only question should get at least one Tobago-specific (not blended) retrieval attempt");
});

Deno.test("official-source-restricted attempt only appears for categories with a real known domain set", () => {
  const parliamentAttempts = buildQueryAttempts("Show me recent Parliament records");
  assert(parliamentAttempts.some((a) => a.includes("site:ttparliament.org")), "Parliament questions should get an official-source-restricted attempt");
  const causalAttempts = buildQueryAttempts("What variables could be correlated with unemployment?");
  assert(!causalAttempts.some((a) => a.includes("site:")), "a category with no curated official domain set must never fabricate one");
});

Deno.test("empty/whitespace input returns no attempts", () => {
  assertEquals(buildQueryAttempts(""), []);
  assertEquals(buildQueryAttempts("   "), []);
});

// FTN / IBIS Canonical Architecture, Phase 2 -- temporalRequirement-shaped retrieval expansion.
const NOW = new Date("2026-09-18T12:00:00Z");

Deno.test("Phase 2: omitting temporalRequirement keeps the exact prior month-year boost (backward compatible)", () => {
  const attempts = buildQueryAttempts("What changed in Trinidad this week?");
  assert(attempts.some((a) => /latest news developments/i.test(a)), "no temporalRequirement supplied -- must fall back to the original month-year boost unchanged");
});

Deno.test("Phase 2: HISTORICAL never injects a current-date term into the retrieval-language expansion", () => {
  const temporal = resolveTemporalRequirement({ query: "What happened in Trinidad in 1990?", now: NOW, freshnessSignalMatched: false });
  assertEquals(temporal.type, "HISTORICAL");
  const attempts = buildQueryAttempts("What happened in Trinidad in 1990?", temporal);
  assert(!attempts.some((a) => /september 2026|2026\b/i.test(a) && !a.includes("1990")), "a historical query must never have the CURRENT month/year injected into its retrieval expansion");
});

Deno.test("Phase 2: TODAY injects the exact resolved date, not just a month/year", () => {
  const query = "What is happening in Trinidad and Tobago today?";
  const temporal = resolveTemporalRequirement({ query, now: NOW, freshnessSignalMatched: true });
  assertEquals(temporal.type, "TODAY");
  const attempts = buildQueryAttempts(query, temporal);
  assert(attempts.some((a) => /September 18 2026/.test(a)), "a TODAY query should get an exact-date retrieval attempt, a stronger anchor than a bare month/year");
});

Deno.test("Phase 2: LATEST_AVAILABLE prefers 'latest official release' language over forcing today's date", () => {
  const query = "What are the latest available unemployment figures for Trinidad and Tobago?";
  const temporal = resolveTemporalRequirement({ query, now: NOW, freshnessSignalMatched: true });
  assertEquals(temporal.type, "LATEST_AVAILABLE");
  const attempts = buildQueryAttempts(query, temporal);
  assert(attempts.some((a) => /latest official release/i.test(a)), "LATEST_AVAILABLE should prefer release/official language, not a forced current date");
  assert(!attempts.some((a) => /September 18 2026/.test(a)), "must never force today's exact date onto a LATEST_AVAILABLE query");
});
