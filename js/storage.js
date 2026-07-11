// FTN Platform Website — shared localStorage JSON helper.
//
// The same try/catch-wrapped get/set-JSON pattern was independently
// reimplemented in display-config.js, founder-controls.js, and
// observatory.js. One home for it so storage-unavailable handling (private
// browsing, quota, disabled storage) is consistent everywhere a future
// engine needs to persist a browser-local preference.
(function (global) {
  'use strict';

  function getJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function remove(key) {
    try { global.localStorage.removeItem(key); } catch (e) { /* noop */ }
  }

  global.FTN = global.FTN || {};
  global.FTN.storage = { getJSON: getJSON, setJSON: setJSON, remove: remove };
})(window);
