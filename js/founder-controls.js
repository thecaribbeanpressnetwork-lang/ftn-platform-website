// FTN Platform Website — Founder Controls (architectural stub, Phase 3.5 §15).
//
// This is deliberately NOT a backend and NOT authenticated — it's a local,
// browser-only preview of what a future God Mode panel needs to expose:
// per-source health, and the ability to disable an unreliable indicator.
// Real capabilities (replace a benchmark, change a rate, correct a source,
// force recalibration...) are listed but not implemented — building them
// for real requires the server-side benchmark pipeline this stub is
// modeling, not more front-end code.
(function (global) {
  'use strict';

  var DISABLED_KEY = 'ftn-founder-disabled-indicators';

  function getDisabled() {
    try { return JSON.parse(global.localStorage.getItem(DISABLED_KEY) || '[]'); } catch (e) { return []; }
  }

  function setDisabled(list) {
    try { global.localStorage.setItem(DISABLED_KEY, JSON.stringify(list)); } catch (e) { /* noop */ }
    global.dispatchEvent(new CustomEvent('ftn:founder-controls-changed'));
  }

  function isDisabled(indicatorId) {
    return getDisabled().indexOf(indicatorId) !== -1;
  }

  var FUTURE_CAPABILITIES = [
    'Replace a benchmark value', 'Update the current recorded total', 'Increase or decrease a rate',
    'Pause an individual counter', 'Correct a source', 'Change a source URL', 'Change a benchmark date',
    'Select a seasonal profile', 'Force a recalibration', 'Choose which indicators are commercially available',
  ];

  function statusBadge(status) {
    var known = ['ok', 'stale', 'error', 'not-integrated'];
    var cls = known.indexOf(status) !== -1 ? status : 'not-integrated';
    return '<span class="founder-controls__status founder-controls__status--' + cls + '">' + status + '</span>';
  }

  function render(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount || !global.FTN.Benchmarks) return;

    var disabled = getDisabled();

    var rows = global.FTN.Benchmarks.map(function (b) {
      var ind = global.FTN.getIndicator ? global.FTN.getIndicator(b.indicatorId) : null;
      var src = b.sourceId && global.FTN.Sources ? global.FTN.Sources.get(b.sourceId).name : '—';
      var isOff = disabled.indexOf(b.indicatorId) !== -1;
      return '<tr>' +
        '<td>' + (ind ? ind.title : b.indicatorId) + '</td>' +
        '<td>' + src + '</td>' +
        '<td>' + statusBadge(b.sourceStatus) + '</td>' +
        '<td>' + (b.benchmarkDate || '—') + '</td>' +
        '<td>' + b.calculationVersion + '</td>' +
        '<td><label class="u-text-sm"><input type="checkbox" data-fc-toggle="' + b.indicatorId + '"' + (isOff ? '' : ' checked') + '> Visible</label></td>' +
        '</tr>';
    }).join('');

    mount.innerHTML =
      '<div class="callout u-mb-24">' +
        'Founder Controls (demo stub) — local-only, no authentication, no backend. Models the ' +
        'future capability set described below; only the visibility toggle actually does anything here.' +
      '</div>' +
      '<table class="founder-controls__table"><thead><tr>' +
        '<th>Indicator</th><th>Source</th><th>Status</th><th>Benchmark date</th><th>Version</th><th>Kiosk visibility</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="u-mt-24 u-font-bold">Planned capabilities (not implemented)</p>' +
      '<ul class="u-text-sm u-text-graphite">' + FUTURE_CAPABILITIES.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul>';

    mount.addEventListener('change', function (e) {
      var input = e.target.closest('[data-fc-toggle]');
      if (!input) return;
      var id = input.getAttribute('data-fc-toggle');
      var current = getDisabled();
      if (input.checked) current = current.filter(function (x) { return x !== id; });
      else if (current.indexOf(id) === -1) current.push(id);
      setDisabled(current);
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.FounderControls = { render: render, isDisabled: isDisabled, getDisabled: getDisabled };
})(window);
