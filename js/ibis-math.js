// FTN Platform — ibis deterministic math kernel.
// Shared, dependency-free numerical primitives for Statistics, Capital Intelligence,
// Economic Shadow/Twin, Correlation/Prediction and Headspace calculations.
// Every operation fails explicitly instead of returning Infinity/NaN or silently coercing bad input.
(function (global) {
  'use strict';

  function ok(value, meta) { return Object.assign({ ok: true, value: value }, meta || {}); }
  function fail(code, message, meta) { return Object.assign({ ok: false, error: code, message: message }, meta || {}); }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function numericArray(values) {
    if (!Array.isArray(values) || !values.length) return fail('EMPTY_SERIES', 'A non-empty numeric series is required.');
    for (var i = 0; i < values.length; i++) if (!finite(values[i])) return fail('NON_FINITE_VALUE', 'Series contains a non-finite numeric value.', { index: i, input: values[i] });
    return ok(values.slice());
  }
  function round(value, digits) {
    if (!finite(value)) return fail('NON_FINITE_VALUE', 'Cannot round a non-finite value.');
    digits = digits == null ? 6 : digits;
    if (!Number.isInteger(digits) || digits < 0 || digits > 12) return fail('INVALID_PRECISION', 'Precision must be an integer from 0 to 12.');
    return ok(Number(value.toFixed(digits)));
  }
  function divide(numerator, denominator) {
    if (!finite(numerator) || !finite(denominator)) return fail('NON_FINITE_VALUE', 'Division requires finite numeric inputs.');
    if (denominator === 0) return fail('ZERO_DENOMINATOR', 'Division by zero is undefined.');
    return ok(numerator / denominator);
  }
  function absoluteChange(a, b, digits) {
    if (!finite(a) || !finite(b)) return fail('NON_FINITE_VALUE', 'Change requires finite numeric inputs.');
    return round(b - a, digits == null ? 6 : digits);
  }
  function percentChange(a, b, digits) {
    if (!finite(a) || !finite(b)) return fail('NON_FINITE_VALUE', 'Percentage change requires finite numeric inputs.');
    if (a === 0) return fail('ZERO_BASELINE', 'Percentage change from a zero baseline is undefined.');
    return round(((b - a) / a) * 100, digits == null ? 6 : digits);
  }
  function mean(values) {
    var checked = numericArray(values); if (!checked.ok) return checked;
    var sum = checked.value.reduce(function (acc, value) { return acc + value; }, 0);
    return ok(sum / checked.value.length, { n: checked.value.length });
  }
  function weightedMean(values, weights) {
    var v = numericArray(values); if (!v.ok) return v;
    var w = numericArray(weights); if (!w.ok) return w;
    if (v.value.length !== w.value.length) return fail('LENGTH_MISMATCH', 'Values and weights must have the same length.');
    var weightSum = w.value.reduce(function (acc, value) { return acc + value; }, 0);
    if (weightSum === 0) return fail('ZERO_WEIGHT_SUM', 'Weights must not sum to zero.');
    var total = 0; for (var i = 0; i < v.value.length; i++) total += v.value[i] * w.value[i];
    return ok(total / weightSum, { n: v.value.length, weightSum: weightSum });
  }
  function variance(values, sample) {
    var checked = numericArray(values); if (!checked.ok) return checked;
    var n = checked.value.length;
    if (sample && n < 2) return fail('INSUFFICIENT_SAMPLE', 'Sample variance requires at least two observations.', { n: n });
    var m = mean(checked.value).value;
    var sumSq = checked.value.reduce(function (acc, value) { var d = value - m; return acc + d * d; }, 0);
    return ok(sumSq / (sample ? n - 1 : n), { n: n, sample: !!sample, mean: m });
  }
  function standardDeviation(values, sample) {
    var v = variance(values, sample); if (!v.ok) return v;
    return ok(Math.sqrt(v.value), { n: v.n, sample: v.sample, mean: v.mean });
  }
  function covariance(xs, ys, sample) {
    var x = numericArray(xs); if (!x.ok) return x;
    var y = numericArray(ys); if (!y.ok) return y;
    if (x.value.length !== y.value.length) return fail('LENGTH_MISMATCH', 'Series must have the same length.');
    var n = x.value.length;
    if (sample && n < 2) return fail('INSUFFICIENT_SAMPLE', 'Sample covariance requires at least two paired observations.', { n: n });
    var mx = mean(x.value).value, my = mean(y.value).value, total = 0;
    for (var i = 0; i < n; i++) total += (x.value[i] - mx) * (y.value[i] - my);
    return ok(total / (sample ? n - 1 : n), { n: n, sample: !!sample, meanX: mx, meanY: my });
  }
  function correlationStrength(absR) {
    if (absR < 0.1) return 'NEGLIGIBLE';
    if (absR < 0.3) return 'WEAK';
    if (absR < 0.5) return 'MODERATE';
    if (absR < 0.7) return 'STRONG';
    return 'VERY_STRONG';
  }
  function pearson(xs, ys) {
    var x = numericArray(xs); if (!x.ok) return x;
    var y = numericArray(ys); if (!y.ok) return y;
    if (x.value.length !== y.value.length) return fail('LENGTH_MISMATCH', 'Series must have the same number of paired observations.');
    var n = x.value.length;
    if (n < 3) return fail('INSUFFICIENT_SAMPLE', 'Pearson correlation requires at least three paired observations.', { n: n });
    var mx = mean(x.value).value, my = mean(y.value).value;
    var cross = 0, sx = 0, sy = 0;
    for (var i = 0; i < n; i++) {
      var dx = x.value[i] - mx, dy = y.value[i] - my;
      cross += dx * dy; sx += dx * dx; sy += dy * dy;
    }
    if (sx === 0 || sy === 0) return fail('ZERO_VARIANCE', 'Correlation is undefined when either series has zero variance.', { n: n });
    var r = cross / Math.sqrt(sx * sy);
    if (r > 1 && r < 1 + 1e-12) r = 1;
    if (r < -1 && r > -1 - 1e-12) r = -1;
    return ok(r, { n: n, r2: r * r, direction: r > 0 ? 'POSITIVE' : (r < 0 ? 'NEGATIVE' : 'NONE'), strength: correlationStrength(Math.abs(r)), method: 'PEARSON', causal: false });
  }
  function laggedPearson(xs, ys, lag) {
    if (!Number.isInteger(lag)) return fail('INVALID_LAG', 'Lag must be an integer.');
    var x = numericArray(xs); if (!x.ok) return x;
    var y = numericArray(ys); if (!y.ok) return y;
    if (x.value.length !== y.value.length) return fail('LENGTH_MISMATCH', 'Series must have the same length before lagging.');
    var ax = [], ay = [], n = x.value.length;
    for (var i = 0; i < n; i++) {
      var j = i + lag;
      if (j >= 0 && j < n) { ax.push(x.value[i]); ay.push(y.value[j]); }
    }
    var result = pearson(ax, ay); if (!result.ok) return Object.assign(result, { lag: lag });
    result.lag = lag; result.alignedPairs = ax.length; return result;
  }
  function cagr(start, end, years, digits) {
    if (!finite(start) || !finite(end) || !finite(years)) return fail('NON_FINITE_VALUE', 'CAGR requires finite numeric inputs.');
    if (start <= 0 || end < 0) return fail('INVALID_GROWTH_BASE', 'CAGR requires a positive starting value and non-negative ending value.');
    if (years <= 0) return fail('INVALID_PERIOD', 'CAGR requires a period greater than zero.');
    return round((Math.pow(end / start, 1 / years) - 1) * 100, digits == null ? 6 : digits);
  }
  function realReturn(nominalPercent, inflationPercent, digits) {
    if (!finite(nominalPercent) || !finite(inflationPercent)) return fail('NON_FINITE_VALUE', 'Real return requires finite percentages.');
    var inflationFactor = 1 + inflationPercent / 100;
    if (inflationFactor === 0) return fail('INVALID_INFLATION', 'Inflation of -100% makes the Fisher equation undefined.');
    return round((((1 + nominalPercent / 100) / inflationFactor) - 1) * 100, digits == null ? 6 : digits);
  }
  function requiredCapitalForIncome(monthlyIncome, annualNetYieldPercent, digits) {
    if (!finite(monthlyIncome) || !finite(annualNetYieldPercent)) return fail('NON_FINITE_VALUE', 'Income target and yield must be finite numbers.');
    if (monthlyIncome < 0) return fail('INVALID_INCOME_TARGET', 'Income target cannot be negative.');
    if (annualNetYieldPercent <= 0) return fail('INVALID_YIELD', 'Net annual yield must be greater than zero.');
    return round((monthlyIncome * 12) / (annualNetYieldPercent / 100), digits == null ? 2 : digits);
  }
  function futureValue(principal, annualRatePercent, years, compoundsPerYear, digits) {
    if (!finite(principal) || !finite(annualRatePercent) || !finite(years)) return fail('NON_FINITE_VALUE', 'Future value requires finite numeric inputs.');
    compoundsPerYear = compoundsPerYear == null ? 1 : compoundsPerYear;
    if (principal < 0 || years < 0 || !Number.isInteger(compoundsPerYear) || compoundsPerYear <= 0) return fail('INVALID_FUTURE_VALUE_INPUT', 'Principal/years must be non-negative and compounding frequency a positive integer.');
    var value = principal * Math.pow(1 + (annualRatePercent / 100) / compoundsPerYear, compoundsPerYear * years);
    return round(value, digits == null ? 2 : digits);
  }
  function linearRegression(xs, ys) {
    var x = numericArray(xs); if (!x.ok) return x;
    var y = numericArray(ys); if (!y.ok) return y;
    if (x.value.length !== y.value.length) return fail('LENGTH_MISMATCH', 'Series must have the same number of observations.');
    if (x.value.length < 2) return fail('INSUFFICIENT_SAMPLE', 'Linear regression requires at least two paired observations.', { n: x.value.length });
    var mx = mean(x.value).value, my = mean(y.value).value, numerator = 0, denominator = 0;
    for (var i = 0; i < x.value.length; i++) { var dx = x.value[i] - mx; numerator += dx * (y.value[i] - my); denominator += dx * dx; }
    if (denominator === 0) return fail('ZERO_VARIANCE', 'Regression is undefined when the predictor has zero variance.');
    var slope = numerator / denominator, intercept = my - slope * mx;
    var corr = pearson(x.value, y.value);
    return ok({ slope: slope, intercept: intercept, r: corr.ok ? corr.value : null, r2: corr.ok ? corr.r2 : null }, { n: x.value.length, method: 'OLS_SIMPLE', causal: false });
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisMath = {
    finite: finite, round: round, divide: divide,
    absoluteChange: absoluteChange, percentChange: percentChange,
    mean: mean, weightedMean: weightedMean, variance: variance, standardDeviation: standardDeviation, covariance: covariance,
    pearson: pearson, laggedPearson: laggedPearson, linearRegression: linearRegression,
    cagr: cagr, realReturn: realReturn, requiredCapitalForIncome: requiredCapitalForIncome, futureValue: futureValue,
  };
})(typeof window !== 'undefined' ? window : globalThis);
