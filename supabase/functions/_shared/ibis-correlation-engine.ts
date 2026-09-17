// FTN Platform — Correlation Engine. Server-side ESM port of js/ibis-correlation-engine.js.
// Faithful extraction (same algorithm, same validation, same fail codes) -- confirmed pure/
// DOM-free before porting. Deterministic association analysis over already-sourced time series;
// no model may invent values, pad missing periods, or turn association into causation.
import { pearson, laggedPearson, linearRegression, type MathOk } from "./ibis-math.ts";

export type Series = { id?: string; label?: string; unit?: string; frequency?: string; source?: string; periods: unknown[]; values: unknown[] };
type NormalizedSeries = { id: string | null; label: string; unit: string | null; frequency: string | null; source: string | null; rows: { period: string; value: number }[] };

function fail(code: string, message: string, meta?: Record<string, unknown>) { return { success: false as const, errorType: code, reason: message, ...(meta || {}) }; }

function normalizeSeries(series: Series | null | undefined): { success: true; series: NormalizedSeries } | ReturnType<typeof fail> {
  if (!series || !Array.isArray(series.periods) || !Array.isArray(series.values)) return fail("INVALID_SERIES", "Each series needs periods[] and values[].");
  if (series.periods.length !== series.values.length) return fail("LENGTH_MISMATCH", "A series must have one value per period.");
  const seen: Record<string, boolean> = {}, rows: { period: string; value: number }[] = [];
  for (let i = 0; i < series.periods.length; i++) {
    const period = String(series.periods[i] == null ? "" : series.periods[i]);
    const value = series.values[i];
    if (!period) return fail("MISSING_PERIOD", "Every observation needs an explicit period.", { index: i });
    if (seen[period]) return fail("DUPLICATE_PERIOD", "A series cannot contain duplicate periods.", { period });
    if (typeof value !== "number" || !Number.isFinite(value)) return fail("NON_FINITE_VALUE", "Series values must be finite numbers.", { index: i, period });
    seen[period] = true; rows.push({ period, value });
  }
  return { success: true, series: { id: series.id || null, label: series.label || series.id || "Series", unit: series.unit || null, frequency: series.frequency || null, source: series.source || null, rows } };
}

function align(a: Series, b: Series) {
  const aa = normalizeSeries(a); if (!aa.success) return aa;
  const bb = normalizeSeries(b); if (!bb.success) return bb;
  if (aa.series.frequency && bb.series.frequency && aa.series.frequency !== bb.series.frequency) return fail("FREQUENCY_MISMATCH", "Series frequencies differ; aggregate or transform explicitly before correlation.", { frequencyA: aa.series.frequency, frequencyB: bb.series.frequency });
  const byPeriod: Record<string, number> = {};
  aa.series.rows.forEach((row) => { byPeriod[row.period] = row.value; });
  const periods: string[] = [], xs: number[] = [], ys: number[] = [];
  bb.series.rows.forEach((row) => { if (Object.prototype.hasOwnProperty.call(byPeriod, row.period)) { periods.push(row.period); xs.push(byPeriod[row.period]); ys.push(row.value); } });
  return { success: true as const, a: aa.series, b: bb.series, periods, x: xs, y: ys };
}

function qualityForN(n: number): string { if (n < 8) return "THIN"; if (n < 20) return "LIMITED"; if (n < 50) return "MODERATE"; return "DEEP"; }

export function analyzeCorrelation(a: Series, b: Series, options: { minPairs?: number; lags?: number[] } = {}) {
  const aligned = align(a, b); if (!aligned.success) return aligned;
  const minPairs = options.minPairs == null ? 5 : options.minPairs;
  if (!Number.isInteger(minPairs) || minPairs < 3) return fail("INVALID_MIN_PAIRS", "minPairs must be an integer of at least 3.");
  if (aligned.periods.length < minPairs) return fail("INSUFFICIENT_OVERLAP", "Not enough exact-period observations overlap to run the requested correlation.", { n: aligned.periods.length, minPairs, periods: aligned.periods });
  const corr = pearson(aligned.x, aligned.y);
  if (!corr.ok) return fail((corr as { error: string }).error, (corr as { message: string }).message, { n: (corr as { n?: number }).n || aligned.periods.length });
  const regression = linearRegression(aligned.x, aligned.y);
  const lags: unknown[] = [];
  const requestedLags = Array.isArray(options.lags) ? options.lags : [];
  requestedLags.forEach((lag) => {
    const result = laggedPearson(aligned.x, aligned.y, lag);
    lags.push(result.ok ? { lag, r: (result as MathOk).value, r2: (result as MathOk).r2, n: (result as MathOk).n, strength: (result as MathOk).strength, direction: (result as MathOk).direction } : { lag, error: (result as { error: string }).error, n: (result as { n?: number }).n || 0 });
  });
  const corrOk = corr as MathOk;
  return {
    success: true as const,
    capability: "CORRELATION",
    method: "PEARSON_EXACT_PERIOD_ALIGNMENT",
    seriesA: { id: aligned.a.id, label: aligned.a.label, unit: aligned.a.unit, frequency: aligned.a.frequency, source: aligned.a.source },
    seriesB: { id: aligned.b.id, label: aligned.b.label, unit: aligned.b.unit, frequency: aligned.b.frequency, source: aligned.b.source },
    alignedPeriods: aligned.periods,
    n: aligned.periods.length,
    r: corrOk.value,
    r2: corrOk.r2,
    direction: corrOk.direction,
    associationStrength: corrOk.strength,
    sampleDepth: qualityForN(aligned.periods.length),
    regression: regression.ok ? regression.value : null,
    lags,
    causal: false,
    warning: "Correlation measures association in the aligned observations; it does not establish causation.",
    provenance: {
      sourceA: aligned.a.source || null, sourceB: aligned.b.source || null,
      transformation: "Exact-period intersection only; no interpolation, imputation or model-generated observations.",
      calculation: "Pearson product-moment correlation via ibis-math.ts",
    },
  };
}
