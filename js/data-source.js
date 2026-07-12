// FTN Platform Website — Data Source resolver.
//
// The seam a future production engine plugs into. Every shared registry (js/indicators-data.js,
// js/relationships-data.js, js/mission-control-data.js) registers its dataset here under a
// 'presentation' tier, then resolves the same key straight back into global.FTN.indicators /
// global.FTN.Relationships / global.FTN.MC as before — no rendering code anywhere in the site
// changes shape. When a real production engine exists, it registers a 'live' tier under the
// same key; Live Mode then resolves to that tier automatically and Presentation Mode continues
// resolving to the presentation tier. Until that engine exists, no 'live' tier is ever
// registered, so both modes correctly resolve to the same presentation data — an honest
// starting state, not a simulation of a live feed (see CLAUDE.md §7.8).
(function (global) {
  'use strict';

  var registry = {};

  function register(key, tier, data) {
    registry[key] = registry[key] || {};
    registry[key][tier] = data;
  }

  function resolve(key) {
    var entry = registry[key];
    if (!entry) return undefined;
    var mode = (global.FTN && global.FTN.PlatformMode) ? global.FTN.PlatformMode.get() : 'live';
    if (mode === 'live' && entry.live) return entry.live;
    return entry.presentation || entry.live;
  }

  global.FTN = global.FTN || {};
  global.FTN.DataSource = { register: register, resolve: resolve };
})(window);
