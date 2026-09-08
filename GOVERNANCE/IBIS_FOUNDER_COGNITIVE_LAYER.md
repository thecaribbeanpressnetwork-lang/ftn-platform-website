# ibis Founder Cognitive Layer — implementation contract

**Status:** backend semantic-memory foundation applied to the live Supabase project; Headspace frontend remains pending deployment and browser verification.  
**Classification:** founder-governed computational cognitive model. It is not Ricardo Gill's consciousness and conversation is never an authorization credential.

## Organism connection

The Headspace request path is:

`text / browser voice / local text file → verified identity state + personal context → Founder Cognitive Layer snapshot → Universal Router → shared orchestrator → canonical ibis capability/provider fabric + connected sources → Permission Ledger → result + provenance → visible Headspace + optional on-device speech`

The runtime contract is `UNDERSTAND → RESEARCH → WATCH → PREDICT → MATCH → ACT`. A request can always be understood and routed. A step that lacks evidence, a provider, a connection, authentication or permission exposes that gap; it does not pretend to have acted.

## Implemented locations

| Requirement | Implementation |
| --- | --- |
| Founder genesis, cognitive snapshot, hash chain, provenance | `js/ibis-founder-cognitive-layer.js` |
| Persistent event storage | Existing `js/ibis-personal-context.js`, namespace `founder_cognitive_event`; unique sequence/hash keys |
| HOW/WHY/decision/outcome/counterfactual representation | `FounderCognitiveLayer.recordDecision()`, `retrospective()`, `recordRetrospective()` |
| Backward learning | `RETROSPECTIVE_WHY_TO_HOW` preserves expected vs actual, causal WHY, lesson and better future HOW |
| Configurable state/pathway updates | `stateDelta()`, `updatePathwayWeight()`, exported `CONFIG` |
| Contextual transfer | `transferScore()` gates reuse by context overlap, confidence, outcome strength, alignment and recency |
| Founder Resonance | `resonance()` can recognize continuity but always returns `canAuthorize:false` |
| Butterfly Engine | `js/ibis-butterfly-engine.js`; action, information gain, relationships, second-order effects, outcome and lesson |
| Correlation/Relationship integration | `ButterflyEngine.correlationEvidence()` and `relationshipEvidence()` reuse existing engines when loaded |
| Mary’s Hill proof | `js/ibis-mission-tracker.js`; 14-stage path and expected-vs-actual probability contributions |
| Combined opportunity lanes | `js/ibis-funding-strategy.js`; five lanes, one deduplicated ranking system |
| Connected official source | `js/ibis-native-connections.js` registers the existing `ftn-opportunities` Edge Function as a read-only REST gateway |
| Cognitive context used by reasoning | `js/ibis-runtime.js` and `js/ibis-multi-agent-orchestrator.js` |
| Visible audit trail | Headspace `cognition` thought shows snapshot digest, chain count and integrity state |
| Speculative research quarantine | `js/ibis-research-hypotheses.js`; Gill Cohesive Consciousness Hypothesis is explicitly not established science |

## Mathematical implementation

The configurable cognitive-state delta implements Ricardo's current hypothesis:

\[
\Delta R = \eta \sum_i W_i H_i Y_i O_i A_i C_i - \lambda \sum_i E_i
\]

The pathway update and Butterfly value are:

\[
W_{i,t+1}=W_{i,t}+\alpha S_i-\beta F_i+\gamma B_i
\]

\[
B(a)=\sum_k P(E_k\mid a)V(E_k)D_k
\]

Mission probability uses signed, clamped expected or actual consequences so helpful evidence can increase the estimate and harmful evidence can decrease it. This resolves the supplied draft's unsigned subtraction ambiguity while preserving expected and actual contributions separately. All probabilities are internal decision-support estimates, never forecasts or guarantees.

## Integrity and correction model

The genesis record anchors an application-level SHA-256 chain. Every later record includes the previous hash. Corrections append a new event with `supersedes`; the earlier event remains. The snapshot exposes both its content digest and chain head.

This is tamper-evident, not yet tamper-proof. The existing personal-context table permits owner updates/deletes under its general memory contract. Production-grade immutability and founder signatures still require a dedicated server-side append-only table/function, protected signing key, authenticated founder/device policy and live migration review. No live schema change was made in this branch.

## Opportunity Intelligence decision funnel

The shared engine combines founder-reviewed Scout records with the current official CARICOM/CDB adapter, deduplicates by source, classifies each record into one of five lanes, and ranks using Trinidad and Tobago eligibility, deadline, source freshness, payout/currency compatibility, net value, fee, effort, probability, scalability, ownership/IP and strategic value. Unknown data remains `VERIFY`/`NOT_ASSESSED`.

Research and preparation may continue, while applications, messages, payments, production changes and other consequential actions stop at the Permission Ledger and require a real execution adapter.

## Proof and remaining gates

Deterministic proof lives in `tests/ibis-founder-cognitive-learning-audit.mjs`, `tests/ibis-organism-integration-audit.mjs` and `tests/ibis-headspace-browser-audit.mjs`.

Not yet production-complete:

- server-enforced immutable event history and founder signatures;
- durable scheduled watches/change detection;
- OAuth/MCP/Activepieces/Nango adapters beyond the first-party opportunity source;
- external application submission and communication adapters;
- production deployment and real signed-in end-to-end verification;
- enough observed outcomes to statistically calibrate pathway coefficients;
- scientific review, falsifiable predictions, ethical protocol and collaborators for the Gill hypothesis.

These gaps are explicit system states. None is represented as a working capability.
