# Multi-Agent Orchestration source and boundary note

## What the browser implementation is

`js/ibis-multi-agent-orchestrator.js` (29 lines) is a ROLE-PLAYING, PERMISSION-GATED,
EXTERNAL-ACTION orchestrator:

- Five named roles (`STRATEGY`/`ENGINEERING`/`MARKETING`/`COMMS`/`OPS`, plus `GENERAL`), each with a
  fixed "mission" string used to build an LLM prompt per role.
- `buildPlan()` calls `FTN.UniversalRouter.route()` to decide which roles apply and what
  `capabilityCandidates`/`operations`/`sideEffect` classification the goal implies, then builds one
  task per role.
- `execute()` runs tasks **sequentially**, and for any task classified `sideEffect: 'EXTERNAL'`,
  calls `FTN.PermissionLedger.check()` and refuses to run it without an `ALLOW` decision --
  otherwise the task is left `WAITING_PERMISSION`.
- Each task is executed via `requestCapability()`, which calls `FTN.HeadspaceFabric.request()` or
  `FTN.IbisClient.request()` -- the browser's own capability-routing surface (real LLM/tool calls,
  including `FTN.ConnectionFabric`/`FTN.AppRegistry` for external connected-app side effects).
- Runs and tasks are persisted to Supabase (`ibis_execution_runs`/`ibis_agent_tasks`) through the
  **browser's own authenticated client** (`FTN.Auth.ready()`), scoped by the signed-in user's RLS
  policies -- there is no service-role equivalent of this table pair server-side.

## What is portable

- The **general shape** of a run/task state machine (`PLANNED` → `RUNNING` → `COMPLETED`/`FAILED`,
  plus a permission-blocked state) is a reasonable pattern to reuse -- not literal code, since the
  server has no permission ledger or external-action authority to gate on.
- The **idea** of coordinating several specialist capabilities toward one goal, with one shared
  plan, is what this checkpoint's server-side scheduler implements -- but built new, over the
  canonical brain's own already-real, already-portable reasoning engines (Founder Thinking,
  Correlation, Butterfly, Prediction/Foresight, Context Graph, Connection Fabric, EBR, EcoMap
  Place/Pathway/Relationship), never the browser's role-prompt/LLM-dispatch model.

## What is NOT portable, and why

- **`FTN.Auth` / `FTN.PermissionLedger`**: real user-authentication and a real ALLOW/ASK/DENY
  authority over side-effecting actions. The server has no equivalent authority. Fabricating one
  (e.g., auto-approving external actions server-side) would be inventing permission the founder
  never granted -- explicitly out of scope.
- **`FTN.UniversalRouter`**: browser-side capability/agent routing over a different, richer
  capability surface (image generation, connected apps, etc.) than the canonical brain's fixed set
  of reasoning engines. Not reproduced; the canonical brain already has its own real classifier
  (`ibis-intent-router.ts`) and capability planner (`planCapabilities()` in `ibis-canonical-brain.ts`).
- **`FTN.HeadspaceFabric` / `FTN.IbisClient` / `FTN.ConnectionFabric` / `FTN.AppRegistry`**: the
  browser's live capability-dispatch and connected-app-invocation surface. The server-side
  Connection Fabric adapter (`runConnectionFabric()`) already honestly reports
  `NO_READY_CONNECTION_PATH` because no such gateway is registered server-side -- this checkpoint
  does not change that, and does not grant the new scheduler any new external-action capability.
- **`ibis_execution_runs` / `ibis_agent_tasks` Supabase tables**: written through the browser's own
  RLS-scoped client. No equivalent server-side (service-role) persistence is introduced this
  checkpoint -- the scheduler's receipts are returned in the canonical response envelope itself
  (`capabilityExecution`), using the SAME durable lifecycle store (`ibis-lifecycle-store.ts`)
  already used for plan/receipt durability, not a new table.

## What "Multi-Agent Orchestration" means server-side, this checkpoint

This checkpoint's `MULTI_AGENT` capability is a **new, internal, read-only, dependency-aware
execution scheduler** (`supabase/functions/_shared/ibis-multi-agent-orchestrator.ts`) over the
EXISTING canonical reasoning engines. It:

- decides the ORDER in which already-real engines run, based on a fixed, documented dependency
  graph (research → normalized evidence → EBR/EcoMap; EcoMap Place → Context Graph/Prediction;
  EcoMap Pathway → Butterfly; a valid numeric series → Correlation);
- never issues a new provider/LLM call of its own -- every reasoning engine it schedules is a pure,
  synchronous, zero-cost function (confirmed: none of `runFounderThinking`/`runCorrelation`/
  `runButterfly`/`runPrediction`/`runContextGraph`/`runConnectionFabric`/`runEBR`/
  `runEcoMapPlace`/`runEcoMapPathway`/`runEcoMapRelationship` perform I/O); the only two real I/O
  calls in the whole request (search, and the final answer-generation provider call) are unchanged
  and still happen at most once each;
- never gains external-action authority -- it cannot send a message, invoke a connected app, or
  take any side-effecting action. That capability remains genuinely absent server-side and is
  disclosed through Connection Fabric's own `NO_READY_CONNECTION_PATH` finding, not through a
  separate "MULTI_AGENT unavailable" record (see the reconciliation note in
  `docs/ibis/acceptance-baseline.md`: the two are DIFFERENT capabilities that happened to share one
  enum name in the browser-only era; this checkpoint's `MULTI_AGENT` is scoped exclusively to
  internal reasoning-engine scheduling).
- produces one complete execution receipt per request (`capabilityExecution`), where every planned
  capability ends in exactly one terminal state (`EXECUTED`/`SKIPPED_MISSING_INPUT`/
  `SKIPPED_NOT_RELEVANT`/`SKIPPED_BUDGET`/`DEGRADED`/`UNAVAILABLE`/`FAILED`), with the transient
  `SELECTED`/`INPUT_READY` states recorded in that entry's own history, not silently dropped.

## Structured-input bridges added this checkpoint (and their honesty limits)

Two of the previously-always-`SKIPPED` conditional engines now have a REAL, disclosed,
non-fabricated path to genuine execution when EcoMap has already found something concrete:

- **Prediction/Foresight** ← EcoMap Place's `OPPORTUNITY`-kind entities: a real, retrieved
  opportunity (title + source URL, deadline `null` since no source states one) becomes a genuine
  `OpportunityMatch`. `probabilitiesEstimated:false` is preserved; the candidate's priority is
  honestly `WATCH` (no deadline data), never invented urgency.
- **Butterfly** ← EcoMap Pathway's steps/zero-cost alternatives: each step's `confidence` label
  (`CONFIRMED`/`INFERRED`/`CONDITIONAL`/`MISSING`/`UNKNOWN`) is mapped to a bounded
  `probability`/`strategicValue` through a **fixed, disclosed heuristic table**
  (`CONFIDENCE_TO_PROBABILITY`/`ZERO_COST_STRATEGIC_VALUE` in `ibis-multi-agent-orchestrator.ts`) --
  never a measured or predicted value. Every Butterfly result produced this way states the
  transformation and its provenance explicitly in `assumptions`, per the requirement that
  qualitative-to-bounded-category conversions must disclose themselves. Both engines remain
  `CONNECTED_CONDITIONAL` (not `CONNECTED_OPERATIONAL`): genuine execution still depends on EcoMap
  actually having found a matching entity/step, which is not guaranteed for every ordinary query.

No bridge was added for Correlation: no data source in this codebase produces a real numeric time
series from free text or from EcoMap output, and inventing one from qualitative language is
explicitly prohibited. Correlation remains reachable only via its existing advanced/internal input
(`CanonicalRequest.correlationInput`, added this checkpoint for interface symmetry with
`ebrInput`/EcoMap's advanced contexts).

## Acceptance boundary

Any test or acceptance-runner entry for `MULTI_AGENT` must confirm:

- it schedules the EXISTING engines in the documented dependency order, never inventing a new
  engine or a new provider call;
- it never claims or exercises external-action/connected-app authority;
- every capability in a request's plan ends in exactly one terminal execution state, with its full
  transition history retained in the receipt;
- Butterfly/Prediction's EcoMap-derived bridges disclose their heuristic transformation and
  provenance, and never invent precision for `P`/`V`/`D` or a probability;
- `MULTI_AGENT` is only added to a request's plan when 2+ other capabilities are already planned
  (i.e., when dependency-aware scheduling genuinely has something to order) -- never for a single-
  capability or zero-capability request;
- one execution-budget exhaustion or one engine throwing never crashes the whole request or
  silently fabricates a substitute result -- both produce an honest, labeled terminal state.

See `supabase/functions/_shared/ibis-multi-agent-orchestrator.test.ts` and the orchestration cases
in `ibis-canonical-brain.test.ts` for the tests that enforce this.
