// FTN Platform Website — "The Nation Is Speaking" Reality Insight engine.
//
// Generates a pool of short observations, each built entirely from fields
// that already exist on a real indicator or relationship object — trend,
// changeLabel, status, classification, pace, or relationship strength.
// Nothing here invents a number, a date, or a claim that isn't already
// sitting in js/indicators-data.js or js/relationships-data.js. What
// "rotates" is which true, already-derived observation is shown next — not
// the content of the observation itself. This is also what powers Did You
// Know / Featured Insight / Random Indicator on the Discovery panel.
(function (global) {
  'use strict';

  function pct(strength) {
    return Math.round(strength * 100) + '%';
  }

  function generate() {
    var insights = [];
    var indicators = (global.FTN && global.FTN.indicators) || [];
    var relationships = (global.FTN && global.FTN.Relationships && global.FTN.Relationships.all) || [];
    var LiveClocks = global.FTN && global.FTN.LiveClocks;

    // 1. Trend insights — only where a real changeLabel exists.
    indicators.forEach(function (ind) {
      if (!ind.changeLabel) return;
      var glyph = ind.trend === 'up' ? 'risen' : ind.trend === 'down' ? 'fallen' : 'held steady';
      insights.push({
        id: 'trend-' + ind.id,
        category: ind.category,
        text: ind.title + ' has ' + glyph + ' to ' + ind.value + (ind.units ? ' ' + ind.units : '') + ' (' + ind.changeLabel + ').',
        supportedBy: [ind.id],
        type: 'trend',
      });
    });

    // 2. Watch-status insights — only where status is genuinely 'watch'.
    indicators.forEach(function (ind) {
      if (ind.status !== 'watch') return;
      insights.push({
        id: 'watch-' + ind.id,
        category: ind.category,
        text: ind.title + ' is currently flagged for attention at ' + ind.value + (ind.units ? ' ' + ind.units : '') + '.',
        supportedBy: [ind.id],
        type: 'watch',
      });
    });

    // 3. Relationship insights — straight from the Relationship Engine.
    relationships.forEach(function (r) {
      if (r.value === 'component') {
        insights.push({
          id: 'rel-' + r.id,
          category: 'Relationships',
          text: r.fromLabel + ' is a direct component of how ' + r.toLabel + ' is calculated (' + r.confidence.toLowerCase() + ' confidence).',
          supportedBy: [r.id],
          type: 'relationship',
        });
      } else {
        insights.push({
          id: 'rel-' + r.id,
          category: 'Relationships',
          text: r.fromLabel + ' and ' + r.toLabel + ' show a ' + pct(r.strength) + ' ' + r.direction + ' relationship in this demonstration (' + r.confidence.toLowerCase() + ' confidence).',
          supportedBy: [r.id],
          type: 'relationship',
        });
      }
    });

    // 4. Pace insights — reuse the Fast Counter Engine's own math, verbatim.
    if (LiveClocks) {
      indicators.forEach(function (ind) {
        if (!ind.isLiveClock) return;
        var line = LiveClocks.getPaceLine(ind);
        if (!line) return;
        insights.push({
          id: 'pace-' + ind.id,
          category: ind.category,
          text: ind.title + ' is moving at roughly ' + line.replace(/^About /, '') + ', by FTN’s calculation.',
          supportedBy: [ind.id],
          type: 'pace',
        });
      });
    }

    // 5. Aggregate insights — genuinely counted from the live registry, not
    // a hardcoded figure that can drift out of sync with the data.
    var upCount = indicators.filter(function (i) { return i.trend === 'up'; }).length;
    var downCount = indicators.filter(function (i) { return i.trend === 'down'; }).length;
    var watchCount = indicators.filter(function (i) { return i.status === 'watch'; }).length;
    insights.push({
      id: 'aggregate-trend',
      category: 'National Overview',
      text: 'Of ' + indicators.length + ' tracked indicators, ' + upCount + ' are trending up and ' + downCount + ' are trending down.',
      supportedBy: [],
      type: 'aggregate',
    });
    if (watchCount > 0) {
      insights.push({
        id: 'aggregate-watch',
        category: 'National Overview',
        text: watchCount + ' indicator' + (watchCount === 1 ? ' is' : 's are') + ' currently flagged for attention across the observatory.',
        supportedBy: [],
        type: 'aggregate',
      });
    }

    return insights;
  }

  function randomFrom(pool) {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  global.FTN = global.FTN || {};
  global.FTN.RealityInsights = {
    generate: generate,
    random: function () { return randomFrom(generate()); },
  };
})(window);
