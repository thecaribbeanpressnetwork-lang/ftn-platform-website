// FTN Platform Website — reusable Community Profile data shape (Phase 4).
//
// Founder direction: "build reusable frameworks rather than individual
// pages." This defines the shape every community profile will eventually
// have and ships exactly one demo instance — San Fernando, since it's
// already referenced as the "Most Active Community" demonstration value in
// js/indicators-data.js. This is not Community Connect data (a separate
// application/repository this project must never touch) — it's FTN
// Platform's own illustrative shape for how a community's public profile
// could be composed on FTN Live, once real Community Connect data is
// available to populate it.
(function (global) {
  'use strict';

  function profile(fields) {
    return Object.assign({
      overview: '', history: '', population: null, reportsTotal: null, reportsResolved: null,
      positiveStories: [], improvements: [], landmarks: [], schools: [], facilities: [], businesses: [],
      classification: 'Demonstration',
    }, fields);
  }

  var profiles = {
    'san-fernando': profile({
      name: 'San Fernando',
      overview: 'Trinidad’s second city, on the west coast south of Port of Spain — an industrial and commercial hub for the south of the island.',
      history: 'Historically the commercial centre for the sugar and later energy industries in south Trinidad.',
      population: 48000,
      reportsTotal: 4210,
      reportsResolved: 3940,
      positiveStories: ['Community-led cleanup of the San Fernando Hill recreation area (demo)', 'Local drainage report led to a culvert repair within 3 weeks (demo)'],
      improvements: ['Repaved sections of Coffee Street (demo)', 'New streetlighting on Harris Promenade (demo)'],
      landmarks: ['San Fernando Hill', 'Harris Promenade', 'King’s Wharf'],
      schools: ['Naparima College (demo listing)', 'St. Joseph’s Convent (demo listing)'],
      facilities: ['San Fernando General Hospital (demo listing)'],
      businesses: ['Central Market (demo listing)'],
    }),
  };

  global.FTN = global.FTN || {};
  global.FTN.CommunityProfiles = profiles;
})(window);
