// FTN Platform Website — Country Registry (v1.6 scaffold, Sprint 1 Wave 3 rebuild on the shared
// Persisted Flag factory).
//
// Persists a visitor's selected country and exposes it via a data attribute + event, the same
// pattern js/platform-mode.js uses for Presentation/Live Mode -- now sharing that pattern's
// actual code via js/persisted-flag.js instead of independently reimplementing it. No page on
// the site currently reads FTN.Country to change its content -- every page today is Trinidad &
// Tobago-specific regardless of selection. This is intentional groundwork for a future pass that
// localizes news/weather/legal/emergency content per country, not a feature that does anything
// yet beyond remembering a preference and showing it back to the visitor.
//
// Loads after js/storage.js (the shared localStorage helper) and js/persisted-flag.js, before
// nav.js.
(function (global) {
  'use strict';

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

  var flag = global.FTN.PersistedFlag.create({
    storageKey: 'ftn-country',
    validate: function (code) { return !!byCode[code]; },
    defaultValue: DEFAULT_CODE,
    attribute: 'data-country',
    eventName: 'ftn:country-changed',
    detailKey: 'code',
    // Preserves the exact { code: 'TT' } envelope this module stored before the shared factory
    // existed, so a returning visitor's already-persisted selection keeps reading correctly.
    storageValueKey: 'code',
    useRawStorage: false,
  });

  function get() { return byCode[flag.get()]; }
  function set(code) { flag.set(code); return get(); }
  function list() { return COUNTRIES.slice(); }
  function hasExplicitSelection() { return flag.hasStoredValue(); }

  global.FTN = global.FTN || {};
  global.FTN.Country = {
    get: get,
    set: set,
    list: list,
    hasExplicitSelection: hasExplicitSelection,
  };
})(window);
