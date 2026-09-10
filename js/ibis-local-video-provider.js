// FTN Platform — zero-cost local fallback provider for IBIS video requests.
// This is not a cloud AI video model. It is an FTN-owned browser renderer that creates a real
// downloadable animated video artifact when no native hosted/open model is eligible. It exists so
// VIDEO_GENERATION never collapses into media search or a dead end; provenance must label it as
// local procedural video, not native AI text-to-video.
(function (global) {
  'use strict';
  var FTN = global.FTN = global.FTN || {};
  var base = FTN.IbisProviders;
  if (!base || base.__ibisLocalVideoPatched) return;

  var provider = {
    id: 'ibis-local-canvas-video',
    name: 'IBIS local procedural video renderer',
    categories: ['video'],
    capabilities: ['VIDEO_GENERATION', 'TEXT_TO_VIDEO'],
    integration: 'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus: 'LIVE',
    affiliateStatus: 'NOT_APPLICABLE',
    payAsYouGo: false,
    prepaidRequired: false,
    enabled: true,
    costToIbis: 'ZERO_COST_TO_IBIS',
    website: null,
    apiUrl: null,
    pricingUrl: null,
    affiliateProgramUrl: null,
    commercialUse: 'NOT_APPLICABLE_FTN_OWNED_BROWSER_RENDERER_NO_THIRD_PARTY_MODEL',
    redistribution: 'NOT_APPLICABLE_FTN_OWNED_ARTIFACT',
    lastVerified: '2026-09-10',
    userAuthorizationRequired: false,
    weightsAvailable: 'NOT_APPLICABLE_NO_MODEL',
    sourceAvailable: 'YES_FTN_OWNED_js/ibis-provider-fabric.js',
    selfHostable: true,
    deploymentMethod: 'BROWSER_CLIENT_SIDE_CANVAS_MEDIARECORDER',
    hardwareRequirements: 'MODERN_BROWSER_WITH_CANVAS_AND_MEDIARECORDER',
    verificationSource: 'js/ibis-provider-fabric.js and production browser verification',
    lifecycleState: 'ELIGIBLE',
    timeoutMs: 45000,
    note: 'Zero-cost last-resort video artifact route. It renders a simple prompt-responsive animated canvas video in the visitor browser and returns a real WebM file. It must be truth-labeled as local procedural rendering, not photorealistic/native AI video.'
  };

  function dedupe(list) {
    var seen = Object.create(null);
    return list.filter(function (p) { if (!p || !p.id || seen[p.id]) return false; seen[p.id] = true; return true; });
  }
  function all() { return dedupe((base.all ? base.all() : []).concat([provider])); }

  FTN.IbisProviders = {
    __ibisLocalVideoPatched: true,
    all: all,
    byCapability: function (capability) { return all().filter(function (p) { return (p.capabilities || []).indexOf(capability) !== -1; }); },
    byCategory: function (category) { return all().filter(function (p) { return (p.categories || []).indexOf(category) !== -1; }); },
    get: function (id) { return id === provider.id ? provider : (base.get ? base.get(id) : all().find(function (p) { return p.id === id; }) || null); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
