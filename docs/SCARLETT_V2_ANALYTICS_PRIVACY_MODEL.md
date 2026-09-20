# Scarlett V2 — analytics privacy model

Date: 2026-09-19
Scope: `apps/ftn-scarlett-browser-extension/analytics.js`, `analytics-dashboard.html/.js`

## What exists today

A real, local-only event log. Every event is appended to `chrome.storage.local` on the user's own
device, in their own browser profile. **No event, ever, in this build, is transmitted anywhere.**
This is enforced structurally, not just by policy: `analytics.js` contains no `fetch`,
`XMLHttpRequest`, or `navigator.sendBeacon` call anywhere, and `tests/scarlett-audit.mjs` greps the
file to confirm that stays true.

## What can be logged

An explicit allowlist (`KNOWN_EVENTS`) is the only set of event names `logEvent()` will accept:
`activation`, `session_start`, `mode_applied`, `transform_used`, `compare_used`, `blend_used`,
`shield_status_viewed`, `shield_enabled`, `shield_disabled`, `shield_exception_added`,
`search_used`, `find_used`, `ibis_handoff`, `headspace_handoff`, `paywall_impression`, `error`. A
call site cannot invent a new event name that silently starts logging something outside this list.

## What can never be logged, structurally

`sanitize()` runs on every event's properties before they're stored, and drops:

- any property whose **name** matches `/url|href|query|text|content|title|email|selector|selection/i`
  — this is a name-based filter, so it catches a mistake at the call site even if the *value*
  looks harmless.
- any string value longer than 40 characters (long enough for a mode name or category label, too
  short for a meaningful chunk of page text or a URL).
- any value that isn't a plain string, number or boolean (no nested objects, no arrays that could
  smuggle content).

What survives: mode names, page types, risk levels, category labels, counts, booleans, confidence
levels. Verified live: after a real usage sequence on a fixture titled "Villa for sale" at
`http://127.0.0.1:.../`, neither string appeared anywhere in the stored event log.

**Search/Find specifically**: the query text the user typed is never logged, by design — only the
local, keyword-based intent classification (`SHOPPING`, `OPPORTUNITY`, `LOCATION`,
`CURRENT_EVENTS`, `RESEARCH`, `GENERAL`) and the result count.

## Where it's visible

`analytics-dashboard.html`, opened from the popup ("View local usage log"). Its own header states
plainly, before any data is shown: this browser profile only, nothing transmitted, not a founder
dashboard aggregating real users. It is a proof that the schema works, not a product feature aimed
at end users or at FTN's leadership.

## What is NOT built, and why

The product definition asks for founder-visible dashboards showing installs, DAU/WAU/MAU,
retention, conversion, acquisition channel, and more, aggregated across real users. Building that
requires:

1. A decision to actually start collecting usage data from real users and transmit it somewhere.
2. Real backend infrastructure to receive, store and aggregate it (either new infrastructure or
   reusing FTN's existing Umami-based site analytics, which is not built for extension-originated
   events today).
3. A real privacy policy update disclosing the new collection to users.

None of that has happened in this pass. This is a **deliberate scope boundary**, not an oversight:
per the product definition's own decision framework, standing up new data collection is exactly the
kind of consequential, "prepare now, decide later" item that shouldn't be silently built into a
client-side extension change. The schema and privacy boundary above are the real, useful artifact —
whenever FTN decides to wire a real destination, the event shapes, the allowlist, and the
sanitization discipline are already correct and tested; only the transport needs to change.
