// FTN Platform — the shared FTN Statistics data contract (Phase 5A). One canonical schema for a
// verified official statistic, meant to serve FTN Statistics, FTN Live, ibis.ai, FTN Screen, FTN
// Govern, FTN Parliament and Community Connect alike -- not a second, page-specific data shape.
//
// Aligned with js/ibis-provenance.js on purpose, not a competing evidence model: an Observation's
// provenance is built via FTN.IbisProvenance.build() when that module is loaded, reusing its exact
// field vocabulary (sourceIdentity/sourceUrl/publisher/sourceRetrievedAt/sourceReferenceDate/
// retrievalMethod/confidenceBasis/licensingNote/degradedState) rather than inventing new names for
// the same concepts. Falls back to a minimal local shape if ibis-provenance.js isn't loaded (this
// module must not hard-depend on ibis being present -- FTN Govern/Parliament/Community Connect
// have no reason to load the ibis fabric just to show a statistic).
//
// Five deliberately separated concerns (never merge presentation formatting into raw observations):
//   1. Indicator definitions  -- what the metric IS (id, name, topic, geography, unit, frequency)
//   2. Source datasets        -- what document/dataset an observation came from
//   3. Observations           -- one real, dated, sourced data point
//   4. Derived calculations   -- a formula applied to one or more observations (e.g. a rate)
//   5. Presentation config    -- chart/table display hints (lives in the consuming page, not here)
(function (global) {
  'use strict';

  var NOT_ASSESSED = 'NOT_ASSESSED';

  // --- Enums (small, closed sets -- an adapter producing a value outside these fails validation
  // rather than silently accepting a typo or a source's renamed category). ---
  var TOPICS = ['CRIME_AND_JUSTICE', 'ECONOMY', 'POPULATION', 'ENVIRONMENT', 'INFRASTRUCTURE', 'HEALTH', 'EDUCATION', 'TOURISM'];
  var GEO_LEVELS = ['NATIONAL', 'REGIONAL', 'POLICE_DIVISION', 'MUNICIPALITY'];
  var FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL', 'IRREGULAR'];
  var REVISION_STATUSES = ['FINAL', 'PROVISIONAL', 'REVISED'];
  var UNAVAILABLE_REASONS = ['SOURCE_UNREACHABLE', 'SOURCE_STRUCTURE_CHANGED', 'NO_VERIFIED_VALUE', 'LICENSING_UNCLEAR'];

  function isIn(list, value) { return list.indexOf(value) !== -1; }

  // --- 1. Indicator definition -------------------------------------------------------------------
  // Mirrors js/product-registry-data.js's product() factory pattern: a small defaults object,
  // merged with real per-indicator overrides, so every definition is complete without hand-typing
  // every field on every call site.
  function indicatorDefinition(config) {
    return Object.assign({
      id: null,
      publicName: null,
      description: null,
      topic: null,
      geography: 'Trinidad and Tobago',
      geoLevel: 'NATIONAL',
      unit: null,
      frequency: 'IRREGULAR',
      formula: null,
      formulaInputs: [],
      consumingProducts: [],
    }, config);
  }

  // --- 2. Source dataset/document -----------------------------------------------------------------
  function sourceDataset(config) {
    return Object.assign({
      id: null,
      name: null,
      publisher: null,
      url: null,
      documentId: null,
      accessMethod: null, // e.g. 'PUBLIC_CSV_DOWNLOAD', 'PUBLIC_HTML_EMBEDDED_JSON'
      licensingNote: null, // never fabricated -- null means genuinely not established, see Phase 5A source map
    }, config);
  }

  // --- 3. Observation -------------------------------------------------------------------------------
  // A single real, dated, sourced data point. `suppressionReason` (one of UNAVAILABLE_REASONS) marks
  // an observation FTN deliberately did not populate with a value -- the explicit unavailable state
  // the founder's own instruction requires, never a silently-missing field.
  function observation(config) {
    config = config || {};
    if (config.topic && !isIn(TOPICS, config.topic)) throw new Error('ftn-statistics: unrecognized topic "' + config.topic + '"');
    if (config.geoLevel && !isIn(GEO_LEVELS, config.geoLevel)) throw new Error('ftn-statistics: unrecognized geoLevel "' + config.geoLevel + '"');
    if (config.frequency && !isIn(FREQUENCIES, config.frequency)) throw new Error('ftn-statistics: unrecognized frequency "' + config.frequency + '"');
    if (config.revisionStatus && !isIn(REVISION_STATUSES, config.revisionStatus)) throw new Error('ftn-statistics: unrecognized revisionStatus "' + config.revisionStatus + '"');
    if (config.suppressionReason && !isIn(UNAVAILABLE_REASONS, config.suppressionReason)) throw new Error('ftn-statistics: unrecognized suppressionReason "' + config.suppressionReason + '"');
    return Object.assign({
      indicatorId: null,
      value: null,
      unit: null,
      referencePeriod: null, // the period the SOURCE says this value covers -- never FTN's retrieval date
      sourceReferenceDate: null, // the source's own dated/as-at period; null when the publisher does not state one
      publicationDate: null, // when the SOURCE published this value -- null (not omitted) when the source doesn't state one
      retrievedAt: null, // FTN's own retrieval timestamp -- always distinct from referencePeriod/publicationDate
      sourceId: null,
      revisionStatus: 'FINAL',
      confidenceBasis: NOT_ASSESSED,
      suppressionReason: null, // set (and `value` left null) when a real value could not be verified -- see UNAVAILABLE_REASONS
    }, config);
  }

  // --- 4. Derived calculation ------------------------------------------------------------------------
  // A formula applied to one or more real observations (e.g. a per-100,000 rate). `inputs` names the
  // real observation ids/values used -- a derived value is never presented without the formula and
  // the inputs that produced it.
  function derivedCalculation(config) {
    return Object.assign({
      id: null,
      formula: null,
      inputs: [],
      computedValue: null,
      basis: NOT_ASSESSED,
    }, config);
  }

  // Builds an Observation's provenance envelope via the shared js/ibis-provenance.js builder when
  // available (the whole point of aligning with it), falling back to a minimal local shape with the
  // same field names when ibis isn't loaded on this page (FTN Govern/Parliament have no reason to
  // pull in the ibis fabric just to show a Trust Card).
  function provenanceFor(obs, source) {
    var fields = {
      capability: 'STATISTIC',
      sourceIdentity: source ? source.name : null,
      sourceUrl: source ? source.url : null,
      publisher: source ? source.publisher : null,
      sourceRetrievedAt: obs.retrievedAt,
      sourceReferenceDate: obs.sourceReferenceDate,
      retrievalMethod: source ? source.accessMethod : null,
      confidenceBasis: obs.confidenceBasis,
      licensingNote: source ? source.licensingNote : null,
      degradedState: obs.suppressionReason,
    };
    if (global.FTN && global.FTN.IbisProvenance) return global.FTN.IbisProvenance.build(fields);
    return Object.assign({ nodeId: null, capability: 'STATISTIC', requestedAt: null, respondedAt: null, attempts: [], provider: null, costToIbis: null, model: null, routingPath: [], transformation: null }, fields);
  }

  global.FTN = global.FTN || {};
  global.FTN.Statistics = {
    TOPICS: TOPICS, GEO_LEVELS: GEO_LEVELS, FREQUENCIES: FREQUENCIES,
    REVISION_STATUSES: REVISION_STATUSES, UNAVAILABLE_REASONS: UNAVAILABLE_REASONS, NOT_ASSESSED: NOT_ASSESSED,
    indicatorDefinition: indicatorDefinition, sourceDataset: sourceDataset,
    observation: observation, derivedCalculation: derivedCalculation, provenanceFor: provenanceFor,
  };
})(typeof window !== 'undefined' ? window : globalThis);
