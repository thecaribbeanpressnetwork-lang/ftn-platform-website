// FTN Statistics — Central Bank of Trinidad and Tobago monthly USD exchange-rate ingestion
// (Phase 5B). Fetches the Bank's own "Exchange Rates (Monthly)" page, extracts its real,
// server-rendered <tr id="table_107_row_N"> rows (verified 2026-08-25: a genuinely static HTML
// table, unlike the Bank's DAILY exchange-rate page, which loads its rows via a nonce-gated
// wpDataTables AJAX endpoint this pass could not reliably reproduce -- see
// GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md), and merges any new/changed months into
// data/fx-usd-ttd.json. Column order is verified against the page's own embedded `origHeader`
// config JSON at parse time, not hardcoded blindly -- a real layout change fails closed.
import fs from 'node:fs/promises';
import { fetchAndParse, todayInTimezone } from './lib/statistics-source-adapter.mjs';
import { parseMonthlyFx } from './lib/cbtt-fx-parser.mjs';

const url = 'https://www.central-bank.org.tt/exchange-rates-monthly/';
const path = new URL('../data/fx-usd-ttd.json', import.meta.url);
// ibis-assistant's Correlation engine (ibis-correlation-datasource.ts) reads a same-directory
// JSON mirror rather than reaching outside supabase/functions/ -- see that file's header comment
// for why. Written in lockstep here so the edge function's bundled snapshot never drifts from the
// canonical data/fx-usd-ttd.json, and so a data-only update still lands inside
// supabase/functions/_shared/**, which is what triggers ibis-assistant-release.yml's redeploy.
const mirrorPath = new URL('../supabase/functions/_shared/ibis-correlation-fx-data.json', import.meta.url);
const rows = await fetchAndParse({
  url,
  userAgent: 'FTN-Observer-Source-Check/1.0',
  parse: parseMonthlyFx,
});

let existing = { source: null, monthly: [] };
try {
  existing = JSON.parse(await fs.readFile(path, 'utf8'));
} catch {
  // First run: no existing file yet.
}

const byPeriod = new Map((existing.monthly || []).map((r) => [r.period, r]));
rows.forEach((r) => byPeriod.set(r.period, r));
const monthly = [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));

const retrieved = todayInTimezone('America/Port_of_Spain');
const data = {
  source: { name: 'Central Bank of Trinidad and Tobago — Exchange Rates (Monthly)', url, retrieved },
  monthly,
};

const serialized = JSON.stringify(data, null, 2) + '\n';
await fs.writeFile(path, serialized);
await fs.writeFile(mirrorPath, serialized);
const latest = monthly[monthly.length - 1];
console.log(`Central Bank FX ${retrieved}: ${monthly.length} monthly USD rate observation(s), latest ${latest.period} (buy ${latest.usdBuying}, sell ${latest.usdSelling})`);
