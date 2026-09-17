# IBIS Acceptance Baseline

This is the single committed source of truth for IBIS functional-release readiness. Future
checkpoints update this document in place — do not create additional scattered status files.
Generated per-run artifacts (`test-results/ibis-acceptance/<run-id>/`) remain gitignored; this
file is a sanitized, stable summary derived from them, with no credentials, personal data,
screenshots or machine-local paths.

Controlling test: `tests/ibis-investor-readiness.mjs` (the one authoritative acceptance runner).

## Evidence terminology (corrected checkpoint `97322c7` → this checkpoint)

Every test and record in this document and in `tests/ibis-investor-readiness.mjs` that exercises
search uses one of these three, precise labels -- never the ambiguous phrase "real grounded
evidence," which a prior draft of this document used to describe fixture data:

- **`MOCK_SEARCH_FIXTURE`** -- a canned, hand-written response standing in for a search provider in
  a test, shaped like a realistic one so the adapter contract is genuinely exercised. There is no
  live network call.
- **`CONTRACT_GROUNDED`** -- the evidence level a `MOCK_SEARCH_FIXTURE` test proves: the
  orchestration contract (parsing, normalization, downstream engine wiring) behaves correctly GIVEN
  that shape of response. This proves L1/L2 behavior only -- nothing about production search
  availability, quality, or that any specific real-world fact is true.
- **`LIVE_SEARCH_GROUNDED`** -- reserved EXCLUSIVELY for a response produced by an actually
  configured production search provider (a real `BRAVE_SEARCH_API_KEY` or `SEARXNG_BASE_URL` that a
  real request was sent to and returned from). No test or record anywhere in this repository
  currently claims `LIVE_SEARCH_GROUNDED` -- see the `real_search` gate's `BLOCKED_EXTERNAL`
  entries. A `MOCK_SEARCH_FIXTURE` must never be reported as satisfying an L3/L4 production-search
  gate, and no change in this checkpoint alters that.

## Latest checkpoint

- **Commit**: (this checkpoint -- see revision history below)
- **Parent checkpoint**: `97322c7`
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
| Reasoning engine execution | PASS (10 of 11 connected: 3 `CONNECTED_OPERATIONAL` — Founder Thinking, Context Graph, Connection Fabric; 7 `CONNECTED_CONDITIONAL` — Correlation, Butterfly, Prediction, EBR, EcoMap Place, EcoMap Pathway, EcoMap Relationship); **FAIL** (remaining 1 `UNAVAILABLE`: Multi-Agent) | L1 |
| Capability truth | PASS (matrix assembled) | L1 |
| Regular IBIS UX | PASS (core suites); NOT_RUN (viewport matrix, accessibility) | L1/L2 |
| Headspace UX | PASS (controls suite) | L2 |
| User confidence / honest degradation | PASS | L1 |
| Security / zero-cost | PASS (code-level); not live-verified (RLS) | L1 |

## Confirmed failures

- **Reasoning engines (Gate 4), 1 of 11 remaining unported**: Multi-Agent Orchestrator is not
  invoked by the canonical server path (`supabase/functions/_shared/ibis-canonical-brain.ts`). It
  is real and separate but depends on browser-only `FTN.Auth`/`PermissionLedger`/`UniversalRouter`
  plus Supabase persistence, unassessed for portability. Module presence and existing browser-only
  test suites for it are explicitly not accepted as proof of canonical execution. See the
  contract-map header comment in `supabase/functions/_shared/ibis-reasoning-engines.ts` for the
  specific reason it is not yet ported.
- **Reconciliation note (checkpoint `4f637c2`): the "8 of 10 unported" count was internally
  inconsistent.** That checkpoint's own prose named 9 distinct unported items (EBR + 3 EcoMap
  sub-modes + Butterfly + Prediction/Foresight + Context Graph + Connection Fabric + Multi-Agent),
  while `tests/ibis-investor-readiness.mjs`'s machine-checked `UNPORTED_REASONING_ENGINES` array had
  only 8 entries and silently omitted `CONNECTION_FABRIC` -- which also had no `ReasoningMode`/
  `QueryClass` enum slot in `ibis-response-envelope.ts` at all until that checkpoint, so it could not
  even be reported `executed:false`. Both were fixed that checkpoint. The correct total is 11
  distinct reasoning capabilities (treating each EcoMap sub-mode separately, matching how they are
  separately enumerated in `ReasoningMode`), not 10.
- **Founder Thinking, Correlation, Butterfly, Prediction/Foresight, Context Graph, Connection
  Fabric, EBR (Evidence-Bounded Retrodiction) and EcoMap Place/Pathway/Relationship are now
  genuinely connected** (see "Reasoning engines connected this checkpoint" below) — this is a
  correction, not a new regression. Multi-Agent Orchestration was deliberately NOT implemented this
  pass, per instruction.

## Engine readiness classification

Per-engine operational readiness (`EngineReadiness` in `ibis-response-envelope.ts`), distinct from
what any single request's runtime outcome was. An engine is never reported `CONNECTED_OPERATIONAL`
merely because its adapter exists or because a test manually injected structured data.

| Engine | Readiness | Why |
|---|---|---|
| Founder Cognitive Layer | `CONNECTED_OPERATIONAL` | An ordinary outcome-building request already carries the request text itself, which is all `founderDomain()`/`FOUNDER_GUIDANCE` needs. |
| Context Graph | `CONNECTED_OPERATIONAL` | Grounded to the request's own `IbisProduct[]` list, always available. |
| Connection Fabric | `CONNECTED_OPERATIONAL` | A named connect-target is parsed directly from the request text itself. |
| Correlation | `CONNECTED_CONDITIONAL` | Genuine execution needs two real numeric time series; no data source produces these from free text yet. |
| Butterfly | `CONNECTED_CONDITIONAL` | Genuine execution needs structured action + effect data; none is produced from free text yet. |
| Prediction/Foresight | `CONNECTED_CONDITIONAL` | Genuine execution needs reviewed-opportunity/relationship data; none is produced from free text yet. |
| EBR | `CONNECTED_CONDITIONAL` | Evidence items are built server-side from grounded search results, but genuine mechanism-gated *causal admissibility* still needs a candidate causal history no automatic pipeline generates from free text. |
| EcoMap Place | `CONNECTED_CONDITIONAL` | Genuinely executes given grounded search evidence (auto-built server-side, same discipline as EBR), but that evidence is not guaranteed for an ordinary query -- absent it, honestly SKIPPED. Methodology: `PARTIAL / FOUNDER-AUTHORIZED` (see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md) -- a founder-authorized product contract, not externally validated. |
| EcoMap Pathway | `CONNECTED_CONDITIONAL` | Same evidence dependency as EcoMap Place; every auto-built step is `INFERRED`, never `CONFIRMED`. Methodology: `PARTIAL / FOUNDER-AUTHORIZED`. |
| EcoMap Relationship | `CONNECTED_CONDITIONAL` | Same evidence dependency; auto-built edges are a generic `POTENTIAL_REFERRAL`, never a specific fabricated relation type; sensitive/private edges are counted but never named in customer-facing text. Methodology: `PARTIAL / FOUNDER-AUTHORIZED`. |
| Multi-Agent Orchestrator | `UNAVAILABLE` | Real but browser-only (`FTN.Auth`/`PermissionLedger`/`UniversalRouter`); unassessed for server portability. Not implemented this pass, per instruction. |

## Composable capability plan (this checkpoint)

Corrects a canonical-planning gap: `RETRODICTION` was competing exclusively with
`CURRENT_WEB_RESEARCH` and every other query class, even though a real question routinely needs
several capabilities at once (e.g. "why has X happened, what evidence supports the possible
causes" needs research AND a bounded causal reconstruction AND a correlation check).

- `ibis-intent-router.ts`'s `classifyIntent()` now returns `signals: IntentSignals` -- every
  independently-matched marker (freshness, cause-evidence, retrodiction, correlation, tool-action,
  pathway, place, relationship, outcome) -- alongside the unchanged single `queryClass` (computed
  with the exact same priority order as every prior checkpoint, so legacy code reading only
  `queryClass` sees zero behavior change). New `CAUSE_EVIDENCE_MARKERS` detects an explicit
  evidence-behind-a-cause request ("evidence supports", "possible causes", "root cause",
  "contributing factors", "what evidence") -- independently triggers RESEARCH (even without a
  freshness marker) and, as a complementary check, CORRELATION.
- `ibis-canonical-brain.ts`'s new `planCapabilities(signals)` is the ONE place capability
  selection happens -- entirely server-side, entirely from these signals (a browser never sees or
  influences it) -- producing an additive `capabilityPlan: PlannedCapability[]`, now a first-class
  field on `CanonicalResponse` and `CanonicalReceipt` (`CapabilityKind`/`PlannedCapability` in
  `ibis-response-envelope.ts`). Every capability planned under the SAME condition a prior
  checkpoint's exclusive `queryClass ===` branch used for that engine is invoked identically to
  before for a single-signal query; only a MULTI-signal query now gets more than one capability
  (previously structurally impossible). No second orchestrator was created -- this is the same one
  canonical brain, extended.
- Search now runs whenever RESEARCH is planned, regardless of which single class won PRIMARY
  classification -- and always BEFORE any evidence-dependent reasoning (EBR) below it, so EBR can
  actually use grounded evidence (live in production once a provider is configured; a
  `MOCK_SEARCH_FIXTURE` in every test in this repo today) rather than requiring a caller to
  pre-fetch it.
- **EBR reachability for ordinary users**: new `buildEbrInputFromSources()` in
  `ibis-canonical-brain.ts` builds real `EvidenceItem[]` server-side directly from whatever sources
  were already retrieved for the request -- never a second retrieval, never inventing data. It
  deliberately never sets `actorAccess`: an ordinary canonical request has no known actor or
  decision time, and actor access must never be inferred merely because evidence exists.
  `ibis-reasoning-engines.ts`'s `EBRInput.actor`/`decisionTime`/`candidateHistories` are now
  optional; `runEBR()` honestly discloses when `K_att`/`K_rec` were not evaluated (no actor context)
  rather than fabricating one, and now genuinely executes a **CONDITIONAL, evidence-only finding**
  (K_att disclosure, contradiction count, the `⊥` reserve) when evidence items exist but no
  candidate causal history was supplied — distinct from `SKIPPED` (no evidence at all). The
  advanced/internal `CanonicalRequest.ebrInput` interface is fully preserved and still takes
  precedence when supplied (proven by the existing checkpoint-`acf46ff` tests, unchanged). No
  automatic causal-edge/hypothesis-generation pipeline was added -- inventing one from free text
  would be exactly the "invent reasoning to fill a gap" this codebase's discipline forbids (see
  `ibis-reasoning-engines.ts`'s EBR contract comment); this is why EBR stays `CONNECTED_CONDITIONAL`
  rather than being reclassified `CONNECTED_OPERATIONAL`.
- **Evidence terminology** (corrected this checkpoint -- see "Evidence terminology" section below):
  every test and record in this document that exercises search uses a **`MOCK_SEARCH_FIXTURE`** (a
  canned response standing in for a provider), proving only **`CONTRACT_GROUNDED`** behavior (the
  orchestration contract works given that response shape). None of it is **`LIVE_SEARCH_GROUNDED`**
  -- that label is reserved exclusively for a response an actually configured production search
  provider returned. A prior draft of this section called fixture data "real grounded evidence" and
  "real-shaped sources"; both have been corrected below.
- **Acceptance query** (exact text specified): *"Why has Trinidad and Tobago experienced
  foreign-exchange shortages, what evidence supports the possible causes, and what practical
  actions could improve the situation?"* -- classifies `RETRODICTION` (legacy primary class,
  unchanged priority order); signals `causeEvidence` and `retrodiction` both true, `freshness`
  false. Capability plan: `[RESEARCH, EBR, CORRELATION]`. **With a `MOCK_SEARCH_FIXTURE`** (two
  sources shaped like realistic provider responses: Central Bank of T&T forex allocation update,
  IMF Article IV consultation -- `CONTRACT_GROUNDED`, never `LIVE_SEARCH_GROUNDED`):
  `sources.length === 2`, `evidenceState === "SEARCH_GROUNDED"`, `EBR` executed:true with a finding
  built from that fixture evidence (no `ebrInput` supplied), `CORRELATION` honestly
  executed:false/SKIPPED (no numeric series in free text), and the canonical envelope's own
  `uncertainties` array carries the `⊥` unmodeled-history-reserve disclosure. **Without any evidence
  fixture** (no search provider configured): `status: "DEGRADED"`, `degradedStages` includes
  `SEARCH_UNAVAILABLE`, `sources.length === 0`, `EBR` honestly executed:false (abstains), and the
  answer is the same honest "can't verify" refusal used for every other research-dependent query --
  never a fabricated researched answer. `LIVE_SEARCH_GROUNDED` is never claimed unless a real search
  provider is configured and the evidence came from it -- both branches use an explicit local test
  double (`MOCK_SEARCH_FIXTURE`) or an explicitly unconfigured provider, never a real network call.
  Proven by
  `ibis-canonical-brain.test.ts`'s `ACCEPTANCE QUERY` tests (and the `COMPOSABILITY` test group
  above them, covering non-invocation on a simple/current-fact-only query, invocation without
  requiring current search via the advanced `ebrInput` interface, and honest degradation on search
  failure).

## EcoMap Place/Pathway/Relationship (this checkpoint)

Implements three of EcoMap's modes -- structured ecosystem intelligence (services, organizations,
pathways, relationships) feeding IBIS/Butterfly/Correlation/Prediction, not merely a diagram.
Multi-Agent Orchestration was deliberately NOT implemented this pass, per instruction.

- **Methodology classification: `PARTIAL / FOUNDER-AUTHORIZED`** (see `GOVERNANCE/
  ECOMAP_SOURCE_AND_BOUNDARY.md`, written before any code, per the required source/boundary-note
  discipline). The data model (what fields each mode structures) is a founder-authorized product
  contract, not a peer-reviewed or externally validated methodology the way EBR is (EBR cites a
  DOI and a public mathematics note; EcoMap here cites neither, because neither exists for this
  model). No comment, test or doc may describe EcoMap as scientifically validated.
- New pure module `supabase/functions/_shared/ibis-ecomap-engine.ts`: `buildPlaceMap()`,
  `buildPathwayMap()`, `buildRelationshipMap()`, plus real, deterministic, inspectable keyword
  heuristics (`classifyPlaceKind()`, `classifyAvailability()`, `detectZeroCost()`,
  `extractStatedJurisdiction()`) -- never a claim of accurate NLP classification, and UNKNOWN/null
  rather than a silent guess when nothing matches.
- Wrapped by `runEcoMapPlace()`/`runEcoMapPathway()`/`runEcoMapRelationship()` in
  `ibis-reasoning-engines.ts`, each honestly `SKIPPED` absent any real source (same discipline as
  every other engine), and genuinely `OK` with a real partial map plus explicit `missing[]` gaps
  when at least one source exists -- never fabricated completeness.
- **Composability**: `ibis-intent-router.ts` adds three NEW, independent signals
  (`ecomapPlace`/`ecomapPathway`/`ecomapRelationship`, via `ECOMAP_PLACE_SIGNAL_MARKERS`/
  `ECOMAP_PATHWAY_SIGNAL_MARKERS`/`ECOMAP_RELATIONSHIP_SIGNAL_MARKERS`) -- deliberately SEPARATE,
  broader regexes from the legacy `PATHWAY_MARKERS`/`PLACE_MARKERS`/`RELATIONSHIP_MARKERS` that
  drive PRIMARY classification, so broadening them for capability planning carries zero risk of
  changing any existing `queryClass` result. `ibis-canonical-brain.ts`'s `planCapabilities()` adds
  `ECOMAP_PLACE`/`ECOMAP_PATHWAY`/`ECOMAP_RELATIONSHIP` independently -- one query may plan all
  three at once (or just one), and an EcoMap-flavored query without an explicit freshness/
  cause-evidence marker ALSO additively plans `RESEARCH` ("mapping real services/organizations/
  steps/relationships requires grounded evidence, not internal FTN product data alone").
- **One retrieval feeds all three modes**: new `buildEcoMapSourcesFromSearch()` in
  `ibis-canonical-brain.ts` normalizes the SAME search results already retrieved for the request
  into ONE list, passed to all three engine calls -- never a duplicate search per mode.
- **Provenance and honesty**: every `PlaceEntity`/`PathwayStep`/`RelationshipEdge` carries a
  `provenance` field and a confidence label (`CONFIRMED`/`INFERRED`/`CONDITIONAL`/`MISSING`/
  `UNKNOWN`). Pathway steps built from a search source are always `INFERRED`, never `CONFIRMED`
  ("a pathway must not pretend a step is confirmed when evidence is absent"). Relationship edges
  built from a search source are always a generic `POTENTIAL_REFERRAL`, never a specific fabricated
  relation type (e.g. "FUNDS").
- **Location privacy**: only the request's OWN stated jurisdiction text is used
  (`extractStatedJurisdiction()`, a closed Trinidad-and-Tobago place-name keyword list) -- no
  device/IP location API, no coordinate collection anywhere in this module.
  `PlaceEntity.confirmedLocation` (only ever source-stated) and `inferredCoverage` (an explicit,
  separately-labeled guess) are kept as two distinct fields, never merged. Proven by a dedicated
  test asserting no `coordinates`/`latitude`/`longitude` ever appear in a canonical response.
- **Relationship sensitivity**: every edge carries a `sensitivity` classification (`PUBLIC`/
  `SENSITIVE`/`PRIVATE`). Only `PUBLIC` edges are named in a reasoning engine's customer-facing
  `contribution` text; `SENSITIVE`/`PRIVATE` edges (from the advanced/internal
  `ecomapRelationshipContext.explicitEdges` interface) are counted ("N sensitive relationship(s)
  detected but not disclosed") but never named there or in the envelope's `ecosystemConnections`
  field -- proven by a dedicated test supplying an explicit sensitive edge.
- **Materially changes the canonical result**: EcoMap Pathway output now populates the envelope's
  own `actions` field, and EcoMap Relationship output populates `ecosystemConnections` -- BOTH
  fields existed in the contract since the first checkpoint but were always empty for every query
  class until this one. EcoMap Place's gap disclosures populate `uncertainties`. This is the
  concrete, inspectable proof EcoMap changes the canonical result, not just an `executed:true` flag.
- **Advanced/internal interface preserved**: `CanonicalRequest.ecomapPlaceContext` /
  `ecomapPathwayContext` / `ecomapRelationshipContext` let an advanced caller (e.g. a governance/
  audit tool with real place/pathway/relationship data, including sensitive relationship edges)
  supply structured input directly, always taking precedence over the auto-built version. An
  ordinary user never needs to construct these.
- **Acceptance query** (exact text specified): *"I want to start a community food business in
  Tobago. Map the services and organizations that could help, the steps and requirements I need to
  follow, and the relationships or referrals that could move it forward."* -- signals `outcome`,
  `ecomapPlace`, `ecomapPathway` and `ecomapRelationship` all true. Capability plan:
  `[FOUNDER_THINKING, BUTTERFLY, PREDICTION, CONTEXT_GRAPH, RESEARCH, ECOMAP_PLACE, ECOMAP_PATHWAY,
  ECOMAP_RELATIONSHIP]` (the outcome marker "I want to start..." also plans the pre-existing
  Founder Thinking bundle, proving EcoMap composes with capabilities from the prior checkpoint, not
  just with itself). **With a 3-source `MOCK_SEARCH_FIXTURE`** (`CONTRACT_GROUNDED`, never
  `LIVE_SEARCH_GROUNDED`): `sources.length === 3`; `ECOMAP_PLACE` executed:true naming a real
  sourced entity ("Tobago Business Development Office") with the `PARTIAL / FOUNDER-AUTHORIZED`
  disclosure; `ECOMAP_PATHWAY` executed:true with every step `INFERRED` and an explicit
  not-confirmed-by-any-source gap; `ECOMAP_RELATIONSHIP` executed:true with real `->` edge
  descriptions; a genuinely zero-cost-flagged fixture source ("Free Food Safety Certification
  Workshop (No Cost)") surfaces a real zero-cost alternative in `actions` -- grounded in actual
  fixture text, never a generic filler. **Without any evidence fixture**: all three EcoMap modes
  honestly report `executed:false` (SKIPPED), never a fabricated map, while the overall response
  still shows `status: "DEGRADED"`. **Contrast tests** prove independent selectability: "Where is
  the nearest public business-development office?" plans only `ECOMAP_PLACE` (+ `RESEARCH`); "What
  steps are required to register a food business?" plans only `ECOMAP_PATHWAY`; "Which
  organizations fund or refer Tobago food entrepreneurs?" plans `ECOMAP_RELATIONSHIP` + `RESEARCH`;
  a simple factual question plans none of the three. Proven by the `ECOMAP ACCEPTANCE QUERY` and
  `ECOMAP CONTRAST` test groups in `ibis-canonical-brain.test.ts`.

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
- **EBR (Evidence-Bounded Retrodiction) -- connected THIS checkpoint**: real methodology source
  found (Ricardo Gill's published EBR protocol, DOI `10.5281/zenodo.22681856`; formalized in
  `research/evidence-bounded-retrodiction/mathematics/index.html`) -- see `GOVERNANCE/
  EBR_SOURCE_AND_BOUNDARY.md` for the source/boundary note required before this port, which also
  records that this is strictly an epistemic/causal-reconstruction protocol, never the separate,
  speculative Gill Cohesive Consciousness Hypothesis. New module `supabase/functions/_shared/
  ibis-ebr-engine.ts` implements the three-view evidence separation (`K_att`/`K_rec`/`R`),
  mechanism-gated causal-edge admissibility (`Admissible(h)`), transparent non-probabilistic
  ranking (`RankKey(h)`), contradiction preservation and the `⊥` unmodeled-history reserve exactly
  as formalized in that mathematics note. Wrapped by `runEBR()` in `ibis-reasoning-engines.ts` and
  invoked from `ibis-canonical-brain.ts` for a new `RETRODICTION` `QueryClass`, reached via a new
  reachable `RETRODICTION_MARKERS` classifier path in `ibis-intent-router.ts` (same previously-
  dead-code pattern `CORRELATION`/`TOOL_ACTION` were in before they were wired). No automatic
  evidence-retrieval/hypothesis-generation pipeline is wired into the canonical brain yet -- honestly
  `SKIPPED` for ordinary free text, same discipline as Butterfly/Prediction/Correlation/Connection
  Fabric -- but a caller supplying real evidence items and candidate causal histories via
  `CanonicalRequest.ebrInput` gets genuine execution that **materially changes the canonical
  envelope's own `contradictions`/`uncertainties` fields** (not just one `reasoningModesUsed`
  entry, both otherwise always empty for a `RETRODICTION` query), and the engine can honestly
  abstain (no admissible candidate) rather than force a pick. Proven by 15 dedicated Deno unit
  tests (`ibis-ebr-engine.test.ts`), 5 dedicated adapter tests (`ibis-reasoning-engines.test.ts`)
  and 6 dedicated canonical-brain integration tests, including a non-invocation test (an ordinary
  `SIMPLE_TEXT`/`FOUNDER_STRATEGY` query never invokes EBR) and a no-consciousness-claim test.
- **Primary benchmark result** (exact prompt: "I want to build a free Caribbean platform that
  helps ordinary people discover opportunities, services and resources. I have limited capital.
  What should I build first, who must be involved, what relationships matter, and what could cause
  it to succeed or fail?", run live with a real 2-product `IbisProduct[]` list): classifies
  `FOUNDER_STRATEGY`; `FOUNDER_COGNITIVE_LAYER` executes with real structured findings (domain
  `FUNDING`, decision `PREPARE_NOW`, objective/path text from `FOUNDER_GUIDANCE`); `CONTEXT_GRAPH`
  executes ("Grounded FTN-product slice: 2 node(s) built from this request's own product list",
  honestly disclosing no dependency-edge data server-side yet); `BUTTERFLY` and `PREDICTION`
  correctly report `executed:false` with an honest reason (no structured effects/opportunity data
  in a free-text request); no engine is fabricated as executed. This prompt classifies
  `FOUNDER_STRATEGY`, not `RETRODICTION` or an EcoMap-flavored query, so EBR/EcoMap are not
  exercised by it -- both are proven separately by their own dedicated tests (see above). This is a
  **partial** pass of the full benchmark spec — Multi-Agent is also expected by the benchmark and
  remains unported, so the benchmark is not fully satisfied end-to-end.

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
Deno suite (`supabase/functions/_shared/*.test.ts`, now including `ibis-ecomap-engine.test.ts` and
the `COMPOSABILITY`/`ACCEPTANCE QUERY`/`ECOMAP ACCEPTANCE QUERY`/`ECOMAP CONTRAST` cases in
`ibis-canonical-brain.test.ts`), `ibis-ux-release.mjs`, `ibis-behavioral-ux-acceptance.mjs`,
`ibis-headspace-controls-audit.mjs`.

## Revision history

- (this checkpoint, 2026-09-16): EcoMap slice + evidence-terminology correction. Implemented
  EcoMap Place/Pathway/Relationship (methodology `PARTIAL / FOUNDER-AUTHORIZED` -- see
  `GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md`) as 3 more genuinely connected reasoning engines (10
  of 11 total; only Multi-Agent remains unported). New pure module `ibis-ecomap-engine.ts`; three
  new independent capability-plan signals (`ecomapPlace`/`ecomapPathway`/`ecomapRelationship`) so
  Place/Pathway/Relationship are each independently selectable and composable in one request; one
  retrieval (`buildEcoMapSourcesFromSearch()`) feeds all three, never a duplicate search per mode.
  EcoMap Pathway/Relationship output now materially populates the previously-always-empty
  `actions`/`ecosystemConnections` envelope fields. Also corrected this checkpoint: prior-draft
  language that called `MOCK_SEARCH_FIXTURE` test data "real grounded evidence" or "real-shaped
  sources" -- see "Evidence terminology" above; `MOCK_SEARCH_FIXTURE` test data is never classified
  `LIVE_SEARCH_GROUNDED`, and no L3/L4 production-search gate is satisfied by it. 38 new Deno tests
  (11 pure-module unit tests in `ibis-ecomap-engine.test.ts`, 9 adapter tests in
  `ibis-reasoning-engines.test.ts`, 8 canonical-brain integration tests including the exact
  specified EcoMap acceptance query, 4 contrast-selectivity tests, a sensitivity-suppression test
  and a search-failure/honest-degradation test); full shared Deno suite (136 tests) and the
  authoritative acceptance runner both pass, with the same honest FAIL entry for the 1 genuinely
  unavailable engine (Multi-Agent) -- not touched this pass, per instruction.
- `97322c7` (2026-09-16): composable capability-plan correction. Replaced RETRODICTION's
  exclusive competition with CURRENT_WEB_RESEARCH (and every other class) with an additive,
  server-side-only `capabilityPlan` (see "Composable capability plan" above) -- a request can now
  plan RESEARCH + EBR + CORRELATION (etc.) simultaneously, while the legacy single `queryClass`
  field is fully preserved for backward compatibility. EBR evidence is now built server-side from
  grounded search results for an ordinary query (no `ebrInput` required), but EBR remains
  `CONNECTED_CONDITIONAL` (see the new engine readiness classification table above) because
  mechanism-gated causal admissibility still needs a candidate causal history nothing generates
  automatically. 18 new Deno tests (`COMPOSABILITY` + `ACCEPTANCE QUERY` groups in
  `ibis-canonical-brain.test.ts`, 2 new pure-module tests in `ibis-reasoning-engines.test.ts`) proving:
  a current causal question invokes both research and EBR; a correlation marker additionally invokes
  Correlation; a historical causal question can still invoke EBR via the advanced `ebrInput`
  interface without search; simple/current-fact-only questions never invoke EBR; search failure
  degrades honestly and EBR abstains rather than fabricating a researched answer; the exact
  specified acceptance query ("Why has Trinidad and Tobago experienced foreign-exchange
  shortages...") produces a `[RESEARCH, EBR, CORRELATION]` plan and a sourced, uncertainty-aware
  answer with mocked grounded evidence, and degrades honestly without it. Full shared Deno suite
  (110 tests) and the authoritative acceptance runner both pass, with the same honest FAIL entries
  for the 4 genuinely unavailable engines (EcoMap Place/Pathway/Relationship, Multi-Agent) -- not
  touched this pass, per instruction.
- `acf46ff` (2026-09-16): EBR slice. Implemented Evidence-Bounded Retrodiction (Ricardo
  Gill's published protocol, DOI `10.5281/zenodo.22681856` -- see `GOVERNANCE/
  EBR_SOURCE_AND_BOUNDARY.md`) as the 7th of 11 genuinely connected reasoning engines. New pure
  module `ibis-ebr-engine.ts` (three-view evidence separation, mechanism-gated admissibility,
  contradiction preservation, `⊥` open-set reserve), wrapped by `runEBR()` in
  `ibis-reasoning-engines.ts`, invoked from `ibis-canonical-brain.ts` for a new `RETRODICTION`
  `QueryClass` reached via a new `RETRODICTION_MARKERS` classifier path in `ibis-intent-router.ts`.
  26 new Deno tests (15 pure-module unit tests, 5 adapter tests, 6 canonical-brain integration
  tests including non-invocation, honest-SKIPPED, material-change, abstention and
  no-consciousness-claim cases); full shared Deno suite (98 tests) and the authoritative acceptance
  runner both pass with the same honest FAIL entries for the 4 genuinely unported engines (EcoMap
  Place/Pathway/Relationship, Multi-Agent). EcoMap and Multi-Agent deliberately NOT implemented
  this slice, per instruction.
- `4f637c2` (2026-09-16): reasoning-engine connection slice 2. Ported Butterfly, Prediction/
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
