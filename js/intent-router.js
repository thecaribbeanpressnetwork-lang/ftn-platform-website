// FTN Platform Website — Intent Router (Sprint 1, Wave 2).
// ibis.ai's real capability: a stated goal, matched to the right FTN product by real, transparent
// keyword overlap against js/product-registry-data.js -- never an LLM call, never a simulated
// "thinking" delay. FTN.ProductRegistry.search() already does the matching (js/product-registry.js);
// this module's only job is to turn that result into an honest, human-readable explanation of why
// each product matched, so the "how this works" claim on the page is provably true.
(function (global) {
  'use strict';

  // options.scopeProductId (optional): the FTN product/page a caller is asking from (e.g.
  // 'learn', 'opportunities', 'observer', or 'ecosystem' for the sitewide widget, which
  // deliberately matches no real product -- see js/product-registry.js's scopeMatches()). This
  // is forwarded straight to Registry.search() as a ranking priority signal, never a filter --
  // route() can still return a product with no keyword relationship to the caller's own page.
  function route(goalText, options) {
    var Registry = global.FTN && global.FTN.ProductRegistry;
    if (!Registry) throw new Error('IntentRouter requires FTN.ProductRegistry to be loaded first');

    return Registry.search(goalText, options).map(function (r) {
      var explanation = r.matchedKeywords.length
        ? 'Matched because your goal mentioned: ' + r.matchedKeywords.join(', ') + '.'
        : 'Matched ' + r.score + ' word' + (r.score === 1 ? '' : 's') + ' in ' + r.product.name + '’s name, tagline, or description.';
      return { product: r.product, score: r.score, matchedKeywords: r.matchedKeywords, explanation: explanation };
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.IntentRouter = { route: route };
})(window);
