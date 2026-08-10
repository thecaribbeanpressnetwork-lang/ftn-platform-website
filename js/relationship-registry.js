// FTN Platform Website — Relationship Registry accessor.
(function (global) {
  'use strict';

  function data() {
    return (global.FTN && global.FTN.RelationshipRegistryData) || [];
  }

  function all() { return data().slice(); }
  function get(id) { return data().filter(function (item) { return item.id === id; })[0] || null; }
  function byType(type) { return data().filter(function (item) { return item.relationshipType === type; }); }
  function forProduct(productId) {
    return data().filter(function (item) { return (item.ecosystemUses || []).indexOf(productId) !== -1; });
  }
  function affiliates() { return byType('affiliate').filter(function (item) { return item.status === 'confirmed'; }); }
  function connectedProviders() { return data().filter(function (item) { return item.providerClass === 'connected-provider'; }); }

  global.FTN = global.FTN || {};
  global.FTN.RelationshipRegistry = {
    all: all,
    get: get,
    byType: byType,
    forProduct: forProduct,
    affiliates: affiliates,
    connectedProviders: connectedProviders
  };
})(window);
