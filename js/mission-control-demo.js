// FTN Platform Website — Mission Control Interactive Demonstration behavior.
// Public demonstration only — not the secure production Mission Control
// application. All data comes from js/mission-control-data.js.
(function (global) {
  'use strict';

  var MC = (global.FTN && global.FTN.MC) || {};
  var Charts = global.FTN && global.FTN.Charts;
  var TrustCard = global.FTN && global.FTN.TrustCard;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ============================================================ TABS ====
  // Progressive enhancement: without this script every panel is a plain
  // stacked <section> (see the page's .no-js rules). With JS, we convert
  // the same markup into an accessible tablist.
  function initTabs() {
    var tablist = $('#mc-tablist');
    var panels = $all('.mc-panel');
    if (!tablist || !panels.length) return;

    document.body.classList.add('mc-tabs-active');

    var tabs = $all('[data-tab-target]', tablist);
    function activate(id, focusTab) {
      tabs.forEach(function (t) {
        var isActive = t.getAttribute('data-tab-target') === id;
        t.setAttribute('aria-selected', String(isActive));
        t.tabIndex = isActive ? 0 : -1;
      });
      panels.forEach(function (p) {
        p.hidden = p.id !== id;
      });
      if (focusTab) {
        tabs.filter(function (t) { return t.getAttribute('data-tab-target') === id; })[0].focus();
      }
      if (global.location.hash !== '#' + id) {
        history.replaceState(null, '', '#' + id);
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activate(tab.getAttribute('data-tab-target'), false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); activate(next.getAttribute('data-tab-target'), true); }
      });
    });

    var initial = (global.location.hash || '').replace('#', '');
    var validIds = panels.map(function (p) { return p.id; });
    activate(validIds.indexOf(initial) !== -1 ? initial : validIds[0], false);
  }

  // ============================================================ EXECUTIVE DASHBOARD ====
  function kpiCardHTML(kpi, multiplier) {
    var value = Math.round(kpi.base * multiplier);
    var glyph = Charts.trendGlyph(kpi.trend);
    return (
      '<div class="mc-kpi-card' + (kpi.status === 'watch' ? ' mc-kpi-card--watch' : '') + '">' +
        '<p class="mc-kpi-card__title">' + kpi.title + '</p>' +
        '<p class="mc-kpi-card__value">' + value + ' <span>' + kpi.units + '</span></p>' +
        '<p class="mc-kpi-card__trend mc-kpi-card__trend--' + kpi.trend + '">' + glyph + ' vs. prior period</p>' +
      '</div>'
    );
  }

  function renderExecutiveDashboard() {
    var grid = $('#exec-kpi-grid');
    if (!grid || !MC.executiveKPIs) return;

    var regionSelect = $('#exec-region');
    var rangeButtons = $all('[data-range]');
    var rangeLabel = $('#exec-range-label');

    function render() {
      var region = regionSelect ? regionSelect.value : 'National';
      var multiplier = MC.regionMultipliers[region] || 1;
      grid.innerHTML = MC.executiveKPIs.map(function (k) { return kpiCardHTML(k, multiplier); }).join('');
    }

    if (regionSelect) regionSelect.addEventListener('change', render);
    rangeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        rangeButtons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        if (rangeLabel) rangeLabel.textContent = 'Showing: ' + btn.textContent;
      });
    });

    render();
  }

  // ============================================================ CORRELATION ENGINE ====
  function renderCorrelationEngine() {
    var mount = $('#correlation-list');
    if (!mount || !MC.correlations) return;

    mount.innerHTML = MC.correlations.map(function (c) {
      var sign = c.direction === 'positive' ? '+' : '−';
      return (
        '<div class="correlation-row">' +
          '<div class="correlation-row__main">' +
            '<p class="correlation-row__title">' + c.title + '</p>' +
            '<p class="correlation-row__meta">Direction: ' + c.direction + ' &middot; Confidence: ' + c.confidence + '</p>' +
          '</div>' +
          '<div class="correlation-row__strength">' +
            '<div class="correlation-bar"><div class="correlation-bar__fill" style="width:' + Math.round(c.strength * 100) + '%"></div></div>' +
            '<span>' + sign + (c.strength * 100).toFixed(0) + '%</span>' +
          '</div>' +
          '<button type="button" class="trust-trigger" data-trust-card-inline="' + c.id + '">Trust Card</button>' +
        '</div>'
      );
    }).join('');

    mount.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-trust-card-inline]');
      if (!trigger || !TrustCard) return;
      var id = trigger.getAttribute('data-trust-card-inline');
      var c = MC.correlations.filter(function (x) { return x.id === id; })[0];
      if (c) TrustCard.open(c);
    });
  }

  // ============================================================ REALITY GRAPH ====
  function renderRealityGraph() {
    var svgMount = $('#reality-graph-svg');
    if (!svgMount || !MC.graphNodes) return;

    var w = 640, h = 460;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Reality Graph: interactive diagram of connected national indicators');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', h);

    var edgesGroup = document.createElementNS(ns, 'g');
    var nodesGroup = document.createElementNS(ns, 'g');

    MC.graphEdges.forEach(function (edge) {
      var from = MC.graphNodes.filter(function (n) { return n.id === edge.from; })[0];
      var to = MC.graphNodes.filter(function (n) { return n.id === edge.to; })[0];
      if (!from || !to) return;
      var line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
      line.setAttribute('stroke', edge.sign === 'positive' ? '#16A34A' : '#4D4D4D');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('data-edge-from', edge.from);
      line.setAttribute('data-edge-to', edge.to);
      line.setAttribute('class', 'reality-edge');
      edgesGroup.appendChild(line);
    });

    MC.graphNodes.forEach(function (node) {
      var g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'reality-node');
      g.setAttribute('data-node-id', node.id);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', node.label);

      // Invisible, generously-sized hit target — the visible dot is only 8px,
      // which leaves real gaps a pointer (or a touch) can miss.
      var hitArea = document.createElementNS(ns, 'circle');
      hitArea.setAttribute('cx', node.x); hitArea.setAttribute('cy', node.y); hitArea.setAttribute('r', 22);
      hitArea.setAttribute('fill', 'transparent');

      var circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', node.x); circle.setAttribute('cy', node.y); circle.setAttribute('r', 8);
      circle.setAttribute('fill', '#E10613');
      circle.setAttribute('pointer-events', 'none');

      var text = document.createElementNS(ns, 'text');
      text.setAttribute('x', node.x); text.setAttribute('y', node.y - 14);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-family', 'Inter, sans-serif');
      text.setAttribute('fill', '#0B0B0B');
      text.setAttribute('pointer-events', 'none');
      text.textContent = node.label;

      g.appendChild(hitArea);
      g.appendChild(circle);
      g.appendChild(text);
      nodesGroup.appendChild(g);

      function highlight() {
        var connected = {};
        connected[node.id] = true;
        $all('.reality-edge', svg).forEach(function (edge) {
          var f = edge.getAttribute('data-edge-from'), t = edge.getAttribute('data-edge-to');
          var touches = f === node.id || t === node.id;
          edge.style.opacity = touches ? '1' : '0.12';
          if (touches) { connected[f] = true; connected[t] = true; }
        });
        $all('.reality-node', svg).forEach(function (n2) {
          n2.style.opacity = connected[n2.getAttribute('data-node-id')] ? '1' : '0.25';
        });
      }
      function reset() {
        $all('.reality-edge', svg).forEach(function (edge) { edge.style.opacity = '1'; });
        $all('.reality-node', svg).forEach(function (n2) { n2.style.opacity = '1'; });
      }

      g.addEventListener('click', function () {
        var wasActive = g.classList.contains('is-active');
        $all('.reality-node', svg).forEach(function (n2) { n2.classList.remove('is-active'); });
        if (wasActive) { reset(); }
        else { g.classList.add('is-active'); highlight(); }
      });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.click(); }
      });
    });

    svg.appendChild(edgesGroup);
    svg.appendChild(nodesGroup);
    svgMount.innerHTML = '';
    svgMount.appendChild(svg);

    // Category filter
    var filter = $('#graph-category-filter');
    if (filter) {
      filter.addEventListener('change', function () {
        var val = filter.value;
        MC.graphNodes.forEach(function (node) {
          var el = svgMount.querySelector('[data-node-id="' + node.id + '"]');
          if (!el) return;
          var match = val === 'all' || node.category === val;
          el.style.display = match ? '' : 'none';
        });
      });
    }
  }

  // ============================================================ SCENARIO STUDIO ====
  function renderScenarioStudio() {
    var mount = $('#scenario-sliders');
    var outputMount = $('#scenario-outputs');
    if (!mount || !outputMount || !MC.scenarioVariables) return;

    mount.innerHTML = MC.scenarioVariables.map(function (v) {
      return (
        '<div class="scenario-slider">' +
          '<div class="scenario-slider__label"><label for="sv-' + v.id + '">' + v.label + '</label><span id="sv-' + v.id + '-value">' + v.default + v.unit + '</span></div>' +
          '<input type="range" id="sv-' + v.id + '" min="' + v.min + '" max="' + v.max + '" step="' + v.step + '" value="' + v.default + '" data-var="' + v.id + '">' +
        '</div>'
      );
    }).join('');

    function currentValues() {
      var vals = {};
      MC.scenarioVariables.forEach(function (v) {
        vals[v.id] = Number($('#sv-' + v.id).value);
      });
      return vals;
    }

    function recompute() {
      var vals = currentValues();
      MC.scenarioVariables.forEach(function (v) {
        $('#sv-' + v.id + '-value').textContent = vals[v.id] + v.unit;
      });

      outputMount.innerHTML = MC.scenarioOutcomes.map(function (outcome) {
        var score = 0;
        Object.keys(outcome.weights).forEach(function (varId) {
          score += (vals[varId] || 0) * outcome.weights[varId];
        });
        score = Math.round(score * 10) / 10;
        var direction = score > 0.5 ? 'up' : score < -0.5 ? 'down' : 'flat';
        var glyph = Charts.trendGlyph(direction);
        var goodOrBad = /Risk|Cost|Pressure/.test(outcome.title) ? (direction === 'down' ? 'positive' : direction === 'up' ? 'negative' : 'neutral')
          : (direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'neutral');
        return (
          '<div class="scenario-output scenario-output--' + goodOrBad + '">' +
            '<p class="scenario-output__title">' + outcome.title + '</p>' +
            '<p class="scenario-output__value">' + glyph + ' ' + (score > 0 ? '+' : '') + score + '%</p>' +
          '</div>'
        );
      }).join('');
    }

    mount.addEventListener('input', recompute);
    var resetBtn = $('#scenario-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        MC.scenarioVariables.forEach(function (v) { $('#sv-' + v.id).value = v.default; });
        recompute();
      });
    }

    recompute();
  }

  // ============================================================ EVIDENCE EXPLORER ====
  function renderEvidenceExplorer() {
    var select = $('#evidence-select');
    var mount = $('#evidence-detail');
    if (!select || !mount || !MC.evidenceChains) return;

    function render() {
      var chain = MC.evidenceChains[select.value];
      if (!chain) { mount.innerHTML = ''; return; }
      mount.innerHTML =
        '<h3>' + chain.title + '</h3>' +
        '<div class="evidence-chain">' +
          '<div class="evidence-chain__step"><p class="evidence-chain__label">National Metric</p><p>' + chain.title + '</p></div>' +
          '<div class="evidence-chain__arrow" aria-hidden="true">&darr;</div>' +
          '<div class="evidence-chain__step"><p class="evidence-chain__label">Source Records</p><p>' + chain.sourceRecords + '</p></div>' +
          '<div class="evidence-chain__arrow" aria-hidden="true">&darr;</div>' +
          '<div class="evidence-chain__step"><p class="evidence-chain__label">Community Observations</p><p>' + chain.communityObservations + '</p></div>' +
          '<div class="evidence-chain__arrow" aria-hidden="true">&darr;</div>' +
          '<div class="evidence-chain__step"><p class="evidence-chain__label">Related News</p><p>' + chain.newsEvents.join('; ') + '</p></div>' +
          '<div class="evidence-chain__arrow" aria-hidden="true">&darr;</div>' +
          '<div class="evidence-chain__step"><p class="evidence-chain__label">Historical Events</p><p>' + chain.historicalEvents.join('; ') + '</p></div>' +
        '</div>' +
        '<p class="u-text-sm u-text-graphite u-mt-16"><strong>Methodology:</strong> ' + chain.methodology + '</p>';
    }

    select.addEventListener('change', render);
    render();
  }

  // ============================================================ STRATEGIC ADVISOR ====
  function renderStrategicAdvisor() {
    var form = $('#advisor-form');
    var resultMount = $('#advisor-result');
    if (!form || !resultMount || !MC.advisorScripts) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var outcome = $('#advisor-outcome').value;
      var area = $('#advisor-area').value;
      var budget = $('#advisor-budget').value;
      var horizon = $('#advisor-horizon').value;
      var script = MC.advisorScripts[outcome];
      if (!script) return;

      resultMount.hidden = false;
      resultMount.innerHTML =
        '<div class="callout u-mb-24">Scripted demonstration response — not a live AI system. Generated from a fixed lookup table based on your selections (' + area + ', ' + budget + ', ' + horizon + ').</div>' +
        '<h3>Situation Summary</h3><p class="u-text-graphite">' + script.situationSummary + '</p>' +
        '<h3 class="u-mt-24">Evidence</h3><p class="u-text-graphite">' + script.evidence + '</p>' +
        '<h3 class="u-mt-24">Historical Patterns</h3><p class="u-text-graphite">' + script.historicalPatterns + '</p>' +
        '<h3 class="u-mt-24">Possible Contributing Factors</h3><ul class="u-text-graphite">' + script.contributingFactors.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' +
        '<h3 class="u-mt-24">Options</h3>' +
        '<div class="advisor-options">' + script.options.map(function (o) {
          return '<div class="advisor-option"><p class="advisor-option__name">' + o.name + '</p><p class="u-text-sm u-text-graphite">' + o.summary + '</p>' +
            '<p class="u-text-sm"><strong>Trade-offs:</strong> ' + o.tradeoffs + '</p>' +
            '<p class="u-text-sm"><strong>Confidence:</strong> ' + o.confidence + '</p></div>';
        }).join('') + '</div>' +
        '<h3 class="u-mt-24">Monitoring Indicators</h3><ul class="u-text-graphite">' + script.monitoringIndicators.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>' +
        '<h3 class="u-mt-24">Missing Information</h3><ul class="u-text-graphite">' + script.missingInformation.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>';

      resultMount.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ============================================================ TIMELINE ====
  function renderTimeline() {
    var mount = $('#mc-timeline');
    if (!mount || !MC.timeline) return;
    mount.innerHTML = MC.timeline.map(function (item) {
      return (
        '<div class="timeline-item">' +
          '<div class="timeline-item__date">' + item.date + '</div>' +
          '<div class="timeline-item__body">' +
            '<span class="trust-badge trust-badge--demo">' + item.category + '</span>' +
            '<p class="timeline-item__event">' + item.event + '</p>' +
            '<div class="timeline-item__compare">' +
              '<div><p class="timeline-item__compare-label">Intervention</p><p>' + item.intervention + '</p></div>' +
              '<div><p class="timeline-item__compare-label">Expected</p><p>' + item.expected + '</p></div>' +
              '<div><p class="timeline-item__compare-label">Observed</p><p>' + item.observed + '</p></div>' +
            '</div>' +
            '<p class="u-text-sm u-text-graphite u-mt-8"><strong>Assessment:</strong> ' + item.assessment + '</p>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // ============================================================ EXTERNAL INFLUENCE MONITOR ====
  function renderExternalMonitor() {
    var mount = $('#external-monitor-grid');
    if (!mount || !MC.externalFactors) return;
    mount.innerHTML = MC.externalFactors.map(function (f) {
      return (
        '<div class="module-card">' +
          '<span class="module-card__status module-card__status--planned">Illustrative</span>' +
          '<h3>' + f.title + '</h3>' +
          '<p>' + f.summary + '</p>' +
          '<p class="u-text-sm u-mt-8"><strong>Connects to:</strong> ' + f.connects.join(', ') + '</p>' +
        '</div>'
      );
    }).join('');
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    initTabs();
    renderExecutiveDashboard();
    renderCorrelationEngine();
    renderRealityGraph();
    renderScenarioStudio();
    renderEvidenceExplorer();
    renderStrategicAdvisor();
    renderTimeline();
    renderExternalMonitor();
  });
})(window);
