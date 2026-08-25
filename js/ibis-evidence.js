// FTN Platform — ibis evidence disclosure (Phase 4B). Decides when an ibis response needs a
// compact evidence trigger, maps js/ibis-provenance.js's internal envelope into the exact data
// shape js/trust-card.js's existing render() already understands, and mounts the trigger itself.
//
// Explicitly reuses the existing Trust Card component -- this is not a competing evidence UI. The
// trigger is collapsed by default (a small button, same .trust-trigger class already used
// elsewhere for indicator evidence rows); the full card only ever appears in the one shared modal,
// opened via the same FTN.TrustCard.open() every other evidence trigger on the site already calls.
//
// Never exposes: hidden prompts, credentials, internal endpoints, the raw attempts/routingPath
// list (an internal retry log, not evidence), chain-of-thought, private user content, or raw
// system logs. Only the FINAL winning provider/model, cost class, confidence basis and a
// plain-language degraded-state sentence are ever surfaced.
(function (global) {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // --- 1. Evidence-display decision matrix -----------------------------------------------------
  // "Clearly labelled deterministic tools" (per the founder's evidence-optional list) -- capability
  // strings from js/ibis-capability-taxonomy.js that are already self-evidently non-claim-making
  // (local synthesis, local analysis of the user's own supplied text/content).
  var DETERMINISTIC_TOOL_CAPABILITIES = [
    'BPM_DETECTION', 'AUDIO_ANALYSIS', 'INSTRUMENTAL_GENERATION', 'SFX_GENERATION',
    'RUNTIME_ESTIMATION', 'QC', 'CARIBBEAN_LANGUAGE_ID',
  ];

  // A deterministic keyword heuristic over the USER's own prompt (never the model's answer, which
  // FTN has no semantic access to at this layer) -- same style and honesty standard as
  // js/ibis-live-research.js's looksLikeLiveRequest(): a real, inspectable, non-AI classifier, not
  // a simulated judgment call. Errs toward showing evidence when uncertain, per the founder's own
  // "never hide a required disclosure" instruction -- a false positive here just shows an optional
  // trigger a user can ignore; a false negative hides something they may have needed.
  var EVIDENCE_TOPIC_PATTERNS = [
    /\b(government|parliament|minister|ministry|legislation|\bbill\b|civic|election|constituency)\b/i,
    /\b(statistic|percent(age)?|\brate\b|\bfigure\b|how many|data shows|according to|number of)\b/i,
    /\b(safe|safety|danger|risk|health|medical|disease|symptom|hospital|emergency)\b/i,
    /\b(financ|invest|\bloan\b|interest rate|\btax\b|budget|price of|cost of|salary|wage)\b/i,
    /\b(legal|lawsuit|\bcourt\b|contract|liability|\brights\b)\b/i,
    /\b(current(ly)?|\btoday\b|right now|\blatest\b|up.to.date|as of)\b/i,
    /\b(compare|comparison|recommend|which is better|should i|best option)\b/i,
  ];
  function looksLikeEvidenceTopic(prompt) {
    var text = String(prompt || '');
    return EVIDENCE_TOPIC_PATTERNS.some(function (re) { return re.test(text); });
  }

  // input: {capability, prompt, degradedState, routingPath, sources}
  function isEvidenceRequired(input) {
    input = input || {};
    // Rule 1 (absolute -- never overridden by capability/topic): a degraded, incomplete or
    // fallback provenance state must always surface.
    if (input.degradedState) return true;
    if (Array.isArray(input.routingPath) && input.routingPath.length > 1) return true;
    // Rule 2: capabilities/results that are inherently external-evidence-bearing.
    if (input.capability === 'LIVE_INTELLIGENCE') return true;
    // Phase 5B: every FTN Statistics answer traces to a real government source -- the founder's
    // own instruction is a Trust Card for EVERY statistical response, not only when a caller
    // remembers to pass `sources`. js/ftn-statistics.js's provenanceFor() always stamps
    // capability:'STATISTIC' (regardless of whether a caller reaches it via ibis or renders it
    // directly, e.g. js/crime-intelligence.js/js/fx-intelligence.js's own Trust Card triggers), so
    // this rule covers both paths with one line rather than two.
    if (input.capability === 'STATISTIC') return true;
    if (Array.isArray(input.sources) && input.sources.length > 0) return true;
    // Rule 3: clearly labelled deterministic tools are evidence-optional by design.
    if (DETERMINISTIC_TOOL_CAPABILITIES.indexOf(input.capability) !== -1) return false;
    // Rule 4: general TEXT/creative capabilities -- content-dependent on the user's own prompt.
    if (input.capability === 'TEXT' && looksLikeEvidenceTopic(input.prompt)) return true;
    return false;
  }

  // --- 2. Provenance envelope -> Trust Card data shape ------------------------------------------
  var COST_LABELS = {
    ZERO_COST_TO_IBIS: 'Processed locally or via a zero-cost route — no provider was paid for this response.',
    ZERO_CUSTOMER_FUNDED: 'Paid for using your own prepaid ibis Credits, not FTN.',
    PAID_BY_IBIS_PRE_EXISTING: 'Answered by a provider FTN already pays for.',
    PAID_BY_IBIS_FOUNDER_APPROVED: 'Answered by a founder-approved paid provider.',
  };
  function humanCostNote(costToIbis) { return COST_LABELS[costToIbis] || null; }

  var RETRIEVAL_METHOD_LABELS = {
    LIVE_API_FETCH: 'A live request made at the time of your question',
    LOCAL_COMPUTATION: 'Calculated locally — no external source was consulted',
    MANUAL_ENTRY: 'Entered by FTN',
  };
  function humanRetrievalMethod(method) { return method ? (RETRIEVAL_METHOD_LABELS[method] || method) : null; }

  var DEGRADED_LABELS = {
    ALL_PROVIDERS_FAILED: 'Every available route failed to answer this request — nothing was invented in its place.',
    NO_ELIGIBLE_PROVIDER: 'No eligible route was available for this request right now.',
  };
  function humanDegraded(state) { return state ? (DEGRADED_LABELS[state] || state) : null; }

  function humanConfidence(basis) {
    var notAssessed = (global.FTN && global.FTN.IbisProvenance && global.FTN.IbisProvenance.NOT_ASSESSED) || 'NOT_ASSESSED';
    if (!basis || basis === notAssessed) return 'Not assessed';
    return basis;
  }

  // Real vendor/product name from the provider registry when available (e.g. registry id
  // 'ibis-query-gemini' -> its own declared name "ibis-query (Google Gemini)") rather than the
  // internal id string -- falls back to the raw id only if the registry isn't loaded.
  function humanProcessing(provenance) {
    if (!provenance.provider) return null;
    var registry = global.FTN && global.FTN.IbisProviders;
    var record = registry ? registry.get(provenance.provider) : null;
    var label = (record && record.name) || provenance.provider;
    return provenance.model ? label + ' — ' + provenance.model : label;
  }

  // provenance: a js/ibis-provenance.js envelope (or a plain object with the same field names).
  // extra: {title, prompt, methodology, limitations, sources, formula, formulaDefinitions,
  //         formulaSubstitution} -- caller-supplied context the envelope itself doesn't carry.
  // Deliberately never includes provenance.attempts/routingPath/nodeId in the returned data --
  // those are internal routing details, not evidence (see this file's own header comment).
  function toTrustCardData(provenance, extra) {
    provenance = provenance || {};
    extra = extra || {};
    var hasExternalSource = !!(provenance.sourceUrl || (extra.sources && extra.sources.length));
    var data = {
      title: extra.title || provenance.sourceIdentity || 'How this response was produced',
      publisher: provenance.publisher || null,
      methodology: extra.methodology || provenance.transformation || null,
      processing: humanProcessing(provenance),
      costNote: humanCostNote(provenance.costToIbis),
      confidenceBasis: humanConfidence(provenance.confidenceBasis),
      degradedState: humanDegraded(provenance.degradedState),
      limitations: extra.limitations || null,
      licensingNote: provenance.licensingNote || null,
    };
    if (provenance.sourceRetrievedAt || provenance.respondedAt) {
      data.lastUpdated = provenance.sourceRetrievedAt || provenance.respondedAt;
    }
    if (hasExternalSource) {
      var firstSource = extra.sources && extra.sources[0];
      data.externalSourceUrl = provenance.sourceUrl || (firstSource && firstSource.url) || null;
      data.externalSourceLabel = provenance.sourceIdentity || provenance.publisher || (firstSource && firstSource.title) || data.externalSourceUrl;
      // Key present (even when the value is null) so trust-card.js's own referenceDateRow()
      // honestly renders "not published by the source" rather than omitting the row entirely --
      // only done when there IS a real external source context, never for a pure-inference result
      // where "source reference date" isn't a meaningful concept at all.
      data.referenceDate = provenance.sourceReferenceDate || null;
      data.retrievalMethod = humanRetrievalMethod(provenance.retrievalMethod) || (extra.sources ? RETRIEVAL_METHOD_LABELS.LIVE_API_FETCH : null);
    }
    if (extra.formula) {
      data.formula = extra.formula;
      data.formulaDefinitions = extra.formulaDefinitions || null;
      data.formulaSubstitution = extra.formulaSubstitution || null;
    }
    return data;
  }

  // --- 3. Compact, collapsed-by-default trigger --------------------------------------------------
  // Mounts nothing (returns null) when evidence isn't required for this response -- callers for a
  // creative/casual response simply don't get a trigger at all, per the founder's explicit "do not
  // place a large Trust Card beneath every casual or creative response" instruction. `onDark`
  // (default true) selects trust-card.css's existing .trust-trigger--on-dark variant, already
  // built for exactly this placement (a light-modal trigger inside ibis's dark chat surface).
  function mount(container, provenance, extra, options) {
    if (!container) return null;
    provenance = provenance || {};
    extra = extra || {};
    options = options || {};
    var required = isEvidenceRequired({
      capability: provenance.capability,
      prompt: extra.prompt,
      degradedState: provenance.degradedState,
      routingPath: provenance.routingPath,
      sources: extra.sources,
    });
    if (!required) return null;
    var data = toTrustCardData(provenance, extra);
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'trust-trigger ibis-evidence-trigger' + (options.onDark === false ? '' : ' trust-trigger--on-dark');
    trigger.textContent = provenance.degradedState ? 'What happened with this answer' : 'View evidence';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.onclick = function () {
      if (global.FTN && global.FTN.TrustCard) global.FTN.TrustCard.open(data);
    };
    container.appendChild(trigger);
    return trigger;
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisEvidence = {
    isEvidenceRequired: isEvidenceRequired,
    toTrustCardData: toTrustCardData,
    mount: mount,
    DETERMINISTIC_TOOL_CAPABILITIES: DETERMINISTIC_TOOL_CAPABILITIES,
  };
})(typeof window !== 'undefined' ? window : globalThis);
