// FTN Platform Website — 404 page search (Product Maturity Phase, 2026-07-14).
// Reuses the Intent Router built for ibis.ai in Sprint 1 -- the same real, transparent keyword
// matching against the Product Registry, not a new engine. A lost visitor gets the same honest
// "here's why this matched" explanation ibis.ai already gives.
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('notfound-search');
    var results = document.getElementById('notfound-results');
    if (!input || !results || !global.FTN || !global.FTN.IntentRouter) return;

    input.addEventListener('input', function () {
      var query = input.value.trim();
      if (!query) { results.innerHTML = ''; return; }

      var matches = global.FTN.IntentRouter.route(query);
      if (!matches.length) {
        results.innerHTML = '<p class="u-text-graphite">No FTN product matched that yet. Try different words, or use the links below.</p>';
        return;
      }

      results.innerHTML = '<div class="module-grid">' + matches.slice(0, 4).map(function (m) {
        return '<a class="module-card" href="' + m.product.route + '">' +
          '<h3>' + escapeHtml(m.product.name) + '</h3>' +
          '<p>' + escapeHtml(m.product.tagline) + '</p>' +
          '</a>';
      }).join('') + '</div>';
    });
  });
})(window);
