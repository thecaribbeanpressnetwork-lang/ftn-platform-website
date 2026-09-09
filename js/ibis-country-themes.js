// FTN ibis — country-aware visual themes.
// Country colours are an accent layer, not a replacement for ibis's black foundation.
(function (global) {
  'use strict';
  var themes = {
    TT: { id: 'trinidad-tobago', label: 'Trinidad & Tobago', colors: { primary: '#d71920', secondary: '#ffffff', tertiary: '#747b84', ink: '#08090b', surface: '#17191d', muted: '#747b84', line: '#343941' } },
    JM: { id: 'jamaica', label: 'Jamaica', colors: { primary: '#f6c945', secondary: '#2c8c48', tertiary: '#08090b', ink: '#08090b', surface: '#17191d', muted: '#8c927d', line: '#3a4038' } },
    BB: { id: 'barbados', label: 'Barbados', colors: { primary: '#f2c84b', secondary: '#1764a3', tertiary: '#08090b', ink: '#08090b', surface: '#17191d', muted: '#7e8c9c', line: '#354351' } },
    GY: { id: 'guyana', label: 'Guyana', colors: { primary: '#f4c542', secondary: '#2f8f48', tertiary: '#d71920', ink: '#08090b', surface: '#17191d', muted: '#ffffff', line: '#3d4339' } },
    LC: { id: 'saint-lucia', label: 'Saint Lucia', colors: { primary: '#e5bd4d', secondary: '#1592c5', tertiary: '#ffffff', ink: '#08090b', surface: '#17191d', muted: '#8294a0', line: '#344a54' } },
    VE: { id: 'venezuela', label: 'Venezuela', colors: { primary: '#f2c94c', secondary: '#1f5ca8', tertiary: '#d71920', ink: '#08090b', surface: '#17191d', muted: '#8b907f', line: '#3e4439' } },
    XC: { id: 'caribbean', label: 'Caribbean', colors: { primary: '#ff5b5f', secondary: '#55c8c0', ink: '#08090b', surface: '#17191d', muted: '#879092', line: '#363d42' } }
  };
  var native = { id: 'ibis-native', label: 'ibis Native', colors: { primary: '#55d6d0', secondary: '#ef5b4f', tertiary: '#f7f8fa', ink: '#08090b', surface: '#15181c', muted: '#7f8b91', line: '#344047' } };
  function themeFor(code) { return themes[code] || native; }
  function apply(code) {
    var theme = themeFor(code), root = document.documentElement;
    root.setAttribute('data-ibis-theme', theme.id);
    Object.keys(theme.colors).forEach(function (key) { root.style.setProperty('--ibis-theme-' + key, theme.colors[key]); });
    return theme;
  }
  function current() { return apply((global.FTN && global.FTN.Country && global.FTN.Country.get().code) || 'TT'); }
  global.FTN = global.FTN || {};
  global.FTN.IbisCountryThemes = { all: function () { return JSON.parse(JSON.stringify(themes)); }, native: native, get: themeFor, apply: apply, current: current };
  function init() {
    current();
    global.addEventListener('ftn:country-changed', function (event) { apply(event.detail && event.detail.code); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
