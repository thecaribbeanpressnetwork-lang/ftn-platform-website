// FTN Platform — deterministic math kernel. Server-side ESM port of js/ibis-math.js.
//
// This is a faithful extraction, not a reimplementation: every function below has the exact same
// algorithm, validation rules and failure codes as the browser original (js/ibis-math.js), which
// has zero DOM/browser dependency and was already pure -- confirmed by inspection before porting,
// per the explicit instruction not to invent replacement reasoning. Only the module wrapper
// changed (IIFE attaching to `global.FTN.IbisMath` -> plain ESM exports).
export type MathOk<T = number> = { ok: true; value: T; [key: string]: unknown };
export type MathFail = { ok: false; error: string; message: string; [key: string]: unknown };
export type MathResult<T = number> = MathOk<T> | MathFail;

function ok<T>(value: T, meta?: Record<string, unknown>): MathOk<T> { return { ok: true, value, ...(meta || {}) }; }
function fail(code: string, message: string, meta?: Record<string, unknown>): MathFail { return { ok: false, error: code, message, ...(meta || {}) }; }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function numericArray(values: unknown): MathResult<number[]> {
  if (!Array.isArray(values) || !values.length) return fail("EMPTY_SERIES", "A non-empty numeric series is required.");
  for (let i = 0; i < values.length; i++) if (!finite(values[i])) return fail("NON_FINITE_VALUE", "Series contains a non-finite numeric value.", { index: i, input: values[i] });
  return ok(values.slice());
}
export function round(value: number, digits?: number): MathResult {
  if (!finite(value)) return fail("NON_FINITE_VALUE", "Cannot round a non-finite value.");
  digits = digits == null ? 6 : digits;
  if (!Number.isInteger(digits) || digits < 0 || digits > 12) return fail("INVALID_PRECISION", "Precision must be an integer from 0 to 12.");
  return ok(Number(value.toFixed(digits)));
}
export function mean(values: unknown): MathResult {
  const checked = numericArray(values); if (!checked.ok) return checked;
  const sum = checked.value.reduce((acc, v) => acc + v, 0);
  return ok(sum / checked.value.length, { n: checked.value.length });
}
function correlationStrength(absR: number): string {
  if (absR < 0.1) return "NEGLIGIBLE";
  if (absR < 0.3) return "WEAK";
  if (absR < 0.5) return "MODERATE";
  if (absR < 0.7) return "STRONG";
  return "VERY_STRONG";
}
export function pearson(xs: unknown, ys: unknown): MathResult {
  const x = numericArray(xs); if (!x.ok) return x;
  const y = numericArray(ys); if (!y.ok) return y;
  if (x.value.length !== y.value.length) return fail("LENGTH_MISMATCH", "Series must have the same number of paired observations.");
  const n = x.value.length;
  if (n < 3) return fail("INSUFFICIENT_SAMPLE", "Pearson correlation requires at least three paired observations.", { n });
  const mx = (mean(x.value) as MathOk).value as number, my = (mean(y.value) as MathOk).value as number;
  let cross = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { const dx = x.value[i] - mx, dy = y.value[i] - my; cross += dx * dy; sx += dx * dx; sy += dy * dy; }
  if (sx === 0 || sy === 0) return fail("ZERO_VARIANCE", "Correlation is undefined when either series has zero variance.", { n });
  let r = cross / Math.sqrt(sx * sy);
  if (r > 1 && r < 1 + 1e-12) r = 1;
  if (r < -1 && r > -1 - 1e-12) r = -1;
  return ok(r, { n, r2: r * r, direction: r > 0 ? "POSITIVE" : r < 0 ? "NEGATIVE" : "NONE", strength: correlationStrength(Math.abs(r)), method: "PEARSON", causal: false });
}
export function laggedPearson(xs: unknown, ys: unknown, lag: number): MathResult {
  if (!Number.isInteger(lag)) return fail("INVALID_LAG", "Lag must be an integer.");
  const x = numericArray(xs); if (!x.ok) return x;
  const y = numericArray(ys); if (!y.ok) return y;
  if (x.value.length !== y.value.length) return fail("LENGTH_MISMATCH", "Series must have the same length before lagging.");
  const ax: number[] = [], ay: number[] = [], n = x.value.length;
  for (let i = 0; i < n; i++) { const j = i + lag; if (j >= 0 && j < n) { ax.push(x.value[i]); ay.push(y.value[j]); } }
  const result = pearson(ax, ay);
  if (!result.ok) return { ...result, lag };
  return { ...result, lag, alignedPairs: ax.length };
}
export function linearRegression(xs: unknown, ys: unknown): MathResult<{ slope: number; intercept: number; r: number | null; r2: unknown }> {
  const x = numericArray(xs); if (!x.ok) return x;
  const y = numericArray(ys); if (!y.ok) return y;
  if (x.value.length !== y.value.length) return fail("LENGTH_MISMATCH", "Series must have the same number of observations.");
  if (x.value.length < 2) return fail("INSUFFICIENT_SAMPLE", "Linear regression requires at least two paired observations.", { n: x.value.length });
  const mx = (mean(x.value) as MathOk).value as number, my = (mean(y.value) as MathOk).value as number;
  let numerator = 0, denominator = 0;
  for (let i = 0; i < x.value.length; i++) { const dx = x.value[i] - mx; numerator += dx * (y.value[i] - my); denominator += dx * dx; }
  if (denominator === 0) return fail("ZERO_VARIANCE", "Regression is undefined when the predictor has zero variance.");
  const slope = numerator / denominator, intercept = my - slope * mx;
  const corr = pearson(x.value, y.value);
  return ok({ slope, intercept, r: corr.ok ? corr.value : null, r2: corr.ok ? (corr as MathOk).r2 : null }, { n: x.value.length, method: "OLS_SIMPLE", causal: false });
}
