// FTN Platform Website — Persisted Flag factory (Sprint 1, Wave 3).
//
// js/platform-mode.js and js/country.js were independently built as two structurally identical
// implementations of the same pattern: read a validated value from storage, fall back to a
// default, reflect it as a data-attribute on <html>, expose get()/set(), and broadcast a custom
// event on change. This factory is that pattern, built once. Each module below still owns its
// own domain logic (valid modes vs. the country list, the URL deliberate-entry point, the exact
// public API shape) -- this only removes the duplicated storage/attribute/event plumbing
// underneath both.
//
// Loads first, before every other script (including js/storage.js) -- js/platform-mode.js still
// needs to be settled before anything else on the page asks for it, and it (like this factory)
// uses raw localStorage rather than the FTN.storage helper for that reason.
(function (global) {
  'use strict';

  function create(config) {
    var storageKey = config.storageKey;
    var validate = config.validate;
    var defaultValue = config.defaultValue;
    var attribute = config.attribute;
    var eventName = config.eventName;
    var detailKey = config.detailKey || 'value';
    var useRawStorage = !!config.useRawStorage;
    // The key inside the stored JSON envelope, e.g. { code: 'TT' } vs { value: 'presentation' }.
    // Configurable (not hardcoded to 'value') so a module already shipped with a real storage
    // contract -- js/country.js stored { code } before this factory existed -- keeps reading its
    // own already-persisted visitor data after adopting the factory, instead of every returning
    // visitor silently losing their saved selection because the envelope shape changed underneath
    // them.
    var storageValueKey = config.storageValueKey || 'value';

    function rawGet() {
      try {
        if (useRawStorage) return global.localStorage.getItem(storageKey);
        var s = global.FTN && global.FTN.storage;
        if (!s) return null;
        var saved = s.getJSON(storageKey, null);
        return saved ? saved[storageValueKey] : null;
      } catch (e) {
        return null;
      }
    }

    function rawSet(value) {
      try {
        if (useRawStorage) { global.localStorage.setItem(storageKey, value); return; }
        var s = global.FTN && global.FTN.storage;
        if (s) {
          var envelope = {};
          envelope[storageValueKey] = value;
          s.setJSON(storageKey, envelope);
        }
      } catch (e) { /* private browsing, quota, or storage unavailable -- value still works this session */ }
    }

    var storedRaw = rawGet();
    var hadStoredValue = storedRaw !== null && validate(storedRaw);
    var current = hadStoredValue ? storedRaw : defaultValue;

    function applyToDocument(value) {
      if (global.document && global.document.documentElement) {
        global.document.documentElement.setAttribute(attribute, value);
      }
    }

    function get() { return current; }

    function hasStoredValue() { return hadStoredValue; }

    function set(value) {
      if (!validate(value) || value === current) return current;
      current = value;
      hadStoredValue = true;
      rawSet(current);
      applyToDocument(current);
      try {
        var detail = {};
        detail[detailKey] = current;
        global.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
      } catch (e) { /* CustomEvent unsupported -- value still changed, just not broadcast */ }
      return current;
    }

    // Deliberate entry point: a page visited with ?<urlParam>=<value> adopts that value as if it
    // were chosen through the normal interface, then strips the parameter so it's never
    // bookmarked/shared as if permanent. Optional -- only js/platform-mode.js uses this today.
    if (config.urlParam) {
      try {
        var params = new URLSearchParams(global.location.search);
        var requested = params.get(config.urlParam);
        if (requested && validate(requested)) {
          current = requested;
          hadStoredValue = true;
          rawSet(current);
          params.delete(config.urlParam);
          var query = params.toString();
          var cleanUrl = global.location.pathname + (query ? '?' + query : '') + global.location.hash;
          if (global.history && global.history.replaceState) {
            global.history.replaceState(null, '', cleanUrl);
          }
        }
      } catch (e) { /* URLSearchParams/history unsupported -- falls back to stored/default value */ }
    }

    applyToDocument(current);

    return { get: get, set: set, hasStoredValue: hasStoredValue };
  }

  global.FTN = global.FTN || {};
  global.FTN.PersistedFlag = { create: create };
})(window);
