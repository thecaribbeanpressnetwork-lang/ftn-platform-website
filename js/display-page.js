// FTN Display — one standardized public screen. No account, no setup, no advertising.
// Reuses the existing Indicator Engine, Trust Card, Live Clocks and Media Discovery rather than
// building a second data layer. Every real-time claim here is either a genuine client-side
// computation (clock, time zones) or a value already carried by an existing FTN indicator.
(function (global) {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---- Clock + weather brief ----
  function initClock() {
    var clockEl = document.getElementById('display-clock');
    function tick() {
      if (!clockEl) return;
      clockEl.textContent = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Port_of_Spain', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).format(new Date());
    }
    tick();
    setInterval(tick, 1000);
  }

  function initWeatherBrief() {
    var el = document.getElementById('display-weather-brief');
    if (!el || !global.FTN.getIndicator) return;
    var temp = global.FTN.getIndicator('temperature');
    el.textContent = temp ? ('Port of Spain · ' + temp.value + '°' + (temp.units || 'C')) : 'Port of Spain';
  }

  // ---- National Pulse ----
  var PULSE_IDS = ['national-debt', 'debt-to-gdp', 'recorded-murders', 'inflation', 'fuel-price', 'exchange-rate'];

  function pulseCardHTML(ind) {
    if (!ind) return '';
    var badgeClass = global.FTN.TrustCard ? global.FTN.TrustCard.classificationBadgeClass(ind.classification) : '';
    var valueHTML = ind.isLiveClock
      ? '<span data-live-clock="' + esc(ind.id) + '">' + esc(ind.value) + '</span>'
      : esc(ind.value);
    var noValue = ind.value === '—' || ind.value === '-';
    return (
      '<article class="pulse-card' + (noValue ? ' pulse-card--empty' : '') + '">' +
        '<p class="pulse-card__label">' + esc(ind.title) + '</p>' +
        '<p class="pulse-card__value">' + valueHTML + (ind.units && !noValue ? ' <span>' + esc(ind.units) + '</span>' : '') + '</p>' +
        (noValue ? '<p class="pulse-card__note">Not yet available — no fabricated figure.</p>' : '') +
        '<div class="pulse-card__meta">' +
          '<span class="trust-badge ' + badgeClass + '">' + esc(ind.classification) + '</span>' +
          '<button type="button" class="trust-trigger trust-trigger--on-dark" data-trust-card="' + esc(ind.id) + '">Trust Card</button>' +
        '</div>' +
      '</article>'
    );
  }

  function renderPulse() {
    var root = document.getElementById('display-pulse');
    if (!root || !global.FTN.getIndicator) return;
    root.innerHTML = PULSE_IDS.map(function (id) { return pulseCardHTML(global.FTN.getIndicator(id)); }).join('');
    root.querySelectorAll('[data-trust-card]').forEach(function (btn) {
      btn.addEventListener('click', function () { global.FTN.TrustCard.open(btn.getAttribute('data-trust-card')); });
    });
  }

  // ---- Live Conditions ----
  var CONDITION_IDS = ['flood-alerts', 'utility-outages', 'traffic-index'];

  function renderConditions() {
    var root = document.getElementById('display-conditions-body');
    if (!root || !global.FTN.getIndicator) return;
    var rows = CONDITION_IDS.map(function (id) {
      var ind = global.FTN.getIndicator(id);
      if (!ind) return '';
      return '<div class="condition-row"><span>' + esc(ind.title) + '</span><strong>' + esc(ind.value) + ' ' + esc(ind.units) + '</strong></div>';
    }).join('');
    root.innerHTML = rows || '<p>No condition signals available right now.</p>';
  }

  // ---- FTN TV NOW ----
  function renderTvNow() {
    var frame = document.getElementById('display-tv-frame');
    var titleEl = document.getElementById('display-tv-title');
    var sourceEl = document.getElementById('display-tv-source');
    var nextList = document.getElementById('display-next-list');
    if (!frame || !global.FTN.MediaDiscovery) return;
    global.FTN.MediaDiscovery.discover({ mode: 'video', queries: ['Trinidad and Tobago news today', 'Trinidad Tobago live now'], limit: 20 }, { force: true })
      .then(function (d) {
        var items = (d && d.results) || [];
        if (!items.length) {
          titleEl.textContent = 'No embeddable source available right now';
          sourceEl.textContent = 'FTN TV NOW will resume once an authorized source is found.';
          nextList.innerHTML = '<li class="display-next__empty">Nothing queued.</li>';
          return;
        }
        var first = items[0];
        frame.src = 'https://www.youtube.com/embed/' + encodeURIComponent(first.videoId) + '?autoplay=1&mute=1&rel=0&playsinline=1';
        titleEl.textContent = first.title || 'FTN TV NOW';
        sourceEl.textContent = (first.channel || 'YouTube') + ' · authorized public embed';
        nextList.innerHTML = items.slice(1, 4).map(function (it) {
          return '<li><strong>' + esc(it.title || 'Untitled') + '</strong><span>' + esc(it.channel || '') + '</span></li>';
        }).join('') || '<li class="display-next__empty">Nothing queued.</li>';
      })
      .catch(function () {
        titleEl.textContent = 'FTN TV NOW is temporarily unavailable';
        sourceEl.textContent = 'Discovery could not be completed just now.';
      });
  }

  // ---- World Now ----
  var ZONES = [
    ['Port of Spain', 'America/Port_of_Spain'],
    ['Kingston', 'America/Jamaica'],
    ['London', 'Europe/London'],
    ['New York', 'America/New_York'],
  ];

  function renderWorldZones() {
    var root = document.getElementById('display-world-zones');
    if (!root) return;
    function paint() {
      root.innerHTML = ZONES.map(function (z) {
        var t = new Intl.DateTimeFormat('en-US', { timeZone: z[1], hour: '2-digit', minute: '2-digit' }).format(new Date());
        return '<div class="world-zone"><span>' + esc(z[0]) + '</span><strong>' + esc(t) + '</strong></div>';
      }).join('');
    }
    paint();
    setInterval(paint, 30000);
  }

  function renderWorldEconomy() {
    var root = document.getElementById('display-world-economy');
    if (!root || !global.FTN.getIndicator) return;
    var fx = global.FTN.getIndicator('exchange-rate');
    root.innerHTML =
      '<div class="world-economy__row"><span>USD/TTD</span><strong>' + (fx ? esc(fx.value) : '—') + '</strong></div>' +
      '<div class="world-economy__row world-economy__row--muted"><span>CAD, GBP, EUR</span><strong>Not yet available</strong></div>';
  }

  // ---- Full screen ----
  function initFullscreen() {
    var btn = document.getElementById('display-fullscreen-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen || function () {}).call(document.documentElement).catch(function () {});
      } else {
        (document.exitFullscreen || function () {}).call(document);
      }
    });
    document.addEventListener('fullscreenchange', function () {
      var isFull = !!document.fullscreenElement;
      document.body.classList.toggle('display-fullscreen', isFull);
      btn.textContent = isFull ? 'Exit Full Screen' : 'Full Screen';
      if (global.FTN.DisplayPresence) global.FTN.DisplayPresence.setFullscreen(isFull);
    });
  }

  // ---- Anonymous aggregate presence (Supabase Realtime Presence; no account, no PII) ----
  function initPresence() {
    if (!global.FTN.DisplayPresenceChannel) return;
    var fullscreen = false;
    global.FTN.DisplayPresenceChannel.connect().then(function (channel) {
      channel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') channel.track({ fullscreen: fullscreen, joinedAt: Date.now() });
      });
      global.FTN.DisplayPresence = {
        setFullscreen: function (v) { fullscreen = v; try { channel.track({ fullscreen: fullscreen, joinedAt: Date.now() }); } catch (e) {} },
      };
    }).catch(function () { /* Presence is a nice-to-have; the screen works fully without it. */ });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    initClock();
    initWeatherBrief();
    renderPulse();
    renderConditions();
    renderTvNow();
    renderWorldZones();
    renderWorldEconomy();
    initFullscreen();
    initPresence();
  });
})(window);
