# FTN Platform Website — Version 1.5.0-RC1 Design Release Report

**Status:** Release candidate — pending founder review. **Not pushed to `origin`.**
**Git tag:** `v1.5.0-rc1` · **Date:** 2026-07-13
**Companion:** `RELEASE_NOTES_v1.5.md` (technical changelog) — this document is the design-decision
record and visual evidence log. A visual before/after comparison of 8 key pages is also published
as a private Claude Artifact for interactive review (link shared separately with the founder).

---

## 1. Mandate

The founder's brief: the site is "technically correct... but it still looks like a startup
website." The instruction was explicit that this is a visual-presentation pass only — no new
pages, no removed pages, no routing changes, no navigation *structure* changes, no touching
Community Connect or Mission Control source, no legal content changes, no new technologies. The
goal was one unified design system that every page visibly belongs to, executed with enough
restraint and precision that a government minister, an investor, or a journalist would read the
site as institutional rather than templated.

## 2. Two decisions made before work began

**Homepage hero imagery.** The asset library has no approved platform-level (as opposed to
product-scoped) photography — this was already true and already documented from the v1.2 pass.
Rather than fabricate or repurpose imagery, the founder confirmed the direction: elevate the
existing typography + hand-drawn SVG motif treatment to a higher confidence level. Delivered as a
raised type-scale ceiling (5.5rem → 6rem) and a re-tuned fluid curve so the hero actually reaches
near-maximum size at ordinary desktop widths instead of only ultra-wide.

**Commit strategy.** Phase-by-phase commits land directly on `main`, matching the two prior
creative passes (v1.2.0, v1.2.1) — no feature-branch precedent exists in this repo, and nothing is
pushed until approved, so `main` stays exactly as reversible as a branch would have been.

## 3. What the new design system actually is

Not a new file, not a new framework — a set of deliberate consolidations and tokenizations layered
onto the existing AEB-01/AEB-06-derived system:

| Before | After |
|---|---|
| `#ECECEC` hardcoded 50+ times across 9 files | `--color-border` token, one definition |
| `#FAFAFA` hardcoded 5+ times across 4 files | `--color-tint` token |
| Two hand-rolled `rgba(11,11,11,x)` shadow values, duplicated | `--shadow-media` / `--shadow-gallery` tokens |
| Button hover/active colors as raw hex | `--color-red-hover` / `--color-red-active` tokens |
| 6 independently-defined, byte-identical card box treatments | 1 shared rule (`.feature-card, .platform-flow__node, .principle-card, .module-card, .workflow-step, .preview-card { ... }`) |
| "Button on dark surface" solved 4 different ways across 3 files (one had silently drifted) | 2 real modifier classes: `.btn-outline--on-dark`, `.btn-secondary--on-dark` |
| 3 different logo sizes (32px header / 34px footer / an unused 28px utility) | 1 hierarchy: 36px header, 40px footer |

No brand color changed. FTN Red (`#E10613`), Montserrat, and Inter are exactly as founder-locked in
2026-07-11. Success-green remains untouched and unresolved, exactly as it was before this pass —
see §6.

## 4. Page-by-page decisions

**Homepage** — hero type scale raised and re-tuned (see §2); no structural change to `.scale-band`,
`.editorial-split`, or `.platform-flow`, which were already well-executed from the v1.2 pass.

**Community Connect** — larger phone mockups (92px → 104px) and a real hover lift + shadow on the
screenshot gallery, closer to an App Store feature page. A pre-existing hover-state gap (the new
card hover-lift wasn't reset on the non-interactive "Coming Soon" tiles) was caught and fixed in
the same phase it was introduced.

**Mission Control** — "Executive Operations Centre" converted to `.section--dark`, pairing with the
already-dark "Platform Security" section. This reused dark-section infrastructure that was already
built and sitting unused in `content-sections.css`/`blocks.css` — not a new pattern. The Capabilities
module-card grid was deliberately left light: `.module-card` has no on-dark variant, and building
one wasn't worth the risk for this page in this pass.

**Observatory** — treated as the highest-risk page (largest bespoke CSS footprint, ~15+ JS mount
points) and handled last, after every shared primitive had already been proven stable on 7 other
pages. Exactly one change: hero-clock widgets gained a border + shadow, matching the existing
`.live-status` card treatment, for more "financial terminal" depth. The trend-up indicator's known
WCAG-failing green was explicitly not touched.

**Face the Nation** — the approved circular badge logo (`assets/face-the-nation/ftn-badge-logo.jpg`)
was extracted from the asset library in the original v1.4 pass but never placed in markup. This
pass puts it to use for the first time, as a red-ringed network-emblem treatment in the hero. Hero
height grows to 760px at desktop for more cinematic scale.

**Applications** — added a real `.module-card__status--beta` variant (outlined, not filled) so
"Public Beta" reads as genuinely distinct from "Live," directly answering the brief's "clear
differentiation between products." Applied everywhere Public Beta appears on a light background;
deliberately left unchanged where it sits on `.cta`'s solid-red band, which already has a working
white-on-transparent override — switching that instance to the new outlined treatment would have
rendered red-on-red and become unreadable.

**About, Contact** — both already consumed the shared system entirely; only small interaction
touches were added (hover lift on `.ecosystem__node`, indent-on-hover on the About index, hover
feedback on Contact's form fields and social icons) for consistency with cards elsewhere.

**11 pages received zero page-specific edits** — Insights, News, Resources, all four legal pages,
Sitemap, Accessibility, 404, and Mission Control Demo — because Phase 3's shared-component work
(typography, section spacing, page-hero) uplifted them automatically.

## 5. Verification

Every phase was checked before its commit; the full matrix was re-run at the end:

- **All 20 pages (19 + 404) × 5 breakpoints (375/768/1024/1260/1820px):** 0 console errors, 0
  horizontal overflow.
- **Id-integrity diff:** every `id="..."` attribute across all 19 HTML files, extracted before
  Phase 1 and after Phase 6 — byte-identical. Zero additions, removals, or renames.
- **Header/footer byte-diff:** one unique MD5 hash each across all 20 files, and that hash is
  identical to the pre-redesign baseline — every nav/footer visual change was pure CSS, no markup
  edits were needed.
- **Mobile nav toggle:** functional check confirms it opens correctly with zero gap against the
  corrected header height (see the header-height bug below).
- **Known 1024px nav-wrap limitation** (documented in `RELEASE_NOTES_v1.4.md`): re-tested against
  the new nav weight — unchanged, not worsened.
- **Observatory runtime check:** because this page's real content only exists after JavaScript
  renders it, a runtime check (not a static HTML read) confirmed the indicator wall, today-panel,
  what-changed, ad-packages-grid, category-jump, and all hero clocks were populated with real live
  values after every change touching this page.
- **Contact's 9 cross-linked category ids:** every inbound reference from other pages
  (`#general`, `#government`, `#commercial`, `#investors`, `#media`, `#creative`, `#support`,
  `#beta-feedback`, `#careers`) re-verified resolving correctly.
- No `html-validate`/`stylelint` config exists in this repo (confirmed — no `package.json` or
  linter config present); verification relied on the Playwright-driven checks above rather than
  static linting, and this document says so plainly rather than claiming a step that couldn't run.

## 6. Explicitly out of scope

- **Success-green** — still founder-reserved (two conflicting hex values in the source asset
  library). Not touched anywhere, including Observatory's trend-up indicator.
- **Homepage hero photography** — see §2.
- **1024px nav-wrap** — a density limitation, not a functional break; unchanged from v1.4.

## 7. A bug this pass introduced, caught, and fixed within the same phase

Enlarging the mobile-nav toggle (40px → 44px, for a better touch target) changed the header's real
rendered height: 65px → 77px on mobile/tablet where the toggle is visible, 65px → 69px on desktop
where it's hidden. Four different places across three files had the old 65px value hardcoded as a
sticky-offset (`.mobile-nav`, `.mc-tablist`, `.category-jump`, `.editorial-split__statement`). All
four were found and corrected in the same commit that introduced the change, before it ever reached
a regression check. Investigating this also surfaced that the original 65px figure had already been
slightly inaccurate on mobile even before this pass — a pre-existing, non-blocking imprecision, not
something this pass caused.

An originally-planned further increase to header padding at ≥1260px was deliberately reverted once
it became clear it would create a third header-height tier for those same sticky consumers to
track — the fragility wasn't worth the marginal spacing gain.

## 8. Remaining visual opportunities / recommendations for Version 1.5 Final

1. **Logo asset-file swap.** The header/footer logos are inline `<svg>` markup, hand-kept-in-sync
   across 20 files by convention (not a template). Two already-extracted, currently-unused files —
   `assets/logos/logo-ftn-platform-primary-{light,dark}.svg` — could replace that inline markup with
   an `<img>`/external reference, removing the 20-file sync burden. Not executed this pass: it's a
   structural change (DOM shape, not just styling) beyond what a visual-only release should carry.
2. **Success-green resolution.** Still the one open founder decision blocking a complete WCAG pass
   on Observatory's trend indicators.
3. **1024px nav density.** If the founder wants this fully resolved rather than accepted, it needs
   a dedicated pass restructuring the nav item set itself (fewer top-level items, or a different
   collapse strategy before 1024px) — not a visual-only fix.
4. **Dark variant for `.module-card`.** Mission Control's Capabilities grid stayed light this pass
   for risk reasons. If a future pass wants the whole page dark, a real on-dark card variant would
   need to be designed rather than retrofitted.

## 9. Confirmation

`git log origin/main..main` on the website repository shows all eleven v1.5.0-rc1 commits plus the
release-packaging commit as unpushed. Nothing from this pass has reached `origin` or production.
Promotion is pending explicit founder approval.
