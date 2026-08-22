// FTN Platform Website — Observer Console.
// Renders the primary Trinidad & Tobago observation canvas: compact category nav (NOW /
// WEATHER / TRANSPORT / MARINE / EARTH / ENVIRONMENT / SAFETY / INFRASTRUCTURE / CIVIC) plus
// a content canvas beneath it. Reuses js/observer-data.js as its only data source and
// js/ftn-source-provenance.js's SOURCE_QUALITY/sourceRecord()/freshnessDays() for every
// source-quality badge and freshness line — no second provenance system (see the header
// comment in observer-data.js for why Trust Card's own classification vocabulary is the wrong
// tool for external sources). Category switching is hash-routed (#observer/<category>) so a
// link into a specific category is shareable and works with JS disabled (falls back to the NOW
// view, which itself links out to every category's own page section).
(function (global) {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var QUALITY_BADGE_CLASS = {
    PRIMARY_EVIDENCE: 'trust-badge--official',
    OFFICIAL_GOVERNMENT: 'trust-badge--official',
    LEGISLATION_PUBLIC_RECORD: 'trust-badge--official',
    ACADEMIC: 'trust-badge--sourced',
    REPUTABLE_JOURNALISM: 'trust-badge--sourced',
    CORPORATE_STATEMENT: 'trust-badge--sourced',
    COMMUNITY_DISCUSSION: 'trust-badge--estimated',
    CREATOR_SOCIAL: 'trust-badge--estimated',
    PERSONAL_COMMENTARY: 'trust-badge--demo',
    MARKETING_ADVOCACY: 'trust-badge--demo',
    UNKNOWN: 'trust-badge--demo'
  };

  function qualityLabel(quality) {
    return String(quality || 'UNKNOWN').replace(/_/g, ' ');
  }

  function badgeClass(sourceQuality) {
    return QUALITY_BADGE_CLASS[sourceQuality] || 'trust-badge--demo';
  }

  function retrievalMethodFor(embedType) {
    if (embedType === 'live-image' || embedType === 'anchor') return 'DIRECT_FETCH';
    if (embedType === 'iframe') return 'THIRD_PARTY_AGGREGATOR';
    return 'MANUAL_ENTRY';
  }

  function provenanceOf(view) {
    var Prov = global.FTN && global.FTN.SourceProvenance;
    if (!Prov) return null;
    var isLive = view.embedType === 'live-image' || view.embedType === 'iframe' || view.embedType === 'anchor';
    var retrievedAt = isLive ? new Date().toISOString() : ((global.FTN.Observer && global.FTN.Observer.lastVerified) + 'T00:00:00Z');
    return Prov.sourceRecord({
      sourceId: view.id,
      owner: view.authority,
      sourceClass: view.sourceClass,
      url: view.sourceUrl,
      retrievedAt: retrievedAt,
      retrievalMethod: retrievalMethodFor(view.embedType),
      geographicRelevance: 'Trinidad and Tobago',
      consumingProducts: ['FTN Observer']
    });
  }

  function freshnessLine(view) {
    var Prov = global.FTN && global.FTN.SourceProvenance;
    var record = provenanceOf(view);
    if (!Prov || !record) return '';
    var isLive = view.embedType === 'live-image' || view.embedType === 'iframe' || view.embedType === 'anchor';
    if (isLive) return '<span class="observer-card__freshness">Retrieved just now</span>';
    var days = Prov.freshnessDays(record);
    if (days == null) return '';
    var text = days <= 0 ? 'Source last verified today' : ('Source last verified ' + days + (days === 1 ? ' day ago' : ' days ago'));
    return '<span class="observer-card__freshness">' + esc(text) + '</span>';
  }

  function statusPillClass(status) {
    var map = {
      LIVE: 'observer-status--live',
      CURRENT: 'observer-status--current',
      DELAYED: 'observer-status--delayed',
      SCHEDULED: 'observer-status--scheduled',
      HISTORICAL: 'observer-status--historical',
      ARCHIVED: 'observer-status--historical',
      EXTERNAL: 'observer-status--external'
    };
    return map[status] || 'observer-status--external';
  }

  function sourceCard(view) {
    var blockedNote = view.framingBlocked
      ? '<p class="observer-card__blocked">Embedding is blocked by the provider — FTN does not bypass X-Frame-Options/CSP.</p>'
      : '';
    return '' +
      '<article class="observer-card" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        blockedNote +
        '<div class="observer-card__meta">' +
          '<span class="trust-badge ' + badgeClass(view.sourceClass) + '">' + esc(qualityLabel(view.sourceClass)) + '</span>' +
          '<span class="observer-card__authority">' + esc(view.authority) + '</span>' +
          freshnessLine(view) +
        '</div>' +
        '<a class="btn btn-outline btn-sm observer-card__action" href="' + esc(view.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' +
          (view.framingBlocked ? 'Open live view →' : 'Open original source →') +
        '</a>' +
      '</article>';
  }

  function imageCard(view) {
    var cacheBust = 'ftn=' + Date.now();
    var src = view.imageUrl + (view.imageUrl.indexOf('?') === -1 ? '?' : '&') + cacheBust;
    return '' +
      '<article class="observer-card observer-card--media" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<div class="observer-card__frame observer-card__frame--image">' +
          '<img src="' + esc(src) + '" alt="' + esc(view.title) + ' — latest published image from ' + esc(view.authority) + '" loading="lazy">' +
        '</div>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        '<div class="observer-card__meta">' +
          '<span class="trust-badge ' + badgeClass(view.sourceClass) + '">' + esc(qualityLabel(view.sourceClass)) + '</span>' +
          '<span class="observer-card__authority">' + esc(view.authority) + '</span>' +
          freshnessLine(view) +
        '</div>' +
        '<button type="button" class="btn btn-outline btn-sm observer-card__refresh" data-refresh-image>Refresh image</button> ' +
        '<a class="btn btn-outline btn-sm observer-card__action" href="' + esc(view.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open original source →</a>' +
      '</article>';
  }

  function iframeCard(view) {
    return '' +
      '<article class="observer-card observer-card--media" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<div class="observer-card__frame observer-card__frame--iframe">' +
          '<iframe src="' + esc(view.iframeUrl) + '" title="' + esc(view.title) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
        '</div>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        '<div class="observer-card__meta">' +
          '<span class="trust-badge ' + badgeClass(view.sourceClass) + '">' + esc(qualityLabel(view.sourceClass)) + '</span>' +
          '<span class="observer-card__authority">' + esc(view.authority) + '</span>' +
          freshnessLine(view) +
        '</div>' +
        '<a class="btn btn-outline btn-sm observer-card__action" href="' + esc(view.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open live map →</a>' +
      '</article>';
  }

  function anchorCard(view) {
    return '' +
      '<article class="observer-card observer-card--anchor" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        '<button type="button" class="btn btn-primary btn-sm observer-card__action" data-jump-anchor="' + esc(view.anchorSelector) + '">Jump to live satellite view ↑</button>' +
      '</article>';
  }

  function renderView(view) {
    if (view.embedType === 'live-image') return imageCard(view);
    if (view.embedType === 'iframe') return iframeCard(view);
    if (view.embedType === 'anchor') return anchorCard(view);
    return sourceCard(view);
  }

  function renderCategory(categoryId) {
    var Observer = global.FTN.Observer;
    var views = Observer.viewsFor(categoryId);
    if (!views.length) return '<p class="observer-empty">No views registered for this category yet.</p>';
    return '<div class="observer-grid">' + views.map(renderView).join('') + '</div>';
  }

  function nowStatusRow(view) {
    return '' +
      '<li class="observer-now__row">' +
        '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '<span class="observer-now__label">' + esc(view.nowLabel || view.title) + '</span>' +
        '<a href="#observer/' + esc(view.category) + '" data-observer-tab="' + esc(view.category) + '">View →</a>' +
      '</li>';
  }

  function renderNow() {
    var Observer = global.FTN.Observer;
    var feeds = Observer.nowFeeds();
    var weatherHtml = '<p class="observer-now__loading">Connecting to current weather…</p>';
    var html = '' +
      '<div class="observer-now">' +
        '<div class="observer-now__weather" id="observer-now-weather">' + weatherHtml + '</div>' +
        '<div class="observer-now__status">' +
          '<p class="observer-now__heading">Status across every connected category</p>' +
          '<ul class="observer-now__list">' + feeds.map(nowStatusRow).join('') + '</ul>' +
          '<p class="observer-now__note">Only sources FTN can actually verify are listed here. No active-emergency state is asserted — open any row for the official source.</p>' +
        '</div>' +
      '</div>' +
      '<div class="observer-correlation" id="observer-correlation">' +
        '<p class="observer-now__loading">Loading correlation engine…</p>' +
      '</div>';
    return html;
  }

  function correlationRow(node) {
    var statusMap = {
      'WATCHING': 'observer-status--delayed',
      'NO SIGNAL': 'observer-status--historical',
      'NOT MONITORED': 'observer-status--external',
      'UNKNOWN': 'observer-status--external'
    };
    var link = node.toObserverViewId
      ? '<a href="#observer/' + esc((global.FTN.Observer.views.filter(function (v) { return v.id === node.toObserverViewId; })[0] || {}).category || 'now') + '" data-observer-tab="' + esc((global.FTN.Observer.views.filter(function (v) { return v.id === node.toObserverViewId; })[0] || {}).category || 'now') + '">Open →</a>'
      : '';
    return '' +
      '<li class="observer-correlation__row">' +
        '<span class="observer-status ' + (statusMap[node.status] || 'observer-status--external') + '">' + esc(node.status) + '</span>' +
        '<span class="observer-correlation__label">' + esc(node.title) + '</span>' +
        link +
      '</li>';
  }

  function renderCorrelation(result) {
    var host = $('#observer-correlation');
    if (!host) return;
    host.innerHTML = '' +
      '<p class="observer-now__heading">Correlation engine — rule-based, not live-fitted</p>' +
      '<p class="observer-correlation__explain">' + esc(result.explanation) + '</p>' +
      '<ul class="observer-correlation__list">' + result.chain.map(correlationRow).join('') + '</ul>' +
      '<p class="observer-correlation__confidence">Chain confidence: <strong>' + esc(result.overallConfidence) + '</strong> — capped by its weakest evidence, not by how many rules reference it.</p>';
  }

  function fmt(v, d) { return Number.isFinite(v) ? v.toFixed(d == null ? 1 : d) : '—'; }

  function loadNowWeather() {
    var host = $('#observer-now-weather');
    if (!host) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=10.6667&longitude=-61.5167&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=America%2FPort_of_Spain';
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 10000) : 0;
    fetch(url, { signal: controller ? controller.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('Weather ' + r.status); return r.json(); })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        var c = data.current || {};
        host.innerHTML = '' +
          '<div class="observer-now__weather-top">' +
            '<span class="observer-status observer-status--live">LIVE</span>' +
            '<span class="observer-now__weather-time">Port of Spain · ' + esc(c.time || '') + '</span>' +
          '</div>' +
          '<p class="observer-now__weather-value">' + fmt(c.temperature_2m, 1) + '°C</p>' +
          '<p class="observer-now__weather-sub">Feels ' + fmt(c.apparent_temperature, 1) + '°C · Wind ' + fmt(c.wind_speed_10m, 0) + ' km/h · Humidity ' + fmt(c.relative_humidity_2m, 0) + '% · Precip ' + fmt(c.precipitation, 1) + ' mm</p>' +
          '<a class="observer-now__weather-link" href="#observer/weather" data-observer-tab="weather">Full weather view →</a>';
        if (global.FTN.ObserverCorrelation) renderCorrelation(global.FTN.ObserverCorrelation.evaluate(c.precipitation));
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        host.innerHTML = '<span class="observer-status observer-status--external">EXTERNAL</span><p class="observer-now__weather-sub">Live weather connection unavailable right now. <a href="#observer/weather" data-observer-tab="weather">Open Weather view →</a></p>';
        if (global.FTN.ObserverCorrelation) renderCorrelation(global.FTN.ObserverCorrelation.evaluate(null));
      });
  }

  function activateCategory(categoryId, root) {
    var Observer = global.FTN.Observer;
    var valid = Observer.categories.some(function (c) { return c.id === categoryId; });
    if (!valid) categoryId = 'now';

    var tabs = root.querySelectorAll('[data-observer-nav-item]');
    for (var i = 0; i < tabs.length; i++) {
      var isActive = tabs[i].getAttribute('data-observer-nav-item') === categoryId;
      tabs[i].classList.toggle('is-active', isActive);
      tabs[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    var canvas = $('#observer-canvas', root);
    if (!canvas) return;
    canvas.setAttribute('aria-labelledby', 'observer-tab-' + categoryId);
    if (categoryId === 'now') {
      canvas.innerHTML = renderNow();
      loadNowWeather();
    } else {
      canvas.innerHTML = renderCategory(categoryId);
    }
    canvas.setAttribute('data-active-category', categoryId);
  }

  function categoryFromHash() {
    var h = global.location.hash || '';
    var m = h.match(/^#observer\/([a-z-]+)/i);
    return m ? m[1] : 'now';
  }

  function wireInteractions(root) {
    // Image 'error' events don't bubble, so this listener runs in the capture phase to catch
    // a failed radar-image load anywhere inside the canvas without an inline onerror attribute.
    root.addEventListener('error', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG') return;
      var frame = img.closest && img.closest('.observer-card__frame');
      if (frame) frame.innerHTML = '<p class="observer-card__error">Image temporarily unavailable — use the source link below.</p>';
    }, true);

    root.addEventListener('click', function (e) {
      var navItem = e.target.closest && e.target.closest('[data-observer-nav-item]');
      if (navItem) {
        global.location.hash = 'observer/' + navItem.getAttribute('data-observer-nav-item');
        return;
      }
      var jump = e.target.closest && e.target.closest('[data-jump-anchor]');
      if (jump) {
        var target = document.querySelector(jump.getAttribute('data-jump-anchor'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      var refresh = e.target.closest && e.target.closest('[data-refresh-image]');
      if (refresh) {
        var img = refresh.closest('.observer-card').querySelector('img');
        if (img) {
          var base = img.src.split('?')[0];
          img.src = base + '?ftn=' + Date.now();
        }
      }
    });

    document.addEventListener('click', function (e) {
      var tab = e.target.closest && e.target.closest('[data-observer-tab]');
      if (!tab) return;
      var cat = tab.getAttribute('data-observer-tab');
      global.location.hash = 'observer/' + cat;
    });

    global.addEventListener('hashchange', function () {
      activateCategory(categoryFromHash(), root);
    });
  }

  function buildNav(root) {
    var Observer = global.FTN.Observer;
    var nav = $('#observer-nav', root);
    if (!nav) return;
    nav.innerHTML = Observer.categories.map(function (c) {
      return '<button type="button" class="observer-nav__item" role="tab" id="observer-tab-' + esc(c.id) + '" data-observer-nav-item="' + esc(c.id) + '" aria-selected="false" aria-controls="observer-canvas">' +
        '<span class="observer-nav__label">' + esc(c.label) + '</span>' +
      '</button>';
    }).join('');
  }

  function init() {
    var root = $('#observer-console');
    if (!root || !global.FTN || !global.FTN.Observer) return;
    buildNav(root);
    wireInteractions(root);
    activateCategory(categoryFromHash(), root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
