// FTN Platform Website — global Platform Mode (Presentation Mode / Live Mode).
//
// One flag, read the same way by every flagship platform. Presentation Mode and Live Mode
// share identical layouts, navigation, workflows and interactions — the only thing that is
// ever allowed to differ is which datasource a page resolves through js/data-source.js. This
// file owns the flag itself: persistence, the deliberate-entry URL parameter, and the DOM/event
// hooks the floating control (js/presentation-control.js) and any future engine consult.
//
// Loads first, before every other script, so the mode is settled before anything else on the
// page asks for it.
(function (global) {
  'use strict';

  var STORAGE_KEY = 'ftn-platform-mode';
  var VALID_MODES = { live: true, presentation: true };

  function readStored() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      return VALID_MODES[raw] ? raw : 'live';
    } catch (e) {
      return 'live';
    }
  }

  var current = readStored();

  function applyToDocument(mode) {
    if (global.document && global.document.documentElement) {
      global.document.documentElement.setAttribute('data-platform-mode', mode);
    }
  }

  function get() {
    return current;
  }

  function set(mode) {
    if (!VALID_MODES[mode] || mode === current) return current;
    current = mode;
    try { global.localStorage.setItem(STORAGE_KEY, mode); } catch (e) { /* private browsing, quota, etc. */ }
    applyToDocument(current);
    try {
      global.dispatchEvent(new CustomEvent('ftn:platform-mode-changed', { detail: { mode: current } }));
    } catch (e) { /* CustomEvent unsupported — mode still changed, just not broadcast */ }
    return current;
  }

  function isPresentation() { return current === 'presentation'; }
  function isLive() { return current === 'live'; }

  // Deliberate entry point: following/typing a link with ?mode=presentation or ?mode=live is
  // the "intentional action through the normal interface" the mode switch requires. The
  // parameter is consumed once and stripped from the URL so it never gets bookmarked/shared as
  // if it were a permanent part of the address.
  (function consumeEntryParam() {
    try {
      var params = new URLSearchParams(global.location.search);
      var requested = params.get('mode');
      if (VALID_MODES[requested]) {
        current = requested;
        try { global.localStorage.setItem(STORAGE_KEY, requested); } catch (e) { /* noop */ }
        params.delete('mode');
        var query = params.toString();
        var cleanUrl = global.location.pathname + (query ? '?' + query : '') + global.location.hash;
        if (global.history && global.history.replaceState) {
          global.history.replaceState(null, '', cleanUrl);
        }
      }
    } catch (e) { /* URLSearchParams/history unsupported — falls back to stored mode */ }
  })();

  applyToDocument(current);

  global.FTN = global.FTN || {};
  global.FTN.PlatformMode = { get: get, set: set, isPresentation: isPresentation, isLive: isLive };
})(window);
