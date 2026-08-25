import fs from 'node:fs/promises';
import { fetchAndParse, todayInTimezone } from './lib/statistics-source-adapter.mjs';

const url = 'https://ttps.gov.tt/statistics/comparative/?year=2026';
const path = new URL('../data/crime-statistics.json', import.meta.url);
const murders = await fetchAndParse({
  url,
  userAgent: 'FTN-Observer-Source-Check/1.0',
  parse(html) {
    const match = html.match(/var\s+data\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) throw new Error('TTPS comparative data payload was not found');
    const rows = JSON.parse(match[1]);
    const row = rows.find((r) => /^murders$/i.test(r.offence_name));
    if (!row || !Number.isFinite(row.reported) || !Number.isFinite(row.detected)) throw new Error('TTPS murder row was invalid');
    return row;
  },
});
const data = JSON.parse(await fs.readFile(path, 'utf8'));
const date = todayInTimezone('America/Port_of_Spain');
data.current = {...data.current, asOf: date, reported: murders.reported, detected: murders.detected};
data.dailySnapshots = (data.dailySnapshots || []).filter((row) => row.date !== date);
data.dailySnapshots.push({date, reported: murders.reported, detected: murders.detected});
data.dailySnapshots.sort((a,b) => a.date.localeCompare(b.date));
await fs.writeFile(path, JSON.stringify(data, null, 2) + '\n');
console.log(`TTPS ${date}: ${murders.reported} reported, ${murders.detected} detected`);
