// FTN Platform — search-query disambiguation for the "FTN" entity name (item 4).
//
// Live-observed problem: "FTN" collides with real, unrelated brands a generic search engine
// already indexes heavily -- most concretely FTN Fantasy (a well-known daily-fantasy-sports/NFL
// picks brand) -- so a bare query containing "FTN" can come back full of fantasy-football content
// instead of anything about this platform. This module only touches the QUERY STRING SENT TO THE
// SEARCH PROVIDER -- it never rewrites the user's own text, never changes intent classification,
// and never changes what the model is asked to answer. It runs once, right before search, and
// only for requests where RESEARCH was already planned for other reasons.
//
// Two failure modes to avoid, in order of how the mission stated them:
//   1. Under-disambiguating: a query that is clearly about this platform ("what has FTN done this
//      month", "who runs FTN") gets reinterpreted by the search engine as fantasy football/telecom.
//   2. Over-correcting: a query that is clearly NOT about this platform ("FTN Fantasy start-sit
//      advice for week 4") gets corrupted by appending irrelevant Caribbean-platform context.
//
// The rule: expand only when the text names "FTN" AND carries no marker of a different,
// well-known FTN entity. This defaults toward the platform's own identity (per the mission's
// explicit instruction to "prefer the current FTN Platform ecosystem unless the user clearly means
// another entity") without ever touching a query that already disambiguates itself.

const FTN_MENTION = /\bftn\b/i;

// Names/phrasing this repo has no reason to ever mean -- if any of these appear, the user is
// almost certainly asking about that other entity, not this platform, so the query must pass
// through completely untouched.
const OTHER_FTN_ENTITY_MARKERS =
  /\b(fantasy football|fantasy sports|dfs|daily fantasy|sportsbook|nfl picks|nfl draft|start[- ]sit|waiver wire|betting picks|prop bets|fiber[- ]to[- ]the[- ]node)\b/i;

// Live-verified correction: an earlier version of this function also skipped expansion whenever
// the query already said "FTN Platform" or "Face The Nation", on the assumption a search engine
// would already understand the phrase. Live production testing (item 8's adversarial matrix,
// query A: "the top three highest-leverage actions FTN Platform should take this month") proved
// that assumption wrong -- SearXNG/DuckDuckGo still surfaced ftnfantasy.com results alongside the
// real ftnplatform.org one, and the model's own answer described "FTN Platform" as a fantasy-
// sports product. "FTN Platform" as a bare phrase is not enough real-world disambiguation for a
// generic index that has never heard of this specific brand -- so this now always expands
// whenever "FTN" is mentioned and no OTHER-entity marker fired, with no shortcut for phrasing that
// merely sounds unambiguous to a human reader. Appending the suffix to an already-explicit query
// is harmless (it only adds more of the same disambiguating context), so there is no cost to
// always including it.
// Live-verified correction #2: even with the suffix above always applied, production still
// returned results from OTHER real "FTN"-branded businesses (ftnfantasy.com, and an unrelated
// "The FTN Platform" author-promotions site) alongside the correct ftnplatform.org pages, and the
// model's synthesis merged all of them into one hallucinated conglomerate. Adding the literal known
// domain (ftnplatform.org) is a much stronger disambiguation signal than a prose description alone
// -- keyword-matching search engines rank an exact domain-string match highly, which a generic
// phrase like "Caribbean civic technology" cannot compete with against another site's own on-page
// brand keywords.
export const FTN_DISAMBIGUATION_SUFFIX = "FTN Platform Caribbean civic technology ftnplatform.org, Face The Nation Caribbean platform";

// Live-caught (2026-09-18, FTN consolidation live test matrix, item 20's own query #11): "Show me
// Parliament records about the latest bill" returned UK Parliament (bills.parliament.uk) results
// -- the exact same class of bug as the FTN/fantasy-football collision above, just for a generic
// civic noun instead of a brand acronym. FTN's own Parliament/Govern products are specifically
// about Trinidad and Tobago; a bare "Parliament"/"the House"/"sitting" query with no country named
// is exactly the case FTN should default toward its own region for, per the same "prefer this
// platform's own context unless the user clearly means another entity" principle -- generalized
// from "FTN" the brand to "Parliament" the civic institution, since both are the identical failure
// shape (a generic search index defaulting to whichever jurisdiction it indexes most).
const CIVIC_TERM_MENTION = /\b(parliament|the house of representatives|hansard|order paper)\b/i;
// Any of these means the user has ALREADY named a jurisdiction -- civic disambiguation must never
// override an explicit choice, even one that isn't Trinidad and Tobago.
const OTHER_JURISDICTION_MARKERS =
  /\b(uk|united kingdom|britain|british|westminster|england|scotland|wales|us|usa|united states|congress|canada|canadian|jamaica|barbados|guyana|bahamas|belize|grenada|dominica|antigua|st\.? lucia|st\.? vincent|europe|european union|india|australia|new zealand)\b/i;
const TT_ALREADY_NAMED = /\b(trinidad|tobago|t&t|tt\b)/i;
const CIVIC_DISAMBIGUATION_SUFFIX = "Trinidad and Tobago Parliament";

// Returns the query string to actually send to the search provider. Returns the input unchanged
// whenever disambiguation is not needed OR would risk corrupting an unrelated legitimate use.
// Applies both the FTN-brand and the civic-institution corrections -- independent checks, either
// or both may fire on the same query.
export function buildDisambiguatedSearchQuery(text: string): string {
  let query = text;
  if (FTN_MENTION.test(text) && !OTHER_FTN_ENTITY_MARKERS.test(text)) {
    query = `${query} (${FTN_DISAMBIGUATION_SUFFIX})`;
  }
  if (CIVIC_TERM_MENTION.test(text) && !OTHER_JURISDICTION_MARKERS.test(text) && !TT_ALREADY_NAMED.test(text)) {
    query = `${query} (${CIVIC_DISAMBIGUATION_SUFFIX})`;
  }
  return query;
}
