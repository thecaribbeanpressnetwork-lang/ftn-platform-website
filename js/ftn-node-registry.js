// FTN Node Registry — the IBIS-routing companion view over js/product-registry-data.js.
//
// This does NOT duplicate the Product Registry (identity, taglines, hero assets, legal notices --
// see js/product-registry-data.js/js/product-registry.js for that, the existing single source of
// truth). It derives a second, narrower, IBIS-specific view from the SAME real product records:
// can ibis route a user into this node, can this node reach ibis's own capabilities, what does it
// declare as its inputs/outputs/data dependencies. Every field below is computed from a real,
// already-existing field on the real product record (status/visibility/capabilities/dataSources/
// accessRules/route) -- nothing here is a hand-typed guess about a product that wasn't already
// documented, per the open-source/open-weight audit pass's explicit "Do NOT invent products" rule.
//
// Derivation methodology (recorded here, not hidden, so a future session can judge its limits):
// - IBISRole / canIbisRouteInto: derived from visibility+status. A PRIVATE or VAULTED product
//   (Mission Control, FTN Love, FTN Health) is never a route target ibis suggests to a public
//   guest, matching the same boundary those products' own pages already enforce.
// - canCallIbisCapabilities: every public page loads js/nav.js, which unconditionally
//   loadOnce()s js/ibis-widget.js (the sitewide floating assistant) -- confirmed by reading
//   js/nav.js directly, not assumed. This field reflects that real, sitewide mechanism rather
//   than a per-page re-verification this pass didn't individually redo for all 27 nodes.
// - inputTypes/outputTypes: heuristically inferred from each product's own declared
//   `capabilities` keywords (e.g. a capability mentioning "visual"/"image" implies IMAGE).
//   Every real product interface is TEXT at minimum (it's a web UI). This is a documented
//   heuristic, not an independently fact-checked capability inventory per node.
(function (global) {
  'use strict';

  var TYPE_KEYWORDS = [
    ['AUDIO', /audio|sound|beat|mix|master|deck|dj|instrumental|epk/i],
    ['IMAGE', /visual|image|cover|photo/i],
    ['VIDEO', /video|film|screen|embedded-playback|programme/i],
    ['GEOSPATIAL', /map|satellite|imagery/i],
  ];

  function inferOutputTypes(product) {
    var caps = (product.capabilities || []).join(' ');
    var types = ['TEXT'];
    TYPE_KEYWORDS.forEach(function (pair) {
      if (pair[1].test(caps)) types.push(pair[0]);
    });
    return types;
  }

  function inferInputTypes(product) {
    var caps = (product.capabilities || []).join(' ');
    var types = ['TEXT'];
    if (/upload|import|intake|local-audio|local-media|local-deck|deck-loading|submission/i.test(caps)) {
      if (/audio|local-audio|beat|mix|deck/i.test(caps)) types.push('AUDIO');
      if (/video/i.test(caps)) types.push('VIDEO');
      if (/image|visual|photo/i.test(caps)) types.push('IMAGE');
    }
    return types;
  }

  function deriveNode(product) {
    var isPrivate = product.visibility === 'PRIVATE' || product.visibility === 'VAULTED' || product.publicVisibility === false;
    var isBrain = product.id === 'ibis-ai';
    return {
      id: product.id,
      name: product.name,
      route: product.route,
      status: product.status,
      visibility: product.visibility || 'PUBLIC',
      productType: product.productType || 'product',
      parentProduct: product.parentProduct || null,
      IBISRole: isBrain ? 'BRAIN' : isPrivate ? 'PRIVATE_NOT_ROUTABLE' : 'CONSUMER',
      canIbisRouteInto: !isPrivate && product.status !== 'VAULTED' && !!product.route,
      canCallIbisCapabilities: !isPrivate,
      primaryCapabilities: (product.capabilities || []).slice(),
      dataDependencies: (product.dataSources || []).slice(),
      permissions: (product.accessRules || []).slice(),
      inputTypes: inferInputTypes(product),
      outputTypes: inferOutputTypes(product),
      projectDependencies: (product.relatedProducts || []).slice(),
    };
  }

  function build() {
    var products = (global.FTN && global.FTN.ProductRegistryData) || [];
    return products.map(deriveNode);
  }

  var nodes = null;
  function all() {
    if (!nodes) nodes = build();
    return nodes.map(function (n) { return Object.assign({}, n); });
  }
  function get(id) {
    var n = all().filter(function (x) { return x.id === id; })[0];
    return n || null;
  }
  // Nodes ibis may honestly suggest a public guest navigate to right now.
  function routable() {
    return all().filter(function (n) { return n.canIbisRouteInto; });
  }
  function byCapabilityKeyword(keyword) {
    var re = new RegExp(keyword, 'i');
    return all().filter(function (n) { return n.primaryCapabilities.some(function (c) { return re.test(c); }); });
  }

  global.FTN = global.FTN || {};
  global.FTN.NodeRegistry = { all: all, get: get, routable: routable, byCapabilityKeyword: byCapabilityKeyword };
})(typeof window !== 'undefined' ? window : globalThis);
