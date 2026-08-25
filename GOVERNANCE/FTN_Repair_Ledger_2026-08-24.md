# FTN Platform — Repair Ledger

Traceability ledger for `GOVERNANCE/FTN_Platform_Final_Audit_and_Repair_Decision_2026-08-24.md`,
maintained per that report's Phase 0 requirement. One row per accepted finding: what it is, where
it lives, what was actually done, how it was verified, and current status. Updated as each phase
lands — this is a living document, not a one-time snapshot.

## Session outcome (2026-08-24)

**Final pushed commit:** `6501210` — confirmed live via `curl https://ftnplatform.org/version.json`
(`"commit":"6501210e6eb6666e6b68a1ab8719e2b1ebbf2c7a"`, `"builtAt":"2026-08-24T18:49:55Z"`).
**Deploy path confirmed:** Cloudflare Pages (native GitHub integration) — `curl -I` on the live
domain matches this repo's `_headers` file verbatim, and the `Cloudflare Pages` GitHub check ran
and succeeded on every push this session. `VERSION.md` names only the GitHub Pages workflow as
production; both actually deploy in parallel. Worth reconciling in `current-state.md` separately.
**CI (`functional-release` gate):** all 61 `functional-release.mjs` scenarios plus
`foundation-release`, `founder-access-release`, `creative-studio-release`, `turnstile-release`,
`mobile-release`, `surface-system-release`, `all-public-routes`, `performance-budget`, and every
Node-only audit verified passing locally (system Chrome, since this environment's own
Playwright-managed Chromium download hung indefinitely — see "Known blockers" below). CI's own run
on the final commit read as succeeded (GitHub's unauthenticated API rate-limited mid-session,
so this is corroborated via direct production verification below rather than a live CI dashboard
read at the very end).
**Direct production verification performed** (not just "CI is green" — actually checked the live
site, per this repo's own release rule): `curl`-verified HSTS header present, `recorded-murders`
absent from `js/display-page.js`'s live `PULSE_IDS`, `referenceDate: null` present 4× in live
`indicators-data.js`, zero "for visual effect" occurrences live, ibis chat header is `<h2>` not
`<h1>` live, zero duplicated "Illustrative illustrative" live, Trust Card dialog `id` present live.

**Update — FTN Live compatibility migration (same day, later, commit `39b9cc2`):** founder approved
Option B ("phased compatibility migration") for the Phase 3 Live/Observer/NOW/Display decision
gate. Implemented, tested and verified live — see the dedicated Phase 3 ledger entry below for full
detail. Production confirmed at `39b9cc2` via `/version.json`
(`"builtAt":"2026-08-24T22:10:19Z"`), plus direct `curl` checks: `/live/` and `/now/` both 301 to
`/observatory/`, `/observatory/`'s `<title>` and hero eyebrow show FTN Live/Observer Console
branding, the registry's `ftn-live` entry is named `'FTN Live'` and `display` is named `'FTN
Screen — Display Mode'` with `parentProduct:'screen'`, `/display/` still returns 200 OK
(unbroken), and `js/nav.js`'s live `PRIMARY_NAV` shows the new `'FTN Live'` entry.

**Baseline at pass start:** production `/version.json` reported commit `3efc146` (built
2026-08-24T13:05:54Z). Local `main` was 16 commits behind origin and was fast-forwarded to match
before any edit — those 16 commits (crime-intelligence widget, Trust Card traceability work,
`/invest/` hero art, Directory nav change) are pre-existing work from this same day, not part of
this repair pass, and are preserved as-is except where a finding required touching the same files
(see FTN-FINAL-001).

## Phase 1 — Trust Engine emergency

| Finding | Product | Files | Root cause | Repair | Test | Status |
|---|---|---|---|---|---|---|
| FTN-FINAL-001 — stale murder statistic with false freshness confidence | FTN Observer, FTN Display | `js/indicators-data.js` (`recorded-murders`), `js/trust-card.js` (`trustScore`, `render`), `js/display-page.js` (`PULSE_IDS`), `js/crime-intelligence.js` (footer label) | TTPS's comparative-chart source page publishes no "as at" reference date (confirmed by direct fetch of the live page — no such date anywhere in its content). The indicator's `lastUpdated` field was hardcoded to FTN's own retrieval date, which `trustScore()` then read as if it were the statistic's freshness, and the crime-intelligence widget's footer literally read "Updated {date}" using that same retrieval date — both presenting FTN checking the page as if TTPS had updated the underlying number. Confirmed the exact reported symptom: with the pre-repair code this indicator scored 92/100, matching the audit's cited figure. | Introduced a `referenceDate` field distinct from `lastUpdated` (FTN's own retrieval/processing time). `recorded-murders` now sets `referenceDate: null` — explicit "checked, source publishes none." `trustScore()` applies a freshness *penalty* (-8) whenever `referenceDate` is explicitly `null`, regardless of how recent `lastUpdated` is; a real `referenceDate` string is scored on its own age instead of `lastUpdated`; indicators that don't set the field at all are unaffected (back-compatible). Trust Card now renders a distinct "Statistical reference date" row reading "Not published by the source — currency of this figure cannot be confirmed" when null. Removed `recorded-murders` from FTN Display's `PULSE_IDS` (the glanceable current-condition surface) per the audit's explicit "suppress from current-condition presentation" instruction; it remains visible, with the caveat, in FTN Observer's investigative context. Rewrote the indicator's `limitations` text to state plainly that FTN cannot confirm this total reflects the same period as other public reporting on the topic. Renamed the crime-intelligence widget's footer from "Updated {date}" to "FTN checked {date} — TTPS does not publish a reference date for this total, so currency cannot be confirmed." | `node --check` on all 4 edited files; full local `functional-release.mjs` (61/61) plus every other local suite; direct production `curl` verification (see "Session outcome" above). | Deployed and verified live in production (commit 6501210). |
| FTN-FINAL-002 — unsupported FTN Display debt animation | FTN Display, FTN Observer | `js/indicators-data.js` (`national-debt`, `debt-to-gdp`, `debt-per-citizen`) | All three indicators used `isLiveClock: true` with a `ratePerSecond` extrapolated from an assumed borrowing/growth rate with no official reference date — `national-debt`'s own methodology text admitted this ("for visual effect"), which is also one of the audit's explicitly prohibited public phrases and was live in the Trust Card. | Removed `isLiveClock`/`clock` entirely from all three (not just flipped to `false` — the ticking config no longer exists to be silently re-enabled). Rewrote each `methodology`/`limitations` to state plainly there is no official baseline, reference date or defensible formula, added `referenceDate: null`, and added an explicit `formula` field so Trust Card's "See the Math" shows an honest "no live formula applied" statement instead of the generic (and here false) "no transformation" default. Removed the "for visual effect" phrase — the only occurrence found in a repo-wide search. | `node --check`; grep confirms no remaining "for visual effect" occurrences; direct production `curl` verification confirms 0 occurrences live. `js/live-clocks.js` confirmed to no-op cleanly on indicators with `isLiveClock` unset (`if (!indicator || !indicator.isLiveClock) return;`). | Deployed and verified live in production (commit 6501210). |
| FTN-FINAL-003 — ibis cannot perform promised national research | FTN ibis.ai | `js/ibis-*.js` (authoritative-source registry, guest/signed-in routing) | Not yet investigated this pass. | Not started — this is Phase 4-scale work (source registry, guest/signed-in research boundaries, generation router) per the audit's own phasing, not a Phase 1 patch. | — | Open, scheduled for its own phase. |
| FTN-FINAL-004 — hidden keyboard focus in collapsed Ecosystem menu | Shared header | `js/nav.js` (or equivalent shared header component) | Not yet investigated this pass. | Not started. | — | Open, scheduled for Phase 2. |
| FTN-FINAL-005 — 200% zoom overflow (Home, FTN Observer, FTN Display) | Home, FTN Observer, FTN Display | TBD per-route | Not yet investigated this pass. | Not started. | — | Open, scheduled for Phase 2. |
| FTN-FINAL-006 — FTN Fire cannot complete its main journey | FTN Fire | `riddim/fire/` | Not yet investigated this pass. | Not started. | — | Open, scheduled for Phase 6. |
| FTN-FINAL-007 — contradictory indicator counts (82 / 1 / 6 / 42) | FTN Observer, FTN Display, FTN Scenario Workspace | Indicator Engine, Product Registry | Not yet investigated this pass — this is explicitly a FTN Statistics (Phase 5) architectural fix per the audit, not a countable Phase 1 patch. | Not started. | — | Open, scheduled for Phase 5. |

## Phase 2 — additional concrete findings resolved this pass

| Finding | Product | Files | Root cause | Repair | Test | Status |
|---|---|---|---|---|---|---|
| Missing HSTS | Sitewide | `_headers` | Production is served through Cloudflare (confirmed by direct `curl -I https://ftnplatform.org/` — `Server: cloudflare`, CF-RAY present, and every other header in the live response matches `_headers` verbatim), which reads this repo's root `_headers` file for response headers. No `Strict-Transport-Security` line existed. **Correction to `VERSION.md`**: that file names `.github/workflows/static-pages.yml` (GitHub Pages) as the production workflow, but the live response headers prove the actual serving path is Cloudflare (Pages or a Worker in front of it) reading `_headers` — worth reconciling in `current-state.md` in a later pass. | Added `Strict-Transport-Security: max-age=31536000; includeSubDomains` to the global `/*` block. Deliberately omitted `preload` — that requires a manual, hard-to-reverse submission to browsers' hardcoded preload list, which is outside this pass's "prefer reversible" instruction. | Verified the exact CSP/permissions-policy/frame-options text in `_headers` matches the live `curl -I` response character-for-character, confirming this file is really what's live. | Code complete, deployed, and verified live in production (commit 6501210). |
| Duplicate H1 on ibis (§6) | FTN ibis.ai | `js/workspace-shell.js` (unmodified — confirmed as the source of the page-level `<h1 class="workspace__title">`), `js/ibis-ai-workspace.js`, `css/components/ibis-ai.css` | Every product using the shared `WorkspaceShell.init()` gets one real `<h1>` from the shell itself (`product.tagline` by default). `ibis-ai-workspace.js`'s own `build()` callback additionally rendered a second `<h1>ibis</h1>` inside its chat header — two real H1s in one DOM, confirmed by reading both render paths (static `ibis-ai/index.html` itself carries zero `<h1>`; both come from JS). | Changed the inner chat-header heading from `<h1>` to `<h2>` (consistent with the existing `<h2>What do you need done?</h2>` welcome heading already on the same page) and moved its CSS rule from `.ibis-chat__header h1` to `.ibis-chat__header h2` so the visual style is unchanged. | Repo-wide grep confirmed this `WorkspaceShell` + component-own-`<h1>` collision pattern exists nowhere else — checked every other file containing a literal `<h1` (`top-picks.js`, `tv-guide.js`, `god-mode.js`, `export-framework.js`) against whether its host page also loads `workspace-shell.js`; none collide (`top-picks`/`tv` pages don't use the shell at all and each carries exactly one h1 in the DOM; `god-mode` is the private founder-only Nexus Command console, out of this audit's named scope). | Code complete, deployed, and verified live in production (commit 6501210). |
| Duplicated words in FTN Scenario Workspace (§6) | FTN Scenario Workspace | `scenario-workspace/index.html` | Literal text read "Illustrative illustrative scenario scenarios only — not real forecasts." — both a genuine duplication typo and, separately, the word "Illustrative" is one of the audit's explicitly prohibited public terms (founder decision, §2/§9). A repo-wide scan (all HTML files, visible-text-only, not raw source) confirmed this was the only duplicated-consecutive-word instance sitewide. | Rewrote to "These are calculated scenarios, not real forecasts. Outcomes come from simple, disclosed weights, not a predictive model." — same honest fact, no duplication, no prohibited term, no disclaimer-block wording added. | Node-scripted repo-wide scan for the duplicated-word pattern re-run after the fix: 0 remaining instances. | Code complete, deployed, and verified live in production (commit 6501210). |
| Geolocation denial falling back to `0,0` (Gemini finding, §5) | Community Connect | — | Investigated: no `navigator.geolocation`/`getCurrentPosition` call exists anywhere in this website repo. `community-connect/index.html` only embeds/links the actual Community Connect application (served from `community.ftnplatform.org`, a separate app/repo per CSP `frame-src`). | Not applicable to this repo — the real geolocation logic lives in the native Community Connect application, which this pass is explicitly barred from modifying without separate founder approval. | — | **Confirmed out of scope for this repository**, not silently dropped. |
| "FTN Mission Control's guest gate missing the shared FTN header" / "white visual band on the gate" (§6) | FTN Mission Control | `mission-control/index.html`, `mission-control/demo/index.html` | Investigated: both routes are now single-line instant `<meta http-equiv="refresh">` redirect stubs to `/scenario-workspace/` — there is no standalone "gate" page left to carry a missing header or a white band. This matches the audit's own §7 target architecture (Mission Control is authenticated-only; Scenario Workspace is the public surface) and `current-state.md`'s independent note that Mission Control already has "no public marketing page, no CTAs." | No change needed — the defect's precondition (a gate page) no longer exists. | Read both files directly; confirmed identical redirect-stub structure. | **Does not reproduce; resolved by prior architectural work, not this pass.** |

## Phase 2.5 — CI verification and root-cause fixes (surfaced by pushing, not guessed)

Pushing the Phase 1/2 commits above triggered a real `functional-release` CI failure. This
environment's own Playwright-managed Chromium download hung indefinitely mid-extraction (confirmed
stuck, not slow — near-zero CPU across the install processes for 15+ minutes; not touched further,
per instruction, rather than force-killed or blindly reinstalled). Diagnosed the real CI failure
locally instead by temporarily pointing the test suite at this machine's already-installed system
Chrome (`channel: 'chrome'`) — a local-only, uncommitted patch, reverted before every commit below.

To separate "caused by this pass" from "already broken," each candidate failure was reproduced (or
not) against an isolated `git worktree` checkout of `3efc146` — the exact commit that was already
live in production before this session touched anything.

| Finding | Files | Root cause | Repair | Status |
|---|---|---|---|---|
| Trust Card dialog never had a stable id | `js/trust-card.js` | `init()` creates the dialog with a class (`.trust-card-dialog`) but no `id`; confirmed via git history it never had one. | Added `dialog.id = 'trust-card-dialog'`. | Deployed and verified live. |
| `/observatory/` exceeded its own 30-stylesheet performance budget (31) | `css/components/crime-intelligence.css`, `css/components/crime-controls.css` (deleted), `observatory/index.html` | Reproduced identically against baseline `3efc146` — pre-existing, not caused by this pass. Same-day crime-intelligence widget work added two small, related stylesheets instead of one. | Merged `crime-controls.css` (33 lines) into `crime-intelligence.css`, dropped the extra `<link>`. Chose consolidation over raising the budget since the count was genuinely reducible. | Deployed and verified live; `/observatory/` back to 30. |
| Three stale/broken assertions in `tests/functional-release.mjs` | `tests/functional-release.mjs` | (1) `public-truth-language` demanded "modelled/illustrative" stay visible on `/observatory/` — reproduced as already-broken on baseline `3efc146`, and directly contradicted founder decision §2/§9 (this language belongs in the gated Trust Card) plus another assertion later in the same file. (2) `observer-public-trust-score-opens-evidence` used a case-sensitive "Trust Score" regex against a badge styled `text-transform:uppercase` — reproduced as already-broken on baseline. Also read a collapsed `<details>` element's content without clicking its `<summary>` open first (the sibling "See the Math" `<details>` two lines later does this correctly). (3) The same scenario hardcoded "6 KPI pulse-cards" — genuinely broken by this pass's own FTN-FINAL-001 fix (PULSE_IDS now has 5), not pre-existing. | (1) Removed the stale requirement, documented why. (2) Made the regex case-insensitive; added the missing `<summary>` click. (3) Updated 6→5, documented why; confirmed the overlap check itself (what the scenario actually guards) still passes with 5 cards. | Deployed and verified live. |

**Result:** all 61 `functional-release.mjs` scenarios pass, plus every other local suite this
session could run (see "Session outcome" above). One known non-blocking flake remains:
`tv-mobile` in `tests/visual-regression.mjs` read 10.4% pixel difference against an 8% budget —
that check is `continue-on-error: true` by the workflow's own explicit design (real-content timing
variance — weather, clock digits, satellite imagery — not a fixed-tolerance defect), so it does not
gate the release. Not investigated further this pass; flagged here rather than silently ignored.

## Phase 3 — Product Registry and FTN Live consolidation (started 2026-08-24)

Full analysis, schema proposal, responsibility matrix and decision gate live in
`GOVERNANCE/FTN_Phase3_Product_Registry_and_Live_Consolidation_2026-08-24.md` — not duplicated
here. Summary:

| Item | Status |
|---|---|
| VERSION.md deployment-path reconciliation (Cloudflare Pages confirmed, GitHub Pages parallel) | Deployed and verified live (commit `cc64fc3`). |
| Current-state duplication map (6 sources of product data found, only 2 registry-driven) | Documented. |
| Product Registry schema extension (additive: `purposeStatement`, `routeAliases`, `navPlacement`, `authRequirement`, `dataProduced`, `integrations`, `provenanceLevel`, `ownerModules`, `analyticsId`) | Deployed and verified live (commit `5cc68fb`); populated for the 4 real registry entries under analysis (`ftn-live`/Observer, `display`, `screen`, `tv`). |
| `sitemap.xml` converted from hand-maintained to registry-generated (`scripts/generate-sitemap.mjs`) | Deployed and verified live (commit `08042e7`); `--check` mode confirms zero URLs added/removed, ordering only. |
| Live/Observer/NOW/Display/Screen responsibility matrix | Documented — flagged a direct conflict between the founder brief's target architecture and the prior "Ecosystem Simplification pass" decision. **Founder reviewed and approved Option B** ("phased compatibility migration") the same day. See the row below for implementation. |
| **FTN Live compatibility migration (Option B, approved and executed)** | **Deployed and verified live (commit `39b9cc2`).** `ftn-live` renamed to public name "FTN Live" (route unchanged, `/observatory/`, `routeAliases:['/live/']`); NOW and Observer Console confirmed as already-existing views inside `js/observer-console.js` (no new registry entries, no new UI built — only branding connected); `display` given `parentProduct:'screen'` and renamed "FTN Screen — Display Mode" (route unchanged, `/display/`, still 200 OK live). `_redirects`: `/live/` → `/observatory/` unchanged; `/now/` retargeted from `/display/` to `/observatory/`. `nav.js` PRIMARY_NAV relabeled (Display's label deliberately left unchanged for lowest risk to the physically-deployed kiosk product). Sitewide `FTN Observer` → `FTN Live` text consistency pass across ~38 HTML files and 8 JS files (one file deliberately excluded: a `noindex,nofollow` personal portfolio page describing historical work). `tests/product-registry-audit.mjs`'s pre-existing hard guards against this exact migration (dating from the prior decision) inverted in place, documented inline, not weakened. Full local suite re-verified passing after the change (61 functional scenarios + foundation/mobile/all-public-routes/surface-system/performance-budget + static audits). `.claude/context/decisions.md` and `products.md` updated with an explicit "do not reverse accidentally" note for future sessions. Direct production verification: `/live/` and `/now/` both confirmed 301→`/observatory/` via `curl -I`; `/observatory/` title and hero eyebrow show FTN Live/Observer Console branding; registry names confirmed live; `/display/` confirmed still 200 OK. |
| `PRIMARY_NAV` full registry-driven consolidation, `service-worker.js` private-route consolidation | Mapped and sequenced (governance doc §5). Still not started — real duplication, lower priority than the footer work, no founder approval requested for these two yet. |

### Footer consolidation (approved 2026-08-24, executed same session)

Build-time synchronized footer per the founder's explicit spec: canonical data source
(`data/footer-config.mjs`) + sync script (`scripts/sync-footer.mjs`, `--check`/`--group=` modes,
following the `scripts/generate-sitemap.mjs` pattern) writing generated HTML directly into each
page's static file inside `<!-- FTN:FOOTER:START/END -->` markers — no runtime JS injection, works
with JavaScript disabled.

Classified all 43 footer-bearing pages by actual rendered content (not assumed) before touching
anything: two genuine variants, not one to force everything into.
- **26 generic/utility pages** (legal, About, Contact, Resources, product-neutral pages) had
  drifted into two near-identical, incompletely-overlapping copies of what was clearly meant to be
  one shared footer — reconciled into one canonical version. Commit `542a4cf`.
- **19 product-specific pages** (FTN Screen, FTN TV, FTN ibis, FTN Riddim, FTN Radio, the homepage,
  and others) hand-curate real, page-specific footer navigation (headings like "Watch",
  "Creators", "Intelligence") — left completely untouched; only their bottom bar is synced.
  Commit `96b17df`.

Closed a real, sitewide accessibility-critical link gap in the process: Contact and Trust Centre
were missing from roughly half the site's footers before this pass (confirmed by direct content
inspection, not assumed) — now present in every configured page's bottom bar, resolved via the
bottom-bar consolidation itself rather than a separate fix.

Three pages had no working footer at all before this pass and were brought up to the same
baseline rather than left as "variants": `riddim/fire/index.html` had a bespoke footer missing
Privacy/Terms/Contact/Trust entirely (its real disclosure content was preserved, not discarded);
`riddim/dj/index.html` and `riddim/daw/index.html` had no footer element whatsoever. All three
also lacked `css/components/footer.css` entirely and needed it added.

**A real bug was caught and fixed before anything was pushed**, not glossed over: the sync
script's fallback logic (used only on a page's first-ever sync, before markers exist) picked which
existing HTML structure to wrap by trying the `full`-variant pattern first regardless of the
page's actual configured variant. Run against the 19-page Group 2 during local testing, this
would have silently replaced several pages' entire hand-curated footer (brand + Watch/Creators/
Intelligence columns) with just a bottom bar — caught by this pass's own required testing (a
Playwright visibility/overflow check) before any commit, root-caused, and fixed by making the
fallback path variant-aware. Verified after the fix by diffing every affected file's pre-bottom-
bar content against its last-committed version (byte-identical) before trusting it and moving on.

**One local-only diagnostic dead end, disclosed rather than hidden:** an ad-hoc Playwright script
checking `riddim/dj/` and `riddim/daw/` specifically and repeatedly returned stale 3-link content
against this session's own minimal Node test server, surviving cache-disable, isolated browser
profiles and full server restarts — while `curl` against the exact same server, the official
`functional-release.mjs` suite (same Playwright/Chrome mechanism), and the actual file on disk all
consistently showed the correct 5-link content. Diagnosed as an artifact specific to this session's
throwaway test server (most likely a service-worker interaction it doesn't handle the way real
Cloudflare Pages infrastructure does), not a real defect — confirmed conclusively by direct
production `curl` after deploy (`riddim/dj` and `riddim/daw` both show `contact_links=1
trust_links=1` live). Recorded here rather than silently reconciled, since the investigation
consumed real effort and a future session hitting the same local-server quirk shouldn't re-diagnose
it from scratch.

**Verified across every affected route directly in production** (not just CI): all 19 Group 2
routes plus a Group 1 sample (`/legal/privacy-policy/`) returned `200`, every route showed at least
one live Contact and Trust Centre link, and `/screen/`'s curated "Watch"/"Creators" column headings
were confirmed still present and unmodified live — direct proof the variant-aware fix holds in the
real deployed environment, not just locally.

**Deferred, not started:** the structural footer redesign was explicitly out of scope by the
founder's own instruction ("this is structural consolidation, not a redesign") and wasn't
attempted. `PRIMARY_NAV`/`service-worker.js` consolidation (§5.2/§5.3 of the governance doc) remain
open, lower-priority items.

### Phase 3 — PRIMARY_NAV consolidation (2026-08-24, continued)

**Founder decision:** restore the 11-item approved primary structure (FTN Platform, FTN Community
Connect, FTN Live, FTN Parliament, FTN TV, FTN Kaiso, FTN Riddim, FTN Invest-in, FTN Directory,
About FTN, Contact), make it registry-driven while keeping deliberate editorial control (not every
product auto-placed), and keep desktop/mobile/no-JS navigation derived from one canonical source.
Full record: `.claude/context/decisions.md`'s "Primary navigation restored..." entry.

**What was actually duplicated/stale before this pass, confirmed by inspection, not assumed:**
`js/nav.js`'s `PRIMARY_NAV` (JS-rendered, 5 items post-"Founder Walkthrough Repair Pass") and each
page's static/no-JS `<ul class="site-nav__list">` + `<div class="mobile-nav__links">` markup (hand-
typed per page, never kept in sync with the JS version) had drifted into **three different navs**:
most pages' static markup showed a stale "Home / About FTN / News / Partners (`/contact/
#commercial`) / FTN Invest-in / Contact" list — no FTN Directory link at all — while `index.html`'s
own static markup showed yet a different stale 6-item set. A no-JS visitor saw neither the current
JS nav nor a consistent set of links depending on which page they landed on first.

**Architecture (mirrors the footer consolidation pattern):** `data/nav-config.mjs` is the one
ordered, curated list — registry-id references for real products, literals for the three non-
product structural entries. `js/product-registry-data.js` gained `navPlacement.primary:true` on
the 8 referenced products (`platform-home`, `community-connect`, `ftn-live`, `parliament`, `tv`,
`kaiso`, `riddim`, `invest`) as the "explicit registry metadata" half of the guarantee.
`scripts/sync-nav.mjs` resolves both against each other (throws on any mismatch) and writes: (1)
`js/nav.js`'s own `PRIMARY_NAV` array between hand-placed `FTN:NAV:START/END` markers — kept a
plain synchronous JS literal on purpose, so the primary row still renders on first paint with zero
registry fetch; only the *authoring* became registry-driven, not the runtime; (2) the static
`<ul class="site-nav__list">` / `<div class="mobile-nav__links">` regions on all 42 standard-header
pages, each wrapped in the same marker pattern, with `aria-current="page"` computed per page from
its own `<link rel="canonical">` so the no-JS fallback now has real active-state parity with the JS
version. `scripts/lib/registry-loader.mjs` was extracted (rule of three: `generate-sitemap.mjs` and
`sync-footer.mjs` already carried the identical Node-side Product-Registry-loading logic
independently; this script made a third, so it was pulled into one shared module and both existing
scripts were refactored to use it — verified behaviorally identical via their own `--check` modes
before and after).

**A real, more severe bug than the one being fixed was caught during this pass's own required
overflow/breakpoint testing, before anything was committed:** restoring 11 items reintroduced
genuine horizontal overflow at 1240-1600px viewports. The first CSS attempt (making
`.site-nav__list` a `min-width:0; overflow-x:auto` flex item) was insufficient on its own — direct
Playwright geometry inspection against a real (non-homepage) page showed `.site-header__actions`
(search / Sign In / menu toggle) collapsed to a literal `0×0` box at every width tested, because
flexbox's default shrink distribution let the primary nav's own outer `<nav>` element keep its full
content-based preferred width and squeezed its siblings toward zero instead. Root-caused and fixed
with `flex-shrink:0` on `.site-header__logo` and `.site-header__actions` (pinned to their content
size, never shrink) and `flex:1 1 auto; min-width:0` on `.site-nav` itself (absorbs exactly the
remaining space, down to 0 if truly squeezed, with its own `.site-nav__list` child scrolling
horizontally under pressure rather than the header growing a second row — the exact layout the
prior "cut to 5 items" pass was trying to avoid). The FTN Ecosystem trigger was moved from an `<li>`
inside the now-scrollable `<ul>` to a sibling `<div class="site-nav__item site-nav__item--ecosystem">`
specifically so its own mega-dropdown panel is never clipped (`overflow-x:auto` on an ancestor
forces `overflow-y:auto` too, per the CSS spec — the dropdown would have been cut off vertically).
Re-verified after the fix via Playwright at 1240/1260/1280/1366/1439/1440/1600/1820/1920/2560px:
zero wrapping, zero overlap, header actions always real/positive size, all 11 primary links present
in the DOM at every width (reachable by scroll/keyboard even when not all visible at once), the
Ecosystem mega-dropdown rendering at full height (~530px, 23 links, not clipped).

**Tests:** `tests/nav-registry-audit.mjs` (new) — runs `scripts/sync-nav.mjs --check` (catches any
drift across `js/nav.js` and all 42 pages, and any registry/config link break) plus independent
re-derivation of the approved-structure/registry-flag bidirectional consistency, FTN-prefix
requirement, account/identity-control preservation, and a regression guard against the exact stale
"News"/"Partners" links this pass removed reappearing. Wired into
`.github/workflows/functional-release.yml`. `tests/product-registry-audit.mjs`'s now-stale
"'FTN Display' must appear in nav" assertion was updated (Display is deliberately absent from
primary nav, consolidated into Screen) plus its `js/nav.js?v=` expected version bumped to
`20260824.5`. `tests/functional-release.mjs`'s `header-nav-usable-at-squeeze-width` scenario was
updated from asserting the old 5-item count to the new 11-item count, plus strengthened with the
exact overflow regression guard described above (actions cluster must keep positive size, must
never overlap the nav, all 11 links must stay in the DOM). Full local suite run after the fix:
`product-registry-audit`, `nav-registry-audit`, `backend-source-audit`, `csp-source-audit`,
`asset-manifest-audit`, `performance-budget` (12/12 routes), `mobile-release` (13/13 surfaces),
`functional-release` (61/62 scenarios — the one failure, `/facethenation` returning 404, is a
pre-existing local-test-server artifact confirmed unrelated to this pass: `python3 -m http.server`
does not resolve *any* extensionless clean URL without a trailing slash, verified generic by
testing `/about` and `/kaiso` the same way; Cloudflare Pages' real clean-URL routing does not have
this limitation, and `/facethenation` is re-verified directly in production below).

**Two previously-unwired drift checks were also wired into CI in the same pass**, closing a gap
left by the earlier footer-consolidation work: that work's own stated requirement ("make CI fail
when rendered footers drift from the canonical source") was implemented as a working `--check` mode
but never actually added to `.github/workflows/functional-release.yml` — confirmed by inspection,
not assumed. `scripts/sync-footer.mjs --check` and `scripts/generate-sitemap.mjs --check` are now
both CI steps alongside the new nav audit.

**CI/CD housekeeping:** `js/nav.js?v=` bumped to `20260824.5` across all 45 referencing HTML files
(cache-busting for the changed file).

### Phase 3 — service-worker route-policy consolidation (2026-08-24, continued)

**Classification of every route in the pre-existing `PRIVATE`/`NEVER` regexes** (`god-mode`,
`mission-control`, `account`, `love`, `health`, `ibis-ai`, `community-connect/app`, `auth`, `api`,
plus the separately-checked `/functions/v1/`), against the six categories the founder specified:

| Route | Category | Why |
|---|---|---|
| `mission-control` | 1. Registered FTN product | `status:'PRIVATE'`, `publicVisibility:false` |
| `love` | 1. Registered FTN product | `status:'VAULTED'`, `publicVisibility:false` |
| `health` | 1. Registered FTN product | `status:'VAULTED'`, `publicVisibility:false` |
| `account` | 1 and 2 (both) | Registered, `status:'AVAILABLE'`/public — but excluded because it renders authenticated, per-user content once signed in (new `authRequirement:'mixed'`) |
| `ibis-ai` | 1 and 2 (both) | Registered, `status:'AVAILABLE'`/public — excluded for the same reason (`authRequirement:'mixed'`; existing `analyticsClassification:'private-content-no-replay'` and a "Private conversation boundary" legal notice already said as much) |
| `auth` | 2. Account/authentication route | Supabase Auth redirect/callback flow, not a page |
| `god-mode` | 3. Administrative/founder-only capability | Deliberately has no Product Registry entry |
| *(none found)* | 4. Obsolete alias | Every existing entry was inspected; none were dead. Recorded as an explicit empty list in `data/route-policy.mjs`, not silently omitted |
| `api` | 5. Caching-only exclusion | Reserved namespace, no product/account/admin meaning of its own |
| `/functions/v1/` | 5. Caching-only exclusion | Supabase Edge Function calls; enforced by its own existing line (a contains-match, not prefix-anchored like the rest), documented but not folded into the generated regex |
| `community-connect/app` | 6. Other non-product application route | Mount point for the separate, protected Community Connect application — this repo never modifies its source (CLAUDE.md) |

**Resulting ownership model:** `js/product-registry-data.js` is authoritative for registered
products (category 1, and the auth-driven half of `account`/`ibis-ai`'s exclusion via the new
`authRequirement` field). `data/route-policy.mjs` is the new, small canonical source for
categories 2/3/4/5/6 — deliberately *not* folded into the Product Registry, since forcing
`god-mode` or the Community Connect app mount point to look like a product would misrepresent both
(per the founder's own instruction not to force non-product routes into the registry just to
remove a duplicated regex). `scripts/sync-service-worker.mjs` is the single point that resolves
both into `service-worker.js`'s generated `PRIVATE`/`NEVER` regexes.

**Every existing exclusion preserved, nothing removed:** the resulting `PRIVATE`/`NEVER` sets
together are byte-for-byte the same nine routes as before, just correctly re-sorted between the two
regexes (`god-mode` moved from `PRIVATE` to `NEVER` since it was never a registered product) — a
purely organizational change with zero behavioral difference, since both regexes are checked with
identical `||` logic in the fetch handler.

**A real classification bug was caught while building the generator, before it was ever synced or
committed:** the first version of the registry-derived filter treated any product with
`authRequirement !== 'guest'` as needing cache exclusion. Running it produced `PRIVATE=[account,
display, health, ibis-ai, love, mission-control]` — `display` (FTN Screen's Display Mode,
`authRequirement:'none'`, genuinely the most open access level on the platform: no account, no
configuration, nothing to protect) would have been silently swept into the private-cache exclusion
alongside actually-private routes. Root-caused (a blocklist of just `'guest'` doesn't distinguish
"more open than guest" from "less open than guest") and fixed with an explicit allowlist
(`CACHE_UNSAFE_AUTH_REQUIREMENTS = ['mixed','authenticated','private']`), re-verified via
`node scripts/sync-service-worker.mjs` producing the correct five-route `PRIVATE` set, and a
permanent regression assertion added to `tests/service-worker-policy-audit.mjs`.

**Documented explicitly, in multiple durable places, that this is not a security boundary** — not
a one-line caveat: `service-worker.js`'s own top comment, `data/route-policy.mjs`'s top comment,
`.claude/context/security-ops.md`'s new "Service worker & caching" section, and this ledger. Real
authorization remains server-side only (Supabase RLS/RPC/Edge Function checks); Supabase RLS
policies themselves remain unverified from this repo (no authenticated Supabase MCP access this
pass, same limitation recorded under "Known blockers" below) — this pass does not claim to have
proven or improved that, only to have made the cache-exclusion list itself accurate and generated.

**Cache version upgrade handled safely:** `VERSION` bumped `ftn-public-v2.4.1` → `ftn-public-v2.4.2`
(the file's own existing convention: bump on every content change so a returning browser doesn't
keep serving an obsolete cached shell). The `activate` handler's existing old-cache deletion,
`skipWaiting()`, and `clients.claim()` logic was left untouched and is now under a permanent
regression assertion (`tests/service-worker-lifecycle.mjs`) rather than only informally trusted.

**Tests:** `tests/service-worker-policy-audit.mjs` (new, static) — drift check via
`scripts/sync-service-worker.mjs --check`, independent re-derivation of every registry product
needing exclusion, the FTN Display regression guard above, spot-checks that genuinely public
products (`kaiso`, `tv`, `parliament`, `riddim`, `ftn-live`) are never excluded, presence of the
"not a security boundary" documentation, and that the fetch handler still consults both regexes.
`tests/service-worker-lifecycle.mjs` (new, behavioral, real registered service worker via
Playwright) — first visit reaches `activated`; repeat visit writes the shell into the cache;
offline loading works for both a previously-visited route and an unvisited route (via the
`/offline/` fallback); all six private routes are confirmed absent from every cache after being
visited; three public routes are confirmed present; a nested path under `/community-connect/app`
inherits the exclusion (not just the exact prefix); `/live/`/`/now/`/`/observatory/` are confirmed
never excluded (the actual 301 redirect is a Cloudflare Pages edge behavior neither this local
harness nor CI's identical `python3 -m http.server` can exercise — verified directly against
production instead, see below); and the version-upgrade cache-cleanup/`skipWaiting`/`clients.claim`
logic is confirmed present. `tests/product-registry-audit.mjs`'s exact-`VERSION` assertion updated
to `ftn-public-v2.4.2`. Both new suites wired into
`.github/workflows/functional-release.yml`. Full local run after all fixes: `product-registry-audit`,
`nav-registry-audit`, `service-worker-policy-audit`, `backend-source-audit`, `csp-source-audit`,
`service-worker-lifecycle` (9/9), `functional-release` (61/62 — the one pre-existing local-server
`/facethenation` artifact, unrelated, documented in the Part 1 entry above and re-verified live in
production once deployed).

**Direct production verification** (commit `27f0a59`, deployed and confirmed live via
`curl https://ftnplatform.org/version.json`): `curl https://ftnplatform.org/service-worker.js`
confirmed the deployed file matches exactly — `VERSION='ftn-public-v2.4.2'`,
`PRIVATE=/^\/(account|health|ibis-ai|love|mission-control)(\/|$)/`,
`NEVER=/^\/(api|auth|community-connect\/app|god-mode)(\/|$)/`, and the "not an authorization
boundary" documentation present. `curl -I https://ftnplatform.org/facethenation` returned a real
`308` (Cloudflare's clean-URL handling), confirming the local-test-server 404 noted above was never
a real defect. Every public route checked (`/`, `/kaiso/`, `/tv/`, `/parliament/`, `/riddim/`,
`/observatory/`, `/display/`) returned `200`. Every account/admin/private route checked (`/account/`,
`/ibis-ai/`, `/love/`, `/health/`, `/god-mode/`) returned `200` and remains fully reachable — the SW
policy controls local caching only, never route accessibility, exactly as documented; `/mission-control/`
returned `302` (pre-existing redirect behavior, unrelated to and unchanged by this pass). Confirmed
`display` does not appear anywhere in the deployed `service-worker.js` — the FTN Display
classification bug caught during development did not ship.

## Phases 4–8

Not started this pass. Each covers enough surface (ibis source routing rebuild, a new FTN
Statistics product with real source adapters, a full per-product completion pass across ~15
products, cross-browser/cross-viewport human QA, and revenue-readiness prep) to be its own
multi-session body of work — see the audit report itself, §18, for the phase-by-phase scope.
Recorded here as open, not silently dropped.

## Known blockers for this session

- **No authenticated Cloudflare/Supabase MCP access** — this session cannot inspect Supabase RLS
  policies or storage config through those tools directly. This did **not** block deployment,
  though: `git push` to `main` triggers real Cloudflare Pages deploys via its native GitHub
  integration (confirmed — the `Cloudflare Pages` GitHub check ran and succeeded on every push this
  session, and `curl https://ftnplatform.org/version.json` confirmed each push went live within
  minutes). Supabase RLS/storage-policy inspection remains unavailable without that MCP auth.
- **This environment's own Playwright-managed Chromium download hung indefinitely** — not a code
  defect. Confirmed genuinely stuck (near-zero CPU across the install processes for 15+ minutes),
  not just slow. Routed around it locally by pointing the test suite at this machine's already-
  installed system Chrome (uncommitted, local-only patch, reverted before every commit) — this is
  exactly the fallback the operating instructions for this pass authorized. All local suites this
  produced real results for are listed under "Session outcome" above.
- **No visible interactive browser for a human reviewer in this environment** — the audit's Phase 7
  calls for a person driving a visible browser across the full viewport/browser matrix
  (360×800 through 1920×1080, 200% zoom, keyboard-only, reduced motion, Chromium/Firefox/WebKit).
  Automated headless coverage (61 functional scenarios + 8 other suites, all passing) is real, but
  it is not that human click-through. Flagged as still outstanding, not silently substituted.
- **Dedicated QA identity ("FTN Test Client — Authenticated QA")** requires Supabase account
  creation, which needs the auth above. Not created this pass.
- **GitHub's unauthenticated REST API rate-limited mid-session** from this environment's shared
  egress IP, which made live CI-dashboard polling unreliable near the end of this pass. Worked
  around by verifying the actual deployed artifact directly (`curl` against `ftnplatform.org`)
  instead of trusting the dashboard read — a stronger form of evidence anyway per this repo's own
  release rule ("the verified production response" is the final evidence, not a status badge).
