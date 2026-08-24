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
| 32-file footer duplication, `PRIMARY_NAV` full registry-driven consolidation, `service-worker.js` private-route consolidation | Mapped and sequenced (governance doc §5). Footer consolidation **approved by the founder**, explicitly sequenced to begin only after this migration's deployment was verified (now true) — **not yet started this session**, next unit of work. |

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
