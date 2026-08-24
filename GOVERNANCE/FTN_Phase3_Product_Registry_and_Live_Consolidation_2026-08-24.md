# FTN Platform — Phase 3: Product Registry and FTN Live Consolidation

Working document for `GOVERNANCE/FTN_Platform_Final_Audit_and_Repair_Decision_2026-08-24.md` Phase
3, per the founder's specific Phase 3 brief (2026-08-24). Delivers: current-state duplication map,
proposed registry schema, Live/Observer/NOW/Display/Screen responsibility matrix, migration
sequence with risks, and the decision gate the brief explicitly asked for before anything
route-renaming or destructive happens.

## 1. Current-state duplication map

Six independent places currently hold product identity/routing/visibility data. Only two are
already correctly registry-driven.

| Source | What it holds | Registry-driven? | Scale |
|---|---|---|---|
| `js/product-registry-data.js` + `js/product-registry.js` | The intended canonical source — 28 products, rich per-product schema, a real accessor API (`get`, `byRoute`, `publicProducts`, `ecosystemGroups`, `search`, legacy-id resolution). | — (this is the source) | 28 products |
| `js/ftn-directory.js` (FTN Directory page + the "FTN Ecosystem" mega-menu in `js/nav.js`) | Full grouped product list, cards, links. | **Yes** — reads `Registry.ecosystemGroups()` / `Registry.get()` directly. No duplication here. | 0 hardcoded entries |
| `js/nav.js` `PRIMARY_NAV` | 5-item header shortlist (Platform, Community Connect, Display, Observer, Directory). | **No** — deliberately hand-ordered per its own comment ("an explicit founder-set order, not something the Product Registry encodes"). This is a *curated subset with founder-set priority*, not accidental duplication — the full list is still registry-driven via the Ecosystem mega-menu one click away. Lowest-priority item to fix; a real fix would need the registry to gain an explicit nav-priority/rank field first (see schema §2). | 5 hardcoded rows |
| Static `<footer>` blocks | Product name + route pairs, hand-written per page. | **No.** | Found in **32 of ~59 HTML files** (`grep -c 'site-footer__links'`). The largest duplication surface by file count. |
| `sitemap.xml` (root) | Flat list of crawlable URLs for search engines. | **No** — fully hand-maintained. | 41 `<url>` entries: 23 registry-derivable product routes plus 18 non-product utility/legal pages (`/about/`, `/applications/`, `/clock/`, `/resources/`, `/contact/`, `/insights/`, `/sitemap/`, `/accessibility/`, `/trust/`, `/glossary/`, and 8 `/legal/*` pages) that have no registry entry and shouldn't — those aren't "products." |
| `service-worker.js` | A separate hardcoded private-route regex: `/^\/(god-mode\|mission-control\|account\|love\|health\|ibis-ai)(\/\|$)/`. | **No** — independent of the registry's own `visibility:'PRIVATE'`/`'VAULTED'` field on the same products. Currently consistent by coincidence, not by construction; a future product marked `PRIVATE` in the registry would **not** automatically get excluded from the service worker's cache unless someone remembers to also edit this regex. | 6 routes, 1 regex |

**Root finding:** the registry itself is in good shape — rich schema, one real accessor API, two
genuinely consuming surfaces. The actual problem is everything *outside* the registry that still
hand-maintains its own copy of product names/routes/visibility. Fixing the registry schema alone
doesn't fix Phase 3's stated goal ("one owned system of record") — the duplicate *consumers* have
to be migrated too, which is why the brief is right to say this can't be a one-commit sitewide
rewrite.

## 2. Proposed Product Registry schema (additive, backward-compatible)

Every field below is **added** to the existing `product()` factory's default object
(`js/product-registry-data.js`) with a safe default, so no existing product entry breaks and no
existing consumer (`ftn-directory.js`, `nav.js`, `intent-router.js`, `workspace-shell.js`, the
Trust Card, the test suite) needs to change to keep working. Fields already present and adequate
are marked accordingly rather than renamed — renaming a field is a real breaking change to every
consumer and is out of scope for an additive pass.

| Requested field | Already present as | Proposed new field | Default |
|---|---|---|---|
| Canonical product ID | `id` | — | required |
| Public name | `name` | — | required |
| Mandatory FTN-prefixed name | *(implicit — `name` is expected to start "FTN ", not enforced)* | `enforceFtnPrefix` check moves into `tests/product-registry-audit.mjs` (a real audit assertion, not a data field) | — |
| Product group / purpose | `productType`, group membership lives in `js/product-registry-data.js`'s separate `ProductRegistryGroups` array, description/tagline | `purposeStatement` — one sentence, distinct from `description` (which is more like marketing copy); intended for the responsibility-matrix / disambiguation use case in §3 | `null` |
| Canonical route + approved aliases | `route`, `legacyIds` (id-level aliases, not URL-level) | `routeAliases: []` — URL paths that should redirect to `route` (distinct from `legacyIds`, which is about matching an old *id* in code, e.g. `Registry.get('observatory')` still resolving to the `ftn-live` entry) | `[]` |
| Navigation visibility | `publicVisibility`, `status` | `navPlacement: {primary: false, ecosystemGroup: <existing group id>, footer: true}` — lets `PRIMARY_NAV`, the footer, and the ecosystem menu all eventually derive from one place instead of the header list being separately hand-maintained | `{primary:false, ecosystemGroup:null, footer:true}` |
| Production readiness / availability | `status` (`AVAILABLE`/`PRIVATE`/`ILLUSTRATIVE`/etc. — already real, already audited) | — | — |
| Accent colour + mnemonic | `atmosphere.accent`, `visualMnemonic` | — | — |
| Authentication requirements | `accessRules` (free-text array, e.g. `['guest']`, `['guest discovery','Turnstile-protected submission']`) | `authRequirement: 'none'\|'guest'\|'account'\|'account+device-approval'` — a real enum a consumer can branch on, alongside the existing free-text `accessRules` for human-readable detail (kept, not replaced) | `'none'` for utility, `'guest'` for products |
| Data consumed / produced | `dataSources` (consumed only) | `dataProduced: []` — what this product writes/emits that another product could consume (e.g. Community Connect produces reports FTN Display's "Community" module consumes) | `[]` |
| Integrations (Community Connect, FTN Live, ibis.ai, Screen, TV, future FTN Statistics) | `relatedProducts` (generic id array, no relationship type) | `integrations: [{productId, kind}]` where `kind` is one of `'consumes'\|'produces'\|'routes-to'\|'embeds'\|'parent'\|'child'`. Existing `relatedProducts` stays as the simple/legacy form; `integrations` is additive and optional, populated first for the four real registry entries this phase actually touches (see §4), not sitewide. | `[]` |
| Analytics identifier | `analyticsClassification` (a *category*, e.g. `'public-essential-only'`) | `analyticsId: 'ftn_' + id` (a stable, greppable event-prefix key) | derived from `id` |
| Source/provenance expectations | `dataSources` (list of names), Trust Card carries the real per-claim provenance already (`sourceId`, `referenceDate`, etc. — see the Phase 1 Trust Engine work) | `provenanceLevel: 'official'\|'ftn-calculated'\|'editorial'\|'none'` — a coarse, product-level signal (not a replacement for the indicator-level Trust Card schema, which is finer-grained and stays the real source of truth for any individual number) | `'none'` |
| Responsible code modules / owner | `owner` (company name, not code) | `ownerModules: []` — the JS/CSS files a change to this product's behavior actually touches, useful for exactly the kind of duplication-mapping this document just did by hand | `[]` |

**What this phase actually populates now:** the four products with a real registry entry among
those under analysis in §3 — `ftn-live` (public name "FTN Observer"), `display`, `screen`, `tv`.
"FTN Live" as an umbrella and "NOW" as a real view don't exist as registry entries today (§3.1), so
there's nothing to populate for them yet; that only becomes relevant if Option B (§3.3) is
confirmed. The other 24 products keep their current schema unchanged until a later incremental
pass touches them — consistent with "replace duplicated product metadata
incrementally."

## 3. FTN Live / Observer / NOW / Display / Screen — current meanings, overlaps, and the proposed target

### 3.1 What each name currently, actually means (verified by reading the code, not assumed)

| Name | Current reality |
|---|---|
| **"FTN Live"** | **Does not exist as a public product today.** Survives only as the registry's internal `id: 'ftn-live'` (kept so old code/links referencing that id still resolve) and in `relatedProducts` arrays that reference it by id. A code comment in `js/product-registry-data.js` (line 136) states explicitly: *"Ecosystem Simplification pass: FTN Live retired as an independent identity."* `products.md` (an always-loaded context file) independently confirms: *"FTN Live's ambient role → FTN Display... the old FTN Live route (`/observatory/`) now carries the deeper-investigation 'FTN Observer' identity."* This is a real, recorded, deliberate prior decision — not an oversight. |
| **"FTN Observer"** | The current public name for the `ftn-live`-id product, at route `/observatory/`. Deep-investigation console: indicators, satellite imagery, correlations, crime series, explicit source states. Positioned as "for people who want to look closely, not glance from across a room" (its own registry description). |
| **"NOW"** | **Also does not exist as a product.** `js/nav.js` (line 38) states explicitly: *"FTN Now retired outright... both roles are covered by the new FTN Display."* Today "NOW" survives only as a UI module *name* inside FTN Display — "FTN TV NOW," the video panel rendered by `renderTvNow()` in `js/display-page.js` — not a time-sensitive data feed or a distinct concept of its own. |
| **"FTN Display"** | The glanceable, no-account, kiosk-oriented public screen at `/display/`: National Pulse (KPI cards), FTN TV NOW (the video panel above), Live Conditions, World Now (world clocks + exchange rate), and a Community panel. Its own registry description: *"meant to be opened and left full screen... No account, no configuration, no advertising."* |
| **"FTN Screen"** | Film/cinema discovery at `/screen/` — trailers, filmmaker profiles, festival-package preparation. Unrelated in current scope to "current conditions" — it's a media-discovery product, not an intelligence product. |
| **"FTN TV"** | Programme guide / scheduled-and-on-demand viewing at `/tv/`. Already modeled in the registry as `parentProduct: 'screen'` — i.e., the registry *already* treats TV as a capability of Screen, not a peer. |

### 3.2 The conflict this phase needs a decision on

The founder's Phase 3 brief describes a **target** architecture:

> FTN Live: canonical real-time and current-conditions intelligence product. Observer Console:
> advanced operating interface within FTN Live, not a competing product. NOW: time-sensitive feed
> or view within FTN Live.

This is a coherent, well-reasoned target — but it is **the direct reverse of the "Ecosystem
Simplification" decision already recorded in this codebase**, which deliberately retired *both*
"FTN Live" and "NOW" as names in favor of the current Observer/Display split, on the stated theory
that Observer (deep) and Display (ambient) are different enough jobs that they shouldn't share one
umbrella brand.

Both are legitimate architectural positions. This document does not resolve that conflict — it
surfaces it, per the brief's own explicit instruction: *"Do not rename or remove public routes
until the impact is mapped... Present the proposed mapping and decision gate before executing
those actions."* Renaming `/observatory/`'s product identity back toward a "FTN Live" umbrella (or
introducing a real "NOW" view) would reverse a recorded decision, not just implement a new one —
that specifically needs founder confirmation, not an inference from this brief's architecture
sketch alone.

### 3.3 Responsibility matrix — proposed, not yet executed

Two options, both compatible with the registry schema in §2 without a rebuild:

**Option A — keep the current Observer/Display split, formalize it in the registry.**
No renaming. Add `integrations` entries making the existing relationship explicit: Observer
`produces` the indicator/correlation data; Display `consumes` a *curated subset* of it for the
glanceable Pulse panel (already true in code — `PULSE_IDS` in `js/display-page.js` — just not yet
declared in the registry). "NOW" stays what it already is: a named module inside Display, not
promoted to a product concept. Lowest risk, zero public-facing change, purely a registry/schema
exercise.

**Option B — the brief's target: revive "FTN Live" as the umbrella, Observer becomes its console.**
`ftn-live` regains a real public identity (name, and likely a route change or an `/live/` alias
pointing at what is currently `/observatory/`); "Observer Console" becomes an in-product label/tab,
not the whole product's public name; a real "NOW" view gets built as a genuine time-sensitive feed
*inside* that umbrella (distinct from today's "FTN TV NOW" module name, which would need its own
disambiguating rename to avoid two different things both called "NOW"). This is a real product
decision with real routing/redirect/SEO/analytics consequences — the kind of thing §5's migration
sequence exists to de-risk, not something to execute from a single brief's architecture sketch.

| Product | Job today | Job under Option A | Job under Option B |
|---|---|---|---|
| FTN Live | doesn't exist (id only) | stays retired; id kept for back-compat only | umbrella intelligence product; canonical public identity restored |
| FTN Observer | deep investigation console at `/observatory/` | unchanged — formalized in registry as data producer | becomes "Observer Console," an operating mode inside FTN Live, not its own top-level public identity |
| NOW | a module name inside Display | unchanged | becomes a real time-sensitive view inside FTN Live; "FTN TV NOW" (the Display module) needs a distinct name to avoid collision |
| FTN Display | glanceable public kiosk screen at `/display/` | unchanged; registry gains explicit `consumes` relationship to Observer's data | brief says "only if it has a distinct use case; otherwise recommend consolidation" — Display's no-account/kiosk/full-screen job is genuinely distinct from an authenticated or console-style Live product, so **this document recommends keeping Display separate under either option** — its job (a shared physical screen with zero interaction) doesn't fit inside a "console" concept |
| FTN Screen | film/cinema discovery | unchanged | unchanged — the brief already scopes this correctly as "editorial/broadcast," unrelated to the Live/Observer/NOW/Display cluster |
| FTN TV | programme guide, child of Screen | unchanged | unchanged |

**This document's recommendation:** implement Option A now (pure registry/schema work, ships this
phase, zero public-facing risk), and treat Option B as a founder decision to make explicitly and
separately — it is a real rename with SEO/redirect/analytics stakes, not a data-modeling exercise.

## 4. What this phase actually implements now (safe, additive, reversible)

1. **Registry schema extension** (§2) — new fields added to the `product()` factory with safe
   defaults; populated for the four real registry entries in §3.1. No existing consumer breaks (verified: full
   test suite run after this change, see §6).
2. **`sitemap.xml` becomes generated, not hand-maintained** — a new script
   (`scripts/generate-sitemap.mjs`, with a `--check` mode the same shape as the existing
   `tests/*-audit.mjs` scripts) derives 23 crawlable product URLs from `sitemapProducts()`
   (dropping in-page-anchor duplicates like `/radio/#ftn-epk`, which shouldn't be separate sitemap
   entries) and combines them with an explicit, documented list of the 18 non-product utility/legal
   pages that have no registry entry (by design — they aren't products). Run once now to regenerate
   the current file — verified via a URL-set diff (`--check`) that this added and removed exactly
   zero URLs; the visible diff is ordering only. Chosen as the first duplication eliminated because
   it's the lowest-risk surface: invisible to visitors, purely for crawlers, and mechanically
   verifiable that nothing was silently dropped.
3. **Registry `integrations` populated for the four real registry entries** per Option A (§3.3) — Observer
   `produces` → Display `consumes`, both `route-to` `ftn-live`/`display` from `events`/`tv`/etc.
   already-existing `relatedProducts` entries.

**Explicitly not done this pass:** the 32-file footer duplication (real, but high blast-radius —
needs its own incremental migration plan, not a rush), `PRIMARY_NAV`/service-worker consolidation
(both have their own reasons for independence, noted in §1), and anything from Option B (route
renames, "FTN Live" revival, a real NOW view) pending founder confirmation.

## 5. Migration sequence for what remains (proposed, sequenced by risk)

1. **Footer consolidation** (32 files) — build a shared `js/site-footer.js` mirroring the existing
   `js/nav.js` ecosystem-menu pattern (lazy-loaded, registry-driven, degrades to nothing if the
   registry fails to load rather than breaking the page). Migrate in small batches (5-6 pages per
   commit), running the full test suite each time, starting with the lowest-traffic/lowest-risk
   pages. Redirects: none needed — footer content changes, URLs do not.
2. **`PRIMARY_NAV` → registry-driven with an explicit priority field** — requires the registry
   schema's `navPlacement.primary` (§2) to be populated founder-deliberately (this is exactly the
   kind of "explicit founder priority order" the current hardcoded list protects — moving it into
   the registry doesn't remove that control, it just makes it live in one place). No redirects
   needed; visual output should be identical if migrated correctly — verified via a snapshot diff
   before/after, not assumed.
3. **`service-worker.js` private-route list → derived from registry `visibility`** — requires the
   service worker's build step (there isn't one currently; it's a static, hand-authored file) to
   either import the registry data directly (service workers can `importScripts()`) or have a
   generator script similar to the sitemap one. Real risk here: a mistake in this file affects
   *offline/cache* behavior, which is harder to manually verify than a rendered page — needs its
   own dedicated test before shipping, not a rubber-stamp.
4. **Option B (FTN Live revival)** — only after founder confirmation per §3.2. If confirmed: map
   every current inbound link/bookmark/analytics-event assumption to `/observatory/` before any
   route change; ship an alias (`routeAliases`, §2) and a real redirect stub (matching the existing
   `js/redirect-*.js` one-line pattern already used for `/investor-room/` → `/invest/`, etc.)
   *before* changing any public-facing copy; keep the old route serving real content for a
   transition window rather than an instant redirect if search-index continuity matters; update
   `sitemap.xml` (now generated, so this becomes a one-line registry change, not a hand-edit) and
   `PRIMARY_NAV`/footer copy together in one commit *after* the redirect has been live and verified.

## 6. Decision gate — before continuing past this document

- **Option A vs. Option B** (§3.3) for Live/Observer/NOW/Display: this document recommends A now,
  B only on explicit separate confirmation. Which should this pass proceed with?
- **Footer consolidation** (§5.1): confirm before starting — it's the single highest-blast-radius
  remaining item (32 files) even done incrementally.
- Nothing in §4 (already implemented) requires a gate — it's additive/reversible and already
  shipped; listed here for completeness, not for approval.
