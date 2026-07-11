// FTN Platform Website — Community Profile card (reusable renderer).
//
// Reuses the Trust Card dialog's CSS shell (.trust-card-dialog) for visual
// consistency without coupling to trust-card.js's indicator-shaped
// rendering — a community profile has a different shape (population,
// landmarks, schools...) and deserves its own layout inside the same
// familiar modal chrome.
(function (global) {
  'use strict';

  var dialog, panel;

  function listBlock(title, items) {
    if (!items || !items.length) return '';
    return '<div class="community-profile__block"><p class="trust-card__fields-heading">' + title + '</p><ul>' +
      items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>';
  }

  function render(p) {
    panel.innerHTML =
      '<button type="button" class="trust-card__close" data-cp-close aria-label="Close">' +
        '<img src="/assets/icons/icon-close.svg" alt="" width="16" height="16">' +
      '</button>' +
      '<span class="trust-badge trust-badge--demo">' + p.classification + '</span>' +
      '<h2 id="communityProfileTitle" class="trust-card__title">' + p.name + '</h2>' +
      '<p class="trust-card__why">' + p.overview + '</p>' +
      '<dl class="trust-card__fields">' +
        (p.population ? '<div class="trust-card__row"><dt>Population</dt><dd>' + p.population.toLocaleString('en-US') + ' (demo)</dd></div>' : '') +
        (p.reportsTotal ? '<div class="trust-card__row"><dt>Community Reports</dt><dd>' + p.reportsTotal.toLocaleString('en-US') + ' total, ' + p.reportsResolved.toLocaleString('en-US') + ' resolved (demo)</dd></div>' : '') +
        '<div class="trust-card__row"><dt>History</dt><dd>' + p.history + '</dd></div>' +
      '</dl>' +
      listBlock('Positive Stories', p.positiveStories) +
      listBlock('Recent Improvements', p.improvements) +
      listBlock('Landmarks', p.landmarks) +
      listBlock('Schools', p.schools) +
      listBlock('Facilities', p.facilities) +
      listBlock('Businesses', p.businesses);
  }

  function open(key) {
    var p = global.FTN.CommunityProfiles ? global.FTN.CommunityProfiles[key] : null;
    if (!p) return;
    render(p);
    dialog.classList.add('is-open');
    document.body.classList.add('trust-card-open');
    panel.querySelector('[data-cp-close]').focus();
  }

  function close() {
    dialog.classList.remove('is-open');
    document.body.classList.remove('trust-card-open');
  }

  function init() {
    dialog = document.createElement('div');
    dialog.className = 'trust-card-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'communityProfileTitle');

    var backdrop = document.createElement('div');
    backdrop.className = 'trust-card-dialog__backdrop';
    backdrop.addEventListener('click', close);

    panel = document.createElement('div');
    panel.className = 'trust-card-dialog__panel';

    dialog.appendChild(backdrop);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-cp-close]')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dialog.classList.contains('is-open')) close();
    });
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-community-profile]');
      if (trigger) { e.preventDefault(); open(trigger.getAttribute('data-community-profile')); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.FTN = global.FTN || {};
  global.FTN.CommunityProfile = { open: open, close: close };
})(window);
