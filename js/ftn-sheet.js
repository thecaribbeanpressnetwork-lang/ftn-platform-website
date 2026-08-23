// FTN Platform Website — shared Sheet foundation (foundation only, one real consumer this pass:
// js/ftn-share.js). Desktop renders as a right-anchored panel, mobile as a bottom sheet — the same
// responsive shape already proven independently by js/smart-export.js and
// css/components/ibis-widget.css, but as one reusable accessible-dialog primitive instead of a
// third bespoke copy. Trust Card, community-profile, the discovery search modal and dj-tube's
// lightbox are NOT migrated onto this in this pass — each stays on its own existing dialog code
// until a future pass proves this foundation across more than one consumer.
//
// Usage: global.FTN.Sheet.open({ id, labelledBy, render(panel), onClose }) -> { close() }
(function (global) {
  'use strict';

  var current = null;

  function trapFocus(panel, event) {
    var focusable = panel.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  }

  function close() {
    if (!current) return;
    var sheet = current;
    current = null;
    sheet.root.classList.remove('is-open');
    document.body.classList.remove('ftn-sheet-open');
    document.removeEventListener('keydown', sheet.onKeydown);
    if (sheet.lastFocused && sheet.lastFocused.focus) sheet.lastFocused.focus();
    if (sheet.onClose) sheet.onClose();
    // Let the close transition play (skipped entirely under reduced motion) before unmounting,
    // so the node doesn't linger in the DOM across repeated open/close cycles.
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    global.setTimeout(function () {
      if (sheet.root.parentNode) sheet.root.parentNode.removeChild(sheet.root);
    }, reduced ? 0 : 260);
  }

  function open(config) {
    config = config || {};
    if (current) close();

    var root = document.createElement('div');
    root.className = 'ftn-sheet';
    if (config.id) root.id = config.id;

    var backdrop = document.createElement('div');
    backdrop.className = 'ftn-sheet__backdrop';

    var panel = document.createElement('div');
    panel.className = 'ftn-sheet__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (config.labelledBy) panel.setAttribute('aria-labelledby', config.labelledBy);

    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    if (typeof config.render === 'function') config.render(panel);

    var sheet = { root: root, panel: panel, onClose: config.onClose, lastFocused: document.activeElement };
    sheet.onKeydown = function (event) {
      if (event.key === 'Escape') { close(); return; }
      if (event.key === 'Tab') trapFocus(panel, event);
    };

    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', sheet.onKeydown);

    current = sheet;
    document.body.classList.add('ftn-sheet-open');

    // Mount at the closed position first (display:none -> block) and force layout, so the
    // browser has actually painted a "before" frame -- otherwise adding is-open in the same
    // tick as un-hiding the element skips the slide-in transition entirely. A double rAF is the
    // standard way to guarantee that painted frame exists before the transition starts.
    root.classList.add('is-mounted');
    void root.offsetWidth;
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () {
        if (current !== sheet) return;
        root.classList.add('is-open');
      });
    });

    var firstFocusable = panel.querySelector('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();

    return {
      close: close,
      panel: panel,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.Sheet = { open: open, close: close };
})(window);
