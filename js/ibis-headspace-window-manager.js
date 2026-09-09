// FTN Platform — ibis Headspace spatial window manager.
// Familiar desktop behavior without turning Headspace into a conventional dashboard:
// magnetic grid/edge snapping, collision-aware opening, tile/stack arrangements, and
// one-tap minimize/restore. All geometry is local to the current browser session.
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
    function overlaps(a, b) {
      return a.left < b.left + b.width + GAP && a.left + a.width + GAP > b.left &&
        a.top < b.top + b.height + GAP && a.top + a.height + GAP > b.top;
    }
    function clamp(node, left, top) {
      var w = node.offsetWidth || MIN_W, h = node.offsetHeight || MIN_H;
      return { left: Math.max(0, Math.min(left, Math.max(0, field.clientWidth - w))), top: Math.max(0, Math.min(top, Math.max(0, field.clientHeight - h))) };
    }
    function snap(node, left, top) {
      var w = node.offsetWidth || MIN_W, h = node.offsetHeight || MIN_H, maxX = Math.max(0, field.clientWidth - w), maxY = Math.max(0, field.clientHeight - h);
      var x = left, y = top;
      var gridX = Math.round(x / GRID) * GRID, gridY = Math.round(y / GRID) * GRID;
      if (Math.abs(gridX - x) <= SNAP) x = gridX;
      if (Math.abs(gridY - y) <= SNAP) y = gridY;
      [[0, 'x'], [maxX, 'x'], [Math.max(0, (field.clientWidth - w) / 2), 'x']].forEach(function (item) { if (Math.abs(item[0] - x) <= SNAP) x = item[0]; });
      [[0, 'y'], [maxY, 'y'], [Math.max(0, (field.clientHeight - h) / 2), 'y']].forEach(function (item) { if (Math.abs(item[0] - y) <= SNAP) y = item[0]; });
      visible().filter(function (other) { return other !== node; }).forEach(function (other) {
        var r = rect(other);
        [[r.left - w - GAP, r.left + r.width + GAP, 'x'], [r.top - h - GAP, r.top + r.height + GAP, 'y']].forEach(function (pair) {
          if (pair[2] === 'x' && Math.abs(pair[0] - x) <= SNAP) x = pair[0];
          if (pair[2] === 'x' && Math.abs(pair[1] - x) <= SNAP) x = pair[1];
          if (pair[2] === 'y' && Math.abs(pair[0] - y) <= SNAP) y = pair[0];
          if (pair[2] === 'y' && Math.abs(pair[1] - y) <= SNAP) y = pair[1];
        });
      });
      return clamp(node, x, y);
    }
    function place(node, preferred) {
      var current = preferred || rect(node), others = visible().filter(function (x) { return x !== node; });
      var base = snap(node, current.left, current.top);
      var candidates = [base];
      for (var row = 0; row < 12; row++) for (var col = 0; col < 16; col++) candidates.push(clamp(node, col * GRID, row * GRID));
      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i], probe = { left: c.left, top: c.top, width: node.offsetWidth || MIN_W, height: node.offsetHeight || MIN_H };
        if (!others.some(function (other) { return overlaps(probe, rect(other)); })) {
          node.style.left = c.left + 'px'; node.style.top = c.top + 'px'; node.style.right = 'auto'; node.style.bottom = 'auto'; return c;
        }
      }
      node.style.left = base.left + 'px'; node.style.top = base.top + 'px'; node.style.right = 'auto'; node.style.bottom = 'auto';
      return base;
    }
    function snapNode(node) { var r = rect(node), c = snap(node, r.left, r.top); node.style.left = c.left + 'px'; node.style.top = c.top + 'px'; node.style.right = 'auto'; node.style.bottom = 'auto'; node.classList.add('hs-snapped'); setTimeout(function () { node.classList.remove('hs-snapped'); }, 260); }
    function minimize(node) {
      node.classList.add('hs-minimized');
      node.setAttribute('aria-hidden', 'true');
      var shelf = document.getElementById('windowShelf');
      if (!shelf) return;
      var button = shelf.querySelector('[data-restore="' + node.dataset.thought + '"]');
      if (!button) { button = document.createElement('button'); button.type = 'button'; button.dataset.restore = node.dataset.thought; button.textContent = node.dataset.thought; button.title = 'Restore ' + node.dataset.thought; button.addEventListener('click', function () { restore(node); }); shelf.appendChild(button); }
      shelf.hidden = false;
    }
    function restore(node) {
      node.classList.remove('hs-minimized', 'dematerialized'); node.removeAttribute('aria-hidden'); place(node, rect(node)); node.style.zIndex = String(++global.__ibisHeadspaceTopZ); var b = document.querySelector('[data-restore="' + node.dataset.thought + '"]'); if (b) b.remove(); var shelf = document.getElementById('windowShelf'); if (shelf && !shelf.children.length) shelf.hidden = true;
    }
    function tile() {
      var nodes = visible(); if (!nodes.length) return;
      var cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length * (field.clientWidth / Math.max(field.clientHeight, 1))))), rows = Math.ceil(nodes.length / cols), cellW = (field.clientWidth - GAP * (cols + 1)) / cols, cellH = (field.clientHeight - GAP * (rows + 1)) / rows;
      nodes.forEach(function (node, i) { var col = i % cols, row = Math.floor(i / cols); node.style.left = (GAP + col * (cellW + GAP)) + 'px'; node.style.top = (GAP + row * (cellH + GAP)) + 'px'; node.style.width = Math.max(MIN_W, cellW) + 'px'; node.style.height = Math.max(MIN_H, cellH) + 'px'; node.style.right = 'auto'; node.style.bottom = 'auto'; node.style.zIndex = String(++global.__ibisHeadspaceTopZ); });
    }
    function stack() {
      var nodes = visible(); if (!nodes.length) return; var width = Math.min(560, Math.max(MIN_W, field.clientWidth * .42)), height = Math.min(360, Math.max(MIN_H, field.clientHeight * .42)), left = Math.max(GAP, (field.clientWidth - width) / 2), top = Math.max(GAP, (field.clientHeight - height) / 2);
      nodes.forEach(function (node, i) { node.style.left = (left + Math.min(i, 5) * 14) + 'px'; node.style.top = (top + Math.min(i, 5) * 14) + 'px'; node.style.width = width + 'px'; node.style.height = height + 'px'; node.style.right = 'auto'; node.style.bottom = 'auto'; node.style.zIndex = String(++global.__ibisHeadspaceTopZ); });
    }
    return { place: place, snap: snapNode, minimize: minimize, restore: restore, tile: tile, stack: stack, visible: visible };
  }

  function init() {
    var field = document.getElementById('field'); if (!field) return;
    global.__ibisHeadspaceTopZ = global.__ibisHeadspaceTopZ || 10;
    var api = manager(field); global.FTN = global.FTN || {}; global.FTN.HeadspaceWindowManager = api;
    document.querySelectorAll('[data-arrange]').forEach(function (button) { button.addEventListener('click', function () { var action = button.dataset.arrange; if (action === 'tile') api.tile(); else if (action === 'stack') api.stack(); else if (action === 'grid') api.visible().forEach(api.snap); }); });
    document.querySelectorAll('[data-minimize]').forEach(function (button) { button.addEventListener('click', function (event) { event.stopPropagation(); var node = button.closest('.thought'); if (node) api.minimize(node); }); });
    window.addEventListener('resize', function () { if (window.matchMedia('(max-width:760px)').matches) return; api.visible().forEach(function (node) { var r = api.place(node); node.style.left = r.left + 'px'; node.style.top = r.top + 'px'; }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);

