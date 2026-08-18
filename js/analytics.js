// FTN privacy-safe Umami analytics.
(function (global) {
  'use strict';

  var WEBSITE_ID = '6b49afbc-3929-4855-bda8-eff8755f685d';
  var ALLOWED_EVENTS = new Set(['navigation_select', 'product_open', 'account_action', 'source_open']);
  var ALLOWED_KEYS = new Set(['pillar', 'product', 'action', 'status']);

  function safeValue(value) {
    var normalized = String(value == null ? '' : value).toLowerCase().trim();
    return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized) ? normalized : '';
  }

  function properties(input) {
    var output = {};
    Object.keys(input || {}).forEach(function (key) {
      if (!ALLOWED_KEYS.has(key)) return;
      var value = safeValue(input[key]);
      if (value) output[key] = value;
    });
    return output;
  }

  function track(name, data) {
    if (!ALLOWED_EVENTS.has(name) || !global.umami || typeof global.umami.track !== 'function') return false;
    global.umami.track(name, properties(data));
    return true;
  }

  function pillarFor(pathname) {
    var routes = [
      ['/now/', 'now'],
      ['/community-connect/', 'community'],
      ['/riddim/', 'culture'],
      ['/opportunities/', 'opportunity'],
      ['/account/', 'my_ftn'],
      ['/ibis-ai/', 'ask_ibis']
    ];
    for (var i = 0; i < routes.length; i += 1) {
      if (pathname.indexOf(routes[i][0]) === 0) return routes[i][1];
    }
    return '';
  }

  function load() {
    if (document.querySelector('script[data-ftn-umami]')) return;
    var script = document.createElement('script');
    script.src = 'https://cloud.umami.is/script.js';
    script.defer = true;
    script.setAttribute('data-website-id', WEBSITE_ID);
    script.setAttribute('data-domains', 'ftnplatform.org,www.ftnplatform.org');
    script.setAttribute('data-do-not-track', 'true');
    script.setAttribute('data-exclude-search', 'true');
    script.setAttribute('data-ftn-umami', 'true');
    document.head.appendChild(script);
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link) return;
    var url;
    try { url = new URL(link.href, location.origin); } catch (error) { return; }
    if (url.origin !== location.origin) return;
    var pillar = pillarFor(url.pathname);
    if (pillar) track('navigation_select', { pillar: pillar });
    var declared = link.getAttribute('data-analytics-event');
    if (declared && ALLOWED_EVENTS.has(declared)) {
      track(declared, {
        product: link.getAttribute('data-analytics-product'),
        action: link.getAttribute('data-analytics-action'),
        status: link.getAttribute('data-analytics-status')
      });
    }
  });

  global.FTN = global.FTN || {};
  global.FTN.Analytics = { track: track };
  load();
})(window);
