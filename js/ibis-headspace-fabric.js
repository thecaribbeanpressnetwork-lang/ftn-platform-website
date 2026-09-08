// FTN Platform — Headspace's single bridge into the canonical ibis execution fabric.
// Loads the shared taxonomy/providers/eligibility/provenance/client once, then only the local
// implementation needed for the requested capability. Headspace consumers should call this
// rather than reaching directly into engine modules.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},loads={};
  function load(src,test){if(test())return Promise.resolve();if(loads[src])return loads[src];loads[src]=new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.defer=true;s.onload=function(){test()?resolve():reject(new Error('Loaded '+src+' but expected capability did not register.'));};s.onerror=function(){reject(new Error('Could not load '+src));};document.head.appendChild(s);});return loads[src];}
  async function base(){
    await load('/js/ibis-capability-taxonomy.js',function(){return !!FTN.CapabilityTaxonomy;});
    await load('/js/ibis-provider-registry.js',function(){return !!FTN.IbisProviders;});
    await load('/js/ibis-intelligence-fabric-extension.js',function(){return !!(FTN.IbisIntelligenceFabricExtension&&FTN.IbisIntelligenceFabricExtension.applied);});
    await load('/js/ibis-eligibility.js',function(){return !!FTN.IbisEligibility;});
    await load('/js/ibis-provenance.js',function(){return !!FTN.IbisProvenance;});
    await load('/js/ibis-client.js',function(){return !!FTN.IbisClient;});
    await load('/js/ibis-intelligence-client-extension.js',function(){return !!(FTN.IbisIntelligenceClientExtension&&FTN.IbisIntelligenceClientExtension.applied);});
  }
  async function ensure(capability){
    await base();
    if(capability==='CORRELATION_ANALYSIS'){
      await load('/js/ibis-math.js',function(){return !!FTN.IbisMath;});
      await load('/js/ibis-correlation-engine.js',function(){return !!FTN.IbisCorrelation;});
    }else if(capability==='CAPITAL_SCENARIO'){
      await load('/js/ibis-math.js',function(){return !!FTN.IbisMath;});
      await load('/js/ibis-capital-intelligence.js',function(){return !!FTN.IbisCapital;});
    }else if(capability==='INTENT_STORE'){
      await load('/js/ibis-intent-graph.js',function(){return !!FTN.IbisIntentGraph;});
    }else if(capability==='OPPORTUNITY_MATCH'){
      await load('/js/ibis-intent-graph.js',function(){return !!FTN.IbisIntentGraph;});
      await load('/js/ibis-opportunity-graph.js',function(){return !!FTN.IbisOpportunityGraph;});
    }else if(capability==='CONTEXT_GRAPH_QUERY'){
      await load('/js/product-registry-data.js',function(){return Array.isArray(FTN.ProductRegistryData);});
      await load('/js/ftn-node-registry.js',function(){return !!FTN.NodeRegistry;});
      await load('/js/ibis-context-graph.js',function(){return !!FTN.IbisContextGraph;});
    }
    if(!FTN.CapabilityTaxonomy.isRecognized(capability))throw new Error('Capability is not recognized by ibis: '+capability);
    return FTN.IbisClient;
  }
  async function request(capability,payload,context){var Client=await ensure(capability);return Client.request({capability:capability,payload:payload||{},context:context||{}});}
  FTN.HeadspaceFabric={ensure:ensure,request:request};
})(typeof window!=='undefined'?window:globalThis);
