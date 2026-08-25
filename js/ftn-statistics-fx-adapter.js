// FTN Platform — Central Bank of Trinidad and Tobago exchange-rate read-side adapter (Phase 5B).
// Transforms the real data/fx-usd-ttd.json (populated by scripts/update-fx-rate.mjs, run weekly via
// .github/workflows/update-fx-rate.yml) into js/ftn-statistics.js's shared schema shape -- the
// second real indicator, deliberately chosen to demonstrate the schema generalizes beyond crime's
// ANNUAL/count pattern: MONTHLY frequency, a currency-rate unit, and a real month-over-month
// derived calculation instead of crime's cross-sectional per-100,000 rate.
//
// See GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md for the candidate comparison, the real
// technical-accessibility finding that ruled out the Bank's own DAILY exchange-rate page (a
// nonce-gated AJAX endpoint this pass could not reliably automate), and why the MONTHLY page (a
// genuinely static, reliably-parseable HTML table) was selected instead.
(function (global) {
  'use strict';

  function require_(name) {
    var mod = global.FTN && global.FTN[name];
    if (!mod) throw new Error('js/ftn-statistics-fx-adapter.js requires js/' + (name === 'Statistics' ? 'ftn-statistics.js' : name) + ' to be loaded first.');
    return mod;
  }

  function sources() {
    var Stats = require_('Statistics');
    return {
      cbtt: Stats.sourceDataset({
        id: 'tt-cbtt-fx-monthly',
        name: 'Central Bank of Trinidad and Tobago — Exchange Rates (Monthly)',
        publisher: 'Central Bank of Trinidad and Tobago',
        url: 'https://www.central-bank.org.tt/exchange-rates-monthly/',
        documentId: 'cbtt-exchange-rates-monthly',
        accessMethod: 'PUBLIC_HTML_STATIC_TABLE',
        // Verified 2026-08-25: no published data-reuse/licensing terms were found. The Bank's own
        // Disclaimer page addresses liability only ("makes no warranty... nor assumes any legal
        // liability... for the accuracy, timeliness, completeness...") and is silent on copying,
        // redistributing or citing published data; a standard "All Rights Reserved" copyright
        // notice applies sitewide. Same posture already accepted for the TTPS crime source (see
        // the source map and .claude/context/decisions.md) -- FTN cites the published rate with
        // attribution and a direct link; it does not redistribute the underlying table.
        licensingNote: 'No published data-reuse/licensing terms found (the Disclaimer page addresses liability only). Standard all-rights-reserved copyright notice applies. FTN cites the published rate with attribution and a direct link; it does not redistribute the underlying table.',
      }),
    };
  }

  function buyingRateIndicator() {
    var Stats = require_('Statistics');
    return Stats.indicatorDefinition({
      id: 'fx-usd-buying-rate',
      publicName: 'TT$/US$ Buying Rate',
      description: 'The Trinidad and Tobago dollar rate at which commercial banks buy US dollars from customers, as compiled monthly by the Central Bank of Trinidad and Tobago.',
      topic: 'ECONOMY', geography: 'Trinidad and Tobago', geoLevel: 'NATIONAL',
      unit: 'TTD per USD', frequency: 'MONTHLY',
      consumingProducts: ['ftn-live', 'ibis-ai', 'statistics'],
    });
  }

  function sellingRateIndicator() {
    var Stats = require_('Statistics');
    return Stats.indicatorDefinition({
      id: 'fx-usd-selling-rate',
      publicName: 'TT$/US$ Selling Rate',
      description: 'The Trinidad and Tobago dollar rate at which commercial banks sell US dollars to customers, as compiled monthly by the Central Bank of Trinidad and Tobago -- the rate most relevant to someone buying US dollars.',
      topic: 'ECONOMY', geography: 'Trinidad and Tobago', geoLevel: 'NATIONAL',
      unit: 'TTD per USD', frequency: 'MONTHLY',
      consumingProducts: ['ftn-live', 'ibis-ai', 'statistics'],
    });
  }

  // `raw` is data/fx-usd-ttd.json's already-fetched, already-parsed content: {source, monthly:
  // [{period:'YYYY-MM', usdBuying, usdSelling}, ...]} in ascending period order. This function
  // performs no I/O itself, matching every other adapter's "no hard dependency" discipline.
  function buildObservations(raw) {
    var Stats = require_('Statistics');
    var src = sources();
    var observations = [];
    var rows = raw.monthly || [];

    rows.forEach(function (row) {
      observations.push(Stats.observation({
        indicatorId: 'fx-usd-buying-rate', value: row.usdBuying, unit: 'TTD per USD',
        referencePeriod: row.period, publicationDate: null,
        retrievedAt: raw.source && raw.source.retrieved, sourceId: 'tt-cbtt-fx-monthly',
        revisionStatus: 'FINAL', confidenceBasis: 'Official central bank, monthly compiled rate',
      }));
      observations.push(Stats.observation({
        indicatorId: 'fx-usd-selling-rate', value: row.usdSelling, unit: 'TTD per USD',
        referencePeriod: row.period, publicationDate: null,
        retrievedAt: raw.source && raw.source.retrieved, sourceId: 'tt-cbtt-fx-monthly',
        revisionStatus: 'FINAL', confidenceBasis: 'Official central bank, monthly compiled rate',
      }));
    });

    // Derived: latest real month-over-month change on the selling rate -- a genuinely different
    // derived-calculation shape than the crime adapter's cross-sectional per-100,000 rate (a
    // same-indicator, adjacent-period comparison instead), computed only when >=2 real rows exist.
    var derivedCalculations = [];
    if (rows.length >= 2) {
      var prev = rows[rows.length - 2], cur = rows[rows.length - 1];
      var change = cur.usdSelling - prev.usdSelling;
      var percent = prev.usdSelling ? (change / prev.usdSelling) * 100 : null;
      derivedCalculations.push(Stats.derivedCalculation({
        id: 'fx-usd-selling-rate-mom-change',
        formula: 'change = latest month selling rate − previous month selling rate; percent change = change ÷ previous month selling rate × 100',
        inputs: [
          { indicatorId: 'fx-usd-selling-rate', referencePeriod: prev.period, value: prev.usdSelling },
          { indicatorId: 'fx-usd-selling-rate', referencePeriod: cur.period, value: cur.usdSelling },
        ],
        computedValue: { absolute: Number(change.toFixed(4)), percent: percent != null ? Number(percent.toFixed(3)) : null, fromPeriod: prev.period, toPeriod: cur.period },
        basis: 'Deterministic calculation from two official Central Bank monthly observations',
      }));
    }

    return { indicatorDefinitions: [buyingRateIndicator(), sellingRateIndicator()], sources: src, observations: observations, derivedCalculations: derivedCalculations };
  }

  global.FTN = global.FTN || {};
  global.FTN.StatisticsFxAdapter = {
    sources: sources,
    buyingRateIndicator: buyingRateIndicator,
    sellingRateIndicator: sellingRateIndicator,
    buildObservations: buildObservations,
  };
})(typeof window !== 'undefined' ? window : globalThis);
