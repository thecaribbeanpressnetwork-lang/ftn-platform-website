# FTN / IBIS Canonical Execution Architecture

**Status: ACCEPTED as the frozen target architecture (2026-09-18). Implementation is phased — see
`FTN_IBIS_Canonical_Architecture_Implementation_Plan_2026-09-18.md` for the rollout order, what
ships first, and what changes behavior versus what is additive/shadow-mode only.**

This document is the founder's own architecture-decision record, recorded verbatim below as the
canonical reference. It supersedes the looser `intent → search → specialist engines → model` mental
model that the codebase has grown under incrementally. It does not itself change any code — see the
implementation plan for what changes, in what order, and what evidence gates each step.

**Relationship to same-day work**: this document was accepted immediately after the Search Quality
Gate pass (`FTN_Search_Quality_Gate_2026-09-18.md`) shipped a real, live-verified fix for exactly
one of the gaps this architecture formalizes — a search result being treated as sufficient evidence
merely because `status: "OK"`. This document's own §16 explicitly anticipates and scopes that fix:
*"The current quality gate has been useful as a safety patch. It should become basic retrieval
hygiene, not grow into ibis's epistemology engine."* The two are compatible, not in tension; the
implementation plan treats the shipped quality gate as the first real building block of the future
Evidence/Result Processor stage, not a competing design.

Two claims in the source document were checked against the live code before acceptance and confirmed
accurate: `MULTI_AGENT` really is selected whenever `capabilityPlan.length >= 2`
(`ibis-canonical-brain.ts`'s `planCapabilities()`, not a deliberate multi-agent-deliberation trigger),
and every `SourceRecord` the search cascade produces is permanently `evidenceDepth: "SNIPPET"` — no
Retrieval Adapter / page-inspection stage exists anywhere in the codebase today. One minor
correction: the routing table below lists Anthropic's model as `claude-sonnet-4-6` as the "default";
in the actual code this is an `ANTHROPIC_MODEL` environment override on top of a `claude-sonnet-5`
code-level default — functionally accurate for production today, but worth knowing the mechanism
before treating it as a hardcoded constant anywhere.

---

## Executive determination

The canonical ibis pathway should be:

**USER / CLIENT**
↓
**1. REQUEST FRAME**
↓
**2. DECISION GATE**
↓
**3. EVIDENCE & REASONING CONTRACT**
↓
**4. CAPABILITY PLAN**
↓
**5. EXECUTION BROKER**
↓
**6. EVIDENCE / RESULT PROCESSOR**
↓
**7. SPECIALIST INTELLIGENCE**
↓
**8. SYNTHESIS**
↓
**9. RELEASE VALIDATOR**
↓
**10. RESPONSE / ACTION RESULT**
↓
**11. RECEIPT / PROVENANCE / LEARNING**

This supersedes the looser:

> intent → search → specialist engines → model

model.

The principle becomes:

> **ibis defines the question before retrieval, defines the proof required before retrieval, executes the cheapest truthful capability capable of producing that proof, evaluates what actually came back, invokes only the specialist intelligence justified by the evidence, then permits an answer or action to leave the system only after validation.**

The canonical brain remains the sole orchestrator. Existing code already establishes it as the single server-side canonical request orchestrator, while `runOrchestration()` executes planned specialist capabilities rather than becoming a competing brain.

---

## 1. CANONICAL IBIS ARCHITECTURE MAP

```text
USER / FTN PRODUCT / CONNECTED CLIENT
          │
          ▼
┌──────────────────────────────────────┐
│ 1. REQUEST FRAME                     │
│ Intent + task type + entities        │
│ geography + timeframe + context      │
│ output need + consequence/risk       │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 2. DECISION GATE                     │
│ What kind of job is this?            │
│ Need current evidence?               │
│ Need deterministic execution?        │
│ Need specialist reasoning?           │
│ Need permission?                     │
│ Local/server/provider route?         │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 3. EVIDENCE & REASONING CONTRACT     │
│ CEBOS = general contract             │
│ EBR = causal/retrodiction contract   │
│ What would count as proof?           │
│ What claims may ultimately be made?  │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 4. CAPABILITY PLAN                   │
│ Dependency graph                     │
│ Retrieval / APIs / engines / tools   │
│ Specialist intelligence selection   │
│ Cost / latency / permission budget   │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 5. EXECUTION BROKER                  │
│ Deterministic engines                │
│ FTN / official structured data       │
│ Search providers                     │
│ Retrieval/page inspection            │
│ Media engines / connected tools      │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 6. EVIDENCE / RESULT PROCESSOR       │
│ Normalize                            │
│ verify entity/geography/time         │
│ inspect source                       │
│ authority / provenance               │
│ contradictions                       │
│ facts/inference/unknown              │
│ sufficiency + claim ledger           │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 7. SPECIALIST INTELLIGENCE           │
│ Conditional only                     │
│ FCL / EcoMap / graphs / correlation  │
│ Butterfly / foresight / opportunity  │
│ scenario / true multi-agent          │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 8. SYNTHESIS                         │
│ MODEL_TEXT_STANDARD or REASONING     │
│ Evidence packet + specialist outputs │
│ Never given authority to invent data │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 9. RELEASE VALIDATOR                 │
│ Claim support                        │
│ freshness                            │
│ capability truth                     │
│ deterministic truth                  │
│ framework leak                       │
│ action permission                    │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 10. RESPONSE / ACTION RESULT         │
│ Answer / artifact / verified result  │
│ citations / uncertainty / next step  │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ 11. RECEIPT / LEARNING               │
│ provenance + provider path           │
│ execution receipt + outcome          │
│ FCL learning where appropriate       │
└──────────────────────────────────────┘
```

### The final decision authority

There are three distinct authorities:

| Decision                                 | Owner                                    |
| ---------------------------------------- | ----------------------------------------- |
| What should run                          | **Decision Gate + Capability Planner**   |
| Whether an external action is authorized | **Permission Ledger / Execution Broker** |
| Whether an answer/result may leave ibis  | **Release Validator**                    |

**No MODEL_TEXT provider owns the final decision.**

Claude, Gemini, Cloudflare or any future LLM may synthesize or reason. They do not decide whether their own claims are sufficiently grounded.

---

## 2. BOX-BY-BOX ENGINE ASSIGNMENT

| Box                                 | Systems allowed                                                                                                         | Input                                            | Output                                                                       | Must NOT do                                      | Failure                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------- |
| **1 Request Frame**                 | `classifyIntent`, entity/time/geography resolver, persistent context retrieval, lightweight Context Graph lookup        | user text, session/product context               | typed `RequestFrame`                                                         | search, answer, make strategic recommendations   | preserve ambiguity explicitly                           |
| **2 Decision Gate**                 | canonical planner, capability truth registry, privacy/permission/risk rules                                             | RequestFrame                                     | execution class, freshness requirement, risk/consequence level               | produce user answer                              | conservative plan                                       |
| **3 Evidence & Reasoning Contract** | **CEBOS**, EBR when causal-history question                                                                             | RequestFrame + known context                     | evidence requirements, required source classes, temporal bounds, claim types | retrieve evidence itself                         | mark required evidence unknown/unavailable              |
| **4 Capability Plan**               | canonical capability planner / dependency planner                                                                       | RequestFrame + contract                          | typed execution DAG                                                          | run providers itself                             | degraded plan with missing dependencies exposed         |
| **5 Execution Broker**              | deterministic engines, Statistics/data APIs, Search Broker, Retrieval Adapter, Connection Fabric, media/provider fabric | execution tasks                                  | raw results/artifacts                                                        | interpret evidence beyond transport-level checks | next valid route or truthful unavailable                |
| **6 Evidence Processor**            | provenance, source authority, CEBOS evidence states, temporal/entity/geo validation, contradictions                     | raw search/API/tool results                      | `EvidencePacket` + `ClaimsLedger`                                            | strategic judgment                               | request bounded additional retrieval or insufficient    |
| **7 Specialist Intelligence**       | FCL, EcoMap, Context Graph, Correlation, Butterfly, Foresight, Scenario, Opportunity Intelligence, true Multi-Agent     | verified EvidencePacket + task                   | specialist findings                                                          | silently upgrade hypothesis to fact              | SKIPPED / DEGRADED / INSUFFICIENT                       |
| **8 Synthesis**                     | MODEL_TEXT_STANDARD or MODEL_TEXT_REASONING                                                                             | RequestFrame + ClaimsLedger + specialist outputs | draft answer                                                                 | add unsupported factual claims                   | alternate model or deterministic response               |
| **9 Release Validator**             | deterministic validators                                                                                                | draft + claims + provenance + execution truth    | RELEASE / REVISE / WITHHOLD                                                  | invent missing support                           | revise once/boundedly, otherwise truthful insufficiency |
| **10 Response / Action**            | response envelope, artifact delivery, action-result formatter                                                           | validated result                                 | user-visible result                                                          | leak internal reasoning names                    | degraded response                                       |
| **11 Receipt / Learning**           | lifecycle store, provenance, capability receipts, FCL outcome loop where applicable                                     | complete execution trace                         | durable audit + learning signals                                             | rewrite historical provenance                    | log failure separately                                  |

The existing canonical implementation already tracks capability states such as `SELECTED`, `INPUT_READY`, `EXECUTED`, `SKIPPED`, `DEGRADED`, `UNAVAILABLE` and `FAILED`. That should remain.

---

## 3. MODEL / PROVIDER ROUTING TABLE

The provider architecture needs **task routing**, not one global provider order.

### MODEL_TEXT

| Route                           | Provider/model                                                        | Canonical role                                                                               |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **MODEL_TEXT_STANDARD**         | Cloudflare Workers AI — `@cf/meta/llama-3.1-8b-instruct`              | simple synthesis, formatting, explanations, low-complexity grounded answers                  |
| **MODEL_TEXT_REASONING**        | Anthropic — `claude-sonnet-4-6`                                       | complex synthesis, difficult strategy, cross-evidence reasoning, high-value analytical tasks |
| **MODEL_TEXT_FALLBACK_1**       | Gemini — currently `gemini-2.5-flash` default in the assistant wiring | text fallback; not search-grounded merely because it is Gemini                               |
| **MODEL_TEXT_FALLBACK_2**       | configured OpenAI-compatible providers                                | only when configured/healthy and capability truth says appropriate                           |
| **MODEL_TEXT_LOCAL/FALLBACK**   | Ollama/local model where configured                                   | privacy/local/offline or economical fallback                                                 |
| **Browser-local simple answer** | existing authorized browser-local execution path                      | SIMPLE_TEXT only under lifecycle authorization; not current research                         |

The current assistant wiring actually creates Cloudflare, Anthropic, Gemini, two OpenAI-compatible providers and Ollama separately. Cloudflare currently uses Llama 3.1 8B, Anthropic reads `ANTHROPIC_MODEL` with `claude-sonnet-4-6` as default, and Gemini is a plain `generateContent` request.

### Important routing correction

The current code builds:

**Cloudflare → Anthropic → Gemini → compatible providers → Ollama**

as a cost-oriented provider sequence.

That is acceptable as **fallback infrastructure**, but not sufficient as the canonical intelligence policy.

Complex founder strategy must not hit Llama 3.1 8B first merely because Cloudflare is cheaper.

The Decision Gate must choose:

* `MODEL_TEXT_STANDARD`, or
* `MODEL_TEXT_REASONING`

before the provider cascade starts.

---

### SEARCH PROVIDERS

Canonical search cascade remains:

**SearXNG → Claude Web Search → Brave Search → SEARCH_UNAVAILABLE**

Claude Web Search is a **SEARCH PROVIDER** when invoked in this lane.

It is not evidence that Anthropic performed the final reasoning.

Similarly:

> using `claude-sonnet-4-6` for MODEL_TEXT and using Anthropic's web-search tooling are two separate capability receipts.

The SearchAdapter explicitly separates SearXNG, Claude Web Search and Brave.

---

### GEMINI

Current status:

**Gemini = MODEL_TEXT fallback.**

It must **not** be represented as Google-grounded search unless the actual `google_search`/grounding capability is deliberately implemented, called and evidenced.

Current plain Gemini generation:

```text
≠ Google Search
≠ web grounding
≠ verified current information
```

---

### CLOUDFLARE WORKERS AI

Current canonical role:

**low-cost MODEL_TEXT_STANDARD** plus separate Cloudflare-backed specialist functions where genuinely implemented.

Workers AI must not be represented as:

* live web search,
* source grounding,
* deterministic computation,
* founder-specific reasoning.

It is a model provider.

---

### BYTEZ

Bytez belongs to the **provider fabric for specialized media/open-model capabilities**.

It is not:

* the ordinary ibis reasoning model,
* the canonical search provider,
* evidence grounding,
* a deterministic engine.

A Bytez-backed capability is only available when the specific model/capability is healthy.

No general `Bytez available` state should imply every Bytez modality works.

---

### DETERMINISTIC ENGINES

These remain outside MODEL_TEXT:

* arithmetic/calculations;
* statistical functions;
* real correlation calculations;
* BPM/runtime calculations;
* audio DSP;
* structural audio/media QC;
* schema validation;
* EPK assembly/validation;
* numeric scenario calculations;
* eligibility rule evaluation where actual rules are encoded;
* capability/provider health rules;
* provenance checks;
* permission decisions.

A model may **explain** a deterministic result.

It may never create a number and cause ibis to report:

> "calculated deterministically."

---

### SPECIALIZED UI

Headspace, Community Connect interfaces, FTN Observatory surfaces, maps, windows and visualizations are **presentation clients**.

They are not reasoning engines.

Headspace must consume the canonical response contract rather than contain a separate truth system.

---

## 4. QUERY-CLASS ROUTING MATRIX

### 1. SIMPLE FACTUAL QUESTION

```text
User
→ Request Frame
→ Decision Gate
→ no freshness requirement
→ no specialist capability unless actually needed
→ browser-local SIMPLE_TEXT if authorized
   OR MODEL_TEXT_STANDARD
→ Release Validator
→ User
```

Founder Cognitive Layer: **OFF**.

Search: **OFF unless factual uncertainty/currentness requires it**.

---

### 2. CURRENT WEB RESEARCH

```text
User
→ Request Frame
→ explicit timeframe extraction
→ CEBOS evidence contract
→ Query Planner
→ Search Broker
→ SearXNG → Claude Web Search → Brave
→ Retrieval / Evidence Processor
→ temporal + entity + geography validation
→ Claims Ledger
→ MODEL_TEXT_STANDARD or REASONING
→ Release Validator
→ User
```

A source merely being retrieved **does not satisfy currentness**.

---

### 3. DEEP CARIBBEAN RESEARCH

```text
User
→ Request Frame
→ Caribbean entity + geography resolver
→ CEBOS
→ regional source-authority plan
→ Query Planner
→ broad search + official/local source retrieval
→ Evidence Processor
→ Context Graph
→ EcoMap component if applicable
→ contradiction/gap analysis
→ MODEL_TEXT_REASONING
→ Release Validator
→ User
```

Caribbean intelligence affects:

* entity resolution;
* source selection;
* evidence interpretation;
* institutional context;
* terminology;
* economic/local context.

It **must not become a hard "Caribbean-only sources" search filter.**

---

### 4. OPPORTUNITY / GRANT / JOB SEARCH

```text
User
→ Request Frame
→ Opportunity classification
→ CEBOS evidence contract
→ currentness + geography + applicant-profile requirements
→ Search Broker / official program sources / FTN Opportunities
→ Evidence Processor
→ EcoMap Pathway when application pathway matters
→ Context Graph when institutions/partners matter
→ Opportunity Intelligence
→ conditional Founder Cognitive Layer
→ eligibility + deadline + value + effort + ownership + recurrence
→ MODEL_TEXT_REASONING
→ Release Validator
→ User
```

**Important:** Opportunity Graph matching is not equivalent to verified eligibility.

Eligibility must come from verified rules/evidence.

---

### 5. ECOSYSTEM MAPPING

```text
User
→ Request Frame
→ determine mapping question type
→ CEBOS
→ retrieval/data execution
→ Evidence Processor
→ appropriate EcoMap engine
→ Context Graph
→ MODEL_TEXT synthesis
→ Release Validator
→ map/answer
```

Do not automatically invoke all EcoMap modes.

---

### 6. BUSINESS / FOUNDER STRATEGY

```text
User
→ Request Frame
→ Decision Gate
→ available internal/external evidence
→ Founder Cognitive Layer
→ Truth/evidence separation
→ Red-team pass where consequence warrants
→ optional Context Graph / Opportunity / Scenario
→ MODEL_TEXT_REASONING
→ Release Validator
→ recommendation
```

This is one of the primary places FCL belongs.

---

### 7. COMPARISON / DECISION SUPPORT

```text
User
→ Request Frame
→ criteria/objective extraction
→ evidence requirements for each option
→ retrieve missing evidence
→ normalized comparison dataset
→ deterministic calculations where possible
→ FCL only when founder/business implications exist
→ MODEL_TEXT_REASONING
→ Release Validator
→ comparison
```

No option should receive fabricated data merely to make a table complete.

---

### 8. CORRELATION / DATA ANALYSIS

```text
User
→ Request Frame
→ structured-data requirement
→ data acquisition
→ Evidence Processor
→ align units / periods / missingness
→ Correlation Engine
→ significance/robustness checks where implemented
→ MODEL_TEXT explanation
→ Release Validator
→ result
```

No valid series:

**no correlation result.**

Text snippets are not numeric series.

The current canonical interface already acknowledges that Correlation lacks an automatic free-text-to-real-series bridge and accepts structured series input instead.

---

### 9. FORECAST / FORESIGHT

```text
User
→ Request Frame
→ target + horizon
→ CEBOS evidence contract
→ current baseline evidence
→ drivers/signals
→ optional Correlation / Butterfly / Scenario
→ Prediction/Foresight
→ uncertainty representation
→ MODEL_TEXT_REASONING
→ Release Validator
→ scenario/forecast
```

No adequate baseline:

**no forecast claim.**

---

### 10. CIVIC / PARLIAMENT / GOVERNMENT RESEARCH

```text
User
→ Request Frame
→ jurisdiction/body/date resolution
→ CEBOS
→ official-source preference
→ government/parliament/public-data source
→ supplementary broad search
→ Evidence Processor
→ contradiction/state-of-record validation
→ Context Graph if actors/institutions matter
→ MODEL_TEXT_REASONING
→ Release Validator
→ answer
```

Official records should normally outrank commentary for:

* laws;
* votes;
* appointments;
* budgets;
* parliamentary proceedings;
* program eligibility.

---

### 11. MUSIC / CREATOR TASK

Two routes exist.

**Analytical/creative advice**

```text
Request Frame
→ creator intent
→ FCL only if business/release strategy
→ music metadata/DSP/schema engines as relevant
→ MODEL_TEXT
→ validator
→ answer
```

**Artifact creation**

```text
Request Frame
→ required modality
→ capability truth
→ Provider Fabric
→ music/audio/image/video engine
→ artifact validation
→ provenance / licensing metadata
→ response
```

A MODEL_TEXT provider must never pretend it generated an audio/video artifact.

---

### 12. DETERMINISTIC CALCULATION

```text
User
→ Request Frame
→ deterministic-engine match
→ deterministic engine
→ validation
→ answer
```

No MODEL_TEXT required except optional explanation.

This should be one of the fastest and cheapest routes.

---

### 13. FTN SELF-KNOWLEDGE

```text
User
→ Request Frame
→ FTN internal knowledge/data sources
→ capability registry / product registry / governed documentation
→ provenance check
→ MODEL_TEXT_STANDARD if prose needed
→ Release Validator
→ answer
```

Do not search the open web first for questions about FTN's own current architecture when an authoritative FTN source exists.

---

### 14. ACTION / EXECUTION REQUEST

```text
User
→ Request Frame
→ requested outcome/action
→ capability truth
→ Connection Fabric route resolution
→ Permission Ledger
→ execution plan
→ execution tool
→ artifact/result verification
→ receipt
→ Release Validator
→ result
```

MODEL_TEXT may plan or explain.

It cannot declare an external action successful.

Only the executor/result verification can.

---

## 5. REASONING-ENGINE TRIGGER MATRIX

| Engine                       | Trigger                                                                                             | Required input                              | Dormant when                     | Output truth class             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------- | --------------------------------- |
| **Founder Cognitive Layer**  | founder strategy, consequential business decisions, ownership, capital, prioritization, optionality | objective + evidence/options                | ordinary fact retrieval          | judgment/recommendation        |
| **Truthmode discipline**     | consequential factual/strategic reasoning                                                           | evidence packet                             | trivial prose transformation     | evidence/assumption separation |
| **Red Team**                 | high consequence, irreversible decision, major spend/risk, competing hypothesis                     | proposed plan + evidence                    | simple fact/search               | challenge findings              |
| **80/20**                    | prioritization/resource allocation                                                                  | candidate actions                           | factual query                    | prioritization                 |
| **FutureYou**                | long-horizon consequences                                                                            | decision + future states                    | ordinary lookup                  | long-term implications         |
| **Lindy**                    | durability/technology/vendor/process choice                                                         | alternatives/history                        | unrelated query                  | durability consideration       |
| **CEBOS**                    | any INFORMATION/TASK/DECISION/CREATIVE request requiring evidence/action truth                      | RequestFrame                                | truly trivial deterministic task | evidence/reasoning contract    |
| **EBR**                      | "why did this happen?", causal history, retrodiction                                                | evidence + candidate causal history         | ordinary research                | bounded causal reconstruction  |
| **EcoMap Place**             | "what exists in/near/serves this place?"                                                            | place + entities/services                   | pathway-only query               | place ecosystem                |
| **EcoMap Pathway**           | "how do I get from here to outcome X?"                                                               | start/outcome + requirements                | location inventory only          | ordered pathway                |
| **EcoMap Relationship**      | referrals, dependencies, connections among actors/entities                                          | entities + relationship evidence            | simple list                      | relationship map               |
| **Context Graph**            | relationships/context improve planning or explanation                                               | resolved entities + verified relations      | isolated simple question         | contextual graph               |
| **Connection Fabric**        | actual external capability/action requested                                                         | capability + connections + permission       | informational query              | executable connection route    |
| **Correlation**              | quantitative relationship requested                                                                 | aligned structured series                   | narrative/source snippets only   | measured association           |
| **Butterfly**                | second-order effects / causal propagation useful                                                    | evidence + plausible pathway                | no causal pathway                | hypothesis/effect chain        |
| **Prediction/Foresight**     | future states/horizon requested                                                                     | baseline + evidence + drivers               | prerequisites missing            | scenarios/forecast             |
| **Scenario Engine**          | numeric what-if                                                                                     | explicit assumptions/variables              | pure qualitative question        | deterministic scenarios        |
| **Opportunity Intelligence** | grants/jobs/funding/pathways/opportunities                                                          | current program evidence + user constraints | generic fact question            | opportunity fit                |
| **True Multi-Agent**         | competing hypotheses, cross-domain complexity, high consequence                                     | shared evidence + explicit roles            | ordinary multi-capability query  | bounded deliberation           |

---

## 6. EBR AND CEBOS: THE CORRECT EVIDENCE FLOW

There is an important naming correction.

The implemented EBR described in the canonical source is **Evidence-Bounded Retrodiction**, not a generic synonym for all evidence-based reasoning.

Therefore:

### CEBOS is the general evidence contract.

CEBOS should operate across:

* information;
* tasks;
* decisions;
* creative work where factual inputs matter.

It already has concepts including evidence states, event/record/access time, decision authority, source research plans, opportunity signals and provider reasoning directives. That is exactly the right foundation for the general evidence layer.

### EBR is the specialist causal-history protocol.

EBR should run when ibis is reconstructing:

> why something happened.

**Before retrieval**

CEBOS defines:

* exact question;
* entities;
* geography;
* temporal window;
* required evidence;
* preferred evidence classes;
* minimum sufficiency;
* expected traces;
* unsupported assumptions.

For a causal question, EBR additionally defines:

* candidate causal histories;
* expected observable traces;
* rival explanations.

**After retrieval**

Evidence Processor determines:

```text
VERIFIED FACT
CORROBORATED FACT
SUPPORTED INFERENCE
HYPOTHESIS
CONTRADICTION
UNKNOWN
```

**Before synthesis**

The Claims Ledger contains only claims the synthesizer is permitted to make.

Example:

```text
claim: state of emergency ended
status: VERIFIED
time: 2026-09-xx
supports: sources 1, 4
allowedStrength: factual
```

versus:

```text
claim: policy ended because of X
status: HYPOTHESIS
supports: indirect
allowedStrength: possible explanation only
```

**After synthesis**

Release Validator compares answer claims against the Claims Ledger.

The synthesizer therefore cannot upgrade:

**hypothesis → fact**

or:

**old evidence → current fact.**

---

## 7. CARIBBEAN ADVANTAGE: WHERE IT ACTUALLY ENTERS

The Caribbean advantage should exist in five locations.

**Request Frame** — Caribbean Entity Resolver identifies Trinidad vs Trinidad, Colorado; San
Fernando, Trinidad vs other San Fernandos; Tobago institutions; Caribbean aliases/acronyms;
parishes/boroughs/regions; regional organizations.

**Evidence Contract** — Regional Source Authority Registry knows appropriate source classes:
ministries; Parliament; Central Bank; CSO; Tobago House of Assembly; CARICOM institutions; CDB;
universities; local established media; sector associations; official program pages.

**Query Planning** — may expand `"grant for small businesses"` into regionally useful variants. Must
not narrow broad research so aggressively that international or diaspora evidence disappears.

**Evidence Processor** — recognizes a Caribbean evidence reality: smaller web footprints, outdated
institutional websites, fragmented announcements, Facebook/social announcements, PDFs, newspaper
reports, program pages that disappear, informal referral pathways. This should change **how
confidence is evaluated**, not lower the truth standard.

**Specialist Intelligence** — EcoMap, Context Graph, Opportunity Intelligence and FCL incorporate
Caribbean institutional relationships, local costs, currency realities, import constraints, market
size, diaspora, regional reach, ownership, local trust. That is where ibis becomes materially
different from a generic search wrapper.

---

## 8. FOUNDER COGNITIVE LAYER

The current `ibis-assistant` implementation embeds a Founder Reasoning instruction into `BASE_INSTRUCTION`, which means it currently reaches every provider response.

**That should not remain canonical.**

**FCL ON** for: founder decision support; FTN architecture; business building; investments;
acquisitions; opportunity selection; monetization; ownership/IP; vendor dependence; consequential
build-vs-buy choices; irreversible decisions; prioritization; strategic comparisons; long-term
optionality. Internal submethods may include Red Team, Pareto, FutureYou, Lindy, reversible
experiment, ownership, economic value, ecosystem value.

**FCL LIGHT** for opportunity queries where economic fit, ownership, execution effort, recurring
value matter — contributes structured scores/findings internally without turning the answer into a
"Founder Reasoning" essay.

**FCL OFF** for: "What is the capital of Barbados?"; "What changed in Trinidad this week?";
"Convert 4 miles to kilometres."; "Who is the Minister of X?"; "What time does Parliament sit?" —
unless the question itself asks for strategic interpretation.

**Hard rule**: internal labels do not appear in ordinary answers. ibis can say "The main risk is
vendor lock-in." It should not say "Applying the Founder Cognitive Layer's Ownership Lens…"

---

## 9. ECOMAP EXACT RESPONSIBILITIES

**EcoMap Place** — *What relevant things exist in this place?* Inputs: geography, category, verified
organizations/services/programs/opportunities. Produces: place entities, service coverage,
availability, local gaps. Examples: services in Scarborough; incubators in Trinidad; organizations
supporting farmers in Tobago.

**EcoMap Pathway** — *How does someone reach an outcome?* Inputs: starting state, desired outcome,
verified requirements, institutions, eligibility, dependencies. Produces an ordered pathway:
`START → requirement → organization → application/action → next dependency → OUTCOME`. Examples:
become export-ready; apply for a grant; register a business; enter a music market.

**EcoMap Relationship** — *How are entities connected?* Inputs: verified entities, referrals,
institutional relationships, funding/ownership/service relationships. Produces typed edges with
evidence and relationship confidence, e.g. `Agency A → funds → Programme B`,
`Programme B → refers to → Incubator C`, `Organization X → member of → Network Y`. No evidence: no
relationship edge.

---

## 10. CONTEXT GRAPH VS CONNECTION FABRIC

These must be kept completely separate.

**Context Graph** is the **knowledge/intelligence structure**: entity → relationship → event → place
→ project → opportunity → evidence. It answers *"What does ibis know is connected to this
situation?"* It can influence query planning before retrieval (using known verified
entities/aliases/relationships), the evidence context after retrieval (adding newly verified
nodes/relationships), and synthesis (explaining meaningful relationships). It should not be invoked
for every question.

**Connection Fabric** is **execution plumbing**: *What live route can perform this action?* E.g. a
Gmail request → Direct connector? → MCP? → Activepieces? → Nango? → REST? It does not answer "What
relationship exists between the Ministry and this programme?" — that is Context Graph/EcoMap.
Connection Fabric should usually run only when execution is requested.

---

## 11. CORRELATION / BUTTERFLY / PREDICTION REQUIREMENTS

**Correlation** requires two or more numeric/ordinal structured series, compatible units, aligned
periods/entities, sufficient observations, missing-data treatment, explicit methodology. Output:
association, method, sample size, limitations. Forbidden: *"These things appear together in
articles, therefore they correlate."*

**Butterfly**'s purpose is second-order effect exploration. Minimum inputs: initial event/action,
plausible mechanism, affected entities, evidence-supported first-order relationship. Output tiers —
kept visibly distinct internally — are Observed consequence / Supported plausible consequence /
Speculative downstream possibility. Butterfly cannot turn a plausible chain into historical
causation.

**Prediction/Foresight** minimum: defined target, horizon, current baseline, recent evidence,
drivers/signals, assumptions. Prefer scenarios (Base/Upside/Downside + key signals) over statistical
forecasting when the latter isn't justified. Numerical probabilities may only be emitted when there
is an actual calibrated method supporting them — never "73% likely" because a language model feels
confident.

---

## 12. MULTI-AGENT: MAJOR CLEANUP

The present canonical source explicitly defines `MULTI_AGENT` as an **internal dependency-aware
execution scheduler**, not a browser/external role-playing agent system. That is useful
infrastructure. It is **not Multi-Agent reasoning**. Current behavior also selects `MULTI_AGENT`
whenever two or more other capabilities are planned. That semantic should be changed.

**Execution Scheduler** — runs whenever a plan has dependencies (e.g. Search → EcoMap → Context
Graph → Prediction). It is infrastructure. Do not show "MULTI_AGENT reasoning executed."

**True Multi-Agent Deliberation** — only justified when at least one of: meaningful competing
hypotheses; high-consequence strategic decision; genuinely cross-domain problem; explicit
adversarial/red-team need; complex synthesis where independent analysis materially reduces error.
Use bounded roles, usually 2–4 agents maximum. All agents receive the same evidence packet. They
should not each independently perform broad web searches unless the plan explicitly assigns distinct
research questions. Then: Agent findings → disagreement extraction → final synthesis → Release
Validator. This controls both cost and hallucination multiplication.

---

## 13. FAILURE / FALLBACK FLOW

**Retrieval**: Query plan → SearXNG; on transport failure/no usable result → Claude Web Search; if
unavailable/insufficient → Brave; if no route → SEARCH_UNAVAILABLE. But provider fallback alone is
not enough.

**Evidence failure**: search results received → Evidence Processor; if evidence requirement not
satisfied → refine query once/boundedly; if page depth required → retrieve/inspect source; if still
insufficient → try next source class/provider if justified; if still insufficient →
INSUFFICIENT_EVIDENCE → answer only what is supported.

**Entity failure**: ambiguous entity (e.g. "San Fernando") → geography resolver → contextual
disambiguation; if still ambiguous → ask user or explicitly present ambiguity. Never silently choose
California, Spain or Trinidad.

**Currentness failure**: question requires "this week" + evidence is older/date uncertain → not
sufficient → search/retrieve again; still unavailable → cannot verify "this week." A model
disclaimer does not transform stale evidence into a valid answer.

**Deterministic engine failure**: engine unavailable → deterministic result unavailable. Never
engine-unavailable → ask LLM to guess a number → label it deterministic.

**Prediction failure**: prerequisites absent → `Prediction = SKIPPED_INSUFFICIENT_BASELINE`. ibis
may provide factors to monitor, scenarios, evidence gaps — not a fake forecast.

**Action failure**: tool route fails → verify failure → alternative authorized route → otherwise
truthful failure. Never report success from model prose.

**Provider unhealthy**: circuit breaker states HEALTHY → eligible, DEGRADED → conditional, UNHEALTHY
→ skip. Do not spend latency repeatedly rediscovering a known provider outage.

**Missing capability**: return truthful capability state, ranked direct external alternative,
zero-cost/open alternative where appropriate, no fabricated internal execution.

---

## 14. COST / LATENCY ORDER

Cost optimization happens **after truth requirements**, not before them.

**Tier 0 — effectively free/deterministic** (preferred first whenever capable): local calculation;
Statistics; local DSP; schema/rules engine; FTN-owned structured data; existing verified cached
evidence within valid TTL; Context Graph lookup; local/browser execution where explicitly
authorized.

**Tier 1 — owned low-cost infrastructure**: SearXNG; FTN source/data APIs; Cloudflare Workers AI
standard synthesis; local/Ollama where available.

**Tier 2 — paid/specialized call justified by task**: Anthropic MODEL_TEXT_REASONING; Claude Web
Search; specialist media provider; other metered provider.

**Tier 3 — redundancy/fallback**: Gemini text fallback; Brave according to configured
quota/cascade; OpenAI-compatible provider; other approved providers.

**Cost rule**: do not use a 70B-class/reasoning model to convert units, format an EPK field,
summarize three deterministic values, or return an already-known FTN route. Likewise, do not force
Llama 3.1 8B to adjudicate a difficult multi-source founder acquisition strategy merely because it
is cheaper.

---

## 15. CAPABILITY-TRUTH RULES

These should be absolute.

| Claim ibis makes          | Required proof                                                |
| ---------------------------- | ------------------------------------------------------------------ |
| **SEARCH_GROUNDED**       | claim-supporting retrieved evidence passed Evidence Processor |
| **CURRENT**               | evidence satisfies requested temporal window                  |
| **DETERMINISTIC**         | result actually came from deterministic engine                |
| **CALCULATED**            | actual formula/engine executed                                |
| **CORRELATION**           | real structured series analyzed                               |
| **PREDICTION**            | prerequisite baseline/evidence exists                         |
| **ECOMAP RELATIONSHIP**   | typed relationship supported by evidence                      |
| **ELIGIBLE**              | actual eligibility rules verified against known facts         |
| **ACTION COMPLETED**      | execution tool reported result and result was validated       |
| **FILE/ARTIFACT CREATED** | artifact physically exists and validates                      |
| **CONNECTED**             | real connection exists and health/permission supports use     |
| **FOUNDER VOICE**         | Ricardo-conditioned voice path actually executed               |
| **LIVE DATA**             | source/API retrieval occurred within validity window           |

### Search result ≠ grounding

This is critical. Current canonical code sets `result.status === OK → evidenceState =
SEARCH_GROUNDED`, while search records may only be snippets. The SearchAdapter itself explicitly
recognizes that a search result is merely `SNIPPET` evidence until the page is actually retrieved.
Therefore the canonical rule must become:

```text
SEARCH EXECUTED
≠
EVIDENCE SUFFICIENT
≠
ANSWER GROUNDED
```

Only Box 6 can promote evidence to grounded status.

---

## 16. WHAT SHOULD BE REMOVED OR SIMPLIFIED FROM THE CURRENT SEARCH IMPLEMENTATION

This is where to stop the heuristic accumulation.

**KEEP in SearchAdapter** (transport-level responsibilities): provider cascade; query transmission;
timeout; circuit breaker; quota/budget; deduplication/cache; URL normalization; provider response
normalization; obvious junk result rejection; provider health; basic duplicate removal.

**MOVE OUT of SearchAdapter, into Evidence Processor**: "is this current enough?"; "does this answer
this exact question?"; geographic match; entity match; source-authority weighting; contradiction
analysis; evidence sufficiency; claim support; archive relevance; primary-source preference. The
current quality gate has been useful as a safety patch. **It should become basic retrieval hygiene,
not grow into ibis's epistemology engine.**

**ADD a real Retrieval Adapter stage**: today the search architecture recognizes SearXNG/Brave
outputs may only be snippets. Canonical flow should be `SEARCH → candidate sources → decide which
need inspection → RETRIEVE PAGE/DOCUMENT → extract relevant evidence → Evidence Processor` — not
`search snippet → answer`.

**REMOVE global Founder prompt behavior**: the current universal Founder instruction should become a
conditional reasoning packet. This directly solves much of the unwanted framework leakage.

**REMOVE `MULTI_AGENT because capabilityPlan.length >= 2`**: multiple engines requiring dependency
ordering means a scheduler is needed, not that Multi-Agent reasoning is needed.

**REPLACE binary `freshnessRequired`**: the current brain derives freshness principally through the
`CURRENT_WEB_RESEARCH` classification. Canonical RequestFrame should instead carry a
`temporalRequirement` object: `{ type, start, end, relativeExpression, strictness }`. Examples:
today; this week; current; latest available annual figures; as of September 2026; historical;
timeless.

**STOP passing raw search snippets directly as the complete grounding contract**: the current
`providerFactory` improvement correctly ensures retrieved evidence reaches synthesis — that was
necessary. The next architecture should pass **EvidencePacket + ClaimsLedger** rather than simply
numbered search-result metadata.

---

## 17. THE FINAL CANONICAL PATH

This is the architecture to freeze.

```text
USER / CLIENT
    │
    ▼
REQUEST FRAME
    Intent Router
    Entity Resolver
    Geography Resolver
    Time Resolver
    Context Retriever
    Task / output / risk classification
    │
    ▼
DECISION GATE
    Capability Truth
    Freshness requirement
    Deterministic-vs-model decision
    Permission/risk requirement
    Local-vs-server decision
    │
    ▼
EVIDENCE & REASONING CONTRACT
    CEBOS for general evidence/task/decision discipline
    EBR additionally for causal-history reconstruction
    Define evidence needed BEFORE searching
    │
    ▼
CAPABILITY PLANNER
    Construct typed dependency DAG
    Select only justified engines
    Apply cost/latency ceilings
    │
    ▼
EXECUTION BROKER
    ├─ FTN / official structured data
    ├─ Deterministic engines
    ├─ SEARCH BROKER
    │     SearXNG
    │       ↓ fail
    │     Claude Web Search
    │       ↓ fail
    │     Brave
    ├─ RETRIEVAL ADAPTER
    ├─ Provider Fabric / media engines
    └─ Connection Fabric / execution tools
    │
    ▼
EVIDENCE / RESULT PROCESSOR
    normalize
    inspect
    entity validate
    geography validate
    temporal validate
    authority/provenance
    contradiction detection
    evidence sufficiency
    fact/inference/hypothesis/unknown
    build Claims Ledger
    │
    ├──── insufficient ───→ bounded query/retrieval revision
    │
    ▼
SPECIALIST INTELLIGENCE
    only when triggered:
    Founder Cognitive Layer
    EcoMap Place
    EcoMap Pathway
    EcoMap Relationship
    Context Graph
    Correlation
    Butterfly
    Prediction/Foresight
    Scenario Engine
    Opportunity Intelligence
    True Multi-Agent Deliberation
    │
    ▼
SYNTHESIS ROUTER
    MODEL_TEXT_STANDARD
       Cloudflare/local economical route
    OR
    MODEL_TEXT_REASONING
       Anthropic claude-sonnet-4-6
    with Gemini/approved provider fallback
    │
    ▼
RELEASE VALIDATOR
    factual support
    temporal compliance
    entity/geography compliance
    evidence-state truth
    unsupported claims
    deterministic truth
    capability truth
    artifact/action truth
    uncertainty calibration
    framework-leak check
    citation/provenance integrity
    │
    ├─ FAIL → one bounded revision / insufficiency response
    │
    ▼
CLIENT RESPONSE / ACTION RESULT
    answer
    citations
    result/artifact
    calibrated uncertainty
    useful next action
    no internal framework vocabulary
    │
    ▼
RECEIPT / OBSERVABILITY / LEARNING
    provider path
    capabilities attempted
    capability execution receipts
    evidence state
    cost/latency
    provenance
    action receipt
    outcome tracking
    conditional Founder learning loop
```

---

## 18. ARCHITECTURAL OWNERSHIP SUMMARY

The clean mental model:

**Intent Router asks**: What is the user actually asking?
**Decision Gate asks**: What kind of execution is justified?
**CEBOS asks**: What must be known or proven before ibis can answer or act?
**Query Planner asks**: What should we request from the outside world?
**Search Broker asks**: Which search service can retrieve candidates?
**Retrieval Adapter asks**: What does the actual source say?
**Evidence Processor asks**: What can we legitimately conclude?
**Specialist Engines ask**: What additional structured intelligence can be derived?
**MODEL_TEXT asks**: How should this validated intelligence be communicated?
**Release Validator asks**: Is ibis allowed to say this?
**Connection Fabric asks**: What can actually execute this action?
**Lifecycle/Provenance asks**: What really happened?

That makes ibis one intelligence system instead of a collection of tools.

---

## ARCHITECTURE DECISION

**PREPARE NOW, IMPLEMENT AFTER ARCHITECTURE ACCEPTANCE.**

The highest-leverage change is **not another search heuristic**. It is establishing:

> **RequestFrame → EvidenceContract → EvidencePacket → ClaimsLedger → Specialist Findings → Validated Response**

as the common language between every ibis subsystem. Once those contracts exist, SearXNG, Claude,
Cloudflare, Gemini, EcoMap, FCL, Correlation, Opportunity Intelligence, Statistics, music engines,
tools and future providers become replaceable faculties around one stable brain rather than
independent features competing to answer the user.

That is the foundation frozen by this document. See the implementation plan for what ships, in what
order, and how each phase is measured before the next begins.
