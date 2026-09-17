# EBR source and boundary note

## What this is

Evidence-Bounded Retrodiction (EBR) is Ricardo Gill's published research protocol for how a
persistent agent can reconstruct plausible causal histories from evidence without letting later
(retrospective) knowledge silently overwrite what an actor could contemporaneously have known at
an earlier decision time.

- Canonical citation: Ricardo Gill, *"From Memory to Causal History: Evidence-Bounded
  Retrodiction for Persistent Agents,"* DOI: https://doi.org/10.5281/zenodo.22681856.
- Public research pages already published in this repository: `research/evidence-bounded-
  retrodiction/index.html` (overview) and `research/evidence-bounded-retrodiction/mathematics/
  index.html` (the formal companion note -- source of the `K_att`/`K_rec`/`R`/`Φ(h)`/`Admissible`/
  `RankKey`/`⊥` definitions this implementation follows).
- Implementing module: `supabase/functions/_shared/ibis-ebr-engine.ts` (pure evidence/causal-
  history logic) and `runEBR()` in `supabase/functions/_shared/ibis-reasoning-engines.ts` (the
  canonical-brain adapter contract every reasoning engine follows -- see that file's own
  contract-map header comment).

## What this is not

This implementation is **only** an epistemic and causal-reconstruction protocol. It:

- does **not** implement, test, validate, or endorse the separate "Gill Cohesive Consciousness
  Hypothesis" as an engineering result;
- does **not** claim consciousness, sentience, digital immortality, or continuity of a person's
  mind;
- does **not** produce probabilities, confidence percentages, or a single collapsed "likelihood"
  for any reconstructed history -- see `GOVERNANCE/IBIS_RESEARCH_AND_SPECULATIVE_THEORY_BOUNDARY.md`
  for the repository-wide rule this follows (`ibis must not claim consciousness transfer, digital
  immortality, sentience... Research materials must label hypotheses as speculative`).

The shared surname (Ricardo Gill is FTN's founder and the author of both the EBR paper and the
speculative Cohesive Consciousness Hypothesis) does not make the two concepts equivalent. Any
future work that touches the Cohesive Consciousness Hypothesis must be scoped, reviewed and
labeled separately from EBR, and must not be merged into this module or its tests.

## What this implementation honestly does not include

This implements the **evaluation** half of EBR (three-view evidence separation, mechanism-gated
causal-edge admissibility, contradiction preservation, open-set abstention). Evidence-item
*construction* IS now automatic for an ordinary query: `ibis-canonical-brain.ts`'s
`buildEbrInputFromSources()` builds real `EvidenceItem[]` server-side from the grounded search
results already retrieved for the request (title/url/publisher/dates it already carries) -- never
a second retrieval, and never setting `actorAccess` (actor access must never be inferred merely
because evidence exists; an ordinary request has no known actor or decision time, so `K_att`/`K_rec`
are honestly disclosed as not evaluated rather than fabricated).

What remains NOT automatic, and NOT invented, is candidate-*history* generation: this pass does
**not** implement an automatic hypothesis-generation pipeline that proposes `CausalEdgeProposal`s
from free text. A caller (the advanced/internal `CanonicalRequest.ebrInput` interface, or a
governance/audit tool built on this endpoint) must supply real `CandidateHistory[]` data for the
mechanism-gated *causal admissibility* evaluation to run; absent one, EBR still genuinely executes
-- reporting a CONDITIONAL, evidence-only finding (K_att disclosure, contradiction count, the `⊥`
reserve) rather than a completed causal reconstruction, and never `SKIPPED` when evidence items
exist (SKIPPED is reserved for when there is no evidence at all -- e.g. search failed or was never
planned). Note: "evidence items exist" describes the engine's own contract, not a claim about
where the evidence came from -- see "Evidence terminology" in `docs/ibis/acceptance-baseline.md`
for the `MOCK_SEARCH_FIXTURE`/`CONTRACT_GROUNDED`/`LIVE_SEARCH_GROUNDED` distinction; a test's
fixture evidence is never itself `LIVE_SEARCH_GROUNDED`. Inventing candidate causal edges from free
text would be exactly the "invent reasoning to fill a gap" this codebase's discipline forbids --
this is also why EBR remains classified
`CONNECTED_CONDITIONAL`, not `CONNECTED_OPERATIONAL`, in `docs/ibis/acceptance-baseline.md`'s engine
readiness table.

## Acceptance boundary

Any test or acceptance-runner entry for EBR must confirm:

- retrospective evidence cannot overwrite contemporaneously attested knowledge (`K_att`);
- actor-access assumptions stay explicit, never implied;
- contradictory evidence is preserved, never silently resolved into one score;
- an edge nominated only by chronology or correlation fails the mechanism gate;
- open-set uncertainty (the `⊥` unmodeled-history reserve) is always stated, never dropped;
- EBR can abstain rather than force a pick;
- no output contains a consciousness claim;
- EBR materially changes the canonical response (contradictions/uncertainties/reasoning modes),
  not just an `executed:true` flag;
- an ordinary, non-retrodictive query never invokes EBR at all;
- search/evidence retrieval runs before any evidence-dependent reasoning (EBR evidence is built
  from real search results, never a second or fabricated retrieval);
- EBR is additively planned alongside other capabilities (research, correlation) via
  `ibis-canonical-brain.ts`'s `capabilityPlan` -- it does not compete exclusively with
  `CURRENT_WEB_RESEARCH` or any other single `queryClass`.

See `supabase/functions/_shared/ibis-ebr-engine.test.ts` and the EBR-specific cases in
`ibis-reasoning-engines.test.ts` / `ibis-canonical-brain.test.ts` for the tests that enforce this.
