# FTN Platform Website — Version 1.8.0 Engineering Release Report

**Program:** Ecosystem Completion Pass (Founder Build)
**Date:** 2026-07-13
**Built on:** v1.7.1 (live in production)
**Commits this pass:** 4
**Regression:** 140/140 checks pass (28 pages × 5 breakpoints); axe-core WCAG 2.2 AA clean across
all 26 content pages

This report documents the "FTN PLATFORM v1.8.0 — Ecosystem Completion Pass" brief and how it was
executed. See `CLAUDE.md` §7.15 for the standing architectural record and `FOUNDER_REVIEW_v1.8.0/`
for the full before/after screenshot gallery.

## 1. Authorization record

This brief explicitly superseded several standing decisions recorded earlier in the same session
(the "no new products yet" rule, the permanent light-first design mandate, the investor-content
ban). Before executing anything, this was flagged and checked directly with the founder for two
reasons: (1) a near-identical "ecosystem" architecture document had been pasted into this same
engineering conversation by mistake one turn earlier and explicitly retracted, and this brief used
very similar language and product names; (2) reversing multiple standing, explicit rules without
confirmation would risk building something the founder didn't actually intend. The founder
confirmed directly: this is a deliberate override, not the earlier mix-up, with each superseded
rule listed explicitly. Two further blocking questions (FTN Live/Observatory's fate; the meaning
of the reference board's "Sign In" button) were resolved before any code was written. Full detail
in `CLAUDE.md` §7.15.

## 2. Homepage rebuild

The homepage is now the "FTN Platform Ecosystem Board": a dark hero ("One Ecosystem. One Mission.")
followed by a 12-card interactive product grid, each card:

- Fully clickable (the entire card is one `<a>`, not just a button inside it)
- Carries its own locked accent color via a `--card-accent` CSS custom property
- Hover: brighter border, slight lift, subtle shadow
- Press (`:active`): ~150ms scale to 98%, tightened shadow
- All motion gated behind `@media (prefers-reduced-motion: no-preference)` — verified via a
  Playwright `reducedMotion: 'reduce'` context that hover produces zero transform change

Community Connect and Face the Nation cards use their existing real, approved assets (the icon
mark extracted in v1.6, the approved badge photo) rather than new artwork. The other ten cards use
a small colored badge (the same "FTN" monogram treatment as the site's primary logo, recolored per
product) plus a simple line-icon — no fabricated photography.

A bottom "principles" strip (Built in the Caribbean · Powered by Intelligence · Driven by People ·
Focused on Impact · Designed for the Future) reuses existing icon assets already in the repo.

## 3. Nine new product pages

FTN Events, ibis.ai, FTN Riddim, FTN Kaiso, FTN Radio, FTN Screen, FTN Opportunities, FTN Love, and
Display Network each got a real, first-class page at a clean URL (`/events/`, `/ibis-ai/`, etc.),
built from one shared template (`css/components/product-page.css`) rather than eight-plus bespoke
layouts: a dark hero with the product's tagline and description, a "what this will do" section
with three feature cards, and a closing CTA.

**Content honesty**: every page is labeled "In Development" (Display Network: "Long-Term
Initiative," matching its pre-existing framing from v1.6). No fabricated screenshots, functionality
claims, or metrics — copy describes what each product is *being built to do*, grounded in the
brief's own stated capabilities, not what it currently does.

**Photography**: no photoreal imagery was generated for any of the nine pages. Each uses its accent
color plus a simple technical-diagram heritage-layer motif (a waveform for Riddim/Radio, a reel/
frame mark for Screen, a calendar for Events, connection nodes for ibis.ai/Love, editorial column
rules for Kaiso, a growth line for Opportunities, a signage frame for Display Network) — extending
the site's existing bathymetry/compass/radar heritage-layer vocabulary rather than attempting
AI-generated people or scenes, per the standing "no AI-generated people, ever" rule and this
brief's own "avoid obvious AI artifacts" instruction.

## 4. Logo corrections

None required — the v1.7.0 red-T wordmark correction already applies to every new page (the header/
footer are shared markup).

## 5. Typography & layout improvements

- One shared dark product-page template, not per-page one-offs, keeps typography, spacing, and
  button treatment consistent across all nine new pages.
- Homepage hero uses the existing fluid hero-scale type token; the card grid uses a standard
  responsive `auto-fill`-style breakpoint scale (1/2/3/4 columns).

## 6. Animation improvements

- Card hover lift, border-brighten, and press/scale interaction (homepage).
- All new motion respects `prefers-reduced-motion`, consistent with every other animation on the
  site.

## 7. Accessibility improvements — real defects found and fixed before shipping

An axe-core WCAG 2.2 AA sweep across all 26 content pages (run before any push) found that three
of the ten new product accent colors — ibis.ai (purple), Kaiso (deep blue), Love (magenta) — clear
the WCAG **large-text** 3:1 contrast threshold against `--color-black` (used correctly for
headings, borders, and buttons) but fall short of the **4.5:1** threshold required for small text,
where they were also being used for each page's small caption-scale "eyebrow" labels and status
badge.

**Fix**: three new lightened tokens (`--color-ibis-on-dark`, `--color-kaiso-on-dark`,
`--color-love-on-dark`), each individually contrast-verified (4.95:1, 5.09:1, 5.10:1 respectively
against black), applied via a new `--product-accent-small` custom property used specifically by
`.product-hero__eyebrow`, `.product-section__eyebrow`, and `.product-status` — while the base
accent color continues to be used for large text, borders, and buttons where it already clears the
correct threshold. Re-verified via axe-core after the fix: 0 violations across all 26 pages,
including these three.

This is the same "verify computed contrast, don't assume large-text-safe means small-text-safe"
discipline already established in prior passes this session — caught during this pass's own
verification step, not discovered after shipping.

## 8. Navigation & footer overhaul

- Top nav simplified sitewide: Home / About FTN / News / Partners / Investors / Contact + Sign In,
  replacing the old 10-item mega-menu. The homepage's own 12-card grid now serves the product-
  discovery role the old "Platforms" dropdown and per-product nav entries used to.
- "Investors" and "Partners" route to Contact's pre-existing `#investors` and `#commercial`
  categories — no new content invented, and Investors' existing copy already satisfies the
  standing no-fundraising-language rule.
- "Sign In" replaces the old "Launch App" button, routing to Community Connect's real launch flow
  (verified working end-to-end: `/community-connect/#launch` → `https://community.ftnplatform.org`)
  since that's the only FTN product with real user accounts today. Carries a `data-sign-in-entry`
  hook and an inline comment marking it as the future unified FTN Account/SSO integration point.
- Footer's Platform column now lists all 12 ecosystem products plus FTN Live/Observatory — kept
  fully live and linked, per explicit founder confirmation, with equal visual weight to any other
  product link (not demoted). Insights and News & Stories, no longer in the top nav, moved to the
  footer's Resources column. Nothing reachable before this pass became unreachable.

## 9. Existing product reconciliation

- **Community Connect**: unchanged; Launch App flow re-verified end-to-end after the nav/footer
  changes.
- **Mission Control**: unchanged; still reachable via homepage card and footer.
- **Face the Nation**: unchanged beyond its homepage card now using the approved badge photo;
  "refine, don't redesign" per its own already-locked identity.
- **Display Network**: promoted from a paragraph inside Applications' "Long-Term Initiatives"
  section to its own first-class page; the Applications page now links to it instead of duplicating
  its copy inline.

## 10. Verification summary

- **140/140 regression checks** (28 pages × 5 breakpoints: console errors, overflow, broken images,
  exact nav-link count of 6, exact footer-link count of 24) — before and after the contrast fix.
- **axe-core WCAG 2.2 AA sweep**, 26 content pages, run three times (baseline — found 3 violation
  types; post-fix local; the results above are the final clean state).
- **Every homepage card verified** to link to a real, existing page (12/12 destination files
  confirmed present on disk).
- **Community Connect's Launch App flow verified end-to-end**, both from its own page and from the
  new sitewide "Sign In" button.
- **Reduced-motion verified**: card hover produces zero `transform` change under
  `prefers-reduced-motion: reduce`.

## 11. Remaining recommendations

1. **Real photography and functionality** for the nine new "In Development" products will be
   needed as each moves toward launch — this pass deliberately shipped honest positioning pages,
   not functional products.
2. **Success-green color** remains founder-reserved and untouched — the two new "green" product
   accents (Riddim, Display Network) are deliberately distinct from both disputed hexes but don't
   resolve that separate, still-open conflict.
3. **`data-sign-in-entry`** is a real integration point, not just a comment — when a unified FTN
   Account/SSO service exists, this is the one attribute to search for across the codebase.
4. **The old `/applications/` Platforms hub page** still exists (kept for backward-compatible
   links/SEO, referenced from the footer as "All Platforms") but is now largely redundant with the
   homepage's own product grid — worth a founder decision on whether to keep, redirect, or
   repurpose it in a future pass.

## Architecture Recommendations (Not Implemented)

None arose during this pass that weren't already explicitly authorized by the founder's own brief
— this was itself the architecture-level decision (new products, new visual direction), executed
at the engineering level once confirmed.
