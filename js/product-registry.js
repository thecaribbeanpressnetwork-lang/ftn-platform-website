// FTN Platform Website — Product Registry accessor API (Sprint 1, Wave 1).
// Reads js/product-registry-data.js. Every consumer (homepage, Intent Router, product
// workspaces) goes through this API rather than reading the data array directly, so the storage
// shape can change later without touching every call site.
(function (global) {
  'use strict';

  function canonicalize(p) {
    if (!p) return p;
    if (p.id !== 'ibis-ai') return p;
    // Founder-locked identity. The legacy /ibis-ai/ route remains stable for compatibility,
    // while public consumers describe the product as FTN ibis.
    return Object.assign({}, p, { name: 'FTN ibis', shortName: 'ibis' });
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
    // FTN Consolidation: an absorbed product's own homepage panel would present it as a peer
    // product again, exactly what absorbing it was meant to stop -- excluded here unconditionally
    // (never a caller option), independent of the includeAbsorbed opt-in below.
    return data().filter(function (p) { return p.panelAsset && p.panelRow && !p.absorbedInto; }).sort(function (a, b) { return a.panelRow - b.panelRow; });
  }

  function publicProducts(options) {
    options = options || {};
    return data().filter(function (p) {
      if (p.publicVisibility === false || ['PRIVATE','MAINTENANCE','VAULTED'].indexOf(p.status) !== -1) return false;
      // FTN Consolidation (see GOVERNANCE/FTN_Consolidation_2026-09-18.md): an absorbed product's
      // route stays live (never deleted), but it stops being offered as an independent public
      // product -- nav, footer, Directory cards, ecosystem menus, homepage panels and ibis's own
      // suggested-destination search (below) all go through this same gate. `includeAbsorbed` is
      // an explicit opt-in for the few callers that still need the full historical list (the
      // sitemap, so the still-live URL keeps its SEO/crawl value; an audit script; a "where did X
      // go" lookup) -- default is exclude, so a new caller never has to remember to ask.
      if (p.absorbedInto && !options.includeAbsorbed) return false;
      if (!options.includeSupporting && p.principal === false) return false;
      return true;
    });
  }

  function sitemapProducts() {
    return publicProducts({ includeSupporting: true, includeAbsorbed: true }).filter(function (p) { return p.id !== 'account'; });
  }

  function ecosystemGroups() {
    var groups = (global.FTN && global.FTN.ProductRegistryGroups) || [];
    return groups.map(function (group) {
      return { id: group.id, title: group.title, description: group.description, products: group.productIds.map(get).filter(function (product) {
        return product && !product.absorbedInto && product.publicVisibility !== false && ['PRIVATE','MAINTENANCE','VAULTED'].indexOf(product.status) === -1;
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

  // FTN Consolidation, closure wave (2026-09-18): the Directory must "clearly distinguish
  // Products/Capabilities/Data Services" (GOVERNANCE/FTN_Consolidation_2026-09-18.md), not just
  // silently drop the 11 absorbed products from the Products list with no trace. These two
  // accessors give the Directory (js/ftn-directory.js) the other two categories.
  function absorbedCapabilities() {
    return data().filter(function (p) { return !!p.absorbedInto; }).map(function (p) {
      return { product: p, absorbedIntoProduct: get(p.absorbedInto) };
    });
  }

  function dataServiceProducts() {
    return data().filter(function (p) { return p.productType === 'data-service' && p.publicVisibility !== false; });
  }

  // "Where did X go?" lookup (FTN Consolidation): resolves a retired product id/name/legacyId to
  // its honest current state -- used by ibis so it never pretends an absorbed product vanished,
  // and never suggests it as a live destination either (see js/ibis-absorbed-capabilities.js).
  function absorbedInfo(idOrName) {
    var s = String(idOrName || '').toLowerCase();
    var product = data().filter(function (p) {
      return p.absorbedInto && (p.id.toLowerCase() === s || (p.name && p.name.toLowerCase() === s) || (p.shortName && p.shortName.toLowerCase() === s) || (Array.isArray(p.legacyIds) && p.legacyIds.some(function (id) { return String(id).toLowerCase() === s; })));
    })[0];
    if (!product) return null;
    var parent = get(product.absorbedInto);
    return { product: product, absorbedIntoId: product.absorbedInto, absorbedIntoProduct: parent, route: product.route };
  }

  global.FTN = global.FTN || {};
  global.FTN.ProductRegistry = { all: all, get: get, byRoute: byRoute, homepagePanels: homepagePanels, publicProducts: publicProducts, sitemapProducts: sitemapProducts, ecosystemGroups: ecosystemGroups, accountShortcuts: accountShortcuts, search: search, absorbedInfo: absorbedInfo, absorbedCapabilities: absorbedCapabilities, dataServiceProducts: dataServiceProducts };
})(window);
