// FTN Platform Website — Country switcher UI (v1.6 Caribbean Executive Identity pass).
//
// Two surfaces sharing one dialog: a first-visit welcome modal ("Welcome to FTN. Choose your
// home.") shown once, and a small header control that reopens the same dialog to change the
// selection later. Reuses the exact accessible-dialog shell already established by
// js/trust-card.js (role="dialog", aria-modal, backdrop, Escape-to-close, focus trap and
// return) rather than inventing a second modal pattern for the site.
(function (global) {
  'use strict';

  var dialog, backdrop, panel, lastFocused;

  function render(isFirstVisit) {
    var Country = global.FTN && global.FTN.Country;
    if (!Country) return;
    var current = Country.get();
    var items = Country.list().map(function (c) {
      var active = c.code === current.code;
      return '<button type="button" class="country-switcher__option' + (active ? ' is-selected' : '') + '" data-country-code="' + c.code + '">' +
        '<span class="country-switcher__option-name">' + c.name + '</span>' +
        (c.code === 'TT' ? '<span class="country-switcher__option-tag">Live today</span>' : '') +
        '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="country-switcher-dialog__header">' +
        '<h2 id="countrySwitcherTitle">' + (isFirstVisit ? 'Welcome to FTN. Choose your home.' : 'Choose your home.') + '</h2>' +
        '<p>FTN Platform is built country by country. Every indicator on the site today reflects Trinidad &amp; Tobago — your selection is saved so we know where to bring FTN next.</p>' +
        (isFirstVisit ? '' : '<button type="button" class="country-switcher-dialog__close" data-country-close aria-label="Close">&times;</button>') +
      '</div>' +
      '<div class="country-switcher__grid">' + items + '</div>';
  }

  function close() {
    dialog.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function open(isFirstVisit) {
    render(isFirstVisit);
    lastFocused = document.activeElement;
    dialog.classList.add('is-open');
    dialog.classList.toggle('country-switcher-dialog--first-visit', !!isFirstVisit);
    var firstOption = panel.querySelector('.country-switcher__option');
    if (firstOption) firstOption.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && !dialog.classList.contains('country-switcher-dialog--first-visit')) close();
    if (e.key === 'Tab') {
      var focusable = panel.querySelectorAll('button');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  function updateHeaderLabel() {
    if (!(global.FTN && global.FTN.Country)) return;
    var name = global.FTN.Country.get().name;
    // Two triggers exist per page (desktop header, mobile nav panel) -- keep both in sync.
    var labels = document.querySelectorAll('[data-country-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = name;
  }

  function init() {
    dialog = document.createElement('div');
    dialog.className = 'country-switcher-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'countrySwitcherTitle');

    backdrop = document.createElement('div');
    backdrop.className = 'country-switcher-dialog__backdrop';
    backdrop.addEventListener('click', function () {
      if (!dialog.classList.contains('country-switcher-dialog--first-visit')) close();
    });

    panel = document.createElement('div');
    panel.className = 'country-switcher-dialog__panel';

    dialog.appendChild(backdrop);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-country-close]')) close();
      var option = e.target.closest('[data-country-code]');
      if (option) {
        global.FTN.Country.set(option.getAttribute('data-country-code'));
        updateHeaderLabel();
        close();
      }
    });

    // Two triggers exist per page (desktop header, mobile nav panel) -- both open the same
    // dialog.
    var triggers = document.querySelectorAll('[data-country-trigger]');
    for (var t = 0; t < triggers.length; t++) {
      triggers[t].addEventListener('click', function () { open(false); });
    }
    updateHeaderLabel();

    // The default context remains Trinidad & Tobago, but country choice is never forced.
    // Visitors can open the header control at any time and still browse every Caribbean route.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
