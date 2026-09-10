// FTN Platform — ibis Headspace spatial window manager.
// Investor-safe behavior: Snap grid, Tile and Stack visibly reorganize windows without overlap.
(function (global) {
  'use strict';

  var GAP = 18;
  var MIN_W = 260;
  var MOBILE = '(max-width:760px)';

  function manager(field) {
    function visible() {
      return Array.from(field.querySelectorAll('.thought:not(.dematerialized):not(.hs-minimized)'));
    }
    function setImportant(node, prop, value) {
      node.style.setProperty(prop, value, 'important');
    }
    function clearWindow(node) {
      ['left','right','top','bottom','width','height','max-width','max-height','grid-column','grid-row','transform'].forEach(function (prop) {
        node.style.removeProperty(prop);
      });
      setImportant(node, 'position', 'relative');
      setImportant(node, 'inset', 'auto');
      setImportant(node, 'overflow', 'visible');
      setImportant(node, 'resize', 'none');
      setImportant(node, 'min-width', '0');
      setImportant(node, 'height', 'auto');
      setImportant(node, 'max-height', 'none');
      node.style.zIndex = String(++global.__ibisHeadspaceTopZ);
    }
    function setFieldColumns(count) {
      field.style.setProperty('display', 'grid', 'important');
      field.style.setProperty('position', 'relative', 'important');
      field.style.setProperty('gap', GAP + 'px', 'important');
      field.style.setProperty('align-items', 'stretch', 'important');
      field.style.setProperty('overflow', 'visible', 'important');
      field.style.setProperty('grid-template-columns', 'repeat(' + count + ', minmax(' + MIN_W + 'px, 1fr))', 'important');
    }
    function columnsFor(mode) {
      if (global.matchMedia && global.matchMedia(MOBILE).matches) return 1;
      var width = field.clientWidth || global.innerWidth || 1200;
      if (mode === 'stack') return 1;
      if (mode === 'tile') return width >= 980 ? 2 : 1;
      return width >= 1180 ? 3 : width >= 760 ? 2 : 1;
    }
    function arrange(mode) {
      var nodes = visible();
      if (!nodes.length) return;
      var cleanMode = mode === 'tile' || mode === 'stack' ? mode : 'grid';
      var cols = columnsFor(cleanMode);
      field.dataset.layout = cleanMode;
      setFieldColumns(cols);
      nodes.forEach(function (node, i) {
        clearWindow(node);
        var col = (i % cols) + 1;
        var row = Math.floor(i / cols) + 1;
        setImportant(node, 'grid-column', String(col));
        setImportant(node, 'grid-row', String(row));
        setImportant(node, 'width', 'auto');
        if (cleanMode === 'tile') {
          setImportant(node, 'min-height', '260px');
        } else if (cleanMode === 'stack') {
          setImportant(node, 'min-height', '140px');
        } else {
          setImportant(node, 'min-height', '220px');
        }
        node.classList.add('hs-arranged');
        setTimeout(function () { node.classList.remove('hs-arranged'); }, 360);
      });
      announce(cleanMode);
    }
    function announce(mode) {
      var hint = document.getElementById('commandHint');
      if (!hint) return;
      var label = mode === 'tile' ? 'Tiled Headspace into larger non-overlapping work panels.' : mode === 'stack' ? 'Stacked Headspace into a readable single-column flow without overlap.' : 'Snapped Headspace into a non-overlapping grid.';
      hint.textContent = label;
    }
    function place(node) {
      arrange(field.dataset.layout || 'grid');
      return { left: 0, top: 0 };
    }
    function minimize(node) {
      node.classList.add('hs-minimized');
      node.setAttribute('aria-hidden', 'true');
      var shelf = document.getElementById('windowShelf');
      if (shelf) {
        var button = shelf.querySelector('[data-restore="' + node.dataset.thought + '"]');
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.dataset.restore = node.dataset.thought;
          button.textContent = node.dataset.thought;
          button.title = 'Restore ' + node.dataset.thought;
          button.addEventListener('click', function () { restore(node); });
          shelf.appendChild(button);
        }
        shelf.hidden = false;
      }
      arrange(field.dataset.layout || 'grid');
    }
    function restore(node) {
      node.classList.remove('hs-minimized', 'dematerialized');
      node.removeAttribute('aria-hidden');
      var b = document.querySelector('[data-restore="' + node.dataset.thought + '"]');
      if (b) b.remove();
      var shelf = document.getElementById('windowShelf');
      if (shelf && !shelf.children.length) shelf.hidden = true;
      arrange(field.dataset.layout || 'grid');
    }
    return {
      place: place,
      snap: function () { arrange('grid'); },
      organize: function () { arrange('grid'); },
      tile: function () { arrange('tile'); },
      stack: function () { arrange('stack'); },
      minimize: minimize,
      restore: restore,
      visible: visible,
      arrange: arrange
    };
  }

  function wireOpacity(field) {
    var slider = document.getElementById('headspaceOpacity');
    if (!slider || slider.dataset.ibisOpacityReady === 'true') return;
    slider.dataset.ibisOpacityReady = 'true';
    function apply(rawOverride) {
      var raw = Number(rawOverride || slider.value || 100);
      var value = Math.max(50, Math.min(100, raw)) / 100;
      slider.value = String(Math.round(value * 100));
      field.style.setProperty('--thought-opacity', String(value));
      document.querySelectorAll('.thought:not(.dematerialized)').forEach(function (node) {
        node.style.setProperty('opacity', String(value), 'important');
      });
      var hint = document.getElementById('commandHint');
      if (hint) hint.textContent = value < 1 ? 'Focus opacity adjusted: background context remains visible while current surfaces stay readable.' : 'Focus opacity restored to full strength.';
    }
    slider.addEventListener('input', function () { apply(); });
    slider.addEventListener('change', function () { apply(); });
    field.__ibisSetOpacity = apply;
    apply();
  }

  function runScenario(api, field) {
    try {
      var params = new URLSearchParams(global.location.search || '');
      var layout = params.get('hsLayout') || params.get('layout');
      var opacity = params.get('hsOpacity') || params.get('opacity');
      if (opacity && field.__ibisSetOpacity) field.__ibisSetOpacity(opacity);
      if (layout === 'tile') api.tile();
      else if (layout === 'stack') api.stack();
      else if (layout === 'grid') api.organize();
      if (params.get('hsScenario') === 'full') {
        api.organize();
        setTimeout(function () { api.tile(); }, 500);
        setTimeout(function () { api.stack(); }, 1000);
        setTimeout(function () { if (field.__ibisSetOpacity) field.__ibisSetOpacity(65); }, 1500);
      }
    } catch (_) {}
  }

  function init() {
    var field = document.getElementById('field'); if (!field) return;
    global.__ibisHeadspaceTopZ = global.__ibisHeadspaceTopZ || 10;
    var api = manager(field); global.FTN = global.FTN || {}; global.FTN.HeadspaceWindowManager = api;
    document.querySelectorAll('[data-arrange]').forEach(function (button) {
      if (button.dataset.ibisArrangeReady === 'true') return;
      button.dataset.ibisArrangeReady = 'true';
      button.addEventListener('click', function () {
        var action = button.dataset.arrange;
        if (action === 'tile') api.tile();
        else if (action === 'stack') api.stack();
        else api.organize();
      });
    });
    document.querySelectorAll('[data-minimize]').forEach(function (button) {
      if (button.dataset.ibisMinimizeReady === 'true') return;
      button.dataset.ibisMinimizeReady = 'true';
      button.addEventListener('click', function (event) { event.stopPropagation(); var node = button.closest('.thought'); if (node) api.minimize(node); });
    });
    wireOpacity(field);
    global.addEventListener('resize', function () {
      if (global.matchMedia && global.matchMedia(MOBILE).matches) return;
      clearTimeout(global.__ibisHeadspaceWindowResize);
      global.__ibisHeadspaceWindowResize = setTimeout(function () { api.arrange(field.dataset.layout || 'grid'); }, 120);
    });
    setTimeout(function () { api.organize(); runScenario(api, field); }, 200);
    setTimeout(function () { api.arrange(field.dataset.layout || 'grid'); runScenario(api, field); }, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
