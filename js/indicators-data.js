// FTN Platform Website — indicator registry (demonstration data).
//
// Every value here is illustrative. Nothing in this file is a live feed or an
// official statistic. Classifications are deliberately conservative: nothing
// is marked "Official" or "Sourced" because no live integration exists yet.
// The registry format is designed so a real adapter (CSO, Central Bank, MEEI,
// TTMS, World Bank, etc.) can replace `value`/`history`/`lastUpdated` without
// changing any rendering code — see ANALYTICS_STANDARD.md.
//
// Classification vocabulary (mandatory, see ANALYTICS_STANDARD.md §1):
//   Official | Sourced | FTN Derived | FTN Estimated | FTN Modelled | Demonstration

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
      classification: 'Demonstration',
      sourceName: 'FTN demonstration dataset',
      sourceUrl: '',
      sourceType: 'Demonstration',
      updateFrequency: 'Static (demo)',
      lastUpdated: '2026-07-01',
      methodology: 'Illustrative value chosen to be plausible in order of magnitude for Trinidad and Tobago; not derived from a live source.',
      confidence: 'Demonstration',
      sampleSize: '',
      timeCoverage: '',
      geoCoverage: 'National',
      limitations: 'Demonstration value — do not cite as an official statistic.',
      history: [],
      related: [],
      relatedNews: [],
      // Counter Engine metadata (see js/live-clocks.js) — how a live value is
      // computed is fully described here, independent of how it's displayed.
      calculationType: opts && opts.isLiveClock ? 'interpolated' : 'static',
      interpolationMethod: 'none',
      weightingMethod: 'none',
      preferredVisualization: 'stat',
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
    ind('gdp', 'National Economy', 'GDP (annual, estimated)', '28.4B', 'USD', {
      trend: 'up', changeLabel: '+1.8% y/y (demo)', history: spark(28, 12, 0.4, 0.05),
      methodology: 'Illustrative figure in the correct order of magnitude for a small energy-based economy; not a CSO/IMF figure.',
    }),
    ind('gdp-per-capita', 'National Economy', 'GDP per Capita', '18,900', 'USD', {
      trend: 'up', changeLabel: '+1.2% y/y (demo)', history: spark(19, 12, 0.2, 0.02),
    }),
    ind('debt-to-gdp', 'National Economy', 'Debt-to-GDP Ratio', '68.4', '%', {
      trend: 'up', changeLabel: '+0.6pp vs last quarter (demo)', status: 'watch',
      history: spark(67, 12, 0.3, 0.1), isLiveClock: true, clock: { kind: 'debt-to-gdp', baseValue: 68.4, ratePerSecond: 0.0000009 },
      methodology: 'FTN Modelled: demonstration ratio, interpolated between quarterly demo benchmarks using a constant assumed growth rate. Not an official ratio.',
      classification: 'FTN Modelled',
    }),
    ind('national-debt', 'National Economy', 'National Debt (estimated)', '19.4B', 'TTD', {
      trend: 'up', changeLabel: 'rising (demo)', isLiveClock: true,
      clock: { kind: 'currency', baseValue: 19400000000, ratePerSecond: 620 },
      classification: 'FTN Modelled',
      methodology: 'FTN Modelled: demonstration debt clock. Interpolates between a fixed benchmark and an assumed borrowing rate for visual effect — see Trust Card.',
    }),
    ind('debt-per-citizen', 'National Economy', 'Debt per Citizen (estimated)', '13,050', 'TTD', {
      trend: 'up', isLiveClock: true, clock: { kind: 'currency', baseValue: 13050, ratePerSecond: 0.0004 },
      classification: 'FTN Modelled',
    }),
    ind('inflation', 'National Economy', 'Inflation (headline)', '2.1', '%', { trend: 'flat', history: spark(2, 12, 0.15, 0) }),
    ind('food-inflation', 'National Economy', 'Food Inflation', '3.4', '%', { trend: 'up', status: 'watch', history: spark(3, 12, 0.2, 0.02) }),
    ind('unemployment', 'National Economy', 'Unemployment Rate', '4.9', '%', { trend: 'down', history: spark(5, 12, 0.15, -0.02) }),
    ind('exchange-rate', 'National Economy', 'Exchange Rate (TTD/USD)', '6.79', 'TTD', { trend: 'flat', history: spark(6.8, 12, 0.02, 0) }),
    ind('foreign-reserves', 'National Economy', 'Foreign Reserves', '5.6B', 'USD', { trend: 'down', status: 'watch', changeLabel: '-2.1% q/q (demo)' }),
    ind('budget-progress', 'National Economy', 'Budget-Year Progress', '54', '%', {
      trend: 'up', isLiveClock: true, clock: { kind: 'fiscal-year-progress', fiscalYearStartMonth: 9 },
      classification: 'FTN Derived', methodology: 'FTN Derived: calculated directly from the calendar position within the assumed fiscal year (Oct–Sep). Not an official budget-execution figure.',
    }),
    ind('trade-balance', 'National Economy', 'Trade Balance', '+612M', 'USD', { trend: 'up' })
  );

  // ---------------------------------------------------------------- Energy & Commodities
  indicators.push(
    ind('oil-price', 'Energy & Commodities', 'Oil Price (WTI, illustrative)', '78.40', 'USD/bbl', { trend: 'down', history: spark(78, 14, 1.2, -0.05) }),
    ind('gas-price', 'Energy & Commodities', 'Natural Gas Price (Henry Hub, illustrative)', '2.85', 'USD/MMBtu', { trend: 'up', history: spark(3, 14, 0.15, 0.01) }),
    ind('lng-price', 'Energy & Commodities', 'LNG Price (illustrative)', '11.20', 'USD/MMBtu', { trend: 'up' }),
    ind('energy-production', 'Energy & Commodities', 'Energy Production Index', '96', 'index (2020=100)', { trend: 'down', status: 'watch' }),
    ind('fuel-price', 'Energy & Commodities', 'Domestic Fuel Price (Super)', '4.13', 'TTD/L', { trend: 'flat' }),
    ind('renewable-share', 'Energy & Commodities', 'Renewable Energy Share', '2.6', '%', { trend: 'up', changeLabel: 'slowly rising (demo)' })
  );

  // ---------------------------------------------------------------- Population & Life
  indicators.push(
    ind('population', 'Population & Life', 'Estimated Population', '1,531,000', 'people', {
      trend: 'flat', isLiveClock: true, clock: { kind: 'population', baseValue: 1531000, birthsPerYear: 15500, deathsPerYear: 13200, netMigrationPerYear: -2600 },
      classification: 'FTN Modelled',
      methodology: 'FTN Modelled: interpolates between a fixed annual benchmark using assumed birth/death/migration rates. Demonstration only.',
    }),
    ind('births-today', 'Population & Life', 'Estimated Births Today', '42', 'people', {
      isLiveClock: true, clock: { kind: 'day-counter', perYear: 15500 }, classification: 'FTN Estimated',
    }),
    ind('deaths-today', 'Population & Life', 'Estimated Deaths Today', '36', 'people', {
      isLiveClock: true, clock: { kind: 'day-counter', perYear: 13200 }, classification: 'FTN Estimated',
    }),
    ind('net-migration', 'Population & Life', 'Estimated Net Migration (annual)', '-2,600', 'people/yr', { trend: 'down', classification: 'FTN Estimated' }),
    ind('households', 'Population & Life', 'Estimated Households', '441,000', 'households', { trend: 'up' }),
    ind('dependency-ratio', 'Population & Life', 'Dependency Ratio', '44.2', '%', { trend: 'up' }),
    ind('household-pressure', 'Population & Life', 'Household Financial Pressure Index', '58', 'index (0-100)', { trend: 'up', status: 'watch', history: spark(55, 12, 2, 0.3) }),
    ind('cost-of-living', 'Population & Life', 'Cost-of-Living Index', '112', 'index (2020=100)', { trend: 'up', history: spark(108, 12, 1, 0.4) })
  );

  // ---------------------------------------------------------------- Migration & Border Pressure
  indicators.push(
    ind('official-arrivals', 'Migration & Border Pressure', 'Official Arrivals (monthly)', '96,400', 'people', { trend: 'up' }),
    ind('official-departures', 'Migration & Border Pressure', 'Official Departures (monthly)', '94,100', 'people', { trend: 'up' }),
    ind('registered-migrants', 'Migration & Border Pressure', 'Registered Migrants (cumulative)', '18,500 – 24,000', 'people (range)', {
      classification: 'FTN Estimated', confidence: 'Low',
      methodology: 'Range reflects genuine uncertainty in a demonstration estimate — deliberately not presented as a single precise figure.',
      limitations: 'Wide range reflects the inherent difficulty of estimating undocumented population in any jurisdiction; treat as illustrative only.',
    }),
    ind('school-capacity-pressure', 'Migration & Border Pressure', 'School-Capacity Pressure Index', '61', 'index (0-100)', { trend: 'up', status: 'watch' }),
    ind('healthcare-demand-pressure', 'Migration & Border Pressure', 'Healthcare-Demand Pressure Index', '54', 'index (0-100)', { trend: 'flat' })
  );

  // ---------------------------------------------------------------- Infrastructure & Services
  indicators.push(
    ind('road-condition-reports', 'Infrastructure & Services', 'Open Road-Condition Reports', '1,204', 'reports', { trend: 'down' }),
    ind('active-road-projects', 'Infrastructure & Services', 'Active Road Projects', '38', 'projects', { trend: 'flat' }),
    ind('utility-outages', 'Infrastructure & Services', 'Active Utility Outages', '14', 'outages', { trend: 'down', status: 'watch' }),
    ind('water-disruptions', 'Infrastructure & Services', 'Water-Supply Disruptions', '9', 'areas affected', { trend: 'flat' }),
    ind('drainage-reports', 'Infrastructure & Services', 'Open Drainage Reports', '312', 'reports', { trend: 'up', status: 'watch' }),
    ind('flood-alerts', 'Infrastructure & Services', 'Active Flood Alerts', '2', 'alerts', { trend: 'flat', status: 'watch' }),
    ind('traffic-index', 'Infrastructure & Services', 'National Traffic Congestion Index', '63', 'index (0-100)', { trend: 'up', history: spark(58, 12, 3, 0.4) }),
    ind('infrastructure-pressure', 'Infrastructure & Services', 'Infrastructure Pressure Index', '57', 'index (0-100)', { trend: 'up', status: 'watch' })
  );

  // ---------------------------------------------------------------- Community
  indicators.push(
    ind('community-reports-total', 'Community', 'Community Connect Reports (total)', '24,851', 'reports', { trend: 'up', changeLabel: '+12% vs last month' }),
    ind('community-reports-verified', 'Community', 'Verified Reports', '1,275', 'reports', { trend: 'up' }),
    ind('community-reports-resolved', 'Community', 'Resolved Reports', '18,940', 'reports', { trend: 'up', changeLabel: '98% resolution rate' }),
    ind('community-participation', 'Community', 'Community Participation Index', '66', 'index (0-100)', { trend: 'up' }),
    ind('most-active-community', 'Community', 'Most Active Community (demo)', 'San Fernando', '', { trend: 'flat', classification: 'Demonstration' }),
    ind('service-reliability', 'Community', 'Service Reliability Index', '71', 'index (0-100)', { trend: 'flat' })
  );

  // ---------------------------------------------------------------- Weather & Environment
  indicators.push(
    ind('temperature', 'Weather & Environment', 'Current Temperature (Port of Spain, illustrative)', '30', '°C', { trend: 'flat' }),
    ind('rainfall', 'Weather & Environment', 'Rainfall (last 30 days)', '186', 'mm', { trend: 'up', status: 'watch' }),
    ind('uv-index', 'Weather & Environment', 'UV Index', '10', 'index', { trend: 'flat', status: 'watch' }),
    ind('hurricane-season-progress', 'Weather & Environment', 'Hurricane Season Progress', '41', '%', {
      trend: 'up', classification: 'FTN Derived',
      methodology: 'FTN Derived: calculated from the calendar position within the Jun 1 – Nov 30 Atlantic hurricane season.',
    }),
    ind('saharan-dust', 'Weather & Environment', 'Saharan Dust Concentration', 'Moderate', '', { trend: 'flat' }),
    ind('drought-index', 'Weather & Environment', 'Drought Index', '22', 'index (0-100)', { trend: 'down' }),
    ind('river-levels', 'Weather & Environment', 'River Levels (Caroni, illustrative)', 'Normal', '', { trend: 'flat' })
  );

  // ---------------------------------------------------------------- Tourism
  indicators.push(
    ind('visitor-arrivals', 'Tourism', 'Visitor Arrivals (monthly)', '38,400', 'visitors', { trend: 'up', history: spark(36, 12, 2, 0.3) }),
    ind('hotel-occupancy', 'Tourism', 'Hotel Occupancy', '64', '%', { trend: 'up' }),
    ind('tourism-receipts', 'Tourism', 'Tourism Receipts (monthly)', '142M', 'USD', { trend: 'up' }),
    ind('cruise-arrivals', 'Tourism', 'Cruise Arrivals (monthly)', '6,200', 'passengers', { trend: 'flat' }),
    ind('carnival-countdown', 'Tourism', 'Days to Carnival', '—', 'days', { isLiveClock: true, clock: { kind: 'countdown', month: 2, day: 17 }, classification: 'FTN Derived' })
  );

  // ---------------------------------------------------------------- Public Sector & National Life
  indicators.push(
    ind('parliamentary-activity', 'Public Sector & National Life', 'Bills Under Consideration', '11', 'bills', { trend: 'flat' }),
    ind('procurement-activity', 'Public Sector & National Life', 'Active Public Procurement Notices', '46', 'notices', { trend: 'up' }),
    ind('public-projects', 'Public Sector & National Life', 'Active Public Infrastructure Projects', '89', 'projects', { trend: 'flat' }),
    ind('school-term-progress', 'Public Sector & National Life', 'School-Term Progress', '—', '%', { isLiveClock: true, clock: { kind: 'term-progress' }, classification: 'FTN Derived' }),
    ind('independence-countdown', 'Public Sector & National Life', 'Days to Independence Day', '—', 'days', { isLiveClock: true, clock: { kind: 'countdown', month: 8, day: 31 }, classification: 'FTN Derived' }),
    ind('budget-countdown', 'Public Sector & National Life', 'Days to National Budget', '—', 'days', { isLiveClock: true, clock: { kind: 'countdown', month: 10, day: 1 }, classification: 'FTN Derived' })
  );

  // ---------------------------------------------------------------- International Context
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

  global.FTN = global.FTN || {};
  global.FTN.CATEGORIES = CATEGORIES;
  global.FTN.indicators = indicators;
  global.FTN.getIndicator = function (id) {
    for (var i = 0; i < indicators.length; i++) {
      if (indicators[i].id === id) return indicators[i];
    }
    return null;
  };
})(window);
