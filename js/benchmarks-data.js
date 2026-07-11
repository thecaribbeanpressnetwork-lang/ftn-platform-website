// FTN Platform Website — Daily Benchmark Architecture (stub).
//
// Models the compact parameter file a future scheduled server-side process
// would publish once a day (Phase 3.5 founder direction §14): check a
// source, verify a value, store it with health metadata, and let every
// display download the resulting file and animate locally until the next
// refresh. This file IS that parameter file, hand-written for the proof of
// concept — the front-end never contacts a source website directly, exactly
// as instructed (no scraping/scheduler runs in this repository).
//
// Nothing here overrides indicator values yet — see js/founder-controls.js
// for the read-only Source Health view this powers.
(function (global) {
  'use strict';

  function record(indicatorId, sourceId, opts) {
    return Object.assign({
      indicatorId: indicatorId,
      sourceId: sourceId,
      benchmarkValue: null,
      benchmarkDate: null,
      lastChecked: '2026-07-01T00:00:00Z',
      lastSuccessfulCheck: '2026-07-01T00:00:00Z',
      nextScheduledCheck: null,
      sourceStatus: 'not-integrated', // 'ok' | 'stale' | 'error' | 'not-integrated'
      manualOverride: false,
      calculationVersion: 1,
    }, opts || {});
  }

  // A representative slice, not exhaustive — this demonstrates the shape;
  // wiring every indicator to a benchmark record is future ingestion work.
  var benchmarks = [
    record('national-debt', 'tt-mof-roe-2025', { benchmarkValue: 19400000000, benchmarkDate: '2025-08-01', sourceStatus: 'not-integrated' }),
    record('debt-to-gdp', 'tt-mof-roe-2025', { benchmarkValue: 68.4, benchmarkDate: '2025-08-01', sourceStatus: 'not-integrated' }),
    record('population', 'tt-cso-main', { benchmarkValue: 1531000, benchmarkDate: '2026-01-01', sourceStatus: 'not-integrated' }),
    record('inflation', 'tt-cso-rpi', { benchmarkValue: 2.1, benchmarkDate: '2026-06-01', sourceStatus: 'not-integrated' }),
    record('exchange-rate', 'tt-cbtt', { benchmarkValue: 6.79, benchmarkDate: '2026-06-01', sourceStatus: 'not-integrated' }),
    record('oil-price', null, { sourceStatus: 'not-integrated' }),
  ];

  global.FTN = global.FTN || {};
  global.FTN.Benchmarks = benchmarks;
})(window);
