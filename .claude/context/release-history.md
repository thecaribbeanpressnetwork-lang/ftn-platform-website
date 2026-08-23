# Release history (historical record — reconciled current state is in current-state.md)

**Read this file only when historical/commit-by-commit context is genuinely needed** — e.g.
understanding why a component is shaped the way it is, or tracing when a pattern was introduced.
**Do not treat anything in this file as current implementation state.** It is the verbatim (lightly
requoted) narrative from the pre-2026-08-23 CLAUDE.md, covering Phase 3 through Version 1.10. The
repository moved substantially past this narrative before the 2026-08-23 reconciliation — see
current-state.md for what's actually live now, and decisions.md for which founder decisions from
this history are still binding versus superseded.

---

## Phase 3 — The Indicator Engine

`js/indicators-data.js` was a registry, not a set of one-off widgets — every indicator built by an
`ind()` factory and rendered by shared functions (`observatory.js` cardHTML, `live-clocks.js`
computeClockValue, `trust-card.js` render). The indicator grid used CSS Grid
`repeat(auto-fill, minmax(240px, 1fr))` so the wall could scale without a redesign. Dashboard
customization was client-side via `localStorage` on `/observatory/`. The advertisement system
(`js/ads-data.js`, `js/ads.js`) treated ads as configurable dashboard panels driven by a campaign
registry.

## Phase 3.5 — real sources, display config, packages, kiosk runtime

- `js/source-registry.js` — the only place real external source URLs lived; indicators attached a
  `sourceId`, never a hardcoded URL.
- `js/live-clocks.js` Fast Counter Engine — normalized ticking indicators into a per-second rate;
  every clock value recomputed fresh each tick (`benchmark + elapsed × rate`), never an incremented
  counter that could drift.
- `js/display-config-data.js` + `js/display-config.js` — venue presets, config form/localStorage,
  deliberately generic.
- `js/ad-packages-data.js` — commercial tier capability structures, no pricing.
- `js/display-mode.js` — Fullscreen Display Mode + low-opacity rotating background layer, disabled
  under `prefers-reduced-motion`.
- `js/benchmarks-data.js`, `js/seasonal-profiles.js`, `js/founder-controls.js` — architectural
  stubs only.
- Recorded Murders indicator shipped with no numeric value on purpose — a sensitive, checkable
  public-safety statistic never estimated for visual effect.

## Phase 4 — Relationship Engine, Reality Insights, Discovery, National Memory

- `js/relationships-data.js` (superseded — see intelligence.md for the current file names) — the
  original shared Relationship Engine: `{all, get, forIndicator, random}` with `type`
  (correlation/influence/dependency/parent-child), `direction`, `strength`, `confidence`.
- `js/reality-insights.js` — "The Nation Is Speaking," insight sentences computed strictly from
  real registry fields, never invented.
- `js/today-panel.js` — "Today in Trinidad & Tobago," real NOAA/Wikipedia solar-position math for
  Port of Spain (10.65°N, 61.4°W), moon phase from a known reference new moon + the synodic month
  constant, `Intl.DateTimeFormat` with `timeZone: 'America/Port_of_Spain'`.
- `js/what-changed.js` — parsed existing `changeLabel` strings via regex into Y/Y, Q/Q, M/M, Recent
  buckets; never computed a new delta the registry didn't already express.
- Trust Card enrichment: `WHY_IT_MATTERS` map, `freshness()` helper, relationships section.
- `js/national-memory.js` — `getHistoricalComparison()` did real arithmetic over sparkline history;
  `snapshot(dateISO)` was a documented throwing placeholder, deliberately not faked.
- `js/community-profile-data.js` + `js/community-profile.js` — a generic `profile()` factory, one
  demo instance (`san-fernando`), explicitly not Community Connect data.

## Release Candidate 1 — cleanup, contrast fixes, deployment readiness

- CSS delivery changed from an `@import` chain to parallel `<link>` tags to fix a real
  render-blocking waterfall.
- Dead code removed (verified unreferenced first).
- Real WCAG 2.2 AA contrast defects found via an axe-core sweep and fixed: `--color-red-on-dark`
  introduced for dark-surface red text; several silent `--color-graphite`/`--color-silver`
  fallback bugs fixed; the 2026-07-10-era success-green issue was explicitly left unfixed and
  flagged rather than silently patched (still open — see design-system.md).
- Contact form accessibility gap fixed (paired `role="alert"` error text, not just a red border).
- Skip-link target focus fix (`tabindex="-1"` on `<main>`).
- Deployment readiness files added: `sitemap.xml`, `robots.txt`, `404.html`, generated OG image,
  favicon rasters. **Placeholder production domain** (`www.ftnplatform.com`) was used at this
  point — since superseded by the real domain `ftnplatform.org` (see current-state.md).

## Release Candidate 2 — product journey, real screenshots, Display Mode maturity

Real Community Connect screenshots extracted from the asset library (device mockups + dashboard
preview). Real FTN Live and Mission Control previews captured via Playwright against this site's
own live pages (zero fabrication risk). Homepage restructured into an explicit journey (Problem →
Platform → Community Connect → FTN Live → Mission Control → How They Work Together → Evidence →
CTA). `.platform-flow` and `.section-media`/`.phone-strip` introduced as reusable patterns.
Mission Control marketing page realigned to match the real demo's actual tabs (at the time, Mission
Control still had a public marketing page — since privatized, see current-state.md). Display Mode
hardened into a real broadcast layer; Rotating Display built on the existing Saved Layouts engine.

## Release Candidate 3 — Architecture & Excellence Pass

Introduced `GOVERNANCE/FTN_Platform_Constitution_v1.0.md` as governing document. Named the "Reality
Engine" (Indicator Engine + Relationship Engine + Trust Card System + Source Registry) as a
combination, not a new file. Deduplicated: trend glyph (`FTN.Charts.trendGlyph`), classification
badge class mapping (`FTN.TrustCard.classificationBadgeClass`, fixing a real bug where
`community-profile.js` had hardcoded `trust-badge--demo` regardless of actual classification),
shared localStorage helper (`js/storage.js`). Introduced `rotationBehavior: 'locked' | 'ordered'`
as groundwork for a future Presentation Engine (not built out this pass, deliberately).

## Version 1.2 — Institutional Identity Release

First major creative pass: hero-scale type token, hand-authored inline-SVG hero motif (no stock/
AI imagery), `.scale-band` device, `.editorial-split`, 404 page redesign, footer redesign, nav
hover treatment, homepage brand-hierarchy fix (H1 changed from Community Connect's own tagline to
the platform's own thesis). v1.2.1 extended the language to all interior pages via a shared
`.page-hero--split` panel family, an ecosystem diagram on About, redesigned Coming Soon pages, a
rebuilt sitemap, and the site's only motion moment (`js/reveal.js`, fully progressive-enhancement
safe). An Executive Polish pass (2026-07-12) locked the visual experience — from that point,
changes were meant to be architectural, not cosmetic, absent a new defect.

## Version 1.3 — Presentation Mode / Live Mode Infrastructure

`js/platform-mode.js` — one global mode flag (`localStorage`, `?mode=` deliberate-entry param
stripped via `history.replaceState`). `js/data-source.js` — the datasource seam
(`register(key, tier, data)` / `resolve(key)`); no `'live'` tier was ever registered in this era —
both modes resolved to the same presentation data, an honest starting state, not a simulated feed.
`js/presentation-control.js` — the floating control, movable/dismissible, one "Exit to Live Mode"
action. Founder Decision (2026-07-12): Presentation Mode was platform infrastructure, built ahead
of the Release Candidate; no further feature development was planned before it.

## Final Content Integration — Legal & Compliance

All four legal pages replaced placeholder content with the founder's own drafted "Governance and
Legal Framework," preceded by a Claude-authored "Technical Compliance Audit" (no cookies at the
time, seven `localStorage` keys, all UI preferences, zero PII, inert Contact form, no analytics —
**re-verify this claim before citing it as current**, see security-ops.md re: Turnstile).

## Version 1.0 Release Closeout — repository hygiene fix

A pre-push audit found six directories (`DESIGN/`, `FOUNDATIONS/`, `KNOWLEDGE/`, `STANDARDS/`,
`STRATEGY/`, `FTN_Strategic_Foundation_v1.0/`) containing exactly the category of internal/
commercial content the standing Founder Decision said must never be public, committed and directly
servable (no build step, no routing config). Fixed with `git rm -r --cached` (files preserved
privately) plus a `.gitignore`. Pure repository hygiene, no site content changed.

## Operational Phase 1 — Community Connect Public Beta Integration

Community Connect confirmed to already exist as a mature, separate application
(`github.com/thecaribbeanpressnetwork-lang/ftn-platform`) — vanilla HTML/CSS/JS + Supabase + PWA +
Capacitor. Deployed to a dedicated subdomain, `community.ftnplatform.org` (to avoid service-worker
scope collisions and match native deep-linking conventions). The one sanctioned edit to that
repository was its own `config.js` `WEBSITE_URL` field — nothing else was touched, and the edit was
committed locally there but never pushed (their push authorization, not this program's).
`/applications/` (later renamed `/community-connect/` launch flow via `#launch`) became the
required stop before leaving the site; sitewide CTAs changed from "Download App" to "Launch App."

## Operational Phase 1B — Face the Nation Platform Integration

Founder Decision (2026-07-12) confirmed Face the Nation as a real, live platform — production
season in progress, real approved brand assets. Given a public home at `/facethenation`
(deliberately no trailing slash). A bounded dark treatment (`<main class="ftn-show">`,
Bebas Neue headline face) — site-wide header/footer unchanged. Real production photography used
(resized locally via .NET `System.Drawing` through PowerShell, no image tool available in that
environment). All five social platform links rendered as honest "Coming Soon" — no fabricated URLs.

## Version 1.6.0 — Caribbean Executive Identity Pass

Heritage Layer System (restrained per-page SVG line-work at 2-8% opacity, `aria-hidden`,
contrast-checked). Founding statements per major page. Atmosphere equalization across several
pages. Subtle CSS-only motion gated behind `prefers-reduced-motion`. Community Connect icon mark
extracted (wordmark deliberately not extracted — raster-quality concern). Country-switcher
architecture built as a scaffold with no localized content yet.

## Version 1.7.0 — Executive Visual Polish & Caribbean Localization Pass

Confirmed the FTN wordmark's T-in-red detail against the actual AEB-01 board (see
design-system.md). Identified an AI-generated "Community Photography" grid on a source board and
explicitly declined to ship it as real (see design-system.md's photography rules — this is where
that rule came from). `js/country-scope-notice.js` gave the country-switcher its first real,
honest behavior (a messaging-only "FTN is expanding to `<Country>`" notice, no fabricated per-
country imagery). Four product names from an earlier brief (ibis.ai, Riddim, Kaiso, Love) were
explicitly deferred this pass — then approved one pass later (see Version 1.8.0 below).

## Version 1.8.0 — Ecosystem Completion Pass

Founder-authorized override (verified directly with the founder mid-session after a near-identical
document had been mistakenly pasted and retracted one turn earlier in the same conversation — a
useful precedent for treating an unusual-looking authorization with suspicion until confirmed).
Approved nine ecosystem products as real, first-class pages (Events, ibis.ai, Riddim, Kaiso, Radio,
Screen, Opportunities, Love, Display Network) — see decisions.md and products.md for how these
evolved further since. Homepage became a dark 12-card "Ecosystem Board," a bounded exception to the
light-first mandate. Investor-facing content restriction relaxed to allow a nav entry (still no
fundraising language). `js/product-registry-data.js` and `js/product-registry.js` were introduced
in this pass as the original Product Registry — see intelligence.md/products.md for its current,
much-expanded form.

## Version 1.9.0 — Sprint 0 (Architecture Review) + Sprint 1 (Shared Platform Architecture)

Sprint 0: read-only architecture review (`GOVERNANCE/FTN_Platform_Sprint0_Architecture_Review.md`),
found ~30-40% duplication reduction opportunity within this repo, authorized the narrow Node-
generator exception to the vanilla mandate (see decisions.md). Sprint 1: built nine shared
capabilities (Product Registry, Workspace Shell, Generator Engine, Entity Metadata Engine, Export
Framework, Search Foundation, Media Intake/Playback, Integration Adapter Layer, Intent Router) with
the mandate that "the first implementation becomes the first consumer" — see intelligence.md for
their current state. Rebuilt all nine product pages from static brochure pages into real working
first experiences. Found and fixed a real bug in `ProductRegistry.search()` (short/common words
matching as substrings, producing noisy false positives) while building the Intent Router.

## Founder Decision (2026-08-22) — Community Connect distribution is URL/PWA-first

See decisions.md — this decision is still active and reproduced there in full, not just here.

## Version 1.10 — Ambient Utility, Clock, Media Integrity & Organic Distribution Release

Formalized the "FTN ALWAYS ON" / "AMBIENT UTILITY" doctrine (see intelligence.md for the current
description). Built FTN Clock as the primary organic-acquisition wedge. Rebuilt FTN Display
fullscreen as a genuine single-screen CSS Grid composition (the prior release's fullscreen was
still a scrolling page — a founder visual inspection correctly rejected that as insufficient).
Built `js/ftn-share.js` as the one shared Share primitive (WhatsApp/Facebook-first per the
Community Connect distribution decision). Built Ambient Hours measurement (conservative,
visibility-gated, no persisted historical rollup yet at this point). Fixed a real defect where
FTN Radio's genre-seed search shaped the *query* but never validated the *returned* results,
letting cross-genre content leak through — fixed with a `genreAllowed()` post-search filter (source
complete, deployment gated on Supabase CLI credentials at the time). Fixed a real shared-component
contrast bug: `.workspace .btn-outline` was inheriting the light-surface button variant on every
dark workspace-shell product — fixed once at the shared level rather than per-product. This is the
last version named in the pre-2026-08-23 CLAUDE.md narrative — the repository moved well past it
(63 commits, per current-state.md) before this reconciliation.
