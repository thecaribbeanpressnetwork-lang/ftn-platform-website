# FTN Platform — Production Completion Ledger

**Durable checkpoint for the founder-authorized "FTN Final Production Completion Pass" +
continuous-execution addendum.** Update this file after every pushed cycle so a future session can
resume without chat history. Do not delete prior cycle records — append.

**Verified production SHA at start of this pass:** `eb51ab2` (Phase 5B).

---

## Cycle 1 (2026-08-25) — Priority 1: Fire audit

**Finding: Fire is already FUNCTIONAL, not deferred work.** Full real end-to-end Playwright
verification (desktop 1366×900 and mobile 390×844, `channel:'chrome'` workaround):
- Prompt → generate → real `LOCAL DRAFT READY` status: works, zero console errors.
- Play/Pause toggle (PLAY DRAFT ⇄ PAUSE ⇄ RESUME): works, real `AudioContext.suspend()/resume()`.
- Real WAV export: real download captured (`ftn-fire-soca-105bpm.wav`).
- Real 4-stem ZIP export: real download captured (`ftn-fire-stems-reggae-86bpm.zip`).
- Zero horizontal overflow at either viewport, before or after generation.
- Honest labelling already correct: "not a Stability AI model. It runs on your device," explicit
  `LOCAL_DRAFT_READY`/`FTN local browser engine` status, managed-generation path fails closed with
  an honest message ("not enabled yet. No provider was called and no credits were reserved.").

**Real finding, documented not fixed:** `js/ftn-fire.js` contains three genuinely unreachable
functions (`requestManaged`, `checkManagedJob`, `askIbis`) — their target DOM ids
(`fire-managed-status`, `fire-managed-check`, `fire-ibis-output`) do not exist anywhere in
`riddim/fire/index.html`, and `init()` never wires them to any control. This is the explicitly
authorized "retain useful code privately when a public control is nonfunctional" pattern, not a
defect — the backend they'd call (`ftn-fire-generate`) is genuinely disabled platform-wide
(`FTN_CREATIVE_GENERATION_ENABLED`/`FTN_FIRE_GENERATION_ENABLED` both false per `IBIS-MAP.md`), so
exposing a control that would always say "not enabled" would be a UX regression, not an
improvement. **Left as-is. Not a blocker.**

**Provider-registry reconciliation finding:** `ftn-fire-local-procedural` (Fire's real, working
engine) and `ibis-local-music-engine` (a separate, simpler, IBIS-orchestrable 4-style engine) are
BOTH real `INSTRUMENTAL_GENERATION` capability entries in `js/ibis-provider-registry.js`. This is
not a routing bug — `ftn-fire-local-procedural` stays `enabled:false` (accurately: it remains
page-bound, not portable), so `js/ibis-eligibility.js`'s `find()` never selects it; only
`ibis-local-music-engine` is ever eligible for a real orchestrated `INSTRUMENTAL_GENERATION` call.
Merging the two into one implementation would be a nontrivial refactor of a fully-working, tested
page for zero user-facing benefit — explicitly out of scope per "no speculative redesign." **Not
consolidated. Documented, not a blocker.**

**Status: Priority 1 (Fire) — FUNCTIONAL. No code changes required. Moving to Priority 2.**

---

## Cycle 2 (2026-08-25) — Priority 2: Riddim ecosystem (DJ Tube, DAW, Radio, EPK)

**All FUNCTIONAL. Real end-to-end verification, not just "the page loads":**
- `/riddim/` hub, `/riddim/dj/`, `/riddim/daw/`, `/radio/`: zero console errors, zero horizontal
  overflow (desktop + mobile), zero broken images (an initial `naturalWidth:0` flag on `/radio/`'s
  YouTube thumbnails and a transient 404 on `/riddim/dj/` were both confirmed to be timing
  artifacts of checking before lazy-loaded content finished — re-verified clean with a longer wait
  and explicit response-status logging: all real responses were `200`).
- DAW: "LOAD FTN PRACTICE GROOVE" → real playback controls enable; **DOWNLOAD WAV** produces a real
  WAV download; **DOWNLOAD MP3** produces a genuinely valid MP3 (verified via its real MPEG frame
  sync header `0xFFFB` in the downloaded bytes, not a mislabeled WAV). A console 404 seen once was
  traced to the browser's own default `/favicon.ico` probe (harmless, unrelated to the click that
  preceded it in the log).
- EPK section (`/radio/#ftn-epk`) renders correctly with its own real form fields, zero errors.

**Status: Priority 2 — FUNCTIONAL. No code changes required.**

## Cycle 3 (2026-08-25) — Priority 3: Supabase/RLS

**Confirmed blocker, not guessed:** no `supabase` CLI installed (`which supabase` → not found), no
`SUPABASE_*` environment variables present, no Supabase MCP tool available via `ToolSearch`. Same
recurring finding as every prior phase's own attempt. **No RLS verification was performed or
claimed.** Community Connect statistics integration correctly remains un-started (per founder
decision #3, itself consistent with this blocker).

**Status: Priority 3 — EXTERNALLY BLOCKED. Requires founder-supplied Supabase credentials/CLI
access in a future session.**

## Cycle 4 (2026-08-25) — Priority 4: Govern and Parliament

Real inspection, not just a route check: zero console errors, zero overflow (desktop + mobile) on
both pages. All 10 sampled real official outbound links (ttparliament.org × 6 sub-pages,
barbadosparliament.com, parliament.gov.gy, japarliament.gov.jm, ttconnect.gov.tt) independently
curled — all return real `200`. No stale "beta/demo/placeholder/coming soon" language found. No
exposed-credential or duplicated-function issues found on these two pages specifically.

**Status: Priority 4 — FUNCTIONAL. No code changes required.**

## Cycle 5 (2026-08-25) — Priority 5: whole-platform sweep

Automated Playwright sweep of all 41 public routes from `sitemap.xml` × 2 viewports (1366×900,
390×844) = 82 page-loads, checking HTTP status, console errors, horizontal overflow, broken images,
and a suspect-language regex (placeholder/demo mode/beta/coming soon/unlabelled illustrative).

**18 flags raised, all triaged as non-issues:**
- `/facethenation` × 2 (desktop+mobile) — the same pre-existing, already-documented (Phase 5A/5B)
  local-static-server-only trailing-slash quirk. Confirmed harmless in real production via
  Cloudflare's own 308 redirect. Founder explicitly deferred fixing this in the two most recent
  prior phases (Phase 5A finding, Phase 5B founder decision #5) — deferred again here for
  consistency with that standing instruction, not re-litigated.
- `/events/`, `/screen/`, `/radio/` × 2 each — a `401` from
  `challenges.cloudflare.com/cdn-cgi/challenge-platform/...` is Cloudflare Turnstile's own internal
  bot-detection telemetry self-limiting under headless/sandboxed automation — expected noise in
  this test environment, not a real integration failure (the actual protected-transaction flow was
  already verified end-to-end with a properly mocked Turnstile in `tests/foundation-release.mjs`'s
  `contact-protected-transaction` scenario, which passed in this same pass).
- `/scenario-workspace/`, `/applications/`, `/insights/`, `/legal/terms-of-service/` × 2 each — the
  word "illustrative" appearing in legitimate, honest, already-approved self-description (Scenario
  Workspace's own product identity is explicitly labelled illustrative — that is correct, honest
  labelling, not a defect). False positives from an intentionally broad regex, not real placeholder
  data presented as fact.

**A real, separate finding via the full existing regression suite (not this sweep):**
`tests/surface-system-release.mjs` had a third, previously-missed hardcoded
`.ecosystem-product-link` count of `23` (the other two occurrences, in `functional-release.mjs` and
`foundation-release.mjs`, were already fixed in Phase 5A) — fixed to `24`, matching the real,
deliberate FTN Statistics product addition. Committed.

Also checked directly: `/account/`, `/trust/` — zero errors, zero overflow. Sitewide grep for
exposed secrets (`sb_secret`, `service_role`, raw API key patterns) in client-side JS/HTML — zero
matches, consistent with every prior phase's `tests/backend-source-audit.mjs` finding (also
re-run clean this pass).

**Status: Priority 5 — FUNCTIONAL. One real test-suite bug found and fixed. Zero real production
defects found across 41 routes / 82 page-loads.**

## Full regression suite re-run this pass (all green except the one real fix above)

28 static/unit test files (product-registry, nav-registry, service-worker-policy, csp-source,
asset-manifest, backend-source, ftn-statistics-schema, statistics-source-adapter,
fx-source-adapter, ibis-statistics-capability, ibis-eligibility, ibis-client, ibis-evidence,
ibis-routing-consolidation, ibis-audio-analysis, ibis-music-engine, ibis-project-qc,
ibis-runtime-estimator, ibis-caribbean-language-id, ibis-live-research, ibis-sfx-engine,
ibis-voice-registry, ftn-node-registry, ftn-source-provenance, ftnscreen-screenwriter,
ftn-scout-candidate-tracker, ftn-walkthrough, ibis-project-graph) — all pass.

11 Playwright release suites (functional-release [61 scenarios], foundation-release,
service-worker-lifecycle, ibis-evidence-release, statistics-release [18 scenarios],
all-public-routes [known /facethenation quirk only], mobile-release, surface-system-release [fixed
this cycle], creative-studio-release, founder-access-release, turnstile-release) — all pass after
the one real fix.

## Cycle 6 (2026-08-25) — concurrent-session merge + production verification

A push conflict revealed another session had independently pushed 3 real commits on top of the same
`eb51ab2` base (`cf73620`, `1b3f3c2`, `b476a88`) — genuine Phase 5B verification corrections: a
`sourceReferenceDate` provenance field, a stricter `NEED_TWO_PERIODS` fail-closed rule (replacing
this pass's looser "default to two most recent" choice), a real Central Bank Copyright Notice
correction (their own direct reading superseded this pass's earlier "no published reuse terms"
claim — a genuine truthfulness fix, not a stylistic one), an FX chart x-axis label-collision fix
found via a real screenshot, and wiring the Statistics test suites into CI. Merged via `git merge`
(one real conflict, in this ledger's own append point, resolved by keeping both entries in
sequence) — never force-pushed, both bodies of work preserved. Full static + Playwright suite
re-run clean on the merged tree, then re-verified a third time directly against production
(`075f1d0`): all 21 `statistics-release.mjs` scenarios pass live, including the other session's 3
new ones.

**Status: merge complete, both sessions' work verified live in production together.**

## Next executable task

None independently executable without Supabase credentials. All five brief priorities have been
substantively addressed this pass with real, verified findings (not assumptions). If resumed in a
future session with Supabase access: perform the real RLS/policy audit per Priority 3's full
checklist (per-table RLS enabled, cross-user access denial, storage policy review, service-role
credential non-exposure verification, safe regression tests). Otherwise, no production blocker,
false capability claim, broken primary workflow, or major accessibility defect remains identified
in this pass's scope.

## Remaining defects (ranked)

None found at production-blocker, security/privacy, false-capability, or broken-primary-workflow
severity. No major mobile/accessibility defects found. No data/source-integrity defects found
beyond the already-documented, already-accepted Statistics source-map caveats (Phase 5A/5B).

## Blockers

1. **Requires credentials/access:** Supabase RLS/policy verification (Priority 3) — no CLI, MCP
   tool, or environment credentials available in this session. Community Connect statistics
   integration correctly stays deferred as a consequence.
2. **Safely deferred (founder's own repeated, explicit instruction across two prior phases):** the
   cosmetic `/facethenation` missing-trailing-slash inconsistency in `js/product-registry-data.js`
   — confirmed harmless in production, not re-opened without a new founder instruction to do so.

## Tests run this pass

See "Full regression suite re-run this pass" above, plus the manual real-browser verification
described in Cycles 1–5 (Fire generate/play/export, DAW load/export, whole-platform 82-page-load
sweep, Govern/Parliament link reachability).

## Decisions made this pass

- Fire's dormant managed-generation/ibis-notes code is retained, not removed or wired up (Cycle 1).
- Fire's provider-registry duplication (two INSTRUMENTAL_GENERATION entries, one page-bound one
  portable) is accepted as intentional and non-conflicting; not merged (Cycle 1).
- The `/facethenation` trailing-slash inconsistency stays deferred, consistent with the founder's
  own explicit prior instruction not to spend a pass on it (Cycle 5).

## Files/architecture touched this pass

- `tests/surface-system-release.mjs` — real count fix (23 → 24).
- `GOVERNANCE/FTN_Completion_Ledger_2026-08-25.md` — this file (new).
- `GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md` — pending append (see next commit).

## Cycle 7 (2026-08-25) — Priority 3 resolved: Supabase RLS/authorization/storage-policy audit

Read-only project-scoped MCP access was connected mid-pass. Full audit performed directly against
the live database (`list_tables`, `get_advisors`, direct `pg_policies`/`pg_proc`/`information_schema`/
`aclexplode` queries, `storage.buckets`/`storage.objects` policies, `list_extensions`,
`list_migrations`) -- no row content beyond schema/policy/count metadata was read; no personal
records were queried.

**Real finding #1 (fixed via migration, additive only):** `public.issues` has had Row Level
Security enabled with **zero SELECT policy** since its creation. Postgres RLS denies every row for
a command with no matching policy -- confirmed live via `pg_policies` (only an INSERT and a
JWT-role UPDATE policy exist). `20260812130000_enforce_community_public_view_boundaries.sql`
correctly redacted column-level access and built `public.issues_public` (a `security_invoker`
view) on top, but a `security_invoker` view runs under the *caller's* RLS -- with no SELECT policy
on the base table, that view (and its two dependent count views) has been returning zero rows to
every anon/authenticated caller since that migration deployed. Not a data-exposure risk (fails
closed) but a real authorization-boundary gap that silently breaks Community Connect's own public
transparency view (a separate application/repository; this repo owns the shared migration history
for these tables, established by that same prior migration). Fixed by
`supabase/migrations/20260825120000_restore_public_issues_read_policy.sql` -- strictly additive
(one `CREATE POLICY`, idempotent, no `REVOKE`/`DROP`), covered by 4 new assertions in
`tests/backend-source-audit.mjs`. **Not yet applied to the live database** -- the connection used
for this audit is read-only by explicit instruction; the migration file is the deliverable for the
founder's own reviewed deploy process.

**Real finding #2 (documented, not changed):** the same table's "Admin update issues" policy
checks `auth.jwt() ->> 'role' = 'admin'`. Confirmed via `pg_proc` that this project has no custom
access-token hook, so the top-level `role` JWT claim is always the Postgres role name
(`authenticated`/`anon`/`service_role`) and can never equal `'admin'` -- this policy has always
been unreachable. Confirmed harmless: `supabase/functions/ftn-owner-control/index.ts` performs the
real admin/founder authorization correctly, via its own service-role client checking
`public.ftn_operator_roles` server-side, never trusting a client JWT claim. Left in place
(removing a dead, fail-closed policy has no security benefit); documented in the new migration's
own comments so a future session doesn't mistake it for the real mechanism.

**Confirmed correct, no action needed:**
- All other tables with real user data (`dj_creators`, `dj_videos`, `dj_video_likes`,
  `dj_video_views`, `fdm_dj_profiles`, `ftn_user_preferences`) have textbook-correct
  `auth.uid() = user_id` self-ownership policies -- no cross-user read/write path found.
- 16 founder/admin/control-plane tables (`ftn_operator_roles`, `ftn_founder_identities`,
  `ftn_founder_devices`, `ftn_owner_access_audit`, `ftn_control_state`, `ftn_control_journal`,
  `ftn_platform_transactions`, `ftn_product_controls`, `ftn_feature_controls`,
  `ftn_source_controls`, `ftn_external_link_health`, `ftn_integration_readiness`,
  `ftn_deployment_health`, `ftn_founder_actions`, `ftn_user_access_grants`,
  `ftn_account_requests`) correctly have RLS enabled with zero policies -- deny-all to
  anon/authenticated by design (`get_advisors` flags this as informational, not a defect); real
  access is exclusively via `ftn-owner-control`'s/`ftn-account-control`'s service-role clients.
  `ftn_account_requests` and `ftn_founder_identities`/`ftn_founder_devices` carry explicit
  table comments confirming this is deliberate.
- The one storage bucket (`ftn-releases`, public-read, APK/binary MIME types only) has zero
  `storage.objects` policies -- confirmed intentional via
  `20260818173000_revoke_anonymous_release_uploads.sql`, which explicitly dropped the temporary
  upload policies that once existed ("browser roles must never publish signed builds"). Public
  readability of a public bucket does not depend on RLS.
- No privileged/service-role credential ever appears in client-side code (repeat-confirmed; also
  covered by the existing `backend-source-audit.mjs` secret-format sweep).
- Account deletion (`ftn-account-control`) is a real, honest, service-role-backed request-based
  flow (`ftn_account_requests` insert + `deletion_pending_at` timestamp), not a fake button.
- `list_extensions` shows only standard, expected extensions active (`pgcrypto`, `supabase_vault`,
  `pg_stat_statements`, `uuid-ossp`, `plpgsql`) -- no risky extension (`http`, `dblink`, `pg_net`)
  installed.

**Blocker (not fixable via migration, requires founder Dashboard access):** `get_advisors` flags
`auth_leaked_password_protection` as disabled (WARN level) -- Supabase Auth's HaveIBeenPwned
compromised-password check. This is an Auth-provider *configuration* toggle (Dashboard →
Authentication → Policies, or the Management API), not a database object; no tool available in
this session can change it, and it is out of scope for a SQL migration.

**Secondary, non-security observation:** `list_migrations` (deployed history) does not fully match
this repo's local `supabase/migrations/` file list -- several local files have no matching deployed
version entry, and several deployed entries carry different timestamps than their same-named local
file. Verified this does NOT affect the audit's own findings (all RLS/policy conclusions above were
checked against the live database directly, not inferred from migration files). Flagged for the
founder to reconcile; not attempted here -- editing migration history tracking is a separate,
higher-risk operation outside this audit's scope.

**Status: Priority 3 — RESOLVED (from EXTERNALLY BLOCKED to audited).** One real fix delivered as
a rollback-capable migration (not yet applied to production, per explicit instruction). One
informational finding documented. One Auth-config item requires founder Dashboard action. One
migration-history hygiene item flagged for founder reconciliation.

## Cycle 8 (2026-08-25) — critical finding: internal files were publicly served, sitewide, since creation

While confirming my own new migration file wasn't publicly reachable (a routine sanity check), found
it WAS -- `https://ftnplatform.org/supabase/migrations/...` returned the real file content, `HTTP
200`. Checked whether this was new (caused by my own change) or pre-existing: `supabase/functions/
ftn-owner-control/index.ts` (the FOUNDER CONTROL-PLANE Edge Function's real source) and `GOVERNANCE/
FTN_Repair_Ledger_2026-08-24.md` were ALSO both served in full at `200`. **Pre-existing, sitewide,
since these files were first added** -- not something this pass introduced.

**Root cause:** `_redirects` used `/supabase/* /404.html 404` and `/GOVERNANCE/* /404.html 404`.
Verified via Cloudflare's own Pages redirects documentation: status code `404` is explicitly NOT a
supported redirect/rewrite status on Cloudflare Pages (only 3xx redirects and a `200` rewrite are
functional) -- Cloudflare Pages serves an existing static asset BEFORE evaluating an
unsupported-status `_redirects` rule, the exact opposite of this repo's own prior comment ("Cloudflare
Pages evaluates these rules before serving the static file tree"), which was itself wrong. **This
means these two block rules have never actually worked in production**, for as long as they've
existed. `tests/backend-source-audit.mjs` only ever asserted the rule TEXT was present in `_redirects`
-- it never checked that production actually enforced it, so this shipped silently.

**Fixed:** both rules changed to status `200` (a genuine, documented Cloudflare Pages rewrite --
masks the real file's content at its original URL). `tests/backend-source-audit.mjs` updated: now
asserts the OLD non-functional `404` pattern is ABSENT and the new `200` pattern is present.
Pushed, deployed, and **directly re-verified in production after deploy** (not assumed): both a
migration file and the Edge Function source now return the `/404.html` page's content at their
original URLs, confirmed by fetching them post-deploy.

**Why this matters beyond this one fix:** every internal governance document (repair ledgers,
completion ledgers, architecture-decision records -- including this very file's own security
findings) and every Edge Function's real source code has been publicly fetchable this whole time.
Edge Function source contains no credentials (confirmed by the existing secret-format sweep) but
does reveal internal logic/table names/authorization flow -- information-disclosure, not a
credential leak. No evidence this was exploited; not something this session can determine either
way from a static-site access log it doesn't have.

**Status: found, fixed, deployed, verified live. This is the single highest-severity finding of
the entire Supabase/production-completion audit.**

**Production verification detail (commit `77dab98`):** Cloudflare actually resolves the `200`
rewrite as a real `308 Permanent Redirect` to `/404` (not an in-place content swap) -- confirmed by
inspecting the raw response headers directly, then following the redirect and confirming the final
body is genuinely the "Page Not Found" 404 page, for all four previously-exposed URLs (the new
migration, an old migration, and two GOVERNANCE files). No real file content is served at any
`/supabase/*` or `/GOVERNANCE/*` URL any more.

## Cycle 9 (2026-08-25) — real finding: the restored issues policy re-exposed raw coordinates

Founder asked this session (no live Supabase MCP access this time -- static SQL analysis + real web
verification only, honestly disclosed) to re-verify `20260825120000_restore_public_issues_read_
policy.sql` cannot reveal reporter identity, contact details, precise private location, evidence
metadata, or non-public statuses before it's applied.

**Verified safe by tracing the actual column-level GRANT statements across every migration that
touches `public.issues`** (not just reading the new migration's own comment): `reporter_name`,
`reporter_contact`, `photo_data_url` and `metadata` are consistently absent from every GRANT since
20260810130000 -- confirmed correct, matches the migration's own claim.

**Real gap found, not previously caught:** the SAME column grant already includes RAW, full-
precision `latitude, longitude` directly on the BASE TABLE `public.issues`. Before 20260825120000,
this was harmless by accident -- RLS denied every row with zero SELECT policies, so the column
grant was unreachable regardless of its own content. Restoring the row policy (necessary --
`issues_public`'s `security_invoker` view cannot return a row without it) makes that accident stop
protecting anything: any caller holding the public anon key (by design public, not a secret) can
now query `public.issues` directly via PostgREST -- `select latitude,longitude from issues` --
bypassing `issues_public`'s own deliberate `round(..., 3)` privacy generalization entirely. For a
citizen safety-report table, an exact coordinate can be materially more identifying than a
~110m-generalized one. This is exactly the "precise private location" exposure the founder asked to
rule out -- found, not ruled out, on first read of the migration alone; only surfaced by tracing the
column grant back through the migration history.

**Fixed via a second, additive migration** (`20260825130000_restrict_issues_raw_coordinate_grant.
sql`, not yet applied to production -- same reviewed-founder-deploy-step discipline as the first):
revokes `latitude, longitude` from the direct base-table grant; adds a narrow `security definer`
function `issue_public_coordinates(uuid)` returning ONLY the rounded value for one issue id, nothing
else; rebuilds `issues_public` to source coordinates from that function instead of reading the
base table's own (now-revoked) columns. Every other already-granted column is untouched. Real
rollback SQL for BOTH the new migration and the original 20260825120000 fix now exist as reviewed
files in a new `supabase/rollbacks/` directory (deliberately NOT inside `supabase/migrations/`, so
`supabase db push`'s migration scanner can never auto-apply a rollback -- verified by
`tests/supabase-issues-security-audit.mjs`).

**Not independently verifiable this pass, disclosed honestly rather than glossed over:** whether
`public.issues.status`/`lifecycle_status` contain any internal-only value that should not be
publicly visible. The row policy (`using (true)`) makes every row visible regardless of status
value; `public.issues`'s own `CREATE TABLE` is not present in this repo's migration history (created
outside it, likely via Community Connect's own separate repository or directly in the Dashboard),
so its real status enum could not be read from the repo alone, and no live database connection was
available to query `select distinct status, lifecycle_status from issues` directly. **This is the
one open item before either migration should be considered fully verified safe** -- a founder or a
future session with live Supabase access should run that query (or check Community Connect's own
schema source) before applying, or immediately after, as a real post-deploy check.

**Tests:** `tests/supabase-issues-security-audit.mjs` (new, static SQL analysis only, explicitly
labelled as such in its own header and console output) -- verifies both migrations never touch the
four sensitive columns, the coordinate fix never reads a raw lat/long column anywhere in the
rebuilt view or function, both migrations contain zero destructive statements, and both rollback
files exist outside `supabase/migrations/`. `tests/backend-source-audit.mjs` extended with the new
migration file's existence check.

**Status: Priority 3 continued — one real privacy gap found and fixed as a reviewed, rollback-
capable migration, not yet applied to production (founder's own deploy step, see the Dashboard
action below). One item requires live database access to fully close out.**

## Cycle 10 (2026-08-25) — deployment-artifact allowlist (defense in depth beyond Cycle 8's fix)

Founder asked for Cycle 8's `_redirects` fix to be hardened further: a true build-time exclusion or
allowlist, covering both Cloudflare Pages and GitHub Pages, tested against case variants and
encoded paths, preserving the existing `_redirects` rules as defense in depth (not replaced).

**Real, independent second finding, not covered by Cycle 8's fix at all:** `.github/workflows/
static-pages.yml` uploads `path: .` -- the entire repository, completely unfiltered -- to GitHub
Pages on every push to `main`. GitHub Pages has no `_redirects`-equivalent runtime layer, so Cycle
8's fix (a Cloudflare-Pages-specific mechanism) provides this second deployment target zero
protection. Confirmed this is a real, currently-configured GitHub Actions workflow (not
speculative) by reading it directly. **GitHub Pages' actual current public reachability could not
be independently confirmed from this session** -- network egress to `*.github.io` is blocked in
this sandbox (confirmed via a known-good control probe, `pages.github.com`, which also returned no
response -- a sandbox network restriction, not evidence the site itself is down). The founder
should independently confirm whether GitHub Pages was ever actually enabled for this repository.

**Fixed, two layers:**
1. **Cloudflare Pages (primary, request-time):** new `functions/_middleware.js`. This repo already
   proved Cloudflare Pages Functions run ahead of static-asset serving on this exact project
   (`functions/version.json.js`'s own header comment, describing the same precedence this fix now
   relies on) -- no build step exists for this repo at all (confirmed by that same file: "no build
   command is configured, matching this repo's 'no build step' doctrine"), so a request-time
   Function is the correct substitute for a build-time exclusion that has nothing to build against.
   Blocks `supabase/`, `GOVERNANCE/`, `tests/`, `scripts/`, `.claude/`, `.github/`, every internal
   top-level engineering doc (`CLAUDE.md` itself, `IBIS-MAP.md`, etc.), plus two further real
   findings from tracing the actual deployed file tree: `00_Phase1_Discovery/` and
   `dj-tube-prototype/` (a superseded, unlinked legacy prototype -- confirmed via grep that zero
   real pages link to it; the canonical DJ Tube product is `/riddim/dj/`), `docs/`, and
   `FTN_Master_Asset_Library_v1.0/` (CLAUDE.md's own standing rule: "reference boards -- never
   linked live" -- was, in fact, live). Every excluded path was verified to have zero inbound links
   from any shipped HTML/JS before being added, so the block cannot silently break a real route.
2. **GitHub Pages (build-time):** the workflow now `rsync`-excludes the identical path list into a
   staging directory before `upload-pages-artifact` -- a true build-time exclusion, the closest
   GitHub Pages equivalent since it has no request-time layer of its own.
3. **`_redirects` (Cycle 8's fix, preserved):** left in place and its own comment updated to note
   the Function as the new primary layer -- not removed, exactly as instructed ("preserve the
   working block as defense in depth").

**Real verification, not assumed:** the middleware was tested two ways. (1) A Node.js harness
directly invoking the real exported `onRequest(context)` function with a fake Cloudflare-shaped
context -- 21 blocked-path cases (including 3 case variants, a single-percent-encoded path, a
double-percent-encoded path decoded through 2 real iterations by hand-traced logic then confirmed
by execution, and a malformed-escape-sequence fail-closed case) and 12 real-public-route cases that
must never be blocked, all passing. (2) A REAL local Cloudflare Workers runtime via `wrangler pages
dev` -- confirmed the exact same 200/404 results against actual HTTP requests, not just the Node.js
simulation. (A transient "Workers runtime crashed unexpectedly" was hit twice during this local
verification and root-caused by disabling the middleware and reproducing a clean run without it --
confirmed to be local wrangler dev-server flakiness unrelated to the middleware's own code, since a
clean restart with the middleware present then passed all 8 real HTTP checks correctly and
consistently.)

**Tests:** `tests/deployment-artifact-audit.mjs` (new) -- keeps `functions/_middleware.js`'s
denylist and the GitHub Pages workflow's exclusion list from drifting apart (the exact failure mode
Cycle 8 itself was: one layer fixed, a second, real gap left silently open), and exercises the real
middleware function against every blocked case and public-route case above.

**Status: found a second, independent real exposure (GitHub Pages, completely unprotected) beyond
what Cycle 8 already fixed. Both deployment targets now have a real, tested block. Pending: commit,
push, deploy, and direct production verification (below).**

## Cycle 11 (2026-08-25) — free-tier auth hardening (no Supabase Pro)

Founder asked for the strongest free Supabase Auth protections available, explicitly ruling out
Pro-only leaked-password protection. Verified via a real web search (not assumed) that leaked-
password protection genuinely is Pro-and-above only on Supabase as of this pass.

**The actually-correct, codebase-specific free fix, not generic advice:** read `js/ftn-auth.js`
directly -- FTN Account's real sign-in surface is `auth.signInWithOtp` (magic-link/OTP email) and
`auth.signInWithOAuth` only; a sitewide grep confirms zero use of `auth.signInWithPassword` or any
password-collecting sign-up form anywhere in this repo. Leaked-password protection exists to guard
a password-acceptance path FTN's own app never exposes. The real, zero-cost, zero-code-change
mitigation: confirm the Email+Password provider is **disabled** in Supabase Dashboard →
Authentication → Providers (Supabase's own GoTrue API accepts whatever providers are enabled
regardless of what the app's UI calls -- an unused-by-the-UI path is not the same as a disabled
one). This has zero functional impact on any real FTN Account flow.

**A second real finding, correctly NOT actioned this pass:** Supabase Auth's native CAPTCHA/bot-
abuse protection supports Cloudflare Turnstile directly, and FTN already has a live Turnstile
integration (the `/contact/` form) whose keys could in principle protect the OTP endpoint too, at
zero new cost. Checked whether this is safe to simply enable: it is not. `js/ftn-auth.js`'s
`signInWithEmail()` calls `c.auth.signInWithOtp(...)` with no `options.captchaToken` at all --
enabling the Dashboard toggle today would make every real sign-in attempt fail immediately, a real
interaction confirmed by reading the actual call, not a theoretical caveat. Flagged as a real,
concrete next security task (add a Turnstile widget to `/account/`'s sign-in form, wire its token
through `signInWithOtp`'s `options.captchaToken`, then enable the toggle) -- not attempted this pass
per "no speculative redesign" and the real risk of breaking sign-in by sequencing it wrong.

**Status: two real, codebase-specific findings delivered (one immediately actionable at zero cost
and zero risk, one correctly deferred with the exact reason and the exact next step). No Supabase
Pro recommended, as instructed.**
