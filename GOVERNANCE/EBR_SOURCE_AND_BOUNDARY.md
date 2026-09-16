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

Per the same honesty discipline every other reasoning engine in `ibis-reasoning-engines.ts`
follows: this pass implements the **evaluation** half of EBR (three-view evidence separation,
mechanism-gated causal-edge admissibility, contradiction preservation, open-set abstention). It
does **not** implement an automatic evidence-retrieval or hypothesis-generation pipeline over live
data -- no such data source is wired into the canonical brain for any engine yet. A caller must
supply real, structured `EvidenceItem[]` and candidate `CausalEdgeProposal`/`CandidateHistory[]`
data; an ordinary free-text query has none of this, so EBR is honestly `SKIPPED` for it, exactly
like Butterfly/Prediction/Correlation/Connection Fabric are already honestly skipped absent their
own required structured input.

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
- an ordinary, non-retrodictive query never invokes EBR at all.

See `supabase/functions/_shared/ibis-ebr-engine.test.ts` and the EBR-specific cases in
`ibis-reasoning-engines.test.ts` / `ibis-canonical-brain.test.ts` for the tests that enforce this.
