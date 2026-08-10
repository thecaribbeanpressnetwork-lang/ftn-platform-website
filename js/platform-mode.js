// FTN Platform Website — global Platform Mode (Presentation Mode / Live Mode).
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

  // Legacy informational templates are progressively consolidated. This shared,
  // presentation-only layer keeps public labels/routes aligned with the current
  // Product Registry without changing product data or operational behavior.
  if (!document.querySelector('script[data-ftn-truth-runtime]')) {
    var truth = document.createElement('script');
    truth.src = '/js/platform-truth-runtime.js';
    truth.defer = true;
    truth.setAttribute('data-ftn-truth-runtime', 'true');
    document.head.appendChild(truth);
  }
})(window);
