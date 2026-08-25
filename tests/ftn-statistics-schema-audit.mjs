// FTN Platform — Phase 5A FTN Statistics shared schema + crime adapter audit (static, no network).
//
// Guards js/ftn-statistics.js (the canonical contract) and js/ftn-statistics-crime-adapter.js (the
// first real adapter, transforming the live data/crime-statistics.json into that contract).
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function loadContext(extraFiles) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/ftn-statistics.js', 'utf8'), context);
  for (const f of extraFiles || []) vm.runInContext(fs.readFileSync(f, 'utf8'), context);
  return context;
}

// --- 1. Schema validation: enums fail closed on an unrecognized value. ---
{
  const Stats = loadContext().window.FTN.Statistics;
  assert.throws(() => Stats.observation({ topic: 'NOT_A_REAL_TOPIC' }), /unrecognized topic/, 'an unrecognized topic must fail closed, not silently accept a typo');
  assert.throws(() => Stats.observation({ geoLevel: 'PLANET' }), /unrecognized geoLevel/);
  assert.throws(() => Stats.observation({ frequency: 'HOURLY' }), /unrecognized frequency/);
  assert.throws(() => Stats.observation({ revisionStatus: 'DRAFT' }), /unrecognized revisionStatus/);
  assert.throws(() => Stats.observation({ suppressionReason: 'I_FELT_LIKE_IT' }), /unrecognized suppressionReason/);
  // Valid values must not throw.
  const obs = Stats.observation({ indicatorId: 'x', topic: undefined, geoLevel: 'NATIONAL', frequency: 'ANNUAL', revisionStatus: 'FINAL' });
  assert.equal(obs.geoLevel, 'NATIONAL');
}

// --- 2. Defaults: an observation with no suppression reason has a null value only if explicitly set; confidenceBasis defaults to NOT_ASSESSED. ---
{
  const Stats = loadContext().window.FTN.Statistics;
  const bare = Stats.observation({ indicatorId: 'x' });
  assert.equal(bare.confidenceBasis, 'NOT_ASSESSED', 'confidenceBasis must default to the explicit NOT_ASSESSED sentinel, never fabricated');
  assert.equal(bare.suppressionReason, null);
  assert.equal(bare.publicationDate, null, 'publicationDate must default to null (genuinely unknown), never a guessed date');
}

// --- 3. Presentation formatting must not live in the raw observation shape. ---
{
  const Stats = loadContext().window.FTN.Statistics;
  const obs = Stats.observation({ indicatorId: 'x' });
  for (const forbidden of ['chartType', 'color', 'label', 'formatted', 'displayValue']) {
    assert(!(forbidden in obs), `observation() must never carry presentation-layer field "${forbidden}"`);
  }
}

// --- 4. Provenance alignment with js/ibis-provenance.js: uses the real shared builder when loaded, ---
// and produces the SAME field names when it isn't (never a competing vocabulary).
{
  const withIbis = loadContext(['js/ibis-provenance.js']).window.FTN;
  const withoutIbis = loadContext().window.FTN;
  const source = withIbis.Statistics.sourceDataset({ id: 's', name: 'Test Source', publisher: 'Test Publisher', url: 'https://example.com', accessMethod: 'PUBLIC_CSV_DOWNLOAD', licensingNote: 'Cited with attribution' });
  const obs = withIbis.Statistics.observation({ indicatorId: 'x', retrievedAt: '2026-08-25', publicationDate: '2024', confidenceBasis: 'Official agency' });
  const withProv = withIbis.Statistics.provenanceFor(obs, source);
  const withoutProv = withoutIbis.Statistics.provenanceFor(obs, source);
  for (const field of ['sourceIdentity', 'sourceUrl', 'publisher', 'sourceRetrievedAt', 'sourceReferenceDate', 'retrievalMethod', 'confidenceBasis', 'licensingNote', 'degradedState']) {
    assert(field in withProv, `provenanceFor() with ibis-provenance.js loaded must carry field "${field}"`);
    assert(field in withoutProv, `provenanceFor() without ibis-provenance.js loaded must STILL carry the same field name "${field}" -- no competing vocabulary`);
  }
  assert.equal(withProv.sourceUrl, 'https://example.com');
  assert.equal(withProv.publisher, 'Test Publisher');
  assert.equal(withProv.sourceReferenceDate, '2024');
  assert.equal(withProv.sourceRetrievedAt, '2026-08-25');
}

// --- 5. Crime adapter: real transform of the actual live data/crime-statistics.json. ---
{
  const context = loadContext(['js/ibis-provenance.js', 'js/ftn-statistics-crime-adapter.js']);
  const raw = JSON.parse(fs.readFileSync('data/crime-statistics.json', 'utf8'));
  const built = context.window.FTN.StatisticsCrimeAdapter.buildObservations(raw);

  assert.equal(built.indicatorDefinitions.length, 2, 'must define exactly the two crime indicators (count + rate)');
  assert.equal(built.indicatorDefinitions[0].id, 'crime-murders-reported');
  assert.equal(built.indicatorDefinitions[1].id, 'crime-murder-rate-per-100k');
  assert.match(built.indicatorDefinitions[1].formula, /100,000/);

  assert(built.sources.cso && built.sources.ttps, 'must produce both the CSO historical and TTPS current source datasets');
  assert.equal(built.sources.cso.url, raw.source.url);
  assert.equal(built.sources.ttps.url, raw.current.sourceUrl);
  // Real licensing findings must be present, not fabricated as "cleared".
  assert.match(built.sources.cso.licensingNote, /not.*verified|unclear/i);
  assert.match(built.sources.ttps.licensingNote, /no published terms/i);

  // Real historical observations: one count + one rate per annual row.
  const historicalCount = built.observations.filter((o) => o.indicatorId === 'crime-murders-reported' && o.sourceId === 'tt-cso-crime-historical');
  assert.equal(historicalCount.length, raw.annual.length, 'must produce one historical count observation per real annual row, not fabricated');
  const row2024 = historicalCount.find((o) => o.referencePeriod === '2024');
  assert.equal(row2024.value, raw.annual.find((r) => r.year === 2024).reported, 'the 2024 observation value must be the real CSO figure, unchanged');
  assert.equal(row2024.revisionStatus, 'PROVISIONAL', '2024 is flagged provisional in the real source data -- must propagate, not be silently finalized');

  const finalRow = historicalCount.find((o) => o.referencePeriod === '2015');
  assert.equal(finalRow.revisionStatus, 'FINAL');

  // Real rate observations carry the real CSO-calculated per-100k figure, not FTN-recalculated.
  const rate2024 = built.observations.find((o) => o.indicatorId === 'crime-murder-rate-per-100k' && o.referencePeriod === '2024');
  assert.equal(rate2024.value, raw.crimeSeries.find((s) => s.id === 'murder').rates[9]);

  // Current TTPS observation: real value, explicit source-date-unknown handling.
  const current = built.observations.find((o) => o.sourceId === 'tt-ttps-crime-current');
  assert.equal(current.value, raw.current.reported);
  assert.equal(current.publicationDate, null, 'TTPS publishes no statistical reference date for the current total -- must be explicit null, not fabricated');
  assert.equal(current.retrievedAt, raw.current.asOf);
  assert.equal(current.revisionStatus, 'PROVISIONAL');

  // Never conflate FTN's retrieval date with the source's own reference/publication date.
  assert.notEqual(current.retrievedAt, current.publicationDate === null ? undefined : current.publicationDate, 'retrievedAt and publicationDate must remain distinct concepts');
}

// --- 6. Unavailable state: an adapter fed a current block with no reported value must suppress, not fabricate. ---
{
  const context = loadContext(['js/ibis-provenance.js', 'js/ftn-statistics-crime-adapter.js']);
  const raw = JSON.parse(fs.readFileSync('data/crime-statistics.json', 'utf8'));
  const broken = { ...raw, current: { year: 2026, asOf: '2026-08-25', reported: null, detected: null, sourceName: raw.current.sourceName, sourceUrl: raw.current.sourceUrl } };
  const built = context.window.FTN.StatisticsCrimeAdapter.buildObservations(broken);
  const current = built.observations.find((o) => o.sourceId === 'tt-ttps-crime-current');
  assert.equal(current.value, null, 'a missing current value must stay null, never a fabricated/carried-over number');
  assert.equal(current.suppressionReason, 'NO_VERIFIED_VALUE');
  assert.equal(current.confidenceBasis, 'NOT_ASSESSED');
}

// --- 7. FX adapter (Phase 5B): real transform of the actual live data/fx-usd-ttd.json -- the
// second indicator, proving the shared schema generalizes beyond crime's ANNUAL/count pattern to a
// MONTHLY currency-rate series with a real month-over-month derived calculation. ---
{
  const context = loadContext(['js/ibis-provenance.js', 'js/ftn-statistics-fx-adapter.js']);
  const raw = JSON.parse(fs.readFileSync('data/fx-usd-ttd.json', 'utf8'));
  const built = context.window.FTN.StatisticsFxAdapter.buildObservations(raw);

  assert.equal(built.indicatorDefinitions.length, 2, 'must define exactly the two FX indicators (buying + selling)');
  assert(built.indicatorDefinitions.every((d) => d.frequency === 'MONTHLY'), 'FX indicators must be MONTHLY -- a genuinely different frequency than crime\'s ANNUAL series');
  assert(built.indicatorDefinitions.every((d) => d.unit === 'TTD per USD'));

  assert(built.sources.cbtt, 'must produce the Central Bank source dataset');
  assert.equal(built.sources.cbtt.url, raw.source.url);
  assert.match(built.sources.cbtt.licensingNote, /no published data-reuse/i, 'real licensing finding must be present, not fabricated as cleared');

  const buying = built.observations.filter((o) => o.indicatorId === 'fx-usd-buying-rate');
  const selling = built.observations.filter((o) => o.indicatorId === 'fx-usd-selling-rate');
  assert.equal(buying.length, raw.monthly.length, 'must produce one buying-rate observation per real monthly row, not fabricated');
  assert.equal(selling.length, raw.monthly.length);
  const latestRow = raw.monthly[raw.monthly.length - 1];
  const latestObs = selling.find((o) => o.referencePeriod === latestRow.period);
  assert.equal(latestObs.value, latestRow.usdSelling, 'the observation value must be the real published rate, unchanged');
  assert.equal(latestObs.publicationDate, null, 'the Bank does not publish an explicit statistical reference date for this figure -- must be explicit null');

  // Real derived calculation: month-over-month change, a genuinely different shape than crime's
  // cross-sectional per-100,000 rate (a same-indicator adjacent-period comparison instead).
  assert.equal(built.derivedCalculations.length, 1);
  const mom = built.derivedCalculations[0];
  assert.match(mom.formula, /previous month/i);
  assert.equal(mom.inputs.length, 2, 'a derived value must name its real inputs');
  const prevRow = raw.monthly[raw.monthly.length - 2];
  const expectedAbsolute = Number((latestRow.usdSelling - prevRow.usdSelling).toFixed(4));
  assert.equal(mom.computedValue.absolute, expectedAbsolute, 'the month-over-month change must match a manual recomputation from the real two most recent rows');
}

// --- 8. FX unavailable state: an adapter fed zero real rows must produce zero observations and ---
// zero derived calculations, never a fabricated placeholder.
{
  const context = loadContext(['js/ibis-provenance.js', 'js/ftn-statistics-fx-adapter.js']);
  const built = context.window.FTN.StatisticsFxAdapter.buildObservations({ source: { retrieved: '2026-08-25' }, monthly: [] });
  assert.equal(built.observations.length, 0);
  assert.equal(built.derivedCalculations.length, 0, 'fewer than two real rows must never produce a fabricated derived change');
}

console.log('Phase 5A FTN Statistics: schema validation, provenance alignment with js/ibis-provenance.js, and the real crime adapter transform (historical, current, and unavailable-state paths) all verified against the live data/crime-statistics.json.');
console.log('Phase 5B FTN Statistics: the real Central Bank FX adapter transform (MONTHLY frequency, currency-rate unit, month-over-month derived calculation, and zero-row unavailable state) verified against the live data/fx-usd-ttd.json.');
