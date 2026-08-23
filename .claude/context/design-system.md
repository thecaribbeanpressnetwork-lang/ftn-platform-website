# Design system & brand standards

## Identity

- **FTN Platform** — "The Operating System for Community Intelligence" / current public framing
  leans "The Caribbean Operating System" (per `js/product-registry-data.js`'s `platform-home`
  description — treat the registry's own current copy as more current than an older tagline if
  the two ever conflict).
- Taglines in use: "Connecting Communities. Empowering Governments. Building a Smarter Nation." /
  "One Platform. Many Solutions. One Mission."
- **Publisher:** RealityArtTV Media (parent company; FTN Platform is its flagship platform brand).
  Mission: "We educate, inform and inspire through powerful media that reflects truth, culture and
  community." Brand pillars: Independent, Bold, Authentic, Community Driven, Truth Focused, Impact
  Oriented.

## Locked brand tokens (Founder Decision 2026-07-11 — permanent, not website-scoped)

- **FTN Red: `#E10613`.**
- **`--color-red-on-dark` (`#E94750`)** — a dark-surface contrast variant of the same red, added in
  RC1 after an axe-core sweep found the base red failing 4.5:1 on black/charcoal surfaces. Not a
  new brand color, not a reopening of the red decision.
- **Typography: Montserrat (headings) + Inter (body).**
- Core neutrals: Jet Black `#0B0B0B`, White `#FFFFFF`.
- 8pt spacing grid (4/8/12/16/24/32/48/64/96/128px). Breakpoints: 375/768/1024/1260/1820px+, 12-col
  grid, 24px gutter/margin.
- **Wordmark detail:** in the "FTN" wordmark, the F and N stay the surrounding fill color; the T is
  always FTN Red — a confirmed, intentional brand detail (verified against the AEB-01 board), not a
  typo. Implemented via a `<tspan class="logo-mark__t">` styled by `.logo-mark__t { fill:
  var(--color-red); }` in `css/utilities.css` — don't "fix" it back to a solid color if you see it.

## Still open — do not silently resolve

**Success green** has two candidate hexes across the source asset boards: `#22C55E` (AEB-01) vs
`#16A34A` (AEB-06/AEB-13). Unresolved as of the last check. Causes one known WCAG AA contrast
failure (`indicator-card__change--up` / `mc-kpi-card__trend--up`, 3.29:1 against white, needs
4.5:1). Ask the founder before picking one.

## Per-surface visual direction (Founder Decision 2026-07-11, extended 2026-07-13)

- **Public website (this repo):** light-first, premium, modern; black/white/FTN-red; disciplined,
  deliberate dark sections/bands for rhythm and product showcases — never the page default.
- **Extended exception:** the homepage and the "Ecosystem Board" product pages approved 2026-07-13
  are a bounded dark treatment, not a reversal of light-first — see decisions.md.
- **Community Connect app:** light theme, professional, fast, accessible (separate repo).
- **Mission Control / operations-centre-class surfaces:** dark-first, restrained motion,
  disciplined spacing, high contrast — but per current-state.md, Mission Control's public
  *marketing* page no longer exists (`PRIVATE`/`publicVisibility:false` in the live registry) — this
  direction now governs a private surface, not public website content.

## Photography & art direction

Do: real photography (not stock or AI-generated), high contrast, diverse/authentic subjects,
positive action, clean layouts, FTN red reserved for CTAs. Don't: stock clichés, overcrowded
layouts, low contrast, yellow/blue accents, generic icon-only hero art, AI-generated imagery
presented as real photography (a real defect was found and fixed once — an AI-generated "Community
Photography (Trinidad & Tobago)" grid on a source asset board, identified by identical HDR grading
across supposedly-different times of day — do not extract or ship anything with those tells).
Visual tone pillars: Trusted, Connected, Empowered, Progress, Transparent.

## Asset standards

- Extract individually; generate SVG/PNG/WEBP/AVIF where appropriate; maintain proportions/colors;
  sRGB; optimize for web; transparent backgrounds where indicated.
- Two naming conventions, don't conflate: AEB extraction/intermediate files
  (`aeb-[board]-[category]-[name]-v1.[ext]`) vs. final production filenames (lowercase,
  hyphen-separated, e.g. `logo-ftn-platform-primary.svg`).
- Never redesign approved logos or invent branding while extracting — if an asset doesn't exist on
  any board, ask, don't fabricate it. Don't alter proportions/weights of extracted icons/logos.

## Authority hierarchy for brand source material

AEB-01 (Brand Foundation) is nominally highest authority; AEB-06 (Design System) governs design-
system rules; AEB-02 (UI Components); AEB-09 (Website Architecture); AEB-11/12/13 are supplementary
(RealityArtTV identity, ecosystem reference, Community Connect product identity respectively).
**Known library quirk:** two files (`11_AEB_Brand_Identity_Collection...` and
`13_AEB_UI_Component_Standards...`) don't contain what their filenames claim — verify against a
board's own embedded header/title stamp, never trust the filename.
