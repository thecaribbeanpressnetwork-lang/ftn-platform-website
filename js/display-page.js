// FTN Display — one standardized public screen. No account, no setup, no advertising.
// Reuses the existing Indicator Engine, Trust Card, Live Clocks and Media Discovery rather than
// building a second data layer. Every real-time claim here is either a genuine client-side
// computation (clock, time zones) or a value already carried by an existing FTN indicator.
(function (global) {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function scoreClass(ind) {
    return global.FTN.TrustCard ? global.FTN.TrustCard.trustScoreBadgeClass(ind) : '';
  }

  function scoreLabel(ind) {
    return global.FTN.TrustCard ? global.FTN.TrustCard.trustScoreLabel(ind) : 'Open Trust Score';
  }

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
    var badgeClass = scoreClass(ind);
    var valueHTML = ind.isLiveClock
      ? '<span data-live-clock="' + esc(ind.id) + '">' + esc(ind.value) + '</span>'
      : esc(ind.value);
    var noValue = ind.value === '—' || ind.value === '-';
    var hasMath = global.FTN.TrustCard && !!global.FTN.TrustCard.mathContentHTML(ind);
    return (
      '<article class="pulse-card ftn-motion-lift' + (noValue ? ' pulse-card--empty' : '') + '">' +
        '<p class="pulse-card__label">' + esc(ind.title) + '</p>' +
        '<p class="pulse-card__value">' + valueHTML + (ind.units && !noValue ? ' <span>' + esc(ind.units) + '</span>' : '') + '</p>' +
        (noValue ? '<p class="pulse-card__note">Not yet available — no fabricated figure.</p>' : '') +
        '<div class="pulse-card__meta">' +
          '<span class="trust-badge ' + badgeClass + '">' + esc(scoreLabel(ind)) + '</span>' +
          '<button type="button" class="trust-trigger trust-trigger--on-dark" data-trust-card="' + esc(ind.id) + '">Open Trust Score</button>' +
          (hasMath ? '<button type="button" class="trust-trigger trust-trigger--on-dark" data-see-math="' + esc(ind.id) + '">See the Math →</button>' : '') +
        '</div>' +
      '</article>'
    );
  }

  // ---- See the Math (modelled/derived Pulse figures) ----
  // Reuses FTN.TrustCard's own real clock formula (never re-derives it) but surfaces it in the
  // shared FTN.Sheet as a dedicated, unmissable entry point instead of a collapsed <details>
  // buried inside the Trust Card modal -- the Trust Card's own copy stays exactly as-is, this is
  // an additional, more prominent path to the identical math for Display specifically.
  function openSeeMath(id) {
    var ind = global.FTN.getIndicator ? global.FTN.getIndicator(id) : null;
    var Sheet = global.FTN.Sheet;
    if (!ind || !Sheet || !global.FTN.TrustCard) return;
    var content = global.FTN.TrustCard.mathContentHTML(ind);
    if (!content) return;
    Sheet.open({
      id: 'display-math-sheet',
      labelledBy: 'display-math-title',
      render: function (panel) {
        panel.innerHTML =
          '<button type="button" class="ftn-sheet__close" data-sheet-close aria-label="Close">&times;</button>' +
          '<p class="display-customize__eyebrow">SEE THE MATH</p>' +
          '<h2 id="display-math-title" class="display-customize__title">' + esc(ind.title) + '</h2>' +
          '<div class="display-math">' + content + '</div>' +
          '<p class="display-math__note">This interpolation is not a second independently measured figure. Full methodology and source: open its Trust Score.</p>';
        panel.querySelector('[data-sheet-close]').addEventListener('click', function () { Sheet.close(); });
      }
    });
  }

  function renderPulse() {
    var root = document.getElementById('display-pulse');
    if (!root || !global.FTN.getIndicator) return;
    root.innerHTML = PULSE_IDS.map(function (id) { return pulseCardHTML(global.FTN.getIndicator(id)); }).join('');
    root.querySelectorAll('[data-trust-card]').forEach(function (btn) {
      btn.addEventListener('click', function () { global.FTN.TrustCard.open(btn.getAttribute('data-trust-card')); });
    });
    root.querySelectorAll('[data-see-math]').forEach(function (btn) {
      btn.addEventListener('click', function () { openSeeMath(btn.getAttribute('data-see-math')); });
    });
  }

  // ---- Live Conditions ----
  // Unlike National Pulse, this panel used to render bare numbers with no classification badge
  // and no Trust Card link -- on a commercial public screen that's a genuine truth-in-data gap
  // (founder walkthrough defect #7), not just an inconsistency: a passerby had no way to tell
  // these were Illustrative placeholder figures rather than a live feed. Brought in line with
  // Pulse's own badge + Trust Card pattern; never fabricates a classification the indicator
  // itself doesn't already carry.
  var CONDITION_IDS = ['flood-alerts', 'utility-outages', 'traffic-index'];

  function classificationRowHTML(ind) {
    var badgeClass = scoreClass(ind);
    var noValue = ind.value === '—' || ind.value === '-';
    return (
      '<div class="condition-row' + (noValue ? ' condition-row--empty' : '') + '">' +
        '<span>' + esc(ind.title) + '</span>' +
        (noValue
          ? '<span class="condition-row__note">Not yet available</span>'
          : '<strong>' + esc(ind.value) + ' ' + esc(ind.units) + '</strong>') +
        '<span class="trust-badge ' + badgeClass + '">' + esc(scoreLabel(ind)) + '</span>' +
        '<button type="button" class="trust-trigger trust-trigger--on-dark" data-trust-card="' + esc(ind.id) + '">Open Trust Score</button>' +
      '</div>'
    );
  }

  function renderConditions() {
    var root = document.getElementById('display-conditions-body');
    if (!root || !global.FTN.getIndicator) return;
    var rows = CONDITION_IDS.map(function (id) {
      var ind = global.FTN.getIndicator(id);
      return ind ? classificationRowHTML(ind) : '';
    }).join('');
    root.innerHTML = rows || '<p>No condition signals available right now.</p>';
    root.querySelectorAll('[data-trust-card]').forEach(function (btn) {
      btn.addEventListener('click', function () { global.FTN.TrustCard.open(btn.getAttribute('data-trust-card')); });
    });
  }

  // ---- FTN TV NOW ----
  // Uses the one shared FTN Media Fallback resolver (js/ftn-media-fallback.js) rather than
  // blindly embedding the first discovery result -- if a candidate is private/deleted/non-
  // embeddable, it advances to the next one automatically, and only falls back to the honest
  // Face The Nation house slate once every real candidate has been tried.
  function renderTvNow() {
    var frame = document.getElementById('display-tv-frame');
    var titleEl = document.getElementById('display-tv-title');
    var sourceEl = document.getElementById('display-tv-source');
    var nextList = document.getElementById('display-next-list');
    var playerEl = document.querySelector('.display-tvnow__player');
    if (!frame || !global.FTN.MediaDiscovery) return;
    global.FTN.MediaDiscovery.discover({ mode: 'video', queries: ['Trinidad and Tobago news today', 'Trinidad Tobago live now'], limit: 20 }, { force: true })
      .then(async function (d) {
        var items = (d && d.results) || [];
        if (!items.length) { showHouseFallback(); return; }
        var playable = global.FTN.MediaFallback
          ? await global.FTN.MediaFallback.resolveFirstPlayable(frame, items, 6000)
          : items[0];
        if (!playable) { showHouseFallback(); return; }
        titleEl.textContent = playable.title || 'FTN TV NOW';
        sourceEl.textContent = (playable.channel || 'YouTube') + ' · authorized public embed';
        var rest = items.filter(function (it) { return it.videoId !== playable.videoId; });
        nextList.innerHTML = rest.slice(0, 3).map(function (it) {
          return '<li><strong>' + esc(it.title || 'Untitled') + '</strong><span>' + esc(it.channel || '') + '</span></li>';
        }).join('') || '<li class="display-next__empty">Nothing queued.</li>';
      })
      .catch(function () { showHouseFallback(); });

    function showHouseFallback() {
      if (playerEl && global.FTN.MediaFallback) playerEl.innerHTML = global.FTN.MediaFallback.houseFallbackHTML();
      else { titleEl.textContent = 'FTN TV NOW is temporarily unavailable'; sourceEl.textContent = 'Discovery could not be completed just now.'; }
      if (nextList) nextList.innerHTML = '<li class="display-next__empty">Nothing queued.</li>';
    }
  }

  // ---- World Now ----
  // Real IANA zones, dynamically computed and dynamically grouped -- never a hard-coded
  // "these cities always match" assumption, per the brief's own DST caution. Cities that
  // currently share an identical local time (e.g. New York/Toronto/Miami on US Eastern Time)
  // are combined into one display entry instead of repeating the same time three times; if a
  // future DST edge case ever splits them, they simply render as separate entries again.
  var ZONE_CITIES = [
    ['Port of Spain', 'America/Port_of_Spain'],
    ['New York', 'America/New_York'],
    ['Toronto', 'America/Toronto'],
    ['Miami', 'America/New_York'],
    ['Los Angeles', 'America/Los_Angeles'],
    ['Vancouver', 'America/Vancouver'],
    ['London', 'Europe/London'],
    ['Beijing', 'Asia/Shanghai'],
  ];

  function renderWorldZones() {
    var root = document.getElementById('display-world-zones');
    if (!root) return;
    function paint() {
      var now = new Date();
      var byTime = {};
      var order = [];
      ZONE_CITIES.forEach(function (c) {
        var t = new Intl.DateTimeFormat('en-US', { timeZone: c[1], hour: '2-digit', minute: '2-digit' }).format(now);
        if (!byTime[t]) { byTime[t] = []; order.push(t); }
        if (byTime[t].indexOf(c[0]) === -1) byTime[t].push(c[0]);
      });
      root.innerHTML = order.map(function (t) {
        var label = byTime[t].length > 1 ? byTime[t].slice(0, 2).join(' / ') + (byTime[t].length > 2 ? ' + more' : '') : byTime[t][0];
        return '<div class="world-zone"><span>' + esc(label) + '</span><strong>' + esc(t) + '</strong></div>';
      }).join('');
    }
    paint();
    setInterval(paint, 30000);
  }

  function renderWorldEconomy() {
    var root = document.getElementById('display-world-economy');
    if (!root || !global.FTN.getIndicator) return;
    var fx = global.FTN.getIndicator('exchange-rate');
    var badgeClass = fx ? scoreClass(fx) : '';
    root.innerHTML =
      '<div class="world-economy__row">' +
        '<span>USD/TTD</span><strong>' + (fx ? esc(fx.value) : '—') + '</strong>' +
        (fx ? '<span class="trust-badge ' + badgeClass + '">' + esc(scoreLabel(fx)) + '</span><button type="button" class="trust-trigger trust-trigger--on-dark" data-trust-card="' + esc(fx.id) + '">Open Trust Score</button>' : '') +
      '</div>' +
      '<div class="world-economy__row world-economy__row--muted"><span>CAD, GBP, EUR</span><strong>Not yet available</strong></div>';
    root.querySelectorAll('[data-trust-card]').forEach(function (btn) {
      btn.addEventListener('click', function () { global.FTN.TrustCard.open(btn.getAttribute('data-trust-card')); });
    });
  }

  // ---- Fullscreen rotation ----
  // The single-screen fullscreen composition (css/components/display.css) has one tertiary
  // "rotate" grid slot shared by Live Conditions, What's Happening, Community and World Now --
  // showing all four stacked would force a scrollbar, defeating the point of fullscreen. Cycles
  // through real, already-rendered panels; never invents content or reloads the page. Re-entrant
  // (setupRotation, not a one-shot init) because Customize can change which modules exist to
  // rotate through, or switch to Dense density where every module is shown at once and rotation
  // has nothing to do.
  var rotationState = null;

  function teardownRotation() {
    if (!rotationState) return;
    if (rotationState.state.timer) global.clearInterval(rotationState.state.timer);
    global.clearTimeout(rotationState.state.resumeTimer);
    rotationState.listeners.forEach(function (rec) { rec.el.removeEventListener(rec.type, rec.fn); });
    rotationState = null;
  }

  function setupRotation() {
    teardownRotation();
    var toggle = document.getElementById('display-rotate-toggle');
    var density = global.FTN.DisplayCustomize ? global.FTN.DisplayCustomize.getDensity() : 'focus';
    if (density === 'dense') {
      if (toggle) toggle.hidden = true;
      return;
    }
    var candidates = Array.prototype.slice.call(document.querySelectorAll('.display-grid .display-panel, .display-world'))
      .filter(function (el) { return !el.classList.contains('display-module-hidden'); });
    if (!candidates.length) { if (toggle) toggle.hidden = true; return; }
    var idx = 0, paused = false, listeners = [];
    var state = { timer: null, resumeTimer: null };
    var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(i) {
      candidates.forEach(function (el, j) { el.classList.toggle('is-rotate-active', j === i); });
    }
    function tick() { idx = (idx + 1) % candidates.length; show(idx); }
    function start() { if (state.timer || reduceMotion || paused) return; state.timer = global.setInterval(tick, 8000); }
    function stop() { if (state.timer) { global.clearInterval(state.timer); state.timer = null; } }
    show(0);
    start();

    function on(el, type, fn) { el.addEventListener(type, fn); listeners.push({ el: el, type: type, fn: fn }); }

    if (toggle) toggle.hidden = !document.body.classList.contains('display-fullscreen');
    if (toggle) {
      on(toggle, 'click', function () {
        paused = !paused;
        toggle.textContent = paused ? '▶' : '⏸';
        toggle.setAttribute('aria-label', paused ? 'Resume module rotation' : 'Pause module rotation');
        toggle.setAttribute('aria-pressed', String(paused));
        if (paused) stop(); else start();
      });
    }

    if (!reduceMotion) {
      // Real interaction pause, not decoration: a click/tap/keyboard focus inside the rotating
      // panel (e.g. opening its Trust Card) shouldn't have the ground shift from under it mid-read.
      // Auto-resumes 15s after the interaction ends, unless the user has explicitly paused via the
      // toggle above.
      candidates.forEach(function (el) {
        on(el, 'pointerenter', function () { stop(); });
        on(el, 'focusin', function () { stop(); });
        on(el, 'pointerleave', function () {
          if (paused) return;
          global.clearTimeout(state.resumeTimer);
          state.resumeTimer = global.setTimeout(start, 15000);
        });
        on(el, 'focusout', function () {
          if (paused) return;
          global.clearTimeout(state.resumeTimer);
          state.resumeTimer = global.setTimeout(start, 15000);
        });
      });
    }

    rotationState = { state: state, listeners: listeners };
  }

  // ---- Customize: module visibility + density (Focus / Dense) ----
  // Presentation densities per the founder walkthrough: FOCUS (default) is the six-real-module
  // view above, with a rotating tertiary slot. DENSE ("information wall") shows every visible
  // module at once in a tighter grid, no rotation -- an airport/newsroom-board feel built from
  // the same six real modules, not a fabricated larger module count. Module visibility and
  // presets both operate on the same six real Display modules; a preset is just a saved module
  // set, never a module that doesn't exist elsewhere on this page.
  var DISPLAY_MODULES = [
    { id: 'pulse', selector: '#display-pulse', label: 'National Pulse (KPIs)' },
    { id: 'tv', selector: '.display-tvnow', label: 'FTN TV NOW' },
    { id: 'conditions', selector: '#display-conditions', label: 'Live Conditions' },
    { id: 'whats-happening', selector: '#display-whats-happening', label: 'What’s Happening' },
    { id: 'community', selector: '#display-community', label: 'Community' },
    { id: 'world', selector: '.display-world', label: 'World Now' },
  ];
  var DISPLAY_PRESETS = [
    { id: 'general', label: 'General', modules: ['pulse', 'tv', 'conditions', 'whats-happening', 'community', 'world'] },
    { id: 'newsroom', label: 'Newsroom', modules: ['tv', 'whats-happening', 'conditions', 'world'] },
    { id: 'business', label: 'Business', modules: ['pulse', 'world', 'tv'] },
    { id: 'civic', label: 'Civic', modules: ['whats-happening', 'conditions', 'community', 'pulse'] },
  ];
  var ALL_MODULE_IDS = DISPLAY_MODULES.map(function (m) { return m.id; });
  var MODULES_KEY = 'ftn_display_modules_v1';
  var DENSITY_KEY = 'ftn_display_density_v1';

  function initCustomize() {
    var toggleBtn = document.getElementById('display-customize-toggle');
    if (!toggleBtn || !global.FTN.Sheet) return;

    var activeModules = loadModules();
    var density = loadDensity();

    function loadModules() {
      try {
        var raw = JSON.parse(localStorage.getItem(MODULES_KEY));
        if (Array.isArray(raw) && raw.length) return raw.filter(function (id) { return ALL_MODULE_IDS.indexOf(id) !== -1; });
      } catch (e) {}
      return ALL_MODULE_IDS.slice();
    }
    function loadDensity() {
      var v = null;
      try { v = localStorage.getItem(DENSITY_KEY); } catch (e) {}
      return v === 'dense' ? 'dense' : 'focus';
    }
    function saveModules() { try { localStorage.setItem(MODULES_KEY, JSON.stringify(activeModules)); } catch (e) {} }
    function saveDensity() { try { localStorage.setItem(DENSITY_KEY, density); } catch (e) {} }

    function applyModules() {
      DISPLAY_MODULES.forEach(function (m) {
        var el = document.querySelector(m.selector);
        if (!el) return;
        el.classList.toggle('display-module-hidden', activeModules.indexOf(m.id) === -1);
      });
      setupRotation();
    }
    function applyDensity() {
      document.body.setAttribute('data-display-density', density);
      setupRotation();
    }

    global.FTN.DisplayCustomize = {
      getDensity: function () { return density; },
      getModules: function () { return activeModules.slice(); },
    };

    applyModules();
    applyDensity();

    function matchingPresetId() {
      var sorted = activeModules.slice().sort().join(',');
      var found = DISPLAY_PRESETS.filter(function (p) { return p.modules.slice().sort().join(',') === sorted; })[0];
      return found ? found.id : 'custom';
    }

    function renderPanel(panel) {
      var currentPreset = matchingPresetId();
      panel.innerHTML =
        '<button type="button" class="ftn-sheet__close" data-sheet-close aria-label="Close">&times;</button>' +
        '<p class="display-customize__eyebrow">FTN DISPLAY</p>' +
        '<h2 id="display-customize-title" class="display-customize__title">Customize this screen</h2>' +
        '<div class="display-customize">' +
          '<fieldset class="display-customize__group">' +
            '<legend>Presentation density</legend>' +
            '<label class="display-customize__radio"><input type="radio" name="display-density" value="focus"' + (density === 'focus' ? ' checked' : '') + '> Focus — fewer modules, larger, tertiary panel rotates</label>' +
            '<label class="display-customize__radio"><input type="radio" name="display-density" value="dense"' + (density === 'dense' ? ' checked' : '') + '> Dense (Information Wall) — every visible module shown at once</label>' +
          '</fieldset>' +
          '<fieldset class="display-customize__group">' +
            '<legend>Preset</legend>' +
            '<div class="display-customize__presets">' +
              DISPLAY_PRESETS.map(function (p) {
                return '<button type="button" class="btn btn-outline btn-sm display-customize__preset' + (currentPreset === p.id ? ' is-active' : '') + '" data-preset="' + p.id + '">' + esc(p.label) + '</button>';
              }).join('') +
            '</div>' +
          '</fieldset>' +
          '<fieldset class="display-customize__group">' +
            '<legend>Modules shown</legend>' +
            DISPLAY_MODULES.map(function (m) {
              return '<label class="display-customize__check"><input type="checkbox" data-module="' + m.id + '"' + (activeModules.indexOf(m.id) !== -1 ? ' checked' : '') + '> ' + esc(m.label) + '</label>';
            }).join('') +
          '</fieldset>' +
          '<p class="display-customize__note">Choices are saved on this screen only — no account, no server-side config.</p>' +
        '</div>';

      panel.querySelector('[data-sheet-close]').addEventListener('click', function () { global.FTN.Sheet.close(); });
      panel.querySelectorAll('input[name="display-density"]').forEach(function (input) {
        input.addEventListener('change', function () {
          density = input.value === 'dense' ? 'dense' : 'focus';
          saveDensity();
          applyDensity();
        });
      });
      panel.querySelectorAll('[data-preset]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var preset = DISPLAY_PRESETS.filter(function (p) { return p.id === btn.getAttribute('data-preset'); })[0];
          if (!preset) return;
          activeModules = preset.modules.slice();
          saveModules();
          applyModules();
          renderPanel(panel);
        });
      });
      panel.querySelectorAll('input[data-module]').forEach(function (input) {
        input.addEventListener('change', function () {
          var id = input.getAttribute('data-module');
          if (input.checked) {
            if (activeModules.indexOf(id) === -1) activeModules.push(id);
          } else {
            // At least one module must stay visible -- an empty Display isn't a valid state.
            if (activeModules.length <= 1) { input.checked = true; return; }
            activeModules = activeModules.filter(function (mId) { return mId !== id; });
          }
          saveModules();
          applyModules();
          var presetButtons = panel.querySelectorAll('[data-preset]');
          var current = matchingPresetId();
          presetButtons.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-preset') === current); });
        });
      });
    }

    toggleBtn.addEventListener('click', function () {
      global.FTN.Sheet.open({ id: 'display-customize-sheet', labelledBy: 'display-customize-title', render: renderPanel });
    });
  }

  // ---- Bottom information ticker (fullscreen only; built from data already on screen) ----
  function renderTicker() {
    var track = document.getElementById('display-ticker-track');
    if (!track) return;
    var parts = [];
    var titleEl = document.getElementById('display-tv-title');
    if (titleEl && titleEl.textContent && titleEl.textContent.indexOf('…') === -1) parts.push('FTN TV NOW: ' + titleEl.textContent);
    if (global.FTN.getIndicator) {
      PULSE_IDS.forEach(function (id) {
        var ind = global.FTN.getIndicator(id);
        if (ind && ind.value !== '—' && ind.value !== '-') parts.push(ind.title + ': ' + ind.value + (ind.units ? ' ' + ind.units : ''));
      });
    }
    parts.push('FTN Kaiso — current reporting');
    parts.push('FTN Parliament — public records');
    parts.push('FTN Observer — full investigation deck');
    track.textContent = parts.join('     ·     ');
  }

  // ---- Orientation (Auto / Landscape / Portrait) ----
  // Auto follows the real viewport via the CSS `(orientation: portrait)` media query in
  // display.css. Landscape/Portrait are explicit overrides for commercial screens whose hardware
  // rotates the panel without changing the resolution the browser reports -- a real deployment
  // need, not a decorative toggle. Persisted so a screen keeps its setting across reloads/power
  // cycles without anyone re-configuring it on site.
  var ORIENTATION_KEY = 'ftn_display_orientation_v1';

  function initOrientation() {
    var opts = Array.prototype.slice.call(document.querySelectorAll('[data-orientation-option]'));
    if (!opts.length) return;

    function apply(mode) {
      document.body.setAttribute('data-display-orientation', mode);
      opts.forEach(function (btn) {
        var active = btn.getAttribute('data-orientation-option') === mode;
        btn.setAttribute('aria-pressed', String(active));
        btn.classList.toggle('is-active', active);
      });
    }

    var saved = null;
    try { saved = localStorage.getItem(ORIENTATION_KEY); } catch (e) {}
    apply(saved === 'landscape' || saved === 'portrait' ? saved : 'auto');

    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-orientation-option') || 'auto';
        apply(mode);
        try { localStorage.setItem(ORIENTATION_KEY, mode); } catch (e) {}
      });
    });
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
      setupRotation();
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
    initOrientation();
    initFullscreen();
    initPresence();
    initCustomize();
    setupRotation();
    renderTicker();
    setTimeout(renderTicker, 3000);
    setInterval(renderTicker, 60000);
    if (global.FTN.AmbientHours) {
      global.FTN.AmbientHours.track('display', { isFullscreen: function () { return document.body.classList.contains('display-fullscreen'); } });
    }
  });
})(window);
