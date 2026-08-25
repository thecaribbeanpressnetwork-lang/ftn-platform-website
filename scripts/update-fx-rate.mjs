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

const url = 'https://www.central-bank.org.tt/exchange-rates-monthly/';
const path = new URL('../data/fx-usd-ttd.json', import.meta.url);
const ROW_ID_PREFIX = 'table_107_row_';

function parsePeriod(ddmmyyyy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmyyyy);
  return m ? `${m[3]}-${m[2]}` : null;
}

const rows = await fetchAndParse({
  url,
  userAgent: 'FTN-Observer-Source-Check/1.0',
  parse(html) {
    const headerRe = /origHeader&quot;:&quot;([^&]*)&quot;/g;
    const headers = [];
    let hm;
    while ((hm = headerRe.exec(html))) headers.push(hm[1]);
    const expectedStart = ['Date', 'BBD Buying Rate', 'BBD Selling Rate'];
    if (expectedStart.some((h, i) => headers[i] !== h)) {
      throw new Error('Central Bank monthly exchange-rate table column layout changed');
    }
    const usdBuyIdx = headers.indexOf('USD Buying Rate');
    const usdSellIdx = headers.indexOf('USD Selling Rate');
    if (usdBuyIdx === -1 || usdSellIdx === -1) throw new Error('USD columns were not found in the Central Bank monthly table');

    const rowRe = new RegExp(`<tr id="${ROW_ID_PREFIX}\\d+"[^>]*>([\\s\\S]*?)<\\/tr>`, 'g');
    const out = [];
    let rm;
    while ((rm = rowRe.exec(html))) {
      const cells = [...rm[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((c) => c[1]);
      const period = parsePeriod(cells[0]);
      const buying = Number(cells[usdBuyIdx]);
      const selling = Number(cells[usdSellIdx]);
      if (!period || !Number.isFinite(buying) || !Number.isFinite(selling)) continue;
      // The source's own placeholder row for a not-yet-complete current month -- not a real
      // observation, so it is skipped here rather than stored as a fabricated zero rate.
      if (buying === 0 && selling === 0) continue;
      out.push({ period, usdBuying: buying, usdSelling: selling });
    }
    if (!out.length) throw new Error('No real Central Bank USD exchange-rate rows were found');
    return out;
  },
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

await fs.writeFile(path, JSON.stringify(data, null, 2) + '\n');
const latest = monthly[monthly.length - 1];
console.log(`Central Bank FX ${retrieved}: ${monthly.length} monthly USD rate observation(s), latest ${latest.period} (buy ${latest.usdBuying}, sell ${latest.usdSelling})`);
