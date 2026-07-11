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
        fieldRow('Source', data.sourceName) +
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
