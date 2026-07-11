// FTN Platform Website — commercial display package structures.
//
// Capability structures only — no pricing, per founder direction. These IDs
// match the `adLevel` values used by js/display-config-data.js, so a
// Display Config and a Package describe the same axis from two angles: one
// is what an operator picks, the other is what FTN sells. No prices are
// assigned in this phase.
(function (global) {
  'use strict';

  var packages = [
    {
      id: 'free',
      name: 'Free Public',
      tagline: 'The public FTN Live website — most network advertising.',
      networkAdDensity: 'high',
      customerPromotionAllowed: false,
      savedDeploymentAllowed: false,
      brandingRequired: 'FTN Platform',
      exampleCombination: { indicators: 8, ads: 3 },
    },
    {
      id: 'sponsored',
      name: 'Sponsored Display',
      tagline: 'Lowest commercial tier — substantial network advertising in exchange for a managed screen.',
      networkAdDensity: 'high',
      customerPromotionAllowed: false,
      savedDeploymentAllowed: true,
      brandingRequired: 'FTN Platform',
      exampleCombination: { indicators: 13, ads: 2 },
    },
    {
      id: 'standard',
      name: 'Standard Display',
      tagline: 'Moderate advertising, more indicators, limited customer promotion.',
      networkAdDensity: 'moderate',
      customerPromotionAllowed: 'limited',
      savedDeploymentAllowed: true,
      brandingRequired: 'FTN Platform',
      exampleCombination: { indicators: 20, ads: 4 },
    },
    {
      id: 'premium',
      name: 'Premium Display',
      tagline: 'Low network advertising, customer promotion, enhanced layout choices.',
      networkAdDensity: 'low',
      customerPromotionAllowed: true,
      savedDeploymentAllowed: true,
      brandingRequired: 'Powered by FTN',
      exampleCombination: { indicators: 34, ads: 6 },
    },
    {
      id: 'ad-free',
      name: 'Ad-Free Display',
      tagline: 'No third-party advertisements. FTN attribution remains. Highest subscription tier.',
      networkAdDensity: 'none',
      customerPromotionAllowed: true,
      savedDeploymentAllowed: true,
      brandingRequired: 'Powered by FTN',
      exampleCombination: { indicators: 55, ads: 0 },
    },
    {
      id: 'enterprise',
      name: 'Enterprise / Government',
      tagline: 'Custom configuration, customer-only content, no network ads unless requested.',
      networkAdDensity: 'none (unless requested)',
      customerPromotionAllowed: true,
      savedDeploymentAllowed: true,
      brandingRequired: 'Configurable',
      futureCapabilities: ['Remote management', 'Emergency override', 'Founder-issued access provisioning'],
      exampleCombination: { indicators: 52, ads: 8 },
    },
  ];

  function get(id) {
    for (var i = 0; i < packages.length; i++) {
      if (packages[i].id === id) return packages[i];
    }
    return null;
  }

  global.FTN = global.FTN || {};
  global.FTN.AdPackages = { all: packages, get: get };
})(window);
