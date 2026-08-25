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

## Phase 4A — ibis source and provider routing consolidation (2026-08-25)

A separate, founder-authorized continuation beyond this ledger's original Phase 0-3 scope,
recorded here as a pointer rather than duplicated in full: **`IBIS-MAP.md`'s own "Phase 4A" section
is the authoritative record** (inventory, claims-vs-implementation gap map, what was implemented,
what was explicitly not done, and Phase 4B's deferred decision proposal).

Headline finding: `js/ibis-ai-workspace.js`'s `serverAI()` — the main `/ibis-ai/` page's real text-
chat path — called `supabase/functions/ibis-query` directly, bypassing the provider registry's
`enabled`/eligibility gate entirely. Fixed, plus five other real gaps (two missing default
executors, an error-type mislabeling bug, four Edge Functions with no timeout, a Gemini API key
traveling in a URL query parameter, and one unlabeled deterministic-vs-generated UI branch). Six
commits (`20b4ddb`..`f0876e6`), one new module (`js/ibis-provenance.js`, the shared internal
provenance envelope), one new test file (`tests/ibis-routing-consolidation-audit.mjs`, wired into
CI), zero regressions across the full existing `ibis-*`/`ftn-node-registry`/`ftn-source-provenance`
suite. **Final commit `f0876e6`, confirmed live** via `curl https://ftnplatform.org/version.json`
and direct verification of every changed file's content in production (`js/ibis-provenance.js`
served correctly; `js/ibis-client.js`/`js/ibis-ai-workspace.js`/`js/ibis-provider-registry.js` all
carry the real fixes; `service-worker.js` unaffected, as expected).

## Phase 4B — ibis evidence presentation and Trust Card integration (2026-08-25)

Founder-authorized continuation of Phase 4A. Full record (decision matrix, field mapping, what was
implemented, video-UI disposition, accessibility/security results): **`IBIS-MAP.md`'s own "Phase
4B" section.**

Reused Phase 4A's registry and `js/ibis-provenance.js` unchanged -- no second provenance model, no
provider-routing changes. New `js/ibis-evidence.js` decides when a response needs evidence and maps
the envelope into `js/trust-card.js`'s existing data shape (additively extended, not redesigned);
the compact trigger reuses `trust-card.css`'s pre-existing `.trust-trigger`/`.trust-trigger--on-dark`
classes. Wired into `js/ibis-widget.js` and `js/ibis-ai-workspace.js` (Live Intelligence, on-device
AI, server AI). A real security fix landed alongside it: `js/trust-card.js`'s `title`/`value`/`units`
were never escaped before (historically safe -- only FTN-authored indicator text ever reached them
-- but Phase 4B is the first caller that can feed a real external source's own title into `title`),
fixed for every caller. Also fixed a real latent double-script-load bug in `js/ibis-widget.js`'s own
loader (would have created a second `#trust-card-dialog` on the 5 pages that already statically load
`trust-card.js`), found while wiring this in.

Per founder decision, `js/ibis-creative-studio.js`'s public VIDEO mode tab was removed (no
`VIDEO_GENERATION` provider is enabled anywhere in the registry) -- implementation preserved intact,
not deleted, documented as "not publicly exposed," not completed functionality. Existing
`tests/creative-studio-release.mjs` scenario updated (it clicked the now-removed tab) rather than
weakened.

**Tests:** `tests/ibis-evidence-audit.mjs` (static, decision matrix + field mapping) and
`tests/ibis-evidence-release.mjs` (real Playwright browser, fixture-based, zero provider cost --
safe-rendering-of-malicious-fields, keyboard/ARIA, degraded-state-always-shown, mobile/tablet-zoom/
reduced-motion). Both wired into CI. Full existing suite re-run clean throughout.

**Commits:** `f19a3f1`..`eaec3c8` (6 commits: trust-card fields+XSS fix, shared evidence module,
widget/workspace wiring, video-UI removal, tests+CI, docs).

**Direct production verification** (commit `eaec3c8`, confirmed live via
`curl https://ftnplatform.org/version.json`): `js/ibis-evidence.js` serves `200`; `js/trust-card.js`
carries the new field renderers and the `esc(data.title)` security fix; `js/ibis-widget.js` and
`js/ibis-ai-workspace.js` both carry the evidence-mounting wiring; `js/ibis-creative-studio.js` has
zero occurrences of `data-studio-mode="video"`; `/ibis-ai/`'s served HTML no longer references
`ibis-video-decision-gate`; `/trust/` shows the updated 2026-08-25 review date. `/ibis-ai/` itself
returns `200`.

## Phase 5A — FTN Statistics shared data foundation and first verified vertical slice (2026-08-25)

Founder-authorized. Full detail (existing-statistics duplication inventory, official-source access
attempts and outcomes, cross-validation method, licensing reasoning): **`GOVERNANCE/FTN_Statistics_
Source_Map_2026-08-25.md`.** Founder decision recorded separately: `.claude/context/decisions.md`'s
"FTN Statistics: cite-and-link, don't redistribute" entry.

**Key finding that reshaped the plan:** the existing "Indicator Engine" (`js/indicators-data.js`,
60 indicators) has 56 explicitly self-labeled `Illustrative` (placeholder, not real) entries, plus
three `referenceDate: null` debt indicators (honestly flagged, out of scope this pass). Exactly one
— `recorded-murders` — is already backed by a real, live, already-automated pipeline
(`data/crime-statistics.json` + `scripts/update-ttps-crime.mjs` + its daily GitHub Action). Phase 5A
therefore built the shared schema/adapter layer as a thin wrapper around that real pipeline, rather
than a second one — "build once, reuse everywhere" applied to an asset found mid-inventory.

**Shared contract:** `js/ftn-statistics.js` — five kept-separate layers (indicator definitions,
source datasets, observations, derived calculations, presentation config), enum-validated,
fail-closed on an unrecognized topic/geoLevel/frequency/revisionStatus/suppressionReason.
`provenanceFor()` bridges directly into Phase 4A's `js/ibis-provenance.js` envelope (same field
names, with a compatible fallback shape if that module isn't loaded) — no competing evidence model,
per the phase brief's explicit instruction.

**First adapter:** `js/ftn-statistics-crime-adapter.js` transforms the real `data/crime-statistics.
json` into two indicators (`crime-murders-reported`, `crime-murder-rate-per-100k`, the latter
carrying its real `formula`) and two distinct `sourceDataset` objects (CSO historical, TTPS
current), each with an honestly-worded `licensingNote`. Write-side: `scripts/lib/statistics-source-
adapter.mjs` (`fetchAndParse` — fails closed on a non-OK response or a parse-function throw, which
is how source-structure-change detection works; `todayInTimezone`), and `scripts/update-ttps-crime.
mjs` refactored onto it (verified byte-identical data values before/after the refactor; ran for
real during this session, legitimately updating `data/crime-statistics.json` with a fresh
2026-08-24 TTPS figure — 120 reported, 13 detected — left in place, not reverted).

**Renderer enhanced in place, not duplicated:** `js/crime-intelligence.js` (the pre-existing
component, already live at `/observatory/#crime-intelligence`) gained an accessible `<details>`-
collapsed data table (`<caption>`, `scope="col"`/`scope="row"` headers) and a real Trust Card
trigger built from the new schema/adapter — both benefit the already-live Observer Console page,
not just the new one. The new `/statistics/` page mounts the identical component at the same
`id="crime-intelligence"` auto-init convention — zero duplicate fetch/render code.

**New public page:** `/statistics/` — dark, premium black/red/white, registered in the Product
Registry as `statistics` (`AVAILABLE`, `information-intelligence` ecosystem group, footer-linked),
wired into `data/nav-config.mjs`-driven nav/footer sync and `scripts/generate-sitemap.mjs`.

**Tests:** `tests/ftn-statistics-schema-audit.mjs` (enum validation, defaults, no presentation
fields in raw observations, provenance alignment with/without `ibis-provenance.js`, full real
adapter transform against the live data file including the unavailable-state path) and `tests/
statistics-source-adapter-audit.mjs` (fixture-based, zero real network calls: fail-closed on
non-OK/changed-structure/missing-category/non-finite values) — both new, both passing. `tests/
statistics-release.mjs` (new, 9 Playwright scenarios against the real rendered page: chart/table
numeric agreement, accessible-table semantics, real Trust Card provenance including the live
`ttps.gov.tt` source link, keyboard access to the evidence trigger and table disclosure, reduced
motion, mobile/tablet/200%-zoom-equivalent layout, and an explicit no-live-claim check scoped to
the crime section itself). `tests/product-registry-audit.mjs` extended with FTN Statistics
registry/ecosystem-group/sitemap/footer/ownerModule assertions. `tests/functional-release.mjs` and
`tests/foundation-release.mjs` had their hardcoded `.ecosystem-product-link` count corrected from
23 to 24 (a real, deliberate addition, not weakened) and a pre-existing stale assertion
(`/facethenation` missing its trailing slash — masked in production by Cloudflare's own 308
redirect, confirmed via direct `curl`, but not replicated by the local static test server) fixed to
match the convention every other route call in that file already uses. Full existing static/
Playwright suite re-run clean throughout, including `csp-source-audit`, `asset-manifest-audit`,
`nav-registry-audit`, `service-worker-policy-audit`, `service-worker-lifecycle`, `ibis-evidence-
release`.

**Not done this phase, by design:** the deferred FTN Fire reconciliation (still pending, recorded
here again for the later Riddim/Fire completion pass); broad dataset expansion beyond the one crime
vertical slice; any change to `js/indicators-data.js`'s 56 illustrative placeholders; the
`route:'/facethenation'` missing-trailing-slash inconsistency in `js/product-registry-data.js`
itself (discovered this pass, confirmed non-breaking in production, left as a documented finding
rather than an in-scope fix — see the Phase 5A close-out report for the full note).

**Commits:** `3255863`..`e1a0848` (6 commits: schema+adapter, crime-intelligence.js enhancement,
Product Registry entry, new page+nav/footer/sitemap sync, tests, docs).

**Direct production verification** (commit `e1a0848`, confirmed live via
`curl https://ftnplatform.org/version.json`): `/statistics/` returns `200`; the new
`js/ftn-statistics.js`, `js/ftn-statistics-crime-adapter.js` and `css/components/statistics-page.css`
all serve `200`; the live adapter file carries the real `https://ttps.gov.tt/statistics/comparative/
?year=2026` source URL; the Product Registry serves the `statistics` entry; `/observatory/` carries
the same new script wiring, confirming the shared-component benefit reached the pre-existing page
too; `sitemap.xml` includes `/statistics/`. Beyond static checks, the full `tests/
statistics-release.mjs` suite (9 scenarios) was re-run with `FTN_TEST_BASE=https://ftnplatform.org`
against the live site itself — chart/table numeric agreement, real Trust Card provenance (the live
`ttps.gov.tt` link), keyboard access, reduced motion, and mobile/tablet/zoom layout all passed
against production, not just the local build.

## Phase 5B — ibis statistical querying and second-indicator generalization (2026-08-25)

Founder-authorized. Verified production baseline `64da938`. Full detail: `IBIS-MAP.md`'s "Phase 5B"
section, `GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md` §7–9 (ibis capability + second-
indicator candidate comparison), and `.claude/context/decisions.md`'s two new Phase 5B entries.

**Part 1 — a real, deterministic ibis capability.** `js/ibis-statistics-capability.js` adds
`STATISTIC_QUERY`, routed through the existing Phase 4A fabric (provider registry, capability
taxonomy, eligibility, client), never a bypass. Deliberately calls no language model at all — the
only registered provider is a zero-cost `LOCAL_DETERMINISTIC_NO_PROVIDER` entry, which is how
"never let a model invent a missing observation" is guaranteed structurally rather than by
instruction. Bounded intent set (latest value, source/methodology, comparison, change, available
indicators, why unavailable), all failing closed on an unrecognized question, indicator, or
incompatible comparison — including a genuinely ambiguous cross-indicator request ("compare the
murder rate and the exchange rate"), caught and rejected rather than silently answered wrong.
`js/ibis-evidence.js` gained an always-required Trust Card rule for `capability === 'STATISTIC'`.
Reachable from a new "Ask ibis about this data" panel on `/statistics/` (`js/statistics-ask-ibis.js`)
and from the sitewide `js/ibis-widget.js` floating assistant on any page (a new
`tryStatisticsRoute()`, same lazy-load pattern as the existing `trySavedItemsRoute()`).

**A real bug found and fixed while wiring this, not shipped:** the first cut of both new UI callers
read `outcome.result.data` from `IbisClient.request()`'s response, but `js/ibis-eligibility.js`'s
`attemptInOrder()` already unwraps the executor's own `data` field into `.result` directly — the
correct read is `outcome.result` with no extra `.data` layer (confirmed by tracing the exact field
names through `ibis-eligibility.js` line 155 and every existing working caller, e.g.
`js/ibis-widget.js`'s own `callAssistant()` already reads `outcome.result.answer` directly). Caught
via a real, reproducible browser test before this shipped, not assumed correct from the executor
contract alone.

**Part 2 — second indicator, proving the schema generalizes.** Central Bank of Trinidad and Tobago
TT$/US$ exchange rate (`js/ftn-statistics-fx-adapter.js`), MONTHLY frequency and a currency-rate
unit — deliberately different from crime's ANNUAL/count-and-rate shape. The Bank's DAILY
exchange-rate page was investigated and rejected as a source this pass (a real attempt against its
nonce-gated wpDataTables AJAX endpoint returned an empty body; reverse-engineering the real contract
further was judged disproportionate) in favor of the Bank's MONTHLY page, confirmed genuinely
static and reliably parseable. `scripts/update-fx-rate.mjs` ran for real: 427 real monthly
observations, January 1991 – July 2026, now in `data/fx-usd-ttd.json`, refreshed weekly via
`.github/workflows/update-fx-rate.yml`. `js/fx-intelligence.js` renders it (chart/table/Trust Card,
month-over-month derived change) via a new shared `js/ftn-statistics-chart.js` module, extracted
from `js/crime-intelligence.js`'s own rendering code rather than duplicated -- a real Phase 5A
defect was found and fixed during that extraction: the `/statistics/` page's crime host div was
missing the `crime-intel` CSS class its own animation rules require, leaving chart data-point dots
permanently invisible there for visitors without a reduced-motion preference.

**Tests:** `tests/ibis-statistics-capability-audit.mjs` (new — intent routing, deterministic
retrieval, valid/incompatible comparisons including the cross-indicator-ambiguity case,
missing/unknown/stale data, total-catalog-failure, provenance propagation, and prompt-override-
injection resistance, verified against the real live data). `tests/fx-source-adapter-audit.mjs`
(new, fixture-based, zero network calls). A new §7/§8 in `tests/ftn-statistics-schema-audit.mjs`
(the real FX adapter transform). `tests/ibis-evidence-audit.mjs` extended with the new
always-required-for-STATISTIC assertions. `tests/statistics-release.mjs` gained 9 new Playwright
scenarios (FX presentation, ask-ibis flow including a fail-closed unsupported-question check,
unchanged primary navigation -- 11 items, Statistics correctly absent from PRIMARY_NAV but present
in the Ecosystem menu per founder decision #6 -- and confirmation no paid provider endpoint is ever
reached for a statistics question). Full existing static/Playwright suite re-run clean, including
`ibis-eligibility-audit`, `ibis-client-audit`, `ibis-routing-consolidation-audit`,
`functional-release` (61 scenarios), `foundation-release`, `service-worker-lifecycle`, and
`visual-regression` (two pre-existing, unrelated mobile-viewport failures found and traced to live
clock/counter time-drift between baseline capture and now on `/observatory/` and `/parliament/`
respectively -- confirmed not caused by this phase's changes, `/parliament/` was not touched at all
this pass; not fixed, out of scope).

**Not done this phase, by design:** Community Connect statistics integration (Supabase RLS
unverified, per founder decision #3); FTN Fire reconciliation (still deferred); the harmless
`/facethenation` trailing-slash quirk (explicitly out of scope, decision #5); broad indicator
expansion beyond the one new second indicator; a third indicator; debt-to-GDP (explicitly rejected
again without new investigation, per the brief's own instruction not to revisit it without a
defensible new source).

**Commits:** `0aba2dc`..`a443a36` (6 commits: shared chart extraction + a real Phase 5A defect fix,
FX adapter + real data + weekly cron, ibis STATISTIC_QUERY capability, FX/ask-ibis UI wiring,
release tests, docs).

**Direct production verification** (commit `a443a36`, confirmed live via
`curl https://ftnplatform.org/version.json`): `/statistics/` returns `200`; every new JS/CSS asset
(`js/ibis-statistics-capability.js`, `js/ftn-statistics-fx-adapter.js`, `js/ftn-statistics-chart.js`,
`js/fx-intelligence.js`, `js/statistics-ask-ibis.js`, `css/components/fx-intelligence.css`, and the
ibis fabric files) serves `200`; `data/fx-usd-ttd.json` serves the real 427-month series; the
deployed provider registry carries `ibis-local-statistics-query`. Beyond static checks, the full
`tests/statistics-release.mjs` suite (18 scenarios) was re-run with
`FTN_TEST_BASE=https://ftnplatform.org` directly against the live site -- FX chart/table/Trust
Card, real ibis Q&A with a mandatory Trust Card, the fail-closed unsupported-question path,
unchanged primary navigation, and no paid-provider network calls all verified against production
itself, not just the local build.

### Independent Phase 5B verification corrections — 2026-08-25

Fresh review after the initial close-out found and corrected four bounded defects without changing
the Phase 5B architecture:

- The observation schema now carries `sourceReferenceDate` separately from both
  `referencePeriod` and `publicationDate`. Central Bank monthly observations propagate their real
  `YYYY-MM` source period into ibis provenance and Trust Cards; the TTPS current-year count keeps
  this field null because TTPS publishes no statistical "as at" date. FTN retrieval dates are never
  substituted.
- A comparison/change question naming exactly one period now fails closed with
  `NEED_TWO_PERIODS` instead of silently comparing the two latest observations.
- Indicator-list answers now carry `capability:'STATISTIC'` provenance, so the "Trust Card for every
  successful statistical response" rule also covers that path.
- The Central Bank Copyright Notice was found and read directly. It permits attributed,
  unaltered reproduction and addresses redistribution/private or commercial use, with revocable
  permission. The earlier "no published reuse terms" statement was corrected in code and
  governance records.

The production parser was also extracted to `scripts/lib/cbtt-fx-parser.mjs`, so the fixture test
imports the real parser instead of maintaining a copy. The FX chart now uses a meaningful
data-relative vertical scale for its narrow range, while crime retains its prior explicit scale;
on mobile, the 24-month plot scrolls rather than clipping. A visible production screenshot also
caught all 24 monthly x-axis labels colliding; the chart now displays a bounded label interval while
its accessible table retains every observation.

All three Phase 5B static suites and `tests/statistics-release.mjs` are now explicit steps in the
functional release workflow. They previously existed but were not invoked by CI, so their
regressions were testable locally yet not release-gated.
