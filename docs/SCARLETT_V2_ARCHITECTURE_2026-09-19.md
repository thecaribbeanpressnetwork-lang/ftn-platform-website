# Scarlett V2 — consumer architecture

Date: 2026-09-19
Branch: `feature/scarlett-consumer-v2` (from `feature/scarlett-adaptive-interface-v1`)
Companion documents: the three V1 docs (audit/build-plan, architecture/security, investor
readiness) still describe the Original/Assist/Adapt foundation this branch extends, not replaces.

This document covers only what V2 actually added. Where a capability is data-model-only or
explicitly not wired to real infrastructure, it says so plainly — see §7.

## 1. Mode contract (extends V1 §C)

`transformation-policy.js` now resolves six modes: `ORIGINAL, ASSIST, ADAPT, TRANSFORM, COMPARE,
BLEND`. The downgrade rule V1 established for Adapt (sensitive surface → Assist; known app →
Assist) applies identically to Transform — there is no separate, weaker rule for the newer mode.

**Blend** is a staged intervention *level*, not a seventh mode with its own visual language. Six
fixed stops, each mapped to a named operation set:

| Level | Label | Operations | Visual mode used |
|---|---|---|---|
| 0 | Original | none | (none) |
| 20 | Accessibility/focus assistance | `focus-enhancement` | Assist |
| 40 | Assist | Assist operations | Assist |
| 60 | Adapt | Adapt operations | Adapt |
| 80 | Deep adaptation | Adapt + `hide-original-region` | Adapt |
| 100 | Full permitted Transform | Transform operations | Transform |

A risk-capped ceiling applies structurally: `maxBlendLevel()` returns 20 (never 0 — accessibility
help stays available) on a sensitive surface or known app, 100 otherwise. Live-verified: sweeping
all six stops on a normal page produced the exact mode-attribute sequence above; requesting 100 on
a sensitive fixture was silently capped to 20 with reason `SENSITIVE_SURFACE_ASSIST_ONLY`.

**Compare** is not itself a presentation-changing mode — it renders whatever the "base" Scarlett
mode would be (defaults to `state.lastScarlettMode`) and overlays an ephemeral, local
pre-transformation screenshot in a draggable reveal slider (`chrome.tabs.captureVisibleTab`, no new
permission — reuses the same `activeTab` grant `scripting.executeScript` already needs). If the
grant has lapsed since the popup was last opened (a real Chrome constraint: `captureVisibleTab`
requires an active gesture-derived grant, not merely a declared permission), Compare still applies
the base mode and says plainly that the before-view isn't available this time, rather than showing
nothing extra with no explanation.

## 2. Representation Engine + Scarlett Deck

Two new modules, deliberately separated:

**`representation-engine.js`** decides *what* to show for Transform. A fixed lookup table keyed on
`pageType` (`LISTING`, `FORM_SERVICE`, `ARTICLE` in V2 — the three page types the existing page
model can ground with real facts) builds a `RepresentationSpec`:

```js
{
  version: 'SCARLETT_REPRESENTATION_V1',
  representationType,       // 'deck' | 'process' | 'reading'
  sections,                 // [{ id, title, kind, bindingIds }]
  sourceBindings,           // { bindingId: { text | list | facts | links | actions } }
  actions,                  // [{ id, kind, label }]
  confidence,                // 'HIGH' | 'MEDIUM'
  transformationOperations,
  reversibilityPlan: 'hide-original-show-deck',
}
```

Every section's `bindingIds` point at real page-model facts (title, description, headings, the same
pricing/deadline/eligibility facts V1's page-understanding already extracts, downloads, top
actions) — never generated copy, never a call to any model. A builder returns `null` when there
isn't enough grounded material (e.g. an article with fewer than 2 real headings), and Transform
falls back to Adapt with an honest reason (`NO_GROUNDED_REPRESENTATION_FALLBACK_ADAPT`) rather than
fabricating a deck. The engine also refuses outright for a known app or `risk.level === 'HIGH'`,
mirroring the policy layer's own refusal so it can never be reached out of band.

Live-verified deck output for the three built page types:

- LISTING → `deck` with OVERVIEW / PRICE / ACTIONS / DOCUMENTS tabs (real price, real deadline/
  eligibility facts, real download link).
- FORM_SERVICE → `process` with WHAT THIS IS / WHO QUALIFIES / WHAT YOU NEED / DEADLINE / HOW TO
  APPLY — matches the product definition's own example taxonomy exactly.
- ARTICLE → `reading` with OUTLINE (real headings) / KEY FACTS / SOURCES.

**`deck-renderer.js`** is a pure DOM renderer — given a spec and a container, it builds real,
interactive tabs/panels. No `innerHTML` anywhere. A mirrored native action (a listing's "Contact
agent", a service's "Submit application") renders **disabled**, titled "This mirrors a control on
the original page. Use Original to interact with it directly." — Scarlett never re-implements a
foreign site's own submit/purchase/contact control inside the deck.

**Reversibility**: Transform hides the grounded main region via the same ledger-tracked
`setAttr`/`restoreLedger` mechanism V1's Adapt already uses (`data-ftn-scarlett-hidden` + a scoped
`display:none` rule) — it is never removed from the DOM. Live-verified: after mounting a deck and
then switching to Original, the hidden region's own content (a listing's "Contact agent" button
text) was confirmed present and unhidden again.

## 3. Signature transformation moment

`runScanAnimation()` — a single ~460ms sweep (a CSS gradient pass, not a screenshot or particle
effect) runs before the deck mounts, collapsed to ~1ms under `prefers-reduced-motion`. It explains
that a pass happened; it does not gate or delay functionality beyond its own short duration.
Measured live (including the animation): Transform mount averaged 500–570ms end to end on the
fixtures tested.

## 4. Data Faucet / Shield

Two permission tiers, enforced structurally, not just by convention:

- **Scarlett Core**: unchanged from V1 (`activeTab`, `scripting`, `storage`, four exact FTN host
  permissions).
- **Scarlett Shield**: `optional_permissions: ["webRequest", "declarativeNetRequest"]`,
  `optional_host_permissions: ["<all_urls>"]` — requested only via `chrome.permissions.request()`
  from a genuine user-gesture click in `popup.js` ("Turn on Data Faucet Protection"), which states
  what Scarlett gains access to, why, what stays local, what FTN receives (nothing) and how to
  disable it, before asking. A content script cannot request this permission at all (Chrome
  restricts `permissions.request()` to extension pages responding to a real gesture) — the in-page
  Data Faucet panel points the user at the popup instead of pretending to turn itself on.

**Observation** (`shield.js`): a read-only `chrome.webRequest.onBeforeRequest` listener classifies
every request against `tracker-registry.js` — a curated, disclosed, categorized domain list
(analytics/advertising/social/functionally-required), explicitly not a claim of complete tracker
coverage. The page's own top-level navigation and same-origin requests are excluded from the tally
(fixed live: they were originally miscounted as an "UNKNOWN" third party). Per-tab logs are
in-memory only, cleared on tab close and on every navigation.

**Blocking**: real `declarativeNetRequest` dynamic rules, generated from
`tracker-registry.js`'s `blockableDomains()` — payment/CDN/font infrastructure
(`js.stripe.com`, `cdnjs.cloudflare.com`, `fonts.gstatic.com`, etc.) is marked `neverBlock` and can
never get a rule, so Shield cannot break checkout or code delivery. A local, disclosed per-site
exception list ("Site broken?") regenerates the rule set with an `excludedInitiatorDomains` entry
rather than disabling Shield globally.

Live-verified end to end (with the optional bundle declared as already-granted in a QA-only
manifest copy, since the native Chrome consent dialog cannot be automated by any tool): 4 known
trackers across 3 categories correctly detected and blocked; 1 payment domain correctly left
unblocked; exactly 33 dynamic rules generated, matching the registry's blockable-domain count
precisely; a site exception correctly regenerated the rule set with the right exclusion; disabling
blocking cleared all rules.

## 5. Search with Scarlett / Find with Scarlett

`ibis-search-client.js` calls the **same canonical FTN ibis MCP endpoint and the same verified-real
tool names** (`search`, `opportunity_scout`) the already-shipped
`apps/ftn-ibis-browser-extension/ibis-api.js` calls in production — not a new, disconnected
retrieval stack. Search sends the raw query to `search`. Find sends the user's full stated
objective and a local, deterministic keyword classifier (`classifyIntent()`) picks the result
*representation* (comparison-grid / opportunity-cards / map / timeline / evidence / links) — there
is no separate, verified "planning" tool on the MCP server to call honestly, so that is V2's real,
disclosed scope: Find differs from Search in framing and presentation, not in a deeper ibis
reasoning pipeline that doesn't actually exist server-side yet.

Only ever called on an explicit form submit, never on keystroke; never sends page content, page
URL, browsing history or any identifier — just the typed string.

**Bug found and fixed live** (not a guess — a real cross-origin request from the extension popup):
`ftn-ibis-mcp`'s own CORS preflight response only allows `content-type, accept, mcp-session-id` in
`access-control-allow-headers`. The shipped `ibis-api.js` sends `apikey`/`authorization`, which gets
the whole request blocked by the browser before it reaches the server — confirmed via a direct curl
`OPTIONS` check against the live endpoint, and confirmed the function's own handler never reads
either header (a plain curl `POST` with neither header returns 200 with identical results).
`ibis-search-client.js` was written to send only the headers the server's CORS policy actually
allows. **This same bug likely affects the shipped ibis extension for real users today** — flagged
as a separate task rather than editing shared backend infrastructure from this branch.

Live-verified against the real, production endpoint: Search returned a real FTN-registry result
with correct rendering; Find correctly reported "no indexed result matched" (not a fabricated
result) for queries the curated registry has no match for.

## 6. Entitlement / analytics architecture

Both explicitly **data-model-and-instrumentation only** in this pass — see §7 for what that means
and why.

**`entitlements.js`**: a central capability/tier config (not hardcoded pricing checks scattered
through the UI) matching the product definition's four pricing hypotheses. Truth-in-labeling is
structural: only `free` is `status: 'LIVE'`; every paid tier is `'PLANNED'`. Every capability this
build actually implements is included in `free` — nothing built is gated. The Transform deck shows
an honest "preview of what Scarlett+ includes" note only because the data model marks Transform
`previewIn: ['free']`, driven by the data, not a hardcoded string, and only *after* the user has
already used the real, fully-working feature (preview-selling, not a paywall).

**`analytics.js`**: real, local-only event logging (`chrome.storage.local`, this browser profile
only, never a network call). An explicit event-name allowlist and a structural property filter
(rejects anything that looks like a URL/query/content/title/identifier by name, regardless of what
a call site passes) bound what can ever be logged. Instrumented: `activation`, `mode_applied`,
`transform_used`, `compare_used`, `blend_used`, `shield_enabled`/`disabled`,
`search_used`/`find_used` (intent classification only, never the query text), `ibis_handoff`,
`headspace_handoff`, `paywall_impression`. A local demo dashboard
(`analytics-dashboard.html`) proves the schema populates correctly and states in its own header
that it is not a founder dashboard aggregating real users.

**Bug found and fixed live**: `logEvent()`'s `chrome.storage.local` read-modify-write was not
atomic — a burst of events firing synchronously within one mode application raced and silently
dropped the middle one (confirmed: a 3-event burst landed only 2). Fixed with a per-realm write
queue chaining every write through one promise.

## 7. What "prepare, don't build" actually means here (read before demoing either of these)

- **No real payment processor is integrated anywhere.** Clicking "See FTN plans" opens a real,
  existing FTN page (`https://ftnplatform.org/ibis/pricing/`); nothing in Scarlett can charge a
  card, create a subscription, or check a real entitlement against a server. Wiring one is a
  genuine new-vendor-dependency, real-money-movement decision left for FTN to make deliberately.
- **No real analytics backend is wired.** The dashboard reads this device's own local log. Turning
  this into a real founder-visible, cross-user dashboard requires deciding to start collecting real
  usage data and standing up (or reusing) real aggregation infrastructure — a separate, deliberate
  decision, not something this pass silently opted into.

## 8. Security notes specific to V2 additions

- No new required permission: Core is unchanged. Shield's three-item optional bundle is the only
  expansion, and it is entirely opt-in with the disclosure the product definition requires.
- `declarativeNetRequest` rules are declarative blocking — Scarlett never inspects or modifies
  request/response bodies for blocked requests.
- The Compare screenshot is never written to `chrome.storage`, never sent anywhere, and is
  discarded (the DOM node removed) on the next mode switch or Original.
- `entitlements.js` and `analytics.js` both contain zero network-call code paths (enforced by the
  test suite, which greps every extension source file for `fetch`/`XMLHttpRequest`/`sendBeacon`,
  `ibis-search-client.js` excepted and separately checked for exactly the canonical endpoint).
