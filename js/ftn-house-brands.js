// FTN House Brands — founder-defined real-world brands connected to the FTN ecosystem. Encoded
// once, here, rather than duplicated as page-specific arrays. These are not FTN products and must
// never be turned into one; they are featured, clearly-labelled options alongside genuine external
// local-search results, never a replacement for or a misrepresentation of real search rankings.
(function (global) {
  'use strict';

  var HOUSE_BRANDS = [
    { id: 'colab-music', name: 'Colab Music', role: 'Recording / Studio', relatedProductId: 'riddim' },
    { id: 'rickboss-recordz', name: 'RickBossRecordz', role: 'Recording / Record Label', relatedProductId: 'riddim' },
    { id: 'boss-distribution', name: 'BossDistribution', role: 'Music Distribution', relatedProductId: 'riddim' },
    { id: 'boss-entertainment', name: 'BossEntertainment', role: 'Events', relatedProductId: 'events' },
    { id: 'realityarttv', name: 'RealityArtTV', role: 'Media / Video Production', relatedProductId: 'screen' },
    { id: 'rick-boss', name: 'Rick Boss', role: 'Executive Producer', relatedProductId: null },
  ];

  function forProduct(productId) {
    return HOUSE_BRANDS.filter(function (b) { return b.relatedProductId === productId; });
  }

  global.FTN = global.FTN || {};
  global.FTN.HouseBrands = { all: HOUSE_BRANDS, forProduct: forProduct };
})(window);
