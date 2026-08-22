// FTN Platform Website — FTN Live National Observatory behavior.
(function (global) {
  'use strict';

  // Shared across the platform (js/trust-card.js, js/charts.js) — see
  // CLAUDE.md §7.7 Reality Engine. Do not reintroduce a local copy here.
  function classificationClass(c) {
    return global.FTN.TrustCard.classificationBadgeClass(c);
  }

  function trendGlyph(trend) {
    return global.FTN.Charts.trendGlyph(trend);
  }

  function sourceHTML(ind) {
    var src = ind.sourceId && global.FTN.Sources ? global.FTN.Sources.get(ind.sourceId) : null;
    if (src && src.url) {
      return '<a class="indicator-card__source" href="' + src.url + '" target="_blank" rel="noopener noreferrer">' + src.name + '</a>';
    }
    return '<span class="indicator-card__source">' + ind.sourceName + '</span>';
  }

  function paceLineHTML(ind) {
    var line = global.FTN.LiveClocks && ind.isLiveClock ? global.FTN.LiveClocks.getPaceLine(ind) : null;
    return line ? '<p class="indicator-card__pace">' + line + '</p>' : '';
  }

  function cardHTML(ind) {
    var live = ind.isLiveClock
      ? '<span data-live-clock="' + ind.id + '" aria-live="off">' + ind.value + '</span>'
      : '<span>' + ind.value + '</span>';
    return (
      '<article class="indicator-card indicator-card--' + ind.status + '" data-category="' + ind.category + '">' +
        '<div class="indicator-card__top">' +
          '<span class="trust-badge ' + classificationClass(ind.classification) + '">' + ind.classification + '</span>' +
          (ind.status !== 'normal' ? '<span class="indicator-card__status indicator-card__status--' + ind.status + '">' + ind.status + '</span>' : '') +
        '</div>' +
        '<h3 class="indicator-card__title">' + ind.title + '</h3>' +
        '<p class="indicator-card__value">' + live + (ind.units ? ' <span class="indicator-card__units">' + ind.units + '</span>' : '') + '</p>' +
        (ind.changeLabel ? '<p class="indicator-card__change indicator-card__change--' + ind.trend + '">' + trendGlyph(ind.trend) + ' ' + ind.changeLabel + '</p>' : '') +
        paceLineHTML(ind) +
        '<div class="indicator-card__spark" data-spark="' + ind.id + '"></div>' +
        '<div class="indicator-card__footer">' +
          sourceHTML(ind) +
          '<span class="icon-row">' +
            (ind.communityProfileKey ? '<button type="button" class="trust-trigger" data-community-profile="' + ind.communityProfileKey + '">Profile</button>' : '') +
            '<button type="button" class="trust-trigger" data-trust-card="' + ind.id + '">Trust Card</button>' +
          '</span>' +
        '</div>' +
      '</article>'
    );
  }

  // Ecosystem Simplification pass: the venue/category-cap DisplayConfig system retired (that
  // ambient/kiosk job now belongs to FTN Display) -- Observer's indicator wall just filters by
  // the search box, unconditionally, for every visitor.
  var searchTerm = '';

  function filterIndicators(allIndicators) {
    if (!searchTerm) return allIndicators;
    var term = searchTerm.toLowerCase();
    return allIndicators.filter(function (ind) { return ind.title.toLowerCase().indexOf(term) !== -1 || ind.category.toLowerCase().indexOf(term) !== -1; });
  }

  function initSearch() {
    var input = document.getElementById('indicator-search');
    if (!input) return;
    input.addEventListener('input', function () {
      searchTerm = input.value.trim();
      renderCategories();
      applyCategoryVisibility();
    });
  }

  // ---- Discovery: Random Indicator / Random Relationship / Did You Know ----
  function initDiscovery() {
    var randomIndBtn = document.getElementById('discover-random-indicator');
    var randomRelBtn = document.getElementById('discover-random-relationship');
    var didYouKnowBtn = document.getElementById('discover-did-you-know');

    if (randomIndBtn) {
      randomIndBtn.addEventListener('click', function () {
        var pool = global.FTN.indicators || [];
        if (!pool.length) return;
        var pick = pool[Math.floor(Math.random() * pool.length)];
        global.FTN.TrustCard.open(pick.id);
      });
    }
    if (randomRelBtn) {
      randomRelBtn.addEventListener('click', function () {
        if (!global.FTN.Relationships) return;
        var pick = global.FTN.Relationships.random();
        if (pick) global.FTN.TrustCard.open(pick);
      });
    }
    if (didYouKnowBtn) {
      didYouKnowBtn.addEventListener('click', function () {
        var btn = document.getElementById('reality-insight-next');
        if (btn) { btn.click(); document.getElementById('reality-insight').closest('.reality-insight').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
    }
  }

  function renderCategories() {
    var root = document.getElementById('indicator-wall');
    if (!root || !global.FTN || !global.FTN.indicators) return;

    var indicatorsToRender = filterIndicators(global.FTN.indicators);

    var byCategory = {};
    indicatorsToRender.forEach(function (ind) {
      byCategory[ind.category] = byCategory[ind.category] || [];
      byCategory[ind.category].push(ind);
    });

    var html = '';
    global.FTN.CATEGORIES.forEach(function (cat) {
      var items = byCategory[cat] || [];
      if (!items.length) return;
      var catId = 'cat-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      html += '<section class="indicator-category" id="' + catId + '" data-category-section="' + cat + '">';
      html += '<h2 class="indicator-category__title">' + cat + '</h2>';
      html += '<div class="indicator-grid">' + items.map(cardHTML).join('') + '</div>';
      html += '</section>';
    });
    root.innerHTML = html || '<p class="u-text-graphite">No indicators match the current display configuration.</p>';

    // Sparklines
    indicatorsToRender.forEach(function (ind) {
      if (!ind.history || !ind.history.length) return;
      var mount = root.querySelector('[data-spark="' + ind.id + '"]');
      if (mount) mount.appendChild(global.FTN.Charts.sparkline(ind.history, { width: 140, height: 28 }));
    });
  }

  function renderCategoryChips() {
    var nav = document.getElementById('category-jump');
    if (!nav || !global.FTN) return;
    nav.innerHTML = global.FTN.CATEGORIES.map(function (cat) {
      var catId = 'cat-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return '<a href="#' + catId + '" class="category-chip">' + cat + '</a>';
    }).join('');
  }

  // ---- Dashboard customization (client-side only, no accounts/backend) ----
  // A future multi-org version of FTN Live saves layouts server-side per
  // organization; this is the same "which categories are visible" concept
  // implemented as a reversible, per-browser preference via localStorage.
  var STORAGE_KEY = 'ftn-observatory-hidden-categories';

  function getHiddenCategories() {
    return global.FTN.storage.getJSON(STORAGE_KEY, []);
  }

  function setHiddenCategories(list) {
    global.FTN.storage.setJSON(STORAGE_KEY, list);
  }

  function applyCategoryVisibility() {
    var hidden = getHiddenCategories();
    document.querySelectorAll('[data-category-section]').forEach(function (section) {
      var cat = section.getAttribute('data-category-section');
      section.hidden = hidden.indexOf(cat) !== -1;
    });
    document.querySelectorAll('.category-chip').forEach(function (chip) {
      var cat = chip.textContent;
      chip.classList.toggle('category-chip--hidden', hidden.indexOf(cat) !== -1);
    });
  }

  function initCustomizePanel() {
    var mount = document.getElementById('customize-panel');
    var toggleBtn = document.getElementById('customize-toggle');
    if (!mount || !toggleBtn || !global.FTN) return;

    var hidden = getHiddenCategories();
    mount.innerHTML = '<p class="customize-panel__heading">Show or hide categories</p>' +
      '<div class="customize-panel__list">' +
      global.FTN.CATEGORIES.map(function (cat) {
        var checked = hidden.indexOf(cat) === -1 ? ' checked' : '';
        var inputId = 'cust-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return '<label class="customize-panel__item" for="' + inputId + '">' +
          '<input type="checkbox" id="' + inputId + '" data-category-toggle="' + cat + '"' + checked + '> ' + cat +
          '</label>';
      }).join('') +
      '</div>' +
      '<button type="button" class="btn btn-outline btn-sm u-mt-16" id="customize-reset">Reset to Default</button>';

    mount.addEventListener('change', function (e) {
      var input = e.target.closest('[data-category-toggle]');
      if (!input) return;
      var cat = input.getAttribute('data-category-toggle');
      var current = getHiddenCategories();
      if (input.checked) {
        current = current.filter(function (c) { return c !== cat; });
      } else if (current.indexOf(cat) === -1) {
        current.push(cat);
      }
      setHiddenCategories(current);
      applyCategoryVisibility();
    });

    mount.querySelector('#customize-reset').addEventListener('click', function () {
      setHiddenCategories([]);
      applyCategoryVisibility();
      initCustomizePanel();
    });

    toggleBtn.addEventListener('click', function () {
      var isOpen = mount.classList.toggle('is-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });

    applyCategoryVisibility();
  }

  // ---- "The Nation Is Speaking" — Reality Insights rotator ----
  function initRealityInsights() {
    var mount = document.getElementById('reality-insight');
    if (!mount || !global.FTN.RealityInsights) return;
    var pool = global.FTN.RealityInsights.generate();
    if (!pool.length) { mount.hidden = true; return; }

    var i = 0;
    function show() {
      var insight = pool[i % pool.length];
      var link = insight.supportedBy && insight.supportedBy[0]
        ? '<button type="button" class="trust-trigger trust-trigger--on-dark" data-trust-card="' + insight.supportedBy[0] + '">View evidence</button>'
        : '';
      mount.innerHTML =
        '<p class="reality-insight__eyebrow">' + insight.category + '</p>' +
        '<p class="reality-insight__text">' + insight.text + '</p>' +
        (link ? '<div class="u-mt-8">' + link + '</div>' : '');
      i++;
    }
    show();

    var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      setInterval(show, 8000);
    }

    var nextBtn = document.getElementById('reality-insight-next');
    if (nextBtn) nextBtn.addEventListener('click', show);
  }

  // Generic disclosure-panel toggle — used by Customize and Display Setup
  // alike, and reusable by any future panel of the same shape.
  function initPanelToggle(toggleId, panelId) {
    var toggleBtn = document.getElementById(toggleId);
    var panel = document.getElementById(panelId);
    if (!toggleBtn || !panel) return;
    toggleBtn.addEventListener('click', function () {
      var isOpen = panel.classList.toggle('is-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  function initPauseControl() {
    var btn = document.getElementById('pause-toggle');
    if (!btn || !global.FTN || !global.FTN.LiveClocks) return;
    btn.addEventListener('click', function () {
      if (global.FTN.LiveClocks.isPaused()) {
        global.FTN.LiveClocks.resume();
        btn.textContent = 'Pause Counter Updates';
        btn.setAttribute('aria-pressed', 'false');
      } else {
        global.FTN.LiveClocks.pause();
        btn.textContent = 'Resume Counter Updates';
        btn.setAttribute('aria-pressed', 'true');
      }
    });
  }

  function initRefreshClock() {
    var el = document.getElementById('last-refresh');
    if (!el) return;
    function update() {
      var now = new Date();
      el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    update();
    setInterval(update, 1000);
  }

  // Hero "vitals" panel: real local Port of Spain time (same Intl-based
  // approach as js/today-panel.js — not a hardcoded UTC offset) and a real
  // count of the indicators this build actually tracks.
  function initHeroVitals() {
    var timeEl = document.getElementById('hero-local-time');
    var countEl = document.getElementById('hero-indicator-count');
    if (countEl && global.FTN.indicators) countEl.textContent = global.FTN.indicators.length;
    if (!timeEl) return;
    function update() {
      timeEl.textContent = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Port_of_Spain', hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).format(new Date());
    }
    update();
    setInterval(update, 1000);
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    document.body.classList.add('density-balanced');
    initRealityInsights();
    if (global.FTN.TodayPanel) global.FTN.TodayPanel.render('today-panel-mount');
    if (global.FTN.WhatChanged) global.FTN.WhatChanged.render('what-changed-mount');
    initSearch();
    initDiscovery();
    renderCategoryChips();
    renderCategories();
    applyCategoryVisibility();
    initCustomizePanel();
    initRefreshClock();
    initHeroVitals();
    initPauseControl();
    if (global.FTN.Ads) global.FTN.Ads.renderPlacement('ad-rail-mount', 'rail');
  });
})(window);
