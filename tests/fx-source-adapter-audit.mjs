// FTN Platform — Phase 5B Central Bank FX source-adapter audit (fixture-based, no real network
// call). Guards the exact same regex-based parse logic scripts/update-fx-rate.mjs uses in
// production (column-order verification against the page's own embedded config, row extraction,
// placeholder-month filtering) against scripts/lib/statistics-source-adapter.mjs's fail-closed
// fetchAndParse() contract.
import assert from 'node:assert/strict';
import { fetchAndParse, todayInTimezone } from '../scripts/lib/statistics-source-adapter.mjs';
import { parseMonthlyFx } from '../scripts/lib/cbtt-fx-parser.mjs';

const ROW_ID_PREFIX = 'table_107_row_';

// A realistic fixture matching the REAL page's structure: a 21-column header config (Date + 10
// currency pairs, USD at columns 17/18) plus a placeholder current-month row and one real row.
const REAL_HEADER_ORDER = [
  'Date', 'BBD Buying Rate', 'BBD Selling Rate', 'CAN Buying Rate', 'CAN Selling Rate',
  'CHF Buying Rate', 'CHF Selling Rate', 'XCD Buying Rate', 'XCD Selling Rate',
  'GBP Buying Rate', 'GBP Selling Rate', 'GYD Buying Rate', 'GYD Selling Rate',
  'JMD Buying Rate', 'JMD Selling Rate', 'JPY Buying Rate', 'JPY Selling Rate',
  'USD Buying Rate', 'USD Selling Rate', 'EURO Buying Rate', 'EURO Selling Rate',
];
function headerConfigJson(order) {
  return order.map((h) => `origHeader&quot;:&quot;${h}&quot;`).join(',');
}
function rowHtml(id, cells) {
  return `<tr id="${ROW_ID_PREFIX}${id}"><td>${cells.join('</td><td>')}</td></tr>`;
}
function fixtureHtml(order, rows) {
  return `<html><script>{"cols":[${headerConfigJson(order)}]}</script><tbody>${rows.join('')}</tbody></html>`;
}

async function withMockedFetch(status, body, fn) {
  const original = global.fetch;
  global.fetch = async () => ({ ok: status >= 200 && status < 300, status, text: async () => body });
  try { return await fn(); } finally { global.fetch = original; }
}

// --- 1. Real, well-formed source structure parses correctly, placeholder month skipped. ---
await withMockedFetch(200, fixtureHtml(REAL_HEADER_ORDER, [
  rowHtml(0, ['31/08/2026', ...Array(16).fill('0.0000'), '0.0000', '0.0000', '0.0000', '0.0000']),
  rowHtml(1, ['31/07/2026', ...Array(16).fill('1.0000'), '6.7294', '6.7786', '1.0000', '1.0000']),
]), async () => {
  const rows = await fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseMonthlyFx });
  assert.equal(rows.length, 1, 'the all-zero placeholder month row must be skipped, not stored as a fabricated zero rate');
  assert.equal(rows[0].period, '2026-07');
  assert.equal(rows[0].usdBuying, 6.7294);
  assert.equal(rows[0].usdSelling, 6.7786);
});

// --- 2. Non-OK response fails closed. ---
await withMockedFetch(503, 'Service Unavailable', async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseMonthlyFx }),
    /Source returned 503/
  );
});

// --- 3. Changed column layout (a currency reordered/renamed) fails closed. ---
const shuffled = REAL_HEADER_ORDER.slice();
[shuffled[1], shuffled[3]] = [shuffled[3], shuffled[1]];
await withMockedFetch(200, fixtureHtml(shuffled, [rowHtml(1, ['31/07/2026', ...Array(20).fill('1.0000')])]), async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseMonthlyFx }),
    /column layout changed/,
    'a real column-order change must be detected and fail closed, never silently misread a different currency as USD'
  );
});

// --- 4. USD columns removed entirely (source dropped that currency) fails closed. ---
const withoutUsd = REAL_HEADER_ORDER.filter((h) => !h.startsWith('USD'));
await withMockedFetch(200, fixtureHtml(withoutUsd, [rowHtml(1, ['31/07/2026', ...Array(18).fill('1.0000')])]), async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseMonthlyFx }),
    /USD columns were not found/
  );
});

// --- 5. No real rows at all (every row is the zero placeholder) fails closed. ---
await withMockedFetch(200, fixtureHtml(REAL_HEADER_ORDER, [rowHtml(0, ['31/08/2026', ...Array(20).fill('0.0000')])]), async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseMonthlyFx }),
    /No real Central Bank USD exchange-rate rows/
  );
});

// --- 6. Non-finite USD value in an otherwise well-formed row fails closed. ---
await withMockedFetch(200, fixtureHtml(REAL_HEADER_ORDER, [rowHtml(1, ['31/07/2026', ...Array(16).fill('1.0000'), 'n/a', '6.7786', '1.0000', '1.0000'])]), async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseMonthlyFx }),
    /No real Central Bank USD exchange-rate rows/,
    'a non-numeric rate must be skipped as an invalid row, never coerced to a fabricated number'
  );
});

// --- 7. Timezone-correct date stamping. ---
{
  const date = todayInTimezone('America/Port_of_Spain');
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
}

console.log('Phase 5B Central Bank FX source-adapter: fail-closed on non-OK response, changed column layout, missing USD columns, all-placeholder data, and non-finite values -- all verified with fixtures, zero real network calls.');
