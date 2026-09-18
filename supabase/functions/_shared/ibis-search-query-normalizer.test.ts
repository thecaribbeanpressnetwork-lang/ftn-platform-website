// FTN Quality & UX Closure pass (2026-09-18) -- unit tests for the search-query normalizer.
// Deliberately plain Deno.test (no network, no fetch) since categorize()/buildQueryAttempts() are
// pure functions -- these should also be run under plain Node via
// `node --experimental-strip-types --test` for a second, independent runtime check.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildQueryAttempts, categorize } from "./ibis-search-query-normalizer.ts";

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
