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
        '<div class="indicator-card__spark" data-spark="' + ind.id + '"></div>' +
        '<div class="indicator-card__footer">' +
          '<span class="indicator-card__source">' + ind.sourceName + '</span>' +
          '<button type="button" class="trust-trigger" data-trust-card="' + ind.id + '">Trust Card</button>' +
        '</div>' +
      '</article>'
    );
  }

  function renderCategories() {
    var root = document.getElementById('indicator-wall');
    if (!root || !global.FTN || !global.FTN.indicators) return;

    var byCategory = {};
    global.FTN.indicators.forEach(function (ind) {
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
    root.innerHTML = html;

    // Sparklines
    global.FTN.indicators.forEach(function (ind) {
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

  ready(function () {
    renderCategoryChips();
    renderCategories();
    applyCategoryVisibility();
    initCustomizePanel();
    initKioskMode();
    initRefreshClock();
    initPauseControl();
    if (global.FTN.Ads) global.FTN.Ads.renderPlacement('ad-rail-mount', 'rail');
  });
})(window);
