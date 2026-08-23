// FTN Clock — link, beautiful clock immediately, no signup wall, no explanation page first.
// Reuses js/radio-player.js verbatim for audio (mounted into the same .radio-listen container it
// already expects) rather than building a second player, and js/ftn-share.js for Share rather than
// a Clock-only share implementation.
(function (global) {
  'use strict';

  var PREF_KEY = 'ftn-clock-prefs-v1';
  var DEFAULT_PREFS = { style: 'analog', background: 'default', date: true, worldNow: false, radio: false, remember: true };

  function loadPrefs() {
    var storage = global.FTN && global.FTN.storage;
    if (!storage) return Object.assign({}, DEFAULT_PREFS);
    var saved = storage.getJSON(PREF_KEY, null);
    return saved ? Object.assign({}, DEFAULT_PREFS, saved) : Object.assign({}, DEFAULT_PREFS);
  }

  function savePrefs(prefs) {
    var storage = global.FTN && global.FTN.storage;
    if (!storage) return;
    if (prefs.remember) storage.setJSON(PREF_KEY, prefs);
    else storage.remove(PREF_KEY);
  }

  var prefs = loadPrefs();

  // ---- Analog dial ticks (12 major hour ticks + 48 minor minute ticks, drawn once) ----
  function buildTicks() {
    var g = document.getElementById('clock-analog-ticks');
    if (!g) return;
    var html = '';
    for (var i = 0; i < 60; i++) {
      var angle = i * 6;
      var major = i % 5 === 0;
      var r1 = major ? 82 : 88;
      var r2 = 94;
      var rad = (angle - 90) * Math.PI / 180;
      var x1 = 100 + r1 * Math.cos(rad), y1 = 100 + r1 * Math.sin(rad);
      var x2 = 100 + r2 * Math.cos(rad), y2 = 100 + r2 * Math.sin(rad);
      html += '<line class="clock-analog-tick' + (major ? ' clock-analog-tick--major' : '') + '" x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '"></line>';
    }
    g.innerHTML = html;
  }

  // ---- Tick: always recomputed fresh from the real clock, never an incremented counter ----
  function tick() {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();

    var hourEl = document.getElementById('clock-hand-hour');
    var minuteEl = document.getElementById('clock-hand-minute');
    var secondEl = document.getElementById('clock-hand-second');
    if (hourEl) hourEl.style.transform = 'rotate(' + ((h % 12 + m / 60) * 30) + 'deg)';
    if (minuteEl) minuteEl.style.transform = 'rotate(' + ((m + s / 60) * 6) + 'deg)';
    if (secondEl) secondEl.style.transform = 'rotate(' + ((s + ms / 1000) * 6) + 'deg)';

    var digital = document.getElementById('clock-digital-time');
    var meridiem = document.getElementById('clock-digital-meridiem');
    if (digital) {
      var h12 = h % 12 || 12;
      digital.textContent = String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      if (meridiem) meridiem.textContent = h >= 12 ? 'PM' : 'AM';
    }
    var minimal = document.getElementById('clock-minimal-time');
    if (minimal) minimal.textContent = String(h % 12 || 12).padStart(2, '0') + ':' + String(m).padStart(2, '0');

    var dateEl = document.getElementById('clock-date');
    if (dateEl && prefs.date) {
      dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  var WORLD_ZONES = [['Port of Spain', 'America/Port_of_Spain'], ['New York', 'America/New_York'], ['London', 'Europe/London']];

  function renderWorldNow() {
    var root = document.getElementById('clock-worldnow');
    if (!root) return;
    var now = new Date();
    root.innerHTML = WORLD_ZONES.map(function (z) {
      var t = new Intl.DateTimeFormat('en-US', { timeZone: z[1], hour: '2-digit', minute: '2-digit' }).format(now);
      return '<div class="clock-worldnow__item"><span>' + z[0] + '</span><strong>' + t + '</strong></div>';
    }).join('');
  }

  // ---- Apply personalization state to the DOM ----
  function applyPrefs() {
    ['analog', 'digital', 'minimal'].forEach(function (style) {
      var el = document.getElementById('clock-face-' + style);
      if (el) el.hidden = style !== prefs.style;
    });
    document.querySelectorAll('[data-clock-style]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-clock-style') === prefs.style));
    });
    document.querySelectorAll('[data-clock-bg]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-clock-bg') === prefs.background));
    });
    document.getElementById('main').setAttribute('data-clock-bg', prefs.background);

    var dateEl = document.getElementById('clock-date');
    if (dateEl) dateEl.hidden = !prefs.date;
    var worldEl = document.getElementById('clock-worldnow');
    if (worldEl) { worldEl.hidden = !prefs.worldNow; if (prefs.worldNow) renderWorldNow(); }
    var toggleDate = document.getElementById('clock-toggle-date');
    if (toggleDate) toggleDate.setAttribute('aria-pressed', String(prefs.date));
    var toggleWorld = document.getElementById('clock-toggle-worldnow');
    if (toggleWorld) toggleWorld.setAttribute('aria-pressed', String(prefs.worldNow));
    var toggleRadio = document.getElementById('clock-toggle-radio');
    if (toggleRadio) toggleRadio.setAttribute('aria-pressed', String(prefs.radio));
    var toggleRemember = document.getElementById('clock-remember');
    if (toggleRemember) toggleRemember.setAttribute('aria-pressed', String(prefs.remember));

    var radioWrap = document.getElementById('clock-radio');
    if (radioWrap) {
      radioWrap.hidden = !prefs.radio;
      if (prefs.radio) ensureRadio();
    }
  }

  // js/radio-player.js's own DOMContentLoaded listener mounts itself into `.radio-listen`
  // (present in this page's static HTML from first paint, per markup above) automatically -- no
  // second player, no re-invocation needed here. This just mirrors its "ON AIR" title into the
  // compact indicator once it has rendered.
  var radioIndicatorPolled = false;
  function ensureRadio() {
    if (radioIndicatorPolled) return;
    radioIndicatorPolled = true;
    var indicator = document.getElementById('clock-radio-programme');
    var poll = setInterval(function () {
      var title = document.querySelector('.ftn-radio-live__badge--on');
      if (title && title.textContent) {
        if (indicator) indicator.textContent = title.textContent.replace(/^ON AIR\s*·\s*/i, '');
        clearInterval(poll);
      }
    }, 400);
    setTimeout(function () { clearInterval(poll); }, 15000);
  }

  function wirePersonalize() {
    var toggle = document.getElementById('clock-personalize-toggle');
    var panel = document.getElementById('clock-personalize');
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var open = panel.hidden;
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
    document.querySelectorAll('[data-clock-style]').forEach(function (b) {
      b.addEventListener('click', function () { prefs.style = b.getAttribute('data-clock-style'); savePrefs(prefs); applyPrefs(); tick(); });
    });
    document.querySelectorAll('[data-clock-bg]').forEach(function (b) {
      b.addEventListener('click', function () { prefs.background = b.getAttribute('data-clock-bg'); savePrefs(prefs); applyPrefs(); });
    });
    // Real toggle buttons (aria-pressed), matching the already-proven [data-clock-style]/
    // [data-clock-bg] chip pattern above rather than <input type="checkbox">. State is always
    // driven by `prefs` and read back from the button's own aria-pressed attribute.
    function wireToggle(id, onToggle) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(next));
        onToggle(next);
      });
    }
    wireToggle('clock-toggle-date', function (v) { prefs.date = v; savePrefs(prefs); applyPrefs(); tick(); });
    wireToggle('clock-toggle-worldnow', function (v) { prefs.worldNow = v; savePrefs(prefs); applyPrefs(); });
    wireToggle('clock-toggle-radio', function (v) { prefs.radio = v; savePrefs(prefs); applyPrefs(); });
    wireToggle('clock-remember', function (v) { prefs.remember = v; savePrefs(prefs); });

    var radioIndicator = document.getElementById('clock-radio-indicator');
    var radioShell = document.getElementById('clock-radio-shell');
    var expandLabel = document.getElementById('clock-radio-expand-label');
    if (radioIndicator && radioShell) {
      radioIndicator.addEventListener('click', function () {
        radioShell.hidden = !radioShell.hidden;
        if (expandLabel) expandLabel.textContent = radioShell.hidden ? 'Expand' : 'Collapse';
      });
    }
  }

  function wireFullscreen() {
    var btn = document.getElementById('clock-fullscreen-toggle');
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
      document.body.classList.toggle('clock-fullscreen', isFull);
      btn.textContent = isFull ? 'Exit Full Screen' : 'Full Screen';
    });
  }

  function wireShare() {
    var btn = document.getElementById('clock-share');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (global.FTN.Share) {
        global.FTN.Share.open({
          title: 'FTN Clock',
          text: 'FTN Clock — a beautiful clock for any screen. Ambient utility by FTN.',
          url: 'https://ftnplatform.org/clock/'
        });
      }
    });
  }

  function wireInstall() {
    var btn = document.getElementById('clock-install');
    if (!btn) return;
    var deferred = null;
    global.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      btn.hidden = false;
    });
    btn.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; btn.hidden = true; });
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    buildTicks();
    applyPrefs();
    tick();
    setInterval(tick, 250);
    wirePersonalize();
    wireFullscreen();
    wireShare();
    wireInstall();
    if (global.FTN.AmbientHours) {
      global.FTN.AmbientHours.track('clock', { isFullscreen: function () { return document.body.classList.contains('clock-fullscreen'); } });
    }
  });
})(window);
