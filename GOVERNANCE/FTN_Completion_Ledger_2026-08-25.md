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
