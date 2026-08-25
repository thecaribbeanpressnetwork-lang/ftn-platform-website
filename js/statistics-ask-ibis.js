// FTN Platform — "Ask ibis about this data" panel on /statistics/ (Phase 5B). Thin UI wiring only:
// fetches the two real data files, builds a catalog via js/ftn-statistics.js's adapters, and routes
// every question through the real js/ibis-client.js -> STATISTIC_QUERY capability -- the same
// router every other IBIS-calling node on this site uses, not a bypass. Every successful or
// degraded answer gets a mandatory Trust Card trigger (js/ibis-evidence.js's own decision matrix
// already treats capability 'STATISTIC' as always-required -- see that file's Rule 2).
(function (global) {
  'use strict';

  var catalogPromise = null;
  function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = Promise.all([
      fetch('/data/crime-statistics.json?v=20260824.2').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/data/fx-usd-ttd.json?v=20260825.1').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    ]).then(function (results) {
      return global.FTN.IbisStatistics.buildCatalog({ crime: results[0], fx: results[1] });
    });
    return catalogPromise;
  }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderAnswer(host, text, state) {
    host.setAttribute('data-state', state || 'ok');
    host.innerHTML = '<p>' + esc(text) + '</p>';
    return host.querySelector('p');
  }

  function mountEvidence(host, outcome) {
    if (!global.FTN.IbisEvidence) return;
    // outcome.result is the js/ibis-statistics-capability.js query() result directly -- the
    // executor contract's own `data` field (see js/ibis-client.js's callStatisticsQuery) is
    // unwrapped by js/ibis-eligibility.js's attemptInOrder() before it ever reaches this caller.
    var data = outcome && outcome.result;
    if (!data) return;
    var provenance = data.provenance || (outcome.provenance || {});
    var sources = data.source ? [{ url: data.source.url, title: data.source.name }] : [];
    var extra = {
      title: data.indicatorName || 'How this answer was produced',
      methodology: data.description || null,
      formula: data.calculation ? data.calculation.formula : (data.formula || null),
      sources: sources,
    };
    global.FTN.IbisEvidence.mount(host, provenance, extra, { onDark: true });
  }

  function ask(text) {
    var answerHost = document.getElementById('statistics-ask-answer');
    if (!text || !text.trim()) return;
    answerHost.setAttribute('data-state', 'pending');
    answerHost.innerHTML = '<p>ibis is checking the verified data…</p>';
    loadCatalog().then(function (catalog) {
      return global.FTN.IbisClient.request({
        capability: 'STATISTIC_QUERY',
        context: { authenticated: false },
        payload: { text: text, catalog: catalog },
      });
    }).then(function (outcome) {
      // Routing-level failure (capability unrecognized, node blocked, no eligible provider at
      // all) -- distinct from a query the capability itself could not answer, handled below.
      if (outcome.blocked || !outcome.success) {
        renderAnswer(answerHost, outcome.reason || "ibis couldn't reach FTN Statistics right now.", 'error');
        return;
      }
      var data = outcome.result; // the js/ibis-statistics-capability.js query() result, unwrapped by attemptInOrder()
      if (!data.success) {
        renderAnswer(answerHost, data.reason || "ibis couldn't answer that from FTN Statistics' verified data.", 'error');
        return;
      }
      renderAnswer(answerHost, data.answer, data.degraded ? 'degraded' : 'ok');
      mountEvidence(answerHost, outcome);
    }).catch(function () {
      renderAnswer(answerHost, 'ibis is temporarily unavailable. Please try again in a moment.', 'error');
    });
  }

  function init() {
    var form = document.getElementById('statistics-ask-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('statistics-ask-input');
      ask(input.value);
    });
    document.querySelectorAll('[data-ask-example]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById('statistics-ask-input');
        input.value = btn.textContent;
        ask(input.value);
      });
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.StatisticsAskIbis = { ask: ask, loadCatalog: loadCatalog };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
