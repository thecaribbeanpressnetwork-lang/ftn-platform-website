// FTN ibis Headspace — non-blocking investor surface bootstrap.
// The document must become interactive immediately. Capability modules hydrate after first paint
// in their established dependency order; a slow optional module must never hold DOMContentLoaded.
(function (global) {
  'use strict';

  var modules = [
    '/js/persisted-flag.js',
    '/js/storage.js',
    '/js/country.js',
    '/js/ibis-country-themes.js',
    '/js/charts.js?v=20260907.1',
    '/js/ibis-presentation.js?v=20260907.2',
    '/js/ibis-headspace-request-state.js?v=20260908.1',
    '/js/ibis-headspace-window-manager.js?v=20260910.6',
    '/js/ibis-headspace-speech.js?v=20260909.1',
    '/js/ibis-headspace-fabric.js?v=20260911.2',
    '/js/ibis-headspace-universal.js?v=20260911.2',
    '/js/ibis-headspace-preview.js?v=20260911.1',
    '/js/ibis-headspace-handoff-guards.js?v=20260910.2',
    '/js/ibis-headspace-statistics.js?v=20260907.1',
    '/js/ibis-headspace-live-statistics.js?v=20260907.2',
    '/js/ibis-headspace-capital.js?v=20260907.1',
    '/js/ibis-headspace-live-model.js?v=20260907.1'
  ];

  function bootStatus(text, state) {
    var node = document.getElementById('headspaceBootStatus');
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state || '';
  }

  function load(src) {
    return new Promise(function (resolve, reject) {
      var base = src.split('?')[0];
      if (document.querySelector('script[src^="' + base + '"]')) { resolve(); return; }
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Could not load ' + base)); };
      document.head.appendChild(script);
    });
  }

  async function start() {
    bootStatus('Connecting ibis capabilities…', 'loading');
    var failures = [];
    for (var i = 0; i < modules.length; i += 1) {
      try { await load(modules[i]); }
      catch (error) { failures.push(error.message); }
    }
    global.FTN = global.FTN || {};
    global.FTN.HeadspaceBootstrap = { ready: failures.length === 0, failures: failures.slice() };
    if (failures.length) {
      bootStatus('Core workspace ready · some optional capabilities unavailable', 'degraded');
      var hint = document.getElementById('commandHint');
      if (hint) hint.textContent = 'Headspace is usable. Unavailable capabilities will fail closed rather than inventing results.';
    } else {
      bootStatus('ibis ready', 'ready');
    }
    document.documentElement.classList.add('headspace-hydrated');
    document.dispatchEvent(new CustomEvent('ibis:headspace-ready', { detail: global.FTN.HeadspaceBootstrap }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); }, { once: true });
  } else {
    setTimeout(start, 0);
  }
})(window);
