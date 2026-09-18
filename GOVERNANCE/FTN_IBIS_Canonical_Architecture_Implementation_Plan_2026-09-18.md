# FTN / IBIS Canonical Architecture — Implementation Plan

Companion to `FTN_IBIS_Canonical_Architecture_2026-09-18.md` (the frozen target architecture,
accepted 2026-09-18). This document answers the question that doc deliberately leaves open:
**in what order does the current codebase actually get there, with what risk at each step, and
what proves each step is safe before the next one starts.**

**Status: DRAFT — for review. No code in this plan has been written. Each phase below is scoped so
it can be approved and executed independently; approving this document does not pre-approve every
phase, only the sequencing and the safety discipline each phase must meet.**

## Ground rules carried from this session's own established discipline

- Every phase ships additive/shadow-mode first wherever the target document's own risk allows it —
  new fields/contracts populated and logged into the receipt before anything reads and branches on
  them. A phase earns the right to actually gate behavior only after its shadow-mode output has been
  compared against real traffic.
- The full shared Deno suite (259 tests as of this plan) must stay green after every phase, with new
  tests added for new behavior — never a test weakened or skipped to make a phase pass.
- Every phase that touches search, evidence, or answer text gets a before/after live benchmark
  (same pattern as `tests/ibis-quality-benchmark.mjs` and
  `tests/ibis-search-quality-gate-live-acceptance.mjs`), not just unit tests — this codebase has
  already proven once this session that a clean test suite and a real production bug can coexist.
- No phase changes a model ID, credential, or provider-health code as a side effect of a refactor.
- Governance doc updated at the end of each phase with what shipped, what was measured, and what
  remains open — the same honest-disclosure pattern used throughout `FTN_Quality_Pass_2026-09-18.md`
  and `FTN_Search_Quality_Gate_2026-09-18.md`.

## Current-state inventory (what exists today, so each phase's diff is legible)

- `ibis-intent-router.ts`: `classifyIntent()` → `queryClass` (single primary class) + `signals`
  (freshness, durability, etc.) + `objective`.
- `ibis-canonical-brain.ts`: `handleCanonicalRequest()` — the sole orchestrator. Computes
  `freshnessRequired = queryClass === "CURRENT_WEB_RESEARCH"` as a single boolean. Calls
  `planCapabilities()` (rule-based, additive), then `runSearch()`, then `runOrchestration()`
  (the scheduler), then `buildReasoningSynthesisPacket/Block()`, then `runGateway()` for the
  answer, then `buildEnvelope()`.
- `ibis-search-adapter.ts`: transport cascade (cache → dedup → budget → circuit → SearXNG fanout →
  Claude Web Search → Brave) plus, as of today, `evaluateSearchResultQuality()` gating — scoped
  narrowly to `freshnessRequired` queries only (see `FTN_Search_Quality_Gate_2026-09-18.md`).
- `ibis-search-quality-gate.ts`: today's freshness/relevance scorer — the seed of the future
  Evidence Processor, deliberately kept narrow per this pass's own scoping note.
- `ibis-reasoning-engines.ts` / `ibis-founder-lenses.ts` / `ibis-reasoning-synthesis.ts`: the
  specialist engines and the founder lenses (Truthmode, Red Team, Pareto, FutureYou, Value Lens,
  Lindy, Caribbean lens), composed into one text block fed to the synthesis model.
- `ibis-multi-agent-orchestrator.ts`: the dependency-aware execution scheduler, currently exposed
  to the receipt as capability `MULTI_AGENT`, selected whenever `capabilityPlan.length >= 2`
  (`ibis-canonical-brain.ts:230`).
- `ibis-intelligence-gateway.ts`: `runGateway()` — cost-ordered provider cascade
  (Cloudflare → Anthropic → Gemini → OpenAI-compatible → Ollama) with its own circuit breaker,
  independent of the search circuit breaker.
- `ibis-response-envelope.ts`: `CanonicalResponse` type, `QueryClass`, `ReasoningModeRecord`,
  `CapabilityReceiptEntry`, `CapabilityKind`, `SourceRecord` (re-exported from
  `ibis-search-types.ts`).
- `SourceRecord.evidenceDepth` is permanently `"SNIPPET"` — no Retrieval Adapter / page-fetch stage
  exists anywhere in the codebase today.

---

## Phase 0 — already shipped (baseline for this plan)

Search Quality Gate (`ibis-search-quality-gate.ts`, commit `9c20135`): a narrow,
freshness-scoped retrieval-hygiene patch living inside `ibis-search-adapter.ts`. Explicitly scoped
by its own header comment as the seed of the future Evidence Processor (§16 of the architecture
doc), not a competing design. Nothing in this plan reverts or duplicates it — Phase 4 below
graduates it.

---

## Phase 1 — `RequestFrame` type, additive only, zero behavior change

**Goal**: give every other phase a stable shape to target, before anything depends on it.

- New `ibis-request-frame.ts`: defines the `RequestFrame` type (entities, geography, a first-cut
  `temporalRequirement`, taskType, outputNeed, riskLevel) and one pure function,
  `buildRequestFrame(text, intent, context)`, that **derives** it entirely from what
  `classifyIntent()` and existing resolvers already produce. No new resolution logic yet — this
  phase is a re-typing/restructuring exercise, not new intelligence.
- `ibis-canonical-brain.ts` calls it once per request and attaches the result to the response
  envelope as a new, optional, additive field (`requestFrame`) purely for observability. Nothing
  branches on it.
- **Risk**: effectively zero — a new field nothing reads.
- **Exit criteria**: unit tests confirming correct derivation across every existing `QueryClass`;
  envelope carries the field; all 259 existing tests unchanged and green; `deno check` clean (same
  single pre-existing unrelated error, no new ones).

## Phase 2 — `temporalRequirement` replaces the binary `freshnessRequired`, backward-compatibly

**Goal**: the architecture doc's explicit ask — replace a single boolean with
`{ type, start, end, relativeExpression, strictness }` — without breaking anything that already
reads `freshnessRequired`.

- Extend `RequestFrame`'s `temporalRequirement` with real classification (today / this week / this
  month / "as of" a stated date / historical / timeless), built from the same freshness signal
  `ibis-intent-router.ts` already detects, plus new granularity work.
- `freshnessRequired: boolean` is kept everywhere it's consumed today
  (`ibis-search-adapter.ts`, `ibis-search-quality-gate.ts`, `ibis-canonical-brain.ts`), now computed
  as `temporalRequirement.strictness !== "none"` — a derived, backward-compatible value. Every
  existing test and call site keeps working unchanged.
- New, additive: `evaluateSearchResultQuality()` optionally accepts the richer
  `temporalRequirement` and can tighten/loosen its recency thresholds accordingly (e.g. "today"
  stricter than "this month") — additive parameter, old callers passing only `freshnessRequired`
  keep working via a default.
- **Risk**: low — the only behavior change is optional threshold tuning, and only when the new
  parameter is actually passed.
- **Exit criteria**: new unit tests for `temporalRequirement` classification across representative
  phrasings; existing quality-gate tests unchanged and green; a live spot-check confirming
  today/this-week/this-month queries get materially different internal strictness without any
  change to the user-visible answer contract.

## Phase 3 — CEBOS evidence contract, shadow mode

**Goal**: build the "what would count as proof, before we retrieve" contract the architecture doc
calls for, and prove it agrees with reality before it gates anything.

- New `ibis-evidence-contract.ts`: `buildEvidenceContract(requestFrame)` — pure function producing
  required evidence classes, minimum sufficiency, and permitted claim types for a request.
- Attached to the `RESEARCH` capability's receipt as a **logged, non-blocking** field. Retrieval
  and synthesis behave exactly as they do today; nothing consumes the contract's output yet.
- **Risk**: zero to behavior, non-zero to scope creep — this is the phase most likely to balloon if
  not kept strictly to "log, don't gate."
- **Exit criteria**: contract present on every RESEARCH receipt for a full benchmark run; a manual
  or scripted comparison of contract predictions against what was actually retrieved, to sanity
  check the module's real-world accuracy before Phase 4 lets it matter.

## Phase 4 — Evidence Processor extraction (graduates the Search Quality Gate)

**Goal**: implement the architecture doc's explicit §16 instruction — move relevance/sufficiency
judgment out of `ibis-search-adapter.ts` and into its own stage, producing a real `EvidencePacket`
and `ClaimsLedger` (`VERIFIED / CORROBORATED / SUPPORTED_INFERENCE / HYPOTHESIS / CONTRADICTION /
UNKNOWN` per claim), generalized beyond just freshness-required queries.

- New `ibis-evidence-processor.ts` absorbs and generalizes today's
  `evaluateSearchResultQuality()` logic (temporal/topical/entity/authority scoring — see
  `FTN_Search_Quality_Gate_2026-09-18.md` for the exact signals and the two real calibration bugs
  already found and fixed there: the neutral-baseline credit for undated primary sources, and the
  hard entity-mismatch ceiling). `ibis-search-adapter.ts`'s in-cascade gate narrows back down to
  pure transport-level junk-result rejection, per the doc's KEEP/MOVE-OUT split.
  `ibis-canonical-brain.ts` calls the new processor once, after `runSearch()` returns, using the
  evidence contract from Phase 3 as its sufficiency bar.
- `evidenceState` mapping (`SEARCH_GROUNDED` / `DEGRADED` / etc.) stays unchanged at the response
  envelope level in this phase — only the internal reasoning that produces it changes, so this is
  the highest-value, medium-risk phase without also being a response-contract change.
- **Risk**: medium — this is a real move of load-bearing logic between two modules, with a currently
  working, live-verified implementation (0 stale/irrelevant-evidence regressions since deploy) at
  stake. Must not regress the exact 2018/2019-report bug shape this session already fixed.
- **Exit criteria**: all 7 existing quality-gate tests migrate to the new module with identical
  assertions; new `ClaimsLedger` unit tests; the full 6-query live acceptance suite
  (`tests/ibis-search-quality-gate-live-acceptance.mjs`) re-run with an equal-or-better pass rate;
  full Deno suite green.

## Phase 5 — Retrieval Adapter (bounded real page fetch)

**Goal**: close the SNIPPET-only gap the architecture doc names directly (`evidenceDepth` is
permanently `"SNIPPET"` today).

- New, explicitly bounded fetch-and-extract step: for a small, fixed top-N of sources (start at 2)
  on `CURRENT_WEB_RESEARCH`-class queries only, fetch the real page, extract the relevant text, and
  upgrade `evidenceDepth` to `"INSPECTED"` on success. Any fetch failure, timeout, or
  paywall/blocked response degrades gracefully back to `"SNIPPET"` — never blocks the response.
- **This is the largest, costliest, and riskiest phase in this plan**: new outbound network calls
  per request, new latency budget, new failure surface, and real per-request cost. It should ship
  behind an explicit feature flag, default OFF, measured on latency/cost/evidence-quality lift over
  a real observation window before any default-on decision — a decision for the founder, not an
  engineering judgment call.
- **Exit criteria**: feature-flagged, off by default; a dedicated before/after benchmark comparing
  answer quality (using this session's own quality-gate scoring as one signal) with the flag on vs.
  off; an explicit cost/latency report before recommending default-on.

## Phase 6 — Release Validator, shadow mode first

**Goal**: a deterministic, post-synthesis check comparing the drafted answer's claims against the
Claims Ledger, plus a formalized framework-leak scan — replacing the current purely prompt-level
self-restraint (`FOUNDER_REASONING_INSTRUCTION`'s "never name a lens conversationally" instruction,
fixed this session) with a structural, code-level check.

- New `ibis-release-validator.ts`. Starts in **log-only** mode: flags claim-support gaps,
  temporal-compliance issues, and framework-leak matches into the receipt, never blocking or
  rewriting the answer. Graduates to one bounded revision-or-withhold only once its false-positive
  rate is measured acceptable on real traffic.
- **Risk**: low in shadow mode; the graduation step (actually blocking/revising) is its own
  follow-up decision, not bundled into this phase.
- **Exit criteria**: validator findings logged on every response for a full benchmark run; a
  reviewed false-positive rate before any decision to let it actually gate a response.

## Phase 7 — Split `MULTI_AGENT` (scheduler) from true Multi-Agent deliberation

**Goal**: the architecture doc's explicit correction — stop implying deliberation happened when
only dependency scheduling did.

- Keep `ibis-multi-agent-orchestrator.ts`'s scheduler exactly as-is (it's genuinely useful
  infrastructure), but change what the receipt calls it — a scheduler-only run should not read as
  "Multi-Agent reasoning executed" to anyone inspecting the receipt or a future investor-facing
  surface.
- Add a real, separately-triggered `MULTI_AGENT_DELIBERATION` capability gated on the architecture
  doc's explicit criteria (competing hypotheses, high consequence, genuinely cross-domain, explicit
  red-team need) — bounded to 2–4 agents, same evidence packet, disagreement extraction before
  final synthesis.
- **Risk**: low for the rename/relabel; low-medium for the new deliberation capability, which is
  net-new behavior and should get its own dedicated test suite before shipping.
- **Exit criteria**: receipt language audit (no response implies deliberation when only scheduling
  ran); new deliberation capability has its own trigger tests and at least one live demonstration.

## Phase 8 — Explicit `MODEL_TEXT_STANDARD` vs `MODEL_TEXT_REASONING` routing

**Goal**: stop letting the Decision Gate's synthesis-model choice be an accident of the gateway's
cost-ordered fallback cascade.

- Decision Gate assigns a `synthesisRoute` field on `RequestFrame` (STANDARD vs REASONING) based on
  task complexity/consequence, per the architecture doc's routing table.
- `ibis-intelligence-gateway.ts`'s existing cascade becomes the **within-tier** fallback only — a
  REASONING-routed request that hits a provider failure falls to another reasoning-capable
  provider, never silently down to the standard tier's cheaper model.
- **Risk**: medium — changes which provider actually answers certain requests, with real
  cost/latency/quality tradeoffs. Needs a before/after quality comparison specifically on the
  strategic/founder-style queries this is meant to protect.
- **Exit criteria**: routing decision logged and testable; a benchmark comparing answer quality on a
  fixed set of strategic queries before/after this phase.

## Phase 9 — Conditional Founder Cognitive Layer (structural, not just instructional)

**Goal**: the architecture doc's explicit "that should not remain canonical" — the Founder
Reasoning instruction currently reaches every request via `BASE_INSTRUCTION`, relying entirely on
the model's own prompt-level self-restraint (strengthened this session, but still instructional,
not structural).

- Decision Gate sets an explicit `fclMode: "ON" | "LIGHT" | "OFF"` on `RequestFrame`, per the query
  classes named in the architecture doc's §8.
- The Founder Reasoning instruction text is only **attached** to the system prompt when
  `fclMode !== "OFF"` — shrinking the system prompt for ordinary factual/current-event questions
  structurally, rather than asking the model to ignore instructions that are always present.
- **Risk**: medium — this changes the system prompt shape for a large fraction of real traffic, so
  needs the same "no framework leak, no regression on strategic answers" verification this session
  already applied to the instructional version.
- **Exit criteria**: `tests/ibis-founder-reasoning-instruction-audit.mjs`-style regression coverage
  for the new structural gate; live spot-check confirming ordinary questions get a materially
  shorter system prompt and strategic questions still get full FCL treatment.

---

## What this plan deliberately does not schedule yet

Full Caribbean Entity Resolver and Regional Source Authority Registry (architecture doc §7),
Connection Fabric/Permission Ledger formalization (§10, §14 Action route), and per-engine
input-sufficiency hardening for Correlation/Butterfly/Prediction (§11) are real, named gaps in the
target architecture but are not sequenced here — they depend on Phases 1–4 landing first
(a stable `RequestFrame`/`EvidencePacket` to build against) and should be scoped in a follow-up
addendum once this plan's early phases have real production evidence behind them, not planned in
the abstract now.

## Recommended immediate next step

Phase 1 only: it is additive, testable, low-risk, and gives every later phase (including the ones
not yet scheduled) a stable type to target. Recommend implementing and shipping Phase 1 in isolation
before scoping Phase 2 in more detail — consistent with this plan's own "prove each step before the
next" discipline.
