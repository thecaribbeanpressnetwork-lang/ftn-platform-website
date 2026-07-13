# FTN Platform Website — Release Notes

## Version 1.5.0-rc1 — "Executive Design System"

**Status:** Release candidate — pending founder review. **Not pushed to `origin`.**
**Git tag:** `v1.5.0-rc1`
**Reference:** `GOVERNANCE/FTN_Platform_Website_v1.5.0-rc1_Design_Release_Report.md` for full before/after
evidence and design decisions.

---

## Overview

A complete visual-presentation redesign of the FTN Platform Website: typography, spacing, color
tokens, buttons, cards, navigation, footer, and every page's presentation layer. **Zero
architecture, routing, navigation-structure, or content changes** — the information architecture
locked in v1.4 is untouched. This was explicitly not a feature release; the brief was "the current
website works, but it still looks like a startup website" — the goal was to make it read as a
premium institutional product without touching anything that already worked underneath.

Delivered in six sequential phases, each independently committed and verified, so nothing was
restyled twice and every commit is individually bisectable.

## Phase 1-2 — Tokens & Primitives

- Promoted three hardcoded color literals used 50+ times across component CSS into real tokens:
  `--color-border` (`#ECECEC`), `--color-tint` (`#FAFAFA`), plus `--color-red-hover`/
  `--color-red-active` (the button system's existing hover/active hex values). Same colors — a
  tokenization pass, not a color decision.
- Added `--shadow-media`/`--shadow-gallery` tokens, replacing two hand-rolled `rgba(11,11,11,x)`
  shadow values that were independently duplicated across `blocks.css` and `content-sections.css`.
- **Card consolidation:** six independently-named card classes (`.feature-card`,
  `.platform-flow__node`, `.principle-card`, `.module-card`, `.workflow-step`, `.preview-card`)
  shared byte-identical box treatment (padding/radius/background/border) duplicated across two
  files. Consolidated into one shared comma-grouped rule — zero markup/class-name changes.
- **Button system formalized:** tokenized hover/active colors, a subtle hover lift (`translateY`,
  reduced-motion aware) across all three variants, and real `.btn-outline--on-dark`/
  `.btn-secondary--on-dark` modifier classes replacing ad hoc per-container overrides that had
  drifted into three different, slightly-inconsistent copies across `blocks.css`,
  `face-the-nation.css`, and a fourth diverging copy in `observatory.css`. Fixed a real,
  pre-existing near-invisible-button bug in the process — Mission Control's "Talk to Our
  Government Team" button (black-on-black on a `.section--dark` band).

## Phase 3 — Shared Layout Components

Raised typographic confidence (a restrained `-0.01em` heading tracking sitewide) and section/
page-hero breathing room at desktop (`.section` padding 64px → 96px at ≥1024px, `.page-hero`
padding +32px, container gutter +24px at ≥1260px). Because this touches only shared classes
(`.section`, `.page-hero`, `.container`), **11 of 19 pages were uplifted with zero page-specific
edits**: Insights, News, Resources, all four legal pages, Sitemap, Accessibility, 404, and Mission
Control Demo.

## Phase 4 — Global Chrome (Nav + Footer)

- Reconciled three inconsistent logo sizes (32px header / 34px footer / an unused 28px utility)
  into one deliberate hierarchy: 36px header, 40px footer.
- Bolder nav-item type (600 → 700 weight), a larger 44px mobile-toggle touch target with a real
  hover state, more institutional footer spacing (desktop top padding, larger 40px social icons
  with a red-on-dark hover accent).
- **Caught and fixed a real bug this same phase introduced:** enlarging the mobile-nav toggle
  changed the header's actual rendered height (65px → 77px on mobile/tablet where the toggle is
  visible, 65px → 69px on desktop where it's hidden). Four different sticky-offset consumers across
  three files (`.mobile-nav`, `.mc-tablist`, `.category-jump`, `.editorial-split__statement`) had
  the old value hardcoded — found and corrected all four in the same commit. Also discovered this
  65px figure was already slightly inaccurate on mobile *before* this pass (a pre-existing, minor,
  non-blocking imprecision), not a regression introduced here.
- Deliberately reverted an originally-planned ≥1260px header vertical-padding increase once it
  became clear it would create a third header-height tier for those same sticky consumers to
  track — not worth the added fragility for a marginal spacing gain.

## Phase 5 — Bespoke Pages (ascending risk order)

1. **About** — two small interaction touches (hover lift on `.ecosystem__node`, indent-on-hover on
   the page index) for consistency with the rest of the system; otherwise fully covered by Phases
   1-4.
2. **Contact** — hover feedback on form fields, brand-consistent red-tinted hover on the "Follow
   Us" social icons. The 9 cross-linked category-card ids were left untouched (style only) and
   re-verified resolving correctly from every page that links into them.
3. **Applications** — added a real `.module-card__status--beta` variant (outlined, not filled) so
   "Public Beta" reads as its own distinct status rather than a same-looking restatement of "Live."
4. **Community Connect** — larger phone mockups (92px → 104px) and a real hover lift + shadow on
   the screenshot gallery, for an App-Store-feature-page feel. Fixed a hover-state gap the Phase 2
   card consolidation had introduced: the new `.module-card` hover lift wasn't reset on
   `.module-card--unavailable` (the non-interactive "Coming Soon" tiles), so those cards would have
   incorrectly shown an interactive lift.
5. **Mission Control** — converted "Executive Operations Centre" to `.section--dark`, pairing with
   the already-dark "Platform Security" section for the government/analytical feel the brief asked
   for — reusing dark-section infrastructure that content-sections.css/blocks.css already had ready
   (built during an earlier pass) rather than inventing anything new. Deliberately left the
   Capabilities module-card grid light — `.module-card` has no on-dark variant, and inventing one
   wasn't worth the risk for this page.
6. **Face the Nation** — put the approved circular badge logo to real use for the first time (it
   was extracted from the asset library in the original v1.4 pass but never placed in markup); hero
   min-height grows to 760px at desktop for more cinematic scale; hover lift on the social-platform
   cards.
7. **Homepage** — per the confirmed direction (no new photography — elevate the existing
   typography + hand-drawn motif treatment), raised the hero type-scale ceiling (5.5rem → 6rem) and
   re-tuned its fluid `clamp()` curve so it actually approaches maximum size at ordinary desktop
   widths (~1440px+) instead of only ultra-wide (~1813px+) as before.
8. **Observatory** — done last and deliberately conservative, given this page's large bespoke CSS
   footprint and ~15+ JS mount points. One change: hero-clock widgets get a border + shadow-md
   matching the existing `.live-status` card, for more "financial terminal" depth. **Did not touch**
   the founder-reserved, still-unresolved trend-up indicator color.

## Phase 6 — Final Sweep

- Confirmed zero remaining hardcoded `#ECECEC`/`#FAFAFA`/`rgba(11,11,11,x)` shadow literals outside
  their token definitions (two `rgba(11,11,11,x)` gradient/backdrop uses in
  `face-the-nation.css`/`trust-card.css` are compositing overlays, not card shadows — correctly
  left as literal values).
- Full regression pass: **all 19 pages + `404.html` (20 total) × 5 documented breakpoints
  (375/768/1024/1260/1820px) — zero console errors, zero horizontal overflow.**
- **Id-integrity diff**: every `id="..."` attribute across all 19 HTML files, extracted before
  Phase 1 and after Phase 6 — **byte-identical, zero additions/removals/renames.**
- **Header/footer byte-diff**: still exactly one unique hash each across all 20 files (confirmed
  Phase 4's hand-sync held) — and that hash is **identical to the pre-redesign baseline**, meaning
  every nav/footer visual change this pass was pure CSS, with zero header/footer markup edits
  required.
- **Mobile nav functional check**: toggle opens correctly, zero gap against the corrected header
  height.
- **Known 1024px nav-wrap limitation** (documented in `RELEASE_NOTES_v1.4.md`): re-tested, still
  wraps exactly as before — not worsened by this pass's nav-weight increases.
- **Observatory runtime check** (not just static HTML review, since this page's real content only
  exists after JS renders it): indicator wall, today-panel, what-changed, ad-packages-grid,
  category-jump, and all hero clocks confirmed populated with real live values after every change.
- Contact's 9 category-card cross-links re-verified resolving from every page that references them.

## Explicitly Out of Scope

- **Success-green color** — still founder-reserved and unresolved (two conflicting hex values in
  the source asset library). Not touched anywhere, including Observatory's known WCAG-failing
  trend-up indicator.
- **Homepage hero photography** — no approved platform-level (as opposed to product-scoped)
  photography exists in the asset library; confirmed with the founder before starting this pass
  that the typography + motif treatment should be elevated rather than any photography introduced.

## Known Limitations Carried Forward / Follow-ups

1. **1024px nav wrap** — unchanged from v1.4, still a density issue at exactly that width, not a
   functional break. Flagged again for a dedicated pass if desired.
2. **Logo asset-file swap** — the header/footer logos are inline `<svg>` markup, kept that way this
   pass (lowest risk for a visual-only release). The two already-extracted-but-unused
   `assets/logos/logo-ftn-platform-primary-{light,dark}.svg` files could replace the inline SVG in
   a future pass to reduce the 20-file hand-sync burden — not executed here since it's a structural
   change beyond what a visual-only pass needs.
3. **No `html-validate`/`stylelint` config exists in this repo** (confirmed — no `package.json` or
   linter config present). Verification for this pass relied on Playwright-driven runtime checks
   (console errors, overflow, JS-hook survival, id-integrity diffing) rather than static linting.

## Reference Documents

- `CLAUDE.md` (repository charter — brand tokens, folder standards)
- `VERSION.md` — canonical version/tag/commit record
- `GOVERNANCE/FTN_Platform_Website_v1.5.0-rc1_Design_Release_Report.md` — before/after evidence,
  full design-decision log, remaining visual opportunities, recommendations for Version 1.5 Final
