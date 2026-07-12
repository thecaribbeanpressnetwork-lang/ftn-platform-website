# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Document status:** Engineering Charter v1.0 — supersedes the bootstrap CLAUDE.md. This is the
permanent source of truth for the FTN Platform Website repository. It is derived from
`FTN_Master_Asset_Library_v1.0/00_FTN_MASTER_ASSET_LIBRARY_MANIFEST_v1.0.txt.txt` and AEB boards
01–13. Update it whenever architecture, tooling, or brand direction changes materially — it should
never drift out of sync with reality. Governed by `GOVERNANCE/FTN_Platform_Constitution_v1.0.md`
(RC3, §7.7) where the two overlap. Platform release version/build/commit tracked in `VERSION.md`.

---

## 1. Project Identity

- **FTN Platform** — positioned as "The Operating System for Community Intelligence." Tagline set:
  "Connecting Communities. Empowering Governments. Building a Smarter Nation." / "One Platform. Many
  Solutions. One Mission."
- **Publisher:** RealityArtTV Media. Mission: "We educate, inform and inspire through powerful media
  that reflects truth, culture and community." Brand positioning: Independent, Bold, Authentic,
  Community Driven, Truth Focused, Impact Oriented. RealityArtTV Media is the parent company; FTN
  Platform is its flagship platform brand.
- **This repository builds the FTN Platform Website** — the public marketing/informational site for
  the whole FTN ecosystem.
- **Relationship to Community Connect:** Community Connect ("Report. Connect. Improve." /
  "Your voice. Your community. Your future.") is the primary product — a citizen reporting and
  community engagement app. It is a **separate application and a separate repository**. This site
  explains, promotes, and links to Community Connect (and may display its approved marketing
  screenshots/assets), but contains none of its source code.
- **Relationship to Mission Control:** Mission Control is the government-facing intelligence and
  operations dashboard (dark "operations centre" aesthetic) — also a separate product/codebase. This
  site may market Mission Control (case studies, dashboard preview imagery, agency-facing copy) but
  never implements its dark-theme UI on public pages and never contains its source code.
- **Platform ecosystem (per AEB-12):** FTN Platform is the master brand sitting above five current
  pillars — **Community Connect** (citizen reporting), **Mission Control** (government
  intelligence/operations), **FTN News** (community news & verified information), **Face The Nation**
  (civic discourse — "Every constituency. Every candidate."), and **FTN Intelligence** (data, AI &
  predictive community intelligence — "Data today. Better tomorrow."), plus a **Future Modules** slot
  (marketplace, FTN Polls, FTN Social, FTN Music, and other planned additions). Brand pillars across
  the ecosystem: Trusted Data, Citizen Voice, Actionable Insights, Transparent Governance,
  Sustainable Impact.
- **Long-term vision:** become the canonical public presence and trust layer for the entire FTN
  ecosystem — a single coherent brand surface that individually represents each pillar while making
  the "one platform" story legible to citizens, governments, media, and investors.

## 2. Repository Scope

**Belongs in this repository:**
- FTN Platform public website source (HTML/CSS/JS pages, static assets, build/deploy config).
- Production assets *extracted and optimized* from `FTN_Master_Asset_Library_v1.0/` and copied into
  this repo's own `/assets/` tree.
- Website-specific documentation (this charter, README, contributor notes).

**Does not belong in this repository:**
- Community Connect application source code, in any form.
- Mission Control application source code, in any form.
- Raw, unoptimized AEB board files used directly as production assets — the boards in
  `FTN_Master_Asset_Library_v1.0/` are reference/extraction source material, not shippable assets.
  Never link a live page directly at a raw AEB PNG.

**Non-negotiable, from the manifest:**
- **Never modify Community Connect source code, move files inside the Community Connect
  application, or rename its assets.** By the same logic, never modify Mission Control source either.
- Shared assets must always be **copied** from the asset library into this repo, never referenced
  in place from `FTN_Master_Asset_Library_v1.0/`.
- Do not redesign approved logos, invent new branding, or change approved colours.
- Permitted on existing approved assets: improving quality, vectorizing, optimizing/compressing,
  reorganizing, creating responsive variants, and improving accessibility.

## 3. Engineering Principles

- **Maintainability & simplicity** — clarity over complexity; consistency everywhere; no premature
  abstraction. This is a marketing/informational site, not an application platform — keep it that way.
- **Accessible by design**, not retrofitted.
- **Performance** — fast and lightweight is a stated design-system principle (AEB-06), not optional.
- **Security** — standard static-site hygiene: no secrets in the repo, sanitize any user-facing forms,
  subresource integrity for any third-party script.
- **Progressive enhancement** — the site must be usable with CSS/JS degraded; JS enhances, it doesn't
  gate core content.
- **Mobile responsive, mobile-optimized, desktop-enhanced** (explicit AEB-09 architecture principle).
- **SEO-first** — the website's job is discoverability and trust; see §13.
- **Human-readable code** — optimize for the next reader, not for cleverness.
- **Vanilla HTML/CSS/JavaScript unless a different technology is explicitly approved.** Do not
  introduce a framework, bundler, CSS preprocessor, or JS library without asking first — see §16.

## 4. Website Objectives

Per the manifest's purpose statement, the sitemap (AEB-09), and the ecosystem/brand boards
(AEB-11/12), the website exists to:

- Build trust in the FTN Platform and RealityArtTV Media.
- Explain what the FTN Platform is and how its pillars fit together.
- Explain Community Connect to prospective citizen users.
- Support governments/agencies evaluating Mission Control.
- Support media relations (press kit, media channels, brand assets).
- Support governments, municipal corporations, NGOs, universities, and strategic partners through a
  dedicated **Partnerships & Strategic Engagement** pathway (Founder Decision, 2026-07-11 — see
  below).
- Acquire users (app download CTAs are first-class UI throughout the boards).
- Improve organic search visibility.
- Become the single canonical public presence of the FTN Platform — the place all other channels
  point back to.

**Founder Decision (2026-07-11) — no investor-facing content on the public website.** AEB-10's
"Investor & Corporate Assets" roadmap category is **not** implemented as public website content.
The website must never publish investment material, projections, financial claims, or fundraising
language — that surface, if and when it's needed, lives behind a controlled process (private deck,
data room, or a founder-controlled contact workflow), never as publicly indexed content. In its
place: a **Partnerships & Strategic Engagement** pathway, which may eventually surface investors
among the audiences it serves, but is scoped around governments, municipal corporations, NGOs,
universities, and strategic partners — institutional relationships, not fundraising.

**Founder Decision (2026-07-11) — Face The Nation stays out of navigation and the 404 page** until
it is a real, live product within the FTN ecosystem. No placeholder page, no dead-end navigation
entry, no premature mention. When it launches for real, it gets integrated naturally — not before.
Until then, the 404 page directs visitors toward active products and active content only.

## 5. Brand Standards

### Authority hierarchy (source: AEB-10 Master Manifest table)

| Board | Title | Authority | Governs | Priority |
|---|---|---|---|---|
| AEB-01 | Brand Foundation | **HIGHEST** | All branding and identity | Critical |
| AEB-02 | Website & UI Components | High | UI component consistency | Critical |
| AEB-03 | Product & Website Assets | High | Product visual language | Critical |
| AEB-04 | Marketing & Media Assets | High | Public brand communication | Critical |
| AEB-05 | Mission Control Assets | High | Mission Control visuals | Critical |
| AEB-06 | Design System & Style Guide | High | All design system rules | Critical |
| AEB-07 | Icon Library & UI Elements | Medium | UI implementation | High |
| AEB-08 | Hero Artwork & Photography Direction | Medium | Visual tone & art direction | High |
| AEB-09 | Website Architecture & Page Structures | High | Website structure & flows | Critical |
| AEB-10 | Asset Production Roadmap | Low | Future production planning | Medium |

Three supplementary boards exist beyond the original manifest's board hierarchy: **AEB-11**
(RealityArtTV Media Identity), **AEB-12** (FTN Platform Ecosystem Reference), and **AEB-13**
(Community Connect Product Identity). Treat them as authoritative for their specific subject
(publisher identity, ecosystem map, and Community Connect's own product identity, respectively).

**Manifest's own global guidance (quote):** "Always follow AEB-01 for brand foundation. Follow AEB-06
for design system rules. Use AEB-02 for UI component construction. Use AEB-09 for website structure
& pages. Ensure accessibility, readability, contrast. Use approved color palette and typography.
Maintain consistency across all platforms. When in doubt, refer to this manifest."

### Core palette and type (high confidence)

- Core neutrals: Jet Black `#0B0B0B`, White `#FFFFFF`.
- FTN Red is the signature accent — see **known conflict** below before hardcoding its hex.
- Semantic accents exist for success/warning/info/danger — see **known conflict** below.
- Primary typography for the FTN Platform design system (AEB-01 §1.7 and AEB-06 §3): **Manrope**
  (primary) + **Inter** (secondary). Type scale (AEB-06): Display 48/56, H1 32/40, H2 24/32,
  H3 20/28, Body 16/24, Small 14/20, Caption 12/16.
- 8pt spacing grid; spacing scale runs 4/8/12/16/24/32/48/64/96/128px.
- Breakpoints (AEB-06 §3 Container Widths): Mobile 375px, Tablet 768px, Laptop 1024px, Desktop
  1260px, Ultra-wide 1820px+. Grid: 12 columns, 24px gutter, 24px margin.
- Border radius and shadow scales exist as design tokens (AEB-06) — pull exact values from the
  board or from extracted token assets (`design-tokens.css`, `color-*.svg`) when implementing, not
  from memory of this document (see conflict note below on why).

### ⚠️ Known conflicts in the source library — resolve with the founder before locking values into code

Re-reading every board surfaced real inconsistencies between boards that are each nominally
authoritative. Do not silently pick one — flag it (per §16/§17) and confirm with the founder before
a value goes into a shipped CSS token:

1. **FTN Red has two different hex values across the library.** AEB-01 (Brand Foundation, highest
   authority) specifies `#E31224`. AEB-06 (Design System), AEB-12 (Ecosystem Reference), and AEB-13
   (Community Connect Product Identity) all independently specify `#E10613`. Three of four sources
   agree on `#E10613`, but AEB-01 is nominally the highest-authority board for identity. This needs
   a founder decision, not an assumption.
2. **Success green has two different hex values.** AEB-01 specifies `#22C55E`; AEB-06/AEB-13 specify
   `#16A34A`.
3. **Typography is inconsistent for the FTN Platform design system itself.** AEB-01 and AEB-06 (the
   two boards the manifest names as authoritative for brand and design-system rules) specify
   Manrope/Inter. However, two files in the library — `11_AEB_Brand_Identity_Collection_v1.0.png.png`
   and `13_AEB_UI_Component_Standards_v1.0.png.png` — both render a board titled
   `AEB_DESIGN_SYSTEM_STYLE_GUIDE_v1.0` (i.e., a second, expanded copy of AEB-06's content) that
   specifies **Montserrat** instead of Manrope. RealityArtTV Media's own identity board (AEB-11, the
   correctly-labeled one embedded inside `12_AEB_Platform_Ecosystem_Reference_v1.0.png.png`) and
   Community Connect's product identity board (AEB-13, also embedded inside that same file) both
   also use Montserrat — so it's plausible Montserrat is correct for RealityArtTV/Community Connect
   sub-brands specifically while Manrope/Inter is correct for the FTN Platform master brand, but this
   is a guess, not a confirmed fact.
4. **File-to-board-number mismatch in the asset library itself:** the file named
   `11_AEB_Brand_Identity_Collection_v1.0.png.png` does not contain "Brand Identity Collection"
   content — it contains a duplicate/variant Design System Style Guide. The file named
   `13_AEB_UI_Component_Standards_v1.0.png.png` likewise contains a Design System Style Guide variant,
   not "UI Component Standards." The actual AEB-11/AEB-12/AEB-13 board content (RealityArtTV Media
   Identity, FTN Platform Ecosystem, Community Connect Product Identity) is all stacked inside the
   file named `12_AEB_Platform_Ecosystem_Reference_v1.0.png.png`. Don't trust filenames over embedded
   board titles when extracting assets — verify against the board's own header stamp.

**⚠️ SUPERSEDED 2026-07-11 — see the Version 1.1 Founder Decision immediately below.** The
2026-07-10 record directly beneath this notice is kept for history; do not treat it as current for
red or typography.

**Founder Decision (2026-07-11) — FTN Red and typography are now PERMANENT platform identity,
not website-scoped:**

- **Primary Brand Colour: FTN Red `#E10613`.** No longer a website-only implementation token —
  this is now the locked baseline identity of the FTN Platform.
- **Primary Typography: Montserrat (headings) + Inter (body).** Same status change — permanent,
  not scoped to this repo.
- **Primary Visual Direction: "dark-first institutional interface with restrained motion,
  disciplined spacing, high contrast and professional presentation."** Recorded verbatim from the
  Founder Decision — **resolved 2026-07-11: this describes the FTN Platform ecosystem as a whole
  (Mission Control, Observatory, Executive Briefing, operational dashboards, analytics consoles,
  future government-facing interfaces), not the public website.** "The website represents the
  public entrance. Mission Control represents the operational control room. Do not collapse those
  identities into one" — founder's words, verbatim, and now binding. The FTN Platform Website
  (this repo) stays **light-first**, using dark sections deliberately (to showcase products and
  create rhythm) exactly as it already does — not as a wholesale re-theme. See the per-surface
  direction below, now confirmed rather than open.
- **Asset Library v2.0's purpose is now narrower than originally planned:** it adds photography,
  illustration, iconography, motion language, and print standards — it does **not** revisit FTN
  Red or typography, which are closed. `FTN_Master_Asset_Library_v1.0/` remains frozen and
  untouched regardless (§2) — this only changes what v2.0 is *for*.
- **Still open, unaffected by this decision:** success green (`#22C55E` vs `#16A34A`) was not
  addressed by the 2026-07-11 Founder Decision and remains reserved. This is the direct cause of
  the one outstanding WCAG AA failure on the live site (`indicator-card__change--up` /
  `mc-kpi-card__trend--up`, 3.29:1 against white, needs 4.5:1) — still do not silently pick a
  shade; still raise it with the founder before touching it.
- The 2026-07-10 record below predates this decision and is retained as history only.

**2026-07-10 record (superseded for red/typography, retained for history — still governs
everything else, including success green and any other not-yet-decided token):**

- Use the approved branding **exactly as it currently exists** in the supplied assets.
- Do not redesign logos. Do not recolor assets. Do not substitute typography. Do not regenerate
  branding.
- Extract existing approved assets exactly as they appear — pixel/vector fidelity to the source,
  not a reinterpretation of it.
- If a still-open conflict (success green; the "dark-first" scope question above) would affect an
  implementation decision, **stop and ask before hardcoding the token.** Do not average, guess, or
  pick a "majority" value — even where this charter notes one reading is numerically more common
  across boards, that observation is not authorization to use it.

### Per-surface style direction (confirmed permanent, Founder Decision 2026-07-11)

- **FTN Platform Website (this repo):** light-first, premium, modern SaaS, government-grade; black,
  white, FTN red — with disciplined, deliberate dark sections (bands, product-preview app-shells)
  used to showcase products and create visual rhythm, never as the page default. This is
  intentional and permanent, not a placeholder pending a future dark redesign.
- **Community Connect app:** light theme, professional, fast, accessible.
- **Mission Control, Observatory, Executive Briefing, operational dashboards, analytics consoles,
  and future government-facing interfaces:** dark-first operations-centre aesthetic. Never apply
  this as the default styling of public website pages — reuse it only in the same disciplined,
  bounded way already established (e.g. the Observatory/Mission Control demo hero bands, the
  executive-dashboard preview cards on the marketing pages).

### Photography & art direction (AEB-08)

Do: real photography (not stock), high contrast, diverse/inclusive/authentic subjects, positive
action, clean layouts, FTN red reserved for CTAs. Don't: stock clichés, overcrowded layouts, low
contrast, yellow/blue accent colors, generic icon-only hero art. Visual tone pillars: Trusted,
Connected, Empowered, Progress, Transparent.

## 6. Asset Standards

- Extraction rules (manifest): extract assets individually; generate SVG, PNG, WEBP, and AVIF where
  appropriate; maintain proportions and colours; use sRGB; optimize for web; generate transparent
  backgrounds where indicated.
- Two naming conventions exist for two different purposes — don't conflate them:
  - **AEB extraction/intermediate files** (AEB-10): `aeb-[board-id]-[category]-[name]-v1.[ext]`,
    e.g. `aeb-03-mockup-app-dashboard-v1.png`.
  - **Final production asset filenames** shipped in this repo (manifest): lowercase,
    hyphen-separated, e.g. `logo-ftn-platform-primary.svg`, `community-connect-dashboard.webp`,
    `button-primary.svg`, `hero-homepage.webp`, `background-grid-light.svg`.
- Never redesign approved logos or invent new branding while extracting — if a needed asset doesn't
  exist on any board, ask (see §16), don't fabricate it.
- Do not alter proportions or weights of extracted icons/logos.
- Group related assets in subfolders; keep filenames consistent with the boards' own naming where a
  board specifies one (see each board's Asset Manifest table).

## 7. Folder Standards

Recommended asset structure (manifest, verbatim categories):

```
/assets/
  logos/  icons/  buttons/  hero/  photos/  community/  ui/
  backgrounds/  patterns/  playstore/  press/  social/
  mission-control/  downloads/  typography/
```

This repo's own convention for the rest of the site (not manifest-specified — a reasonable default
for a vanilla HTML/CSS/JS static site; revisit if the founder prefers otherwise). Current actual
structure as of Phase 3:

```
/
├── index.html                        # Homepage
├── about/index.html                  # Mission, Vision, Founding Principles, Philosophy, Vision
├── community-connect/index.html      # Overview, Features, Workflow, Benefits, Privacy, FAQ
├── mission-control/
│   ├── index.html                    # Government Dashboard, Analytics, Security, Future Modules (marketing)
│   └── demo/index.html               # Interactive Demonstration — public preview, not the secure product
├── observatory/index.html            # FTN Live — National Observatory (indicator wall, live clocks)
├── resources/index.html              # FAQ, Documentation status, Media Kit
├── contact/index.html                # Inquiry categories, contact form, direct contact (placeholder)
├── insights/index.html               # Coming Soon (AEB-09 page-type 12)
├── news/index.html                   # Coming Soon (AEB-09 page-type 12)
├── sitemap/index.html                # Full page list
├── 404.html                          # Custom 404 (root, not /404/ — required at this path for
│                                      # GitHub Pages/Netlify/most static hosts to auto-serve it)
├── sitemap.xml                       # Real sitemap, all 16 pages (RC1, §7.5) — placeholder domain
├── robots.txt                        # RC1, §7.5 — placeholder domain in its Sitemap: line
├── accessibility/index.html          # Genuine content — WCAG 2.2 AA target, not a legal placeholder
├── legal/
│   ├── privacy-policy/index.html     # Founder-drafted content, integrated 2026-07-12 (§7.9)
│   ├── terms-of-service/index.html   # Founder-drafted content, integrated 2026-07-12 (§7.9)
│   ├── cookie-policy/index.html      # Founder-drafted content, integrated 2026-07-12 (§7.9)
│   └── data-retention/index.html     # Founder-drafted content, integrated 2026-07-12 (§7.9)
├── assets/
│   ├── logos/                        # logo-ftn-platform-primary-{light,dark}.svg
│   ├── icons/                        # favicon.svg + favicon-32.png + apple-touch-icon.png (RC1)
│   │                                  # + hand-authored UI/social icons
│   ├── social/                       # og-image-default.png (RC1, §7.5) — generated 1200x630 card,
│   │                                  # composed from the approved wordmark + tagline, not new art
│   ├── community/                    # RC2, §7.6 — real device-mockup screens + dashboard preview,
│   │                                  # extracted from FTN_Master_Asset_Library_v1.0 AEB-03 §3.4/3.5
│   ├── observatory/                  # RC2, §7.6 — ftn-live-preview.webp, a Playwright screenshot
│   │                                  # of this site's own live /observatory/ page
│   └── mission-control/              # RC2, §7.6 — executive-dashboard-preview.webp, a Playwright
│                                      # screenshot of this site's own live /mission-control/demo/
├── css/
│   ├── tokens.css                    # design tokens (color/type/spacing/radius/shadow/breakpoints)
│   ├── base.css                      # reset, container, focus states
│   ├── utilities.css                 # small spacing/color/width utility classes
│   ├── main.css                      # canonical load-order reference only (RC1: each page links
│   │                                  # every component file directly — see §7.5 — not this file)
│   └── components/                   # nav, footer, buttons, blocks, accordion,
│                                      # content-sections, form, legal, trust-card, charts,
│                                      # observatory, mission-control-demo, presentation-control
├── js/
│   ├── nav.js                        # mobile menu + dropdown behavior (progressive enhancement)
│   ├── platform-mode.js              # global Presentation/Live Mode flag, loads first (v1.3, §7.8)
│   ├── data-source.js                # datasource seam a future production engine plugs into (v1.3, §7.8)
│   ├── presentation-control.js       # floating Presentation Mode control (v1.3, §7.8)
│   ├── storage.js                    # RC3, §7.7 — shared localStorage JSON get/set/remove helper
│   ├── contact-form.js               # client-side validation; honest no-backend status message
│   ├── indicators-data.js            # FTN Live indicator registry (~70 demo indicators, see below)
│   ├── ads-data.js / ads.js          # advertisement campaign registry + generic panel renderer
│   ├── charts.js                     # dependency-free SVG sparkline/line/bar/gauge helpers +
│   │                                  # shared trendGlyph() (RC3, §7.7)
│   ├── trust-card.js                 # shared accessible modal — renders any indicator/evidence object;
│   │                                  # also the shared classificationBadgeClass() (RC3, §7.7)
│   ├── live-clocks.js                # interpolation engine for ticking demo counters + Fast Counter Engine
│   ├── observatory.js                # renders the indicator wall, kiosk mode, dashboard customization
│   ├── mission-control-data.js       # Mission Control demo data (correlations, graph, scenarios, etc.)
│   ├── mission-control-demo.js       # tabs + all 8 Mission Control demo panel behaviors
│   ├── source-registry.js            # real external source URLs, keyed by sourceId (Phase 3.5)
│   ├── display-config-data.js / display-config.js   # venue presets + named Saved Layouts (Phase 3.5/4)
│   ├── display-mode.js               # Fullscreen Display Mode + background promotion layer (Phase 3.5)
│   ├── ad-packages-data.js           # commercial tier capability structures, no pricing (Phase 3.5)
│   ├── benchmarks-data.js / seasonal-profiles.js / founder-controls.js   # architectural stubs (Phase 3.5)
│   ├── relationships-data.js         # shared Relationship Engine — single source of truth for
│   │                                  # correlation/influence/dependency/parent-child edges (Phase 4)
│   ├── reality-insights.js           # "The Nation Is Speaking" — generates a pool of insight
│   │                                  # sentences strictly from real indicator/relationship fields (Phase 4)
│   ├── today-panel.js                # "Today in Trinidad & Tobago" — real sunrise/sunset/moon-phase
│   │                                  # calculations + calendar countdowns (Phase 4)
│   ├── what-changed.js               # groups real changeLabel deltas into Y/Y, Q/Q, M/M, Recent (Phase 4)
│   ├── national-memory.js            # getHistoricalComparison() over real sparkline history;
│   │                                  # snapshot() is a documented throwing placeholder (Phase 4)
│   ├── community-profile-data.js / community-profile.js   # reusable community-profile modal
│   │                                  # architecture + one demo instance (San Fernando) (Phase 4)
├── ANALYTICS_STANDARD.md             # operational rules for classification/confidence/weighting/etc.
├── 00_Phase1_Discovery/              # Discovery Report (planning artifact, not shipped site)
├── FTN_Master_Asset_Library_v1.0/    # reference source boards — never referenced live, never edited
├── GOVERNANCE/                       # RC3, §7.7 — FTN_Platform_Constitution_v1.0.md is the real
│                                      # content; the other 3 files here are unfilled templates
├── FTN_Strategic_Foundation_v1.0/    # RC3, §7.7 — founder working-draft strategic reference only
└── CLAUDE.md
```

## 7.1 The Indicator Engine (Phase 3)

`js/indicators-data.js` is a **registry, not a set of one-off widgets**. Every indicator — from
GDP to "estimated births today" — is a data object built by the same `ind()` factory and rendered
by the same functions (`observatory.js` cardHTML, `live-clocks.js` computeClockValue, `trust-
card.js` render). Adding an indicator means adding a data object, never new component code. See
`ANALYTICS_STANDARD.md` for the classification rules every entry must satisfy, and §16/§17 below
for why nothing in this registry is currently classified "Official" or "Sourced."

The indicator grid (`.indicator-grid`, `css/components/observatory.css`) uses CSS Grid
`repeat(auto-fill, minmax(240px, 1fr))` — a constraint-based layout, not a hand-maintained set of
breakpoints — specifically so the wall scales from 5 indicators to hundreds without a redesign.

Dashboard customization (show/hide categories) is implemented client-side via `localStorage` on
`/observatory/` — a real, working foundation for what a future multi-organization version would
do server-side per account, not a mockup.

The advertisement system (`js/ads-data.js`, `js/ads.js`) treats ads as **configurable dashboard
panels** driven by a campaign registry (placements, dates, status), not hand-placed markup. The
current campaign is the approved Face The Nation co-brand lockup, rendered as an in-code SVG
(consistent with how every other logo in this repo is extracted — see §6) rather than an uploaded
image, since no production ad creative exists yet.

## 7.2 Phase 3.5 additions — real sources, display config, packages, kiosk runtime

- **`js/source-registry.js`** — the only place real external source URLs live. Indicators attach a
  `sourceId` (never a hardcoded URL) and Trust Cards resolve it to a clickable
  `target="_blank" rel="noopener noreferrer"` link. An indicator with no supplied source correctly
  has no `sourceId` and stays `Demonstration` — do not invent one to fill the field.
- **`js/live-clocks.js` Fast Counter Engine** (`getRateBreakdown`/`getPaceLine`) — normalizes any
  ticking indicator's config into a per-second rate and generates the "About TT$620 every second"
  line. Every clock value is still `benchmark + elapsed × rate`, recomputed fresh each tick (see
  the `visibilitychange` handler) — never an incremented counter that can drift.
- **`js/display-config-data.js` + `js/display-config.js`** — venue presets and a config
  form/localStorage layer, deliberately generic (not Observatory-specific) so a future kiosk or
  widget page can reuse it unchanged. Renders via the `ftn:display-config-changed` event rather
  than a direct function call, keeping the config layer decoupled from whatever renders indicators.
- **`js/ad-packages-data.js`** — commercial tier *capability structures* (no pricing). Its `id`
  values intentionally match `DisplayConfig.adLevel` so a package and a display configuration
  describe the same axis from two angles.
- **`js/display-mode.js`** — shared Fullscreen Display Mode + the low-opacity (~7%) rotating
  background promotion layer. Disabled under `prefers-reduced-motion`; never intended to be
  consciously read like a banner.
- **`js/benchmarks-data.js`, `js/seasonal-profiles.js`, `js/founder-controls.js`** — architectural
  stubs only. Benchmarks model the future daily server-side ingestion file this repo does not (and
  must not) fetch live; seasonal profiles are named placeholders at a neutral 1.0 multiplier; founder
  controls is an unauthenticated local-only preview (visibility toggle works, everything else in its
  "planned capabilities" list is deliberately not implemented).
- **Recorded Murders** (`js/indicators-data.js`) ships with no numeric value on purpose — see the
  comment on that entry. Do not fill in a specific current homicide total without an explicit
  founder- or news-verified benchmark; this is a sensitive, checkable public-safety statistic, not
  one to estimate for visual effect.

All internal links use root-relative paths (`/about/`, `/assets/...`) rather than page-relative
paths, since pages live at varying folder depths — this was a Phase 2 correction to a Phase 1
oversight (see git history). Every page shares byte-identical header and footer markup, hand-kept
in sync via a one-time generator script (not part of the shipped site) rather than a templating
engine, consistent with the vanilla-only mandate in §3.

## 7.3 Phase 4 additions — Relationship Engine, Reality Insights, Discovery, National Memory

Phase 4's mandate was to evolve the Observatory from a data wall into a legible, trustworthy,
explorable product, while continuing the standing "build the platform once, reuse it everywhere"
principle from the mid-Phase-3 addendum. Every new engine below is deliberately generic — built for
Mission Control, FTN Live, and future FTN Platform surfaces to share, not a one-off for `/observatory/`.

- **`js/relationships-data.js` — the shared Relationship Engine.** Previously, Mission Control's
  correlation data was a private array inside `mission-control-data.js`. It is now generalized into
  a single registry (`{ all, get, forIndicator, random }`) with `fromIndicatorId`/`toIndicatorId`
  fields that link to real entries in `indicators-data.js` where they exist, plus `type`
  (`correlation` / `influence` / `dependency` / `parent-child`), `direction`, `strength`, and
  `confidence`. `mission-control-data.js`'s `MC.correlations` now reads from this registry instead
  of duplicating it. Trust Cards render a "What this connects to" section from the same registry,
  with chain-navigable buttons (`data-trust-card="otherId"`) so a citizen can walk the relationship
  graph card-to-card. This is the pattern to extend, never fork, when a future pillar needs its own
  correlation data.
- **`js/reality-insights.js` — "The Nation Is Speaking."** Generates a pool of insight sentences
  (trend / watch / relationship / pace / aggregate types) computed strictly from real fields already
  present on indicators and relationships. Only *which* true insight is surfacing rotates — the
  content itself is never invented. Do not add an insight type that requires a fact the registry
  doesn't actually have.
- **`js/today-panel.js` — "Today in Trinidad & Tobago."** Real astronomical calculations: NOAA/
  Wikipedia solar position equations for Port of Spain's actual coordinates (10.65°N, 61.4°W), moon
  phase computed from a known reference new moon plus the synodic month constant
  (29.53058867 days), and local time via `Intl.DateTimeFormat` with
  `timeZone: 'America/Port_of_Spain'` — never a hardcoded UTC offset, which would silently break
  across daylight-saving-adjacent regions or if the runtime's assumptions changed. The rendered panel
  discloses its own methodology in-line ("calculated ... using standard solar/lunar position
  formulas — not a live feed") so it's never mistaken for a real-time feed.
- **`js/what-changed.js`.** Parses the existing `changeLabel` strings already on indicators (e.g.
  "+1.8% y/y") via regex and groups them into Year-over-Year / Quarter-over-Quarter /
  Month-over-Month / Recent buckets. It does not compute new deltas the registry doesn't already
  express — it only reorganizes existing labels for legibility.
- **Trust Card enrichment (`js/trust-card.js`).** Added a `WHY_IT_MATTERS` category-to-explanation
  map, a `freshness(lastUpdated)` helper, and the relationships section described above. This is the
  one shared modal every surface (Observatory, Mission Control demo, Community Profile) reuses —
  extend it in place rather than building a second modal.
- **Discovery + search (`js/observatory.js`).** `#indicator-search` filters the live wall by title;
  Random Indicator / Random Relationship / Did You Know buttons open the Trust Card or advance the
  Reality Insight on demand. All discovery surfaces reuse the existing Trust Card and Reality
  Insights engines rather than introducing new display components.
- **Named Saved Layouts (`js/display-config.js`).** Extended the existing single-active-config
  `localStorage` layer (Phase 3.5) with a separate array of named, persisted layouts
  (`ftn-display-layouts` key): save-as, load, duplicate, delete. The active-config key
  (`ftn-display-config`) and the named-layouts key are intentionally separate — loading a saved
  layout copies it into the active slot rather than merging the two concepts.
- **`js/national-memory.js`.** `getHistoricalComparison(indicatorId, offsetA, offsetB)` does real
  arithmetic over each indicator's existing sparkline history array. `snapshot(dateISO)` is a
  **documented throwing placeholder** — it deliberately does not return a fabricated historical
  value for an arbitrary date, since this repo has no real dated historical dataset yet. Do not
  implement a fake return value for `snapshot()` to make a future feature "work"; wire it to a real
  dataset when one exists, or leave it throwing.
- **`js/community-profile-data.js` + `js/community-profile.js`.** A generic `profile()` factory and
  a `profiles` registry, with one demo instance (`san-fernando`) populated with clearly-labeled
  demonstration content. This is explicitly **not** Community Connect data or a reproduction of the
  Community Connect product — it's a reusable shell for what a future community landing surface
  could look like, reusing the Trust Card's own CSS classes (`.trust-card-dialog`) rather than a new
  modal system.
- **Ad message-type labeling (`js/ads-data.js`, `js/ads.js`).** Campaigns now declare a
  `messageType` (e.g. `"FTN Promotion"`) rendered on the ad panel instead of a hardcoded
  "Advertisement" label, so future non-house campaigns can be labeled accurately (sponsored content,
  paid placement, PSA, etc.) without a code change.
- **Kiosk-mode polish (`css/components/observatory.css`).** Enlarged key readability targets
  (`.hero-clock__value`, `.ad-rail__tagline`, `.reality-insight__text`) and hid panels that assume
  closer reading distance/interaction (`#today-in-tt`, `#what-changed`, `#commercial-packages`,
  `.search-discover-row`) under `body.kiosk-mode`, consistent with kiosk mode's existing purpose as
  a from-a-distance display surface rather than an interactive session.

## 7.5 Release Candidate 1 — cleanup, contrast fixes, deployment readiness

RC1's mandate was not new features but stabilizing and polishing everything built in Phases 1–4
for a first public deployment: dead-code cleanup, cross-page consistency, a real performance fix,
a real WCAG audit (not just a checklist read), full responsive/regression re-verification, and
the deployment-readiness files a static site needs before it can be hosted for real.

- **CSS delivery changed from `@import` chain to parallel `<link>` tags.** `css/main.css`'s
  16-file `@import` chain was a genuine render-blocking waterfall (browser can't discover
  `tokens.css` needs fetching until `main.css` itself has downloaded and parsed, then discovers
  `base.css`, and so on, serially). Every page's `<head>` now links each component stylesheet
  directly, in the same cascade order, so the browser fetches all of them in parallel. `main.css`
  itself is kept only as a documented reference of the canonical load order — it is not loaded by
  any page. If you add or reorder a component stylesheet, update both `main.css` and the `<link>`
  block in every page's `<head>`.
- **Dead code removed** (low-risk only, verified unreferenced before removal): unused CSS
  (`.chart-card__header/__subtitle/--dark`, `.inquiry-option`, unused `.u-*` utilities),
  unused JS (`MC.regions`/`timeRanges`/`advisorOutcomes`/`advisorAreas`/`advisorBudgets`/
  `advisorHorizons` — `mission-control-demo.js` hardcodes the equivalent `<option>` lists instead;
  the dead `global.FTN.ads` export in `ads-data.js`). Extracted brand asset files
  (`logo-ftn-platform-primary-{light,dark}.svg`) were *not* removed even though currently
  unreferenced — they're approved production assets per §6, kept for future use, not dead code.
- **Real WCAG 2.2 AA contrast defects found and fixed via an automated axe-core sweep** (not just
  a manual read of the boards) — all in the "verify actual contrast, don't assume brand red passes
  at small sizes" territory §11 already warned about:
  - `.section__eyebrow` / `.page-hero__eyebrow` / `.reality-insight__title` used `--color-red`
    unconditionally, including on `.section--dark` bands, `.observatory-hero`, `.mc-demo-hero`, and
    the always-charcoal `.reality-insight` card — 3.97:1 and worse against black/charcoal. Fixed
    with a new token, `--color-red-on-dark` (`#E94750`, tokens.css) — the same resolved brand red,
    lightened just enough to clear 4.5:1 against both `--color-black` and `--color-charcoal`. This
    is a dark-surface contrast *variant* of the already-founder-resolved red, not a new brand color
    and not a reopening of the red-hex conflict in §5.
  - `.benefit-column--on-dark li` and `.section--dark .prose p` were silently falling back to
    `--color-graphite` (2.32:1 on black) instead of the intended `--color-silver` — the first was a
    genuinely missing override on the `--on-dark` modifier, the second an equal-specificity source-
    order tie between `.section--dark p` and `.prose p` that `.prose p` happened to win. Fixed with
    an explicit `.benefit-column--on-dark li` rule and a `.section--dark .prose p` override.
  - `.cta p` used `rgba(255,255,255,0.85)` on the solid-red CTA band (3.81:1) — switched to solid
    `--color-white` to match the CTA's own `h2`.
  - `.indicator-card__source` (the "via [Source]" link in indicator card footers) and
    `.legal-doc .placeholder-text` both used `--color-silver` on white (2.58:1) — switched to
    `--color-graphite`, which is already proven safe on white elsewhere on the site.
  - The `#16A34A` "trend up" green remains **unfixed and flagged**, not silently patched — see the
    new note in §5. Fixing it means picking a specific shade, which is the founder's reserved call.
- **Contact form accessibility gap fixed** (`contact/index.html`, `js/contact-form.js`,
  `css/components/form.css`): invalid required fields previously communicated only via a red
  border (`data-invalid="true"`), no text, violating "color is never the only signal" (§11). Each
  field now has a paired `<p class="form-field__error" role="alert">` wired via
  `aria-describedby`, and the field itself gets `aria-invalid` toggled on submit — screen readers
  now announce what's wrong, not just see a color change.
- **Skip-link target focus fix.** `<main id="main">` had no `tabindex="-1"`, so activating the
  existing skip link scrolled the viewport but left keyboard/AT focus on `<body>`. All 16 pages
  plus `404.html` now set `tabindex="-1"` on `<main>` so focus actually moves to the content region.
- **Button component states completed.** `.btn-secondary` and `.btn-outline` had `:hover` and
  `:disabled` but no `:active`/pressed state, unlike `.btn-primary` — added, matching the existing
  darkening pattern (§9 requires default/hover/active/disabled on every component that has them).
- **Deployment readiness files added:** `sitemap.xml` (all 16 real pages), `robots.txt`,
  `404.html` (reuses the same header/footer/page-hero pattern as every other page, `noindex`ed),
  a generated `assets/social/og-image-default.png` (1200×630, composed from the already-approved
  wordmark + tagline — not new branding, a responsive/derived variant per §6), and
  `assets/icons/favicon-32.png` / `assets/icons/apple-touch-icon.png` as raster fallbacks
  alongside the existing SVG favicon. Every page's `<head>` now carries Open Graph and Twitter Card
  tags, generated from that page's own existing `<title>`/description so they can't drift out of
  sync with on-page content.
  - **⚠️ Placeholder production domain:** no real domain has ever been assigned to this build —
    nothing in the repo referenced one before RC1, and this wasn't a founder decision available to
    look up. `sitemap.xml`, `robots.txt`'s `Sitemap:` line, and every page's `og:url`/`og:image`/
    `twitter:image` currently use `https://www.ftnplatform.com` as an explicitly-commented
    placeholder. **This must be replaced with the real production domain before go-live** — it is
    not a founder-approved brand fact, just the minimum needed for these files to be valid.

## 7.6 Release Candidate 2 — product journey, real screenshots, Display Mode maturity

RC2's mandate was product and experience, not new engines: turn the site from an engineering
demonstration into a coherent public product, using only capabilities that already exist. No
Community Connect or Mission Control source was touched; no unsupported functionality was invented.

- **Real Community Connect screenshots.** `FTN_Master_Asset_Library_v1.0/03_AEB_Product_Website_Assets_v1.0.png.png`
  §3.5 ("Device Mockups — App Screens", AI-extraction-approved, CRITICAL priority) and §3.4
  ("Dashboard Preview") contain actual reference UI mockups, not just icons — these had never been
  extracted before RC2. Cropped and exported to `assets/community/` (5 phone screens: splash,
  report form, activity feed, report details, dashboard; plus the web dashboard preview). Used on
  the homepage Community Connect section (a 3-screen teaser strip) and in full on
  `community-connect/index.html`'s `#screenshots` section, replacing the empty
  `.screenshot-frame` placeholders and their "production screenshots haven't been captured yet"
  copy. These are still reference mockups ("final UI may vary" per the source board), not literal
  production screenshots — the page copy says so honestly.
- **Real FTN Live and Mission Control previews.** Rather than extract more board imagery, these two
  are genuine Playwright screenshots of this repo's own live `/observatory/` and
  `/mission-control/demo/` pages — zero fabrication risk since it's this site's real, already-built,
  already-tested interface. Stored at `assets/observatory/ftn-live-preview.webp` and
  `assets/mission-control/executive-dashboard-preview.webp`. Reused on both the homepage and the
  Mission Control marketing page.
- **Homepage restructured into the explicit journey** (`index.html`): Problem (narrative band + "Why
  FTN Exists") → FTN Platform (Platform Overview) → Community Connect → FTN Live (new section) →
  Mission Control → How They Work Together (new `.platform-flow` diagram) → Evidence (stats,
  absorbed the old "Our Mission" blurb) → CTA. Removed the "Platform Benefits" section — its
  For-Citizens/For-Governments bullets duplicated what the Community Connect and Mission Control
  sections above it already said (§16: "remove, merge, or simplify anything that does not improve
  understanding").
- **`.platform-flow` (blocks.css)** — a small reusable flow-diagram component (node → arrow → node
  → arrow → two-way split), built for "How They Work Together" but generic enough for any future
  "how the pieces connect" explainer. Arrow glyph rotates 90° on narrow viewports so the diagram
  reads top-to-bottom on mobile without a second markup variant.
- **`.section-media` / `.phone-strip` (blocks.css)** — the shared presentation pattern for "put a
  real screenshot in a bordered, shadowed frame" and "show a small row of phone mockups." Reused
  across the homepage, Community Connect, and Mission Control rather than one-off image styling
  per page.
- **Mission Control marketing page realigned to the real demo** (`mission-control/index.html`): the
  old "Government Dashboard" module grid (Executive Overview, Reports Management, Analytics &
  Trends, Map Intelligence, Agency Performance, System Monitor) described a *different, uncoded*
  feature set from what `/mission-control/demo/` actually implements. Replaced with 8 cards
  matching the demo's real tabs verbatim (Executive Dashboard, Correlation Engine, Reality Graph,
  Scenario Studio, Evidence Explorer, Strategic Advisor, Timeline & Memory, External Influence),
  each deep-linking straight into that tab via `/mission-control/demo/#<tab-id>` (the demo already
  reads `location.hash` on load — `mission-control-demo.js` `initTabs()` — no new JS needed). The
  four old prose-only sections (Executive Brief, Agency Views, Analytics, Situational Awareness)
  were removed as redundant once the capability cards linked directly and accurately. The shared
  nav's "For Agencies" item now points to `#government-dashboard` (relabelled "Capabilities") since
  the page no longer has a separate agency-scoped section to distinguish it from "For Government."
- **Display Mode hardened into a real broadcast layer** (`js/display-mode.js`,
  `css/components/observatory.css`): `body.display-mode`/`html.display-mode` now sets
  `overflow: hidden` (no scroll, per the RC2 Display Network spec), and hides
  `.search-discover-row` and every `.trust-trigger` in addition to the site chrome already hidden —
  a broadcast display has no one to click a hover-only control. `#today-in-tt` and `#what-changed`
  are hidden too, same closer-reading-distance rationale kiosk-mode already established.
- **Rotating Display, built on the existing Saved Layouts engine, not a new one.** `display-config-
  data.js`'s previously-inert `rotation` flag (present since Phase 4, read nowhere) now does
  something: a `rotationIntervalSec` field, a real form checkbox + interval selector in
  `display-config.js`'s `formHTML()`, and `display-mode.js`'s `startRotation()`/`stopRotation()`,
  which cycle through `DisplayConfig.listLayouts()` via the same `loadLayout()` API the manual
  Saved-Layouts UI already uses — no second storage mechanism. Needs ≥2 saved layouts to do
  anything; with 0 or 1, rotation silently behaves as a Locked Display and the config form says so.
  `stopRotation()` restores whatever config was active *before* rotation started (captured once, at
  `startRotation()`), so leaving Display Mode never silently overwrites the user's saved active
  configuration with whatever layout the rotation happened to land on. The chrome bar's config-id
  field now reads "Locked · venue · density" or "Rotating · venue · density" depending on state.
- **FTN Live discoverability**: added a small "Explore the full indicator wall ↓" link
  (`.jump-to-indicators`) at the end of the What Changed panel, into `#indicator-search` — connective
  tissue between the storytelling panels (Reality Insight, Today in TT, What Changed) and the
  indicator wall + search/discovery row beneath them.
- **`.module-card` became a real link component**, not styling reused from a static card — added
  `:hover`/focus treatment (border + shadow + heading underline) consistent with the rest of the
  button/link system, since it's now a clickable deep-link into the demo, not inert text.

## 7.7 Release Candidate 3 — Architecture & Excellence Pass: Reality Engine, Presentation Engine

RC3 introduced repository governance: `GOVERNANCE/FTN_Platform_Constitution_v1.0.md` is now the
highest governing document for this platform (the correctly-named-but-placeholder
`GOVERNANCE/FTN_CONSTITUTION.md`, `FTN_BOUNDARIES.md`, and `FTN_EXCELLENCE.md` are unfilled
templates — treat the `_v1.0.md` file as the real Constitution content until the founder fills in
the others; don't be fooled by the filename mismatch, the same "verify against actual content, not
filename" lesson already logged for the AEB boards in §5). `FTN_Strategic_Foundation_v1.0/` holds
founder working-draft strategic reference material (presentation profiles, commercial catalogue,
revenue model, award readiness, competitive advantage, IP register) — text-only planning material,
authoritative below the Constitution and above ordinary repository/engineering guidance per its own
stated authority hierarchy.

This pass was architecture-only — no new pages, no new visible features. Everything below is either
a real correctness fix, a genuine deduplication, or a documentation/naming clarification.

### Reality Engine — a name for a system that already existed

The Constitution and Strategic Foundation both refer to a "Reality Engine" as a first-class
platform capability. No new file was created for it — it's the existing combination of:

- **Indicator Engine** (`js/indicators-data.js`) — the `ind()` factory registry (§7.1)
- **Relationship Engine** (`js/relationships-data.js`) — correlation/influence/dependency/
  parent-child edges (§7.3)
- **Trust Card System** (`js/trust-card.js`) — the shared modal exposing source, methodology,
  freshness, classification, confidence, and relationships for any of the above
- **Source Registry** (`js/source-registry.js`) — the only place real external source URLs live

Together these four already implement Constitution Article IX (Evidence Standard — "every
significant claim should expose its source, methodology, freshness and confidence") and Article
VIII (Data Philosophy — clearly distinguish Official/Sourced/FTN Derived/FTN Estimated/FTN
Modelled/Demonstration). "Reality Engine" is the name for this combination when discussing platform
architecture — do not build a fifth file called `reality-engine.js`; extend one of the four above.

### Duplication removed, one real bug fixed

An architecture survey found the same small pieces of logic independently reimplemented across
files that all load on the same pages — exactly the kind of drift Constitution Article V ("build
once, reuse everywhere") warns against:

- **Trend glyph** (▲/▼/—): was implemented separately in `observatory.js`, twice in
  `mission-control-demo.js` (KPI cards and the Scenario Studio), and `what-changed.js`. Now one
  function, `FTN.Charts.trendGlyph(trend)` (`js/charts.js`) — Charts already the natural shared
  home for visual-rendering helpers. The three call sites now call it instead of reimplementing it;
  `observatory.js` keeps a same-named local wrapper (`function trendGlyph(trend) { return
  global.FTN.Charts.trendGlyph(trend); }`) so its many internal call sites didn't need touching.
- **Classification badge class mapping** (Official/Sourced/FTN Derived/FTN Estimated/FTN
  Modelled/Demonstration → `trust-badge--*` CSS class): was byte-for-byte duplicated in
  `observatory.js` and `trust-card.js`. Now lives once, exported as
  `FTN.TrustCard.classificationBadgeClass(classification)` — the natural owner, since trust-card.js
  already exports the `TrustCard` namespace and already had this exact map internally.
- **Real bug fixed in the process**: `js/community-profile.js`'s badge markup was hardcoded to
  `trust-badge--demo` regardless of a profile's actual `classification` field — any future
  Community Profile with a non-Demonstration classification would have silently rendered the wrong
  badge color. Now calls the same shared `classificationBadgeClass()`, so it's correct by
  construction instead of correct by coincidence (every profile today happens to be Demonstration).
- **Shared localStorage JSON helper** (`js/storage.js`, new, loads on `/observatory/` only — it's
  the only page that currently touches `localStorage`): `FTN.storage.getJSON(key, fallback)` /
  `setJSON(key, value)` / `remove(key)`. Replaces three independent try/catch-wrapped
  `JSON.parse(localStorage.getItem(...) || '[]')` implementations in `display-config.js`,
  `founder-controls.js`, and `observatory.js` — one place to get storage-unavailable handling
  (private browsing, quota, disabled storage) right.

### Presentation Engine — early foundations, groundwork laid, not built out

`FTN_PRESENTATION_PROFILE_CATALOGUE.md` describes a full future Presentation Engine (22 named
profiles, 7 viewing-distance bands, 15 rotation/behaviour modes, reading-pace rules keyed to content
complexity, sunlight/night/broadcast visual modes). **None of that was implemented in RC3** — the
brief was explicit that this is architecture groundwork, not a feature pass, and building profiles
speculatively ahead of real venues/hardware would violate "do not invent unsupported functionality."

What already exists and *is* this system's early foundation, today: `js/display-config-data.js`
(`VENUE_PRESETS`, `DENSITY_MODES`) + `js/display-config.js` (load/save/apply + named Saved Layouts)
+ `js/display-mode.js` (fullscreen chrome + background promotion + rotation). A `VENUE_PRESETS`
entry already *is* a small, concrete instance of what the catalogue calls a "Presentation Profile"
— it just doesn't yet carry the catalogue's full dimension set (viewing distance band, ambient
light, reading-pace rules, etc.).

One concrete architectural step taken this pass: **`rotation: boolean` became `rotationBehavior:
'locked' | 'ordered'`** (`js/display-config-data.js`, `js/display-config.js`, `js/display-mode.js`).
This is a direct, minimal-risk alignment with the catalogue's documented Behaviour Modes list
(Fixed Page, Ordered Rotation, Random Rotation, Weighted Random Rotation, Scheduled Rotation,
Event-Driven Rotation, Emergency Override, ...) — the enum shape means a future "Random Rotation" or
"Emergency Override" mode is a new enum value and a new branch in `display-mode.js`'s
`startRotation()`, not another representation change. `'locked'` and `'ordered'` are the only two
values with real behavior behind them today; anything else the config object might contain is
inert, same as `rotation` was before RC2 gave it a real implementation.

**Left deliberately undone, and why:** distance-aware rendering, adaptive information density,
reading-speed timing, two-statistic story mode, weighted/random/scheduled rotation, emergency
override, sunlight/night visual modes, and the 22 named presentation profiles are all real,
well-specified future work — but implementing any of them now would mean guessing at hardware and
venues this project doesn't have yet. The architecturally honest move was to make the *existing*
system's extension points genuine (the enum above) rather than add speculative config fields or
CSS that nothing reads yet.

## 7.4 Version 1.2 — Institutional Identity Release (Design Language)

Version 1.2 was the site's first major *creative* release, following the founder's "Institutional
Identity Release" directive: the engineering/infrastructure phase was declared complete, and the
brief was to establish a permanent FTN design language and re-express the site through it — not to
add features. Nothing here changes a locked Founder Decision (§5); it's new vocabulary built inside
those constraints.

- **Hero-scale type token (`--text-hero-size`/`--text-hero-line`, `css/tokens.css`).** A fluid
  (`clamp()`-based), intentionally oversized outlier reserved for exactly one declarative moment per
  page — the homepage hero headline. Not part of the documented AEB-06 scale and never used for a
  running heading; using it a second time on the same page would dilute the one thing it's for.
- **The hero motif (`index.html` `.hero__motif`, styled in `blocks.css`).** The homepage hero was a
  placeholder box before this release ("Hero photography pending"). With no approved photography
  available, the resolution is a typography-led hero plus a restrained, hand-authored inline SVG of
  connected nodes — derived from the platform's own Relationship Engine concept (scattered
  observations connecting into one picture), not stock imagery or invented iconography. One node is
  rendered in FTN Red as a single accent, consistent with AEB-08's "red reserved for CTAs" spirit —
  restraint, not decoration. Hidden below 768px by design: at narrow widths there's no room for it to
  sit clear of the hero text, and the typography alone already carries the hero.
- **The scale-band device (`.scale-band`, `blocks.css`).** Replaces the old flat "narrative-band"
  paragraph. Visualizes the founder's own framing — citizens/councillors/mayors/ministers/national
  leadership each seeing a different, partial slice of reality — as an escalating typographic list
  where each line is physically larger than the last, enacting the "zooming out" the copy describes.
  Marked up as a real `<ul>`/`<li>` list (not `<p>` tags) so it still reads as a list to assistive
  technology despite the visual escalation.
- **Editorial split (`.editorial-split`, `blocks.css`).** A two-column "big statement + supporting
  prose" layout used once, immediately after the hero/scale-band, so the homepage doesn't fall into
  a repeating eyebrow → h2 → paragraph → card-grid rhythm for its entire length.
- **404 page and footer.** The 404 page now uses the same `module-card` vocabulary already used
  elsewhere (composed from existing blocks, per §8's "prefer composing before inventing" rule)
  instead of a single generic "back to homepage" link. The footer gained a red top border, an
  elevated (Montserrat, larger) tagline treatment, and eyebrow-style uppercase/tracked column
  headings — bringing it into the same visual language as the rest of the site rather than reading
  as a plain utility block.
- **Nav hover treatment (`nav.css`).** Desktop nav triggers now reveal a thin red underline on
  hover/open instead of a flat grey background fill — a more editorial, less generic-SaaS affordance,
  consistent with the red accent's use throughout.
- **Homepage brand-hierarchy fix.** The homepage `<h1>` previously read "Report. Connect. Improve." —
  Community Connect's own tagline (§1), not the platform's. It now leads with the platform's own
  narrative thesis ("No one sees the whole picture.") with FTN Platform's actual tagline
  ("Connecting Communities. Empowering Governments. Building a Smarter Nation.", §1) as a supporting
  line, so the homepage speaks as the platform rather than borrowing a sub-product's voice. The
  `<title>`/`og:title`/`twitter:title` changed to "FTN Platform — The Operating System for Community
  Intelligence" for the same reason.
- **Not touched:** the success-green conflict (§5) remains untouched and out of scope — it's a
  founder-reserved decision, not a creative one.

### Version 1.2.1 — Design Language Completion

v1.2.0 established the FTN design language on the homepage only; every interior page still used
one flat `.page-hero` template with large dead whitespace at desktop widths and an identical
open/close rhythm. v1.2.1 extends the language across all 17 pages without diluting the homepage.

- **Page-hero panel family (`content-sections.css`, `.page-hero--split` + `.page-hero__panel`
  modifiers).** A shared two-column grid whose right-side panel does a different, genuine job per
  page family instead of repeating one composition: `.page-hero__index` (a real numbered section
  index — About), `.page-hero__media-frame` (real product imagery reusing already-approved
  RC2 assets — Community Connect, Mission Control), `.page-hero__quicklinks` (Resources),
  `.page-hero__note` (Contact), `.page-hero__facts` (Accessibility). Same FTN typographic DNA,
  different device each time — the point of "consistency without repetition."
- **Platform ecosystem diagram (`about/index.html` Our Vision, `.ecosystem` in
  `content-sections.css`).** Community Connect / Mission Control / FTN Live shown status-labelled
  "Live"; Insights / News & Stories "In Development"; a generic "Future Modules" node "Exploring."
  Face The Nation is deliberately absent — the standing Founder Decision (§4) keeping it out of
  navigation and mentions until it's a real live product governs this too, not just the nav/404.
- **Coming Soon pages redesigned** (`insights/`, `news/`) — specific headlines plus a 3-card
  preview of what each will contain, grounded only in capabilities the platform's existing
  architecture (Indicator Engine, Relationship Engine) already has. No fabricated screenshot,
  date, or feature promise.
- **Sitemap rebuilt** as a categorized card grid mirroring the footer's own Platform/Resources/
  Legal grouping. **All four legal pages** gained a real in-page index anchored to their own
  `<h2>` sequence (`.legal-index`) — genuine wayfinding for a long document, not decoration.
- **One motion moment (`js/reveal.js` + `base.css`).** A fade/rise reveal on hero content and a
  handful of key blocks (the scale-band, the ecosystem diagram, preview grids). Progressive
  enhancement throughout: content is fully visible with JS disabled, with
  `prefers-reduced-motion`, or if `IntersectionObserver` is unsupported. Carries a bounded
  per-element fallback timer (1.2s) — testing surfaced that relying solely on the observer left a
  theoretical path for content to stay invisible if it never fired for a given element; the
  fallback guarantees nothing can stay hidden waiting on JS. This is the site's only motion
  anywhere — deliberately singular, not a pattern to scatter onto every element.
- **Mission Control Demo and Observatory deliberately untouched** — already carry custom visual
  systems, scored well in the independent creative review that motivated this release, and were
  judged a worse risk/reward ratio than the pages actually needing the work.

**Executive Polish pass (2026-07-12) locked the visual experience.** A full-journey consistency
review (typography, spacing, hierarchy, component reuse, responsive behavior) across every page
found and fixed three real defects (News/Insights hero pattern, the Community Impact panel's ad
hoc styling instead of the real `.stat` component, Mission Control Demo's repeated "(demo)" KPI
suffix) and confirmed two suspected issues were test-methodology false positives, not product
bugs. From this point forward, changes to this repository are architectural, not cosmetic, unless
a verified defect is found — do not re-open visual polish without a new founder directive.

## 7.8 Version 1.3 — Presentation Mode / Live Mode Infrastructure

Platform infrastructure, not a UI feature: a single global mode every flagship platform reads the
same way, so a future production engine can replace what today is demonstration data without the
interface ever needing a redesign. Presentation Mode and Live Mode are required to share identical
layouts, navigation, workflows and interactions — the only thing ever allowed to differ is which
tier of data a page resolves through the seam below.

- **`js/platform-mode.js` — the one global mode flag.** Loads first, before every other script, on
  all 17 pages. `FTN.PlatformMode.get()`/`set(mode)`/`isPresentation()`/`isLive()`, persisted to
  `localStorage` (`ftn-platform-mode`, default `'live'`), broadcasting `ftn:platform-mode-changed`
  on change. Deliberate entry is a `?mode=presentation` (or `?mode=live`) URL parameter, consumed
  once and stripped via `history.replaceState` so it never gets bookmarked as if permanent — this
  is the "intentional action through the normal interface" a mode switch requires. There is no
  UI control anywhere that switches Live Mode into Presentation Mode; only the reverse direction
  (Presentation → Live) has an interface affordance, in the floating control below. A mode change
  takes effect on next navigation/reload, not live mid-page — consistent with every dataset below
  being resolved once, at page load.
- **`js/data-source.js` — the datasource seam.** `FTN.DataSource.register(key, tier, data)` /
  `resolve(key)`. `js/indicators-data.js`, `js/relationships-data.js`, and
  `js/mission-control-data.js` each register their dataset under a `'presentation'` tier and then
  resolve that same key straight back into `global.FTN.indicators` / `global.FTN.Relationships` /
  `global.FTN.MC` exactly as before — no rendering code anywhere changes shape. When a real
  production engine exists, it registers a `'live'` tier under the same key; Live Mode then
  resolves to it automatically while Presentation Mode continues resolving to the presentation
  tier. **No `'live'` tier is registered today** — do not fabricate one. Both modes correctly
  resolve to the same presentation data right now; that is the honest starting state, not a
  simulated live feed. Verified by an identity check across all four data-driven pages (Observatory,
  News, Insights, Mission Control Demo): indicator/relationship/KPI counts are provably equal
  between Live and Presentation Mode today.
- **`js/presentation-control.js` + `css/components/presentation-control.css` — the floating
  control.** Renders only while `FTN.PlatformMode.isPresentation()` is true, on every page. Movable
  (pointer-drag on its handle, position persisted via `FTN.storage` to `localStorage` so it stays
  put across navigation), dismissible (hides for the current page view only — it reappears on the
  next page navigated to, since "available from every page" while the mode is active is the
  founder-locked requirement, not "permanently gone once closed"), and carries the one deliberate
  "Exit to Live Mode" action, which sets the mode and reloads. Respects
  `prefers-reduced-motion` on its status-dot pulse; becomes a full-width bottom bar under 768px
  rather than a corner pill.
- **`js/storage.js` is now loaded on all 17 pages** (previously Observatory-only), since the
  floating control's position-persistence needs it everywhere Presentation Mode can be active —
  not just on Observatory.
- **What this deliberately does not do:** no production engine was built (none was asked for —
  see the Founder Decision below); no page gained a mode-specific visual theme (Presentation Mode
  and Live Mode render pixel-identical except for the floating control itself, per the founder's
  explicit "only the datasource differs" rule); Mission Control's own demo-specific datasets
  (scenario studio inputs, evidence chains, timeline events — content that isn't part of the
  shared Indicator/Relationship Engine) were not individually wired through the seam beyond the
  top-level `MC` object registration, since nothing downstream of them needs to diverge by tier
  yet.

**Founder Decision (2026-07-12) — Presentation Mode is platform infrastructure, to be built once,
correctly, ahead of Version 1.0 Release Candidate.** Two phases remain after it: final legal
content integration, then an Executive Release Audit to determine public-deployment readiness. No
further feature development is planned before the Release Candidate.

## 7.9 Final Content Integration — Legal & Compliance

Before this pass, all four legal pages (`legal/privacy-policy/`, `legal/terms-of-service/`,
`legal/cookie-policy/`, `legal/data-retention/`) were structural placeholders — every section body
read `[Placeholder — this section requires legal review and founder approval before publication.]`
behind an on-page warning banner. This pass replaced that placeholder content with the founder's
own drafted **FTN Platform Website Version 1.0 Governance and Legal Framework** (2026-07-12),
preceded by a Claude-authored **Technical Compliance Audit** establishing the engineering ground
truth (no cookies, seven `localStorage` keys — all UI preferences, zero PII — an inert Contact
form, no analytics/tracking, fully static site) the legal content had to accurately reflect. Both
source documents are preserved in full under `GOVERNANCE/` — `FTN_Platform_Website_v1.0_Technical_
Compliance_Audit.md` and `FTN_Platform_Website_v1.0_Governance_and_Legal_Framework.md` — as the
canonical reference; the site pages are a formatted, integrated view of that content, not a second
independent source of truth.

- **Sections 1–4** of the Framework (Privacy Policy, Terms of Service, Cookie Policy, Data
  Retention Policy) are published verbatim on their matching pages, restructured into each
  founder-numbered subsection as its own `<h2>` (e.g. "1.6 Presentation Mode and Live Mode"
  becomes the heading "Presentation Mode and Live Mode") rather than force-fit into the old
  10–16-heading placeholder skeleton, which didn't match the founder's actual section count or
  order. The amber `.legal-banner` placeholder warning and `Status: Draft placeholder` line were
  removed from all four pages per explicit founder instruction ("do not use placeholder language");
  each page now reads `Effective date: July 12, 2026` instead. `css/components/legal.css` gained
  `ul`/`li`/`a` styling it previously didn't need (the placeholder pages had no lists or links in
  their body copy) and lost the now-dead `.legal-banner`/`.placeholder-text` rules.
- **"Contact us" sections across all four pages now link to the real `/contact/#general` anchor**
  (General Enquiries) rather than the Framework's literal "Privacy pathway" / "Legal pathway" /
  "Accessibility pathway" phrasing — the Contact page has no such named categories (its eight are
  General Enquiries, Government & Public Sector, Commercial Partnerships, Investors, Media & Press,
  Artist & Creative Services, Technical Support, Careers), so the published wording was adjusted to
  reference a pathway that actually exists rather than one that doesn't.
- **Sections 5 (Platform Transparency Statement), 6 (Community and Public-Information Principles),
  and 8 (Release and Version Governance) were deliberately not published as new site content.**
  5 and 6 overlap thematically with About's existing "Founding Principles"/"Our Philosophy"
  sections, but About is an already-accepted, Executive-Polish-locked page (§7.4) and editing it
  wasn't requested — adding them there would be a structural change made without that explicit
  instruction. 8's substance already exists on the live Terms of Service page (§2.4, "Presentation
  Information," independently states the same rule in near-identical terms). All three are
  preserved in full in the `GOVERNANCE/` source file, flagged for an explicit founder placement
  decision rather than silently added or silently dropped.
- **Section 7 (Accessibility Statement) was reconciled against, not used to overwrite, the existing
  `/accessibility/` page** — that page already carries genuine content from Release Candidate 1's
  real WCAG audit (§7.5) and states the same WCAG 2.2 AA target and contact-based reporting path in
  more specific terms (it names the real Contact/Support category by name). Left unchanged.
- **Section 9 (Required Review Before Publication) was never published** — it is an internal
  checklist addressed to the Founder and counsel (attorney review, confirming RealityArtTV Media's
  exact legal name, auditing Cloudflare account-level settings, a Google Fonts retain/self-host/
  remove decision, separate Community Connect legal documents before its app-store release). It
  lives only in the `GOVERNANCE/` source file and the corresponding Website Completion Program
  report.

## 8. HTML Standards

- Semantic HTML5 landmarks (`header`, `nav`, `main`, `footer`, `section`, `article`) on every page —
  the sitemap is landmark-shaped by design (see §4/§13 site structure).
- One `<h1>` per page; heading order must not skip levels.
- Every page maps to one of the 12 primary page templates defined in AEB-09 (Homepage, About Us,
  Community Connect, Mission Control, Insights Overview, Community Reports, News & Stories,
  Resources/Help Center, Contact Us, Privacy Policy, 404, Coming Soon) or is a clearly-scoped
  addition to that set — don't invent page types ad hoc without checking against the sitemap first.
- Reusable page sections should be built from the content-block vocabulary already defined in AEB-09
  §7: Hero Block, Feature Block, Stats Block, Call to Action, Testimonial, Partners Logo. Prefer
  composing pages from these before inventing new block types.
- No inline `style` attributes for anything beyond a genuinely one-off value; no inline event handler
  attributes (`onclick=`, etc.) — attach listeners from JS.

## 9. CSS Standards

- Author against the design tokens (color, type scale, 8pt spacing, radius, shadow, breakpoints) —
  don't hardcode magic numbers that duplicate a token.
- Mobile-first media queries, using the breakpoint set in §5 (375 / 768 / 1024 / 1260 / 1820px).
- Component states must be implemented as documented on AEB-02/AEB-06/AEB-13: default, hover,
  active/pressed, disabled/loading as applicable — don't ship a button or form control missing a
  state that's on the board.
- No CSS framework (Bootstrap, Tailwind, etc.) without explicit approval — see §3/§16.
- Avoid `!important`; avoid deep selector nesting; prefer a flat, component-scoped class naming
  convention (BEM or similar) so styles stay predictable as the site grows.

## 10. JavaScript Standards

- Vanilla JS, no framework, unless explicitly approved (§3/§16).
- Progressive enhancement: navigation, forms, and content must work with JS disabled/failed; JS adds
  behavior (mobile nav toggle, mega menu, tabs, accordions, form validation UX) on top of working
  HTML.
- No inline scripts mixed into HTML beyond a minimal bootstrap; keep behavior in `/js/`.
- Avoid global namespace pollution — module pattern or `type="module"` scripts.

## 11. Accessibility Standards

- Target **WCAG 2.2 AA** as the floor, consistent with the design system's own stated principle
  ("Accessible by design", "AA contrast" called out explicitly on AEB-06).
- Every icon-only control needs an accessible name; every image needs meaningful `alt` (or `alt=""`
  if purely decorative).
- Color is never the only signal (status badges, alerts, form errors all pair color with an icon
  and/or text label — as already modeled on the boards).
- Full keyboard operability for nav (including mobile menu/hamburger and mega menu), forms, and any
  interactive card/tab/accordion component.
- Maintain legible contrast for FTN red on both light and dark surfaces — verify actual contrast
  ratio, don't assume the brand red passes AA at small text sizes.

## 12. Performance Standards

Core Web Vitals targets (industry-standard "good" thresholds — treat as the bar for every shipped
page, not just the homepage):

- **LCP** (Largest Contentful Paint): ≤ 2.5s
- **INP** (Interaction to Next Paint): ≤ 200ms
- **CLS** (Cumulative Layout Shift): ≤ 0.1

Practical implications given a vanilla static site: serve WEBP/AVIF with a fallback per the
extraction rules in §6, size hero imagery deliberately (AEB-08 defines explicit device-mockup
breakpoints: 1440px laptop, 1024px tablet, 1920px desktop), set explicit width/height (or
`aspect-ratio`) on all images to avoid layout shift, and keep JS minimal per §10 so INP stays low
without needing a framework's hydration budget.

## 13. SEO Standards

- Unique, descriptive `<title>` and meta description per page.
- Structured data (JSON-LD) at minimum for `Organization` (RealityArtTV Media / FTN Platform) and
  `WebSite`; consider `SoftwareApplication` for Community Connect and `GovernmentService`-adjacent
  markup where Mission Control content targets agencies.
- Open Graph and Twitter Card tags on every page, using approved brand imagery (never a raw AEB
  board) for `og:image`.
- Semantic HTML (§8) — headings and landmarks are part of SEO, not just accessibility.
- Meaningful `alt` text on every image (§11) — also an SEO signal.
- Canonical URLs on every page.
- `sitemap.xml` generated from the AEB-09 sitemap; keep it in sync as pages are added.
- `robots.txt` present from day one; the 404 and "Coming Soon" page templates already exist in the
  sitemap (AEB-09 pages 11–12) — use them rather than ad hoc error handling.

## 14. Documentation Standards

- Keep this CLAUDE.md as the living charter — update it in the same change that changes architecture,
  tooling, or confirmed brand direction (e.g., once the founder resolves the conflicts in §5, update
  the hex/typography values here and remove the "known conflict" framing).
- Code comments only where the *why* isn't obvious from the code (a workaround, a constraint from a
  specific board, a non-obvious accessibility fix) — not restating what the markup/CSS/JS already
  shows.
- If a brand or architectural ambiguity gets resolved by the founder outside of this file (Slack,
  email, verbal), record the resolution here so it isn't re-litigated by a future session.

**Founder Decision (2026-07-11) — this file's own scope is intentionally shrinking, not growing.**
CLAUDE.md must not become the permanent repository for every founder decision, governance
clarification, design rule, roadmap note, and historical discussion — that path makes the platform
harder to understand as it grows, for humans and AI alike. The long-term intent is a proper
documentation architecture (Constitution, Governance, Founder Decision Register, Master Reference
Manual, Design Constitution, Brand Book, Engineering Standards, Developer Handbook, Release
Standards, Platform Glossary, Knowledge Base, Product Specifications, Architecture, Roadmaps,
Archive — one authoritative home per category, no document trying to be everything). This is
recorded as a Website v1.1 objective (see the Version 1.1 Implementation Roadmap, Phase 11) —
**not yet executed.** Until it's greenlit, keep using CLAUDE.md as today's working charter, but
don't let that stop you from noticing when something being added here really belongs somewhere
else once that structure exists.

## 15. Git Workflow

- Conventional, descriptive commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`) —
  focus the message on *why*, matching the standing project convention for this session.
- Never edit or delete files inside `FTN_Master_Asset_Library_v1.0/` as part of a website-feature
  commit — it's reference source, not part of the shipped site. Asset *extraction* work should
  produce new files under `/assets/`, leaving the source boards untouched.
- Don't commit unoptimized/raw exports — only the optimized SVG/PNG/WEBP/AVIF outputs described in
  §6 belong in `/assets/`.
- No secrets, API keys, or credentials in any commit.

### 15.1 Official Release Procedure (permanent, from 2026-07-11)

Every official release must complete, in order, and stop and report rather than assume success on
any step it cannot verify: repository audit (clean tree, no stray zips/temp/cache/duplicate/
obsolete files) → full verification pass (html-validate, stylelint, console, links, assets,
responsive incl. mobile/tablet/desktop/TV/portrait/kiosk, accessibility, regression) → version
info updated in `VERSION.md` (version/build/commit/date, internally consistent) → release commit →
push to the configured GitHub remote → deployment verification (only claim what was actually
observed) → cache validation → production smoke test → a source archive written to
`C:\Users\FGR\Desktop\Face The Nation\website version archive\` (never inside the repo, named
`FTN_Platform_Website_v<Major>.<Minor>.<Patch>_<YYYY-MM-DD>_<ShortCommit>.zip`, excluding `.git`/
`node_modules`/temp/cache/OS files/prior archives) → archive integrity verification → a release
report. Never report a push, deployment, or cache state as successful without having actually
checked it — if a step can't be verified (no remote configured, no deploy target, hosting platform
doesn't expose a check), say so explicitly rather than assuming success.

## 16. AI Collaboration Rules

**Ask before:**
- Introducing any framework, bundler, CSS preprocessor, or JS/CSS library — vanilla is the default
  (§3) until the founder explicitly approves an exception.
- Finalizing any brand color, font, or logo treatment that touches one of the conflicts listed in §5.
- Restructuring the sitemap, navigation, or footer structure defined in AEB-09.
- Touching anything that looks like it belongs to Community Connect or Mission Control source.
- Inventing a new page type, component, or brand asset that doesn't exist on any board.

**Document assumptions:**
- When a board is silent on a specific detail (a missing component state, an unspecified breakpoint
  behavior), pick the closest documented pattern from the same board family and note the assumption
  either inline (a short code comment) or in this file if it's a recurring/structural decision.

**Stop and request clarification:**
- Whenever two AEB boards conflict (as already found and logged in §5) and the resolution would
  affect shipped code.
- Whenever a request would require modifying Community Connect or Mission Control source.
- Whenever a request would require inventing branding not present anywhere in the asset library.

## 17. Founder Intent

- Preserve approved branding exactly as documented — this charter's job is to reduce ambiguity, not
  to make brand calls on the founder's behalf.
- Preserve the project vision in §1/§4 — new work should trace back to "build trust / explain the
  platform / support governments, media, investors / acquire users / improve search visibility /
  become the canonical public presence," not drift into unrelated feature scope.
- Never replace strategic direction with assumptions — the §5 conflict log exists precisely so
  ambiguity gets surfaced and resolved by the founder, not silently decided by whichever AI session
  happens to hit it first.
- Always explain significant trade-offs (e.g., a performance vs. visual-fidelity call on hero imagery,
  or a build-tooling exception) before committing to them.

## 18. Future Expansion

The FTN ecosystem already names five pillars plus a "Future Modules" slot (§1). Design this
repository so additional products (FTN News, Face The Nation, FTN Intelligence, and future modules
like Marketplace, FTN Polls, FTN Social, FTN Music) can get a section/page added without a
restructure:

- Keep pages composed from the AEB-09 content-block vocabulary (§8) rather than bespoke one-off
  layouts, so a new pillar's page can reuse existing blocks.
- Keep navigation and footer link data centralized (even in a vanilla JS/HTML site, avoid duplicating
  the nav across every page's markup by hand where practical) so adding a pillar is a small,
  localized change.
- Namespace assets per sub-brand under `/assets/` (the manifest already anticipates this with
  `community/` and `mission-control/` subfolders) rather than flattening everything.
- Treat the AEB board numbering and authority hierarchy (§5) as extensible — a future AEB-14+ board
  for a new pillar should slot into the same governance model, not require inventing a new one.
