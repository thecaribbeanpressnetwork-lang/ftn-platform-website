// FTN Platform Website — homepage "What do you want to do?" outcome pathways.
// Registry-driven (never hardcodes a route/name) so a product's identity always matches
// js/product-registry-data.js, the single source of truth. Curates a fixed, small set of Tier-1
// outcomes rather than rendering every product — the full map stays the FTN Directory reveal
// below this section.
(function (global) {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var PATHWAYS = [
    { verb: 'REPORT', prompt: 'Something in my community', id: 'community-connect' },
    { verb: 'KNOW', prompt: 'What’s happening right now', id: 'ftn-live' },
    { verb: 'SEE', prompt: 'The Caribbean, on a screen near you', id: 'display' },
    { verb: 'WATCH', prompt: 'Caribbean video and live sources', id: 'tv' },
    { verb: 'DISCOVER', prompt: 'Caribbean news and culture', id: 'kaiso' },
    { verb: 'FIND', prompt: 'Opportunity, work and business', id: 'opportunities' },
    { verb: 'CREATE', prompt: 'Caribbean music and creator tools', id: 'riddim' }
  ];

  function card(entry, product) {
    return '<a class="pathway-card ftn-motion-lift" href="' + esc(product.route) + '">' +
      '<span class="pathway-card__verb">' + esc(entry.verb) + '</span>' +
      '<h3>' + esc(entry.prompt) + '</h3>' +
      '<p class="pathway-card__product">' + esc(product.name) + ' <span aria-hidden="true">&rarr;</span></p>' +
      '</a>';
  }

  function exploreCard() {
    return '<button type="button" class="pathway-card pathway-card--explore ftn-motion-lift" data-pathways-explore>' +
      '<span class="pathway-card__verb">EXPLORE</span>' +
      '<h3>The complete ecosystem</h3>' +
      '<p class="pathway-card__product">FTN Directory <span aria-hidden="true">&rarr;</span></p>' +
      '</button>';
  }

  function mount(host) {
    var Registry = global.FTN && global.FTN.ProductRegistry;
    if (!Registry) return false;
    var cards = PATHWAYS.map(function (entry) {
      var product = Registry.get(entry.id);
      return product ? card(entry, product) : '';
    }).join('') + exploreCard();
    host.innerHTML = cards;
    var exploreButton = host.querySelector('[data-pathways-explore]');
    if (exploreButton) {
      exploreButton.addEventListener('click', function () {
        var toggle = document.querySelector('[data-ecosystem-toggle]');
        if (toggle) toggle.click();
      });
    }
    return true;
  }

  function boot(host) {
    if (mount(host)) return;
    global.setTimeout(function () { mount(host); }, 1500);
  }

  document.querySelectorAll('[data-homepage-pathways]').forEach(boot);
})(window);
