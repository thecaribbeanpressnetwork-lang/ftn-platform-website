# Shared intelligence & platform systems

The standing principle across all of these: **build once, reuse everywhere.** A capability needed
by two products becomes a shared engine both call, never two independent implementations. Verified
against the real repository 2026-08-23 — see current-state.md for the reconciliation method.

## Product Registry

The identity/routing/discoverability backbone for the whole ecosystem. Full detail in
[products.md](products.md). Every other system below either reads from it (`FTN.ProductRegistryData`)
or extends its `search()` function.

## FTN ibis (`/ibis-ai/`) — rebranded from "ibis.ai"

A real capability fabric, not a chatbot wrapper: **node → capability → provider → provenance**
(`js/ibis-client.js`, "universal IBIS Client"). Capabilities are typed (TEXT, IMAGE, MUSIC, SFX,
SCREENWRITING, QC, VIDEO, LIP_SYNC, SPEECH...) and each is backed by a real, licensed, audited
provider — see `tests/ibis-*-audit.mjs` (client, eligibility, audio-analysis, caribbean-language-id,
music-engine, music-workflow, project-graph, project-qc, runtime-estimator, sfx-engine,
voice-registry, live-research) for what's actually verified working versus still blocked. Per
recent commit history: TEXT/IMAGE/MUSIC/SFX/SCREENWRITING/QC generation are real and verified
(e.g. Cloudflare Workers AI for image generation, gateway auth verified end-to-end); VIDEO and
LIP_SYNC generation are researched but still blocked on hardware/licensing as of the last check —
**do not describe VIDEO/LIP_SYNC as working without re-verifying against the audit scripts.**
`js/ibis-visual-state.js`, `js/ibis-project-graph.js`, `js/ibis-creative-studio.js` (product page)
compose the user-facing workspace. Cost/provider transparency is a stated design goal — the registry
entry's `legalNotices` include "Provider transfer and cost notice."

**Phase 4A (2026-08-25) source/provider routing consolidation** — full inventory, claims-vs-
implementation gap map and fixes in `IBIS-MAP.md`'s own Phase 4A section. Headline finding: the
main `/ibis-ai/` page's text-chat path (`js/ibis-ai-workspace.js`'s `serverAI()`) called
`supabase/functions/ibis-query` directly, bypassing `js/ibis-eligibility.js`/the provider registry
entirely — the registry's enable/disable switch did not actually gate it. Fixed (now checks
eligibility first). Also added: `js/ibis-provenance.js` (one canonical internal provenance
envelope, superset of `js/ibis-client.js`'s prior inline shape — internal data contract only, not
surfaced in any UI by this pass), two missing default executors (`CARIBBEAN_LANGUAGE_ID`,
`LIVE_INTELLIGENCE`), real timeouts on every Edge Function and client-side network call, and a
`TIMEOUT` vs `NETWORK_ERROR` error-labeling fix. Trust Card/Trust Centre/evidence-presentation UI
was explicitly out of scope — see IBIS-MAP.md's "Phase 4B" note for the deferred decision proposal.

**Intent Router** (`js/intent-router.js`) does real, transparent, keyword-based matching against the
Product Registry — never an LLM call for this specific routing decision. Extended with a
`scopeProductId` ranking parameter so per-page search (Learn, Opportunities, Screen, Riddim, the
sitewide `js/ibis-widget.js`) can bias toward its own product without ever inventing or blocking a
genuinely better cross-product match.

## FTN Scout — open-source/capability reconnaissance

`SCOUT-INTELLIGENCE-LEDGER.md` (latest recorded: Pass 15, 2026-08-21) governs this under the same
no-fabrication standard as the rest of the platform: *"no fabricated results, no claimed integration
without a real, tested implementation, licenses evaluated per-candidate directly against a primary
source... never assumed from a description or a third-party aggregator's summary."* Three lanes:

1. **Problem Scout** — research tied to a real, existing FTN ticket/area. Original mode,
   `scripts/ftn-open-source-scout.mjs`, runs weekly via `.github/workflows/open-source-scout.yml`.
2. **Capability Scout** — emerging open-source capability tracked even without an open ticket.
3. (third lane recorded in the ledger — read the ledger directly for its current definition rather
   than trusting a stale summary here.)

Related: `js/ftn-source-provenance.js` + `tests/ftn-source-provenance-audit.mjs` (Source Gateway
provenance foundation), `js/ftn-node-registry.js` + `tests/ftn-node-registry-audit.mjs`.

## Correlation / Relationship Engine

`js/relationship-registry-data.js` (data) + `js/relationship-registry.js` (thin accessor) — this is
the current file pair; it replaced the older `js/relationships-data.js` naming used in
release-history.md's Phase 4 narrative. Holds correlation/influence/dependency/parent-child edges
between real indicators. Recently extended alongside the FTN ibis rebrand (same commit,
`919de16`) — re-read the file directly before describing its exact current field shape, since it
has grown past the Phase 4 description.

## Trust Card / Trust Centre / provenance

`js/trust-card.js` (247 lines) remains the shared, accessible modal every surface reuses to expose
a claim's source, methodology, freshness, classification and confidence — same architecture as
originally built in Phase 4/RC3 (see release-history.md for the original design rationale, still
accurate as a mechanism description). It has since grown a dedicated destination page,
**`/trust/` — "FTN Trust Centre — Sources, privacy and product states"** — not present in the old
narrative; treat the Trust Card modal as the reusable component and the Trust Centre as a new,
separate top-level surface built on the same provenance philosophy, not a renamed modal.

## FTN Account (`/account/`)

Real, live Supabase-backed authentication (`js/ftn-auth.js`) — identity is verified by Supabase
Auth, authorization stays server-side in RLS/RPC/functions (the file's own header comment is
explicit that no client-side value should ever be trusted to grant a role). PKCE flow, magic-link +
Google OAuth, a single callback owner (the account page) to avoid double-consuming a one-time
auth code. This is the real implementation of what the old narrative's `data-sign-in-entry`
placeholder (release-history.md §7.15) was pointing toward — the unified FTN identity/SSO layer is
now built, not just reserved. The embedded Supabase key is a public/publishable key by design (see
current-state.md) — not a secret to redact.

## Sprint-1-era shared engines (architecture still current; product list on top of them has grown)

These were built with an explicit "first implementation becomes first consumer" mandate — verify
current consumers against products.md rather than the list a given engine originally shipped with:

- **Workspace Shell** (`js/workspace-shell.js`, `css/components/workspace-shell.css`) — standard
  chrome for every flagship product workspace; atmosphere (accent/background/motion) comes from
  the Product Registry automatically, never hand-styled per page.
- **Generator Engine** (`js/generator-engine.js`) — deliberately small: `validate()` then
  `generate()`, no multi-step orchestration.
- **Entity Metadata Engine** (`js/entity-metadata-engine.js`) — schema/record architecture; check
  which schemas are actually registered before assuming one exists for a given product.
- **Export Framework** (`js/export-framework.js`) — registered-handler map (`txt`/`json`/`print`
  plus whatever's been added since).
- **Search Foundation** (`js/search-foundation.js`) — `query(items, {filters, textQuery, groupBy,
  sortBy, limit})`.
- **Media Intake/Playback** (`js/media-intake.js`) — client-side-only file attach + preview; the
  file never leaves the browser, and every mount says so honestly.
- **Integration Adapter Layer** (`js/integration-adapter.js`) — the one convention every intake
  tool's submit action calls (save locally via `js/storage.js`, honest confirmation) — the single
  place a real backend will eventually swap in for every tool at once.
- **`js/persisted-flag.js`** — shared factory behind `platform-mode.js` and `country.js` (read a
  validated value from storage, reflect as a `data-*` attribute on `<html>`, `get()`/`set()`,
  broadcast a change event). Each module owns only its own domain logic on top of this.

## Ambient Utility doctrine + FTN Share

- **FTN ALWAYS ON** (internal doctrine) / **AMBIENT UTILITY** (public-facing framing): build so the
  platform earns a place people voluntarily keep open, rather than forcing continuous interaction.
  Consumer copy leads with "ambient utility," not the internal "Always On" phrase.
  Doctrine line (use sparingly): *"FTN — Always On. Useful when you need it. Present when you
  don't. Ambient utility for the Caribbean."*
- **FTN Clock** (`/clock/`) is the primary organic-acquisition wedge — link straight to the clock,
  no signup wall, no explanation page. Recomputes from `Date` every 250ms, never an incremented/
  drifting counter.
- **FTN Display** (`/display/`, current registry entry — see products.md) is the ambient
  "one screen, no setup" broadcast surface; it absorbed the role the old narrative called
  "FTN Live's ambient indicator wall."
- **`js/ftn-share.js`** is the one shared Share primitive: native Web Share API first, falls back to
  an on-page sheet prioritizing WhatsApp and Facebook (per the Community Connect distribution
  decision, decisions.md), then Copy Link. Confirm current adoption before assuming a given
  product's share button already uses it — the original build note says other products' ad hoc
  share buttons were not all migrated in the same pass that introduced it.
- **Ambient Hours** (`js/ambient-hours.js`) — conservative client-side measurement gated on
  `document.visibilityState==='visible'`, a per-device local total that never leaves the browser,
  and a real-time anonymous aggregate via a Supabase Realtime Presence channel surfaced in FTN
  Nexus Command (`/god-mode/`). A persisted cross-session historical rollup needs a server-side
  migration/Edge Function — confirm whether that's been built before claiming it exists.
