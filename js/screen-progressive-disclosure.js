// FTN Screen — progressive disclosure for the creator/submission tooling sections.
// Screen's own discovery (real titles/cards) and browse catalog render first and stay fully
// visible; the four large filmmaker tool/submission sections below them (build package, festival
// package, festival matching, tool catalog) rendered fully open by default -- together ~7000px,
// most of the page's total 14x-viewport height, ahead of anyone actually wanting to submit
// anything. Collapsed behind a native <details> (no custom CSS show/hide state to get wrong) so
// the first thing a visitor does is discover films, not scroll past creator tooling.
(function () {
  'use strict';

  var TARGETS = [
    { selector: '#screen-tool-catalog' },
    { selector: '#screen-form', wrapParent: true },
    { selector: '#screen-festival-package' },
    { selector: '.screen-panel.screen-fest' }
  ];

  function collapse(el) {
    if (!el || el.closest('details.screen-collapsible')) return;
    var heading = el.querySelector('h2, h3');
    var label = heading ? heading.textContent.trim() : 'More tools';
    var details = document.createElement('details');
    details.className = 'screen-collapsible';
    var summary = document.createElement('summary');
    summary.textContent = label;
    el.parentNode.insertBefore(details, el);
    details.appendChild(summary);
    details.appendChild(el);
  }

  function sweep() {
    TARGETS.forEach(function (t) {
      var target = document.querySelector(t.selector);
      if (!target) return;
      collapse(t.wrapParent ? target.parentElement : target);
    });
  }

  // These sections are injected by separate scripts (screen-workspace.js,
  // screen-festival-package.js, screen-festival-studio.js) at unpredictable times relative to
  // this one -- a short observer window catches them whenever they actually land, without this
  // file needing to know any of those scripts' internal timing.
  var root = document.getElementById('workspace-content') || document.body;
  var observer = new MutationObserver(sweep);
  observer.observe(root, { childList: true, subtree: true });
  sweep();
  setTimeout(function () { observer.disconnect(); }, 10000);
})();
