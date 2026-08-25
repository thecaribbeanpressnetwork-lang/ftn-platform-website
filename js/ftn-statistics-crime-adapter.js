// FTN Platform — CSO/TTPS crime statistics read-side adapter (Phase 5A). Transforms the real,
// already-live data/crime-statistics.json (populated by the write-side adapter,
// scripts/update-ttps-crime.mjs, which runs daily via .github/workflows/update-ttps-crime.yml) into
// js/ftn-statistics.js's shared schema shape -- indicator definition, source datasets, and real
// Observation objects, each carrying its own provenance envelope.
//
// This does not replace or duplicate data/crime-statistics.json/js/crime-intelligence.js -- it is
// the one place that turns that existing file's shape into the shared contract, so any future
// consumer (FTN Statistics, FTN Live, ibis.ai) reads schema-conformant objects instead of each
// re-parsing the raw JSON file's own bespoke shape independently.
(function (global) {
  'use strict';

  function require_(name) {
    var mod = global.FTN && global.FTN[name];
    if (!mod) throw new Error('js/ftn-statistics-crime-adapter.js requires js/' + (name === 'Statistics' ? 'ftn-statistics.js' : name) + ' to be loaded first.');
    return mod;
  }

  // Two source datasets, deliberately kept distinct (never blended into one number) -- the CSO
  // historical workbook (2015-2024, revised/provisional per year) and TTPS's own live current-year
  // comparative chart (2026 YTD, no source-published reference date).
  function sources() {
    var Stats = require_('Statistics');
    return {
      cso: Stats.sourceDataset({
        id: 'tt-cso-crime-historical',
        name: 'Central Statistical Office — Number of Murders by Police Division 2015–2024',
        publisher: 'Central Statistical Office / Crime and Problem Analysis Unit, Trinidad and Tobago Police Service',
        url: 'https://cso.gov.tt/subjects/population-and-vital-statistics/crime-statistics/',
        documentId: 'cso-crime-statistics-2015-2024',
        accessMethod: 'PUBLIC_HTML_LANDING_PAGE',
        // Verified 2026-08-25: CSO's own site returned HTTP 403 (Cloudflare bot-protection) to
        // every direct access attempt from this environment, including the raw published .xlsx
        // file -- the terms-of-use page could not be independently read in full. A search-engine
        // summary suggested a possible commercial-use restriction, but the exact clause could not
        // be verified verbatim. See GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md for the
        // full record -- FTN treats this as licensing genuinely unclear, not cleared, and only
        // cites/attributes this source's already-published figures (facts, not the compilation
        // itself), never redistributes the underlying dataset file.
        licensingNote: 'Not independently verified this pass (CSO site blocked this environment\'s access) -- treated as licensing unclear, not cleared. FTN cites the published figures with attribution and a direct link; it does not redistribute the underlying CSO file.',
      }),
      ttps: Stats.sourceDataset({
        id: 'tt-ttps-crime-current',
        name: 'Trinidad and Tobago Police Service — Comparative Chart',
        publisher: 'Trinidad and Tobago Police Service',
        url: 'https://ttps.gov.tt/statistics/comparative/?year=2026',
        documentId: 'ttps-comparative-chart-2026',
        accessMethod: 'PUBLIC_HTML_EMBEDDED_JSON',
        // Verified 2026-08-25: ttps.gov.tt is directly accessible (unlike cso.gov.tt). Its own
        // "Terms of Use" footer link is a dead `#` anchor -- no published terms-of-use document
        // exists to cite. The site states figures are "provided for public information and
        // transparency in accordance with the TTPS commitment to open data," alongside a standard
        // "© 2026 Trinidad and Tobago Police Service. All Rights Reserved." notice. No explicit
        // commercial-use restriction was found, but no explicit permissive license was found
        // either. See the source map for the full reasoning behind FTN's bounded, attributed-
        // citation approach (real figures, prominent attribution and a direct source link; no
        // bulk redistribution of the underlying dataset).
        licensingNote: 'No published terms-of-use found (footer link is a placeholder anchor). Site states a public-transparency/open-data purpose alongside a standard all-rights-reserved notice. FTN cites the published current-year total with attribution and a direct link; it does not redistribute the underlying dataset.',
      }),
    };
  }

  function murderCountIndicator() {
    var Stats = require_('Statistics');
    return Stats.indicatorDefinition({
      id: 'crime-murders-reported',
      publicName: 'Reported Murders',
      description: 'The number of murders reported to the Trinidad and Tobago Police Service, as published by TTPS (current year) and the Central Statistical Office (historical annual series).',
      topic: 'CRIME_AND_JUSTICE',
      geography: 'Trinidad and Tobago',
      geoLevel: 'NATIONAL',
      unit: 'count',
      frequency: 'ANNUAL',
      consumingProducts: ['ftn-live', 'ibis-ai', 'statistics'],
    });
  }

  function murderRateIndicator() {
    var Stats = require_('Statistics');
    return Stats.indicatorDefinition({
      id: 'crime-murder-rate-per-100k',
      publicName: 'Murder Rate per 100,000',
      description: 'Reported murders per 100,000 population, calculated by the Central Statistical Office from its own reported-count series and Trinidad and Tobago\'s population estimate for the same year.',
      topic: 'CRIME_AND_JUSTICE',
      geography: 'Trinidad and Tobago',
      geoLevel: 'NATIONAL',
      unit: 'per 100,000 population',
      frequency: 'ANNUAL',
      formula: 'rate = (reported murders / national population) × 100,000',
      formulaInputs: ['reported murders (CSO)', 'national population estimate for the same year (CSO)'],
      consumingProducts: ['ftn-live', 'ibis-ai', 'statistics'],
    });
  }

  // Transforms data/crime-statistics.json's real content into schema-conformant Observations.
  // `raw` is the parsed JSON already fetched by the caller (this function performs no I/O itself,
  // matching the schema module's own "no hard dependency" discipline).
  function buildObservations(raw) {
    var Stats = require_('Statistics');
    var src = sources();
    var observations = [];

    var murderSeries = (raw.crimeSeries || []).filter(function (s) { return s.id === 'murder'; })[0];
    (raw.annual || []).forEach(function (row, i) {
      observations.push(Stats.observation({
        indicatorId: 'crime-murders-reported',
        value: row.reported,
        unit: 'count',
        referencePeriod: String(row.year),
        sourceReferenceDate: String(row.year),
        publicationDate: null, // CSO's published workbook does not itself carry a page-level publication date FTN could verify this pass
        retrievedAt: raw.source && raw.source.retrieved,
        sourceId: 'tt-cso-crime-historical',
        revisionStatus: row.provisional ? 'PROVISIONAL' : 'FINAL',
        confidenceBasis: 'Official government statistical agency, historical series',
      }));
      if (murderSeries && murderSeries.rates && murderSeries.rates[i] != null) {
        observations.push(Stats.observation({
          indicatorId: 'crime-murder-rate-per-100k',
          value: murderSeries.rates[i],
          unit: 'per 100,000 population',
          referencePeriod: String(row.year),
          sourceReferenceDate: String(row.year),
          publicationDate: null,
          retrievedAt: raw.source && raw.source.retrieved,
          sourceId: 'tt-cso-crime-historical',
          revisionStatus: row.provisional ? 'PROVISIONAL' : 'FINAL',
          confidenceBasis: 'Official government statistical agency, calculated rate',
        }));
      }
    });

    var cur = raw.current || {};
    observations.push(Stats.observation({
      indicatorId: 'crime-murders-reported',
      value: cur.reported != null ? cur.reported : null,
      unit: 'count',
      referencePeriod: cur.year ? ('1 January – ' + (cur.asOf || 'present') + ', ' + cur.year) : null,
      sourceReferenceDate: null, // TTPS does not publish an "as at" date for this cumulative figure
      publicationDate: null, // TTPS does not publish a statistical reference/"as at" date for this cumulative total -- explicit, not omitted
      retrievedAt: cur.asOf || null,
      sourceId: 'tt-ttps-crime-current',
      revisionStatus: 'PROVISIONAL',
      confidenceBasis: cur.reported != null ? 'Official government agency, current-year cumulative total; source publishes no statistical reference date' : Stats.NOT_ASSESSED,
      suppressionReason: cur.reported == null ? 'NO_VERIFIED_VALUE' : null,
    }));

    return { indicatorDefinitions: [murderCountIndicator(), murderRateIndicator()], sources: src, observations: observations };
  }

  global.FTN = global.FTN || {};
  global.FTN.StatisticsCrimeAdapter = {
    sources: sources,
    murderCountIndicator: murderCountIndicator,
    murderRateIndicator: murderRateIndicator,
    buildObservations: buildObservations,
  };
})(typeof window !== 'undefined' ? window : globalThis);
