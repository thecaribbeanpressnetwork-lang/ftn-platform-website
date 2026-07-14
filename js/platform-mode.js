// FTN Platform Website — global Platform Mode (Presentation Mode / Live Mode).
//
// One flag, read the same way by every flagship platform. Presentation Mode and Live Mode
// share identical layouts, navigation, workflows and interactions — the only thing that is
// ever allowed to differ is which datasource a page resolves through js/data-source.js.
//
// Built on js/persisted-flag.js (Sprint 1, Wave 3) — the storage/attribute/event plumbing lives
// there now, shared with js/country.js; this module owns only what's specific to Platform Mode:
// the two valid values, the ?mode= deliberate-entry URL parameter, and the isPresentation()/
// isLive() convenience API every consumer already uses.
//
// Loads first, right after js/persisted-flag.js and before every other script, so the mode is
// settled before anything else on the page asks for it.
(function (global) {
  'use strict';

  var VALID_MODES = { live: true, presentation: true };

  var flag = global.FTN.PersistedFlag.create({
    storageKey: 'ftn-platform-mode',
    validate: function (v) { return !!VALID_MODES[v]; },
    defaultValue: 'live',
    attribute: 'data-platform-mode',
    eventName: 'ftn:platform-mode-changed',
    detailKey: 'mode',
    useRawStorage: true,
    urlParam: 'mode',
  });

  function get() { return flag.get(); }
  function set(mode) { return flag.set(mode); }
  function isPresentation() { return flag.get() === 'presentation'; }
  function isLive() { return flag.get() === 'live'; }

  global.FTN = global.FTN || {};
  global.FTN.PlatformMode = { get: get, set: set, isPresentation: isPresentation, isLive: isLive };
})(window);
