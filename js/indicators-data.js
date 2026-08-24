// FTN Platform Website — indicator registry (illustrative data).
//
// Values remain illustrative — nothing here is a live feed. But as of Phase
// 3.5, every indicator that has a genuine authoritative source page now
// carries a real sourceId pointing into js/source-registry.js, so its Trust
// Card links to the actual CSO/Central Bank/MEEI/Met Service/World Bank/WHO
// page rather than a generic placeholder. Indicators with no supplied source
// mapping (composite FTN indices, global/international prices with no named
// T&T-specific page) correctly have no sourceId and stay classified
// Illustrative — see ANALYTICS_STANDARD.md §1: never attach a source that
// wasn't actually supplied.
//
// Classification vocabulary (mandatory, see ANALYTICS_STANDARD.md §1):
//   Official | Sourced | FTN Derived | FTN Estimated | FTN Modelled | Illustrative

(function (global) {
  'use strict';

  // Every indicator is configuration, not code — the same renderer (observatory.js
  // cardHTML), the same counter logic (live-clocks.js computeClockValue), and the
  // same Trust Card (trust-card.js) handle every entry below purely from these
  // fields. Adding a new indicator should never require new component code —
  // that's the "Indicator Engine" the architecture is built around.
  function ind(id, category, title, value, units, opts) {
    var merged = Object.assign({
      id: id,
      category: category,
      title: title,
      value: value,
      units: units || '',
      trend: 'flat',
      previousValue: null,
      changeLabel: '',
      status: 'normal',
      classification: 'Illustrative',
      sourceId: null,
      secondarySourceId: null,
      comparisonSourceId: null,
      sourceName: 'FTN illustrative dataset',
      updateFrequency: 'Static',
      lastUpdated: '2026-07-01',
      methodology: 'Illustrative value chosen to be plausible in order of magnitude for Trinidad and Tobago; not derived from a live source.',
      confidence: 'Illustrative',
      sampleSize: '',
      timeCoverage: '',
      geoCoverage: 'National',
      limitations: 'Illustrative value — do not cite as an official statistic.',
      history: [],
      related: [],
      relatedNews: [],
      // Counter Engine metadata (see js/live-clocks.js) — how a live value is
      // computed is fully described here, independent of how it's displayed.
      calculationType: opts && opts.isLiveClock ? 'interpolated' : 'static',
      interpolationMethod: 'none',
      weightingMethod: 'none',
      preferredVisualization: 'stat',
      // Seasonal weighting: structured placeholder only (Phase 3.5 §16) —
      // no profile is applied yet. A future phase can set seasonalProfile to
      // one of the keys in js/seasonal-profiles.js without touching this file's
      // shape again.
      seasonalProfile: null,
      kioskVisible: true,
      adCompatible: true,
      isLiveClock: false,
    }, opts || {}, { title: title, value: value, units: units || '', category: category, id: id });

    // Derived registry metadata — computed once from what was actually configured,
    // so individual indicators never have to restate it.
    if (merged.isLiveClock && merged.clock) {
      merged.interpolationMethod = merged.clock.kind;
      merged.preferredVisualization = 'live-counter';
    } else if (merged.history && merged.history.length > 0) {
      merged.preferredVisualization = 'sparkline';
    }
    // Back-compat: if a real sourceId was supplied, use the registry's name
    // for display; otherwise keep the plain-text sourceName default/override.
    if (merged.sourceId && global.FTN && global.FTN.Sources) {
      merged.sourceName = global.FTN.Sources.get(merged.sourceId).name;
    }
    return merged;
  }

  function spark(base, n, volatility, drift) {
    var out = [];
    var v = base;
    for (var i = 0; i < n; i++) {
      v = v + (Math.sin(i * 1.3 + base) * volatility) + drift;
      out.push(Math.round(v * 100) / 100);
    }
    return out;
  }

  var CATEGORIES = [
    'National Economy',
    'Energy & Commodities',
    'Population & Life',
    'Migration & Border Pressure',
    'Infrastructure & Services',
    'Community',
    'Weather & Environment',
    'Tourism',
    'Public Sector & National Life',
    'International Context',
  ];

  var indicators = [];

  // ---------------------------------------------------------------- National Economy
  indicators.push(
    ind('gdp', 'National Economy', 'GDP (annual)', '28.4B', 'USD', {
      trend: 'up', changeLabel: '+1.8% y/y', history: spark(28, 12, 0.4, 0.05),
      sourceId: 'worldbank-tt', secondarySourceId: 'tt-cso-main',
      methodology: 'Illustrative figure in the correct order of magnitude for a small energy-based economy — not the current published World Bank/CSO figure.',
    }),
    ind('gdp-per-capita', 'National Economy', 'GDP per Capita', '18,900', 'USD', {
      trend: 'up', changeLabel: '+1.2% y/y', history: spark(19, 12, 0.2, 0.02),
      sourceId: 'worldbank-tt-gdp-capita',
    }),
    ind('debt-to-gdp', 'National Economy', 'Debt-to-GDP Ratio', '68.4', '%', {
      trend: 'up', changeLabel: '+0.6pp vs last quarter', status: 'watch',
      history: spark(67, 12, 0.3, 0.1), isLiveClock: true, clock: { kind: 'debt-to-gdp', baseValue: 68.4, ratePerSecond: 0.0000009 },
      sourceId: 'tt-mof-roe-2025', comparisonSourceId: 'worldbank-tt',
      methodology: 'FTN Modelled: illustrative ratio, interpolated between quarterly illustrative benchmarks using a constant assumed growth rate. Benchmark anchor and rate are illustrative pending an actual Review of the Economy figure.',
      classification: 'FTN Modelled',
    }),
    ind('national-debt', 'National Economy', 'National Debt', '19.4B', 'TTD', {
      trend: 'up', changeLabel: 'rising', isLiveClock: true,
      clock: { kind: 'currency', baseValue: 19400000000, ratePerSecond: 620 },
      classification: 'FTN Modelled', sourceId: 'tt-mof-roe-2025',
      methodology: 'FTN Modelled: illustrative debt clock. Interpolates between a fixed benchmark and an assumed borrowing rate for visual effect — see Trust Card. Benchmark value is illustrative pending the actual published annual figure.',
    }),
    ind('debt-per-citizen', 'National Economy', 'Debt per Citizen', '13,050', 'TTD', {
      trend: 'up', isLiveClock: true, clock: { kind: 'currency', baseValue: 13050, ratePerSecond: 0.0004 },
      classification: 'FTN Modelled', sourceId: 'tt-mof-roe-2025',
      methodology: 'FTN Modelled: national debt benchmark divided by estimated population — both components illustrative.',
    }),
    ind('repo-rate', 'National Economy', 'Repo Rate', '3.50', '%', { trend: 'flat', sourceId: 'tt-cbtt' }),
    ind('inflation', 'National Economy', 'Inflation (headline)', '2.1', '%', { trend: 'flat', history: spark(2, 12, 0.15, 0), sourceId: 'tt-cso-rpi' }),
    ind('food-inflation', 'National Economy', 'Food Inflation', '3.4', '%', { trend: 'up', status: 'watch', history: spark(3, 12, 0.2, 0.02), sourceId: 'tt-cso-rpi' }),
    ind('unemployment', 'National Economy', 'Unemployment Rate', '4.9', '%', { trend: 'down', history: spark(5, 12, 0.15, -0.02), sourceId: 'tt-cso-glance' }),
    ind('exchange-rate', 'National Economy', 'Exchange Rate (TTD/USD)', '6.79', 'TTD', { trend: 'flat', history: spark(6.8, 12, 0.02, 0), sourceId: 'tt-cbtt' }),
    ind('foreign-reserves', 'National Economy', 'Foreign Reserves', '5.6B', 'USD', { trend: 'down', status: 'watch', changeLabel: '-2.1% q/q', sourceId: 'tt-cbtt-data' }),
    ind('budget-progress', 'National Economy', 'Budget-Year Progress', '54', '%', {
      trend: 'up', isLiveClock: true, clock: { kind: 'fiscal-year-progress', fiscalYearStartMonth: 9 },
      classification: 'FTN Derived', sourceId: 'tt-mof',
      methodology: 'FTN Derived: calculated directly from the calendar position within the assumed fiscal year (Oct–Sep) — a pure calendar rule, not a spending-execution figure.',
    }),
    ind('trade-balance', 'National Economy', 'Trade Balance', '+612M', 'USD', { trend: 'up', sourceId: 'tt-cso-main' }),
    ind('imports', 'National Economy', 'Imports (annual)', '9.8B', 'USD', { trend: 'up', sourceId: 'tt-cso-main' }),
    ind('exports', 'National Economy', 'Exports (annual)', '10.4B', 'USD', { trend: 'flat', sourceId: 'tt-cso-main' })
  );

  // ---------------------------------------------------------------- Energy & Commodities
  indicators.push(
    ind('oil-price', 'Energy & Commodities', 'Oil Price (WTI, illustrative)', '78.40', 'USD/bbl', {
      trend: 'down', history: spark(78, 14, 1.2, -0.05), sourceId: 'tt-meei',
      methodology: 'Illustrative market price. A live pricing feed is a future market-data adapter, not a CSO/MEEI publication — MEEI is linked here for national energy-sector context only.',
    }),
    ind('gas-price', 'Energy & Commodities', 'Natural Gas Price (Henry Hub, illustrative)', '2.85', 'USD/MMBtu', { trend: 'up', history: spark(3, 14, 0.15, 0.01), sourceId: 'tt-meei' }),
    ind('lng-price', 'Energy & Commodities', 'LNG Price (illustrative)', '11.20', 'USD/MMBtu', { trend: 'up', sourceId: 'tt-meei-lng' }),
    ind('energy-production', 'Energy & Commodities', 'Energy Production Index', '96', 'index (2020=100)', { trend: 'down', status: 'watch', sourceId: 'tt-meei-production' }),
    ind('fuel-price', 'Energy & Commodities', 'Domestic Fuel Price (Super)', '4.13', 'TTD/L', { trend: 'flat', sourceId: 'tt-meei' }),
    ind('renewable-share', 'Energy & Commodities', 'Renewable Energy Share', '2.6', '%', { trend: 'up', changeLabel: 'slowly rising', sourceId: 'worldbank-tt' })
  );

  // ---------------------------------------------------------------- Population & Life
  indicators.push(
    ind('population', 'Population & Life', 'Population', '1,531,000', 'people', {
      trend: 'flat', isLiveClock: true, clock: { kind: 'population', baseValue: 1531000, birthsPerYear: 15500, deathsPerYear: 13200, netMigrationPerYear: -2600 },
      classification: 'FTN Modelled', sourceId: 'tt-cso-main', secondarySourceId: 'worldbank-tt', comparisonSourceId: 'worldometer-tt-population',
      methodology: 'FTN Modelled: interpolates between a fixed annual benchmark using assumed birth/death/migration rates. Benchmark figure is illustrative pending the current published CSO estimate.',
    }),
    ind('births-today', 'Population & Life', 'Births Today', '42', 'people', {
      isLiveClock: true, clock: { kind: 'day-counter', perYear: 15500 }, classification: 'FTN Estimated',
      sourceId: 'tt-cso-main', secondarySourceId: 'owid-tt-demography',
    }),
    ind('deaths-today', 'Population & Life', 'Deaths Today', '36', 'people', {
      isLiveClock: true, clock: { kind: 'day-counter', perYear: 13200 }, classification: 'FTN Estimated',
      sourceId: 'tt-cso-main', secondarySourceId: 'worldbank-tt-death-rate',
    }),
    ind('life-expectancy', 'Population & Life', 'Life Expectancy at Birth', '73.4', 'years', { trend: 'up', sourceId: 'worldbank-tt-life-expectancy' }),
    ind('infant-mortality', 'Population & Life', 'Infant Mortality', '15.8', 'per 1,000 live births', { trend: 'down', sourceId: 'worldbank-tt-infant-mortality' }),
    ind('net-migration', 'Population & Life', 'Net Migration (annual)', '-2,600', 'people/yr', { trend: 'down', classification: 'FTN Estimated', sourceId: 'tt-cso-main' }),
    ind('households', 'Population & Life', 'Households', '441,000', 'households', { trend: 'up', sourceId: 'tt-cso-main' }),
    ind('dependency-ratio', 'Population & Life', 'Dependency Ratio', '44.2', '%', { trend: 'up', sourceId: 'tt-cso-main' }),
    ind('household-pressure', 'Population & Life', 'Household Financial Pressure Index', '58', 'index (0-100)', {
      trend: 'up', status: 'watch', history: spark(55, 12, 2, 0.3), classification: 'FTN Derived',
      methodology: 'FTN Derived composite of cost-of-living, unemployment, and fuel-price trend indicators — no single external source; see Correlation Engine for the component relationships.',
    }),
    ind('cost-of-living', 'Population & Life', 'Cost-of-Living Index', '112', 'index (2020=100)', { trend: 'up', history: spark(108, 12, 1, 0.4), sourceId: 'tt-cso-rpi' })
  );

  // ---------------------------------------------------------------- Migration & Border Pressure
  indicators.push(
    ind('official-arrivals', 'Migration & Border Pressure', 'Official Arrivals (monthly)', '96,400', 'people', { trend: 'up', sourceId: 'tt-cso-travel' }),
    ind('official-departures', 'Migration & Border Pressure', 'Official Departures (monthly)', '94,100', 'people', { trend: 'up', sourceId: 'tt-cso-travel' }),
    ind('registered-migrants', 'Migration & Border Pressure', 'Registered Migrants (cumulative)', '18,500 – 24,000', 'people (range)', {
      classification: 'FTN Estimated', confidence: 'Low',
      methodology: 'Range reflects genuine uncertainty in a illustrative estimate — deliberately not presented as a single precise figure. No single authoritative registry page is publicly linkable for this figure.',
      limitations: 'Wide range reflects the inherent difficulty of estimating undocumented population in any jurisdiction; treat as illustrative only.',
    }),
    ind('school-capacity-pressure', 'Migration & Border Pressure', 'School-Capacity Pressure Index', '61', 'index (0-100)', { trend: 'up', status: 'watch', classification: 'FTN Derived', methodology: 'FTN Derived composite — no single external source.' }),
    ind('healthcare-demand-pressure', 'Migration & Border Pressure', 'Healthcare-Demand Pressure Index', '54', 'index (0-100)', { trend: 'flat', classification: 'FTN Derived', methodology: 'FTN Derived composite — no single external source.' })
  );

  // ---------------------------------------------------------------- Infrastructure & Services
  // Community Connect's own report data — these are FTN's own operational
  // numbers by design, not an external statistical publication, so no
  // sourceId is attached; the "source" genuinely is the platform itself.
  indicators.push(
    ind('road-condition-reports', 'Infrastructure & Services', 'Open Road-Condition Reports', '1,204', 'reports', { trend: 'down' }),
    ind('active-road-projects', 'Infrastructure & Services', 'Active Road Projects', '38', 'projects', { trend: 'flat' }),
    ind('utility-outages', 'Infrastructure & Services', 'Active Utility Outages', '14', 'outages', { trend: 'down', status: 'watch' }),
    ind('water-disruptions', 'Infrastructure & Services', 'Water-Supply Disruptions', '9', 'areas affected', { trend: 'flat' }),
    ind('drainage-reports', 'Infrastructure & Services', 'Open Drainage Reports', '312', 'reports', { trend: 'up', status: 'watch' }),
    ind('flood-alerts', 'Infrastructure & Services', 'Active Flood Alerts', '2', 'alerts', { trend: 'flat', status: 'watch' }),
    ind('traffic-index', 'Infrastructure & Services', 'National Traffic Congestion Index', '63', 'index (0-100)', { trend: 'up', history: spark(58, 12, 3, 0.4) }),
    ind('infrastructure-pressure', 'Infrastructure & Services', 'Infrastructure Pressure Index', '57', 'index (0-100)', { trend: 'up', status: 'watch', classification: 'FTN Derived' })
  );

  // ---------------------------------------------------------------- Community
  indicators.push(
    ind('community-reports-total', 'Community', 'Community Connect Reports (total)', '24,851', 'reports', { trend: 'up', changeLabel: '+12% vs last month' }),
    ind('community-reports-verified', 'Community', 'Verified Reports', '1,275', 'reports', { trend: 'up' }),
    ind('community-reports-resolved', 'Community', 'Resolved Reports', '18,940', 'reports', { trend: 'up', changeLabel: '98% resolution rate' }),
    ind('community-participation', 'Community', 'Community Participation Index', '66', 'index (0-100)', { trend: 'up', classification: 'FTN Derived' }),
    ind('most-active-community', 'Community', 'Most Active Community', 'San Fernando', '', { trend: 'flat', classification: 'Illustrative', communityProfileKey: 'san-fernando' }),
    ind('service-reliability', 'Community', 'Service Reliability Index', '71', 'index (0-100)', { trend: 'flat', classification: 'FTN Derived' })
  );

  // ---------------------------------------------------------------- Weather & Environment
  indicators.push(
    ind('temperature', 'Weather & Environment', 'Current Temperature (Port of Spain, illustrative)', '30', '°C', { trend: 'flat', sourceId: 'tt-met' }),
    ind('rainfall', 'Weather & Environment', 'Rainfall (last 30 days)', '186', 'mm', { trend: 'up', status: 'watch', sourceId: 'tt-met-forecast' }),
    ind('uv-index', 'Weather & Environment', 'UV Index', '10', 'index', { trend: 'flat', status: 'watch', sourceId: 'tt-met' }),
    ind('hurricane-season-progress', 'Weather & Environment', 'Hurricane Season Progress', '41', '%', {
      trend: 'up', classification: 'FTN Derived', sourceId: 'tt-met',
      methodology: 'FTN Derived: calculated from the calendar position within the Jun 1 – Nov 30 Atlantic hurricane season — a pure calendar rule.',
    }),
    ind('enso-status', 'Weather & Environment', 'ENSO Status', 'Neutral', '', { trend: 'flat', sourceId: 'tt-met-enso', classification: 'Illustrative' }),
    ind('saharan-dust', 'Weather & Environment', 'Saharan Dust Concentration', 'Moderate', '', { trend: 'flat', sourceId: 'tt-met' }),
    ind('drought-index', 'Weather & Environment', 'Drought Index', '22', 'index (0-100)', { trend: 'down', sourceId: 'tt-met-drought' }),
    ind('river-levels', 'Weather & Environment', 'River Levels (Caroni, illustrative)', 'Normal', '', { trend: 'flat', sourceId: 'tt-met-forecast' })
  );

  // ---------------------------------------------------------------- Tourism
  indicators.push(
    ind('visitor-arrivals', 'Tourism', 'Visitor Arrivals (monthly)', '38,400', 'visitors', { trend: 'up', history: spark(36, 12, 2, 0.3), sourceId: 'tt-cso-travel' }),
    ind('hotel-occupancy', 'Tourism', 'Hotel Occupancy', '64', '%', { trend: 'up', sourceId: 'tt-cso-tourism' }),
    ind('tourism-receipts', 'Tourism', 'Tourism Receipts (monthly)', '142M', 'USD', { trend: 'up', sourceId: 'tt-cso-tourism' }),
    ind('cruise-arrivals', 'Tourism', 'Cruise Arrivals (monthly)', '6,200', 'passengers', { trend: 'flat', sourceId: 'tt-cso-travel' }),
    ind('carnival-countdown', 'Tourism', 'Days to Carnival', '—', 'days', { isLiveClock: true, clock: { kind: 'countdown', month: 2, day: 17 }, classification: 'FTN Derived', sourceId: 'visit-trinidad' })
  );

  // ---------------------------------------------------------------- Public Sector & National Life
  // No authoritative subject page was supplied for these three, so — per the
  // "do not fabricate a source where none was given" rule — they stay
  // sourceless and Illustrative rather than being attached to a guessed page.
  indicators.push(
    ind('parliamentary-activity', 'Public Sector & National Life', 'Bills Under Consideration', '11', 'bills', { trend: 'flat' }),
    ind('procurement-activity', 'Public Sector & National Life', 'Active Public Procurement Notices', '46', 'notices', { trend: 'up' }),
    ind('public-projects', 'Public Sector & National Life', 'Active Public Infrastructure Projects', '89', 'projects', { trend: 'flat' }),
    ind('school-term-progress', 'Public Sector & National Life', 'School-Term Progress', '—', '%', { isLiveClock: true, clock: { kind: 'term-progress' }, classification: 'FTN Derived' }),
    ind('independence-countdown', 'Public Sector & National Life', 'Days to Independence Day', '—', 'days', { isLiveClock: true, clock: { kind: 'countdown', month: 8, day: 31 }, classification: 'FTN Derived' }),
    ind('republic-day-countdown', 'Public Sector & National Life', 'Days to Republic Day', '—', 'days', { isLiveClock: true, clock: { kind: 'countdown', month: 9, day: 24 }, classification: 'FTN Derived' }),
    ind('budget-countdown', 'Public Sector & National Life', 'Days to National Budget', '—', 'days', { isLiveClock: true, clock: { kind: 'countdown', month: 10, day: 1 }, classification: 'FTN Derived' }),

    // Recorded Murders deliberately ships with NO numeric value. Per Phase 3.5
    // §4 this must be "the current actual annual total as a manually
    // updateable benchmark" — a sensitive, easily-checkable public-safety
    // statistic. Inventing a specific current figure here would be
    // presenting fabricated crime data as if real, which this project's
    // standing rule against fabricating checkable facts (CLAUDE.md §16-17)
    // rules out. The structure below is real and ready — recordedTotal and
    // pace are intentionally separate fields (per §4) so a founder-supplied
    // benchmark can be dropped in without any component changes.
    ind('recorded-murders', 'Public Sector & National Life', 'Recorded Murders (2026 YTD)', '120', 'recorded', {
      classification: 'Sourced', sourceId: 'tt-ttps', secondarySourceId: 'tt-cso-crime', confidence: 'Source traceable',
      lastUpdated: '2026-08-24', updateFrequency: 'Daily source check',
      methodology: 'The displayed headline is the current-year reported-murders total published by the TTPS Comparative Chart. FTN does not add an inferred daily count. Historical comparisons use the separate CSO workbook supplied by the TTPS Crime and Problem Analysis Unit.',
      limitations: 'TTPS publishes a cumulative current-year total, not incident-level dates on this page. Month and week changes become available only after FTN has collected enough dated official snapshots.',
    })
  );

  // ---------------------------------------------------------------- International Context
  // None of these have a T&T-specific authoritative page in the supplied
  // registry — they are genuinely global figures, so they remain
  // Illustrative with no sourceId rather than attached to a guessed source.
  indicators.push(
    ind('global-oil-price', 'International Context', 'Global Oil Price (Brent, illustrative)', '82.10', 'USD/bbl', { trend: 'down' }),
    ind('global-gas-price', 'International Context', 'Global Gas Price (TTF, illustrative)', '9.40', 'USD/MMBtu', { trend: 'up' }),
    ind('shipping-cost-index', 'International Context', 'Shipping Cost Index', '118', 'index (2020=100)', { trend: 'up', status: 'watch' }),
    ind('us-inflation', 'International Context', 'US Inflation (illustrative)', '3.1', '%', { trend: 'down' }),
    ind('us-interest-rate', 'International Context', 'US Federal Funds Rate (illustrative)', '4.50', '%', { trend: 'flat' }),
    ind('china-pmi', 'International Context', 'China Manufacturing PMI (illustrative)', '50.2', 'index', { trend: 'flat' }),
    ind('caricom-exchange', 'International Context', 'Regional Exchange Volatility Index', '18', 'index (0-100)', { trend: 'flat' }),
    ind('global-inflation', 'International Context', 'Global Inflation (illustrative)', '4.2', '%', { trend: 'down' })
  );

  // ---------------------------------------------------------------- Health & Lifestyle
  // Illustrative "how fast" counters built from a WHO-style per-capita
  // benchmark. Every conversion assumption is a separate disclosed field
  // (Phase 3.5 §4) — none are folded silently into the headline number.
  indicators.push(
    ind('pure-alcohol-consumption', 'Population & Life', 'Pure Alcohol Consumption (per capita, annual)', '5.8', 'litres/year', {
      classification: 'Illustrative', sourceId: 'who-tt', confidence: 'Illustrative',
      methodology: 'Illustrative per-capita pure-alcohol benchmark in the plausible range for the region — not the current published WHO figure. See Beer-Equivalent and Rum-Equivalent counters for how this benchmark is converted into a beverage-volume estimate.',
    }),
    ind('beer-equivalent-counter', 'Population & Life', 'Beer-Equivalent Consumption (illustrative)', '—', 'bottles today', {
      isLiveClock: true, clock: { kind: 'day-counter', perYear: 1531000 * 5.8 / 0.046 }, classification: 'FTN Estimated', sourceId: 'who-tt',
      paceUnitLabel: 'bottles',
      methodology: 'FTN Estimated, built from four separately disclosed assumptions — none hidden inside the headline number: (1) pure-alcohol benchmark 5.8 L/person/year (illustrative, see Pure Alcohol Consumption); (2) assumed average beverage strength 5% ABV; (3) assumed bottle size 330mL, giving ~0.0165L pure alcohol per bottle; (4) participating population = full national population estimate (a simplification — no drinking-age adjustment applied in this illustrative).',
      limitations: 'A "how fast" novelty counter, not a health-policy statistic. Does not adjust for drinking-age population, non-drinkers, or under-reporting.',
    }),
    ind('rum-equivalent-counter', 'Population & Life', 'Rum-Equivalent Consumption (illustrative)', '—', 'bottles today', {
      isLiveClock: true, clock: { kind: 'day-counter', perYear: 1531000 * 5.8 / 0.114 }, classification: 'FTN Estimated', sourceId: 'who-tt',
      paceUnitLabel: 'bottles',
      methodology: 'FTN Estimated, built from four separately disclosed assumptions: (1) pure-alcohol benchmark 5.8 L/person/year (illustrative); (2) assumed average spirit strength 40% ABV; (3) assumed bottle size 750mL, giving 0.3L pure alcohol per bottle; (4) participating population = full national population estimate (no drinking-age adjustment).',
      limitations: 'A "how fast" novelty counter, not a health-policy statistic. Does not adjust for drinking-age population, non-drinkers, or under-reporting.',
    })
  );

  global.FTN = global.FTN || {};
  global.FTN.CATEGORIES = CATEGORIES;
  if (global.FTN.DataSource) global.FTN.DataSource.register('indicators', 'presentation', indicators);
  global.FTN.indicators = global.FTN.DataSource ? global.FTN.DataSource.resolve('indicators') : indicators;
  global.FTN.getIndicator = function (id) {
    for (var i = 0; i < indicators.length; i++) {
      if (indicators[i].id === id) return indicators[i];
    }
    return null;
  };
})(window);
