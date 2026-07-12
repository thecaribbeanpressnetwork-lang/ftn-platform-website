// FTN Platform Website — Insights page.
//
// Reuses the same Reality Insights and Relationship Engine data FTN Live
// already runs, presented for reading instead of a live glance -- no new
// data, no invented statistics. Patterns pulls from FTN.RealityInsights
// (the same pool FTN Live's "The Nation Is Speaking" rotator draws from);
// Connections is a fixed, curated set of relationships chosen because both
// endpoints resolve to real indicators with working Trust Cards, so every
// card here is genuinely explorable, not just illustrative text.
(function (global) {
  'use strict';

  function renderPatterns() {
    var mount = document.getElementById('patterns-mount');
    if (!mount || !global.FTN || !global.FTN.RealityInsights) return;
    var pool = global.FTN.RealityInsights.generate();
    if (!pool.length) { mount.innerHTML = '<p class="u-text-graphite">No patterns to surface right now.</p>'; return; }

    // One per category, not just the first four -- the generated pool skews
    // toward whichever category happens to have the most flagged movement,
    // and a "Patterns" section is more useful showing breadth than depth.
    var seenCategories = {};
    var diverse = [];
    pool.forEach(function (insight) {
      if (diverse.length >= 4 || seenCategories[insight.category]) return;
      seenCategories[insight.category] = true;
      diverse.push(insight);
    });
    if (diverse.length < 4) {
      pool.forEach(function (insight) {
        if (diverse.length >= 4 || diverse.indexOf(insight) !== -1) return;
        diverse.push(insight);
      });
    }

    mount.innerHTML = diverse.map(function (insight) {
      var link = insight.supportedBy && insight.supportedBy[0]
        ? '<button type="button" class="trust-trigger" data-trust-card="' + insight.supportedBy[0] + '">View evidence</button>'
        : '';
      return '<div class="module-card">' +
        '<p class="u-text-sm u-text-graphite">' + insight.category + '</p>' +
        '<h3>' + insight.text + '</h3>' +
        (link ? '<p class="u-mt-8">' + link + '</p>' : '') +
      '</div>';
    }).join('');
  }

  // Curated, not random -- chosen because both endpoints resolve to real
  // indicators, so every card is genuinely explorable via a real Trust Card.
  var FEATURED_RELATIONSHIPS = ['rainfall-flooding', 'cost-of-living-household-pressure', 'inflation-food-inflation'];

  function renderConnections() {
    var mount = document.getElementById('connections-mount');
    if (!mount || !global.FTN || !global.FTN.Relationships) return;
    var all = global.FTN.Relationships.all || [];
    var featured = FEATURED_RELATIONSHIPS
      .map(function (id) { return all.filter(function (r) { return r.id === id; })[0]; })
      .filter(Boolean);
    if (!featured.length) { mount.innerHTML = ''; return; }

    mount.innerHTML = featured.map(function (r) {
      var dirWord = r.direction === 'positive' ? 'rises with' : 'falls as';
      var glyph = global.FTN.Charts ? global.FTN.Charts.trendGlyph(r.direction === 'positive' ? 'up' : 'down') : '';
      var fromBtn = r.fromIndicatorId
        ? '<button type="button" class="trust-trigger" data-trust-card="' + r.fromIndicatorId + '">' + r.fromLabel + '</button>'
        : '<span>' + r.fromLabel + '</span>';
      var toBtn = r.toIndicatorId
        ? '<button type="button" class="trust-trigger" data-trust-card="' + r.toIndicatorId + '">' + r.toLabel + '</button>'
        : '<span>' + r.toLabel + '</span>';
      return '<div class="module-card">' +
        '<p class="u-text-sm u-text-graphite">' + r.confidence + ' confidence &middot; ' + r.type + '</p>' +
        '<h3>' + glyph + ' ' + r.toLabel + ' ' + dirWord + ' ' + r.fromLabel + '</h3>' +
        '<p class="u-mt-8">' + fromBtn + ' &rarr; ' + toBtn + '</p>' +
      '</div>';
    }).join('');
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    renderPatterns();
    renderConnections();
    if (global.FTN.WhatChanged) global.FTN.WhatChanged.render('what-changed-mount');
  });
})(window);
