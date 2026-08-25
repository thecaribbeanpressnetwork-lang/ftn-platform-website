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

### FTN Live revived as canonical umbrella; FTN Display consolidated into FTN Screen — **Active** (2026-08-24, BUILD NOW)

**Supersedes** a 2026-08-23 "Ecosystem Simplification pass" that had retired both "FTN Live" and
"FTN Now" as independent identities (never itself recorded here as its own entry — only in
`js/product-registry-data.js` and `js/nav.js` code comments, and in products.md's "Superseded
naming" section, both now updated). That pass's outcome renamed the `ftn-live` registry product to
"FTN Observer" and moved the ambient/glanceable role to a separate "FTN Display" product.

**Current, binding decision:** FTN Live is the canonical registry product and public umbrella
again. FTN NOW is its default current-information view. Observer Console is its advanced interface
— not a competing product, no separate registry entry. FTN Display is consolidated into FTN Screen
as Display Mode (`parentProduct:'screen'` on the `display` registry entry, the same pattern `tv`
already used under `screen`).

**Explicitly preserved through this migration, not treated as up for grabs:** every existing public
URL (`/observatory/`, `/display/`, `/live/`, `/now/` all still resolve — the last two via
`_redirects`, retargeted rather than removed), all service-worker private-route/offline behavior,
and existing analytics event history (routes unchanged, so analytics continuity holds).

Full record, including the current-state duplication map, registry schema, and the
Live/Observer/NOW/Display/Screen responsibility matrix this decision resolves:
`GOVERNANCE/FTN_Phase3_Product_Registry_and_Live_Consolidation_2026-08-24.md`. Implementation and
test detail: the repair ledger's Phase 3 entry.

**If a future session finds code or copy that still says "FTN Observer" as the canonical product
name, or "FTN Display" as an independent top-level product:** that is stale content this migration
missed, not a reason to revert this decision — fix the stale reference to match this entry, don't
restore the old naming.

### Primary navigation restored to the 11-item approved structure, made registry-driven — **Active** (2026-08-24, BUILD NOW)

**Supersedes** the "Founder Walkthrough Repair Pass" note that had cut `js/nav.js`'s `PRIMARY_NAV`
from 11 items to 5 (FTN Platform, FTN Community Connect, FTN Display, FTN Live, FTN Directory) plus
the Ecosystem trigger, because the wider list wrapped the header actions cluster at wide viewports
or shrank nav text to an unreadable 11px. That regression was root-caused and fixed this pass (see
below), not reintroduced by ignoring it.

**Current, binding decision:** the primary nav is the founder-approved 11-item structure — FTN
Platform, FTN Community Connect, FTN Live, FTN Parliament, FTN TV, FTN Kaiso, FTN Riddim, FTN
Invest-in, FTN Directory, About FTN, Contact. FTN Display is deliberately **not** in this list (it
is a capability of FTN Screen, not an independent nav entry — consistent with the FTN Live/Display
decision above).

**Ownership, so a future session edits the right file:** `data/nav-config.mjs` is the one ordered,
curated source (which entries, in what order) — it is not exhaustive of every product on purpose,
same reasoning as `data/footer-config.mjs`. Each entry resolves against
`js/product-registry-data.js`'s `navPlacement.primary` flag (real products) or is a literal (the
three non-product structural entries). `scripts/sync-nav.mjs` generates: `js/nav.js`'s own
`PRIMARY_NAV` literal (kept a synchronous JS array on purpose — the primary row renders on first
paint with no registry fetch, so only the *authoring* is registry-driven, never the runtime), and
the static/no-JS `<ul class="site-nav__list">` / `<div class="mobile-nav__links">` regions on all
42 standard-header pages. `tests/nav-registry-audit.mjs` fails CI if any of these three drift apart
or from each other.

**The overflow regression the prior pass was actually fixing was real and was re-verified, not
dismissed:** restoring 11 items reintroduced genuine horizontal overflow at 1240-1600px viewports
that briefly, during this pass's own testing, squeezed the header actions cluster (search/sign-in/
menu toggle) to a literal 0×0 box — worse than the "microscopic text" the prior pass described.
Root cause: flexbox's default shrink distribution let `.site-nav` absorb none of the deficit while
its siblings absorbed all of it. Fixed with `flex-shrink:0` on `.site-header__logo` /
`.site-header__actions` (pinned to their content size, never shrink) and `.site-nav__list` as its
own `min-width:0; overflow-x:auto` flex item (the primary list becomes a horizontal scroll strip
under pressure, not a second header row and not a control that silently disappears). The FTN
Ecosystem trigger sits outside that scrollable list specifically so its mega-dropdown is never
clipped (`overflow-x:auto` forces `overflow-y:auto` too, per the CSS spec). See
`css/components/nav.css` and `js/nav.js`'s own comments for the implementation; the repair ledger's
Phase 3 nav-consolidation entry for the full before/after verification.

**If a future session finds header overflow at 1240-1600px again:** that means the CSS above
regressed, not that the item count needs cutting again — fix the CSS, don't re-litigate the list.

### Phase 4A — ibis source/provider routing consolidation — **Active** (2026-08-25)

Founder-authorized, scoped explicitly to internal ibis routing/provenance — not the Trust Card,
Trust Centre or any public evidence-presentation UI (that stays a separate, undecided Phase 4B).
Full inventory, gap map and implementation record: `IBIS-MAP.md`'s "Phase 4A" section (inserted
before that document's own now-superseded §4/§9, which are marked in place, not deleted).

**Binding going forward:** `js/ibis-ai-workspace.js`'s `serverAI()` must keep checking
`FTN.IbisEligibility` before calling `supabase/functions/ibis-query` — this closed a real control-
bypass where the provider registry's `enabled` flag did not actually gate the main `/ibis-ai/`
page's chat path. `js/ibis-provenance.js` is now the one canonical internal provenance envelope;
a future caller building its own ad hoc provenance shape instead of using
`FTN.IbisProvenance.build()` is reintroducing the exact duplication this pass closed.

**Update (2026-08-25): Phase 4B decided and implemented.** The founder decided the open Phase 4B
question the same day: surface ibis provenance selectively through the existing Trust Card (never
a competing component), never a large card under casual/creative responses, defer
`ftn-fire-local-procedural` reconciliation to a future FTN Riddim/Fire pass, and remove the public
VIDEO_GENERATION UI control since no provider is currently enabled (implementation preserved
privately, not deleted). Full record: `IBIS-MAP.md`'s "Phase 4B" section.

**Binding going forward:** `js/ibis-evidence.js` is the one canonical evidence-decision-matrix and
provenance-to-Trust-Card mapper — a future caller adding its own ad hoc "should I show evidence"
logic or its own field-mapping is reintroducing the exact duplication this pass closed. The VIDEO
mode tab in `js/ibis-creative-studio.js` must stay absent from the public tablist until a real
`VIDEO_GENERATION` provider is genuinely `enabled:true` in the registry — re-adding the tab without
that is reintroducing the "advertises an unavailable capability" defect this pass fixed.

### Service-worker route policy made registry-driven, explicitly not a security boundary — **Active** (2026-08-24, BUILD NOW)

**Current, binding decision:** `service-worker.js`'s `PRIVATE`/`NEVER` route-exclusion regexes are
generated, not hand-maintained, from two sources: `js/product-registry-data.js`'s own
`publicVisibility`/`status`/`authRequirement` fields (for registered products — `account`,
`ibis-ai`, `love`, `health`, `mission-control`), and `data/route-policy.mjs` (for non-product
routes that were never candidates for a Product Registry entry — `god-mode` has no
primaryJourney/dataSources/etc by design; `/community-connect/app` is the mount point for the
separate Community Connect application this repo does not own or modify; `/auth` and `/api` are
infrastructure, not products). `scripts/sync-service-worker.mjs` resolves both and writes the
literal regexes into `service-worker.js` between `FTN:SW-POLICY:START/END` markers.
`tests/service-worker-policy-audit.mjs` fails CI if they drift.

**Every existing exclusion was preserved** — `god-mode` moved from the `PRIVATE` regex to `NEVER`
(it was never a registered product, so it belongs in the non-product source now), which changes
nothing observable since both regexes are checked identically in the fetch handler. No route was
removed; classification of all nine original entries is recorded in the repair ledger.

**A real classification bug was caught while building this, not shipped:** the first cut of the
registry-derived filter treated any `authRequirement !== 'guest'` as cache-unsafe, which would have
incorrectly swept FTN Display (`authRequirement:'none'` — fully public, no account at all, *more*
open than `'guest'`, not less) into the private-cache exclusion. Fixed with an explicit allowlist
(`CACHE_UNSAFE_AUTH_REQUIREMENTS = ['mixed','authenticated','private']`) instead of a blocklist of
just `'guest'`, and a permanent regression test (`tests/service-worker-policy-audit.mjs`) asserting
`display` is never excluded.

**Explicitly and permanently documented, not a one-time note:** this is a caching policy, not an
authorization boundary. See `.claude/context/security-ops.md`'s new "Service worker & caching"
section and `service-worker.js`'s own top comment. Supabase RLS policies remain unverified from
this repo (no authenticated Supabase MCP access) — this consolidation does not claim to prove or
improve server-side authorization, only to keep the cache-exclusion list itself accurate and
generated rather than hand-drifted.

**If a future session is tempted to treat a route's presence in `PRIVATE`/`NEVER` as proof it is
protected:** it is not — check the actual server-side authorization (Supabase RLS/RPC/Edge
Function) for that route instead.

### FTN Statistics: cite-and-link, don't redistribute, for CSO/TTPS crime data — **Active** (2026-08-25)

**Decision:** neither the Central Statistical Office (`cso.gov.tt`, blocked from this environment by
Cloudflare WAF — confirmed `403` via two independent access methods) nor the Trinidad and Tobago
Police Service (`ttps.gov.tt`, accessible, no published terms of use — footer link is a dead `#`
anchor) publishes an unambiguous machine-readable reuse license for their crime statistics. Rather
than escalate and block the phase, the following bounded position was taken, reasoned from FTN
Govern/Parliament's already-approved "independent gateway, source clearly attributed, never claims
ownership" pattern: FTN **cites and displays** real published figures with prominent attribution, a
direct source link, and a visible publication/retrieval date (citing published facts with
attribution is standard, lawful civic-journalism practice — facts are not copyrightable); FTN does
**not** bulk-redistribute, host, or resell the underlying raw dataset files.

**Why this is recorded as a decision, not just an implementation note:** the licensing ambiguity is
real and unresolved, not fully cleared. If CSO access is ever restored, its actual terms-of-use text
should be read in full and this position re-confirmed or revised — until then, this is the standing
rule for any FTN Statistics indicator sourced from these two publishers. Full reasoning, the
specific access attempts made, and the cross-validation performed on the resulting figures:
`GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md`.

**How to apply:** a future session extending FTN Statistics to a new CSO/TTPS-sourced indicator
should follow the same pattern (attribution + direct link, no dataset-file redistribution) rather
than re-deciding this per indicator — and should update the source map, not just the code, if the
licensing picture changes.

---

## Still-open conflicts (do not silently resolve)

1. **Success green:** `#22C55E` (AEB-01) vs `#16A34A` (AEB-06/AEB-13) — unresolved, causes one
   known WCAG contrast failure. Ask before touching.
2. Whatever governance content exists in the 2026-08-10 GOVERNANCE "Master Build" files for the
   v2.x rebuild has not been cross-checked against this register for new founder decisions made in
   that era — if you find one there, add it here rather than letting it live only in that file.
