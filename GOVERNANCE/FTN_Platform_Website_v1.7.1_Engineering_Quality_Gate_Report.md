# FTN Platform Website — Version 1.7.1 Engineering Quality Gate Report

**Program:** Post-release engineering pass ("final quality gate before public beta")
**Date:** 2026-07-13
**Built on:** v1.7.0 (Executive Visual Polish & Caribbean Localization, live in production)
**Commit this pass:** `51a0374`
**Scope:** Engineering only — bug fixes, accessibility, code quality. No product, architecture, or
design-direction decisions were made or implied. See the Architecture Recommendations section at
the end, which is empty by design (see note there).

## Why this pass happened

v1.7.0 shipped clean by every check run at the time (95/95 regression: console errors, overflow,
broken images, header/footer integrity). This pass asked a different question: not "did this
release regress anything," but "what defects has the site been quietly carrying that no prior pass
actually caught." A full WCAG 2.2 AA sweep via axe-core — a tool not previously run against this
specific build — against the live production site was the right instrument for that question, and
it found two real, previously-undetected defects.

## 1. Critical: country-switcher had zero accessible name (every page)

**Finding.** `axe-core`'s `button-name` rule (critical, WCAG 4.1.2) failed on all 18 pages swept,
always the same element: `.country-switcher-trigger`.

**Root cause.** A genuine CSS specificity bug, not a missing feature. In
`css/components/country-switcher.css`, the label's base state was declared *after* its own
responsive override in source order:

```css
@media (min-width: 1260px) {
  .country-switcher-trigger__label { display: inline; }
}
.country-switcher-trigger__label { display: none; }   /* <- appears later, wins regardless */
```

Two rules of equal specificity (both a single class selector) resolve ties by source order — the
later rule wins independent of whether it's inside a media query. The unscoped `display: none`
therefore won at *every* viewport width, including ≥1260px, meaning the country name has
apparently never actually rendered on desktop since this control shipped in v1.6.0. The mobile-nav
variant of the same button shares the same label class and was equally affected — it always showed
a bare pin dot and a chevron, no text, despite `.mobile-nav__country-switcher`'s own layout
(`justify-content: space-between`) being clearly designed to show one.

**Fix.**
1. Moved the base `display: none` rule before the media queries so the ≥1260px override correctly
   wins the cascade (`css/components/country-switcher.css`).
2. Added `.mobile-nav__country-switcher .country-switcher-trigger__label { display: inline; }` —
   the mobile nav panel is a full-width row with room for the label at every width it's shown, so
   it should never have been viewport-gated in the first place.
3. Added a static `aria-label="Choose your country"` to both button instances (38 occurrences
   across 19 files, scripted) as a robust fallback — the accessible name no longer depends on
   which responsive state the visible label happens to be in.

**Verification.** Re-ran full regression (95/95) after the label became genuinely visible for the
first time, specifically checking for the horizontal-overflow risk this exact class of change
caused once before (v1.6.0's Founder Review documents an overflow regression from an earlier
attempt to add this same label) — zero overflow at any of 5 breakpoints. `axe-core` re-run locally
and against production: 0 `button-name` violations remaining.

## 2. Serious: four color-contrast defects (distinct from the known green-indicator issue)

**Finding.** `axe-core`'s `color-contrast` rule failed on 7 of 18 pages, 25 total node-level
violations. Cross-referencing every target against CLAUDE.md's already-documented, founder-reserved
success-green defect (`indicator-card__change--up` / `mc-kpi-card__trend--up`, `#16A34A` on white,
3.29:1) confirmed most instances were exactly that known issue — correctly left untouched, since
its resolution requires a founder color decision, not an engineering fix. Four instances were not:

| Element | Before | After | Root cause |
|---|---|---|---|
| `.ecosystem__status--live` (About) | 3.83:1 | 4.96:1 | Semi-transparent red-on-dark badge composited to a background where *no* opacity value reached 4.5:1 — the `--color-red-on-dark` token's own margin against pure `--color-charcoal` is only 4.54:1, and any red tint pushes the composite below it. Switched to solid background + white text. |
| `.module-card__status--live` (Applications) | 4.31:1 | 4.72:1 | Tint opacity too strong; reduced 0.08 → 0.03. |
| `.cta .module-card__status--live` (red CTA band) | 4.16:1 | 4.64:1 | White overlay opacity pushed the background too light for white text; reduced 0.2 → 0.1. |
| `.chart-card` text inside `.section--dark` (Insights, News) | 2.58:1 | passes | `.section--dark p { color: silver }` (class+element, specificity 0-1-1) outranks a plain `.u-text-graphite` utility class (0-1-0) regardless of source order, so a white-background chart-card dropped into a dark section silently rendered silver-on-white instead of the intended graphite-on-white. Added an explicit `.section--dark .chart-card p` override (specificity 0-2-1), which wins cleanly and cascades to child links via the existing `a { color: inherit }` base rule. |

Every replacement value was computed via the WCAG relative-luminance formula before being applied
(not tuned by trial and error in the browser), then re-verified against the rendered page.

**Verification.** `axe-core` re-run across all 18 pages, both locally and directly against
production post-push: 0 new violations. Only the known, explicitly-deferred success-green issue
remains, unchanged.

## 3. Investigated, found not actionable safely: 1024px nav wrap

Re-checked the standing, three-releases-old "nav items wrap awkwardly at 1024px" note. Confirmed
still present — "Face the Nation" and "News & Stories" wrap their own text across 2–3 lines at
exactly 1024px width, making the header taller and visually busy (not a functional break: every
item stays clickable, readable, and keyboard-reachable).

Tested the obvious fix (`white-space: nowrap` on `.site-nav__trigger`) empirically rather than
assuming it was safe: it reintroduces genuine horizontal overflow (1236px content in a 1024px
viewport), exactly the regression a prior release specifically avoided by allowing the wrap in the
first place. A real fix needs an actual UX decision — which nav items to abbreviate or collapse at
this width — not a CSS toggle. Left unchanged rather than trading one visible problem for a worse
one; documented here so it isn't silently rediscovered as "new" in a future pass.

## 4. Hygiene checks (clean, no action needed)

- **TODO/FIXME/HACK debt:** none found (one false-positive grep match on the substring inside
  `applyToDocument`, not a real marker).
- **Orphaned files:** every JS file is referenced by at least one page; every CSS component file is
  referenced by at least one page (`face-the-nation.css` correctly by exactly one, its own page).
- **Duplicate HTML ids:** none found across any of the 18 pages checked.
- **AVIF image variants:** none exist (WEBP-only). Noted as a minor, low-priority performance gap —
  WEBP already captures the large majority of the compression benefit over PNG for this site's
  imagery, and no AVIF encoder is available in this environment. Not pursued this pass; flagged for
  a future pass with proper tooling.

## Verification summary

- 95/95 regression checks (19 pages × 5 breakpoints: console errors, overflow, broken images,
  logo-T count) — before and after this pass's changes.
- `axe-core` WCAG 2.2 A/AA sweep, 18 pages, run three times: baseline (found the defects above),
  post-fix locally, post-fix against live production. Final state: 0 violations except the one
  already-known, founder-reserved success-green issue.
- Pushed to `origin/main` (`51a0374`), deployment confirmed live (response markers checked
  directly against `ftnplatform.org`), axe-core re-run directly against production as the final
  check rather than trusting the local result alone.

## Architecture Recommendations (Not Implemented)

None. Everything found and fixed in this pass was implementation-level (a CSS cascade bug, contrast
tuning, a specificity conflict) — none of it met the bar this session's engineering-scope reset
defines for "architecture" (new product, changed platform direction, new shared data model, changes
spanning multiple products, or a 5–20 year roadmap item). The one item that came closest to a
judgment call — the 1024px nav-wrap issue — is a single-page UX/content-prioritization decision, not
an architectural one, and is recorded in §3 above rather than here.
