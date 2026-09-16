# IBIS Acceptance Baseline

This is the single committed source of truth for IBIS functional-release readiness. Future
checkpoints update this document in place — do not create additional scattered status files.
Generated per-run artifacts (`test-results/ibis-acceptance/<run-id>/`) remain gitignored; this
file is a sanitized, stable summary derived from them, with no credentials, personal data,
screenshots or machine-local paths.

Controlling test: `tests/ibis-investor-readiness.mjs` (the one authoritative acceptance runner).

## Latest checkpoint

- **Commit**: `PENDING` (see git log — updated immediately after this commit lands)
- **Branch**: `fix/ibis-canonical-outcome-intelligence`
- **Run date**: 2026-09-16
- **Readiness classification**: **LOCALLY_VERIFIED**

LOCALLY_VERIFIED means: every gate below that shows PASS is backed by real L1 (deterministic
local) or L2 (local integration/browser) evidence. No L3 (deployed preview) or L4 (production)
gate has run. Per the acceptance runner's own rule, L1/L2 success alone can never produce
PREVIEW_READY, INVESTOR_DEMO_READY or PRODUCTION_READY, regardless of how many local tests pass.

## Gate matrix

| Gate | Verdict | Evidence level |
|---|---|---|
| Canonical routing | PASS | L1/L2 |
| Durable lifecycle state | PASS (local contract); BLOCKED_EXTERNAL (real DB) | L1 / L3 |
| Real web search | PASS (adapter contracts only); BLOCKED_EXTERNAL (live provider) | L1 / L3-L4 |
| Reasoning engine execution | PASS (Founder Thinking, Correlation — 2 of 10); **FAIL** (remaining 8) | L1 |
| Capability truth | PASS (matrix assembled) | L1 |
| Regular IBIS UX | PASS (core suites); NOT_RUN (viewport matrix, accessibility) | L1/L2 |
| Headspace UX | PASS (controls suite) | L2 |
| User confidence / honest degradation | PASS | L1 |
| Security / zero-cost | PASS (code-level); not live-verified (RLS) | L1 |

## Confirmed failures

- **Reasoning engines (Gate 4), 8 of 10 remaining unported**: EBR, EcoMap (Place/Pathway/
  Relationship), Butterfly, Prediction/Foresight, Context Graph, Connection Fabric, and
  Multi-Agent Orchestrator are not invoked by the canonical server path
  (`supabase/functions/_shared/ibis-canonical-brain.ts`). Each remains browser-only, or (for the
  claimed EcoMap modules) does not exist under that name at all. Module presence and existing
  browser-only test suites for them are explicitly not accepted as proof of canonical execution.
  See the contract-map header comment in `supabase/functions/_shared/ibis-reasoning-engines.ts`
  for the specific reason each one is not yet ported.
- **Founder Thinking and Correlation are now genuinely connected** (see "Reasoning engines
  connected this checkpoint" below) — this is a correction from the prior checkpoint, not a new
  regression.

## Reasoning engines connected this checkpoint

- **Founder Thinking**: the browser-only `js/ibis-founder-cognitive-layer.js` is an append-only
  cognitive-event ledger requiring an authenticated browser session (`crypto.subtle` +
  `FTN.PersonalContext`) and was correctly NOT ported. The real per-query decision logic already
  lived server-side in `ibis-intelligence-gateway.ts`'s `founderDomain()`/`FOUNDER_GUIDANCE`
  (already used by the existing `founderReasoningAnswer()` prose fallback). This existing,
  already-real logic is now exposed as a structured `EngineResult`
  (`supabase/functions/_shared/ibis-reasoning-engines.ts`'s `runFounderThinking()`) and invoked
  from `ibis-canonical-brain.ts` for `FOUNDER_STRATEGY`-classified queries. No new reasoning was
  invented.
- **Correlation**: `js/ibis-correlation-engine.js` and its math kernel `js/ibis-math.js` were
  confirmed pure/DOM-free and exact-ported to `ibis-correlation-engine.ts` / `ibis-math.ts`.
  Invoked via `runCorrelation()` for queries matching a new, previously-dead `CORRELATION`
  `QueryClass` (a real marker regex was added to `ibis-intent-router.ts`, since no classifier path
  had ever reached that enum value before). Honestly reports `executed:false`/`SKIPPED` for
  ordinary free-text queries, since no time-series data source is wired into the canonical brain
  yet — this is disclosed, not claimed as full execution.
- **Behavioral proof**: `ibis-canonical-brain.test.ts`'s
  "outcome question classifies FOUNDER_STRATEGY, genuinely executes Founder Thinking, and lists
  deeper modes as unavailable" asserts `executed:true` with a real `contribution` string
  containing `Decision:`, and separately confirms `BUTTERFLY`/`PREDICTION` still honestly report
  `executed:false`. The primary reasoning benchmark (see below) was also run live and confirms the
  same behavior end-to-end through `handleCanonicalRequest()`.
- **Primary benchmark result** (exact prompt: "I want to build a free Caribbean platform that
  helps ordinary people discover opportunities, services and resources. I have limited capital.
  What should I build first, who must be involved, what relationships matter, and what could cause
  it to succeed or fail?"): classifies `FOUNDER_STRATEGY`; `FOUNDER_COGNITIVE_LAYER` executes with
  real structured findings (domain `FUNDING`, decision `PREPARE_NOW`, objective/path text from
  `FOUNDER_GUIDANCE`); `BUTTERFLY` and `PREDICTION` correctly report `executed:false` with an
  honest reason; no engine is fabricated as executed. This is a **partial** pass of the full
  benchmark spec — EBR, EcoMap, Prediction and Context Graph are also expected by the benchmark and
  remain unported, so the benchmark is not fully satisfied end-to-end.

## External blockers

- **Search**: no `BRAVE_SEARCH_API_KEY` and no `SEARXNG_BASE_URL` configured anywhere in this
  environment. Blocked until one of: a Brave Search account with a hard quota cap, or an
  FTN-controlled SearXNG endpoint.
- **Durable state (L3)**: no live Supabase project credentials available. The migration
  (`supabase/migrations/20260916120000_ibis_execution_receipts.sql`) is drafted and reviewed but
  not applied. Blocked until a specific Supabase **preview** project is confirmed and migration
  execution is authorized.

## Capability-truth clarification: video generation

- **Current public capability**: video generation is not offered or enabled anywhere in the
  live public UI (zero references in `ibis-ai/index.html` or `ibis-headspace-preview/index.html`;
  no capability-registry entry for video is `ENABLED`).
- **Target investor capability**: founder decision pending. This line exists specifically so
  "not currently advertised" is never mistaken for "not an intended product requirement."
- Bytez remains classified **OPTIONAL** based on current public UI/registry evidence. Its
  production auth failure is a real, separate item (see prior checkpoint `1b0ec05`'s report) and
  is not being repaired in the reasoning-connection slice.

## Tests used (reused, not duplicated)

`ibis-canonical-routing-behavioral.mjs`, `ibis-local-ai-planner-gate-behavioral.mjs`,
`ibis-routing-consolidation-audit.mjs`, `ibis-headspace-universal-routing-audit.mjs`, the shared
Deno suite (`supabase/functions/_shared/*.test.ts`), `ibis-ux-release.mjs`,
`ibis-behavioral-ux-acceptance.mjs`, `ibis-headspace-controls-audit.mjs`.

## Revision history

- `PENDING` (2026-09-16): durability hardening + canonical reasoning connection. Fallback
  lease/fencing correction (leaseOwner/leaseVersion/leaseExpiresAt/attemptCount, atomic
  claim/finalize, deterministic tests for long-provider-call/active-lease/crash-reclaim/fencing
  scenarios). Founder Thinking and Correlation genuinely connected to the canonical server path
  (2 of 10 requested engines — remaining 8 explicitly NOT_PORTED, not fabricated). Primary
  reasoning benchmark run live and recorded above. Acceptance runner's Gate 4 updated in place to
  reflect the two connected engines without rebuilding the runner.
- `5fc5297` (2026-09-16): initial baseline. Crash-recovery/lease bug found and fixed while
  building the required test (completed fallbacks were never finalized to a terminal state).
