// FTN Platform — Central Bank exchange-rate renderer (Phase 5B). Second FTN Statistics vertical
// slice, structurally mirroring js/crime-intelligence.js (fetch -> schema-transform -> chart +
// accessible table + Trust Card) but reusing js/ftn-statistics-chart.js's shared primitives rather
// than a second copy of the SVG/table-building code -- see that module's own header for why.
(function (global) {
  'use strict';
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // The full series can run back to 1991 (400+ monthly rows) -- a legible default chart/table
  // shows the most recent window, explicitly labelled as such; ibis's STATISTIC_QUERY capability
  // still sees and can answer questions about the FULL series regardless of this display window.
  var DISPLAY_MONTHS = 24;

  function seriesRows(monthly, measure) {
    var window = monthly.slice(-DISPLAY_MONTHS);
    return window.map(function (r) { return { label: r.period, value: measure === 'buying' ? r.usdBuying : r.usdSelling }; });
  }

  function chart(rows, measure) {
    return global.FTN.StatisticsChart.lineChart(rows, {
      ariaLabel: 'TT$/US$ ' + measure + ' rate, last ' + rows.length + ' months',
      chartClass: 'fx-chart', maxFractionDigits: 4, labelEvery: 3,
    });
  }
  function table(rows, measure) {
    return global.FTN.StatisticsChart.tableHTML(rows, {
      unit: 'TTD per USD', caption: 'TT$/US$ ' + measure + ' rate, last ' + rows.length + ' months',
      summary: 'View ' + measure + ' rate as a table', rowHeaderLabel: 'Month',
      tableClass: 'fx-table', disclosureClass: 'fx-table-disclosure', maxFractionDigits: 4,
    });
  }

  function mountTrustCardTrigger(host, data) {
    if (!global.FTN || !global.FTN.Statistics || !global.FTN.StatisticsFxAdapter || !global.FTN.TrustCard) return;
    try {
      var built = global.FTN.StatisticsFxAdapter.buildObservations(data);
      var selling = built.observations.filter(function (o) { return o.indicatorId === 'fx-usd-selling-rate'; });
      var latest = selling[selling.length - 1];
      var source = built.sources.cbtt;
      var provenance = global.FTN.Statistics.provenanceFor(latest, source);
      var mom = built.derivedCalculations[0];
      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'trust-trigger trust-trigger--on-dark fx-intel__evidence-trigger';
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.textContent = 'View evidence';
      trigger.onclick = function () {
        global.FTN.TrustCard.open({
          title: 'TT$/US$ Selling Rate — ' + latest.referencePeriod,
          value: latest.value, units: 'TTD per USD',
          publisher: provenance.publisher,
          externalSourceUrl: provenance.sourceUrl, externalSourceLabel: provenance.sourceIdentity,
          referenceDate: provenance.sourceReferenceDate,
          lastUpdated: provenance.sourceRetrievedAt,
          retrievalMethod: 'Checked weekly against the published Central Bank monthly table',
          methodology: 'The Central Bank of Trinidad and Tobago compiles a monthly USD buying/selling rate table. FTN reads the published static table directly; it does not average, estimate or interpolate a rate itself.',
          formula: mom ? mom.formula : null,
          formulaSubstitution: mom ? ('(' + mom.computedValue.absolute + ' TTD, ' + mom.computedValue.percent + '%) from ' + mom.computedValue.fromPeriod + ' to ' + mom.computedValue.toPeriod) : null,
          confidenceBasis: provenance.confidenceBasis,
          licensingNote: provenance.licensingNote,
          limitations: 'The Bank does not publish an explicit methodology statement for how the monthly figure is derived (e.g. month-end snapshot vs. monthly average) -- FTN displays the published number as-is and does not assume which.',
        });
      };
      host.appendChild(trigger);
    } catch (e) { /* evidence trigger is additive -- never break the chart it sits beside */ }
  }

  function render(host, data) {
    var rows = data.monthly || [];
    var latest = rows[rows.length - 1];
    var prev = rows[rows.length - 2];
    var momChange = prev ? (latest.usdSelling - prev.usdSelling) : null;
    var momPercent = prev && prev.usdSelling ? (momChange / prev.usdSelling * 100) : null;

    host.innerHTML = '<section class="fx-intel__shell"><header class="fx-intel__head"><div><span>OFFICIAL EXCHANGE RATE</span><h2>TT$ / US$ over time.</h2><p>Central Bank of Trinidad and Tobago monthly compiled rate -- ' + rows.length + ' months on record since ' + rows[0].period + '.</p><div data-fx-evidence></div></div></header>' +
      '<div class="fx-kpis"><article class="fx-kpi fx-kpi--lead"><span>' + esc(latest.period) + ' selling rate</span><strong>' + latest.usdSelling.toFixed(4) + '</strong><p>TTD per USD</p></article>' +
      '<article class="fx-kpi"><span>' + esc(latest.period) + ' buying rate</span><strong>' + latest.usdBuying.toFixed(4) + '</strong><p>TTD per USD</p></article>' +
      (prev ? '<article class="fx-kpi"><span>Month-over-month change</span><strong>' + (momChange >= 0 ? '+' : '') + momChange.toFixed(4) + '</strong><p>' + (momPercent >= 0 ? '+' : '') + momPercent.toFixed(2) + '% vs ' + esc(prev.period) + '</p></article>' : '') +
      '</div>' +
      '<div class="fx-measure" role="group" aria-label="Choose rate"><button class="is-active" data-fx-measure="selling">Selling rate</button><button data-fx-measure="buying">Buying rate</button></div>' +
      '<div data-fx-chart>' + chart(seriesRows(rows, 'selling'), 'selling') + '</div>' +
      '<div data-fx-table>' + table(seriesRows(rows, 'selling'), 'selling') + '</div>' +
      '<footer><a href="' + esc(data.source.url) + '" target="_blank" rel="noopener">Central Bank of Trinidad and Tobago — Exchange Rates (Monthly)</a><span>FTN checked ' + esc(data.source.retrieved) + '. Showing the most recent ' + Math.min(DISPLAY_MONTHS, rows.length) + ' of ' + rows.length + ' months on record -- a monthly published figure, not a live/real-time rate.</span></footer></section>';

    var evidenceHost = host.querySelector('[data-fx-evidence]');
    if (evidenceHost) mountTrustCardTrigger(evidenceHost, data);

    host.querySelectorAll('[data-fx-measure]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        host.querySelectorAll('[data-fx-measure]').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        var measure = btn.getAttribute('data-fx-measure');
        var chartRows = seriesRows(rows, measure);
        host.querySelector('[data-fx-chart]').innerHTML = chart(chartRows, measure);
        host.querySelector('[data-fx-table]').innerHTML = table(chartRows, measure);
      });
    });

    if (!global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var observer = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { host.classList.add('is-visible'); observer.disconnect(); } });
      }, { threshold: .2 });
      observer.observe(host);
    } else host.classList.add('is-visible');
  }

  function init() {
    var host = document.getElementById('fx-intelligence');
    if (!host) return;
    fetch('/data/fx-usd-ttd.json?v=20260825.1').then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) { render(host, data); })
      .catch(function () { host.innerHTML = '<p class="callout">The exchange rate is temporarily unavailable. Open the official Central Bank source directly.</p>'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
