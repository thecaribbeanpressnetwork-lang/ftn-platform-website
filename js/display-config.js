// FTN Platform Website — Display Configuration controller.
//
// Reusable across any page that wants a configurable indicator display: it
// only knows how to load/save a DisplayConfig object and render a form for
// editing one. It does not know how indicators get rendered — that's left to
// whatever page listens for the `ftn:display-config-changed` event (today:
// observatory.js). A future FTN Display Network kiosk or embeddable widget
// page can reuse this file unchanged.
(function (global) {
  'use strict';

  var STORAGE_KEY = 'ftn-display-config';
  var LAYOUTS_KEY = 'ftn-display-layouts';

  // ---- Named Saved Layouts (Phase 4 Dashboard Builder) ----
  // A "layout" is just a named, stored DisplayConfig snapshot. The single
  // `load()`/`save()` pair above remains the *active* configuration — these
  // functions let a user keep several named configurations and switch
  // between them, matching how the founder direction describes "save,
  // load, switch between, share layouts."
  function listLayouts() {
    try { return JSON.parse(global.localStorage.getItem(LAYOUTS_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveLayouts(layouts) {
    try { global.localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts)); } catch (e) { /* noop */ }
  }

  function saveAsLayout(name, cfg) {
    var layouts = listLayouts().filter(function (l) { return l.name !== name; });
    layouts.push({ name: name, config: cfg, savedAt: new Date().toISOString() });
    saveLayouts(layouts);
    return layouts;
  }

  function loadLayout(name) {
    var layout = listLayouts().filter(function (l) { return l.name === name; })[0];
    if (!layout) return null;
    save(Object.assign({}, layout.config));
    return layout.config;
  }

  function duplicateLayout(name) {
    var layout = listLayouts().filter(function (l) { return l.name === name; })[0];
    if (!layout) return null;
    var newName = layout.name + ' (copy)';
    return saveAsLayout(newName, Object.assign({}, layout.config));
  }

  function deleteLayout(name) {
    var layouts = listLayouts().filter(function (l) { return l.name !== name; });
    saveLayouts(layouts);
    return layouts;
  }

  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return global.FTN.DisplayConfigData.defaultConfig();
      return Object.assign(global.FTN.DisplayConfigData.defaultConfig(), JSON.parse(raw));
    } catch (e) {
      return global.FTN.DisplayConfigData.defaultConfig();
    }
  }

  function save(cfg) {
    cfg.savedAt = new Date().toISOString();
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) { /* storage unavailable */ }
    global.dispatchEvent(new CustomEvent('ftn:display-config-changed', { detail: cfg }));
  }

  function reset() {
    try { global.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    var cfg = global.FTN.DisplayConfigData.defaultConfig();
    global.dispatchEvent(new CustomEvent('ftn:display-config-changed', { detail: cfg }));
    return cfg;
  }

  function formHTML(cfg) {
    var D = global.FTN.DisplayConfigData;
    var venueOptions = Object.keys(D.VENUE_PRESETS).map(function (key) {
      var sel = key === cfg.venue ? ' selected' : '';
      return '<option value="' + key + '"' + sel + '>' + D.VENUE_PRESETS[key].label + '</option>';
    }).join('');

    var countOptions = D.INDICATOR_COUNTS.map(function (n) {
      var sel = n === cfg.indicatorCount ? ' selected' : '';
      return '<option value="' + n + '"' + sel + '>' + n + ' indicators</option>';
    }).join('');

    var densityOptions = Object.keys(D.DENSITY_MODES).map(function (key) {
      var sel = key === cfg.density ? ' selected' : '';
      return '<option value="' + key + '"' + sel + '>' + D.DENSITY_MODES[key].label + '</option>';
    }).join('');

    var categoryList = (global.FTN.CATEGORIES || []).map(function (cat) {
      var checked = !cfg.categories || cfg.categories.indexOf(cat) !== -1 ? ' checked' : '';
      var id = 'dc-cat-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return '<label class="customize-panel__item" for="' + id + '"><input type="checkbox" id="' + id + '" data-dc-category="' + cat + '"' + checked + '> ' + cat + '</label>';
    }).join('');

    return (
      '<div class="form-field">' +
        '<label for="dc-venue">Venue type</label>' +
        '<select id="dc-venue">' + venueOptions + '</select>' +
      '</div>' +
      '<div class="form-field">' +
        '<label for="dc-screen-name">Screen name</label>' +
        '<input type="text" id="dc-screen-name" value="' + cfg.screenName + '">' +
      '</div>' +
      '<div class="form-row form-row--2">' +
        '<div class="form-field">' +
          '<label for="dc-count">Number of indicators</label>' +
          '<select id="dc-count">' + countOptions + '</select>' +
        '</div>' +
        '<div class="form-field">' +
          '<label for="dc-density">Display density</label>' +
          '<select id="dc-density">' + densityOptions + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="form-field">' +
        '<span class="hint">Categories to include</span>' +
        '<div class="customize-panel__list u-mt-8">' + categoryList + '</div>' +
      '</div>' +
      '<div class="form-field">' +
        '<label for="dc-ad-level">Advertising level (see Packages)</label>' +
        '<select id="dc-ad-level">' +
          '<option value="free"' + (cfg.adLevel === 'free' ? ' selected' : '') + '>Free Public — most network ads</option>' +
          '<option value="sponsored"' + (cfg.adLevel === 'sponsored' ? ' selected' : '') + '>Sponsored Display</option>' +
          '<option value="standard"' + (cfg.adLevel === 'standard' ? ' selected' : '') + '>Standard Display</option>' +
          '<option value="premium"' + (cfg.adLevel === 'premium' ? ' selected' : '') + '>Premium Display</option>' +
          '<option value="ad-free"' + (cfg.adLevel === 'ad-free' ? ' selected' : '') + '>Ad-Free Display</option>' +
          '<option value="enterprise"' + (cfg.adLevel === 'enterprise' ? ' selected' : '') + '>Enterprise / Government</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-field">' +
        '<label class="customize-panel__item" for="dc-rotation">' +
          '<input type="checkbox" id="dc-rotation"' + (cfg.rotation ? ' checked' : '') + '> ' +
          'Rotating Display &mdash; cycle through saved layouts while in Display Mode' +
        '</label>' +
        '<div class="form-row form-row--2 u-mt-8">' +
          '<div class="form-field">' +
            '<label for="dc-rotation-interval">Seconds per layout</label>' +
            '<select id="dc-rotation-interval">' +
              [10, 15, 20, 30, 45, 60, 90, 120].map(function (n) {
                return '<option value="' + n + '"' + (n === cfg.rotationIntervalSec ? ' selected' : '') + '>' + n + 's</option>';
              }).join('') +
            '</select>' +
          '</div>' +
        '</div>' +
        '<p class="hint u-mt-8">' +
          (listLayouts().length >= 2
            ? 'Will rotate through your ' + listLayouts().length + ' saved layouts, in order.'
            : 'Save at least 2 named layouts below for rotation to have something to cycle through. A Locked Display (unchecked) always shows the layout applied above.') +
        '</p>' +
      '</div>' +
      '<div class="icon-row">' +
        '<button type="button" class="btn btn-primary btn-sm" id="dc-apply">Apply Configuration</button>' +
        '<button type="button" class="btn btn-outline btn-sm" id="dc-reset">Reset to Default</button>' +
      '</div>' +
      savedLayoutsHTML()
    );
  }

  function savedLayoutsHTML() {
    var layouts = listLayouts();
    var rows = layouts.map(function (l) {
      return '<li class="saved-layout__item">' +
        '<span>' + l.name + '</span>' +
        '<span class="icon-row">' +
          '<button type="button" class="trust-trigger" data-layout-load="' + l.name + '">Load</button>' +
          '<button type="button" class="trust-trigger" data-layout-duplicate="' + l.name + '">Duplicate</button>' +
          '<button type="button" class="trust-trigger" data-layout-delete="' + l.name + '">Delete</button>' +
        '</span>' +
      '</li>';
    }).join('');

    return (
      '<div class="form-field u-mt-24">' +
        '<label for="dc-layout-name">Save current settings as a named layout</label>' +
        '<div class="form-row form-row--2">' +
          '<input type="text" id="dc-layout-name" placeholder="e.g. Main Lobby Screen">' +
          '<button type="button" class="btn btn-outline btn-sm" id="dc-save-layout">Save As&hellip;</button>' +
        '</div>' +
      '</div>' +
      (rows ? '<ul class="saved-layout__list">' + rows + '</ul>' : '<p class="u-text-sm u-text-graphite">No saved layouts yet.</p>')
    );
  }

  function init(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount || !global.FTN.DisplayConfigData) return;
    var cfg = load();
    mount.innerHTML = formHTML(cfg);

    // Event delegation throughout — formHTML() re-renders mount's innerHTML
    // on venue change and on reset, which would silently detach any listener
    // bound directly to a button/select inside it. Binding on `mount` itself
    // survives every re-render.
    mount.addEventListener('change', function (e) {
      if (e.target.id !== 'dc-venue') return;
      var preset = global.FTN.DisplayConfigData.applyPreset(e.target.value);
      preset.screenName = cfg.screenName;
      cfg = preset;
      mount.innerHTML = formHTML(cfg);
    });

    mount.addEventListener('click', function (e) {
      if (e.target.id === 'dc-apply') {
        var updated = {
          screenName: mount.querySelector('#dc-screen-name').value || 'FTN Live Display',
          venue: mount.querySelector('#dc-venue').value,
          indicatorCount: Number(mount.querySelector('#dc-count').value),
          density: mount.querySelector('#dc-density').value,
          adLevel: mount.querySelector('#dc-ad-level').value,
          categories: Array.prototype.slice.call(mount.querySelectorAll('[data-dc-category]'))
            .filter(function (el) { return el.checked; })
            .map(function (el) { return el.getAttribute('data-dc-category'); }),
          rotation: mount.querySelector('#dc-rotation').checked,
          rotationIntervalSec: Number(mount.querySelector('#dc-rotation-interval').value),
        };
        // "All checked" is equivalent to no filter — store null so future
        // categories added to the registry are included by default.
        if (updated.categories.length === (global.FTN.CATEGORIES || []).length) updated.categories = null;
        cfg = updated;
        save(updated);
      }
      if (e.target.id === 'dc-reset') {
        cfg = reset();
        mount.innerHTML = formHTML(cfg);
      }
      if (e.target.id === 'dc-save-layout') {
        var nameInput = mount.querySelector('#dc-layout-name');
        var name = (nameInput.value || '').trim();
        if (!name) return;
        saveAsLayout(name, Object.assign({}, cfg));
        nameInput.value = '';
        mount.innerHTML = formHTML(cfg);
      }
      var loadName = e.target.getAttribute('data-layout-load');
      if (loadName) {
        cfg = loadLayout(loadName) || cfg;
        mount.innerHTML = formHTML(cfg);
      }
      var dupName = e.target.getAttribute('data-layout-duplicate');
      if (dupName) {
        duplicateLayout(dupName);
        mount.innerHTML = formHTML(cfg);
      }
      var delName = e.target.getAttribute('data-layout-delete');
      if (delName) {
        deleteLayout(delName);
        mount.innerHTML = formHTML(cfg);
      }
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.DisplayConfig = {
    load: load, save: save, reset: reset, init: init,
    listLayouts: listLayouts, saveAsLayout: saveAsLayout, loadLayout: loadLayout,
    duplicateLayout: duplicateLayout, deleteLayout: deleteLayout,
  };
})(window);
