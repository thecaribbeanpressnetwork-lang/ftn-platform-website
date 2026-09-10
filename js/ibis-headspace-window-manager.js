// FTN Platform — ibis Headspace spatial window manager.
// Familiar desktop behavior with investor-safe organization: snap grid and tile never overlap.
(function (global) {
  'use strict';

  var GRID = 24;
  var SNAP = 18;
  var GAP = 18;
  var MIN_W = 238;
  var MIN_H = 120;

  function manager(field) {
    function visible() {
      return Array.from(field.querySelectorAll('.thought:not(.dematerialized):not(.hs-minimized)'));
    }
    function rect(node) {
      var r = node.getBoundingClientRect(), h = field.getBoundingClientRect();
      return { left: r.left - h.left, top: r.top - h.top, width: r.width, height: r.height };
    }
    function clamp(node, left, top) {
      var w = node.offsetWidth || MIN_W, h = node.offsetHeight || MIN_H;
      return { left: Math.max(0, Math.min(left, Math.max(0, field.clientWidth - w))), top: Math.max(0, Math.min(top, Math.max(0, field.clientHeight - h))) };
    }
    function clearGeometry(node){
      node.style.right='auto'; node.style.bottom='auto'; node.style.maxHeight='none'; node.style.overflow='visible';
    }
    function snapPosition(node, left, top) {
      var w = node.offsetWidth || MIN_W, h = node.offsetHeight || MIN_H, maxX = Math.max(0, field.clientWidth - w), maxY = Math.max(0, field.clientHeight - h);
      var x = left, y = top;
      var gridX = Math.round(x / GRID) * GRID, gridY = Math.round(y / GRID) * GRID;
      if (Math.abs(gridX - x) <= SNAP) x = gridX;
      if (Math.abs(gridY - y) <= SNAP) y = gridY;
      [[0, 'x'], [maxX, 'x'], [Math.max(0, (field.clientWidth - w) / 2), 'x']].forEach(function (item) { if (Math.abs(item[0] - x) <= SNAP) x = item[0]; });
      [[0, 'y'], [maxY, 'y'], [Math.max(0, (field.clientHeight - h) / 2), 'y']].forEach(function (item) { if (Math.abs(item[0] - y) <= SNAP) y = item[0]; });
      return clamp(node, x, y);
    }
    function applyGrid(nodes) {
      nodes = nodes || visible();
      if (!nodes.length) return;
      if (global.matchMedia && global.matchMedia('(max-width:760px)').matches) {
        nodes.forEach(function(node){ clearGeometry(node); node.style.position='relative'; node.style.left='auto'; node.style.top='auto'; node.style.width='auto'; node.style.height='auto'; });
        return;
      }
      var width = Math.max(320, field.clientWidth || 1200);
      var cols = width >= 1180 ? 3 : width >= 760 ? 2 : 1;
      var colW = Math.max(MIN_W, Math.floor((width - GAP * (cols + 1)) / cols));
      nodes.forEach(function(node, i){
        var col = i % cols;
        var row = Math.floor(i / cols);
        clearGeometry(node);
        node.style.position = 'relative';
        node.style.left = 'auto';
        node.style.top = 'auto';
        node.style.width = 'auto';
        node.style.height = 'auto';
        node.style.minHeight = '180px';
        node.style.zIndex = String(++global.__ibisHeadspaceTopZ);
        node.style.gridColumn = String(col + 1);
        node.style.gridRow = String(row + 1);
      });
      field.style.display='grid';
      field.style.gridTemplateColumns='repeat('+cols+', minmax(280px, 1fr))';
      field.style.gap=GAP+'px';
      field.style.alignItems='start';
    }
    function place(node, preferred) {
      clearGeometry(node);
      var current = preferred || rect(node), base = snapPosition(node, current.left, current.top);
      node.style.left = base.left + 'px'; node.style.top = base.top + 'px'; node.style.right = 'auto'; node.style.bottom = 'auto'; return base;
    }
    function snapNode(node) { applyGrid(visible()); if(node){ node.classList.add('hs-snapped'); setTimeout(function () { node.classList.remove('hs-snapped'); }, 260); } }
    function minimize(node) {
      node.classList.add('hs-minimized');
      node.setAttribute('aria-hidden', 'true');
      var shelf = document.getElementById('windowShelf');
      if (!shelf) return;
      var button = shelf.querySelector('[data-restore="' + node.dataset.thought + '"]');
      if (!button) { button = document.createElement('button'); button.type = 'button'; button.dataset.restore = node.dataset.thought; button.textContent = node.dataset.thought; button.title = 'Restore ' + node.dataset.thought; button.addEventListener('click', function () { restore(node); }); shelf.appendChild(button); }
      shelf.hidden = false;
      applyGrid(visible());
    }
    function restore(node) {
      node.classList.remove('hs-minimized', 'dematerialized'); node.removeAttribute('aria-hidden'); clearGeometry(node); node.style.zIndex = String(++global.__ibisHeadspaceTopZ); var b = document.querySelector('[data-restore="' + node.dataset.thought + '"]'); if (b) b.remove(); var shelf = document.getElementById('windowShelf'); if (shelf && !shelf.children.length) shelf.hidden = true; applyGrid(visible());
    }
    function tile() { applyGrid(visible()); }
    function stack() {
      var nodes = visible(); if (!nodes.length) return;
      if (nodes.length <= 2) { applyGrid(nodes); return; }
      var width = Math.max(320, field.clientWidth || 1200), cols = width >= 1180 ? 3 : width >= 760 ? 2 : 1;
      field.style.display='grid'; field.style.gridTemplateColumns='repeat('+cols+', minmax(280px, 1fr))'; field.style.gap=GAP+'px'; field.style.alignItems='start';
      nodes.forEach(function(node,i){ clearGeometry(node); node.style.position='relative'; node.style.left='auto'; node.style.top='auto'; node.style.width='auto'; node.style.height='auto'; node.style.zIndex=String(++global.__ibisHeadspaceTopZ); node.style.gridColumn=String((i%cols)+1); node.style.gridRow=String(Math.floor(i/cols)+1); });
    }
    return { place: place, snap: snapNode, organize: applyGrid, minimize: minimize, restore: restore, tile: tile, stack: stack, visible: visible };
  }

  function init() {
    var field = document.getElementById('field'); if (!field) return;
    global.__ibisHeadspaceTopZ = global.__ibisHeadspaceTopZ || 10;
    var api = manager(field); global.FTN = global.FTN || {}; global.FTN.HeadspaceWindowManager = api;
    document.querySelectorAll('[data-arrange]').forEach(function (button) { button.addEventListener('click', function () { var action = button.dataset.arrange; if (action === 'tile') api.tile(); else if (action === 'stack') api.stack(); else if (action === 'grid') api.organize(); }); });
    document.querySelectorAll('[data-minimize]').forEach(function (button) { button.addEventListener('click', function (event) { event.stopPropagation(); var node = button.closest('.thought'); if (node) api.minimize(node); }); });
    window.addEventListener('resize', function () { if (window.matchMedia('(max-width:760px)').matches) return; clearTimeout(global.__ibisHeadspaceWindowResize); global.__ibisHeadspaceWindowResize=setTimeout(function(){ api.organize(); },120); });
    setTimeout(function(){ api.organize(); },250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
