# IBIS Acceptance Baseline

This is the single committed source of truth for IBIS functional-release readiness. Future
checkpoints update this document in place — do not create additional scattered status files.
Generated per-run artifacts (`test-results/ibis-acceptance/<run-id>/`) remain gitignored; this
file is a sanitized, stable summary derived from them, with no credentials, personal data,
screenshots or machine-local paths.

Controlling test: `tests/ibis-investor-readiness.mjs` (the one authoritative acceptance runner).

## Latest checkpoint

- **Commit**: (this checkpoint -- see revision history below)
- **Parent checkpoint**: `1e034ae`
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
| Reasoning engine execution | PASS (Founder Thinking, Correlation, Butterfly, Prediction, Context Graph, Connection Fabric — 6 of 11); **FAIL** (remaining 5: EBR, EcoMap Place/Pathway/Relationship, Multi-Agent) | L1 |
| Capability truth | PASS (matrix assembled) | L1 |
| Regular IBIS UX | PASS (core suites); NOT_RUN (viewport matrix, accessibility) | L1/L2 |
| Headspace UX | PASS (controls suite) | L2 |
| User confidence / honest degradation | PASS | L1 |
| Security / zero-cost | PASS (code-level); not live-verified (RLS) | L1 |

## Confirmed failures

- **Reasoning engines (Gate 4), 5 of 11 remaining unported**: EBR, EcoMap (Place/Pathway/
  Relationship), and Multi-Agent Orchestrator are not invoked by the canonical server path
  (`supabase/functions/_shared/ibis-canonical-brain.ts`). EBR has no file or methodology under
  that name anywhere in this repo; the EcoMap sub-modes do not exist under that name at all
  (`js/ibis-relationship-epistemics.js` is the closest candidate for EcoMap Relationship, but is
  not claimed as satisfying it -- see the reconciliation note below); Multi-Agent Orchestrator is
  real and separate but depends on browser-only `FTN.Auth`/`PermissionLedger`/`UniversalRouter`
  plus Supabase persistence, unassessed for portability. Module presence and existing browser-only
  test suites for them are explicitly not accepted as proof of canonical execution. See the
  contract-map header comment in `supabase/functions/_shared/ibis-reasoning-engines.ts` for the
  specific reason each one is not yet ported.
- **Reconciliation note (this checkpoint): the prior "8 of 10 unported" count was internally
  inconsistent.** The prior checkpoint's own prose named 9 distinct unported items (EBR + 3 EcoMap
  sub-modes + Butterfly + Prediction/Foresight + Context Graph + Connection Fabric + Multi-Agent),
  while `tests/ibis-investor-readiness.mjs`'s machine-checked `UNPORTED_REASONING_ENGINES` array had
  only 8 entries and silently omitted `CONNECTION_FABRIC` -- which also had no `ReasoningMode`/
  `QueryClass` enum slot in `ibis-response-envelope.ts` at all until this checkpoint, so it could not
  even be reported `executed:false`. Both are fixed this checkpoint. The correct total is 11 distinct
  reasoning capabilities (treating each EcoMap sub-mode separately, matching how they are separately
  enumerated in `ReasoningMode`), not 10.
- **Founder Thinking, Correlation, Butterfly, Prediction/Foresight, Context Graph and Connection
  Fabric are now genuinely connected** (see "Reasoning engines connected this checkpoint" below) —
  this is a correction from the prior checkpoint, not a new regression.

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
- **Butterfly**: exact port of `js/ibis-butterfly-engine.js`'s `clamp`/`effectValue`/`value`/`chain`
  (`runButterfly()` in `ibis-reasoning-engines.ts`) — its formula matches
  `GOVERNANCE/IBIS_FOUNDER_COGNITIVE_LAYER.md`'s `B(a) = Sum[ P(E_k|a) . V(E_k) . D_k ]` exactly,
  the strongest source-fidelity case of the six. Invoked for `FOUNDER_STRATEGY`-classified queries.
  The original's `record()` (append to the browser-only Founder Cognitive Layer ledger) is NOT
  ported, same reason as Founder Thinking's ledger. No structured action+effects data source is
  wired into the canonical brain yet for a free-text query, so it honestly reports
  `executed:false`/`SKIPPED` for ordinary text — proven genuinely connected (not dead code) by a
  dedicated Deno test supplying real structured effects and asserting the exact numeric output.
- **Prediction/Foresight**: exact port of `js/ibis-foresight-engine.js` (`daysUntil`/`priority`/
  `fromOpportunity`/`fromRelationship`/`generate`, plus an internal port of
  `js/ibis-relationship-epistemics.js`'s `classify()`/`describe()` used only as fromRelationship()
  support logic, not exposed as its own EcoMap Relationship claim). The contract's `PREDICTION`
  `ReasoningMode` name maps to this Foresight file — no separate "Prediction" module exists
  anywhere in the repo. `probabilitiesEstimated:false` is hardcoded, matching the original's
  never-invent-a-probability discipline. Honestly `SKIPPED` for ordinary text (no reviewed-
  opportunity/relationship data source wired in yet); genuinely executes given real structured
  input, including correctly dropping an expired-deadline opportunity rather than reporting it as
  still actionable (both proven by dedicated Deno tests).
- **Context Graph**: adapted port of `js/ibis-context-graph.js`'s `Graph` class (`addNode`/
  `addEdge`/`neighbors`/`findNodes`/`toJSON`) and `explainConnection()` — exact node/edge/key
  semantics, including edge deduplication, proven by a dedicated Deno test. The original's
  `fromRegistries()` depends on the browser-only `FTN.NodeRegistry` for dependency edges, which is
  not available server-side, so this adapter builds a **nodes-only** graph from the request's own
  `IbisProduct[]` list instead, honestly disclosing the missing edge data rather than fabricating
  the full browser graph. Unlike Butterfly/Prediction, this **genuinely executes** (not just
  invoked-then-skipped) on ordinary `FOUNDER_STRATEGY` and `RELATIONSHIP` queries, since the
  product list is always available — proven live by the primary benchmark run below.
- **Connection Fabric**: port of `js/ibis-connection-fabric.js`'s `ORDER` array and static
  `connectionPlan()` (exact `DIRECT -> MCP -> ACTIVEPIECES -> NANGO -> REST` order, proven by a
  dedicated Deno test). Was previously **missing from the `ReasoningMode`/`QueryClass` contract
  entirely** (no enum slot existed to even report `executed:false`) — fixed this checkpoint,
  alongside a new `TOOL_ACTION_MARKERS` classifier regex in `ibis-intent-router.ts` (same
  previously-dead-code situation `CORRELATION` was in before it was wired) that routes
  "connect my X / integrate with X / link my X / sync my X" requests to a new reachable
  `TOOL_ACTION` query class. No connection gateway is registered anywhere server-side in this pass
  (the browser registers its own via `FTN.AppRegistry`), so it truthfully reports
  `NO_READY_CONNECTION_PATH` rather than fabricating a live route — proven by a live Deno
  integration test, which also confirms `MULTI_AGENT` is still honestly listed unavailable
  (Connection Fabric alone can report route readiness, but cannot execute a connected action).
- **Primary benchmark result** (exact prompt: "I want to build a free Caribbean platform that
  helps ordinary people discover opportunities, services and resources. I have limited capital.
  What should I build first, who must be involved, what relationships matter, and what could cause
  it to succeed or fail?", run live with a real 2-product `IbisProduct[]` list): classifies
  `FOUNDER_STRATEGY`; `FOUNDER_COGNITIVE_LAYER` executes with real structured findings (domain
  `FUNDING`, decision `PREPARE_NOW`, objective/path text from `FOUNDER_GUIDANCE`); `CONTEXT_GRAPH`
  executes ("Grounded FTN-product slice: 2 node(s) built from this request's own product list",
  honestly disclosing no dependency-edge data server-side yet); `BUTTERFLY` and `PREDICTION`
  correctly report `executed:false` with an honest reason (no structured effects/opportunity data
  in a free-text request); no engine is fabricated as executed. This is a **partial** pass of the
  full benchmark spec — EBR, EcoMap and Multi-Agent are also expected by the benchmark and remain
  unported, so the benchmark is not fully satisfied end-to-end.

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
Deno suite (`supabase/functions/_shared/*.test.ts`, now including the new
`ibis-reasoning-engines.test.ts`), `ibis-ux-release.mjs`, `ibis-behavioral-ux-acceptance.mjs`,
`ibis-headspace-controls-audit.mjs`.

## Revision history

- (this checkpoint, 2026-09-16): reasoning-engine connection slice 2. Ported Butterfly, Prediction/
  Foresight, Context Graph and Connection Fabric to the canonical server path (6 of 11 reconciled
  engines now genuinely connected — see the reconciliation note above correcting the prior "8 of
  10" inconsistency). Added `CONNECTION_FABRIC` to the `ReasoningMode`/`QueryClass` contract (was
  previously missing entirely) and a new reachable `TOOL_ACTION` classifier path. 13 new Deno unit
  tests (`ibis-reasoning-engines.test.ts`) plus 3 new canonical-brain integration tests; full shared
  Deno suite (71 tests) passes. EBR and EcoMap Place/Pathway/Relationship deliberately NOT
  implemented this slice — no methodology source was found in the repository; a Google Drive
  connector was unavailable in the working session (confirmed via `session_connectors_status` and a
  full deferred-tool search); pending founder-supplied source material before proceeding, to avoid
  inventing missing methodology.
- `1e034ae` (2026-09-16): durability hardening + canonical reasoning connection. Fallback
  lease/fencing correction (leaseOwner/leaseVersion/leaseExpiresAt/attemptCount, atomic
  claim/finalize, deterministic tests for long-provider-call/active-lease/crash-reclaim/fencing
  scenarios). Founder Thinking and Correlation genuinely connected to the canonical server path
  (2 of 10 requested engines — remaining 8 explicitly NOT_PORTED, not fabricated). Primary
  reasoning benchmark run live and recorded above. Acceptance runner's Gate 4 updated in place to
  reflect the two connected engines without rebuilding the runner.
- `5fc5297` (2026-09-16): initial baseline. Crash-recovery/lease bug found and fixed while
  building the required test (completed fallbacks were never finalized to a terminal state).
