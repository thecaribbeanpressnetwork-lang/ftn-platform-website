# Scarlett V1 — architecture, privacy and security model

Date: 2026-09-19
Branch: `feature/scarlett-adaptive-interface-v1`
Scope: `apps/ftn-scarlett-browser-extension/`

This document describes what is actually implemented as of this pass, not an aspirational design.
Where a capability is scoped for a later phase, it is named explicitly as **not yet implemented**.

## A. Architecture

```text
Browser Shell (MV3 extension, activeTab + scripting + storage only)
    │
    ▼
Page Understanding (page-understanding.js)
    local, bounded, deterministic DOM read: page/app type, risk, Site DNA,
    regions, primary actions, decision-relevant facts (price, deadline,
    eligibility language, downloads, warnings), accessibility signals,
    focus/editable-surface state
    │
    ▼
Intent Context (in-memory, panel-entered, optional)
    a single free-text field; never changes mode selection; only affects
    what is shown before a handoff and whether Headspace escalation is offered
    │
    ▼
Risk / Sensitivity Classification (page-understanding.js: sensitivity())
    password/payment fields, health/financial/identity language,
    government-auth combinations -> HIGH vs NORMAL
    │
    ▼
Transformation Policy (transformation-policy.js)
    least-invasive mode selection; returns an explicit contract:
    { requestedMode, effectiveMode, reason, riskLevel, preservedRegions,
      allowedOperations, blockedOperations }
    │
    ▼
Transformation Engine (content.js: setAttr/restoreLedger)
    every mutation is ledgered before it is applied: operationId,
    operationType, reason, source, timestamp, previous/new state,
    reversible:true. Original replays the ledger in reverse.
    │
    ▼
Scarlett UI (content.js: panel + compact control)
    Original ⇄ Scarlett toggle; progressive disclosure of Assist/Adapt;
    accessibility toggles; optional intent field; Ask ibis / Open in Headspace
    │
    ▼ (only on explicit user click)
optional ibis handoff (review-before-send bridge, ibis-handoff.js on
    https://ftnplatform.org/ibis-ai/*)
    │
    ▼ (only on explicit user click, only when offered)
optional Headspace escalation (same review-before-send bridge, on
    https://ftnplatform.org/ibis-headspace-preview/*)
    │
    ▼ (not built in V1)
optional governed action (Connection Fabric / Permission Ledger) -- Scarlett
    does not call these directly in V1; any future action execution belongs
    to ibis, per the product boundary below
```

### Product boundary (unchanged from the audit/build-plan docs)

- **ibis** reasons: evidence, provenance, governed action.
- **Headspace** is the workspace a complex intention unfolds inside — same underlying `/ibis-ai/`
  surface family, reached at `/ibis-headspace-preview/` for the dedicated spatial workspace.
- **Scarlett** only changes how the *existing* page is presented and interacted with. It never
  becomes a second intelligence brain: no local LLM calls, no server-side reasoning of its own.

## B. The page model (`SCARLETT_PAGE_MODEL_V2`)

Local-only, single-pass, bounded (body text sampling capped at 20,000 characters; result lists
capped at 5–10 items). No network call anywhere in `page-understanding.js`.

| Field | Source | Notes |
|---|---|---|
| `pageType` | heuristics over `<article>`, schema.org JSON-LD, form+keyword combinations | `ARTICLE` / `LISTING` / `FORM_SERVICE` / `APP` / `GENERIC` |
| `app` | host + path match | Google Docs/Sheets/Gmail/Calendar only in V1 |
| `risk` | password/payment field presence, health/financial/identity/government-auth language | `HIGH` downgrades Adapt to Assist |
| `site` | `theme-color`, computed button/link color, computed body font/background/foreground | Site DNA sampling |
| `regions` | counts of `nav`, `main`/`article`, `form`, `table`/`[role=grid]`, `dialog` | |
| `actions` | scored, deduplicated top-8 visible interactive elements | verb/position scoring, no destination inspection |
| `content` | title, meta description, up to 8 headings, list count | |
| `commerce.pricing` | currency-pattern matches | up to 5, deduplicated |
| `deadlines` | "deadline/closes/due by/apply by/expires" phrase matches | up to 5 |
| `eligibilitySignal` | boolean, "eligib.../requirements:/who can apply" language | |
| `downloads` | visible `.pdf`/`.doc`/`.docx`/`[download]` links | up to 10 |
| `warnings` | `[role=alert]` and warning/error-class elements | up to 6 |
| `accessibility` | images missing `alt`, form fields missing an accessible label, `prefers-reduced-motion` | counts only, not element references |
| `focus` | whether an element currently has focus, and whether it is an editable surface | used to avoid ever disturbing an active edit |
| `potentialClutterCount` | count of aside/promo/advert/newsletter/cookie-banner-shaped elements | the actual node list stays non-enumerable/internal, never serialized off the page |

Everything above is derived from semantic HTML, ARIA, computed styles, visible text and layout —
never from raw tag-name guessing alone, and never by asking a model to classify anything.

## C. Transformation policy contract

`transformation-policy.js` returns, for every `resolve(model, requestedMode)` call:

```js
{
  requestedMode,      // what was asked for
  effectiveMode,      // what was actually applied (may be downgraded)
  reason,             // e.g. SENSITIVE_SURFACE_ASSIST_ONLY, COMPLEX_APP_MUSCLE_MEMORY, USER_OR_DEFAULT
  riskLevel,          // HIGH | NORMAL
  preservedRegions,   // e.g. ['navigation','forms','editable-surface']
  allowedOperations,  // bounded per-mode operation-class list
  blockedOperations   // ALWAYS_BLOCKED, regardless of mode
}
```

`ALWAYS_BLOCKED` is not conditional on mode or risk — it is a fixed list Scarlett never does in V1:
`reorder-dom`, `remove-content`, `change-form-destination`, `modify-account-controls`,
`modify-payment-controls`, `modify-security-controls`, `auto-submit`.

Default policy table (matches the product-definition doc, section 9):

| Surface | Effective mode |
|---|---|
| Google Docs / Sheets / Gmail / Calendar | ASSIST (forced, even if Adapt requested) |
| Any page with `risk.level === HIGH` (password/payment/health/financial/identity/gov-auth) | ASSIST (forced, even if Adapt requested) |
| Article / Listing / Form-service | ADAPT by default, reversible |
| Everything else | ASSIST by default |

## D. Transformation engine / ledger

Every DOM mutation Scarlett makes goes through `setAttr(el, name, value, meta)`, which:

1. Records a ledger row the *first* time that `(element, attribute)` pair is touched in the current
   session: `operationId`, `operationType`, `reason`, `source: 'SCARLETT'`, `reversible: true`,
   `timestamp`, `had` (whether the attribute existed before), `previousState`, `newState`.
2. Applies the mutation.

`restoreLedger()` (called by Original, and internally at the start of every mode switch, since each
switch rebuilds from a clean slate) replays the ledger **in reverse** and clears it. Scarlett never
uses `innerHTML`, never removes a DOM node, never reorders content — every operation is an
attribute/CSS-custom-property change scoped by a `data-ftn-scarlett-*` attribute and a stylesheet
Scarlett owns and removes on Original. This is what makes "Original restores exactly" a structural
guarantee rather than a claim: the only way content changes at all is through this ledgered path,
and a reload independently restores the untouched page regardless.

## E. Application-adapter strategy

Generic-first: `page-understanding.js`'s `pageType()`/`sensitivity()` handle the overwhelming
majority of the web with no special-casing. Named adapters exist **only** where generic behavior is
insufficient to make the right safety call — currently Google Docs, Google Sheets, Gmail and Google
Calendar, detected by exact host+path match, forced to ASSIST, with native editing, menus, keyboard
shortcuts and selection left untouched (Scarlett only ever adds a side panel and, on Adapt-eligible
pages, presentation attributes — it never touches `contenteditable` surfaces inside a known app).
Any future adapter should meet the same bar: don't add one unless generic behavior is unsafe or
unhelpful there.

## F. Privacy architecture

**Stays local, always:**
- DOM analysis, page/app classification, risk/sensitivity classification, Site DNA extraction,
  transformation ledger, in-memory intent text.
- Accessibility preferences (`chrome.storage.local`, per browser profile, never transmitted).

**Can leave the device, only on an explicit click, only as a minimized package:**
- The ibis/Headspace handoff: a single object (`SCARLETT_HANDOFF_V1`) written to
  `chrome.storage.session` (cleared after 15 minutes or on Insert/Discard) — source URL, source
  title, page type, app id, risk level, the user's own intent text (≤220 chars), selected text
  (≤1800–4000 chars) or a short visible-context summary (≤5000 chars). It is inserted into the
  destination page's own input field only after the user clicks **Insert into ibis** /
  **Continue in Headspace**; **Discard** clears it with nothing sent anywhere.
- The background service worker opening a new tab at `ftnplatform.org/ibis-ai/` or
  `ftnplatform.org/ibis-headspace-preview/` — no payload in the URL.

**Never happens:**
- No `fetch`/`XMLHttpRequest`/`sendBeacon` anywhere in the extension (enforced by
  `tests/scarlett-v1-audit.mjs`, which greps every source file for network-call patterns).
- No browsing-history or cookie access (`history`/`cookies` permissions are asserted absent).
- No screenshot/full-page capture, no continuous polling, no background collection.
- No AI call from the extension itself — the only server contact is the user opening the ibis/
  Headspace tab, which is FTN's own separately-audited product.

## G. Security model

**Manifest V3, minimal permissions**: `activeTab`, `scripting`, `storage` only.
**Host permissions**: four exact FTN-owned paths, apex + `www` for each —
`ftnplatform.org/ibis-ai/*` and `ftnplatform.org/ibis-headspace-preview/*`. No `<all_urls>`, no
broad host wildcard. Justification for the Headspace addition is recorded in the extension's own
README (why / risk / alternative considered / why it failed / exact scope), per FTN's permission
discipline.

**CSP**: `script-src 'self'; object-src 'self'` on extension pages — no remote code, no `eval`.

**Sensitive fields**: password fields, payment-autocomplete fields, and (via the risk classifier)
health/financial/identity/government-auth language force ASSIST and are also explicitly excluded
from the clutter-deprioritization candidate list (`clutterCandidates()` filters out any element
containing a password or payment field).

**DOM injection**: every element Scarlett creates is built with `document.createElement` and
`textContent`/attribute assignment — never `innerHTML` (enforced by the test suite). The only text
Scarlett ever writes into a foreign page is the reviewed handoff prompt, and only into a field the
user can see and edit before it is sent anywhere (nothing is auto-submitted).

**iframe/shadow DOM**: V1 does not attempt to reach into cross-origin iframes; its content script
runs in the top frame only extension-injected pages (`page-understanding.js`/`transformation-
policy.js`/`content.js` are injected only on demand, via `chrome.scripting.executeScript` triggered
by the user opening the popup or toggling a mode — never automatically on page load).

**Known residual risks (honest list, not resolved by this pass):**
- The `data-ftn-scarlett-*` attribute-based styling approach could in principle be fought by an
  aggressive page stylesheet using higher-specificity `!important` rules of its own; V1 accepts this
  as a cosmetic-only risk (worst case: Scarlett's visual change doesn't fully apply), never a safety
  risk, since no destination/control/native semantics are ever touched regardless.
- Bounded text-pattern scans (`pricingFacts`/`deadlineFacts`/etc.) are heuristic and can both
  over- and under-match; they are presentation-only signals surfaced to the user for their own
  judgment, never asserted as verified facts, and never passed to ibis without the user's own
  review step.
- Live, authenticated QA on Google Docs/Sheets/Gmail/Calendar was not performed this session (see
  the completion report) — it would require entering real Google account credentials, which is out
  of scope for an automated session under this project's safety rules.
