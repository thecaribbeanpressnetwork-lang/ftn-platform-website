// FTN Platform Website — shared Trust Card modal.
// Any page that includes this script gets a single accessible dialog that
// renders classification/methodology/confidence metadata for an indicator or
// an arbitrary evidence object. Opened via FTN.TrustCard.open(dataOrId).
(function (global) {
  'use strict';

  var dialog, backdrop, panel, lastFocused;

  function fieldRow(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return '<div class="trust-card__row"><dt>' + label + '</dt><dd>' + value + '</dd></div>';
  }

  // Renders a source as a real clickable link when a Source Registry entry
  // exists (js/source-registry.js); falls back to plain text otherwise.
  // roleLabel distinguishes a primary benchmark source from a secondary
  // comparison-only source (e.g. Worldometer is never primary — see
  // ANALYTICS_STANDARD.md and Phase 3.5 founder direction §4).
  function sourceLinkRow(label, sourceId, roleLabel) {
    if (!sourceId) return '';
    var src = global.FTN && global.FTN.Sources ? global.FTN.Sources.get(sourceId) : null;
    if (!src) return '';
    var roleNote = roleLabel ? ' <span class="trust-card__source-role">(' + roleLabel + ')</span>' : '';
    var value = src.url
      ? '<a href="' + src.url + '" target="_blank" rel="noopener noreferrer">' + src.name + '</a>' + roleNote
      : src.name + roleNote;
    return fieldRow(label, value);
  }

  function classificationBadgeClass(classification) {
    var map = {
      'Official': 'trust-badge--official',
      'Sourced': 'trust-badge--sourced',
      'FTN Derived': 'trust-badge--derived',
      'FTN Estimated': 'trust-badge--estimated',
      'FTN Modelled': 'trust-badge--modelled',
      'Demonstration': 'trust-badge--demo',
    };
    return map[classification] || 'trust-badge--demo';
  }

  function render(data) {
    var badgeClass = classificationBadgeClass(data.classification);
    panel.innerHTML =
      '<button type="button" class="trust-card__close" data-trust-close aria-label="Close">' +
        '<img src="/assets/icons/icon-close.svg" alt="" width="16" height="16">' +
      '</button>' +
      '<span class="trust-badge ' + badgeClass + '">' + (data.classification || 'Demonstration') + '</span>' +
      '<h2 id="trustCardTitle" class="trust-card__title">' + data.title + '</h2>' +
      (data.value ? '<p class="trust-card__value">' + data.value + (data.units ? ' <span>' + data.units + '</span>' : '') + '</p>' : '') +
      '<dl class="trust-card__fields">' +
        fieldRow('Confidence', data.confidence) +
        fieldRow('Methodology', data.methodology) +
        (data.sourceId
          ? sourceLinkRow('Primary source', data.sourceId, 'primary benchmark source')
          : fieldRow('Source', data.sourceName)) +
        (data.secondarySourceId ? sourceLinkRow('Secondary source', data.secondarySourceId, null) : '') +
        (data.comparisonSourceId ? sourceLinkRow('Comparison source', data.comparisonSourceId, 'comparison, not primary') : '') +
        fieldRow('Update frequency', data.updateFrequency) +
        fieldRow('Last updated', data.lastUpdated) +
        fieldRow('Time coverage', data.timeCoverage) +
        fieldRow('Geographic coverage', data.geoCoverage) +
        fieldRow('Sample size', data.sampleSize) +
        fieldRow('Limitations', data.limitations) +
        fieldRow('Contradictory evidence', data.contradictoryEvidence) +
      '</dl>';
  }

  function open(dataOrId) {
    var data = typeof dataOrId === 'string' ? (global.FTN.getIndicator ? global.FTN.getIndicator(dataOrId) : null) : dataOrId;
    if (!data) return;
    render(data);
    lastFocused = document.activeElement;
    dialog.classList.add('is-open');
    document.body.classList.add('trust-card-open');
    panel.querySelector('[data-trust-close]').focus();
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    dialog.classList.remove('is-open');
    document.body.classList.remove('trust-card-open');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      var focusable = panel.querySelectorAll('button, a[href]');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  function init() {
    dialog = document.createElement('div');
    dialog.className = 'trust-card-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'trustCardTitle');

    backdrop = document.createElement('div');
    backdrop.className = 'trust-card-dialog__backdrop';
    backdrop.addEventListener('click', close);

    panel = document.createElement('div');
    panel.className = 'trust-card-dialog__panel';

    dialog.appendChild(backdrop);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-trust-close]')) close();
    });

    // Delegate: any element with data-trust-card="<indicator-id>" opens that card.
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-trust-card]');
      if (trigger) {
        e.preventDefault();
        open(trigger.getAttribute('data-trust-card'));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.FTN = global.FTN || {};
  global.FTN.TrustCard = { open: open, close: close };
})(window);
