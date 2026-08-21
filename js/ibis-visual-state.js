// FTN Platform — ibis Visual State: one shared, tiny state-indicator component (dot + text label)
// for any surface that shows what ibis is currently doing. Optional presentation layer only --
// nothing in the IBIS fabric (ibis-client.js, ibis-eligibility.js, provider registry) depends on
// this file existing. Reuses the states named in the Phase 12 master directive's own "IBIS VISUAL
// STATE" list, and is designed to replace the small amount of independently-duplicated "ibis is
// thinking…"-style status text already hand-written in js/ibis-widget.js and
// js/ibis-creative-studio.js -- callers opt in by calling FTN.IbisVisualState.set(), not by this
// file reaching into other modules.
(function (global) {
  'use strict';

  var STATES = ['idle', 'listening', 'thinking', 'working', 'waiting', 'asking_permission', 'generating', 'verifying', 'error', 'complete'];

  var LABELS = {
    idle: 'ibis is ready',
    listening: 'ibis is listening…',
    thinking: 'ibis is thinking…',
    working: 'ibis is working…',
    waiting: 'ibis is waiting for you…',
    asking_permission: 'ibis needs your permission…',
    generating: 'ibis is generating…',
    verifying: 'ibis is checking the result…',
    error: 'ibis hit a problem',
    complete: 'Done'
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(state, opts) {
    opts = opts || {};
    var known = STATES.indexOf(state) !== -1 ? state : 'idle';
    var label = opts.label || LABELS[known] || LABELS.idle;
    return '<span class="ibis-visual-state ibis-visual-state--' + known + '" role="status" aria-live="polite">'
      + '<span class="ibis-visual-state__dot" aria-hidden="true"></span>'
      + '<span class="ibis-visual-state__label">' + esc(label) + '</span>'
      + '</span>';
  }

  // host: an Element to fully own (its innerHTML becomes the indicator), for simple call sites
  // that don't need to keep other content in the same container.
  function set(host, state, opts) {
    if (!host) return;
    host.innerHTML = render(state, opts);
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisVisualState = { STATES: STATES.slice(), LABELS: LABELS, render: render, set: set };
})(window);
