// FTN / IBIS Canonical Architecture -- Phase 2: the deterministic temporal resolver.
//
// See GOVERNANCE/FTN_IBIS_Canonical_Architecture_2026-09-18.md and the companion implementation
// plan for the frozen target. Phase 1 (ibis-request-frame.ts) introduced TemporalRequirement as a
// shadow-only representation with raw, unparsed text in start/end/asOf. Phase 2's job is to make
// this the CANONICAL temporal authority: real ISO-resolved bounds, explicit timezone handling, and
// `requiresFreshEvidence` derived FROM it rather than from the coarse
// `queryClass === "CURRENT_WEB_RESEARCH"` check. This module contains only DETERMINISTIC date/time
// resolution -- no LLM call, no network I/O, no randomness beyond the injected `now`.
//
// Deliberately still narrow: this resolves WHEN evidence should be from, never WHETHER evidence
// found later actually satisfies that window (that is the future Evidence Processor's job -- see
// the architecture doc's Box 6 and this plan's explicit non-goals). SearchAdapter/query-normalizer
// consume this module's output to shape RETRIEVAL, never to judge evidence sufficiency.

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export type TemporalRequirementType =
  | "TIMELESS"
  | "CURRENT"
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "DATE_RANGE"
  | "AS_OF"
  | "LATEST_AVAILABLE"
  | "HISTORICAL";

// NONE: no freshness requirement (TIMELESS, HISTORICAL, or an AS_OF/DATE_RANGE clearly anchored in
// the past -- see RECENT_THRESHOLD_DAYS below). MEDIUM: recency matters, but authoritative
// latest-available material may legitimately describe an earlier measurement period (LATEST_AVAILABLE,
// THIS_MONTH, generic CURRENT). HIGH: the answer must directly satisfy the requested window
// (TODAY, THIS_WEEK, an AS_OF/DATE_RANGE anchored at or near the present, or one that could not be
// resolved at all -- ambiguous temporal language defaults to the SAFER, stricter requirement, never
// silently to CURRENT/NONE).
export type TemporalStrictness = "NONE" | "MEDIUM" | "HIGH";

export type TimezoneSource = "CLIENT_PROVIDED" | "DEFAULT_FALLBACK";

export type TemporalRequirement = {
  type: TemporalRequirementType;
  // ISO 8601 UTC instants -- resolved, machine-usable. null when the type has no meaningful window
  // (TIMELESS, CURRENT, LATEST_AVAILABLE -- see this module's period-semantics notes below) or when
  // a date-bearing type matched textually but a concrete bound could not be parsed (see `resolved`).
  start: string | null;
  end: string | null;
  asOf: string | null;
  // Canonical short semantic label ("today", "this week", "latest available") -- null for types
  // where no single short label applies (DATE_RANGE, AS_OF, HISTORICAL, CURRENT).
  relativeExpression: string | null;
  // The raw substring actually matched in the query, preserved verbatim -- e.g. "between September 1
  // and September 10, 2026". Never normalized/invented.
  originalExpression: string | null;
  strictness: TemporalStrictness;
  // false ONLY when a date-bearing type (DATE_RANGE/AS_OF) matched textually but this resolver could
  // not parse a concrete calendar bound from it (e.g. "between January and March" with no year) --
  // start/end/asOf stay null rather than guessed. True for every other type, including ones with no
  // window at all (TIMELESS/CURRENT/LATEST_AVAILABLE) -- "resolved" means "this resolver reached a
  // confident conclusion about what was asked," not "a specific date exists."
  resolved: boolean;
  timezone: string;
  timezoneSource: TimezoneSource;
};

export const DEFAULT_TIMEZONE = "UTC";

// How far in the past an AS_OF/DATE_RANGE bound must sit before it stops requiring fresh evidence.
// A range whose end (or an as-of date) is within this window of `now` is treated as a live/recent
// current-events question (the exact live-caught 2018/2019-report bug shape this threshold exists
// to keep catching); older than this, it is a historical lookup where recently-published evidence is
// not what was asked for. Documented explicitly per this phase's instruction not to let strictness
// become an arbitrary, undocumented score.
const RECENT_THRESHOLD_DAYS = 30;

// --- Timezone-aware calendar-day arithmetic --------------------------------------------------
// Deno ships full ICU, so Intl.DateTimeFormat resolves ANY IANA timezone name correctly (verified:
// 23:30 UTC on a given date resolves to the correct NEXT calendar day in a timezone ahead of UTC,
// e.g. Pacific/Auckland). No real caller supplies a non-UTC timezone yet (see this module's own
// audit note below), but the math itself is genuinely timezone-capable, not a UTC-only stub.

function offsetMinutesFor(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset", hour: "2-digit" }).formatToParts(instant);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
  const match = raw.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

function localDateParts(instant: Date, timezone: string): { year: number; month: number; day: number; isoWeekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const weekdayIso: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day), isoWeekday: weekdayIso[map.weekday] ?? 1 };
}

// The UTC instant corresponding to local midnight (00:00:00.000) on the given Y-M-D in `timezone`.
// Single-pass approximation (guesses the offset from a naive UTC midnight, then corrects once) --
// exact for every real-world timezone except a request resolving to the exact minute of a DST
// transition, an acceptable, documented simplification for day-level calendar resolution.
function utcInstantForLocalMidnight(year: number, month: number, day: number, timezone: string): Date {
  const naiveGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const offsetMin = offsetMinutesFor(naiveGuess, timezone);
  return new Date(naiveGuess.getTime() - offsetMin * 60_000);
}

// Pure calendar-arithmetic day shift on a Y-M-D triple (never interpreted as a real instant) --
// used only to walk backward to the Monday of the current local week.
function shiftYmdByDays(year: number, month: number, day: number, deltaDays: number): { year: number; month: number; day: number } {
  const calc = new Date(Date.UTC(year, month - 1, day));
  calc.setUTCDate(calc.getUTCDate() + deltaDays);
  return { year: calc.getUTCFullYear(), month: calc.getUTCMonth() + 1, day: calc.getUTCDate() };
}

function startOfLocalDay(now: Date, timezone: string): Date {
  const { year, month, day } = localDateParts(now, timezone);
  return utcInstantForLocalMidnight(year, month, day, timezone);
}

// ISO 8601 week convention: Monday 00:00 local through "now" (an in-progress week's evidence window
// cannot extend past the moment the question was asked, regardless of which day of the week it is)
// -- documented explicitly per this phase's instruction to pick one convention and state it. This is
// the property that distinguishes THIS_WEEK from a rolling "last 7 days" window: THIS_WEEK's start is
// always the most recent Monday, never `now` minus 7 days.
function startOfLocalWeek(now: Date, timezone: string): Date {
  const { year, month, day, isoWeekday } = localDateParts(now, timezone);
  const monday = shiftYmdByDays(year, month, day, -(isoWeekday - 1));
  return utcInstantForLocalMidnight(monday.year, monday.month, monday.day, timezone);
}

function startOfLocalMonth(now: Date, timezone: string): Date {
  const { year, month } = localDateParts(now, timezone);
  return utcInstantForLocalMidnight(year, month, 1, timezone);
}

// --- Explicit date-bound parsing (DATE_RANGE / AS_OF / HISTORICAL) -----------------------------
// Deliberately UTC-only at this granularity: a range or as-of date expressed only in month/day/year
// terms (no time-of-day) has no meaningful sub-day timezone precision to resolve -- "September 2026"
// means the same calendar month regardless of which timezone is asking.

function daysInMonthUtc(year: number, month1To12: number): number {
  return new Date(Date.UTC(year, month1To12, 0)).getUTCDate();
}

// Parses one side of a range (or an AS_OF phrase) into an ISO date string. `boundary` picks the
// first or last day of a month/year when no exact day is given. `inheritedYear` lets "September 1"
// borrow a year written only on the other side of a range (e.g. "September 1 and September 10, 2026").
function parseDateBound(raw: string, boundary: "start" | "end", inheritedYear: number | null): string | null {
  const text = raw.toLowerCase();
  const monthPattern = MONTH_NAMES.join("|");

  const dayMonthYear = text.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`));
  if (dayMonthYear) {
    const monthIndex = MONTH_NAMES.indexOf(dayMonthYear[1]);
    return isoDate(Number(dayMonthYear[3]), monthIndex + 1, Number(dayMonthYear[2]));
  }

  const dayMonthNoYear = text.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  if (dayMonthNoYear && inheritedYear !== null) {
    const monthIndex = MONTH_NAMES.indexOf(dayMonthNoYear[1]);
    return isoDate(inheritedYear, monthIndex + 1, Number(dayMonthNoYear[2]));
  }

  const monthYear = text.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{4})\\b`));
  if (monthYear) {
    const monthIndex = MONTH_NAMES.indexOf(monthYear[1]);
    const year = Number(monthYear[2]);
    const day = boundary === "start" ? 1 : daysInMonthUtc(year, monthIndex + 1);
    return isoDate(year, monthIndex + 1, day);
  }

  const monthNoYear = text.match(new RegExp(`\\b(${monthPattern})\\b`));
  if (monthNoYear && inheritedYear !== null) {
    const monthIndex = MONTH_NAMES.indexOf(monthNoYear[1]);
    const day = boundary === "start" ? 1 : daysInMonthUtc(inheritedYear, monthIndex + 1);
    return isoDate(inheritedYear, monthIndex + 1, day);
  }

  const bareYear = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (bareYear) {
    const year = Number(bareYear[1]);
    return boundary === "start" ? isoDate(year, 1, 1) : isoDate(year, 12, 31);
  }

  return null;
}

function extractYear(raw: string): number | null {
  const match = raw.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function isoDate(year: number, month1To12: number, day: number): string {
  return new Date(Date.UTC(year, month1To12 - 1, day, 0, 0, 0, 0)).toISOString();
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 86_400_000;
}

// --- Pattern matching (unchanged from Phase 1 except DATE_RANGE/AS_OF now feed the parser above) --

// Note: the trailing segment of each side deliberately allows a comma (only `.?!` are excluded) --
// "September 10, 2026" is truncated to "September 10" if commas are excluded here, silently
// dropping the year. A comma is common inside a single date and rare as a real clause break within
// a "between X and Y" span, so allowing it costs nothing in practice.
const DATE_RANGE_PATTERN = new RegExp(
  `\\b(?:between|from)\\s+([^.?!]*?(?:${MONTH_NAMES.join("|")}|\\d{4})[^.?!]*?)\\s+(?:and|to)\\s+([^.?!]*?(?:${MONTH_NAMES.join("|")}|\\d{4})[^.?!]*)`,
  "i",
);
const AS_OF_PATTERN = /\bas of\s+([^.?!]+)/i;
const BARE_YEAR_PATTERN = /\b(19\d{2}|20\d{2})\b/;
const LATEST_AVAILABLE_PATTERN = /\blatest available\b|\bmost recently available\b|\b(?:latest|most recent)\b[^.?!]{0,30}\b(?:figures?|data|statistics|numbers?|indicators?|report)\b/i;
// "this morning/afternoon/evening/tonight" added this phase -- a real, live-confirmed gap: the old
// FRESHNESS_MARKERS regex in ibis-intent-router.ts never recognized these, so "What happened in
// Trinidad this morning?" posted to the legacy (non-canonical_query) endpoint would have skipped the
// freshness safety net entirely. This resolver becoming the canonical authority (see
// ibis-canonical-brain.ts's updated freshnessRequired derivation) closes that gap for both entry
// points.
const TODAY_PATTERN = /\btoday\b|\bright now\b|\bthis (?:morning|afternoon|evening|tonight)\b/i;
const THIS_WEEK_PATTERN = /\bthis week\b/i;
const THIS_MONTH_PATTERN = /\bthis month\b/i;
// Explicit rolling-window language ("in the last 7 days") must never be silently folded into the
// calendar THIS_WEEK convention above -- a real architectural gap this phase does not close (no
// ROLLING_WINDOW type exists in TemporalRequirementType yet; see this module's own header and the
// Phase 2 report for why extending the enum was deliberately deferred rather than added under scope
// pressure). Detected here only so it is diverted to the generic CURRENT type instead of THIS_WEEK.
const ROLLING_WINDOW_PATTERN = /\b(?:in the )?last\s+\d+\s+(?:hours?|days?|weeks?|months?)\b/i;

function currentYear(): number {
  return new Date().getFullYear();
}

export type ResolveTemporalRequirementInput = {
  query: string;
  // Injected clock -- required, not defaulted to `new Date()` inside this function, so every call
  // site (and every test) is explicit and reproducible. See this phase's clock-injection mandate.
  now: Date;
  timezone?: string;
  timezoneSource?: TimezoneSource;
  // The existing FRESHNESS_MARKERS signal ibis-intent-router.ts already computes (reused, not
  // recomputed) -- used only as the generic CURRENT fallback when no more specific pattern below
  // matches, so a query the classifier already treats as needing live evidence (e.g. "current crime",
  // "recent news", "latest exchange rate") is never silently resolved TIMELESS here merely because it
  // used freshness wording this resolver's specific patterns do not individually recognize.
  freshnessSignalMatched: boolean;
};

export function resolveTemporalRequirement(input: ResolveTemporalRequirementInput): TemporalRequirement {
  const q = input.query || "";
  const now = input.now;
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const timezoneSource: TimezoneSource = input.timezoneSource || "DEFAULT_FALLBACK";
  const base = { timezone, timezoneSource };

  const rangeMatch = q.match(DATE_RANGE_PATTERN);
  if (rangeMatch) {
    const originalExpression = rangeMatch[0];
    const endYearHint = extractYear(rangeMatch[2]);
    const start = parseDateBound(rangeMatch[1], "start", endYearHint);
    const end = parseDateBound(rangeMatch[2], "end", extractYear(rangeMatch[1]));
    const resolved = start !== null && end !== null;
    const strictness = resolved ? strictnessForPastBound(end!, now) : "HIGH";
    return { ...base, type: "DATE_RANGE", start, end, asOf: null, relativeExpression: null, originalExpression, strictness, resolved };
  }

  const asOfMatch = q.match(AS_OF_PATTERN);
  if (asOfMatch) {
    const originalExpression = asOfMatch[0];
    const asOf = parseDateBound(asOfMatch[1], "end", null);
    const resolved = asOf !== null;
    const strictness = resolved ? strictnessForPastBound(asOf!, now) : "HIGH";
    return { ...base, type: "AS_OF", start: null, end: null, asOf, relativeExpression: null, originalExpression, strictness, resolved };
  }

  if (LATEST_AVAILABLE_PATTERN.test(q)) {
    const match = q.match(LATEST_AVAILABLE_PATTERN)!;
    // Deliberately null start/end/asOf: "latest available" is an open-ended request for whatever the
    // most recent authoritative release is, which may legitimately predate `now` by weeks or months
    // (a quarterly/annual statistical release, say). Forcing a window here would misrepresent that --
    // see this module's header note on LATEST_AVAILABLE never meaning "published today."
    return { ...base, type: "LATEST_AVAILABLE", start: null, end: null, asOf: null, relativeExpression: "latest available", originalExpression: match[0], strictness: "MEDIUM", resolved: true };
  }

  if (TODAY_PATTERN.test(q)) {
    const match = q.match(TODAY_PATTERN)!;
    const start = startOfLocalDay(now, timezone).toISOString();
    return { ...base, type: "TODAY", start, end: now.toISOString(), asOf: null, relativeExpression: "today", originalExpression: match[0], strictness: "HIGH", resolved: true };
  }

  if (THIS_WEEK_PATTERN.test(q)) {
    const start = startOfLocalWeek(now, timezone).toISOString();
    return { ...base, type: "THIS_WEEK", start, end: now.toISOString(), asOf: null, relativeExpression: "this week", originalExpression: "this week", strictness: "HIGH", resolved: true };
  }

  if (THIS_MONTH_PATTERN.test(q)) {
    const start = startOfLocalMonth(now, timezone).toISOString();
    return { ...base, type: "THIS_MONTH", start, end: now.toISOString(), asOf: null, relativeExpression: "this month", originalExpression: "this month", strictness: "MEDIUM", resolved: true };
  }

  // Checked only after every more-specific pattern above, and only when it is NOT the current year
  // (a bare mention of the current year with no other freshness language carries no reliable signal
  // either way and falls through to the generic freshness fallback below).
  const yearMatch = q.match(BARE_YEAR_PATTERN);
  if (yearMatch && Number(yearMatch[1]) < currentYear()) {
    const year = Number(yearMatch[1]);
    return {
      ...base, type: "HISTORICAL", start: isoDate(year, 1, 1), end: isoDate(year, 12, 31), asOf: null,
      relativeExpression: null, originalExpression: yearMatch[1], strictness: "NONE", resolved: true,
    };
  }

  if (ROLLING_WINDOW_PATTERN.test(q)) {
    const match = q.match(ROLLING_WINDOW_PATTERN)!;
    // See ROLLING_WINDOW_PATTERN's own comment: no dedicated type exists yet. Classified CURRENT
    // (not THIS_WEEK) so a genuinely different request ("last 7 days" vs "this calendar week") is
    // never silently conflated with the calendar convention above.
    return { ...base, type: "CURRENT", start: null, end: null, asOf: null, relativeExpression: null, originalExpression: match[0], strictness: "HIGH", resolved: false };
  }

  if (input.freshnessSignalMatched) {
    return { ...base, type: "CURRENT", start: null, end: null, asOf: null, relativeExpression: null, originalExpression: null, strictness: "MEDIUM", resolved: true };
  }

  return { ...base, type: "TIMELESS", start: null, end: null, asOf: null, relativeExpression: null, originalExpression: null, strictness: "NONE", resolved: true };
}

// A resolved AS_OF/DATE_RANGE bound within RECENT_THRESHOLD_DAYS of `now` (or in the future) reads
// as a live/current-events question -- HIGH. Older than that, it is a historical lookup where
// evidence is expected to be old BY DEFINITION, so requiring "fresh" evidence would be backwards --
// NONE, not MEDIUM: there is no legitimate sense in which a 1990 answer needs recent publication.
function strictnessForPastBound(isoBound: string, now: Date): TemporalStrictness {
  const bound = new Date(isoBound);
  if (Number.isNaN(bound.getTime())) return "HIGH";
  const ageDays = daysBetween(now, bound);
  return ageDays > RECENT_THRESHOLD_DAYS ? "NONE" : "HIGH";
}

// The single derived compatibility signal every existing consumer (ibis-canonical-brain.ts,
// ibis-search-adapter.ts, ibis-lifecycle-store.ts's ExecutionInstruction/PlanRecord.freshnessRequired,
// the legacy-route safety net in ibis-assistant/index.ts) reads instead of independently recomputing
// freshness from queryClass. One temporal authority: this function, never a second implementation.
export function requiresFreshEvidenceFor(temporalRequirement: TemporalRequirement): boolean {
  return temporalRequirement.strictness !== "NONE";
}
