// FTN Platform — shared source-adapter helper for FTN Statistics ingestion scripts (Phase 5A).
// Extracted from scripts/update-ttps-crime.mjs's own proven pattern (the first real adapter this
// repo shipped) once a second adapter needed the identical fetch/fail-closed shape -- same "rule of
// three" discipline this repo already applies elsewhere (see scripts/lib/registry-loader.mjs).
//
// Deliberately thin: fetches with a real, identifying User-Agent (so a source operator can see who
// is requesting their data, not a bot pretending to be a browser), fails closed on a non-OK
// response, and fails closed if the caller's own `parse` function throws -- which is exactly how an
// adapter detects the source's structure changed (a regex/selector that used to match no longer
// does), per the founder's explicit "capable of detecting changed source structure" requirement.
// The parse function itself stays source-specific in each script, not generalized here -- every
// real source has its own real shape, and pretending otherwise would hide exactly the kind of
// silent-failure risk this helper exists to prevent.
export async function fetchAndParse({ url, userAgent, parse }) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent } });
  if (!response.ok) throw new Error(`Source returned ${response.status}: ${url}`);
  const body = await response.text();
  return parse(body);
}

// Today's date in a named IANA timezone, YYYY-MM-DD -- the one place an ingestion script computes
// its own retrieval date, so every adapter stamps it the same way.
export function todayInTimezone(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
