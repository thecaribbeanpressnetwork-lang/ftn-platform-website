// FTN Platform Website — Mission Control Interactive Demonstration data.
// Everything here is scripted demonstration content for a public-facing
// preview of Mission Control. It is not the secure production application,
// not real government data, and not a live AI system. See CLAUDE.md and
// ANALYTICS_STANDARD.md for the rules this demo is built to respect.
(function (global) {
  'use strict';

  var MC = {};

  // ---------------------------------------------------------------- Executive Dashboard
  // Small illustrative multipliers so the region selector visibly changes
  // something, rather than being decorative.
  MC.regionMultipliers = {
    'National': 1.0,
    'Port of Spain': 1.15,
    'San Fernando': 0.95,
    'Chaguanas': 1.05,
    'Arima': 0.9,
    'Tobago': 0.8,
  };

  MC.executiveKPIs = [
    { id: 'active-events', title: 'Active Events', base: 6, units: 'events', trend: 'flat' },
    { id: 'infrastructure-pressure', title: 'Infrastructure Pressure', base: 57, units: 'index (0-100)', trend: 'up', status: 'watch' },
    { id: 'household-pressure', title: 'Household Pressure', base: 58, units: 'index (0-100)', trend: 'up', status: 'watch' },
    { id: 'service-reliability', title: 'Service Reliability', base: 71, units: 'index (0-100)', trend: 'flat' },
    { id: 'community-participation', title: 'Community Participation', base: 66, units: 'index (0-100)', trend: 'up' },
    { id: 'agency-workload', title: 'Agency Workload', base: 64, units: 'index (0-100)', trend: 'up' },
    { id: 'evidence-quality', title: 'Evidence Quality', base: 78, units: 'index (0-100)', trend: 'flat' },
    { id: 'improving-indicators', title: 'Improving Indicators', base: 14, units: 'of 42 tracked', trend: 'up' },
    { id: 'deteriorating-indicators', title: 'Deteriorating Indicators', base: 9, units: 'of 42 tracked', trend: 'down', status: 'watch' },
  ];

  // ---------------------------------------------------------------- Correlation Engine
  // Phase 4: this used to be the only copy of this data. It now lives in
  // js/relationships-data.js as the shared Relationship Engine (Observatory,
  // Trust Cards, and Mission Control all read the same registry) — aliased
  // here so the existing Correlation Engine / Reality Graph rendering code
  // in mission-control-demo.js needs no changes.
  MC.correlations = global.FTN.Relationships ? global.FTN.Relationships.all : [];

  // ---------------------------------------------------------------- Reality Graph
  MC.graphNodes = [
    { id: 'road-quality', label: 'Road Quality', category: 'Infrastructure', x: 80, y: 60 },
    { id: 'travel-time', label: 'Travel Time', category: 'Infrastructure', x: 240, y: 60 },
    { id: 'delivery-reliability', label: 'Delivery Reliability', category: 'Economy', x: 400, y: 60 },
    { id: 'business-cost', label: 'Business Operating Cost', category: 'Economy', x: 400, y: 160 },
    { id: 'employment', label: 'Employment', category: 'Economy', x: 240, y: 220 },
    { id: 'household-pressure-node', label: 'Household Financial Pressure', category: 'Community', x: 80, y: 220 },
    { id: 'health-wellbeing', label: 'Health & Wellbeing', category: 'Community', x: 80, y: 320 },
    { id: 'rainfall-node', label: 'Rainfall', category: 'Weather', x: 560, y: 60 },
    { id: 'flooding-node', label: 'Flooding', category: 'Weather', x: 560, y: 160 },
    { id: 'road-access', label: 'Road Access', category: 'Infrastructure', x: 560, y: 260 },
    { id: 'school-attendance', label: 'School Attendance', category: 'Community', x: 420, y: 320 },
    { id: 'work-attendance', label: 'Work Attendance', category: 'Economy', x: 260, y: 340 },
    { id: 'economic-output', label: 'Economic Output', category: 'Economy', x: 100, y: 400 },
  ];

  MC.graphEdges = [
    { from: 'road-quality', to: 'travel-time', sign: 'negative' },
    { from: 'travel-time', to: 'delivery-reliability', sign: 'negative' },
    { from: 'delivery-reliability', to: 'business-cost', sign: 'negative' },
    { from: 'business-cost', to: 'employment', sign: 'negative' },
    { from: 'employment', to: 'household-pressure-node', sign: 'negative' },
    { from: 'household-pressure-node', to: 'health-wellbeing', sign: 'negative' },
    { from: 'rainfall-node', to: 'flooding-node', sign: 'positive' },
    { from: 'flooding-node', to: 'road-access', sign: 'negative' },
    { from: 'road-access', to: 'school-attendance', sign: 'negative' },
    { from: 'road-access', to: 'work-attendance', sign: 'negative' },
    { from: 'school-attendance', to: 'economic-output', sign: 'negative' },
    { from: 'work-attendance', to: 'economic-output', sign: 'negative' },
  ];

  // ---------------------------------------------------------------- Scenario Studio
  MC.scenarioVariables = [
    { id: 'road-investment', label: 'Road Investment', min: -50, max: 50, step: 5, default: 0, unit: '%' },
    { id: 'drainage-investment', label: 'Drainage Investment', min: -50, max: 50, step: 5, default: 0, unit: '%' },
    { id: 'rainfall', label: 'Rainfall (vs. seasonal norm)', min: -50, max: 50, step: 5, default: 0, unit: '%' },
    { id: 'fuel-prices', label: 'Fuel Prices', min: -30, max: 30, step: 5, default: 0, unit: '%' },
    { id: 'unemployment-var', label: 'Unemployment', min: -30, max: 30, step: 5, default: 0, unit: '%' },
    { id: 'tourism-var', label: 'Tourism Activity', min: -30, max: 30, step: 5, default: 0, unit: '%' },
    { id: 'public-transport', label: 'Public Transport Investment', min: -50, max: 50, step: 5, default: 0, unit: '%' },
  ];

  // Simple illustrative linear weights: outcome = sum(variable * weight).
  // Deliberately simple — the point is to demonstrate the interaction model,
  // not to be a real economic model.
  MC.scenarioOutcomes = [
    {
      id: 'travel-time-change', title: 'Projected Travel Time',
      weights: { 'road-investment': -0.6, 'rainfall': 0.3, 'public-transport': -0.2 },
    },
    {
      id: 'business-cost-change', title: 'Projected Business Operating Cost',
      weights: { 'road-investment': -0.3, 'fuel-prices': 0.5, 'drainage-investment': -0.1 },
    },
    {
      id: 'employment-change', title: 'Projected Employment Impact',
      weights: { 'tourism-var': 0.4, 'road-investment': 0.2, 'unemployment-var': -0.5 },
    },
    {
      id: 'household-pressure-change', title: 'Projected Household Pressure',
      weights: { 'fuel-prices': 0.4, 'unemployment-var': 0.4, 'public-transport': -0.15, 'drainage-investment': -0.1 },
    },
    {
      id: 'flood-risk-change', title: 'Projected Flood Risk',
      weights: { 'rainfall': 0.6, 'drainage-investment': -0.5 },
    },
  ];

  // ---------------------------------------------------------------- Evidence Explorer
  MC.evidenceChains = {
    'infrastructure-pressure': {
      title: 'Infrastructure Pressure Index',
      sourceRecords: '1,204 open road-condition reports, 312 drainage reports (demo)',
      communityObservations: '412 photo-verified community reports in the last 30 days (demo)',
      newsEvents: ['Drainage upgrade programme expands to three more communities (demo)'],
      historicalEvents: ['2024 Q3: Major culvert replacement programme completed in 6 communities (demo)'],
      methodology: 'Weighted index combining open report volume, average report age, and verified-resolution rate.',
    },
    'household-pressure': {
      title: 'Household Financial Pressure Index',
      sourceRecords: 'Cost-of-living index, unemployment rate, fuel price series (demo)',
      communityObservations: 'Not directly observed — derived from economic indicators (demo)',
      newsEvents: ['Central Bank holds policy rate steady amid regional pressures (demo)'],
      historicalEvents: ['2025 Q1: Fuel subsidy adjustment (demo)'],
      methodology: 'Composite index normalizing cost-of-living, unemployment, and fuel-price trends against a 2020 baseline.',
    },
    'community-participation': {
      title: 'Community Participation Index',
      sourceRecords: 'Community Connect report and follow activity (demo)',
      communityObservations: '24,851 total reports, 1,275 verified, 66 index score (demo)',
      newsEvents: ['Most-active-community recognition programme launches (demo)'],
      historicalEvents: ['2025: Community Connect crosses 20,000 cumulative reports (demo)'],
      methodology: 'Derived from report volume per capita, follow-through rate, and repeat engagement.',
    },
    'service-reliability': {
      title: 'Service Reliability Index',
      sourceRecords: 'Utility outage logs, water-supply disruption reports (demo)',
      communityObservations: '9 areas with active water-supply disruptions (demo)',
      newsEvents: ['Utility provider announces maintenance schedule (demo)'],
      historicalEvents: ['2024: Major grid resilience upgrade (demo)'],
      methodology: 'Weighted average of outage frequency, outage duration, and restoration-time trends.',
    },
  };

  // ---------------------------------------------------------------- Strategic Advisor
  MC.advisorScripts = {
    flooding: {
      situationSummary: 'Flood-related community reports have risen in the areas selected, correlating with above-normal rainfall and open drainage-maintenance backlogs (demonstration correlation: +0.82).',
      evidence: 'Reality Graph: Rainfall → Flooding → Road Access → School/Work Attendance → Economic Output.',
      historicalPatterns: 'Demonstration pattern: past drainage-investment increases in comparable areas preceded a measurable reduction in flood reports within 2–3 quarters.',
      contributingFactors: ['Above-normal rainfall (demo)', 'Open drainage-maintenance backlog (demo)', 'Aging culvert infrastructure in older districts (demo)'],
      options: [
        { name: 'Option A — Targeted Drainage Investment', summary: 'Prioritize drainage maintenance in the highest-report areas first.', tradeoffs: 'Faster localized relief; does not address national backlog.', confidence: 'Medium' },
        { name: 'Option B — National Drainage Programme', summary: 'Broad, phased national drainage upgrade.', tradeoffs: 'Larger long-term benefit; slower to show local results, higher cost.', confidence: 'Medium' },
        { name: 'Option C — Early-Warning + Response Focus', summary: 'Invest in flood alerts and rapid response rather than infrastructure first.', tradeoffs: 'Lower upfront cost; does not reduce underlying flood risk.', confidence: 'Low' },
      ],
      monitoringIndicators: ['Open drainage reports', 'Flood alerts issued', 'School attendance in affected areas'],
      missingInformation: ['Culvert-by-culvert condition assessment (not available in this demo)', 'Insurance claims data (not integrated)'],
    },
    employment: {
      situationSummary: 'Household financial pressure is trending up alongside unemployment in the areas selected (demonstration correlation: +0.66).',
      evidence: 'Reality Graph: Employment → Household Financial Pressure → Health & Wellbeing.',
      historicalPatterns: 'Demonstration pattern: tourism-linked employment initiatives in comparable areas showed measurable regional employment gains within 2–4 quarters.',
      contributingFactors: ['Softer tourism season (demo)', 'Rising fuel and transport costs (demo)', 'Limited public transport access to employment centers (demo)'],
      options: [
        { name: 'Option A — Tourism Activity Support', summary: 'Targeted support for tourism-linked employment.', tradeoffs: 'Faster regional impact; concentrated in tourism-dependent areas.', confidence: 'Medium' },
        { name: 'Option B — Public Transport Investment', summary: 'Improve access between residential areas and employment centers.', tradeoffs: 'Broader benefit; longer lead time.', confidence: 'Medium' },
        { name: 'Option C — Direct Household Support', summary: 'Direct relief for household financial pressure.', tradeoffs: 'Immediate relief; does not address underlying employment gap.', confidence: 'Low' },
      ],
      monitoringIndicators: ['Unemployment rate', 'Household financial pressure index', 'Tourism receipts'],
      missingInformation: ['Sector-level employment breakdown (not available in this demo)'],
    },
    healthcare: {
      situationSummary: 'Healthcare-demand pressure is elevated in the areas selected, plausibly linked to migration-related population change (demonstration estimate).',
      evidence: 'Reality Graph: (external) Migration → Healthcare-Demand Pressure.',
      historicalPatterns: 'Demonstration pattern: capacity investments in comparable facilities reduced average wait times within 1–2 years.',
      contributingFactors: ['Population growth in the selected area (demo)', 'Aging facility infrastructure (demo)'],
      options: [
        { name: 'Option A — Facility Capacity Expansion', summary: 'Expand capacity at the most-pressured facilities.', tradeoffs: 'High cost; durable long-term relief.', confidence: 'Medium' },
        { name: 'Option B — Staffing &amp; Scheduling Optimization', summary: 'Optimize staffing and scheduling before capital investment.', tradeoffs: 'Lower cost; smaller impact ceiling.', confidence: 'Medium' },
        { name: 'Option C — Community Health Outreach', summary: 'Shift pressure upstream via preventive outreach.', tradeoffs: 'Long-term benefit; slow to show measurable results.', confidence: 'Low' },
      ],
      monitoringIndicators: ['Healthcare-demand pressure index', 'Facility wait times (not integrated in this demo)'],
      missingInformation: ['Facility-level capacity data (not available in this demo)'],
    },
    attendance: {
      situationSummary: 'School attendance in the areas selected is sensitive to road access disruptions, particularly following flood events (demonstration correlation: -0.48).',
      evidence: 'Reality Graph: Flooding → Road Access → School Attendance → Economic Output.',
      historicalPatterns: 'Demonstration pattern: road-access improvements in comparable districts preceded measurable attendance recovery within one term.',
      contributingFactors: ['Recurring flood-related road closures (demo)', 'Limited alternate routes in affected districts (demo)'],
      options: [
        { name: 'Option A — Road Access Resilience', summary: 'Prioritize resilience upgrades on school-access routes.', tradeoffs: 'Directly targets the mechanism; higher cost.', confidence: 'Medium' },
        { name: 'Option B — Transport Support', summary: 'Provide alternate transport during disruption events.', tradeoffs: 'Lower cost; addresses symptom, not cause.', confidence: 'Medium' },
        { name: 'Option C — Remote-Learning Contingency', summary: 'Build remote-learning contingency for disruption days.', tradeoffs: 'Low cost; uneven effectiveness across households.', confidence: 'Low' },
      ],
      monitoringIndicators: ['School attendance rate', 'Flood-related road closures', 'Road-access index'],
      missingInformation: ['Household-level connectivity data for remote-learning feasibility (not available in this demo)'],
    },
  };

  // ---------------------------------------------------------------- Timeline & Institutional Memory
  MC.timeline = [
    { date: '2024-03', category: 'Infrastructure', event: 'Major culvert replacement programme begins in 6 communities (demo).', intervention: 'Drainage capital investment', expected: 'Reduce flood reports by ~20% in affected areas within 2 quarters', observed: 'Flood reports fell ~17% in affected areas over the following 2 quarters', assessment: 'Close to expected — treated as a partial confirmation, not a full validation.' },
    { date: '2024-07', category: 'Weather', event: 'Above-normal rainfall season recorded nationally (demo).', intervention: 'None (external event)', expected: 'n/a', observed: 'Flood reports rose 34% nationally over the season', assessment: 'Logged as context for later interventions, not attributed to any single cause.' },
    { date: '2024-11', category: 'Economy', event: 'Regional tourism support initiative launched in Tobago (demo).', intervention: 'Tourism activity support', expected: 'Measurable regional employment gain within 2-4 quarters', observed: 'Regional employment rose modestly; attribution uncertain given seasonal effects', assessment: 'Inconclusive — flagged for a longer observation window before drawing conclusions.' },
    { date: '2025-02', category: 'Community', event: 'Community Connect crosses 20,000 cumulative reports (demo).', intervention: 'n/a', expected: 'n/a', observed: 'Verified-report rate improved alongside volume growth', assessment: 'Positive signal for data quality as adoption grows.' },
    { date: '2025-06', category: 'Infrastructure', event: 'National drainage programme Phase 1 approved (demo).', intervention: 'Drainage capital investment (national)', expected: 'Reduce national flood-report growth rate by ~15% over 3 years', observed: 'Too early to assess', assessment: 'Actively monitored — added to Decision Journal for future review.' },
  ];

  // ---------------------------------------------------------------- External Influence Monitor
  MC.externalFactors = [
    { id: 'venezuela', title: 'Venezuela', summary: 'Regional political and economic conditions affecting cross-border migration and energy cooperation.', connects: ['Net migration', 'Healthcare-demand pressure', 'School-capacity pressure'] },
    { id: 'guyana', title: 'Guyana', summary: 'Rapid energy-sector growth affecting regional labour markets and investment flows.', connects: ['Labour market', 'Regional investment'] },
    { id: 'caricom', title: 'CARICOM', summary: 'Regional trade and mobility agreements affecting trade balance and migration.', connects: ['Trade balance', 'Regional exchange volatility'] },
    { id: 'us-trade', title: 'US Trade Policy', summary: 'Tariff and trade-policy shifts affecting import costs and export competitiveness.', connects: ['Import costs', 'Trade balance'] },
    { id: 'china-trade', title: 'Chinese Trade &amp; Investment', summary: 'Infrastructure investment and manufacturing trade affecting construction costs and imports.', connects: ['Infrastructure projects', 'Import costs'] },
    { id: 'oil-gas-prices', title: 'Oil &amp; Gas Prices', summary: 'Global energy prices affecting government revenue and fuel costs directly.', connects: ['Government revenue', 'Fuel price', 'National debt'] },
    { id: 'hurricanes', title: 'Hurricanes &amp; Tropical Systems', summary: 'Seasonal storm activity affecting infrastructure, agriculture, and insurance costs.', connects: ['Infrastructure pressure', 'Agriculture', 'Insurance costs'] },
    { id: 'el-nino', title: 'El Niño / La Niña', summary: 'Multi-year climate cycles affecting rainfall patterns and drought risk.', connects: ['Rainfall', 'Drought index', 'Agriculture'] },
    { id: 'global-inflation', title: 'Global Inflation', summary: 'International price pressures passing through to import costs and household expenses.', connects: ['Food inflation', 'Cost-of-living index'] },
    { id: 'interest-rates', title: 'US Interest Rates', summary: 'US monetary policy affecting regional borrowing costs and currency stability.', connects: ['Exchange rate', 'National debt servicing cost'] },
  ];

  global.FTN = global.FTN || {};
  if (global.FTN.DataSource) global.FTN.DataSource.register('mission-control', 'presentation', MC);
  global.FTN.MC = global.FTN.DataSource ? global.FTN.DataSource.resolve('mission-control') : MC;
})(window);
