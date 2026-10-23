# Scarlett by FTN — V1 browser proof

Scarlett is FTN's adaptive interface layer for existing digital environments.

## V1 scope

- Manifest V3 extension
- active-tab execution
- local page understanding (page/app type, risk, Site DNA, decision-relevant facts: pricing,
  deadlines, eligibility language, downloads, warnings, accessibility signals, focus state)
- risk/sensitivity classification
- Original / Assist / Adapt
- automatic downgrade to Assist on sensitive pages and complex Google applications
- reversible presentation ledger (every mutation recorded with an operation id, type, reason,
  timestamp and previous state before it is applied)
- explicit transformation-policy contract (requested vs. effective mode, reason, risk level,
  preserved regions, allowed/blocked operation classes)
- optional, compact user-intent field (never changes mode selection; only affects what is shown
  before a handoff and whether the Headspace escalation is offered)
- restrained Scarlett control and assistance panel
- local, reversible, persisted accessibility controls (larger text, more spacing/wider targets,
  stronger focus outline) — truthfully labelled, never claimed as WCAG compliance
- deliberate, review-before-send handoff into FTN ibis
- deliberate, review-before-send escalation into FTN ibis Headspace, offered only when a task
  looks genuinely multi-step (a listing/service page with real decision facts, or user intent
  naming a comparison/decision), never embedded in the page
- no browsing-history collection
- no full-page upload
- no automatic AI call
- no Transform / Compare / Blend implementation yet

## Architecture boundary

Scarlett understands enough locally to choose safe presentation behavior. It does not become a second intelligence brain. Semantic research/reasoning belongs to ibis. Complex multi-artifact work belongs in Headspace.

## Host permission scope (documented per FTN security review discipline)

`host_permissions` and the matching `content_scripts` entry are limited to four exact FTN-owned
paths: `ibis-ai` (the ibis workspace) and `ibis-headspace-preview` (the Headspace escalation
target), each on the apex and `www` host. No wildcard/broad host permission is requested.

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

## V1 test surfaces

1. article/content page
2. commercial/listing page
3. public/government information page
4. Google Docs or Sheets

Google applications must remain in Assist mode in V1.
