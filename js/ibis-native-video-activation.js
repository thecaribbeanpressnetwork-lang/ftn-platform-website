// FTN Platform — founder-approved native video activation overlay.
// Adds the Bytez/LTX route to the public provider registry without rewriting the long evidence ledger.
// Bytez is still free-credit guarded and fail-closed server-side; PixVerse/Kling remain disabled until
// their own keys/credits/contracts exist. This file only makes the already-deployed Bytez adapter eligible
// so VIDEO_GENERATION reaches the native provider before falling back to local procedural video.
(function (global) {
  'use strict';
  var FTN = global.FTN = global.FTN || {};
  var base = FTN.IbisProviders;
  if (!base || base.__nativeVideoActivation) return;

  var bytez = {
    id: 'ibis-video-bytez',
    name: 'Bytez · LTX Video native adapter',
    categories: ['video'],
    capabilities: ['VIDEO_GENERATION', 'TEXT_TO_VIDEO'],
    integration: 'NATIVE_API_LIVE',
    apiStatus: 'LIVE_IF_BYTEZ_API_KEY_CONFIGURED',
    affiliateStatus: 'NOT_APPLICABLE',
    payAsYouGo: false,
    prepaidRequired: false,
    enabled: true,
    costToIbis: 'ZERO_COST_TO_IBIS',
    website: 'https://api.bytez.com/',
    apiUrl: 'https://api.bytez.com/models/v2/Lightricks/LTX-Video-0.9.7-dev',
    pricingUrl: null,
    affiliateProgramUrl: null,
    commercialUse: 'FOUNDER_APPROVED_FREE_CREDIT_OPEN_MODEL_PROOF_ROUTE_REVIEW_REQUIRED_BEFORE_SCALE',
    redistribution: 'PROVIDER_OUTPUT_RIGHTS_REVIEW_REQUIRED_BEFORE_CUSTOMER_DELIVERY_AT_SCALE',
    lastVerified: '2026-09-10',
    userAuthorizationRequired: false,
    modelId: 'Lightricks/LTX-Video-0.9.7-dev',
    weightsAvailable: 'YES_OPEN_WEIGHTS_LTXV_LICENSE',
    sourceAvailable: 'NOT_APPLICABLE_HOSTED_BY_BYTEZ',
    selfHostable: false,
    deploymentMethod: 'SUPABASE_EDGE_FUNCTION_TO_BYTEZ_HOSTED_MODEL',
    hardwareRequirements: 'NOT_APPLICABLE_HOSTED_BY_BYTEZ',
    verificationSource: 'supabase/functions/ibis-video-bytez/index.ts and live /ibis-ai/ provider-fabric route',
    lifecycleState: 'ELIGIBLE',
    timeoutMs: 180000,
    privacyClassification: 'THIRD_PARTY_NETWORK_CALL',
    attributionRequired: true,
    note: 'Founder approved 2026-09-10 as first native video route. The Supabase adapter requires BYTEZ_API_KEY, explicit free-credit confirmation, per-IP throttling, and returns 402/503/502 without paid fallback when auth, credits, model availability or artifact validation fail. Local canvas video remains only a labelled procedural fallback, not native AI video.'
  };

  function uniqById(rows) {
    var seen = Object.create(null);
    return rows.filter(function (row) {
      if (!row || !row.id || seen[row.id]) return false;
      seen[row.id] = true;
      return true;
    });
  }
  function add(rows) { return uniqById([bytez].concat(rows || [])); }

  FTN.IbisProviders = {
    __nativeVideoActivation: true,
    all: function () { return add(base.all ? base.all() : []); },
    byCategory: function (category) {
      var rows = base.byCategory ? base.byCategory(category) : [];
      return category === 'video' ? add(rows) : rows;
    },
    byCapability: function (capability) {
      var rows = base.byCapability ? base.byCapability(capability) : [];
      return capability === 'VIDEO_GENERATION' || capability === 'TEXT_TO_VIDEO' ? add(rows) : rows;
    },
    get: function (id) { return id === bytez.id ? bytez : (base.get ? base.get(id) : null); },
    verifiedAt: base.verifiedAt || '2026-09-10',
  };
})(typeof window !== 'undefined' ? window : globalThis);
