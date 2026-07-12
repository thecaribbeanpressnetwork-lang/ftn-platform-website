// FTN Platform Website — shared Relationship Engine.
//
// Generalized out of what was originally Mission Control-only correlation
// data (Phase 3) so Observatory, Trust Cards, and Mission Control all read
// the same registry — one source of truth for "what connects to what,"
// not three copies drifting apart. mission-control-data.js now just aliases
// MC.correlations to this file for backward compatibility with the existing
// Correlation Engine / Reality Graph rendering code.
//
// Where a relationship's endpoint corresponds to a real entry in
// js/indicators-data.js, fromIndicatorId/toIndicatorId link to it — that's
// what powers "what influences this / what this influences" on Trust Cards
// and the Random Relationship discovery feature. An endpoint with no
// matching indicator (e.g. "Travel Time", which isn't tracked as its own
// indicator) correctly has a null id rather than a fabricated link.
(function (global) {
  'use strict';

  var relationships = [
    {
      id: 'roads-travel-time', title: 'Road Condition ↔ Travel Time', type: 'correlation',
      fromIndicatorId: 'road-condition-reports', fromLabel: 'Road Condition', toIndicatorId: null, toLabel: 'Travel Time',
      direction: 'negative', strength: 0.71, confidence: 'Medium',
      classification: 'Demonstration', sampleSize: '1,204 road reports', timeCoverage: '24 months', geoCoverage: 'National',
      methodology: 'Illustrative weighted correlation between reported road-condition scores and average travel-time change on the same corridors.',
      limitations: 'Demonstration relationship — correlation does not establish causation; other factors (traffic volume, weather) are not isolated here.',
      value: '-0.71', units: 'correlation coefficient',
    },
    {
      id: 'rainfall-flooding', title: 'Rainfall ↔ Flood Reports', type: 'correlation',
      fromIndicatorId: 'rainfall', fromLabel: 'Rainfall', toIndicatorId: 'flood-alerts', toLabel: 'Flood Alerts',
      direction: 'positive', strength: 0.82, confidence: 'High',
      classification: 'Demonstration', sampleSize: '36 months rainfall vs. reports', timeCoverage: '3 years', geoCoverage: 'National',
      methodology: 'Illustrative correlation between 30-day rainfall totals and flood-related community reports.',
      limitations: 'Demonstration only — drainage capacity and land use are confounding variables not modelled here.',
      value: '+0.82', units: 'correlation coefficient',
    },
    {
      id: 'flooding-school-attendance', title: 'Flood Reports ↔ School Attendance', type: 'correlation',
      fromIndicatorId: 'flood-alerts', fromLabel: 'Flood Alerts', toIndicatorId: null, toLabel: 'School Attendance',
      direction: 'negative', strength: 0.48, confidence: 'Medium',
      classification: 'Demonstration', sampleSize: '18 months', timeCoverage: '18 months', geoCoverage: 'Regional',
      methodology: 'Illustrative lagged correlation (2-day lag) between flood reports and next-day school attendance.',
      limitations: 'Weaker relationship — plausibly mediated by road access rather than a direct link.',
      value: '-0.48', units: 'correlation coefficient',
    },
    {
      id: 'unemployment-household-pressure', title: 'Unemployment ↔ Household Pressure', type: 'influence',
      fromIndicatorId: 'unemployment', fromLabel: 'Unemployment', toIndicatorId: 'household-pressure', toLabel: 'Household Financial Pressure',
      direction: 'positive', strength: 0.66, confidence: 'Medium',
      classification: 'Demonstration', sampleSize: 'National quarterly series', timeCoverage: '5 years', geoCoverage: 'National',
      methodology: 'Illustrative correlation between unemployment rate and the household financial pressure index.',
      limitations: 'Demonstration — inflation and cost-of-living are likely co-contributors, not separated out here.',
      value: '+0.66', units: 'correlation coefficient',
    },
    {
      id: 'fuel-price-business-cost', title: 'Fuel Price ↔ Business Operating Cost', type: 'correlation',
      fromIndicatorId: 'fuel-price', fromLabel: 'Fuel Price', toIndicatorId: null, toLabel: 'Business Operating Cost',
      direction: 'positive', strength: 0.58, confidence: 'Medium',
      classification: 'Demonstration', sampleSize: 'Business survey sample', timeCoverage: '2 years', geoCoverage: 'National',
      methodology: 'Illustrative correlation between domestic fuel price changes and reported small-business operating cost changes.',
      limitations: 'Demonstration — sample skews toward transport-dependent businesses.',
      value: '+0.58', units: 'correlation coefficient',
    },
    {
      id: 'tourism-employment', title: 'Tourism Receipts ↔ Regional Employment', type: 'correlation',
      fromIndicatorId: 'tourism-receipts', fromLabel: 'Tourism Receipts', toIndicatorId: null, toLabel: 'Regional Employment',
      direction: 'positive', strength: 0.54, confidence: 'Low',
      classification: 'Demonstration', sampleSize: 'Limited regional sample', timeCoverage: '2 years', geoCoverage: 'Tobago',
      methodology: 'Illustrative correlation between monthly tourism receipts and regional employment figures.',
      limitations: 'Low confidence — small sample size and strong seasonality not fully adjusted for in this demonstration.',
      value: '+0.54', units: 'correlation coefficient',
    },
    {
      id: 'cost-of-living-household-pressure', title: 'Cost of Living ↔ Household Pressure', type: 'dependency',
      fromIndicatorId: 'cost-of-living', fromLabel: 'Cost-of-Living Index', toIndicatorId: 'household-pressure', toLabel: 'Household Financial Pressure',
      direction: 'positive', strength: 0.74, confidence: 'Medium',
      classification: 'FTN Derived', sampleSize: 'Component of the composite index', timeCoverage: 'Ongoing', geoCoverage: 'National',
      methodology: 'Household Financial Pressure is FTN Derived directly from the Cost-of-Living Index alongside unemployment and fuel price — this is a component relationship, not an independently measured correlation.',
      limitations: 'Direction of dependency, not an external correlation — see Household Financial Pressure Index methodology.',
      value: 'component', units: '',
    },
    {
      id: 'inflation-food-inflation', title: 'Headline Inflation ↔ Food Inflation', type: 'parent-child',
      fromIndicatorId: 'inflation', fromLabel: 'Inflation (headline)', toIndicatorId: 'food-inflation', toLabel: 'Food Inflation',
      direction: 'positive', strength: 0.88, confidence: 'High',
      classification: 'Demonstration', sampleSize: 'RPI basket component', timeCoverage: 'Ongoing', geoCoverage: 'National',
      methodology: 'Food Inflation is a basket component of headline RPI Inflation — a parent/child relationship by construction, not an independently observed correlation.',
      limitations: 'Illustrative — actual basket weighting not modelled in this demonstration.',
      value: 'component', units: '',
    },
  ];

  global.FTN = global.FTN || {};
  if (global.FTN.DataSource) global.FTN.DataSource.register('relationships', 'presentation', relationships);
  var active = global.FTN.DataSource ? global.FTN.DataSource.resolve('relationships') : relationships;

  function get(id) {
    for (var i = 0; i < active.length; i++) {
      if (active[i].id === id) return active[i];
    }
    return null;
  }

  // Every relationship touching a given indicator, in either direction —
  // this is what Trust Cards use for "what influences it / what it influences."
  function forIndicator(indicatorId) {
    return active.filter(function (r) {
      return r.fromIndicatorId === indicatorId || r.toIndicatorId === indicatorId;
    });
  }

  function random() {
    return active[Math.floor(Math.random() * active.length)];
  }

  global.FTN.Relationships = { all: active, get: get, forIndicator: forIndicator, random: random };
})(window);
