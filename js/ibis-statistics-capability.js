// FTN Platform — ibis STATISTIC_QUERY capability (Phase 5B). A deterministic, zero-model query
// engine over the shared js/ftn-statistics.js contract. No language model is ever involved in this
// module's data path -- every answer is retrieved directly from a real Observation object and,
// where a comparison/change is requested, computed by a fixed, auditable formula. This is a
// deliberate design choice, not a limitation to fix later: the founder's own instruction is "never
// permit a language model to invent, replace or update a missing observation," and the simplest way
// to make that true by construction is to never call a model for this capability at all. No paid
// provider is enabled for STATISTIC_QUERY in js/ibis-provider-registry.js, matching that.
//
// This module performs NO fetch/I/O itself (same discipline as js/ftn-statistics.js and its
// adapters) -- a caller builds a "catalog" via buildCatalog() from already-fetched raw JSON and
// passes it to query(). This keeps the module synchronously testable in plain Node (see
// tests/ibis-statistics-capability-audit.mjs) and keeps data retrieval the caller's own concern.
//
// Bounded intent set (the founder's own explicit list): latest value, source/methodology,
// comparison between compatible periods, change (absolute/percentage), available indicators, and
// an honest explanation of why a figure is unavailable or stale. A question outside this set fails
// closed with UNSUPPORTED_INTENT rather than guessing at an answer.
(function (global) {
  'use strict';

  // --- 1. Catalog construction --------------------------------------------------------------------
  // Merges every loaded adapter's real output into one queryable set. Each entry in `adapters` names
  // the global.FTN key its adapter is exposed under and the key in `rawByAdapter` its raw JSON lives
  // under -- adding a third indicator later means adding one line here, not touching query logic.
  var ADAPTERS = [
    { key: 'crime', globalName: 'StatisticsCrimeAdapter' },
    { key: 'fx', globalName: 'StatisticsFxAdapter' },
  ];

  function buildCatalog(rawByAdapter) {
    rawByAdapter = rawByAdapter || {};
    var indicatorDefinitions = [], sources = {}, observations = [], derivedCalculations = [];
    ADAPTERS.forEach(function (a) {
      var raw = rawByAdapter[a.key];
      var adapter = global.FTN && global.FTN[a.globalName];
      if (!raw || !adapter) return;
      var built = adapter.buildObservations(raw);
      indicatorDefinitions = indicatorDefinitions.concat(built.indicatorDefinitions || []);
      Object.keys(built.sources || {}).forEach(function (k) { sources[built.sources[k].id || k] = built.sources[k]; });
      observations = observations.concat(built.observations || []);
      derivedCalculations = derivedCalculations.concat(built.derivedCalculations || []);
    });
    return { indicatorDefinitions: indicatorDefinitions, sources: sources, observations: observations, derivedCalculations: derivedCalculations };
  }

  // --- 2. Deterministic intent + indicator + period extraction ------------------------------------
  var INTENT_PATTERNS = [
    { intent: 'LIST_INDICATORS', pattern: /\b(what (statistics|indicators|data) (do you have|are available|can (i|you) (ask|query))|available indicators|list (the )?indicators)\b/i },
    { intent: 'WHY_UNAVAILABLE', pattern: /\b(why (is|are|isn't|aren't|was|were).{0,40}(unavailable|missing|not available)|what happened (with|to) this (figure|data|value|number))\b/i },
    { intent: 'COMPARE', pattern: /\b(compare|comparison|versus|\bvs\b|difference between)\b/i },
    { intent: 'CHANGE', pattern: /\b(chang(e|ed|es|ing)|increas(e|ed|es|ing)|decreas(e|ed|es|ing)|grew|grow|risen|fallen|dropped|went up|went down|up or down)\b/i },
    { intent: 'METHODOLOGY', pattern: /\b(source|methodology|how is (this|it) calculated|where does (this|the) data come from|how do you know|reference|published by|who publishes|formula)\b/i },
    { intent: 'LATEST_VALUE', pattern: /\b(latest|current|how many|what is|what's|value|figure|rate|count|total)\b/i },
  ];

  function classifyIntent(text) {
    var t = String(text || '');
    for (var i = 0; i < INTENT_PATTERNS.length; i++) {
      if (INTENT_PATTERNS[i].pattern.test(t)) return INTENT_PATTERNS[i].intent;
    }
    return null;
  }

  // Longer, more specific keywords are checked first ("murder rate" before "murder") so a query
  // never matches the wrong indicator just because a shorter keyword is a substring of a longer one.
  var INDICATOR_KEYWORDS = {
    'crime-murder-rate-per-100k': ['murder rate', 'homicide rate', 'per 100,000', 'per 100k', 'rate per 100'],
    'crime-murders-reported': ['murder', 'murders', 'homicide', 'homicides', 'reported murders'],
    'fx-usd-selling-rate': ['selling rate', 'buy usd', 'buy us dollar', 'usd selling', 'exchange rate', 'us dollar rate', 'usd rate', 'usd/ttd', 'ttd/usd'],
    'fx-usd-buying-rate': ['buying rate', 'sell usd', 'sell us dollar', 'usd buying'],
  };

  function matchedCandidates(catalog, text) {
    var lower = String(text || '').toLowerCase();
    var known = {};
    catalog.indicatorDefinitions.forEach(function (d) { known[d.id] = true; });
    var candidates = [];
    Object.keys(INDICATOR_KEYWORDS).forEach(function (id) {
      if (!known[id]) return;
      INDICATOR_KEYWORDS[id].forEach(function (kw) {
        if (lower.indexOf(kw) !== -1) candidates.push({ id: id, kw: kw });
      });
    });
    candidates.sort(function (a, b) { return b.kw.length - a.kw.length; });
    return candidates;
  }
  function matchIndicator(catalog, text) {
    var candidates = matchedCandidates(catalog, text);
    return candidates.length ? candidates[0].id : null;
  }
  // The distinct set of indicator ids a query mentions -- used only to detect a genuinely
  // ambiguous cross-indicator comparison request (see COMPARE/CHANGE handling in query() below).
  // matchIndicator() above still returns its single best (longest-keyword) guess for LATEST_VALUE/
  // METHODOLOGY, where picking one most-specific indicator from a query is a reasonable default.
  function distinctIndicatorIds(catalog, text) {
    var seen = {}, ids = [];
    matchedCandidates(catalog, text).forEach(function (c) { if (!seen[c.id]) { seen[c.id] = true; ids.push(c.id); } });
    return ids;
  }

  function extractPeriods(text) {
    var t = String(text || '');
    var years = (t.match(/\b(19|20)\d{2}\b/g) || []).map(String);
    var months = (t.match(/\b(19|20)\d{2}-(0[1-9]|1[0-2])\b/g) || []);
    return { years: years, months: months };
  }

  // --- 3. Observation lookup helpers ---------------------------------------------------------------
  function observationsFor(catalog, indicatorId) {
    return catalog.observations.filter(function (o) { return o.indicatorId === indicatorId; });
  }
  function sourceFor(catalog, sourceId) { return catalog.sources[sourceId] || null; }
  function indicatorFor(catalog, indicatorId) {
    return catalog.indicatorDefinitions.filter(function (d) { return d.id === indicatorId; })[0] || null;
  }
  // A period token matches an observation's referencePeriod if the token appears verbatim inside
  // it -- covers both a bare year ("2024") against an ANNUAL referencePeriod ("2024") and a
  // YYYY-MM token against a MONTHLY one ("2026-07"), and also matches a year against the crime
  // current-year observation's longer "1 January – ..., 2026" string.
  function observationForPeriod(observations, token) {
    return observations.filter(function (o) { return o.referencePeriod && String(o.referencePeriod).indexOf(token) !== -1; })[0] || null;
  }
  // "Latest" = the observation whose own period token (last YYYY or YYYY-MM found in
  // referencePeriod) sorts highest -- works for both ANNUAL ("2024") and MONTHLY ("2026-07")
  // series without hardcoding either shape.
  function periodKey(obs) {
    var m = String(obs.referencePeriod || '').match(/(19|20)\d{2}(-\d{2})?/g);
    return m ? m[m.length - 1] : '';
  }
  function pickLatest(observations) {
    var sorted = observations.slice().sort(function (a, b) { return periodKey(b).localeCompare(periodKey(a)); });
    return sorted[0] || null;
  }

  function humanUnavailable(reason) {
    var LABELS = {
      SOURCE_UNREACHABLE: 'FTN could not reach the official source for this figure.',
      SOURCE_STRUCTURE_CHANGED: "FTN's automated check detected the source changed its structure and paused rather than guess at a value.",
      NO_VERIFIED_VALUE: 'No verified value has been published for this period yet.',
      LICENSING_UNCLEAR: "This figure's reuse licensing is not yet clear, so FTN is not displaying a value for it.",
    };
    return LABELS[reason] || ('This figure is unavailable (' + reason + ').');
  }

  // --- 4. Answer builders ---------------------------------------------------------------------------
  function fail(errorType, reason) { return { success: false, errorType: errorType, reason: reason }; }

  function factOf(obs, indicator) {
    return {
      value: obs.value, unit: obs.unit, referencePeriod: obs.referencePeriod,
      sourceReferenceDate: obs.sourceReferenceDate, publicationDate: obs.publicationDate, retrievedAt: obs.retrievedAt,
      revisionStatus: obs.revisionStatus, suppressionReason: obs.suppressionReason,
      indicatorId: indicator.id, indicatorName: indicator.publicName,
    };
  }

  function provenanceOf(obs, source) {
    var Stats = global.FTN && global.FTN.Statistics;
    return Stats ? Stats.provenanceFor(obs, source) : null;
  }

  function answerList(catalog) {
    var list = catalog.indicatorDefinitions.map(function (d) {
      return { id: d.id, name: d.publicName, unit: d.unit, frequency: d.frequency, topic: d.topic };
    });
    var lines = list.map(function (d) { return d.name + ' (' + d.unit + ', ' + d.frequency.toLowerCase() + ')'; });
    var Provenance = global.FTN && global.FTN.IbisProvenance;
    var provenanceFields = {
      capability: 'STATISTIC', retrievalMethod: 'LOCAL_COMPUTATION',
      transformation: 'Listed the indicator definitions currently loaded in the verified FTN Statistics catalog without inference.',
      confidenceBasis: 'Deterministic inventory of the loaded FTN Statistics catalog',
      costToIbis: 'ZERO_COST_TO_IBIS',
    };
    return {
      success: true, intent: 'LIST_INDICATORS',
      indicators: list,
      answer: list.length ? ('FTN Statistics currently has ' + list.length + ' verified indicator(s): ' + lines.join('; ') + '.') : 'No verified indicators are loaded right now.',
      provenance: Provenance ? Provenance.build(provenanceFields) : provenanceFields,
    };
  }

  function answerLatest(catalog, indicatorId) {
    var indicator = indicatorFor(catalog, indicatorId);
    if (!indicator) return fail('UNKNOWN_INDICATOR', 'FTN Statistics does not recognize that indicator.');
    var obs = observationsFor(catalog, indicatorId);
    if (!obs.length) return fail('NO_OBSERVATION_FOR_PERIOD', 'No observations are loaded for ' + indicator.publicName + '.');
    var latest = pickLatest(obs);
    var source = sourceFor(catalog, latest.sourceId);
    var provenance = provenanceOf(latest, source);
    if (latest.suppressionReason) {
      var verified = obs.filter(function (o) { return !o.suppressionReason; });
      var fallback = verified.length ? pickLatest(verified) : null;
      var msg = 'The latest observation for ' + indicator.publicName + ' (' + latest.referencePeriod + ') is unavailable: ' + humanUnavailable(latest.suppressionReason);
      if (fallback) msg += ' The most recent verified value is ' + fallback.value + ' ' + fallback.unit + ' (' + fallback.referencePeriod + ').';
      return { success: true, intent: 'LATEST_VALUE', degraded: true, fact: factOf(latest, indicator), fallbackFact: fallback ? factOf(fallback, indicator) : null, source: source, answer: msg, provenance: provenance };
    }
    return {
      success: true, intent: 'LATEST_VALUE', degraded: false,
      fact: factOf(latest, indicator), source: source,
      answer: 'The latest ' + indicator.publicName + ' is ' + latest.value + ' ' + latest.unit + ' (' + latest.referencePeriod + '), retrieved by FTN on ' + (latest.retrievedAt || 'an unrecorded date') + '.' +
        (latest.sourceReferenceDate ? ' The source identifies the reference period as ' + latest.sourceReferenceDate + '.' : ' The source does not publish a statistical reference date for this figure, so its currency cannot be independently confirmed beyond FTN’s own retrieval date.'),
      provenance: provenance,
    };
  }

  function answerMethodology(catalog, indicatorId) {
    var indicator = indicatorFor(catalog, indicatorId);
    if (!indicator) return fail('UNKNOWN_INDICATOR', 'FTN Statistics does not recognize that indicator.');
    var obs = observationsFor(catalog, indicatorId);
    var latest = obs.length ? pickLatest(obs) : null;
    var source = latest ? sourceFor(catalog, latest.sourceId) : null;
    var provenance = latest ? provenanceOf(latest, source) : null;
    var parts = [indicator.publicName + ': ' + indicator.description];
    if (indicator.formula) parts.push('Formula: ' + indicator.formula + '.');
    if (source) parts.push('Source: ' + source.name + ' (' + source.publisher + '), ' + source.url + '.');
    return {
      success: true, intent: 'METHODOLOGY',
      indicatorId: indicator.id, indicatorName: indicator.publicName,
      description: indicator.description, formula: indicator.formula || null, formulaInputs: indicator.formulaInputs || [],
      source: source, answer: parts.join(' '), provenance: provenance,
    };
  }

  // Two observations are only comparable if they are the exact same indicator, the exact same unit,
  // and drawn from the exact same source dataset -- the crime-statistics safeguard generalized: a
  // full-year CSO total is never compared against a partial-year TTPS cumulative total just because
  // both happen to carry the same indicatorId.
  function isCompatible(a, b) {
    return !!a && !!b && a.indicatorId === b.indicatorId && a.unit === b.unit && a.sourceId === b.sourceId;
  }

  function resolvePeriodPair(catalog, indicatorId, periods) {
    var obs = observationsFor(catalog, indicatorId);
    var tokens = periods.months.length ? periods.months : periods.years;
    var a, b;
    if (tokens.length >= 2) {
      a = observationForPeriod(obs, tokens[0]);
      b = observationForPeriod(obs, tokens[1]);
    } else if (tokens.length === 1) {
      return fail('NEED_TWO_PERIODS', 'Name two compatible periods to compare, or omit periods to compare the two most recent verified observations.');
    } else {
      // No two periods named -- a deterministic, disclosed default: the two most recent real
      // (non-suppressed) observations, never an invented or interpolated pair.
      var verified = obs.filter(function (o) { return !o.suppressionReason; })
        .sort(function (x, y) { return periodKey(x).localeCompare(periodKey(y)); });
      if (verified.length < 2) return fail('NO_OBSERVATION_FOR_PERIOD', 'FTN does not have two verified observations for ' + indicatorId + ' to compare yet.');
      a = verified[verified.length - 2];
      b = verified[verified.length - 1];
    }
    if (!a || !b) return fail('NO_OBSERVATION_FOR_PERIOD', 'FTN does not have a verified observation for one or both of those periods.');
    if (a.suppressionReason || b.suppressionReason) return fail('NO_OBSERVATION_FOR_PERIOD', 'One of those periods has no verified value: ' + humanUnavailable((a.suppressionReason || b.suppressionReason)));
    if (!isCompatible(a, b)) return fail('INCOMPATIBLE_COMPARISON', 'Those two periods are not directly comparable (different unit, definition, or source series) -- FTN will not blend them.');
    return { a: a, b: b };
  }

  function answerCompare(catalog, indicatorId, periods) {
    var indicator = indicatorFor(catalog, indicatorId);
    if (!indicator) return fail('UNKNOWN_INDICATOR', 'FTN Statistics does not recognize that indicator.');
    var pair = resolvePeriodPair(catalog, indicatorId, periods);
    if (pair.success === false) return pair;
    var source = sourceFor(catalog, pair.a.sourceId);
    return {
      success: true, intent: 'COMPARE',
      indicatorId: indicator.id, indicatorName: indicator.publicName,
      a: factOf(pair.a, indicator), b: factOf(pair.b, indicator), source: source,
      answer: indicator.publicName + ' was ' + pair.a.value + ' ' + pair.a.unit + ' in ' + pair.a.referencePeriod + ', and ' + pair.b.value + ' ' + pair.b.unit + ' in ' + pair.b.referencePeriod + '.',
      provenance: provenanceOf(pair.b, source),
    };
  }

  function answerChange(catalog, indicatorId, periods) {
    var indicator = indicatorFor(catalog, indicatorId);
    if (!indicator) return fail('UNKNOWN_INDICATOR', 'FTN Statistics does not recognize that indicator.');
    var pair = resolvePeriodPair(catalog, indicatorId, periods);
    if (pair.success === false) return pair;
    if (pair.a.value === 0) return fail('ZERO_BASELINE', 'Cannot compute a percentage change from a zero baseline value.');
    var absolute = Number((pair.b.value - pair.a.value).toFixed(4));
    var percent = Number(((absolute / pair.a.value) * 100).toFixed(3));
    var source = sourceFor(catalog, pair.a.sourceId);
    var formula = 'change = value(' + pair.b.referencePeriod + ') − value(' + pair.a.referencePeriod + '); percent change = change ÷ value(' + pair.a.referencePeriod + ') × 100';
    return {
      success: true, intent: 'CHANGE',
      indicatorId: indicator.id, indicatorName: indicator.publicName,
      a: factOf(pair.a, indicator), b: factOf(pair.b, indicator),
      calculation: { formula: formula, inputs: [factOf(pair.a, indicator), factOf(pair.b, indicator)], computedValue: { absolute: absolute, percent: percent } },
      source: source,
      answer: indicator.publicName + ' changed by ' + (absolute > 0 ? '+' : '') + absolute + ' ' + pair.a.unit + ' (' + (percent > 0 ? '+' : '') + percent + '%) from ' + pair.a.referencePeriod + ' to ' + pair.b.referencePeriod + '.',
      provenance: provenanceOf(pair.b, source),
    };
  }

  function answerWhyUnavailable(catalog, indicatorId, periods) {
    var indicator = indicatorFor(catalog, indicatorId);
    if (!indicator) return fail('UNKNOWN_INDICATOR', 'FTN Statistics does not recognize that indicator.');
    var obs = observationsFor(catalog, indicatorId);
    var token = periods.months[0] || periods.years[0];
    var target = token ? observationForPeriod(obs, token) : pickLatest(obs);
    if (!target) return fail('NO_OBSERVATION_FOR_PERIOD', 'FTN has no observation at all for that period, so there is nothing to explain.');
    var source = sourceFor(catalog, target.sourceId);
    var provenance = provenanceOf(target, source);
    if (!target.suppressionReason) {
      return { success: true, intent: 'WHY_UNAVAILABLE', fact: factOf(target, indicator), source: source, answer: indicator.publicName + ' for ' + target.referencePeriod + ' is a verified value (' + target.value + ' ' + target.unit + '), not an unavailable one.', provenance: provenance };
    }
    return { success: true, intent: 'WHY_UNAVAILABLE', degraded: true, fact: factOf(target, indicator), source: source, answer: humanUnavailable(target.suppressionReason), provenance: provenance };
  }

  // --- 5. Entry point --------------------------------------------------------------------------------
  function query(text, options) {
    options = options || {};
    var catalog = options.catalog;
    if (!catalog) return fail('CATALOG_NOT_LOADED', 'No FTN Statistics catalog was supplied to query().');
    var intent = classifyIntent(text);
    if (!intent) return fail('UNSUPPORTED_INTENT', "That question is outside FTN Statistics' supported set: latest value, source/methodology, comparison, change, available indicators, or why a figure is unavailable.");
    if (intent === 'LIST_INDICATORS') return answerList(catalog);
    var indicatorId = options.indicatorId || matchIndicator(catalog, text);
    if (!indicatorId) return fail('UNKNOWN_INDICATOR', 'FTN Statistics does not recognize an indicator in that question yet. Ask "what indicators do you have?" to see the full list.');
    var periods = extractPeriods(text);
    // A comparison/change request that mentions more than one distinct indicator (e.g. "compare
    // the murder rate and the exchange rate") is asking FTN to compare two different, incompatible
    // series -- not a same-indicator two-period comparison this capability supports. Fail closed
    // rather than silently picking one and answering a different question than was asked.
    if ((intent === 'COMPARE' || intent === 'CHANGE') && !options.indicatorId && distinctIndicatorIds(catalog, text).length > 1) {
      return fail('INCOMPATIBLE_COMPARISON', 'That question mentions more than one FTN Statistics indicator -- FTN can compare two periods of the SAME indicator, but not two different indicators against each other.');
    }
    switch (intent) {
      case 'METHODOLOGY': return answerMethodology(catalog, indicatorId);
      case 'COMPARE': return answerCompare(catalog, indicatorId, periods);
      case 'CHANGE': return answerChange(catalog, indicatorId, periods);
      case 'WHY_UNAVAILABLE': return answerWhyUnavailable(catalog, indicatorId, periods);
      default: return answerLatest(catalog, indicatorId);
    }
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisStatistics = {
    buildCatalog: buildCatalog, query: query,
    classifyIntent: classifyIntent, matchIndicator: matchIndicator, extractPeriods: extractPeriods,
    INTENT_PATTERNS: INTENT_PATTERNS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
