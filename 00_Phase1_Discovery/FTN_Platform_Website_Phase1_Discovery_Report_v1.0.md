# FTN Platform Website — Phase 1 Discovery Report

**Status:** Draft for founder approval. No code (HTML/CSS/JS) has been written. This report is
research/inventory/architecture only, per the engineering charter (`CLAUDE.md`).

**Sources:** `00_FTN_MASTER_ASSET_LIBRARY_MANIFEST_v1.0.txt.txt` and AEB boards 01–13 (13 board
images), re-read in full for this report.

**Standing constraint carried into every section below:** `FTN_Master_Asset_Library_v1.0/` is
**frozen at v1.0**. The four conflicts logged in `CLAUDE.md` §5 (FTN Red hex, Success green hex,
Manrope/Inter vs. Montserrat, and the file/board-number mismatch) are **not resolved here** — they
are founder decisions deferred to Asset Library v2.0. Anywhere this report would otherwise need a
specific hex or typeface to describe a page or component, it is called out as **[FOUNDER DECISION
PENDING]** rather than assumed.

One fact worth surfacing up front: **every single AEB board's footer bar states "All assets are
conceptual. Final outputs may vary."** This applies to every logo, color, icon, and screen in the
library, and materially affects §5 (images still needing creation) below.

---

## 1. Complete Inventory of Every Supplied Asset

### 1.1 Source files currently in the repository

14 files under `FTN_Master_Asset_Library_v1.0/`: the manifest (`.txt`) and 13 AEB board images
(`.png`, ~1.4–1.9MB each, 1536×1024). **Zero production assets have been extracted yet** — the
repo currently contains only the reference boards, not the individual SVG/PNG/WEBP/AVIF files they
define. Asset extraction is implementation work, not discovery, and has not started.

### 1.2 What each board defines (category counts, from each board's own Asset Manifest table and
"Estimated Outputs" box)

| Board | Title | Categories defined | Estimated outputs |
|---|---|---|---|
| AEB-01 | Brand Foundation | Primary logos (4), co-brand lockups (6), icon marks/favicons (5), logo safe-area examples (3), colour palette (9 swatches), gradients (2), typography (2 fonts), design tokens | 31 SVG · 31 PNG · 31 WEBP · 31 AVIF (~124 files) |
| AEB-02 | Website & UI Components | 9 button styles, 2 nav bars, 6 card templates, 8 form elements, 10 status badges, 6 alert/message styles, 8 table components, 6 misc components (tabs/pagination/progress/tooltip) | 75 SVG · 75 PNG · 75 WEBP · 30 AVIF |
| AEB-03 | Product & Website Assets (Community Connect) | Product logo/hero lockup, feature icon set, workflow diagram, dashboard preview, 5 device mockups, 4 play-store assets, 4 trust/privacy graphics, FAQ graphics, organization/community graphics, download badges | 92 SVG · 96 PNG · 95 WEBP · 20 AVIF — **303 files total** |
| AEB-04 | Marketing & Media Assets | 6 social templates, 6 poster/print assets, 6 email headers, 4 presentation covers, 4 launch campaign graphics, 4 QR/download assets, 6 press kit elements, ad/banner sets | 68 SVG · 118 PNG · 74 WEBP · 24 AVIF — **284 files total** |
| AEB-05 | Mission Control Assets | 6 dashboard screen previews, sidebar/top-bar/buttons/status-badges/table UI components, 5 chart types, map/geographic assets, status indicators, admin/system elements | 96 SVG · 124 PNG · 78 WEBP · 26 AVIF — **324 files total** — **out of scope for the public website** except as marketing preview imagery (see §2/§3) |
| AEB-06 | Design System & Style Guide | Color tokens, typography tokens, spacing/grid, border radius/shadow, button/input/checkbox/toggle states, icon system rules, UI patterns (cards/badges/chips/alert banners/progress/design principles) | 140 SVG · 160 PNG · 90 WEBP · 40 AVIF — **430 files total** |
| AEB-07 | Icon Library & UI Elements | 64 core icons, 48 action icons, 24 navigation icons, 24 status/indicator icons, UI elements (buttons/chips/toggles/sliders/badges), 16 social/share icons | 176 SVG · 176 PNG · 176 WEBP · 176 AVIF — **704 files total** |
| AEB-08 | Hero Artwork & Photography Direction | 4 hero concept examples, photography style guide (6 reference categories), 4 device mockups, 6 background textures/gradients, visual tone guide (5 pillars), 5 light-theme page examples, do/don't guide, 5 design-inspiration references | 36 JPG · 16 PNG · 12 WEBP · 8 AVIF |
| AEB-09 | Website Architecture & Page Structures | Full sitemap, header/nav structure (desktop/mobile/mega menu), 12 page templates, footer structure, 12 page-type legend entries, 7 content block types, page-type usage map, 3 example user journeys | 120 SVG · 160 PNG · 90 WEBP · 40 AVIF |
| AEB-10 | Asset Production Roadmap | 12 **future** asset categories (not yet produced) + 4-phase production timeline + global guidelines + master manifest authority table | 250 JPG · 120 PNG · 40 WEBP · 20 MP4 · 20 Lottie · 10 SVG (**future/roadmap targets, not current assets**) |
| AEB-11 | RealityArtTV Media Identity (publisher) | Logo suite (3 variants + icon/app icon), 5 brand colors, 2 typefaces, 6 brand positioning pillars, brand applications (watermark/lower-third/end-slate), 5 media channels, usage rules, 2 lockups | Not separately itemized on the board |
| AEB-12 | FTN Platform Ecosystem Reference | Master brand definition, 5 brand pillars, ecosystem structure (5 pillars + Future Modules), brand-relationship radial diagram, 5 cross-platform identity icons, shared design language | Not separately itemized on the board |
| AEB-13 | Community Connect Product Identity | Product logo suite, 3-variant app icon family, 7-swatch palette, 2 typefaces, tagline/messaging (4 value props + positioning line), 5 app-screen previews, download/store assets, product lockups, usage rules | Not separately itemized on the board |

**Sum of estimated extraction targets across AEB-01–09 (public-website-relevant boards):
≈2,900 individual asset files.** AEB-05 (Mission Control, 324 files) and AEB-10 (roadmap, future
only) are excluded from that figure as out-of-scope/not-yet.

### 1.3 A caveat on completeness

Several boards' Asset Manifest tables are longer than what's visible in the board image — AEB-06's
and AEB-07's tables are truncated with a visible "…" row, meaning more line items exist than were
legible in this pass. The category/count-level inventory above is complete and reliable; a
row-perfect line-item manifest (every individual asset ID) will need to be re-derived directly from
each board at extraction time, not assumed from this report.

### 1.4 Library structural issue carried over from the charter

Files named `11_AEB_Brand_Identity_Collection_v1.0.png.png` and
`13_AEB_UI_Component_Standards_v1.0.png.png` do not contain the content their filenames promise —
both actually contain duplicate/variant Design System Style Guide boards (using Montserrat instead
of Manrope/Inter). The real AEB-11/12/13 content described in the table above was found stacked
inside the file named `12_AEB_Platform_Ecosystem_Reference_v1.0.png.png`. This is a library
organization defect, not a website decision — flagged here again because it affects how extraction
work should reference these files.

---

## 2. Complete Inventory of Every Website Page Required

AEB-09 defines **12 page templates** (by type) but the actual sitemap plus footer resolve to
significantly more individual pages/URLs. Reconciled list:

### 2.1 Primary pages (top-level sitemap nodes)

| # | Page | URL | Template type |
|---|---|---|---|
| 1 | Homepage | `/` | Landing |
| 2 | About Us | `/about` | Content |
| 3 | Community Connect | `/community-connect` | Feature |
| 4 | Mission Control | `/mission-control` | Feature |
| 5 | Insights Overview | `/insights` | Resource |
| 6 | Community Reports | *(sub-page of Insights per template grid — see 2.2)* | Resource |
| 7 | News & Stories | `/news` | News/Blog |
| 8 | Resources / Help Center | `/resources` | Resource |
| 9 | Contact Us | `/contact` | Form/Contact |
| 10 | Privacy Policy | `/privacy` | Legal |
| 11 | 404 Page | — | Utility |
| 12 | Coming Soon | — | Utility |

### 2.2 Sub-pages (from the sitemap tree, section 1 of AEB-09)

- **About** (`/about`): Our Mission, Our Story, Our Team, Partners
- **Community Connect** (`/community-connect`): Overview, How It Works, Features, Download App
- **Mission Control** (`/mission-control`): Overview, For Government, For Agencies, Platform
  Security
- **Insights** (`/insights`): Community Reports, Trends Dashboard, Data in Action, Mayor's Briefing
- **News & Stories** (`/news`): News, Success Stories, Events, Press Releases
- **Resources** (`/resources`): Help Center, Guides, API Access, Media Kit
- **Contact** (`/contact`): Contact Form, Support, Partnerships, Careers

That's **28 sub-pages** across 7 sections, plus the homepage and 3 utility/legal pages = **32
distinct pages/URLs minimum**, even though only 12 *template types* need to be designed.

### 2.3 Open question — legal pages

The footer structure (AEB-09 §4) lists four separate legal items: **Privacy Policy, Terms of
Service, Cookie Policy, Data Retention**. The page-template grid only shows one explicit "Privacy
Policy" page. It is not defined anywhere in the library whether Terms of Service / Cookie Policy /
Data Retention are three additional standalone pages or sections within one combined legal page.
**[FOUNDER DECISION PENDING]** — flagging rather than assuming a structure.

### 2.4 Minor inconsistency noted

The mega-menu example on AEB-09 shows a Mission Control column with items "Overview, For Agencies,
Data in Action, Platform Security" — "Data in Action" here is otherwise an Insights sub-item per the
sitemap tree. Low-stakes, but worth reconciling with the founder when nav copy is finalized rather
than silently picking one.

---

## 3. Complete Inventory of Every Visual Component

Grouped by source board. All states/variants listed are as documented on the boards — nothing added.

**Buttons** (AEB-02, AEB-06, AEB-07, AEB-13): Primary / Secondary / Outline / Ghost / Text Link /
Icon button. States: Default, Hover, Pressed/Active, Disabled. Sizes: Small, Medium (default),
Large.

**Navigation**: Desktop nav bar, mobile nav (hamburger + slide-out), mega menu (3-column).

**Cards**: Feature, Stat, Info, CTA, News, Event (AEB-02); Default and Dark variants, Stat card
(AEB-06/13).

**Forms**: Text input (default/focused/error), select dropdown, textarea, checkbox
(unchecked/checked/indeterminate/disabled), radio button, toggle switch, file upload/drag-drop.

**Feedback & status**: Status badges (Reported/Verified/Assigned/In-Progress/Resolved/
Rejected/Archived/Draft), alert/message banners (Success/Info/Warning/Error), chips/labels
(New/Updated/Hot/Featured/Beta/Coming Soon), tooltip, progress bar, loading spinner.

**Data display**: Table (header, rows, status column, actions, loading/empty/error states),
pagination, tabs, chart set (line/bar/donut/pie/area/gauge) — charts are primarily a Mission
Control asset (AEB-05) but the design tokens for them live in AEB-06 and a dashboard-preview card
does appear on the Community Connect side (AEB-03 §3.4).

**Icons**: 176 total per AEB-07 — 64 core, 48 action, 24 navigation, 24 status/indicator, 16
social/share, plus UI-element icon usage across buttons/badges/chips.

**Content blocks** (AEB-09 §7 — the building blocks every page template is composed from): Hero
Block, Feature Block, Stats Block, Call to Action Block, Testimonial Block, Partners Logo Block.

**Out of scope for this website:** Mission Control's dark-theme dashboard chrome (sidebar nav, top
bar, admin/system elements, map/geographic assets) — these exist in the library (AEB-05) but the
charter (§2/§5) excludes Mission Control's dark UI from public pages. They may appear only as
*preview imagery* (screenshots inside a device mockup), never as live dark-themed components on the
website itself.

**Not found on any board** (noting absence rather than inventing): breadcrumbs, accordion component
(the FAQ content on AEB-03 is presented as static icon+label cards, not an interactive accordion —
if an accordion pattern is wanted for the Resources/FAQ page, that's a new UI decision, not an
extraction).

---

## 4. Complete Inventory of Every Downloadable Resource

- **App store assets**: Google Play badge, App Store badge, QR-to-download, "Learn More" QR
  (AEB-03 §3.6, AEB-04 §4.6) — 4 QR/download assets plus store badges.
- **Play Store listing assets**: app icon (512×512), 3 feature graphics (1024×500) (AEB-03 §3.6).
- **Press kit** (AEB-04 §4.8): press release, media kit, fact sheet, logo pack, photos, contact —
  6 elements.
- **Presentation decks**: 4 presentation cover templates (1920×1080) — Community Connect overview,
  "Power of Community Intelligence," "Building Stronger Communities," "Data. Action. Impact."
  (AEB-04 §4.4). These read as downloadable/shareable deck covers rather than in-page assets.
- **Guides** and **API Access** documentation — named as nav destinations (`/resources`) but their
  actual downloadable/reference content does not exist yet anywhere in the library.
- **Media Kit** — also a nav destination under Resources; overlaps with the press-kit elements
  above but no distinct file set defined for it beyond the press-kit icons.
- **Investor/Corporate assets** (AEB-10 roadmap category 5): investor deck templates, pitch
  graphics, financial infographics, market/growth charts, corporate presentations — **planned,
  not yet produced.**

---

## 5. Complete Inventory of Every Image Still Needing Creation

Two different kinds of "still needing creation" apply here, and they shouldn't be conflated:

### 5.1 Assets defined on a board but not yet extracted into production files

This is effectively everything in §1.2's ~2,900-file estimate — none of it has been extracted into
`/assets/` yet. This is extraction work, sequenced in §12, not new creative work.

### 5.2 Assets that do not exist in any form yet, even conceptually

- **Real photography.** Every board footer marks its contents "conceptual." AEB-08 explicitly
  states the *direction* for photography ("real people, not staged/stock, diverse, inclusive,
  natural lighting, high contrast") but the 4 "Hero Concept Examples" and 6 "Photography Style
  Guide" images on the board itself are AI-generated concept/reference images, not a shot photo
  library. A real photography shoot (or licensed photography matching the direction) is a
  prerequisite for a production-ready hero/photography section — this cannot be "extracted," it has
  to be produced.
- **Open Graph / social share images** — no board defines dedicated OG/Twitter Card image assets
  per page; these need to be created to satisfy the SEO architecture in §9.
- Everything in **AEB-10's 12 future categories**: launch/promo videos, animation & motion
  graphics, custom illustrations, additional app screenshots, investor/corporate assets, event/print
  materials, expanded social content kits, drone/photography library, expanded icon packs,
  audio/music assets, expanded data-viz assets, and "future innovation" (AI/AR/smart-city) concept
  art. AEB-10's own timeline puts most of this in Phase 2 ("Growth," 3–6 months) and later — i.e.
  explicitly *not* required for initial website launch.
- **Guides and API documentation content** (see §4) — not an image gap, but a content gap worth
  flagging alongside it since the Resources page IA depends on it.

---

## 6. Complete Information Architecture

```
Homepage (/)
├── About (/about)
│   ├── Our Mission
│   ├── Our Story
│   ├── Our Team
│   └── Partners
├── Community Connect (/community-connect)
│   ├── Overview
│   ├── How It Works
│   ├── Features
│   └── Download App
├── Mission Control (/mission-control)
│   ├── Overview
│   ├── For Government
│   ├── For Agencies
│   └── Platform Security
├── Insights (/insights)
│   ├── Community Reports
│   ├── Trends Dashboard
│   ├── Data in Action
│   └── Mayor's Briefing
├── News & Stories (/news)
│   ├── News
│   ├── Success Stories
│   ├── Events
│   └── Press Releases
├── Resources (/resources)
│   ├── Help Center
│   ├── Guides
│   ├── API Access
│   └── Media Kit
├── Contact (/contact)
│   ├── Contact Form
│   ├── Support
│   ├── Partnerships
│   └── Careers
└── Utility / Legal
    ├── Privacy Policy
    ├── Terms of Service / Cookie Policy / Data Retention  [FOUNDER DECISION PENDING — §2.3]
    ├── 404
    └── Coming Soon
```

Architecture principles carried over verbatim from AEB-09's own sidebar (these are source
constraints, not this report's invention): user first/information second; clear hierarchy and
simple paths; mobile optimized, desktop enhanced; consistent navigation everywhere; fast, accessible,
secure; built for trust and transparency; every page has a purpose; one platform, many communities.

Three example user journeys are pre-defined on the board and should anchor page-to-page linking
decisions during build: **Citizen Reporting Journey** (Homepage → Learn More → Download App → Report
Issue → Track Status), **Government User Journey** (Mission Control → Agency View → Dashboards →
Reports → Export Data), **Partner Onboarding Journey** (About Us → Partnerships → Contact →
Review → Onboard).

---

## 7. Complete Navigation Structure

- **Desktop nav bar**: logo + About, Community Connect, Mission Control, Insights, News & Stories,
  Resources, Contact Us + a persistent "Download App" CTA button, right-aligned.
- **Mobile nav**: hamburger icon opens a full-menu overlay listing the same 7 sections (each
  expandable to its sub-items) plus the Download App CTA.
- **Mega menu** (desktop, on hover/click of a top-level item with children): 3-column layout
  demonstrated for Community Connect / Mission Control / Insights, each column showing that
  section's sub-items, with a promotional panel ("One Platform. Every Community. Every Voice.")
  alongside.
- **Footer navigation**, 4 columns: **Platform** (About Us, Community Connect, Mission Control,
  Insights, News & Stories), **Resources** (Help Center, Guides, API Access, Media Kit), **Legal**
  (Privacy Policy, Terms of Service, Cookie Policy, Data Retention), plus social icons (X, Facebook,
  Instagram, YouTube, LinkedIn shown on the board), copyright line, and utility links (Sitemap,
  Accessibility, Language selector).
- **Interaction legend** defined on the board for diagramming purposes: Primary Action (solid
  arrow), Secondary Action (dashed arrow), Navigation Flow, External Link, Modal/Overlay — useful
  vocabulary to keep consistent when documenting future flows.

---

## 8. Complete Content Architecture

Every page template is composed from the same content-block vocabulary (AEB-09 §7), which keeps
future pillars/pages addable per the charter's §18 Future Expansion goal:

- **Hero Block** — big message + large image (every primary page needs one; homepage's is the
  flagship: "Report. Connect. Improve." class messaging).
- **Feature Block** — highlight key features, icon + label pattern (used heavily on Community
  Connect and Mission Control pages).
- **Stats Block** — numeric proof points ("24,851 Total Reports," "+12% from last month" style,
  pulled from the dashboard-preview numbers already modeled on AEB-03/AEB-06).
- **Call to Action Block** — drives to Download App / Learn More / Get Started.
- **Testimonial Block** — real voices, ties to the "authentic, not staged" photography direction.
- **Partners Logo Block** — builds trust/credibility, likely populated on About/Partners and
  Homepage.

**Messaging inventory already approved and available to reuse verbatim** (not to be rewritten,
since it's brand-approved copy):
- FTN Platform: "The Operating System for Community Intelligence." / "One Platform. Every
  Community. Every Voice." / "Connecting Communities. Empowering Governments. Building a Smarter
  Nation."
- Community Connect: "Report. Connect. Improve." / "Your voice. Your community. Your future." /
  value props: Report issues in your community. Connect with neighbours and leaders. Improve the
  places we live. Stronger communities start with you.
- Hero concept headlines (AEB-08): "Stronger Communities. Better Lives.", "Your Voice. Real
  Change.", "One Platform. Every Community. Every Voice.", "Our Community. Our Future. Our
  Responsibility."
- FAQ content already scoped (AEB-03 §3.9): "How does it work?", "Is my data safe?", "Do I need an
  account?" — real question set to build the Help Center/FAQ content around, not placeholder.

---

## 9. Complete SEO Architecture

- **Per-page metadata**: unique `<title>` + meta description for all 32 pages/URLs in §2.
- **Structured data (JSON-LD)**:
  - Sitewide: `Organization` (RealityArtTV Media / FTN Platform) + `WebSite`.
  - Community Connect section: `SoftwareApplication` (ties to the Play Store / App Store assets in
    §4).
  - News & Stories: `NewsArticle` per post.
  - Resources/Help Center: `FAQPage`, seeded from the FAQ content already approved in §8.
  - Contact → Careers: `JobPosting` if/when roles are listed (not yet defined — flag when Careers
    content is built).
- **Open Graph + Twitter Card** tags on every page — image assets for this are a creation gap (§5.2).
- **Canonical URL** on every page.
- **`sitemap.xml`** generated directly from the IA in §6 — regenerate whenever a page is added.
- **`robots.txt`** from day one, referencing the sitemap.
- Semantic HTML/heading structure and image alt text are covered as standing rules in `CLAUDE.md`
  §8/§11/§13 — not repeated as new decisions here.

---

## 10. Complete Responsive Strategy

- **Breakpoints** (AEB-06 design tokens): Mobile 375px, Tablet 768px, Laptop 1024px, Desktop
  1260px, Ultra-wide 1820px+.
- **Grid**: 12 columns, 24px gutter, 24px margin.
- **Minor inconsistency to note**: AEB-08's device-mockup section labels its breakpoints
  differently — "Laptop – 1440px" and "Desktop – 1920px" rather than AEB-06's 1024/1260. Since
  AEB-06 is the manifest's designated design-system authority, treat 375/768/1024/1260/1820 as the
  implementation breakpoints, and treat AEB-08's 1440/1920 as *mockup presentation sizes only* (i.e.
  the size the concept images happen to be rendered at), not competing breakpoint tokens — this is a
  low-stakes reading, not a brand-conflict-tier item, so it doesn't get a [FOUNDER DECISION PENDING]
  flag, but it's recorded here for transparency.
- **Mobile-first pattern already modeled**: hamburger nav, single-column card/feature stacking
  (implied by "mobile optimized, desktop enhanced" principle), device mockups exist for
  phone/tablet/laptop/desktop for the homepage hero specifically (AEB-08 §3), giving a concrete
  reference for how the flagship hero should reflow.
- **Responsive image variants**: the manifest's own extraction rule already requires "create
  responsive variants" — treat this as a hard requirement per image asset, not an optimization to
  consider later.

---

## 11. Complete Accessibility Strategy

- **Target: WCAG 2.2 AA**, consistent with the design system's own stated principle ("Accessible by
  design") and its explicit extraction note "Ensure accessibility and AA contrast."
- **Color is never the sole signal** — already modeled correctly on the boards themselves (status
  badges and alert banners pair color with text/icon, not color alone).
- **Icon-only controls** (icon buttons, social icons, nav hamburger) need accessible names — the
  icon library itself (AEB-07) doesn't define labels, so accessible-name text needs to be authored
  per instance during build.
- **Keyboard operability** required for: mega menu, mobile nav overlay, tabs, table row actions,
  any FAQ interaction pattern chosen (see §3 — no accordion component currently defined, so if one
  is introduced it must be keyboard-operable from the start).
- **Forms**: every input state (default/focus/error) already has a distinct visual treatment on
  AEB-02/06 — carry that through to accessible error association (`aria-describedby` etc.) rather
  than color-only error states.
- **Representation as an accessibility-adjacent concern**: AEB-08's art-direction principles
  ("Diverse. Inclusive.", "Real communities. Real people.") are a content requirement, not just a
  visual style — genuine photography (§5.2) needs to actually satisfy this, not just the AI concept
  placeholders currently on the board.
- **Contrast risk to watch**: FTN red is used for CTAs and status/danger indicators across multiple
  boards — once its hex is finalized (post [FOUNDER DECISION PENDING] resolution), it must be
  verified for AA contrast at actual text/button sizes before shipping, not assumed to pass because
  it's the brand color.

---

## 12. Complete Implementation Roadmap

This is the website's own build sequence — distinct from AEB-10's asset-production roadmap, which
plans *future creative assets* rather than website engineering phases.

**Phase 0 — Discovery (this report).** Complete.

**Phase 1 — Foundation (blocked on founder decisions).**
Extract AEB-01 brand assets and AEB-06 design tokens into `/assets/` and a base CSS token layer.
**Hard blocker:** the four frozen conflicts in `CLAUDE.md` §5 (FTN Red hex, success-green hex,
Manrope/Inter vs. Montserrat, and confirming which typography applies to the FTN Platform master
brand vs. sub-brands) must be resolved before this phase can produce a final token file. Base page
skeleton (header/nav/footer), semantic HTML shell for all 12 templates.

**Phase 2 — Core pages.** Homepage, About, Community Connect, Mission Control overview — built from
AEB-02/03 components and the approved messaging in §8.

**Phase 3 — Remaining content pages.** Insights, News & Stories, Resources, Contact, including the
seeded FAQ content and contact form.

**Phase 4 — Legal & utility.** Privacy Policy (+ resolution of the Terms/Cookie/Data-Retention
structure question, §2.3), 404, Coming Soon, plus sitewide SEO architecture (§9): sitemap.xml,
robots.txt, structured data, OG/Twitter images (once created, §5.2).

**Phase 5 — Responsive, accessibility, performance QA.** Verify against the breakpoint set (§10),
run a full WCAG 2.2 AA pass (§11), verify Core Web Vitals targets from `CLAUDE.md` §12.

**Phase 6 — Asset gap-fill.** Real photography sourcing/shoot (§5.2), press kit finalization,
investor/corporate assets — largely dependent on founder-driven creative production rather than
engineering, and overlaps with AEB-10's own "Growth" phase (3–6 months).

Each phase's exit criteria should be a working, reviewable state — no phase should silently absorb
scope from the next one.

---

*End of Phase 1 Discovery Report. No HTML, CSS, or JavaScript has been generated. Awaiting founder
approval before any implementation begins.*
