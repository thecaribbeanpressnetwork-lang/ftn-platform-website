// FTN Platform Website — "What Changed?" comparison panel.
//
// Deliberately does NOT invent day-over-day/week-over-week/month-over-month/
// year-over-year figures the registry doesn't actually have — the demo data
// is a single current value plus a 12-point illustrative sparkline, not
// genuinely distinct daily/weekly buckets. Instead, this surfaces the real
// period comparisons indicators already disclose in `changeLabel` (y/y, q/q,
// "vs last month", etc.), grouped by the period actually stated, sorted by
// magnitude, and filtered to changes worth showing. When indicators gain
// real distinct time-bucketed history, this is where day/week/month/year
// tabs would plug in — the grouping structure already anticipates that.
(function (global) {
  'use strict';

  var PERIOD_PATTERNS = [
    { key: 'Year over Year', re: /y\/y/i },
    { key: 'Quarter over Quarter', re: /q\/q|last quarter/i },
    { key: 'Month over Month', re: /last month/i },
    { key: 'Recent', re: /.*/ },
  ];

  function parseChange(label) {
    var m = label.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
    if (!m) return null;
    return parseFloat(m[1]);
  }

  function periodFor(label) {
    for (var i = 0; i < PERIOD_PATTERNS.length; i++) {
      if (PERIOD_PATTERNS[i].re.test(label)) return PERIOD_PATTERNS[i].key;
    }
    return 'Recent';
  }

  function generate(minMagnitude) {
    var indicators = (global.FTN && global.FTN.indicators) || [];
    var threshold = minMagnitude == null ? 0.5 : minMagnitude;
    var groups = {};

    indicators.forEach(function (ind) {
      if (!ind.changeLabel) return;
      var magnitude = parseChange(ind.changeLabel);
      if (magnitude === null || Math.abs(magnitude) < threshold) return;
      var period = periodFor(ind.changeLabel);
      groups[period] = groups[period] || [];
      groups[period].push({ indicator: ind, magnitude: magnitude });
    });

    Object.keys(groups).forEach(function (period) {
      groups[period].sort(function (a, b) { return Math.abs(b.magnitude) - Math.abs(a.magnitude); });
    });

    return groups;
  }

  function render(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var groups = generate();
    var periods = Object.keys(groups);
    if (!periods.length) { mount.innerHTML = '<p class="u-text-graphite">No meaningful period-over-period changes to show right now.</p>'; return; }

    mount.innerHTML = periods.map(function (period) {
      var items = groups[period].slice(0, 5);
      return '<div class="what-changed__group">' +
        '<p class="what-changed__period">' + period + '</p>' +
        '<ul class="what-changed__list">' + items.map(function (item) {
          var ind = item.indicator;
          var dir = item.magnitude > 0 ? 'up' : 'down';
          return '<li class="what-changed__item">' +
            '<span class="what-changed__glyph what-changed__glyph--' + dir + '">' + global.FTN.Charts.trendGlyph(dir) + '</span>' +
            '<button type="button" class="trust-trigger" data-trust-card="' + ind.id + '">' + ind.title + '</button>' +
            '<span class="what-changed__value">' + ind.changeLabel + '</span>' +
          '</li>';
        }).join('') + '</ul>' +
      '</div>';
    }).join('');
  }

  global.FTN = global.FTN || {};
  global.FTN.WhatChanged = { generate: generate, render: render };
})(window);
