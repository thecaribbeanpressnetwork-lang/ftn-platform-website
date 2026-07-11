// FTN Platform Website — tiny dependency-free SVG chart helpers.
// No external charting library: these are small, self-contained SVG builders,
// consistent with the vanilla-only mandate (CLAUDE.md §3).
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, attrs[key]);
      }
    }
    return node;
  }

  function scale(values, w, h, pad) {
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    return values.map(function (v, i) {
      var x = pad + (i / (values.length - 1 || 1)) * (w - pad * 2);
      var y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
  }

  // Sparkline: small trend line, no axes. Returns an <svg> element.
  function sparkline(values, opts) {
    opts = opts || {};
    var w = opts.width || 120;
    var h = opts.height || 32;
    var color = opts.color || 'currentColor';
    var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, 'aria-hidden': 'true', class: 'ftn-sparkline' });
    if (!values || values.length < 2) return svg;
    var pts = scale(values, w, h, 2);
    var d = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    svg.appendChild(el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    var last = pts[pts.length - 1];
    svg.appendChild(el('circle', { cx: last[0], cy: last[1], r: 2, fill: color }));
    return svg;
  }

  // Line chart with a light grid and axis labels. Returns an <svg> element.
  function lineChart(values, labels, opts) {
    opts = opts || {};
    var w = opts.width || 480;
    var h = opts.height || 220;
    var pad = 32;
    var color = opts.color || '#E10613';
    var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img', 'aria-label': opts.ariaLabel || 'Line chart' });

    // gridlines
    for (var g = 0; g <= 4; g++) {
      var gy = pad + (g / 4) * (h - pad * 2);
      svg.appendChild(el('line', { x1: pad, x2: w - pad, y1: gy, y2: gy, stroke: '#ECECEC', 'stroke-width': 1 }));
    }

    if (values && values.length > 1) {
      var pts = scale(values, w, h, pad);
      var d = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      var area = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - pad) + ' L' + pts[0][0].toFixed(1) + ' ' + (h - pad) + ' Z';
      svg.appendChild(el('path', { d: area, fill: color, 'fill-opacity': 0.08, stroke: 'none' }));
      svg.appendChild(el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      pts.forEach(function (p) {
        svg.appendChild(el('circle', { cx: p[0], cy: p[1], r: 2.5, fill: color }));
      });
    }
    return svg;
  }

  // Horizontal bar chart for comparing a small set of values.
  function barChart(items, opts) {
    // items: [{ label, value }]
    opts = opts || {};
    var w = opts.width || 480;
    var rowH = opts.rowHeight || 28;
    var pad = 4;
    var h = items.length * rowH + pad * 2;
    var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); })) || 1;
    var labelW = opts.labelWidth || 130;
    var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img', 'aria-label': opts.ariaLabel || 'Bar chart' });

    items.forEach(function (item, i) {
      var y = pad + i * rowH;
      var barMaxW = w - labelW - 50;
      var barW = Math.max(2, (Math.abs(item.value) / max) * barMaxW);
      var color = item.color || (item.value < 0 ? '#4D4D4D' : '#E10613');

      var label = el('text', { x: 0, y: y + rowH / 2 + 4, 'font-size': 12, fill: '#1A1A1A', 'font-family': 'Inter, sans-serif' });
      label.textContent = item.label;
      svg.appendChild(label);

      svg.appendChild(el('rect', {
        x: labelW, y: y + 4, width: barW, height: rowH - 12, rx: 3, fill: color,
      }));

      var valueText = el('text', { x: labelW + barW + 8, y: y + rowH / 2 + 4, 'font-size': 12, fill: '#4D4D4D', 'font-family': 'Inter, sans-serif' });
      valueText.textContent = (item.valueLabel != null) ? item.valueLabel : String(item.value);
      svg.appendChild(valueText);
    });

    return svg;
  }

  // Circular progress / gauge for a 0-100 style value.
  function gauge(value, opts) {
    opts = opts || {};
    var size = opts.size || 96;
    var stroke = opts.stroke || 8;
    var r = (size - stroke) / 2;
    var c = size / 2;
    var circumference = 2 * Math.PI * r;
    var pct = Math.max(0, Math.min(100, value)) / 100;
    var color = opts.color || '#E10613';

    var svg = el('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-label': opts.ariaLabel || (value + '%') });
    svg.appendChild(el('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: '#ECECEC', 'stroke-width': stroke }));
    var circle = el('circle', {
      cx: c, cy: c, r: r, fill: 'none', stroke: color, 'stroke-width': stroke,
      'stroke-dasharray': circumference.toFixed(2), 'stroke-dashoffset': (circumference * (1 - pct)).toFixed(2),
      'stroke-linecap': 'round', transform: 'rotate(-90 ' + c + ' ' + c + ')',
    });
    svg.appendChild(circle);
    return svg;
  }

  // Shared trend glyph — was independently reimplemented in observatory.js,
  // mission-control-demo.js (twice), and what-changed.js. One home for the
  // up/down/flat convention used across every trend display in the platform.
  function trendGlyph(trend) {
    if (trend === 'up') return '▲';
    if (trend === 'down') return '▼';
    return '—';
  }

  global.FTN = global.FTN || {};
  global.FTN.Charts = { sparkline: sparkline, lineChart: lineChart, barChart: barChart, gauge: gauge, trendGlyph: trendGlyph };
})(window);
