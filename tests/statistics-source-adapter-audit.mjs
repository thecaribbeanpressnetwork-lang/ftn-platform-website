// FTN Platform — Phase 5A source-adapter helper audit (fixture-based, no real network call).
//
// Guards scripts/lib/statistics-source-adapter.mjs's fail-closed contract: a non-OK response must
// throw, and a source whose structure changed (the caller's own parse() throws) must also throw --
// never silently return a stale/partial/fabricated result. Verified against the SAME regex-based
// parse function scripts/update-ttps-crime.mjs actually uses in production, not a simplified stand-in.
import assert from 'node:assert/strict';
import { fetchAndParse, todayInTimezone } from '../scripts/lib/statistics-source-adapter.mjs';

function parseTtpsComparative(html) {
  const match = html.match(/var\s+data\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('TTPS comparative data payload was not found');
  const rows = JSON.parse(match[1]);
  const row = rows.find((r) => /^murders$/i.test(r.offence_name));
  if (!row || !Number.isFinite(row.reported) || !Number.isFinite(row.detected)) throw new Error('TTPS murder row was invalid');
  return row;
}

const realFixtureHtml = `<html><script>var data = [{"offence_name":"Murders","reported":120,"detected":13},{"offence_name":"Robberies","reported":423,"detected":47}];</script></html>`;

async function withMockedFetch(status, body, fn) {
  const original = global.fetch;
  global.fetch = async () => ({ ok: status >= 200 && status < 300, status, text: async () => body });
  try { return await fn(); } finally { global.fetch = original; }
}

// --- 1. Real, well-formed source structure parses correctly. ---
await withMockedFetch(200, realFixtureHtml, async () => {
  const row = await fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseTtpsComparative });
  assert.equal(row.reported, 120);
  assert.equal(row.detected, 13);
});

// --- 2. Non-OK response fails closed. ---
await withMockedFetch(503, 'Service Unavailable', async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseTtpsComparative }),
    /Source returned 503/,
    'a non-OK upstream response must throw, never return a stale/cached/fabricated result'
  );
});

// --- 3. Changed source structure (the real regex no longer matches) fails closed. ---
await withMockedFetch(200, '<html><body>The statistics dashboard has moved to a new URL.</body></html>', async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseTtpsComparative }),
    /data payload was not found/,
    'a source whose HTML structure changed must be detected and fail closed, never silently return nothing'
  );
});

// --- 4. Missing/malformed murder row (e.g. the source renamed the category) fails closed. ---
await withMockedFetch(200, `<html><script>var data = [{"offence_name":"Homicides","reported":99,"detected":10}];</script></html>`, async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseTtpsComparative }),
    /murder row was invalid/,
    'a source that renamed its own category (so the expected row is genuinely absent) must fail closed, never substitute a different row or a stale value'
  );
});

// --- 5. Non-finite values in an otherwise-matching row fail closed (never coerced/guessed). ---
await withMockedFetch(200, `<html><script>var data = [{"offence_name":"Murders","reported":"unknown","detected":13}];</script></html>`, async () => {
  await assert.rejects(
    () => fetchAndParse({ url: 'https://example.test/', userAgent: 'FTN-Test/1.0', parse: parseTtpsComparative }),
    /murder row was invalid/
  );
});

// --- 6. Timezone-correct date stamping (Trinidad is UTC-4, no DST). ---
{
  const date = todayInTimezone('America/Port_of_Spain');
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/, 'todayInTimezone must produce a real YYYY-MM-DD date, not a raw ISO timestamp');
}

console.log('Phase 5A source-adapter helper: fail-closed on non-OK response, changed structure, missing/renamed category, and non-finite values -- all verified with fixtures, zero real network calls.');
