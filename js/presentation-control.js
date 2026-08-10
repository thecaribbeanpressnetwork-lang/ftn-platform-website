// FTN Platform Website — floating Presentation Mode control + route enhancement loader.
(function (global) {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Small route loader: keeps product-specific runtime upgrades in their own files
  // without duplicating them into page templates. Loaded only where needed.
  (function loadRouteEnhancements(){
    var path=global.location.pathname,src='';
    if(path.indexOf('/mission-control/demo/')===0)src='/js/mission-control-functional.js';
    else if(path.indexOf('/observatory/')===0)src='/js/observatory-functional.js';
    if(!src||document.querySelector('script[src="'+src+'"]'))return;
    var s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s);
  })();

  var POSITION_KEY = 'ftn-presentation-control-position';
  var control = null;
  var dismissedThisView = false;

  function clamp(x, y, width, height) {
    var maxX = Math.max(8, global.innerWidth - width - 8);
    var maxY = Math.max(8, global.innerHeight - height - 8);
    return { x: Math.min(Math.max(x, 8), maxX), y: Math.min(Math.max(y, 8), maxY) };
  }

  function loadPosition() {
    return (global.FTN && global.FTN.storage) ? global.FTN.storage.getJSON(POSITION_KEY, null) : null;
  }

  function savePosition(pos) {
    if (global.FTN && global.FTN.storage) global.FTN.storage.setJSON(POSITION_KEY, pos);
  }

  function placeAt(x, y) {
    control.style.left = x + 'px';
    control.style.top = y + 'px';
    control.style.right = 'auto';
    control.style.bottom = 'auto';
  }

  function initDrag(el) {
    var handle = el.querySelector('.presentation-control__handle');
    var dragging = false;
    var offsetX = 0;
    var offsetY = 0;

    handle.addEventListener('pointerdown', function (e) {
      dragging = true;
      var rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      el.classList.add('presentation-control--dragging');
    });

    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = el.getBoundingClientRect();
      var pos = clamp(e.clientX - offsetX, e.clientY - offsetY, rect.width, rect.height);
      placeAt(pos.x, pos.y);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('presentation-control--dragging');
      var rect = el.getBoundingClientRect();
      savePosition({ x: rect.left, y: rect.top });
    }

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  function remove() {
    if (control && control.parentNode) control.parentNode.removeChild(control);
    control = null;
  }

  function render() {
    if (control || dismissedThisView) return;

    control = document.createElement('div');
    control.className = 'presentation-control';
    control.setAttribute('role', 'region');
    control.setAttribute('aria-label', 'Presentation Mode control');
    control.innerHTML =
      '<span class="presentation-control__handle" aria-hidden="true"><span class="presentation-control__dot"></span></span>' +
      '<span class="presentation-control__label">Presentation Mode</span>' +
      '<button type="button" class="presentation-control__exit">Exit to Live Mode</button>' +
      '<button type="button" class="presentation-control__dismiss" aria-label="Hide this control">&times;</button>';
    document.body.appendChild(control);

    var saved = loadPosition();
    if (saved) {
      var rect = control.getBoundingClientRect();
      var pos = clamp(saved.x, saved.y, rect.width, rect.height);
      placeAt(pos.x, pos.y);
    }

    control.querySelector('.presentation-control__exit').addEventListener('click', function () {
      global.FTN.PlatformMode.set('live');
      global.location.reload();
    });
    control.querySelector('.presentation-control__dismiss').addEventListener('click', function () {
      dismissedThisView = true;
      remove();
    });

    initDrag(control);
  }

  ready(function () {
    if (!global.FTN || !global.FTN.PlatformMode) return;

    if (global.FTN.PlatformMode.isPresentation()) render();

    global.addEventListener('ftn:platform-mode-changed', function (e) {
      if (e.detail && e.detail.mode === 'presentation') {
        dismissedThisView = false;
        render();
      } else {
        remove();
      }
    });

    global.addEventListener('resize', function () {
      if (!control) return;
      var rect = control.getBoundingClientRect();
      var pos = clamp(rect.left, rect.top, rect.width, rect.height);
      placeAt(pos.x, pos.y);
    });
  });
})(window);