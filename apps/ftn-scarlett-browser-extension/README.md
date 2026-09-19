# Scarlett by FTN

Scarlett is FTN's adaptive interface layer for existing digital environments.

## Scope (V1 + V2 consumer pass)

- Manifest V3 extension, two permission tiers: Scarlett Core (always on) and Scarlett Shield
  (opt-in, see below).
- local page understanding (page/app type, risk, Site DNA, decision-relevant facts: pricing,
  deadlines, eligibility language, downloads, warnings, accessibility signals, focus state)
- risk/sensitivity classification
- full mode continuum: Original / Assist / Adapt / Transform / Compare / Blend
- automatic downgrade to Assist on sensitive pages and complex Google applications (Adapt,
  Transform and high Blend levels all collapse to the same Assist-only outcome)
- Representation Engine + Scarlett Deck: Transform builds a task-focused deck grounded entirely in
  real page-model facts (never invents content, never asks a model to generate UI); falls back to
  Adapt when a page doesn't have enough grounded structure
- a signature transformation moment (a brief computational-scan animation, ~460ms, collapsed to
  near-instant under `prefers-reduced-motion`) when Transform mounts
- Scarlett Reveal: Compare shows an ephemeral, local-only pre-transformation screenshot in a
  draggable Original/Scarlett slider (captured via `chrome.tabs.captureVisibleTab`, reusing the
  same `activeTab` grant the popup already needs -- no new permission); the capture is never
  written to storage or sent anywhere
- Blend: a staged 0/20/40/60/80/100 intervention slider, each stop a fixed named operation set
  (structural, not an opacity/CSS-filter gimmick), capped at 20% (accessibility/focus only) on a
  sensitive or app surface
- reversible presentation ledger (every mutation recorded with an operation id, type, reason,
  timestamp and previous state before it is applied); Transform hides the original region rather
  than removing it, so restore is structurally guaranteed
- explicit transformation-policy contract (requested vs. effective mode, reason, risk level,
  preserved regions, allowed/blocked operation classes)
- optional, compact user-intent field (never changes mode selection; only affects what is shown
  before a handoff and whether the Headspace escalation is offered)
- restrained Scarlett control and assistance panel
- local, reversible, persisted accessibility controls (larger text, more spacing/wider targets,
  stronger focus outline) — truthfully labelled, never claimed as WCAG compliance
- **Data Faucet**: shows what a page is actually talking to (analytics/advertising/social/
  functionally-required/unknown, from a curated, disclosed domain registry -- never claimed as
  complete tracker visibility), observed via a read-only `webRequest` listener once Shield is on
- **Shield**: real blocking via `declarativeNetRequest` dynamic rules; payment/CDN/font
  infrastructure is never blockable; a local, per-site exception list ("Site broken?") for
  recovery; "Close/Open the Faucet" toggles blocking without revoking the permission
- deliberate, review-before-send handoff into FTN ibis
- deliberate, review-before-send escalation into FTN ibis Headspace, offered only when a task
  looks genuinely multi-step (a listing/service page with real decision facts, or user intent
  naming a comparison/decision), never embedded in the page
- no browsing-history collection, no full-page upload, no automatic AI call
- **Search with Scarlett / Find with Scarlett**: reuses the exact same canonical FTN ibis MCP
  endpoint and verified-real tool names (`search`, `opportunity_scout`) the shipped
  `ftn-ibis-browser-extension` already calls -- not a new retrieval stack. Only on explicit submit;
  never sends page content, URL or an identifier, just the typed query
- **Entitlements**: a real, central tier/capability data model (`entitlements.js`) and an honest
  preview-selling note after Transform is used -- but no real payment processor is wired to
  anything; every capability this build implements is free and unrestricted
- **Analytics**: real, local-only event logging (never a network call, an explicit event-name
  allowlist, a structural filter against anything that looks like page content/URLs/queries/
  identifiers) plus a local demo dashboard; no real founder-facing cross-user backend exists
- See `docs/SCARLETT_V2_ARCHITECTURE_2026-09-19.md`, `docs/SCARLETT_V2_INVESTOR_READINESS_2026-09-19.md`
  and `docs/SCARLETT_V2_ANALYTICS_PRIVACY_MODEL.md` for full detail on what's built vs. explicitly
  not wired to real infrastructure yet.

## Architecture boundary

Scarlett understands enough locally to choose safe presentation behavior. It does not become a second intelligence brain. Semantic research/reasoning belongs to ibis. Complex multi-artifact work belongs in Headspace.

## Permission architecture: Scarlett Core vs. Scarlett Shield

**Scarlett Core** (`activeTab`, `scripting`, `storage`, plus the four exact FTN host permissions
below): everything except Data Faucet/Shield. Present from first install, never expands silently.

**Scarlett Shield** (`optional_permissions: ["webRequest", "declarativeNetRequest"]`,
`optional_host_permissions: ["<all_urls>"]`): requested only when the user clicks "Turn on Data
Faucet Protection" in the popup -- never on install, never from a content script (Chrome only
allows `chrome.permissions.request()` from a genuine user gesture in an extension page). Before
that click, the popup states plainly what Scarlett gains access to (which sites a page talks to,
on every site visited), why (to show and optionally block trackers), what stays local (everything
-- no upload), what FTN receives (nothing), and how to disable it (one click, which calls
`chrome.permissions.remove()` and clears all Shield state).

- **Why `<all_urls>` specifically**: Data Faucet's whole value is seeing third-party activity on
  *any* site the user visits, not just a pre-listed set -- a narrower host permission would defeat
  the feature.
- **Risk**: `webRequest` here is read-only (no blocking capability requested); actual blocking uses
  `declarativeNetRequest`'s rule engine, which Chrome evaluates without handing raw request bodies
  to the extension. Per-tab observation logs are in-memory only, cleared on tab close and on every
  navigation (never accumulated across page loads), and never leave the browser.
- **Alternative considered**: `webRequestBlocking` for both observing and blocking in one API.
  Rejected -- it's deprecated for blocking use in Manifest V3, and `declarativeNetRequest` is the
  platform's own replacement.
- **Exact scope**: `webRequest` (observe), `declarativeNetRequest` (block), `<all_urls>` (host
  access for both). Revoking Shield removes all three in one action.

## Host permission scope (Core; documented per FTN security review discipline)

`host_permissions` and the matching `content_scripts` entry are limited to four exact FTN-owned
paths: `ibis-ai` (the ibis workspace) and `ibis-headspace-preview` (the Headspace escalation
target), each on the apex and `www` host. No wildcard/broad host permission is requested in Core.

- **Why**: the review-before-send bridge (`ibis-handoff.js`) needs to run on the destination page
  to detect the user's explicit "Insert"/"Continue" action and place the reviewed context into that
  page's own input — it cannot do this from the background service worker, which has no DOM access.
- **Risk**: the script only runs on these two FTN-owned paths; it never runs on the page the user
  was adapting, never reads page content there, and never auto-submits.
- **Alternative considered**: keep the extension scoped to `ibis-ai` only and route Headspace
  escalation through the same page. Rejected because `/ibis-headspace-preview/` is a distinct route
  ibis-ai/index.html itself links to as "Open Headspace" — pointing the escalation at the wrong page
  would misrepresent what the user is entering.
- **Exact scope**: `https://ftnplatform.org/ibis-ai/*`, `https://www.ftnplatform.org/ibis-ai/*`,
  `https://ftnplatform.org/ibis-headspace-preview/*`, `https://www.ftnplatform.org/ibis-headspace-preview/*`.

## Manual load

Load this directory as an unpacked Chromium extension.

## Test surfaces

1. article/content page
2. commercial/listing page
3. public/government information page
4. Google Docs or Sheets

Google applications must remain in Assist mode (Adapt/Transform/deep Blend all collapse to Assist there).
