// FTN Platform Website — Country scope notice (v1.7 Executive Visual Polish pass).
//
// Community Connect and FTN Live are Trinidad & Tobago-specific today — this makes that
// honest rather than silent. When a visitor explicitly selects a country other than Trinidad
// & Tobago via the country switcher (js/country-switcher.js), any [data-country-scope-notice]
// element on the page is shown with real copy ("FTN is expanding to <Country>. Trinidad &
// Tobago is live today.") instead of leaving Trinidad-only content unlabeled as if it applied
// nationally. No new photography or fabricated per-country content is introduced — this is a
// messaging-only honesty layer on top of the existing js/country.js scaffold.
(function (global) {
  'use strict';

  function render() {
    var Country = global.FTN && global.FTN.Country;
    if (!Country) return;
    var current = Country.get();
    var notices = document.querySelectorAll('[data-country-scope-notice]');
    for (var i = 0; i < notices.length; i++) {
      var el = notices[i];
      if (current.code === 'TT') {
        el.hidden = true;
      } else {
        el.textContent = 'FTN is expanding to ' + current.name + '. Trinidad & Tobago is live today.';
        el.hidden = false;
      }
    }
  }

  function loadObservatoryLiveMedia() {
    var path = global.location && global.location.pathname ? global.location.pathname : '';
    if (path.indexOf('/observatory') !== 0) return;
    if (document.querySelector('script[data-ftn-live-media]')) return;
    var script = document.createElement('script');
    script.src = '/js/observatory-live-media.js';
    script.defer = true;
    script.setAttribute('data-ftn-live-media', 'true');
    document.head.appendChild(script);
  }

  function init() {
    render();
    loadObservatoryLiveMedia();
    global.addEventListener('ftn:country-changed', render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
