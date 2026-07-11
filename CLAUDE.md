# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Document status:** Engineering Charter v1.0 — supersedes the bootstrap CLAUDE.md. This is the
permanent source of truth for the FTN Platform Website repository. It is derived from
`FTN_Master_Asset_Library_v1.0/00_FTN_MASTER_ASSET_LIBRARY_MANIFEST_v1.0.txt.txt` and AEB boards
01–13. Update it whenever architecture, tooling, or brand direction changes materially — it should
never drift out of sync with reality.

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
- Support investors (investor decks, pitch graphics, corporate/financial materials — per AEB-10's
  "Investor & Corporate Assets" roadmap category).
- Acquire users (app download CTAs are first-class UI throughout the boards).
- Improve organic search visibility.
- Become the single canonical public presence of the FTN Platform — the place all other channels
  point back to.

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

**Founder decisions recorded (2026-07-10), scoped to this website build only:**

- **FTN Red implementation token: `#E10613`** (the AEB-06/AEB-12/AEB-13 value). This is a founder
  decision for website implementation purposes, not a retroactive edit to AEB-01 — the underlying
  conflict in the asset library itself remains unresolved and will still be settled in Asset Library
  v2.0.
- **Primary typeface for the FTN Platform design system: Montserrat (headings) + Inter (body)** —
  the founder confirmed the Montserrat variant over AEB-01/AEB-06's Manrope/Inter, for website
  implementation purposes only. Same caveat: the library's own internal conflict is not retroactively
  edited.
- Success green hex (`#22C55E` vs `#16A34A`) and the file/board-number mismatch (§ item 4 above)
  remain **open** — ask before any implementation touches either.

**Interim resolution (founder decision, in effect for the duration of website development):** the
remaining conflicts above are **not to be resolved by AI judgment, ever** — they are explicitly
reserved as founder decisions and will be settled later during the creation of **FTN Master Asset
Library v2.0**, after the website is complete. `FTN_Master_Asset_Library_v1.0/` is **frozen** for the
duration of this build: no substitutes, no reinterpretation, no "best guess" tokens beyond the two
decisions explicitly recorded above. Until v2.0:

- Use the approved branding **exactly as it currently exists** in the supplied assets.
- Do not redesign logos. Do not recolor assets. Do not substitute typography. Do not regenerate
  branding.
- Extract existing approved assets exactly as they appear — pixel/vector fidelity to the source,
  not a reinterpretation of it.
- If any of the four conflicts would affect an implementation decision (e.g., which hex to write
  into a CSS custom property, which typeface to load), **stop and ask before hardcoding the token.**
  Do not average, guess, or pick a "majority" value — even where this charter notes one reading is
  numerically more common across boards, that observation is not authorization to use it.

### Per-surface style direction (no conflict — consistent across all boards)

- **FTN Platform Website (this repo):** light, premium, modern SaaS, government-grade; black, white,
  FTN red.
- **Community Connect app:** light theme, professional, fast, accessible.
- **Mission Control:** dark operations-centre aesthetic. Never apply this styling to public website
  pages.

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
├── accessibility/index.html          # Genuine content — WCAG 2.2 AA target, not a legal placeholder
├── legal/
│   ├── privacy-policy/index.html     # Structural placeholder — see §5 legal-wording rule
│   ├── terms-of-service/index.html   # Structural placeholder
│   ├── cookie-policy/index.html      # Structural placeholder
│   └── data-retention/index.html     # Structural placeholder
├── assets/
│   ├── logos/                        # logo-ftn-platform-primary-{light,dark}.svg
│   └── icons/                        # favicon + hand-authored UI/social icons
├── css/
│   ├── tokens.css                    # design tokens (color/type/spacing/radius/shadow/breakpoints)
│   ├── base.css                      # reset, container, focus states
│   ├── utilities.css                 # small spacing/color/width utility classes
│   ├── main.css                      # import entry point
│   └── components/                   # nav, footer, buttons, blocks, accordion,
│                                      # content-sections, form, legal, trust-card, charts,
│                                      # observatory, mission-control-demo
├── js/
│   ├── nav.js                        # mobile menu + dropdown behavior (progressive enhancement)
│   ├── contact-form.js               # client-side validation; honest no-backend status message
│   ├── indicators-data.js            # FTN Live indicator registry (~70 demo indicators, see below)
│   ├── ads-data.js / ads.js          # advertisement campaign registry + generic panel renderer
│   ├── charts.js                     # dependency-free SVG sparkline/line/bar/gauge helpers
│   ├── trust-card.js                 # shared accessible modal — renders any indicator/evidence object
│   ├── live-clocks.js                # interpolation engine for ticking demo counters
│   ├── observatory.js                # renders the indicator wall, kiosk mode, dashboard customization
│   ├── mission-control-data.js       # Mission Control demo data (correlations, graph, scenarios, etc.)
│   └── mission-control-demo.js       # tabs + all 8 Mission Control demo panel behaviors
├── ANALYTICS_STANDARD.md             # operational rules for classification/confidence/weighting/etc.
├── 00_Phase1_Discovery/              # Discovery Report (planning artifact, not shipped site)
├── FTN_Master_Asset_Library_v1.0/    # reference source boards — never referenced live, never edited
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

## 15. Git Workflow

- Conventional, descriptive commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`) —
  focus the message on *why*, matching the standing project convention for this session.
- Never edit or delete files inside `FTN_Master_Asset_Library_v1.0/` as part of a website-feature
  commit — it's reference source, not part of the shipped site. Asset *extraction* work should
  produce new files under `/assets/`, leaving the source boards untouched.
- Don't commit unoptimized/raw exports — only the optimized SVG/PNG/WEBP/AVIF outputs described in
  §6 belong in `/assets/`.
- No secrets, API keys, or credentials in any commit.

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
