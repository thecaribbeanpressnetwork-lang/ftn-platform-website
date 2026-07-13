# FTN Platform Website — Version 1.7.0 Engineering Release Report

**Program:** Executive Visual Polish & Caribbean Localization Pass
**Date:** 2026-07-13
**Built on:** v1.6.0 (Caribbean Executive Identity Pass, local, previously unreleased)
**Commits this pass:** 3 (`93bf2d6`, `8ed4e64`, `fe01e64`)
**Regression:** 95/95 checks pass (19 pages × 5 breakpoints)

This report documents the "Executive Visual Polish & Caribbean Localization" brief (Founder
Direction, 2026-07-13) — what was built, what was deliberately declined and why, and what remains
open. See `FOUNDER_REVIEW_v1.7.0/Founder_Review.html` for the full before/after screenshot gallery
and `CLAUDE.md` §7.14 for the standing architectural record.

## 1. Logo correction

The FTN Platform wordmark's **T now renders in FTN Red (`#E10613`)** everywhere the wordmark
appears; F and N stay the surrounding fill color. This was verified against the official AEB-01
Brand Foundation board before implementation — including catching and correcting a misreading
earlier in this same session that had incorrectly concluded the wordmark was uniformly one color.

- **38 occurrences corrected**: 19 HTML pages × 2 (header + footer inline SVG).
- **2 standalone SVG assets corrected**: `assets/logos/logo-ftn-platform-primary-light.svg`,
  `-dark.svg` (previously unreferenced by any page, updated for consistency).
- **Favicon deliberately left unchanged**: `assets/icons/favicon.svg` renders "FTN" at ~11px —
  a red T at that size would be illegible, not a correction. Documented rather than silently
  skipped.
- **Method**: the "FTN" glyph is native SVG `<text>`, not `<path>` letterforms. The T was split
  into its own `<tspan class="logo-mark__t">`, colored via one shared CSS rule in
  `css/utilities.css` (`fill: var(--color-red)`) rather than a hardcoded hex repeated per
  occurrence.
- **Contrast verified, not assumed**: 3.97:1 on white (header background), 4.96:1 on
  `--color-black` (footer background) — both clear the WCAG large-text 3:1 threshold at the
  wordmark's 40px glyph size. (Logos are exempt from WCAG 1.4.3 regardless, but this was checked.)

## 2. Visual & layout improvements

A fresh visual audit (not a re-application of v1.6.0's already-completed atmosphere work) across
home, resources, contact, community-connect, applications, and mission-control found the site
already in strong shape — v1.6.0's heritage-layer system and dark-band equalization had already
closed the "flat/cramped" gap identified in the prior Founder Review. One genuine layout defect was
found and fixed:

- **Applications' "Live Now" grid rebalanced from 3+1 to 2×2** (`#live .module-grid` in
  `css/components/content-sections.css`). The section holds exactly 4 cards (Community Connect,
  Mission Control, FTN Live, Face the Nation); a 3-column grid stranded the 4th card alone in its
  own row. Scoped specifically to that section's grid — `.module-grid` is shared across 9 pages
  with varying card counts, so a global column change was avoided in favor of an id-scoped
  override.

No other atmosphere, spacing, or typography changes were made this pass — the honest assessment is
that v1.6.0 already substantially delivered the brief's Priority 3–4 asks.

## 3. Assets used / images replaced

**No new images were added or replaced this pass.** The one candidate photography source — `FTN
editing assets/` board 41's "Community Photography (Trinidad & Tobago)" grid — was evaluated for
use on Community Connect and found, on close inspection, to be AI-generated concept imagery (not
real photography): identical HDR sky/color grade across all 10 shots regardless of implied time of
day, a suspiciously staged/glossy garbage pile, generic non-Trinidad-specific architecture. Using
it would have violated the brief's own Priority 5 ("avoid anything that immediately looks AI
generated"). Flagged to the founder and confirmed: do not ship it. No real, non-AI-generated
photography exists for Trinidad & Tobago or any other Caribbean country in either reference asset
library as of this release.

## 4. Caribbean localization (country switcher)

v1.6.0 built the country-switcher as pure architecture (persisted selection, no content changes).
This pass gives it its first real, honest behavior, deliberately scoped to what's achievable
without fabricated photography:

- **New `js/country-scope-notice.js`**, loaded on Community Connect and FTN Live (the two
  genuinely Trinidad & Tobago-specific pages) only. Listens for the existing `ftn:country-changed`
  event; when a visitor explicitly selects any country other than Trinidad & Tobago, a
  `[data-country-scope-notice]` element reads: *"FTN is expanding to `<Country>`. Trinidad &
  Tobago is live today."* Trinidad & Tobago (the default) is completely unaffected.
- **New `.callout--on-dark` CSS variant** (`content-sections.css`) for the notice's placement in
  FTN Live's dark hero — reuses the existing `--color-silver` on `--color-charcoal` combination
  already proven safe elsewhere on the site (verified again here: 6.73:1 contrast).
- This is intentionally smaller than "genuinely localize every country," which the brief also
  asked for — that requires real per-country photography and content that doesn't exist yet. See
  Recommendations below.

## 5. Typography improvements

None beyond what v1.6.0 already shipped (founding statements, heading tracking, hero-scale type).
The fresh audit in this pass found no genuine typography gaps warranting a change.

## 6. Animation improvements

None added this pass. v1.6.0's existing reduced-motion-respecting animations (heritage layer
drift/pulse/twinkle/sweep) were re-verified as part of full regression and remain correctly gated
behind `prefers-reduced-motion: no-preference`.

## 7. Accessibility improvements

- Logo red-T contrast verified against both placements (see §1).
- New `.callout--on-dark` contrast verified (6.73:1, silver on charcoal).
- Full regression re-confirmed zero new console errors, zero new overflow, across all pages ×
  breakpoints with `reducedMotion: 'reduce'` set.
- No accessibility regressions found; no new accessibility defects introduced.

## 8. Engineering reference board verification (Priority 6)

The brief cited specific board numbers as "engineering reference" (logos, UI, spacing, tokens,
icons, cards). Consistent with a pattern already documented in `CLAUDE.md` §5 (board-number/content
mismatches in the *original* asset library), the same issue recurred in the *new* `FTN editing
assets/` library — at least 4 confirmed instances where a cited board number did not contain the
described content (see `CLAUDE.md` §7.14 and the session's planning record for specifics). Rather
than trust citations, each board actually used was individually verified:

- Icon system (`assets/icons/icon-*.svg`) already matches the approved convention (`viewBox="0 0
  24 24"`, 2px stroke, `currentColor`, rounded caps/joins) confirmed against board 29's icon set.
- Design tokens (`css/tokens.css`: 8pt spacing scale, border radius 4/8/12/16/24/50px, shadow
  scale, Manrope/Inter — corrected to Montserrat/Inter per the 2026-07-11 Founder Decision) already
  match AEB-06 (board 35).

No changes were needed — this was verification, not a rebuild.

## 9. Deliberately not built this pass

- **ibis.ai, FTN Riddim, FTN Kaiso, FTN Love** — no approved branding exists for any of the four on
  any board reviewed, and building them would have reversed an explicit "do not build new products,
  dedicated releases later" instruction given earlier in this same session. Founder confirmed:
  skip entirely.

## 10. Remaining recommendations

1. **Commission or source real photography** for Trinidad & Tobago (and, over time, other
   Caribbean countries) before attempting deeper visual localization. AI-generated concept imagery
   is not an acceptable substitute per the platform's own standing photography direction.
2. **Community Connect's full wordmark lockup** is still icon-mark-only (v1.6.0) — the full lockup
   on the reference board is a flattened raster composite that showed visible compression softness
   at usable sizes. A real vector source file would resolve this cleanly.
3. **Success-green color** remains founder-reserved (two conflicting hex values in the source
   library) — untouched, including Observatory's known WCAG-failing trend-up indicator.
4. When/if the four new product names get their own dedicated briefs, each needs an approved brand
   board before any page work begins, per the standing "do not invent branding" rule.

## 11. Release scope note

Neither v1.5.0 nor v1.6.0 was ever pushed to `origin/main` — both were held pending founder review
per their own briefs' explicit instructions. A v1.7.0 push therefore carries all three releases at
once: the first production update since v1.4.0. See the release commit and `VERSION.md` for the
consolidated history.
