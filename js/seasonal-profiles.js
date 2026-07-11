// FTN Platform Website — Seasonal weighting profiles (structured placeholder).
//
// Phase 3.5 founder direction §16: prepare, do not overbuild. Every profile
// below is a named slot with a neutral multiplier — no seasonal model is
// actually applied to any indicator yet (every ind() in indicators-data.js
// has seasonalProfile: null). Wiring one in later means setting that field
// to a key below; it does not require touching this file's shape again.
(function (global) {
  'use strict';

  function profile(label) {
    return { label: label, multiplier: 1.0, status: 'not yet implemented' };
  }

  var profiles = {
    weekday: profile('Weekday'),
    weekend: profile('Weekend'),
    payday: profile('Payday'),
    'month-end': profile('Month-End'),
    carnival: profile('Carnival'),
    christmas: profile('Christmas'),
    divali: profile('Divali'),
    easter: profile('Easter'),
    'school-term': profile('School Term'),
    'school-vacation': profile('School Vacation'),
    'wet-season': profile('Wet Season'),
    'dry-season': profile('Dry Season'),
    'hurricane-season': profile('Hurricane Season'),
    'major-sporting-event': profile('Major Sporting Event'),
    'major-concert': profile('Major Concert'),
    'election-period': profile('Election Period'),
    'public-holiday': profile('Public Holiday'),
    'emergency-period': profile('Emergency Period'),
  };

  global.FTN = global.FTN || {};
  global.FTN.SeasonalProfiles = profiles;
})(window);
