// Pure parser for the Central Bank's server-rendered monthly exchange-rate table.
// Shared by the production ingestion script and its fixture tests so the test exercises the real
// parser rather than a copied approximation that could drift independently.
const ROW_ID_PREFIX = 'table_107_row_';

function parsePeriod(ddmmyyyy) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmyyyy);
  return match ? `${match[3]}-${match[2]}` : null;
}

export function parseMonthlyFx(html) {
  const headerRe = /origHeader&quot;:&quot;([^&]*)&quot;/g;
  const headers = [];
  let headerMatch;
  while ((headerMatch = headerRe.exec(html))) headers.push(headerMatch[1]);

  const expectedStart = ['Date', 'BBD Buying Rate', 'BBD Selling Rate'];
  if (expectedStart.some((header, index) => headers[index] !== header)) {
    throw new Error('Central Bank monthly exchange-rate table column layout changed');
  }
  const usdBuyIdx = headers.indexOf('USD Buying Rate');
  const usdSellIdx = headers.indexOf('USD Selling Rate');
  if (usdBuyIdx === -1 || usdSellIdx === -1) {
    throw new Error('USD columns were not found in the Central Bank monthly table');
  }

  const rowRe = new RegExp(`<tr id="${ROW_ID_PREFIX}\\d+"[^>]*>([\\s\\S]*?)<\\/tr>`, 'g');
  const rows = [];
  let rowMatch;
  while ((rowMatch = rowRe.exec(html))) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((cell) => cell[1]);
    const period = parsePeriod(cells[0]);
    const buying = Number(cells[usdBuyIdx]);
    const selling = Number(cells[usdSellIdx]);
    if (!period || !Number.isFinite(buying) || !Number.isFinite(selling)) continue;
    if (buying === 0 && selling === 0) continue;
    rows.push({ period, usdBuying: buying, usdSelling: selling });
  }
  if (!rows.length) throw new Error('No real Central Bank USD exchange-rate rows were found');
  return rows;
}
