// FTN Platform Website — Insights page.
// Reuses shared Indicator/Relationship engines, but waits for production Community Connect
// metrics before rendering so historical illustrative civic counts can never surface here.
(function (global) {
  'use strict';

  function renderPatterns() {
    var mount = document.getElementById('patterns-mount');
    if (!mount || !global.FTN || !global.FTN.RealityInsights) return;
    var pool = global.FTN.RealityInsights.generate();
    if (!pool.length) { mount.innerHTML = '<p class="u-text-graphite">No patterns to surface right now.</p>'; return; }
    var seenCategories = {}, diverse = [];
    pool.forEach(function (insight) {
      if (diverse.length >= 4 || seenCategories[insight.category]) return;
      seenCategories[insight.category] = true; diverse.push(insight);
    });
    if (diverse.length < 4) pool.forEach(function (insight) { if (diverse.length < 4 && diverse.indexOf(insight) === -1) diverse.push(insight); });
    mount.innerHTML = diverse.map(function (insight) {
      var link = insight.supportedBy && insight.supportedBy[0]
        ? '<button type="button" class="trust-trigger" data-trust-card="' + insight.supportedBy[0] + '">View evidence</button>' : '';
      return '<div class="module-card"><p class="u-text-sm u-text-graphite">' + insight.category + '</p><h3>' + insight.text + '</h3>' + (link ? '<p class="u-mt-8">' + link + '</p>' : '') + '</div>';
    }).join('');
  }

  var FEATURED_RELATIONSHIPS = ['rainfall-flooding', 'cost-of-living-household-pressure', 'inflation-food-inflation'];
  function renderConnections() {
    var mount = document.getElementById('connections-mount');
    if (!mount || !global.FTN || !global.FTN.Relationships) return;
    var all = global.FTN.Relationships.all || [];
    var featured = FEATURED_RELATIONSHIPS.map(function (id) { return all.filter(function (r) { return r.id === id; })[0]; }).filter(Boolean);
    if (!featured.length) { mount.innerHTML = ''; return; }
    mount.innerHTML = featured.map(function (r) {
      var dirWord = r.direction === 'positive' ? 'rises with' : 'falls as';
      var glyph = global.FTN.Charts ? global.FTN.Charts.trendGlyph(r.direction === 'positive' ? 'up' : 'down') : '';
      var fromBtn = r.fromIndicatorId ? '<button type="button" class="trust-trigger" data-trust-card="' + r.fromIndicatorId + '">' + r.fromLabel + '</button>' : '<span>' + r.fromLabel + '</span>';
      var toBtn = r.toIndicatorId ? '<button type="button" class="trust-trigger" data-trust-card="' + r.toIndicatorId + '">' + r.toLabel + '</button>' : '<span>' + r.toLabel + '</span>';
      return '<div class="module-card"><p class="u-text-sm u-text-graphite">' + r.confidence + ' confidence &middot; ' + r.type + '</p><h3>' + glyph + ' ' + r.toLabel + ' ' + dirWord + ' ' + r.fromLabel + '</h3><p class="u-mt-8">' + fromBtn + ' &rarr; ' + toBtn + '</p></div>';
    }).join('');
  }

  function renderPage() {
    renderPatterns(); renderConnections();
    if (global.FTN.WhatChanged) global.FTN.WhatChanged.render('what-changed-mount');
  }

  function hydrateCommunityThenRender() {
    if (global.FTN && global.FTN.communityMetricsReady) {
      Promise.resolve(global.FTN.communityMetricsReady).catch(function(){}).then(renderPage); return;
    }
    var s = document.createElement('script');
    s.src = '/js/community-live-metrics.js?v=20260827.1';
    s.onload = function () { Promise.resolve(global.FTN && global.FTN.communityMetricsReady).catch(function(){}).then(renderPage); };
    s.onerror = renderPage;
    document.body.appendChild(s);
  }

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(hydrateCommunityThenRender);
})(window);
