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

**⚠️ PARTIALLY SUPERSEDED 2026-07-13 — see §7.15.** The blanket ban on having an "Investors" nav
destination at all was lifted — the top nav now includes one, routed to Contact's existing
`#investors` category. The underlying substance of this decision — no investment material,
projections, financial claims, or fundraising language anywhere on the site — is unchanged and
still binding; only the "never even have a nav entry" part was relaxed, and only because the
destination it points to was already written to satisfy the rule.

**Founder Decision (2026-07-11) — Face The Nation stays out of navigation and the 404 page** until
it is a real, live product within the FTN ecosystem. No placeholder page, no dead-end navigation
entry, no premature mention. When it launches for real, it gets integrated naturally — not before.
Until then, the 404 page directs visitors toward active products and active content only.

**⚠️ SUPERSEDED 2026-07-12 — see §7.12.** Face the Nation is now a real, live platform within the
FTN ecosystem (its public home, production season in progress) and is fully integrated into
navigation, the footer, and the Platforms hub. The reasoning above is preserved for history and
still governs how any *future* not-yet-live product should be treated (Display Network, Media
Network remain out of navigation as live links today, exactly per this rule) — it just no longer
applies to Face the Nation specifically.

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

**⚠️ PARTIALLY SUPERSEDED 2026-07-13 — see §7.15.** The homepage and the nine new ecosystem
product pages (Events, ibis.ai, Riddim, Kaiso, Radio, Screen, Opportunities, Love, Display
Network) are now a deliberate dark "Ecosystem Board" treatment, explicitly authorized by the
founder as an extension — not a repeal — of the "bounded dark treatment" precedent already
established below for Observatory/Mission Control Demo/Face the Nation. Every other page (About,
Contact, legal, Resources, Insights, News, Community Connect, Mission Control's own page) is
unchanged and stays light-first. Read the paragraph below as "light-first is still the default for
most of the site," not "light-first everywhere" — that stronger claim no longer holds.

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
├── applications/index.html           # v1.4, §7.11 — "Platforms" nav label since §7.12
├── community-connect/index.html      # Official product page — Overview, Features, Workflow,
│                                      # Benefits, Privacy, FAQ, Public Beta Launch (§7.11)
├── facethenation                     # v1.4, §7.12 — Face the Nation's public home. No trailing
│   └── index.html                    # slash by design; served as facethenation/index.html
├── mission-control/
│   ├── index.html                    # Government Dashboard, Analytics, Security, Future Modules (marketing)
│   └── demo/index.html               # Interactive Demonstration — public preview, not the secure product
├── observatory/index.html            # FTN Live — National Observatory (indicator wall, live clocks) —
│                                      # v1.8, §7.15: fully live, just not a homepage grid card
├── events/index.html                 # v1.8, §7.15 — FTN Events, "In Development"
├── ibis-ai/index.html                # v1.8, §7.15 — ibis.ai, "In Development"
├── riddim/index.html                 # v1.8, §7.15 — FTN Riddim, "In Development"
├── kaiso/index.html                  # v1.8, §7.15 — FTN Kaiso, "In Development"
├── radio/index.html                  # v1.8, §7.15 — FTN Radio, "In Development"
├── screen/index.html                 # v1.8, §7.15 — FTN Screen, "In Development"
├── opportunities/index.html          # v1.8, §7.15 — FTN Opportunities, "In Development"
├── love/index.html                   # v1.8, §7.15 — FTN Love, "In Development"
├── display-network/index.html        # v1.8, §7.15 — Display Network, "Long-Term Initiative"
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
│   ├── country.js                    # persisted country selection + data-country attribute +
│   │                                  # ftn:country-changed event, scaffold only (v1.6, §7.13)
│   ├── country-switcher.js           # first-visit modal + header/mobile-nav control for country.js
│   │                                  # (v1.6, §7.13), reuses trust-card.js's dialog shell
│   ├── country-scope-notice.js       # real honest behavior on top of country.js — "FTN is
│   │                                  # expanding to X" on Community Connect/FTN Live (v1.7, §7.14)
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
│                                      # content; the other 3 files here are unfilled templates;
│                                      # v1.0 release closeout added the Technical Compliance Audit,
│                                      # Governance and Legal Framework, and Engineering Release
│                                      # Certification (§7.10)
└── CLAUDE.md
```

**Not in this repository, by design (§7.10):** `DESIGN/`, `FOUNDATIONS/`, `KNOWLEDGE/`, `STANDARDS/`,
`STRATEGY/`, and `FTN_Strategic_Foundation_v1.0/` — internal strategy, commercial-model, revenue,
IP, and knowledge-base material. This repo has no build step and no Cloudflare Pages routing
config, so anything tracked here is directly servable at its literal path on the live public
domain; internal/commercial material does not belong in a repo with that property. See `.gitignore`
and §7.10 for the removal record.

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

## 7.10 Version 1.0 Release Closeout — repository hygiene fix

Engineering Release Certification (§7.9's sibling pass) found this repo's engineering surface
sound, but a final pre-push repository audit surfaced a real, already-live issue unrelated to any
work done this program: six directories — `DESIGN/`, `FOUNDATIONS/`, `KNOWLEDGE/`, `STANDARDS/`,
`STRATEGY/`, and `FTN_Strategic_Foundation_v1.0/` (32 + 7 files, added 2026-07-11 in commit
`07d27ab`, well before this program began) — were committed to `origin/main` and, since this repo
has no build step and no Cloudflare Pages routing config (no `_headers`/`_routes.json`), were
directly servable at their literal public paths. Several of those files are exactly the category
of content the standing Founder Decision (§4) says must never be public — `STRATEGY/
FTN_REVENUE_CATALOGUE.md`, `STRATEGY/FTN_COMMERCIAL_MODEL.md`, `FTN_Strategic_Foundation_v1.0/
FTN_REVENUE_MODEL.md`, `FTN_Strategic_Foundation_v1.0/FTN_COMPETITIVE_ADVANTAGE_REGISTER.md`, and
`FTN_Strategic_Foundation_v1.0/FTN_INNOVATION_IP_OPPORTUNITY_REGISTER.md` among them. Nothing in
the site's own pages linked to these paths, and they weren't in `sitemap.xml`, but `robots.txt`'s
blanket `Allow: /` did nothing to stop a crawler or a direct link from reaching them.

Founder-confirmed fix: `git rm -r --cached` on all six directories (files preserved on disk, moved
to a private location for internal use — not deleted), plus a new root `.gitignore` so they can't
be recommitted by accident. The public website repository now contains only what's required to
build, deploy, document, and legally operate the public website — matching what this charter has
always described it as containing (§2, §7). This was repository hygiene / information governance,
not a website feature change; no page, component, or public content changed as a result.

## 7.11 Operational Phase 1 — Community Connect Public Beta Integration

FTN Platform's flagship policy of never touching Community Connect's source code (§2) held exactly
as designed once a real integration was needed: Community Connect turned out to already exist as a
mature, separate application — `github.com/thecaribbeanpressnetwork-lang/ftn-platform` (a
different repository from this one, same GitHub org), vanilla HTML/CSS/JS + Supabase + PWA +
Capacitor (Android), at "v1.0.6 Build 7 — Release Candidate Final." This pass integrated it into
the website as an external application the site links to, never a merge — no Community Connect
source file was touched except the one field its own code was explicitly built to receive.

- **Deployment architecture: `community.ftnplatform.org`, a dedicated subdomain, not a path under
  this site.** Community Connect is a Capacitor-wrapped PWA with its own service worker and
  offline storage scope; a path-based URL risks service-worker scope collisions with this site's
  own scripts, and a subdomain matches how native app deep-linking (`com.ftn.platform.
  communityconnect`) and any future FTN product (Mission Control included) should be deployed —
  this is the precedent-setting pattern, not a one-off choice.
- **The one sanctioned edit to Community Connect's own repository:** `config.js`'s
  `WEBSITE_URL` field (both the root copy and its `www/` build-output mirror — the two are kept
  byte-identical by convention, confirmed diff-clean before and after) was set to
  `https://ftnplatform.org`. The app's own source comments already named this "the one place a
  future production website URL will be set... no other file needs to change" — `share.js` and
  five other files read this single value to build every "download" line in share text. No other
  line in that repository was touched. Committed locally in that repository; **not pushed** —
  that repository's push authorization is theirs, not this program's.
- **`/applications/` — the permanent home for FTN software products** (new page, added to nav and
  footer on all 18 pages). Community Connect is the only "Live Now" tile with a Public Beta badge;
  Mission Control and FTN Live are presented alongside it as live ecosystem platforms; Display
  Network and Media Network are honest "Coming Soon" tiles — rendered as non-interactive `<div>`s
  (a new `.module-card--unavailable` modifier removes the hover/link affordance), never as dead
  links, consistent with the site's standing rule against implying availability that doesn't exist.
- **`/community-connect/` became the one required stop before leaving the site.** Every sitewide
  CTA that used to read "Download App"/"Download the App"/"Download Now" (header, mobile nav,
  homepage hero, homepage closing CTA — batch-verified across all pages) now reads "Launch App" /
  "Launch Community Connect" and points at `/community-connect/#launch`, never directly at the
  external app. The page's former `#download` section (which said "currently in active
  development... App store availability will be announced") is now `#launch`: a Public Beta badge,
  version, an honest beta disclaimer, supported-device notes, a privacy reminder, a "Launch
  Community Connect" button to the real external URL, and a "Beta Feedback" button — the only two
  external-facing exits on the entire page. "Return to FTN Platform" is deliberately *not* a
  separate UI element: the page keeps full site header/footer chrome (never stripped for a
  "landing page" feel), and returning is the ordinary browser back button once a visitor leaves for
  `community.ftnplatform.org` — Community Connect's own UI was not modified to add a link back,
  since nothing beyond `WEBSITE_URL` was authorized there.
- **A real accuracy fix, not a redesign:** the Privacy section's "Full details will be published in
  our Privacy Policy once finalized" was stale twice over — the website's Privacy Policy is now
  published, but it explicitly scopes itself to the website only and does not cover Community
  Connect (§1.7 of the Legal Framework, `GOVERNANCE/...Governance_and_Legal_Framework.md`).
  Pointing a beta tester at that document as if it covered the app would have been actively
  misleading. Fixed to correctly describe Community Connect's own in-app privacy notice (verified
  directly — the first-launch consent screen was screenshotted during testing) as the governing
  document for the app, not this site's policy.
- **Contact's ninth category:** "Community Connect Beta Feedback," reusing the existing
  category-card-plus-select pattern exactly (no second feedback system) — placed next to Technical
  Support, whose own description was narrowed to avoid overlapping it.
- **Verified, not assumed:** Community Connect was actually run from its own repository via a local
  static server and driven with Playwright — zero console errors, service worker registers
  correctly, `WEBSITE_URL` confirmed live at the configured value. The website side was re-verified
  in full after every change: 0 broken links/hashes/assets across all 18 pages (exhaustive, not
  sampled), 0 overflow/console errors across 90 page×breakpoint combinations, byte-identical
  header/footer across all 18 pages, and a fresh Presentation Mode lifecycle re-check to confirm
  nothing in this pass regressed §7.8's infrastructure.

## 7.12 Operational Phase 1B — Face the Nation Platform Integration

**Founder Decision (2026-07-12) — supersedes the 2026-07-11 "stays out of navigation" decision
(§4) for Face the Nation specifically.** Face the Nation — FTN's flagship public affairs
programme, hosted by Ricardo Antoine — is now treated as a real, live platform: a public home at
`/facethenation`, integrated into primary navigation, the footer, and the Platforms hub, exactly
like Community Connect. The §4 decision's underlying principle (no live nav entry for a product
that isn't real yet) is not repealed — it's why Display Network and Media Network still render as
non-clickable "Coming Soon" tiles rather than nav links. It just no longer applies to Face the
Nation, which the Founder confirmed is real: a production season in progress, with real approved
brand assets and production photography.

- **Applications renamed to Platforms sitewide** (nav label, footer column heading link, page
  title/meta on `/applications/` itself) — the Founder's own judgment that this better reflects
  the long-term ecosystem (Community Connect, Mission Control, FTN Live, Face the Nation, Display
  Network, Media Network) than the narrower "Applications." The URL (`/applications/`) was not
  changed — renaming the path would break the existing Community Connect integration's links and
  bookmarks for zero benefit; only the human-facing label changed.
- **`/facethenation`** — deliberately the one page on this site without a trailing slash, matching
  the Founder's explicit, repeated instruction. Verified this resolves correctly as a "clean URL"
  the same way Cloudflare Pages serves any `directory/index.html` at both `/directory` and
  `/directory/` — confirmed by fixing the local test server's naive trailing-slash-only logic to
  replicate that actual behavior, then testing both forms. Every internal link to the page (nav,
  footer, Platforms hub, `sitemap.xml`) consistently uses the no-slash form to avoid canonical
  drift.
- **A bounded dark treatment, not a site-wide theme change.** The approved concept
  (`ftn podcast (1).png`, reviewed alongside the full asset library) is fully dark; this site's own
  design system is light-first with *deliberate, bounded* dark sections (§5) — exactly the pattern
  already established by Observatory and Mission Control Demo, which keep the standard light
  header/footer but give their own `<main>` a bespoke dark identity. Face the Nation follows the
  same precedent: `<main class="ftn-show">` (new `css/components/face-the-nation.css`) carries the
  show's own approved black/white/red identity and **Bebas Neue** headline typeface (confirmed from
  the show's own brand-guide asset, alongside Montserrat/Inter for body text) — the site-wide
  header, footer, and nav are completely unchanged.
- **Real production assets only.** Reviewed the full `FTN editing assets` library (24 images) before
  building anything. Used: the clean, watermark-free master production photograph (a separate
  watermarked proof of the same shot was found and deliberately not used) as the hero background,
  resized/re-encoded locally (no image-optimization tool was available in this environment, so this
  was done via .NET `System.Drawing` through PowerShell — 3.2MB → 384KB) and copied into
  `assets/face-the-nation/`, per the standing rule that shared assets are always copied into the
  repo, never referenced from the source library; and the approved circular badge logo, similarly
  resized. No new photography or logo art was generated. One real bug found and fixed after
  building: the source photo's own embedded "Face the Nation" signboard visually collided with the
  foreground headline repeating the same wordmark — fixed with a left-weighted gradient (text sits
  on a clean dark field; the photo's detail remains visible on the right) rather than by discarding
  the photo or the headline.
- **A new hand-authored `assets/icons/social-tiktok.svg`**, matching the exact minimal-line-icon
  convention already used for the other five social platforms (`viewBox="0 0 24 24"`, 2px stroke,
  `currentColor`) — TikTok was the one platform in this brief's required list without an existing
  icon on the site.
- **Every social link is honestly "Coming Soon."** No real, confirmed URL was supplied for any of
  Face the Nation's five platforms (YouTube/Facebook/Instagram/TikTok/X) — all five render as
  non-clickable status cards with the `@FaceTheNationTT` handle shown, never as a fabricated or
  broken link, per the same standing rule already applied everywhere else on this site.
- **"Suggest a Topic" and "Become a Guest" both route to `/contact/#general`** — reusing the
  existing Contact mechanism exactly as instructed, rather than adding two more Contact categories
  for what's fundamentally the same General Enquiries intent in show-specific language.
- **A composed, production-quality Open Graph image** (`assets/social/og-face-the-nation.jpg`,
  1200×630) — the same real hero photograph, cropped and overlaid with the wordmark and tagline via
  the same PowerShell/`System.Drawing` pipeline used for the hero image, consistent with how the
  site's existing default OG image was built (§7.5: "generated... composed from the approved
  wordmark + tagline"). No AI-generated or invented imagery anywhere on this page.

## 7.13 Version 1.6.0 — Caribbean Executive Identity Pass

A creative/institutional-identity pass layered entirely on 1.5.0, per the founder's brief that
engineering was "done" and the goal was to make the site feel like "the digital headquarters of an
institution," not to add features. Eight sequential phases, each independently committed and
verified (0 console errors/overflow across all pages × breakpoints, header/footer byte-identical,
all JS hooks intact).

- **Heritage Layer System** (`css/components/heritage-layer.css`, new `--heritage-opacity` /
  `--heritage-opacity-on-dark` tokens) — one shared, reusable pattern for restrained, hand-authored
  per-page SVG line-work (bathymetry contours, compass rose, road-grid/GPS marks, radar sweep,
  isobars, waveform, etc.) at 2–8% opacity behind each page's hero, `aria-hidden`, contrast-checked
  against body text, never a decorative illustration.
- **Founding statements** — one large, memorable purpose-line per major page (Community Connect,
  Mission Control, Face the Nation, Observatory, Applications), reusing the existing hero-scale type
  token rather than a new outlier.
- **Atmosphere equalization** — Applications, Resources, Insights, News, and Contact each gained a
  genuine `.section--dark` band plus a heritage layer, closing the two-tier "some pages feel flat"
  gap a Founder Review screenshot audit had identified.
- **Subtle motion** — CSS-only, slow (15–40s), low-amplitude loops (drifting current lines, radar
  sweep, constellation drift, waveform), all gated behind
  `@media (prefers-reduced-motion: no-preference)`.
- **Nav/logo breathing room + content refinements** — Display Network/Media Network became
  permanent institutional mission statements (no card grid, no dates); Face the Nation's five social
  cards collapsed into one institutional statement; About's stale "In Development" badges on
  Insights/News fixed to "Live."
- **Community Connect icon mark extracted** (`assets/community/community-connect-icon-mark.png` +
  `-96.png`) from AEB-13's "Product Logo Suite" — a clean crop only, no redesign. The wordmark
  portion of that same board was deliberately not extracted (documented raster-quality concern) —
  Community Connect's page uses the extracted icon mark, not a full logo lockup.
- **Country-switcher architecture built as a scaffold, no localized content** (`js/country.js`,
  `js/country-switcher.js`, `css/components/country-switcher.css`) — a persisted `data-country`
  attribute on `<html>`, a `ftn:country-changed` event, and a first-visit welcome modal + header
  control listing Trinidad & Tobago, Jamaica, Barbados, Guyana, Saint Lucia, and "Rest of the
  Caribbean." Explicitly did not change any page content per country at this stage — see §7.14 for
  where that scaffold gets real (messaging-only) behavior.

## 7.14 Version 1.7.0 — Executive Visual Polish & Caribbean Localization Pass

A founder-directed brand-accuracy and refinement pass, built directly on 1.6.0. Two corrections
made mid-pass are recorded here because they're easy for a future session to get wrong by trusting
either the brief's own claims or an earlier misreading in this same session's history:

- **The FTN Platform wordmark's F and N stay the surrounding fill color; the T is always FTN Red
  (`#E10613`) — confirmed against the official AEB-01 Brand Foundation board.** This is a real,
  intentional brand detail, not a typo or an unauthorized redesign: verified directly against two
  copies of the AEB-01 board in `FTN editing assets/` after an initial misreading in this same
  session incorrectly concluded the wordmark was uniformly one color. If you see the red-T
  treatment on the header/footer logo, the favicon-adjacent standalone SVGs
  (`assets/logos/logo-ftn-platform-primary-{light,dark}.svg`), or anywhere else "FTN" is set as a
  wordmark, **that is correct — do not "fix" it back to a solid color.** Implementation: the "FTN"
  glyph is native SVG `<text>`, not `<path>` letterforms, so the T is split into its own `<tspan
  class="logo-mark__t">` and colored via `css/utilities.css`'s `.logo-mark__t` rule (`fill:
  var(--color-red)`) rather than a hardcoded hex repeated per occurrence. Contrast-verified: 3.97:1
  on white (header), 4.96:1 on `--color-black` (footer) — both clear the WCAG large-text 3:1
  threshold at the wordmark's 40px glyph size (logos are exempt from 1.4.3 regardless, but this was
  checked rather than assumed).
- **The "Community Photography (Trinidad & Tobago)" grid on `FTN editing assets/` board 41 is
  AI-generated concept imagery, not real photography — do not extract or ship it as real.** Tells:
  identical HDR sky/color grade across all 10 "different" shots regardless of implied time of day,
  a suspiciously staged/glossy garbage pile, generic non-Trinidad-specific architecture. No real,
  non-AI-generated Trinidad & Tobago (or any other Caribbean country's) street/community photography
  exists in either reference asset library as of this pass — genuine per-country visual
  localization needs commissioned or sourced real photography before it can be built honestly, per
  the platform's own standing "real photography, not AI-generated" rule (§5 Photography &
  direction, AEB-08).
- **`js/country-scope-notice.js`** (new, loads after `js/country.js` on Community Connect and FTN
  Live only) gives the 1.6.0 country-switcher scaffold its first real, honest behavior: when a
  visitor explicitly selects a country other than Trinidad & Tobago, a `[data-country-scope-notice]`
  element (a `.callout` / `.callout--on-dark`, new dark variant added this pass) reads "FTN is
  expanding to `<Country>`. Trinidad & Tobago is live today." Trinidad & Tobago (the default) is
  unaffected. Deliberately messaging-only — no fabricated per-country imagery, per the finding
  above.
- **Applications' "Live Now" grid rebalanced from 3+1 to 2×2** (`#live .module-grid`,
  `content-sections.css`) — a genuine layout gap a fresh visual audit found (4 cards in a 3-column
  grid stranded the 4th alone); the only atmosphere/spacing issue the audit surfaced, since 1.6.0
  had already closed the larger two-tier gap.
- **Four new product names from the founder's brief — ibis.ai, FTN Riddim, FTN Kaiso, FTN Love —
  were deliberately not built this pass.** None exist on any reviewed board or in the asset
  manifest, and building them would have both invented unapproved branding and reversed an explicit
  "do not build new products, dedicated releases later" instruction from earlier in the same
  session. Revisit only once each has an approved brand board and its own dedicated brief.
  **⚠️ SUPERSEDED in v1.8.0 (§7.15) — see below.** The founder issued an explicit, deliberate
  authorization one pass later that overrides this note specifically for these four products
  (plus five more). Do not use this paragraph as a reason to decline building or extending them.

## 7.15 Version 1.8.0 — Ecosystem Completion Pass

A founder-authorized pass that explicitly supersedes several standing decisions recorded earlier
in this document — recorded here exactly as instructed by CLAUDE.md's own §14 policy ("if a brand
or architectural ambiguity gets resolved by the founder outside of this file, record the
resolution here so it isn't re-litigated by a future session"). Before executing anything, the
brief was checked against a real risk this session had already seen once before in the same
conversation: a near-identical "ecosystem" document had been pasted into this engineering
conversation by mistake one turn earlier and explicitly retracted. The founder was asked directly
whether this second, similar-looking brief was the same mix-up; they confirmed it was not — it is
a deliberate, explicit override, reproduced below so a future session doesn't need to re-ask.

**What's now permanently different from what §4/§5 previously said:**

- **"No new products yet" is no longer a blanket rule.** Nine ecosystem products —
  **FTN Events, ibis.ai, FTN Riddim, FTN Kaiso, FTN Radio, FTN Screen, FTN Opportunities, FTN
  Love, and Display Network** — are now approved, real, first-class pages
  (`/events/`, `/ibis-ai/`, `/riddim/`, `/kaiso/`, `/radio/`, `/screen/`, `/opportunities/`,
  `/love/`, `/display-network/`). None of them have real functionality, screenshots, or metrics
  yet — every page is honestly labeled "In Development" (Display Network: "Long-Term Initiative")
  — but the pages themselves, their names, their taglines, and their locked accent colors are now
  approved platform identity, not something to re-litigate. A future product beyond these nine
  still needs its own approval before a page gets built for it — this override is scoped to the
  nine named products, not a blanket "build whatever."
- **The light-first mandate (§5) is superseded for the homepage and these nine new product pages
  specifically — not sitewide.** The homepage is now a full dark "Ecosystem Board" (12-card
  product grid on `--color-black`), and each new product page uses the same bounded-dark pattern.
  Every *other* existing page (About, Contact, legal, Resources, Insights, News, Community
  Connect, Mission Control, Observatory's light chrome, etc.) is untouched and stays light-first —
  this is an extension of the already-established "bounded dark treatment" precedent (Observatory,
  Mission Control Demo, Face the Nation), just a larger bounded area than before, not a reversal
  of the underlying principle that dark is deliberate and scoped, never the site default.
- **Investor-facing content is no longer banned outright — now "restrained, professional, no
  fundraising language."** The top nav includes an "Investors" entry, routed to Contact's
  pre-existing `#investors` category (already written to satisfy the no-fundraising-language
  rule — nothing new was invented). The core prohibition on projections, financial claims, and
  fundraising language stands; only the blanket "never" on having an Investors entry at all was
  lifted.

**What's unchanged, confirmed explicitly rather than assumed:**

- **FTN Live / Observatory was not retired.** It simply isn't one of the 12 primary homepage cards
  anymore — it's ~2,500 lines of real, working functionality (indicators, live clocks, kiosk mode,
  relationship graph) and stays fully live, linked from the footer's Platform column with equal
  weight to any other product. FTN Events is a genuinely separate new product, not a rename of
  Observatory.
- **Community Connect and Mission Control are unchanged.** Their own pages, content, and (for
  Community Connect) the external launch flow to `community.ftnplatform.org` are untouched — the
  homepage card links to the existing page, same as before.

**New mechanisms introduced this pass:**

- **`css/components/ecosystem-homepage.css`** — the homepage's 12-card grid (`.eco-card`), each
  card a fully-clickable link carrying its own `--card-accent` custom property. Hover/press
  interaction (lift, border brighten, scale-down on `:active`) is gated behind
  `@media (prefers-reduced-motion: no-preference)` matching the sitewide discipline.
- **`css/components/product-page.css`** — one shared dark product-page template (hero + content
  sections + CTA) reused by all nine new pages via a `--product-accent` custom property, rather
  than eight-plus bespoke stylesheets. `--product-accent-small` is a second, separate custom
  property for small (caption/eyebrow-scale) text specifically — several accents clear the 3:1
  large-text threshold but not 4.5:1 at small sizes; see the lightened `--color-*-on-dark` tokens
  in `tokens.css` for the three that needed one (ibis.ai, Kaiso, Love).
- **Ten product accent tokens in `css/tokens.css`** (`--color-mission-control`, `--color-events`,
  `--color-ibis`, `--color-riddim`, `--color-kaiso`, `--color-radio`, `--color-screen`,
  `--color-love`, `--color-opportunities`, `--color-display-network`) plus three `-on-dark` small-
  text variants — every value contrast-verified against `--color-black` via the WCAG relative-
  luminance formula (documented inline as a code comment, not eyeballed). `--color-riddim` and
  `--color-display-network` are both "green" per the brief but deliberately distinct hex values
  from each other and from both disputed success-green hexes already on record in §5 — picking a
  product accent doesn't resolve that still-open conflict, and wasn't intended to.
- **`data-sign-in-entry`** — the header's new "Sign In" button (replacing the old "Launch App"
  button sitewide) routes to Community Connect's launch flow today, the only FTN product with real
  user accounts. The attribute marks this as the future unified FTN Account/SSO integration point,
  documented inline, so a future session can find and swap the one `href` without a nav
  restructure.
- **Simplified top nav sitewide**: Home / About FTN / News / Partners / Investors / Contact,
  replacing the old 10-item mega-menu (About, Platforms, Community Connect, Mission Control, FTN
  Live, Face the Nation, Insights, News & Stories, Resources, Contact). The homepage's own 12-card
  grid now serves the product-discovery role the old "Platforms" dropdown and per-product nav
  entries used to serve. Insights and News & Stories moved to the footer's Resources column;
  nothing reachable before this pass became unreachable.

**Verification**: 140/140 regression checks (28 pages × 5 breakpoints: console errors, overflow,
broken images, exact nav/footer link counts) and a full axe-core WCAG 2.2 AA sweep across all 26
content pages, both run clean before this shipped — including catching and fixing the three
small-text contrast gaps above before they ever reached production.

## 7.16 Version 1.9.0 — Sprint 0 (Architecture Review) + Sprint 1 (Shared Platform Architecture)

Sprint 0 was a read-only architecture review, not an implementation pass — full record in
`GOVERNANCE/FTN_Platform_Sprint0_Architecture_Review.md`. It concluded this repository's own real,
measurable duplication is a 30–40% reduction opportunity ("Track A"); the founder's 40–60% figure
is the target for the FTN *ecosystem* as a whole once every pillar shares one engine instead of
each independently building its own ("Track B") — both readings correct, describing different
scopes. It also authorized a narrow, permanent exception to the vanilla-only mandate (§3): a
hand-run, output-committed Node generator script is allowed when it produces static committed
output, introduces no runtime dependency, requires no production build step, and its output is
committed to the repo.

Sprint 1 executed on that review with a mandate the founder stated directly: stop shipping
documentation or brochure pages — every sprint designs, builds, *and integrates* a real, working,
honest capability into real products in the same sprint ("the first implementation becomes the
first consumer"). Three waves, one milestone.

**Wave 1 — nine shared capabilities, each built with the homepage or a Wave 2 product as its
first real consumer, never speculatively:**

- **Product Registry** (`js/product-registry-data.js` + `js/product-registry.js`) — the single
  source of truth per FTN product: id, name, tagline, description, route, status, panel asset,
  atmosphere config, keywords, capabilities. `homepagePanels()` feeds the homepage; `search()`
  powers the Intent Router (below).
- **Workspace Shell** (`css/components/workspace-shell.css` + `js/workspace-shell.js`) — the
  standard chrome every one of the 9 flagship product workspaces is built on: atmosphere-styled
  header/identity/notification region, optional toolbar, a content slot the product's own script
  fills, and a shared footer back into the ecosystem. Atmosphere (accent, background treatment,
  motion profile) is data on the Product Registry, applied automatically — never hand-styled per
  page. Reuses the existing heritage-layer motion vocabulary (`css/components/heritage-layer.css`)
  for its 7 motion profiles rather than inventing new decorative SVG.
- **Generator Engine** (`js/generator-engine.js`) — deliberately small: `run(generatorDef, input)`
  calls `validate()` then `generate()`. No orchestration, no multi-step coordination — that's
  future scope if a product ever needs it, not claimed here.
- **Entity Metadata Engine** (`js/entity-metadata-engine.js`) — a reusable schema/record
  architecture, but only two real schemas registered (`music-release` for Riddim, `screen-
  submission` for Screen) — the founder's explicit refinement. Five more entity types (`event`,
  `news-story`, `opportunity`, `community-report`, `radio-segment`) are documented as extension
  points in the file itself, not pre-built with fake fields.
- **Export Framework** (`js/export-framework.js`) — a registered-handler map (`txt`, `json`,
  `print` today; a future format plugs in without touching any consumer).
- **Search Foundation** (`js/search-foundation.js`) — `query(items, {filters, textQuery, groupBy,
  sortBy, limit})` → `{results, groups, total}`. Sprint 1 consumers only exercise filtering, but
  the shape doesn't need to change when a future consumer needs more.
- **Media Intake/Playback** (`js/media-intake.js`) — real, client-side-only file attach + HTML5
  preview. Every mount renders the same honest label: the file never leaves the browser.
- **Integration Adapter Layer** (`js/integration-adapter.js`) — one convention every intake tool's
  submit action calls: save locally via `js/storage.js`, return an honest confirmation. The one
  place a real backend swaps in later, for every tool at once.
- **Intent Router** (`js/intent-router.js`) — ibis.ai's real capability: real, transparent,
  keyword-based matching against the Product Registry, with the matched keywords shown back to
  the user. Never an LLM call. **Found and fixed a real bug in `ProductRegistry.search()` while
  building this**: the original implementation matched short/common words as substrings ("to"
  inside "story", "a" inside "article"), producing noisy false-positive results (13 matches for a
  pothole-report query, including products with no real relevance). Fixed to stopword-filtered,
  whole-word matching — the same query now returns one precise, honestly-explained match.

**Homepage rebuilt on real panel artwork, not recreated HTML cards** — the founder-approved PNG
panels (`assets/panels/`, 12 files extracted from the supplied asset zip) are the actual clickable
buttons. The panel grid is hand-authored static HTML kept in sync with `product-registry-data.js`
(the same convention already used for nav/footer sitewide, §7.2) rather than JS-rendered, so the
homepage's core navigation still works with JS disabled per the site's progressive-enhancement
mandate (§3/§10). Layout tuned (header/hero compression, row-locked image heights, a `max-height:
800px` compact mode) to fit the full 12-panel ecosystem board on one screen at both 1440×900 and
1920×1080 without scrolling — verified by measuring the grid's actual bounding box against the
viewport, not eyeballed.

**Wave 2 — all 9 flagship product workspaces rebuilt from static "in development" brochure pages
into real, working, honest first experiences**, each verified end-to-end with real Playwright
interaction (fill a form, submit, download an export, confirm a save), not just a visual check:

- **FTN Events** — Generator Engine + Export Framework. A deterministic event-planning checklist
  (6 sections) that genuinely varies by input: venue type, guest count, budget tier, event type.
- **FTN Riddim** / **FTN Screen** — Entity Metadata (`music-release` / `screen-submission`) +
  Media Intake/Playback (audio / video) + Export.
- **ibis.ai** — the Intent Router, described above.
- **FTN Kaiso** — Search Foundation over a real, honestly-static coverage-beats list (14 real
  categories) — not fabricated news articles, since no real newsroom content exists yet — plus tip
  intake via the existing `/contact/#general` pathway (same precedent as Face the Nation's Suggest
  a Topic/Become a Guest, §7.12).
- **FTN Opportunities** — Search Foundation over a real static category list (6 categories) plus a
  real preference-save (Integration Adapter), honestly framed as shaping future work, not a live
  job-alert subscription that doesn't exist.
- **FTN Radio** — Media Intake/Playback + a plain-fields segment-idea intake (Integration Adapter
  — deliberately not an Entity Metadata schema; `radio-segment` stays an unregistered extension
  point).
- **FTN Love** — Shell + a real values/goal preference intake (Integration Adapter), capped at 3
  selected values by real UI logic. No matching engine or messaging system simulated, since
  neither exists yet.
- **Display Network** — a real deployment-interest intake (Integration Adapter) plus the existing
  `/contact/#commercial` pathway, framed honestly against its Long-Term Initiative status — no
  fabricated venue list or deployment count.

**Wave 3 — platform integration:**

- **`js/persisted-flag.js`** (new) — `js/platform-mode.js` and `js/country.js` were independently
  built as two structurally identical implementations of "read a validated value from storage,
  fall back to a default, reflect it as a `data-*` attribute on `<html>`, expose `get()`/`set()`,
  broadcast a custom event on change." That plumbing is now one factory; each module is a thin
  wrapper owning only its own domain logic (valid modes vs. the country list, the `?mode=`
  deliberate-entry URL parameter, the exact public API/event-detail shape every existing consumer
  already depends on). Verified via Playwright that `presentation-control.js`'s live event
  listener still fires correctly through the new factory, not just that the flags still persist.
  The new script tag was added to all 28 pages that load `platform-mode.js`.
- **Card consolidation — investigated, found already complete.** `content-sections.css` already
  unifies `.feature-card`, `.principle-card`, `.module-card`, `.workflow-step`, `.preview-card`,
  and `.platform-flow__node` into one shared base-box rule (done in the v1.5.0 Executive Design
  System pass, before this sprint) — confirmed by reading each variant's own rule, which carries
  only its deltas. Building a second consolidation layer over already-consolidated CSS would have
  been pure churn. What Wave 2 *did* leave genuinely dead: `css/components/product-page.css` (the
  old shared template for the 9 product pages) — zero HTML files reference it once every dynamic
  product page moved to `workspace-shell.css`. Verified unreferenced, deleted.
- **Generator tooling formalization — deliberately not built.** The Sprint 0 plan scoped
  `/tools/generate-product-page.js` to formalize the one-off script that stamped out 9 *static,
  templated* pages in v1.8.0. Wave 2 changed what those pages are — each is now a bespoke
  interactive workspace with its own generator/search/intake logic, not shared template content —
  so the batch-templating problem the tool existed to solve no longer exists. Building it anyway
  would have been speculative tooling for a use case this sprint eliminated.
- **Community Connect / Mission Control / Face the Nation / FTN Live reconciliation** — verified,
  not rebuilt, per the founder's explicit scope. Nav (6 items) and footer (14 Platform-column
  links) confirmed byte-consistent with every other page; zero broken internal links found in a
  full-site crawl (27 unique link targets, all resolve 200).

**Verification**: 26/26 pages load clean (0 console errors, 0 failed requests, 0 horizontal
overflow); a full-site internal link crawl found 0 broken links; axe-core WCAG 2.2 AA sweep across
all 26 pages found exactly 2 violations, both the pre-existing, founder-reserved success-green
contrast gap already on record in §5 (`indicator-card__change--up` / `mc-kpi-card__trend--up`) —
zero new violations anywhere in Sprint 1's 9 rebuilt product workspaces or the rebuilt homepage.
10 pages (homepage + 9 workspaces) re-verified clean across all 5 standard breakpoints (375/768/
1024/1440/1920 — 50 combinations). Shared-capability consumer counts checked explicitly, not
assumed: Export Framework 3 (Events/Riddim/Screen), Search Foundation 2 (Kaiso/Opportunities),
Media Intake/Playback 3 (Riddim/Screen/Radio), Entity Metadata Engine 2 (Riddim/Screen),
Integration Adapter Layer 7 (every workspace with a real save action — ibis.ai and Kaiso correctly
have none, since neither has anything to save locally), Workspace Shell 9 (all flagship product
workspaces), Product Registry 10 (9 JS consumers + the homepage's hand-synced static markup).

## 7.17 Founder Decision (2026-08-22) — Community Connect distribution is URL/PWA-first

Community Connect's primary distribution strategy is the web/PWA experience at
`community.ftnplatform.org`, not an app-store listing. The existing native/Capacitor Android path
(§7.11) remains available, but App Store/Play Store distribution must never become a prerequisite
for public adoption — a visitor must always be able to use Community Connect immediately from a
link or QR code, with no store visit, no install, and no account required first.

Confirmed already compliant, no page changes required by this decision: `community-connect/
index.html`'s current integration already leads with "Open Community Connect" straight to the real
subdomain (no store badge, no store link, no gating language anywhere on the page — verified by
direct search), and already embeds the live application in-page for a same-site trial before
anyone leaves FTN.

Binding for future work built on top of this:
- Any shared/public Community Connect object (e.g. a shared report) must deep-link directly into
  the web/PWA experience — never require an app-store download first.
- Sharing UI for Community Connect content should be optimized for WhatsApp and Facebook first,
  consistent with §27-30 of the founder's Intelligence/Distribution pass brief (2026-08-22), which
  also calls for one shared FTN Share primitive across the ecosystem rather than a second one built
  specifically for Community Connect. That shared primitive does not exist yet (deferred, not
  fabricated, in the same pass) — this decision is the binding constraint for whenever it is built,
  not a claim that it already reuses one today.
- "Install" / Add to Home Screen is a retention mechanism offered after real value is demonstrated
  (matches the existing sitewide Install FTN App pattern, §7.15's `data-sign-in-entry` precedent) —
  never a barrier shown before first use.
- Reuse the existing FTN Save primitive (`js/ftn-save.js`) for any future "save this report" style
  capability; do not build a second save/bookmark mechanism for Community Connect specifically.

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
