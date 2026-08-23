# Founder Decision Register

Every explicit "Founder Decision" recorded in the pre-2026-08-23 CLAUDE.md, reproduced with its
current status. **Active** = still binding as written. **Superseded** = replaced by a later,
explicitly-recorded decision (the superseding decision is linked). Do not re-litigate a Superseded
entry as if it were still open — it's kept only so the reasoning isn't lost.

Governed above all of these by `GOVERNANCE/FTN_Platform_Constitution_v1.0.md` where the two
overlap (RC3, §7.7 of release-history.md).

---

### Brand color & typography — **Active** (2026-07-11)

- **Primary Brand Colour: FTN Red `#E10613`.** Permanent platform identity, not website-scoped.
- **Primary Typography: Montserrat (headings) + Inter (body).** Same status — permanent.
- **Primary Visual Direction:** "dark-first institutional interface with restrained motion,
  disciplined spacing, high contrast and professional presentation" describes the **FTN Platform
  ecosystem's operational surfaces** (Mission Control, Observatory-class consoles, analytics/ops
  dashboards) — not the public website. The public website stays **light-first**, using dark
  sections deliberately for rhythm and product showcases. "The website represents the public
  entrance. Mission Control represents the operational control room. Do not collapse those
  identities into one" — founder's words, verbatim.
- Superseded a 2026-07-10 record that treated red/typography as still-open website-scoped
  questions — that record is retained in release-history.md §5 for context only.
- **Still open, not addressed by this decision:** success green has two candidate hexes
  (`#22C55E` vs `#16A34A`) across the source asset boards. Do not silently pick one. This is the
  direct cause of one still-outstanding WCAG AA contrast gap
  (`indicator-card__change--up` / `mc-kpi-card__trend--up`, 3.29:1 against white, needs 4.5:1) —
  raise with the founder before touching it.

### Light-first mandate — **Active, with a bounded exception** (2026-07-11, extended 2026-07-13)

- Public website pages are light-first by default (black/white/FTN-red, disciplined dark bands for
  rhythm) — this is permanent, not a placeholder pending a full dark redesign.
- **Extended 2026-07-13:** the homepage and the ecosystem product pages approved in the same pass
  (see "Nine new ecosystem products" below) are a deliberate, founder-authorized dark "Ecosystem
  Board" treatment — an extension of the same bounded-dark precedent already used by
  Observatory/Mission-Control-demo/Face-the-Nation, not a reversal of the light-first default. Every
  other page (About, Contact, legal, Resources, Community Connect's own page, etc.) stays
  light-first.
- Cross-check against current-state.md: Mission Control's public marketing page is gone in the
  live registry (`mission-control` is now `PRIVATE`/`publicVisibility:false`) — its own dark
  operations-centre treatment is no longer a *public* surface at all, which doesn't contradict this
  decision but is worth knowing before assuming Mission Control still has public marketing content.

### Investor-facing content — **Active, relaxed once, then reconciled current-compliant** (2026-07-11 → 2026-07-13 → 2026-08-23 reconciliation)

- **Core rule, still binding:** no investment material, projections, financial claims, or
  fundraising language anywhere on the public website.
- **2026-07-13 relaxation:** the blanket ban on even having an "Investors" nav destination was
  lifted — nav may point to a page that already satisfies the no-fundraising-language rule.
- **2026-08-23 reconciliation finding:** the live site now has a full dedicated `/invest/` product
  ("FTN Invest-in") rather than just a Contact-page category. Verified via
  `js/product-registry-data.js`: it carries explicit `legalNotices` — `'No public investment
  solicitation'`, `'No financial advice'`, `'No trades or custody'` — and frames itself as a
  partnership/sponsorship conversation plus a directory of official third-party financial sources.
  This is consistent with, not a violation of, the core rule. See current-state.md for detail.

### Face the Nation in navigation — **Superseded** (2026-07-11 → 2026-07-12)

- Original: Face the Nation stays out of nav/footer/404 until it's a real, live product.
- Superseded 2026-07-12: it *is* a real, live product (production season in progress, approved
  brand assets) — fully integrated into nav, footer, and the product hub. The underlying
  principle (no nav entry for a not-yet-real product) still governs other not-yet-live products.

### CLAUDE.md's own scope — **Active; this is the decision that authorized the 2026-08-23 restructuring**

- Original (2026-07-11): CLAUDE.md "must not become the permanent repository for every founder
  decision... this is recorded as a Website v1.1 objective... not yet executed. Until it's
  greenlit, keep using CLAUDE.md as today's working charter."
- **Activated 2026-08-23:** the founder explicitly authorized executing this deferred objective in
  this session, after two rounds of confirmation (the first pass of "authorization" text arrived
  through an anomalous, injected-looking channel and was correctly refused pending direct
  confirmation — see the session record if that needs re-establishing). The explicit, plainly-worded
  authorization: restructure CLAUDE.md into a smaller always-loaded core plus `.claude/context/`
  files; do not invent unrecorded concepts (a "Quuux" system was explicitly named as **not** to be
  invented, since it doesn't exist in the codebase or governance record — it's a design idea under
  discussion, not built); reconcile stale implementation claims against real repository evidence
  rather than preserving them; preserve all binding founder/governance decisions; do not modify
  runtime/application code.

### Community Connect distribution — **Active** (2026-08-22)

- Primary distribution is the web/PWA experience at `community.ftnplatform.org`, not an app-store
  listing. A visitor must always be able to use Community Connect from a link/QR code with no store
  visit, no install, no account required first. The existing native/Capacitor path remains
  available but must never become a prerequisite.
- Binding for future work: any shared Community Connect object must deep-link into the web/PWA
  experience directly; sharing UI should prioritize WhatsApp and Facebook; "Install"/Add-to-Home-
  Screen is a retention mechanism offered after value is shown, never a barrier before first use;
  reuse `js/ftn-save.js` for any future save/bookmark capability rather than building a second one.
- The eventual single shared "FTN Share" primitive this decision anticipates did not exist as of
  2026-08-22 (built later — see intelligence.md for its current state, `js/ftn-share.js`).

### Nine ecosystem products approved — **Active, superseded in detail by the real registry**

- 2026-07-13: FTN Events, ibis.ai, FTN Riddim, FTN Kaiso, FTN Radio, FTN Screen, FTN Opportunities,
  FTN Love, Display Network were approved as real, first-class pages/names/accent colors — a
  scoped exception to the then-standing "no new products without a board" rule. A prior blanket "do
  not build these four" note (ibis.ai/Riddim/Kaiso/Love) from one pass earlier was explicitly
  overridden by this founder brief.
- **The product *names, routes and exact shape* have since evolved further** (ibis.ai rebranded to
  "FTN ibis"; Riddim grew child capabilities `ftn-fire`/`dj-tube`/`daw`/`epk`; several more products
  were added beyond this original nine — Govern, Parliament, Scenario Workspace, Display, Learn,
  Account, Trust Centre, Invest, Top Picks, and more). Treat this decision as the historical
  authorization for "new products are allowed to exist," and current-state.md / products.md as the
  live shape.

### Architectural exception to vanilla-only mandate — **Active** (Sprint 0, recorded pre-2026-08-19)

A hand-run, output-committed Node generator script is permitted when: it produces static committed
output, introduces no runtime dependency, requires no production build step, and its output is
committed to the repo. This is the one narrow exception to the vanilla HTML/CSS/JS mandate — do
not read it as opening the door to a general build-tooling introduction without asking first.

---

## Still-open conflicts (do not silently resolve)

1. **Success green:** `#22C55E` (AEB-01) vs `#16A34A` (AEB-06/AEB-13) — unresolved, causes one
   known WCAG contrast failure. Ask before touching.
2. Whatever governance content exists in the 2026-08-10 GOVERNANCE "Master Build" files for the
   v2.x rebuild has not been cross-checked against this register for new founder decisions made in
   that era — if you find one there, add it here rather than letting it live only in that file.
