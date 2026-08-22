// FTN Platform Website — Observer Correlation Engine.
//
// A real, bounded rule-based engine, not a speculative one: it evaluates a fixed, documented
// set of domain relationships (the kind any T&T meteorologist or emergency manager already
// knows — heavy rain can produce flooding, which can disrupt roads, ferries and power) and is
// explicit about which of those it can actually verify right now versus which it cannot.
//
// Extends the existing shared Relationship Engine (js/relationships-data.js) rather than
// forking a second registry — see CLAUDE.md §7.3, "the pattern to extend, never fork." Each
// edge below is pushed into global.FTN.Relationships.all using that file's own field shape, so
// Trust Cards' existing "what this connects to" section picks these up for free. Two additional
// fields are used that the base schema doesn't need: fromObserverViewId/toObserverViewId, for
// edges whose endpoint is an Observer view (js/observer-data.js) rather than an Indicator
// Engine entry — both existing consumers ignore unknown fields, so this is additive only.
//
// Confidence is computed with js/ftn-source-provenance.js's claimConfidence() — the same
// fail-closed rule used everywhere else in FTN: a chain is only as confident as its weakest,
// least-corroborated real signal, never inflated by the number of rules that reference it.
(function (global) {
  'use strict';

  var EDGES = [
    {
      id: 'observer-rain-to-downstream', title: 'Heavy Rainfall → Downstream Disruption Risk', type: 'influence',
      fromIndicatorId: 'rainfall', fromLabel: 'Rainfall (30-day)', fromObserverViewId: 'weather-radar',
      toIndicatorId: 'flood-alerts', toLabel: 'Flood Warning Risk', toObserverViewId: 'weather-flood',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented meteorological relationship (sustained heavy rainfall raises flood risk) — not a statistically fitted coefficient for Trinidad & Tobago.',
      limitations: 'This is domain knowledge, not a live-fitted model. Whether current rainfall is actually producing flood conditions is decided by the Met Office/ODPM sources, not by FTN.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-flood-to-roads', title: 'Flood Warning → Road Disruption', type: 'influence',
      fromIndicatorId: 'flood-alerts', fromLabel: 'Flood Warning Risk', fromObserverViewId: 'weather-flood',
      toIndicatorId: 'road-condition-reports', toLabel: 'Road Disruption', toObserverViewId: 'transport-roads',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented relationship — active flooding commonly closes or degrades roads in low-lying areas.',
      limitations: 'Not evaluated against real current road-closure data; the Ministry of Works and Transport is the authority on actual closures.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-flood-to-ferry', title: 'Flood / Severe Weather → Ferry Disruption', type: 'influence',
      fromIndicatorId: 'flood-alerts', fromLabel: 'Flood Warning Risk', fromObserverViewId: 'weather-flood',
      toIndicatorId: null, toLabel: 'Ferry Disruption', toObserverViewId: 'transport-ferry',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented relationship — the same severe-weather conditions that cause flooding (heavy swell, poor visibility, high wind) can also disrupt the Port of Spain ↔ Scarborough ferry.',
      limitations: 'Not a claim of a direct flood-causes-ferry-delay mechanism; both share a common severe-weather cause. The Port Authority is the authority on actual sailing status.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-flood-to-power', title: 'Flood / Severe Weather → Power Interruption', type: 'influence',
      fromIndicatorId: 'flood-alerts', fromLabel: 'Flood Warning Risk', fromObserverViewId: 'weather-flood',
      toIndicatorId: null, toLabel: 'Power Interruption', toObserverViewId: 'infra-power',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented relationship — severe weather (wind, flooding, lightning) is a common cause of unplanned T&TEC service interruptions.',
      limitations: 'Not evaluated against real current outage data. T&TEC is the authority on actual interruptions.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-disruption-to-reports', title: 'Visible Disruption → Community Connect Reports', type: 'influence',
      fromIndicatorId: 'road-condition-reports', fromLabel: 'Road / Service Disruption', fromObserverViewId: 'transport-roads',
      toIndicatorId: null, toLabel: 'Community Connect Reports', toObserverViewId: null,
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented pattern — visible disruption (flooding, road closures, outages) typically increases citizen reporting volume in a reporting app.',
      limitations: 'FTN Observer has no live connection to Community Connect report volume in this pass — this is the documented future integration point, not a live count.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-reports-to-response', title: 'Community Connect Reports → Official Response', type: 'dependency',
      fromIndicatorId: null, fromLabel: 'Community Connect Reports', fromObserverViewId: null,
      toIndicatorId: null, toLabel: 'Official Response', toObserverViewId: 'civic-notices',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented civic pattern — reported issues are the input official agencies (T&TEC, MOWT, ODPM) act on and publish notices about.',
      limitations: 'FTN does not track whether a specific report produced a specific official notice — this states the general dependency, not a verified case.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    }
  ];

  function registerIntoRelationshipEngine() {
    var Rel = global.FTN && global.FTN.Relationships;
    if (!Rel || !Array.isArray(Rel.all)) return;
    var existingIds = {};
    Rel.all.forEach(function (r) { existingIds[r.id] = true; });
    EDGES.forEach(function (e) { if (!existingIds[e.id]) Rel.all.push(e); });
  }

  // The one real, currently-live signal available to this engine: current Port of Spain
  // precipitation from the same Open-Meteo fetch the NOW view already performs. A rate above
  // this threshold is what "watching" means below — an explicit, documented number, not a
  // hidden one. Everything downstream of it is honestly reported as not-monitored, because FTN
  // has no live parser for flood/road/ferry/power status.
  var HEAVY_RAIN_MM = 4;

  function evaluate(currentPrecipitationMm) {
    var Prov = global.FTN && global.FTN.SourceProvenance;
    var rainActive = Number.isFinite(currentPrecipitationMm) && currentPrecipitationMm >= HEAVY_RAIN_MM;
    var rainRecord = Prov ? Prov.sourceRecord({
      sourceId: 'open-meteo-precipitation', owner: 'Open-Meteo', sourceClass: 'CORPORATE_STATEMENT',
      url: 'https://open-meteo.com/', retrievedAt: new Date().toISOString(), retrievalMethod: 'DIRECT_FETCH',
      geographicRelevance: 'Port of Spain', consumingProducts: ['FTN Observer Correlation Engine']
    }) : null;
    var confidence = Prov && rainRecord ? Prov.claimConfidence([rainRecord]) : { confidence: 'UNSUPPORTED', ceilingQuality: null, corroboration: 0 };

    var chain = EDGES.map(function (edge, i) {
      var status;
      if (i === 0) {
        status = Number.isFinite(currentPrecipitationMm)
          ? (rainActive ? 'WATCHING' : 'NO SIGNAL')
          : 'UNKNOWN';
      } else {
        status = 'NOT MONITORED';
      }
      return {
        id: edge.id, title: edge.title, toLabel: edge.toLabel,
        toObserverViewId: edge.toObserverViewId, methodology: edge.methodology, status: status
      };
    });

    return {
      chain: chain,
      rainfall: { mm: Number.isFinite(currentPrecipitationMm) ? currentPrecipitationMm : null, thresholdMm: HEAVY_RAIN_MM, active: rainActive },
      overallConfidence: confidence.confidence,
      confidenceCeiling: confidence.ceilingQuality,
      explanation: rainActive
        ? 'Current rainfall meets the documented "heavy rainfall" threshold — the chain below shows which downstream categories that historically affects. FTN has not verified that any of them are actually disrupted right now; open each category for its official source.'
        : 'Current rainfall is below the documented "heavy rainfall" threshold, so this chain has no active trigger right now. The relationships themselves remain documented for reference.',
      generatedAt: new Date().toISOString()
    };
  }

  registerIntoRelationshipEngine();

  global.FTN = global.FTN || {};
  global.FTN.ObserverCorrelation = { edges: EDGES.slice(), evaluate: evaluate, HEAVY_RAIN_MM: HEAVY_RAIN_MM };
})(window);
