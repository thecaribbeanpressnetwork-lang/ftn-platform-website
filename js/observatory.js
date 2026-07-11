// FTN Platform Website — FTN Live National Observatory behavior.
(function (global) {
  'use strict';

  function classificationClass(c) {
    var map = {
      'Official': 'trust-badge--official',
      'Sourced': 'trust-badge--sourced',
      'FTN Derived': 'trust-badge--derived',
      'FTN Estimated': 'trust-badge--estimated',
      'FTN Modelled': 'trust-badge--modelled',
      'Demonstration': 'trust-badge--demo',
    };
    return map[c] || 'trust-badge--demo';
  }

  function trendGlyph(trend) {
    if (trend === 'up') return '▲';
    if (trend === 'down') return '▼';
    return '—';
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
          '<button type="button" class="trust-trigger" data-trust-card="' + ind.id + '">Trust Card</button>' +
        '</div>' +
      '</article>'
    );
  }

  // Applies a DisplayConfig (js/display-config.js) to the full indicator set:
  // category allow-list first, then an overall count cap distributed evenly
  // across whatever categories remain — the same function a future kiosk or
  // widget renderer would call, not something Observatory-specific.
  function applyDisplayConfig(allIndicators, cfg) {
    var pool = allIndicators;
    if (global.FTN.FounderControls) {
      pool = pool.filter(function (ind) { return !global.FTN.FounderControls.isDisabled(ind.id); });
    }
    if (cfg && cfg.categories) {
      pool = pool.filter(function (ind) { return cfg.categories.indexOf(ind.category) !== -1; });
    }
    if (!cfg || !cfg.indicatorCount || pool.length <= cfg.indicatorCount) return pool;
    return pool.slice(0, cfg.indicatorCount);
  }

  function renderCategories(cfg) {
    var root = document.getElementById('indicator-wall');
    if (!root || !global.FTN || !global.FTN.indicators) return;

    var indicatorsToRender = cfg ? applyDisplayConfig(global.FTN.indicators, cfg) : global.FTN.indicators;

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
    try {
      return JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function setHiddenCategories(list) {
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
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
        btn.textContent = 'Pause Live Updates';
        btn.setAttribute('aria-pressed', 'false');
      } else {
        global.FTN.LiveClocks.pause();
        btn.textContent = 'Resume Live Updates';
        btn.setAttribute('aria-pressed', 'true');
      }
    });
  }

  function initKioskMode() {
    var toggle = document.getElementById('kiosk-toggle');
    if (!toggle) return;
    var body = document.body;
    var cycleTimer = null;

    function startCycle() {
      var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;
      var sections = Array.prototype.slice.call(document.querySelectorAll('[data-category-section]'));
      var i = 0;
      cycleTimer = setInterval(function () {
        if (!sections.length) return;
        sections[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
        i = (i + 1) % sections.length;
      }, 8000);
    }

    function stopCycle() {
      if (cycleTimer) clearInterval(cycleTimer);
      cycleTimer = null;
    }

    toggle.addEventListener('click', function () {
      var isKiosk = body.classList.toggle('kiosk-mode');
      toggle.setAttribute('aria-pressed', String(isKiosk));
      toggle.textContent = isKiosk ? 'Exit Kiosk Mode' : 'Enter Kiosk Mode';
      if (isKiosk) startCycle(); else stopCycle();
    });
  }

  // ---- Commercial ad packages (capability structures, no pricing) ----
  function renderAdPackages() {
    var mount = document.getElementById('ad-packages-grid');
    if (!mount || !global.FTN.AdPackages) return;
    mount.innerHTML = global.FTN.AdPackages.all.map(function (pkg) {
      var promo = pkg.customerPromotionAllowed === true ? 'Yes'
        : pkg.customerPromotionAllowed === 'limited' ? 'Limited' : 'No';
      return (
        '<div class="module-card">' +
          '<h3>' + pkg.name + '</h3>' +
          '<p>' + pkg.tagline + '</p>' +
          '<dl class="package-card__specs">' +
            '<div><dt>Network ad density</dt><dd>' + pkg.networkAdDensity + '</dd></div>' +
            '<div><dt>Customer promotion</dt><dd>' + promo + '</dd></div>' +
            '<div><dt>Branding</dt><dd>' + pkg.brandingRequired + '</dd></div>' +
            '<div><dt>Example layout</dt><dd>' + pkg.exampleCombination.indicators + ' indicators + ' + pkg.exampleCombination.ads + ' ad panels</dd></div>' +
          '</dl>' +
        '</div>'
      );
    }).join('');

    var comboMount = document.getElementById('ad-combo-demo');
    if (comboMount) {
      var labels = ['Advertisement', 'Sponsored', 'FTN Promotion', 'Public Service Message'];
      comboMount.innerHTML = global.FTN.AdPackages.all.map(function (pkg, i) {
        var combo = pkg.exampleCombination;
        var tiles = '';
        for (var d = 0; d < Math.min(combo.indicators, 6); d++) tiles += '<span class="ad-combo__tile ad-combo__tile--data"></span>';
        for (var a = 0; a < combo.ads; a++) tiles += '<span class="ad-combo__tile ad-combo__tile--ad">' + labels[a % labels.length] + '</span>';
        return '<div class="ad-combo"><p class="ad-combo__label">' + pkg.name + ': ' + combo.indicators + ' indicators + ' + combo.ads + ' ad panels</p><div class="ad-combo__row">' + tiles + '</div></div>';
      }).join('');
    }
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

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function applyDensityClass(cfg) {
    document.body.classList.remove('density-executive', 'density-balanced', 'density-observatory');
    document.body.classList.add('density-' + ((cfg && cfg.density) || 'balanced'));
  }

  ready(function () {
    var cfg = global.FTN.DisplayConfig ? global.FTN.DisplayConfig.load() : null;
    applyDensityClass(cfg);
    renderCategoryChips();
    renderCategories(cfg);
    applyCategoryVisibility();
    initCustomizePanel();
    initPanelToggle('display-config-toggle', 'display-config-panel');
    initKioskMode();
    initRefreshClock();
    initPauseControl();
    if (global.FTN.DisplayConfig) global.FTN.DisplayConfig.init('display-config-panel');
    if (global.FTN.Ads) global.FTN.Ads.renderPlacement('ad-rail-mount', 'rail');
    if (global.FTN.DisplayMode) global.FTN.DisplayMode.initToggle('fullscreen-toggle', 'display-mode-exit');
    if (global.FTN.FounderControls) global.FTN.FounderControls.render('founder-controls-mount');
    renderAdPackages();

    global.addEventListener('ftn:display-config-changed', function (e) {
      applyDensityClass(e.detail);
      renderCategories(e.detail);
      applyCategoryVisibility();
    });

    global.addEventListener('ftn:founder-controls-changed', function () {
      renderCategories(cfg);
      applyCategoryVisibility();
    });
  });
})(window);
