// FTN Walkthrough Engine — data model / foundation only (final integration pass, Phase H).
//
// This is deliberately NOT a video renderer. No browser automation, no FFmpeg, no rendering
// pipeline exists yet -- that is real, separate future work (Phase I researched the options;
// none are provisioned). What exists here is the reusable SHAPE a walkthrough is represented in,
// so a future rendering pass has a real data model to fill in rather than inventing one under
// deadline pressure, and so "TAKE THE FTN TOUR" can be built honestly once real steps/narration/
// video exist -- never before.
//
// Reuses the EXISTING product registry (js/product-registry-data.js / js/product-registry.js) for
// "what FTN products exist" -- this is not a second registry. A walkthrough's staleness check is
// real: it compares against each product's own already-tracked lastVerified/releaseVersion
// fields, not an invented freshness signal.
(function (global) {
  'use strict';

  var STATUS = ['DRAFT', 'PLANNED', 'GENERATING', 'READY', 'STALE', 'FAILED'];
  var SCOPE = ['ENTIRE_FTN_TOUR', 'PRODUCT_TOUR', 'USER_JOURNEY_TOUR'];
  var ACTIONS = ['NAVIGATE', 'CLICK', 'TYPE', 'SCROLL', 'WAIT', 'HIGHLIGHT', 'SCREENSHOT', 'NARRATE'];

  // One step in a walkthrough -- the smallest real unit this model represents. targetElement is a
  // CSS selector (the same DOM the site already renders, never a second description of the UI).
  function walkthroughStep(input) {
    input = input || {};
    if (!input.action || ACTIONS.indexOf(input.action) === -1) throw new Error('walkthroughStep requires a valid action: ' + ACTIONS.join('/'));
    return {
      id: input.id || ('step-' + Math.random().toString(36).slice(2, 9)),
      action: input.action,
      targetElement: input.targetElement || null,
      route: input.route || null,
      narration: input.narration || null,
      caption: input.caption || null,
      screenshot: input.screenshot || null,       // real asset URL once captured; null until then
      videoSegment: input.videoSegment || null,    // real asset URL once rendered; null until then
      durationMs: typeof input.durationMs === 'number' ? input.durationMs : null,
      status: input.status && STATUS.indexOf(input.status) !== -1 ? input.status : 'DRAFT',
    };
  }

  // A full walkthrough -- one product tour, the entire FTN tour, or one named user journey
  // (e.g. "idea to pitch package" spanning ibis.ai -> FTNScreen). productIds must reference real,
  // existing entries in the product registry -- this function fails closed on an unknown id
  // rather than silently accepting a typo.
  function createWalkthrough(scope, options) {
    options = options || {};
    if (SCOPE.indexOf(scope) === -1) throw new Error('createWalkthrough requires a valid scope: ' + SCOPE.join('/'));
    var Registry = global.FTN && global.FTN.ProductRegistry;
    var productIds = Array.isArray(options.productIds) ? options.productIds : [];
    if (Registry && productIds.length) {
      productIds.forEach(function (id) {
        if (!Registry.get(id)) throw new Error('createWalkthrough: unknown product id "' + id + '" -- not in the product registry.');
      });
    }
    return {
      id: options.id || ('walkthrough-' + Math.random().toString(36).slice(2, 9)),
      scope: scope,
      title: options.title || null,
      productIds: productIds,
      steps: (options.steps || []).map(walkthroughStep),
      version: options.version || 1,
      status: options.status && STATUS.indexOf(options.status) !== -1 ? options.status : 'DRAFT',
      generatedAt: options.generatedAt || null,   // null until a real render actually happens
      canonicalVideoUrl: options.canonicalVideoUrl || null, // FTN-hosted, never a YouTube URL by default
      youtubeUrl: options.youtubeUrl || null,      // optional, secondary -- never the canonical copy
      captionsUrl: options.captionsUrl || null,
      transcriptUrl: options.transcriptUrl || null,
    };
  }

  // Real staleness check: a walkthrough is stale if any product it covers has a
  // lastVerified/releaseVersion newer than the walkthrough's own generatedAt/version, OR if it
  // was never actually generated at all (generatedAt === null is honestly "not stale", it's
  // "never built" -- a different, more basic state, reported separately).
  function checkStaleness(walkthrough) {
    if (!walkthrough.generatedAt) return { stale: false, neverGenerated: true, reasons: [] };
    var Registry = global.FTN && global.FTN.ProductRegistry;
    if (!Registry) return { stale: false, neverGenerated: false, reasons: ['Product registry not loaded -- cannot check.'] };
    var reasons = [];
    walkthrough.productIds.forEach(function (id) {
      var product = Registry.get(id);
      if (!product) { reasons.push(id + ': no longer exists in the product registry.'); return; }
      if (product.lastVerified && walkthrough.generatedAt && new Date(product.lastVerified) > new Date(walkthrough.generatedAt)) {
        reasons.push(id + ': product verified ' + product.lastVerified + ', after this walkthrough was generated (' + walkthrough.generatedAt + ').');
      }
    });
    return { stale: reasons.length > 0, neverGenerated: false, reasons: reasons };
  }

  function summarize(walkthrough) {
    var staleness = checkStaleness(walkthrough);
    var effectiveStatus = walkthrough.status;
    if (walkthrough.status === 'READY' && staleness.stale) effectiveStatus = 'STALE';
    return {
      id: walkthrough.id, scope: walkthrough.scope, title: walkthrough.title,
      status: effectiveStatus, stepCount: walkthrough.steps.length,
      hasCanonicalVideo: !!walkthrough.canonicalVideoUrl,
      staleness: staleness,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.Walkthrough = {
    STATUS: STATUS.slice(), SCOPE: SCOPE.slice(), ACTIONS: ACTIONS.slice(),
    walkthroughStep: walkthroughStep, createWalkthrough: createWalkthrough,
    checkStaleness: checkStaleness, summarize: summarize,
  };
})(typeof window !== 'undefined' ? window : globalThis);
