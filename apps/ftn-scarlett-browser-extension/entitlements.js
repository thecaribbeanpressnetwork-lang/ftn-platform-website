// Entitlement architecture (data model only -- see README/docs for what this is and is not).
// Central, non-hardcoded pricing/capability config so Scarlett, ibis and Headspace can eventually
// share one FTN entitlement system rather than separate billing silos, per the product definition.
//
// IMPORTANT, read before wiring this to anything: NOTHING in this file is connected to a real
// payment processor. `status: 'PLANNED'` on every paid tier means exactly that -- no checkout, no
// charge capability, no server-side entitlement check exists yet. Every capability Scarlett V2
// actually built (Original/Assist/Adapt/Transform/Compare/Blend, Data Faucet/Shield, Search/Find,
// accessibility) remains fully free and unrestricted in this build; this module does not gate any
// of them. Wiring a real payment processor is a separate, consequential decision for FTN to make
// deliberately (new vendor dependency, real money movement) -- this file exists so that decision,
// when made, has a real data model to attach to instead of scattering pricing logic through the UI.
(function (scope) {
  'use strict';

  const ENTITLEMENTS = {
    'scarlett.core': { includedIn: ['free', 'plus', 'intelligence', 'pro'], description: 'Original/Assist/Adapt, accessibility, Data Faucet visibility, tracker-link cleanup, baseline Search' },
    'scarlett.adapt': { includedIn: ['free', 'plus', 'intelligence', 'pro'], description: 'Meaningful Adapt on article/listing/service pages' },
    'scarlett.transform': { includedIn: ['plus', 'intelligence', 'pro'], previewIn: ['free'], description: 'Full Transform (Scarlett Deck) on every supported page type' },
    'scarlett.compare': { includedIn: ['plus', 'intelligence', 'pro'], previewIn: ['free'], description: 'Full Compare (Scarlett Reveal)' },
    'scarlett.blend': { includedIn: ['plus', 'intelligence', 'pro'], previewIn: ['free'], description: 'Blend levels above 60%' },
    'scarlett.shield': { includedIn: ['free', 'plus', 'intelligence', 'pro'], description: 'Data Faucet Protection (blocking) -- privacy is never paywalled' },
    'scarlett.sync': { includedIn: ['plus', 'intelligence', 'pro'], description: 'Cross-device preference sync' },
    'ibis.standard': { includedIn: ['free', 'plus'], description: 'Baseline ibis page intelligence and Search' },
    'ibis.research': { includedIn: ['intelligence', 'pro'], description: 'Larger ibis allowance, deeper research' },
    'ibis.deep_reasoning': { includedIn: ['pro'], description: 'Highest-quota reasoning' },
    'headspace.standard': { includedIn: ['intelligence', 'pro'], previewIn: ['plus'], description: 'Headspace escalation' },
    'connections.standard': { includedIn: ['pro'], description: 'Governed connected-action workflows' },
  };

  // Pricing hypotheses (§24 of the product definition), explicitly not immutable. `status` is the
  // truth-in-labeling field: FREE is real and live; everything else is PLANNED (data model + UI
  // only, no checkout exists).
  const TIERS = [
    { id: 'free', name: 'Scarlett Free', price: 'US$0', status: 'LIVE', capabilities: capabilitiesFor('free') },
    { id: 'plus', name: 'Scarlett+', price: 'US$5.99/mo or US$59/yr (hypothesis)', status: 'PLANNED', capabilities: capabilitiesFor('plus') },
    { id: 'intelligence', name: 'FTN Intelligence', price: 'US$11.99/mo or US$119/yr (hypothesis)', status: 'PLANNED', capabilities: capabilitiesFor('intelligence') },
    { id: 'pro', name: 'FTN Pro', price: 'US$19.99–24.99/mo (hypothesis)', status: 'PLANNED', capabilities: capabilitiesFor('pro') },
  ];

  function capabilitiesFor(tierId) {
    return Object.entries(ENTITLEMENTS)
      .filter(([, def]) => def.includedIn.includes(tierId))
      .map(([id]) => id);
  }

  function previewCapabilitiesFor(tierId) {
    return Object.entries(ENTITLEMENTS)
      .filter(([, def]) => def.previewIn?.includes(tierId))
      .map(([id]) => id);
  }

  // Current build: everyone is effectively on `free`, and free already includes every capability
  // this build implements (nothing is actually gated). This function exists so a future real
  // entitlement check has one place to call rather than being invented ad hoc at each call site.
  function currentTier() { return 'free'; }
  function hasCapability(id) { return capabilitiesFor(currentTier()).includes(id); }
  function isPreviewOnly(id) { return previewCapabilitiesFor(currentTier()).includes(id); }

  scope.FTN_SCARLETT_ENTITLEMENTS = { ENTITLEMENTS, TIERS, capabilitiesFor, previewCapabilitiesFor, currentTier, hasCapability, isPreviewOnly };
})(typeof self !== 'undefined' ? self : this);
