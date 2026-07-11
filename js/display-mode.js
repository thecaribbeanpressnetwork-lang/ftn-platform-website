// FTN Platform Website — Fullscreen Display Mode + background promotion layer.
//
// Shared, reusable "kiosk/TV" runtime — not Observatory-specific. Any future
// display surface can call FTN.DisplayMode.enter()/exit() and get the same
// fullscreen chrome (screen name, clock, last-refresh, background
// promotion). Requires an element with id="display-mode-root" to toggle
// classes on, and a #bg-promotion mount for the low-opacity rotator.
(function (global) {
  'use strict';

  var ROTATION_MS = 9000;
  var rotationTimer = null;

  // The "golden-ratio" framing from founder direction: the background layer
  // never competes with data for attention — a slow, near-subliminal
  // crossfade well under the threshold of a normal ad banner.
  var PROMOTIONS = [
    { id: 'face-the-nation', render: function () {
      return '<div class="bg-promotion__item bg-promotion__item--logo">' +
        '<svg viewBox="0 0 220 40" width="260" aria-hidden="true">' +
          '<text x="0" y="30" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="30" fill="#E10613">FTN</text>' +
          '<line x1="62" y1="6" x2="62" y2="34" stroke="#3A3A3A" stroke-width="1"></line>' +
          '<text x="74" y="27" font-family="Montserrat, Arial, sans-serif" font-weight="700" font-size="17" letter-spacing="0.5" fill="#FFFFFF">FACE THE NATION</text>' +
        '</svg>' +
        '<p>Coming Soon</p>' +
      '</div>';
    } },
    { id: 'community-connect', render: function () {
      return '<div class="bg-promotion__item">' +
        '<p class="bg-promotion__headline">Download Community Connect</p>' +
        '<p>Available soon on Google Play and the App Store</p>' +
      '</div>';
    } },
    { id: 'powered-by-ftn', render: function () {
      return '<div class="bg-promotion__item">' +
        '<p class="bg-promotion__headline">Powered by FTN</p>' +
        '<p>The operating system for community intelligence</p>' +
      '</div>';
    } },
  ];

  function startBackgroundPromotion() {
    var mount = document.getElementById('bg-promotion');
    if (!mount) return;
    var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var i = 0;

    function show() {
      mount.innerHTML = PROMOTIONS[i].render();
      i = (i + 1) % PROMOTIONS.length;
    }
    show();

    if (!reduceMotion) {
      rotationTimer = setInterval(show, ROTATION_MS);
    }
  }

  function stopBackgroundPromotion() {
    if (rotationTimer) clearInterval(rotationTimer);
    rotationTimer = null;
    var mount = document.getElementById('bg-promotion');
    if (mount) mount.innerHTML = '';
  }

  function updateChrome() {
    var cfg = global.FTN.DisplayConfig ? global.FTN.DisplayConfig.load() : { screenName: 'FTN Live Display' };
    var nameEl = document.getElementById('display-mode-screen-name');
    if (nameEl) nameEl.textContent = cfg.screenName;
    var clockEl = document.getElementById('display-mode-clock');
    if (clockEl) clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var idEl = document.getElementById('display-mode-config-id');
    if (idEl) idEl.textContent = cfg.venue ? cfg.venue + ' · ' + cfg.density : 'custom';
  }

  var chromeTimer = null;

  function enter() {
    var root = document.documentElement;
    var request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
    if (request) {
      try { request.call(root); } catch (e) { /* fullscreen may be blocked (e.g. iframe) — degrade gracefully */ }
    }
    document.body.classList.add('display-mode');
    updateChrome();
    chromeTimer = setInterval(updateChrome, 1000);
    startBackgroundPromotion();
  }

  function exit() {
    var exitFn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (document.fullscreenElement && exitFn) {
      try { exitFn.call(document); } catch (e) { /* noop */ }
    }
    document.body.classList.remove('display-mode');
    if (chromeTimer) clearInterval(chromeTimer);
    stopBackgroundPromotion();
  }

  function initToggle(buttonId, exitButtonId) {
    var btn = document.getElementById(buttonId);
    if (btn) {
      btn.addEventListener('click', function () {
        if (document.body.classList.contains('display-mode')) exit(); else enter();
      });
    }

    var exitBtn = exitButtonId ? document.getElementById(exitButtonId) : null;
    if (exitBtn) {
      exitBtn.addEventListener('click', exit);
    }

    // Sync UI state if the user exits fullscreen with Escape rather than
    // our own button (browsers fire this regardless of which control was used).
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && document.body.classList.contains('display-mode')) {
        exit();
      }
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.DisplayMode = { enter: enter, exit: exit, initToggle: initToggle };
})(window);
