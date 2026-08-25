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
