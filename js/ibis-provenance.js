// FTN Platform — the internal IBIS provenance envelope (Phase 4A: ibis source/provider routing
// consolidation). One canonical, additive superset shape for what js/ibis-client.js's request()
// already built inline, now shared so js/ibis-ai-workspace.js's serverAI() and any future caller
// build the SAME envelope instead of each inventing its own ad hoc shape.
//
// Internal data contract ONLY -- this is not the Trust Card, not the Trust Centre, not any
// public-facing evidence UI. Nothing here is rendered to a user by this pass; see
// GOVERNANCE ledger IBIS-MAP.md's Phase 4A section for the explicit scope boundary.
//
// Two concepts kept structurally distinct per the founder's own instruction (do not combine a
// content source and an inference provider into one ambiguous "source"):
//   - the `source*`/`publisher`/`retrievalMethod` fields describe an external INFORMATION source
//     this result cites or was derived from (e.g. a Live Intelligence result's Hacker News post) --
//     null when no external source was consulted (e.g. a pure local-DSP or model-inference result).
//   - `provider`/`model`/`costToIbis` describe the INFERENCE PROVIDER that produced the result --
//     null when no provider/model was involved (e.g. a pure source-retrieval result with no
//     synthesis step, or a fully local deterministic capability that used no "model" as such).
// A single result can legitimately carry both (e.g. Live Intelligence: a local synthesis step
// PLUS real external sources) or just one.
//
// Fields never manufactured: every field defaults to an explicit unknown/not-assessed sentinel
// (`null` or `NOT_ASSESSED`) rather than a guessed value. A caller that has a real value supplies
// it; a caller that doesn't leaves the honest default in place.
(function (global) {
  'use strict';

  var NOT_ASSESSED = 'NOT_ASSESSED';

  function build(fields) {
    fields = fields || {};
    var attempts = Array.isArray(fields.attempts) ? fields.attempts : [];
    return {
      // Existing fields from js/ibis-client.js's original inline provenance object -- unchanged
      // names/shape, so this is a strict additive superset, not a breaking redesign.
      nodeId: fields.nodeId !== undefined ? fields.nodeId : null,
      capability: fields.capability || null,
      requestedAt: fields.requestedAt || null,
      respondedAt: fields.respondedAt || null,
      attempts: attempts,
      provider: fields.provider !== undefined ? fields.provider : null,
      costToIbis: fields.costToIbis !== undefined ? fields.costToIbis : null,

      // New fields (Phase 4A) -- the internal envelope schema requested for every routed result.
      sourceIdentity: fields.sourceIdentity !== undefined ? fields.sourceIdentity : null,
      sourceUrl: fields.sourceUrl !== undefined ? fields.sourceUrl : null,
      publisher: fields.publisher !== undefined ? fields.publisher : null,
      sourceRetrievedAt: fields.sourceRetrievedAt !== undefined ? fields.sourceRetrievedAt : null,
      sourceReferenceDate: fields.sourceReferenceDate !== undefined ? fields.sourceReferenceDate : null,
      retrievalMethod: fields.retrievalMethod !== undefined ? fields.retrievalMethod : null,
      model: fields.model !== undefined ? fields.model : null,
      // Derived convenience view of the same attempts array the existing field already carries --
      // named per the requested schema ("routing/fallback path used"), not a second data source.
      routingPath: attempts.map(function (a) { return a.providerId; }),
      transformation: fields.transformation !== undefined ? fields.transformation : null,
      confidenceBasis: fields.confidenceBasis || NOT_ASSESSED,
      licensingNote: fields.licensingNote !== undefined ? fields.licensingNote : null,
      degradedState: fields.degradedState !== undefined ? fields.degradedState : null,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisProvenance = { build: build, NOT_ASSESSED: NOT_ASSESSED };
})(typeof window !== 'undefined' ? window : globalThis);
