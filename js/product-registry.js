// FTN Platform Website — Product Registry accessor API (Sprint 1, Wave 1).
// Reads js/product-registry-data.js. Every consumer (homepage, Intent Router, product
// workspaces) goes through this API rather than reading the data array directly, so the storage
// shape can change later without touching every call site.
(function (global) {
  'use strict';

  function data() {
    return (global.FTN && global.FTN.ProductRegistryData) || [];
  }

  function all() {
    return data().slice();
  }

  function get(id) {
    return data().filter(function (p) {
      return p.id === id || (Array.isArray(p.legacyIds) && p.legacyIds.indexOf(id) !== -1);
    })[0] || null;
  }

  function byRoute(route) {
    return data().filter(function (p) { return p.route === route; })[0] || null;
  }

  function homepagePanels() {
    return data()
      .filter(function (p) { return p.panelAsset && p.panelRow; })
      .sort(function (a, b) { return a.panelRow - b.panelRow; });
  }

  function publicProducts(options) {
    options = options || {};
    return data().filter(function (p) {
      if (p.publicVisibility === false || p.status === 'PRIVATE' || p.status === 'MAINTENANCE') return false;
      if (!options.includeSupporting && p.principal === false) return false;
      return true;
    });
  }

  function sitemapProducts() {
    return publicProducts({ includeSupporting: true }).filter(function (p) {
      return p.id !== 'account';
    });
  }

  function accountShortcuts() {
    return publicProducts({ includeSupporting: false }).filter(function (p) {
      return Array.isArray(p.capabilities) && p.capabilities.some(function (capability) {
        return ['save','saved-items','project-recipe','local-watchlist','application-tracker'].indexOf(capability) !== -1;
      });
    });
  }

  // Simple, transparent keyword scoring -- every product's keywords + name + tagline are
  // checked for whole-word overlap with the query's own words. No ranking model, no external
  // service: deliberately a real, honest, inspectable match, not a simulated AI call. See
  // js/intent-router.js for how this is used and explained back to the user.
  //
  // Whole-word matching (not substring) on purpose: an earlier version used indexOf() substring
  // matching, which let short common words match almost anything -- "to" inside "story", "a"
  // inside "article" -- producing noisy, misleading results for an honesty-first tool. Query
  // words under 3 characters or in the stopword list are dropped before matching for the same
  // reason.
  var STOPWORDS = ['the', 'and', 'for', 'are', 'with', 'that', 'this', 'you', 'your', 'have',
    'has', 'was', 'were', 'from', 'into', 'about', 'can', 'will', 'need', 'want', 'like', 'get'];

  function search(query) {
    var q = String(query || '').toLowerCase().trim();
    if (!q) return [];
    var qWords = q.split(/\W+/).filter(function (w) {
      return w.length >= 3 && STOPWORDS.indexOf(w) === -1;
    });
    if (!qWords.length) return [];

    return publicProducts({ includeSupporting: true })
      .map(function (p) {
        var haystackWords = [p.name, p.tagline, p.description].concat(p.keywords)
          .join(' ').toLowerCase().split(/\W+/).filter(Boolean);
        var score = 0;
        var matchedKeywords = [];
        qWords.forEach(function (w) {
          if (haystackWords.indexOf(w) !== -1) {
            score += 1;
            p.keywords.forEach(function (k) {
              if (k.toLowerCase() === w && matchedKeywords.indexOf(k) === -1) {
                matchedKeywords.push(k);
              }
            });
          }
        });
        return { product: p, score: score, matchedKeywords: matchedKeywords };
      })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  global.FTN = global.FTN || {};
  global.FTN.ProductRegistry = {
    all: all,
    get: get,
    byRoute: byRoute,
    homepagePanels: homepagePanels,
    publicProducts: publicProducts,
    sitemapProducts: sitemapProducts,
    accountShortcuts: accountShortcuts,
    search: search,
  };
})(window);
