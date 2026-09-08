// FTN Platform — ibis Correlation Engine.
// Deterministic association analysis over already-sourced time series. No model may invent values,
// pad missing periods, or turn association into causation. Uses FTN.IbisMath for all calculations.
(function (global) {
  'use strict';

  function fail(code, message, meta) { return Object.assign({ success: false, errorType: code, reason: message }, meta || {}); }
  function qualityForN(n) { if (n < 8) return 'THIN'; if (n < 20) return 'LIMITED'; if (n < 50) return 'MODERATE'; return 'DEEP'; }
  function normalizeSeries(series) {
    if (!series || !Array.isArray(series.periods) || !Array.isArray(series.values)) return fail('INVALID_SERIES', 'Each series needs periods[] and values[].');
    if (series.periods.length !== series.values.length) return fail('LENGTH_MISMATCH', 'A series must have one value per period.');
    var seen = {}, rows = [];
    for (var i = 0; i < series.periods.length; i++) {
      var period = String(series.periods[i] == null ? '' : series.periods[i]);
      var value = series.values[i];
      if (!period) return fail('MISSING_PERIOD', 'Every observation needs an explicit period.', { index: i });
      if (seen[period]) return fail('DUPLICATE_PERIOD', 'A series cannot contain duplicate periods.', { period: period });
      if (typeof value !== 'number' || !Number.isFinite(value)) return fail('NON_FINITE_VALUE', 'Series values must be finite numbers.', { index: i, period: period });
      seen[period] = true; rows.push({ period: period, value: value });
    }
    return { success: true, series: { id: series.id || null, label: series.label || series.id || 'Series', unit: series.unit || null, frequency: series.frequency || null, source: series.source || null, rows: rows } };
  }
  function align(a, b) {
    var aa = normalizeSeries(a); if (!aa.success) return aa;
    var bb = normalizeSeries(b); if (!bb.success) return bb;
    if (aa.series.frequency && bb.series.frequency && aa.series.frequency !== bb.series.frequency) return fail('FREQUENCY_MISMATCH', 'Series frequencies differ; aggregate or transform explicitly before correlation.', { frequencyA: aa.series.frequency, frequencyB: bb.series.frequency });
    var byPeriod = {}; aa.series.rows.forEach(function (row) { byPeriod[row.period] = row.value; });
    var periods = [], xs = [], ys = [];
    bb.series.rows.forEach(function (row) { if (Object.prototype.hasOwnProperty.call(byPeriod, row.period)) { periods.push(row.period); xs.push(byPeriod[row.period]); ys.push(row.value); } });
    return { success: true, a: aa.series, b: bb.series, periods: periods, x: xs, y: ys };
  }
  function analyze(a, b, options) {
    options = options || {};
    var MathKernel = global.FTN && global.FTN.IbisMath;
    if (!MathKernel) return fail('MATH_KERNEL_UNAVAILABLE', 'FTN.IbisMath must be loaded before the Correlation Engine.');
    var aligned = align(a, b); if (!aligned.success) return aligned;
    var minPairs = options.minPairs == null ? 5 : options.minPairs;
    if (!Number.isInteger(minPairs) || minPairs < 3) return fail('INVALID_MIN_PAIRS', 'minPairs must be an integer of at least 3.');
    if (aligned.periods.length < minPairs) return fail('INSUFFICIENT_OVERLAP', 'Not enough exact-period observations overlap to run the requested correlation.', { n: aligned.periods.length, minPairs: minPairs, periods: aligned.periods });
    var corr = MathKernel.pearson(aligned.x, aligned.y);
    if (!corr.ok) return fail(corr.error, corr.message, { n: corr.n || aligned.periods.length });
    var regression = MathKernel.linearRegression(aligned.x, aligned.y);
    var lags = [];
    var requestedLags = Array.isArray(options.lags) ? options.lags : [];
    requestedLags.forEach(function (lag) {
      var result = MathKernel.laggedPearson(aligned.x, aligned.y, lag);
      lags.push(result.ok ? { lag: lag, r: result.value, r2: result.r2, n: result.n, strength: result.strength, direction: result.direction } : { lag: lag, error: result.error, n: result.n || 0 });
    });
    return {
      success: true,
      capability: 'CORRELATION',
      method: 'PEARSON_EXACT_PERIOD_ALIGNMENT',
      seriesA: { id: aligned.a.id, label: aligned.a.label, unit: aligned.a.unit, frequency: aligned.a.frequency, source: aligned.a.source },
      seriesB: { id: aligned.b.id, label: aligned.b.label, unit: aligned.b.unit, frequency: aligned.b.frequency, source: aligned.b.source },
      alignedPeriods: aligned.periods,
      n: aligned.periods.length,
      r: corr.value,
      r2: corr.r2,
      direction: corr.direction,
      associationStrength: corr.strength,
      sampleDepth: qualityForN(aligned.periods.length),
      regression: regression.ok ? regression.value : null,
      lags: lags,
      causal: false,
      warning: 'Correlation measures association in the aligned observations; it does not establish causation.',
      provenance: {
        sourceA: aligned.a.source || null,
        sourceB: aligned.b.source || null,
        transformation: 'Exact-period intersection only; no interpolation, imputation or model-generated observations.',
        calculation: 'Pearson product-moment correlation via FTN.IbisMath',
      },
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisCorrelation = { normalizeSeries: normalizeSeries, align: align, analyze: analyze };
})(typeof window !== 'undefined' ? window : globalThis);
