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

// If the query already names the platform unambiguously, a search engine needs no more help --
// appending anyway would just be redundant noise on every already-clear query.
const ALREADY_UNAMBIGUOUS = /\b(face the nation|ftn platform|ftnplatform)\b/i;

export const FTN_DISAMBIGUATION_SUFFIX = "FTN Platform Caribbean civic technology, Face The Nation Caribbean platform";

// Returns the query string to actually send to the search provider. Returns the input unchanged
// whenever disambiguation is not needed OR would risk corrupting an unrelated legitimate use.
export function buildDisambiguatedSearchQuery(text: string): string {
  if (!FTN_MENTION.test(text)) return text;
  if (OTHER_FTN_ENTITY_MARKERS.test(text)) return text;
  if (ALREADY_UNAMBIGUOUS.test(text)) return text;
  return `${text} (${FTN_DISAMBIGUATION_SUFFIX})`;
}
