// FTN Platform Website — Country scaffold (v1.6 Caribbean Executive Identity pass).
//
// Architecture only, per the founder's explicit instruction: persist a visitor's selected
// country and expose it via a data attribute + event, exactly like js/platform-mode.js does
// for Presentation/Live Mode. No page on the site currently reads FTN.Country to change its
// content -- every page today is Trinidad & Tobago-specific regardless of selection. This is
// intentional groundwork for a future pass that localizes news/weather/legal/emergency
// content per country, not a feature that does anything yet beyond remembering a preference
// and showing it back to the visitor.
//
// Loads after js/storage.js (the shared localStorage helper) and before nav.js.
(function (global) {
  'use strict';

  var STORAGE_KEY = 'ftn-country';

  var COUNTRIES = [
    { code: 'TT', name: 'Trinidad & Tobago' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'BB', name: 'Barbados' },
    { code: 'GY', name: 'Guyana' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'XC', name: 'Rest of the Caribbean' },
  ];

  var DEFAULT_CODE = 'TT';
  var byCode = {};
  COUNTRIES.forEach(function (c) { byCode[c.code] = c; });

  function storage() {
    return (global.FTN && global.FTN.storage) || null;
  }

  function readStored() {
    var s = storage();
    if (!s) return null;
    var saved = s.getJSON(STORAGE_KEY, null);
    return saved && byCode[saved.code] ? saved.code : null;
  }

  var current = readStored() || DEFAULT_CODE;
  var hasChosen = readStored() !== null;

  function applyToDocument(code) {
    if (global.document && global.document.documentElement) {
      global.document.documentElement.setAttribute('data-country', code);
    }
  }

  function get() {
    return byCode[current];
  }

  function hasExplicitSelection() {
    return hasChosen;
  }

  function set(code) {
    if (!byCode[code]) return get();
    current = code;
    hasChosen = true;
    var s = storage();
    if (s) s.setJSON(STORAGE_KEY, { code: code });
    applyToDocument(current);
    try {
      global.dispatchEvent(new CustomEvent('ftn:country-changed', { detail: { code: current } }));
    } catch (e) { /* CustomEvent unsupported — selection still changed, just not broadcast */ }
    return get();
  }

  function list() {
    return COUNTRIES.slice();
  }

  applyToDocument(current);

  global.FTN = global.FTN || {};
  global.FTN.Country = {
    get: get,
    set: set,
    list: list,
    hasExplicitSelection: hasExplicitSelection,
  };
})(window);
