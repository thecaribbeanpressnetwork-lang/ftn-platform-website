// FTN Platform — shared statistics presentation primitives (Phase 5B). Extracted from
// js/crime-intelligence.js's own lineChart()/tableHTML() (Phase 5A) so a second FTN Statistics
// vertical slice (js/fx-intelligence.js) reuses the exact same SVG line-chart and accessible-table
// rendering instead of a second, copy-pasted implementation -- the same "build once, reuse
// everywhere" principle CLAUDE.md's own history cites (three independent trend-glyph
// implementations collapsed into one).
//
// Deliberately generic over {label, value} pairs and caller-supplied CSS class names/captions --
// this module has no knowledge of "crime" or "exchange rate," only of how to draw a small SVG line
// chart and its accessible table twin. Presentation only: never fetches data, never knows about
// js/ftn-statistics.js's schema -- a consuming renderer (crime-intelligence.js, fx-intelligence.js)
// is responsible for turning its own real observations into {label, value} rows first.
(function (global) {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // rows: [{label, value}] (>=2 rows). opts: {ariaLabel, chartClass, defs, maxFractionDigits,
  // yPadding, labelEvery}. yPadding is an absolute amount below the series minimum. When omitted,
  // derive a small data-relative margin so narrow-range series (such as monthly FX) remain legible
  // rather than inheriting a crime-count scale. labelEvery reduces visual x-axis crowding only;
  // the caller's accessible table continues to expose every observation.
  function lineChart(rows, opts) {
    opts = opts || {};
    var w = 900, h = 330, p = 48;
    var values = rows.map(function (r) { return r.value; });
    var max = Math.max.apply(null, values), rawMin = Math.min.apply(null, values);
    var range = max - rawMin;
    var padding = opts.yPadding != null
      ? opts.yPadding
      : Math.max(range * 0.15, Math.abs(max) * 0.001, 0.0001);
    var min = rawMin - padding;
    var x = function (i) { return p + i * (w - p * 2) / (rows.length - 1); };
    var y = function (v) { return h - p - (v - min) / (max - min) * (h - p * 2); };
    var points = rows.map(function (r, i) { return x(i) + ',' + y(r.value); }).join(' ');
    var cls = opts.chartClass || 'ftn-stat-chart';
    var digits = opts.maxFractionDigits != null ? opts.maxFractionDigits : 1;
    var labelEvery = Math.max(1, opts.labelEvery || 1);
    return '<svg class="' + cls + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(opts.ariaLabel || '') + '">' +
      (opts.defs || '') +
      '<polyline class="' + cls + '__line" points="' + points + '" pathLength="1"/>' +
      rows.map(function (r, i) {
        return '<g><circle class="' + cls + '__dot" cx="' + x(i) + '" cy="' + y(r.value) + '" r="5"/>' +
          ((i % labelEvery === 0 || i === rows.length - 1) ? '<text x="' + x(i) + '" y="' + (h - 16) + '" text-anchor="middle">' + esc(r.label) + '</text>' : '') +
          '<text class="' + cls + '__value" x="' + x(i) + '" y="' + (y(r.value) - 14) + '" text-anchor="middle">' +
          Number(r.value).toLocaleString(undefined, { maximumFractionDigits: digits }) + '</text></g>';
      }).join('') + '</svg>';
  }

  // rows: [{label, value}]. opts: {unit, caption, summary, rowHeaderLabel, tableClass,
  // disclosureClass, maxFractionDigits}. Collapsed by default (<details>), same "compact by
  // default" pattern the Trust Card trigger already uses.
  function tableHTML(rows, opts) {
    opts = opts || {};
    var unit = opts.unit || '';
    var digits = opts.maxFractionDigits != null ? opts.maxFractionDigits : 1;
    var tableClass = opts.tableClass || 'ftn-stat-table';
    var disclosureClass = opts.disclosureClass || 'ftn-stat-table-disclosure';
    return '<details class="' + disclosureClass + '"><summary>' + esc(opts.summary || 'View as a table') + '</summary>' +
      '<table class="' + tableClass + '"><caption class="sr-only">' + esc(opts.caption || unit) + '</caption>' +
      '<thead><tr><th scope="col">' + esc(opts.rowHeaderLabel || 'Period') + '</th><th scope="col">' + esc(unit) + '</th></tr></thead>' +
      '<tbody>' + rows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.label) + '</th><td>' + Number(r.value).toLocaleString(undefined, { maximumFractionDigits: digits }) + '</td></tr>';
      }).join('') + '</tbody></table></details>';
  }

  global.FTN = global.FTN || {};
  global.FTN.StatisticsChart = { lineChart: lineChart, tableHTML: tableHTML };
})(typeof window !== 'undefined' ? window : globalThis);
