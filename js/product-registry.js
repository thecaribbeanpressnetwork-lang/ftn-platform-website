// FTN Platform Website — Product Registry accessor API (Sprint 1, Wave 1).
// Reads js/product-registry-data.js. Every consumer (homepage, Intent Router, product
// workspaces) goes through this API rather than reading the data array directly, so the storage
// shape can change later without touching every call site.
(function (global) {
  'use strict';

  function canonicalize(p) {
    if (!p) return p;
    if (p.id !== 'ibis-ai') return p;
    // Founder-locked spelling. Keep this compatibility normalization at the accessor boundary
    // until the large generated registry-data file is regenerated; consumers must never propagate
    // legacy "FTN ibis" / "ibis.ai" naming from stale registry snapshots.
    return Object.assign({}, p, { name: 'ibis-ai', shortName: 'ibis-ai' });
  }

  function data() {
    return ((global.FTN && global.FTN.ProductRegistryData) || []).map(canonicalize);
  }

  function all() { return data().slice(); }

  function get(id) {
    return data().filter(function (p) {
      return p.id === id || (Array.isArray(p.legacyIds) && p.legacyIds.indexOf(id) !== -1);
    })[0] || null;
  }

  function byRoute(route) { return data().filter(function (p) { return p.route === route; })[0] || null; }

  function homepagePanels() {
    return data().filter(function (p) { return p.panelAsset && p.panelRow; }).sort(function (a, b) { return a.panelRow - b.panelRow; });
  }

  function publicProducts(options) {
    options = options || {};
    return data().filter(function (p) {
      if (p.publicVisibility === false || ['PRIVATE','MAINTENANCE','VAULTED'].indexOf(p.status) !== -1) return false;
      if (!options.includeSupporting && p.principal === false) return false;
      return true;
    });
  }

  function sitemapProducts() { return publicProducts({ includeSupporting: true }).filter(function (p) { return p.id !== 'account'; }); }

  function ecosystemGroups() {
    var groups = (global.FTN && global.FTN.ProductRegistryGroups) || [];
    return groups.map(function (group) {
      return { id: group.id, title: group.title, description: group.description, products: group.productIds.map(get).filter(function (product) {
        return product && product.publicVisibility !== false && ['PRIVATE','MAINTENANCE','VAULTED'].indexOf(product.status) === -1;
      }) };
    });
  }

  function accountShortcuts() {
    return publicProducts({ includeSupporting: false }).filter(function (p) {
      return Array.isArray(p.capabilities) && p.capabilities.some(function (capability) {
        return ['save','saved-items','project-recipe','local-watchlist','application-tracker'].indexOf(capability) !== -1;
      });
    });
  }

  var STOPWORDS = ['the', 'and', 'for', 'are', 'with', 'that', 'this', 'you', 'your', 'have',
    'has', 'was', 'were', 'from', 'into', 'about', 'can', 'will', 'need', 'want', 'like', 'get'];

  function scopeMatches(p, scopeId) {
    if (!scopeId) return false;
    var s = String(scopeId).toLowerCase();
    if (p.id && p.id.toLowerCase() === s) return true;
    if (Array.isArray(p.legacyIds) && p.legacyIds.some(function (id) { return String(id).toLowerCase() === s; })) return true;
    if (p.shortName && p.shortName.toLowerCase() === s) return true;
    if (p.parentProduct && String(p.parentProduct).toLowerCase() === s) return true;
    if (Array.isArray(p.relatedProducts) && p.relatedProducts.some(function (id) { return String(id).toLowerCase() === s; })) return true;
    return false;
  }

  var SCOPE_BONUS = 0.5;
  function search(query, options) {
    options = options || {};
    var scopeId = options.scopeProductId || null;
    var q = String(query || '').toLowerCase().trim();
    if (!q) return [];
    var qWords = q.split(/\W+/).filter(function (w) { return w.length >= 3 && STOPWORDS.indexOf(w) === -1; });
    if (!qWords.length) return [];

    return publicProducts({ includeSupporting: true })
      .map(function (p) {
        var haystackWords = [p.name, p.tagline, p.description].concat(p.keywords).join(' ').toLowerCase().split(/\W+/).filter(Boolean);
        var score = 0, matchedKeywords = [];
        qWords.forEach(function (w) {
          if (haystackWords.indexOf(w) !== -1) {
            score += 1;
            p.keywords.forEach(function (k) { if (k.toLowerCase() === w && matchedKeywords.indexOf(k) === -1) matchedKeywords.push(k); });
          }
        });
        return { product: p, score: score, matchedKeywords: matchedKeywords };
      })
      .filter(function (r) { return r.score > 0; })
      .map(function (r) { r.rankScore = r.score + (scopeMatches(r.product, scopeId) ? SCOPE_BONUS : 0); return r; })
      .sort(function (a, b) { return b.rankScore - a.rankScore || b.score - a.score; });
  }

  global.FTN = global.FTN || {};
  global.FTN.ProductRegistry = { all: all, get: get, byRoute: byRoute, homepagePanels: homepagePanels, publicProducts: publicProducts, sitemapProducts: sitemapProducts, ecosystemGroups: ecosystemGroups, accountShortcuts: accountShortcuts, search: search };
})(window);
