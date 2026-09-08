// FTN Platform — additive extension of the canonical ibis capability/provider fabric.
// Keeps js/ibis-provider-registry.js and js/ibis-capability-taxonomy.js as the base authorities,
// then adds ONLY capabilities that now have real deterministic implementations in this branch.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  var baseTax=FTN.CapabilityTaxonomy,baseProviders=FTN.IbisProviders;
  if(!baseTax||!baseProviders){FTN.IbisIntelligenceFabricExtension={applied:false,reason:'Base taxonomy/provider registry must load first.'};return;}
  var CAPS=['CORRELATION_ANALYSIS','CAPITAL_SCENARIO','CONTEXT_GRAPH_QUERY','INTENT_STORE','OPPORTUNITY_MATCH','FUNDING_SEARCH','FORESIGHT_GENERATE','BUILD_TEST_PUBLISH_SHARE'];
  var addedProviders=[
    {id:'ibis-local-correlation-engine',name:'ibis deterministic correlation engine',categories:['intelligence'],capabilities:['CORRELATION_ANALYSIS'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',apiStatus:'LIVE',enabled:true,costToIbis:'ZERO_COST_TO_IBIS',userAuthorizationRequired:false,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-correlation-engine.js',verificationSource:'js/ibis-correlation-engine.js and tests/ibis-correlation-engine-audit.mjs',privacyClassification:'LOCAL_NO_EXTERNAL_TRANSMISSION',attributionRequired:false},
    {id:'ibis-local-capital-intelligence',name:'ibis deterministic capital intelligence',categories:['intelligence'],capabilities:['CAPITAL_SCENARIO'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',apiStatus:'LIVE',enabled:true,costToIbis:'ZERO_COST_TO_IBIS',userAuthorizationRequired:false,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-capital-intelligence.js',verificationSource:'js/ibis-capital-intelligence.js and tests/ibis-capital-intelligence-audit.mjs',privacyClassification:'LOCAL_NO_EXTERNAL_TRANSMISSION',attributionRequired:false},
    {id:'ibis-local-context-graph',name:'ibis grounded Context Graph v1',categories:['intelligence'],capabilities:['CONTEXT_GRAPH_QUERY'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',apiStatus:'LIVE',enabled:true,costToIbis:'ZERO_COST_TO_IBIS',userAuthorizationRequired:false,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-context-graph.js',verificationSource:'js/ibis-context-graph.js and tests/ibis-context-graph-audit.mjs',privacyClassification:'LOCAL_NO_EXTERNAL_TRANSMISSION',attributionRequired:false},
    {id:'ibis-local-intent-graph',name:'ibis private Intent Graph',categories:['intelligence'],capabilities:['INTENT_STORE'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',apiStatus:'LIVE',enabled:true,costToIbis:'ZERO_COST_TO_IBIS',userAuthorizationRequired:false,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-intent-graph.js',verificationSource:'js/ibis-intent-graph.js and tests/ibis-intent-opportunity-graph-audit.mjs',privacyClassification:'LOCAL_NO_EXTERNAL_TRANSMISSION',attributionRequired:false},
    {id:'ibis-local-opportunity-graph',name:'ibis Opportunity Graph matcher',categories:['intelligence'],capabilities:['OPPORTUNITY_MATCH'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',apiStatus:'LIVE',enabled:true,costToIbis:'ZERO_COST_TO_IBIS',userAuthorizationRequired:false,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-opportunity-graph.js',verificationSource:'js/ibis-opportunity-graph.js and tests/ibis-intent-opportunity-graph-audit.mjs',privacyClassification:'LOCAL_NO_EXTERNAL_TRANSMISSION',attributionRequired:false},
    {id:'ibis-local-funding-strategy',name:'ibis Ricardo funding decision funnel',categories:['intelligence','opportunities'],capabilities:['FUNDING_SEARCH'],integration:'LOCAL_DETERMINISTIC_WITH_CONNECTED_SOURCES',apiStatus:'LIVE',enabled:true,costToIbis:'ZERO_COST_TO_IBIS',userAuthorizationRequired:false,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-funding-strategy.js',verificationSource:'js/ibis-funding-strategy.js and tests/ibis-organism-integration-audit.mjs',privacyClassification:'PRIVATE_CONTEXT_LOCAL_SOURCE_METADATA_CONNECTED',attributionRequired:true},
    {id:'ibis-local-foresight-engine',name:'ibis evidence-backed Foresight Engine',categories:['intelligence'],capabilities:['FORESIGHT_GENERATE'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',apiStatus:'LIVE',enabled:true,costToIbis:'ZERO_COST_TO_IBIS',userAuthorizationRequired:false,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-foresight-engine.js',verificationSource:'js/ibis-foresight-engine.js and tests/ibis-foresight-engine-audit.mjs',privacyClassification:'LOCAL_NO_EXTERNAL_TRANSMISSION',attributionRequired:false},
    {id:'ibis-local-build-delivery-orchestrator',name:'ibis build/test/preview/share orchestrator',categories:['engineering','execution'],capabilities:['BUILD_TEST_PUBLISH_SHARE'],integration:'LOCAL_ORCHESTRATOR_REQUIRES_STAGE_ADAPTERS',apiStatus:'LIVE_ORCHESTRATOR',enabled:true,costToIbis:'DEPENDS_ON_STAGE_ADAPTERS',userAuthorizationRequired:true,lifecycleState:'ELIGIBLE',sourceAvailable:'YES_FTN_OWNED_js/ibis-build-preview-share.js',verificationSource:'js/ibis-build-preview-share.js and tests/ibis-build-preview-share-audit.mjs',privacyClassification:'PER_STAGE',attributionRequired:false}
  ];
  function copy(x){return Object.assign({},x);}
  var originalAll=baseProviders.all.bind(baseProviders),originalGet=baseProviders.get.bind(baseProviders),originalByCapability=baseProviders.byCapability.bind(baseProviders),originalByCategory=baseProviders.byCategory.bind(baseProviders);
  FTN.IbisProviders=Object.assign({},baseProviders,{
    all:function(){return originalAll().concat(addedProviders.map(copy));},
    get:function(id){var local=addedProviders.filter(function(p){return p.id===id;})[0];return local?copy(local):originalGet(id);},
    byCapability:function(cap){return originalByCapability(cap).concat(addedProviders.filter(function(p){return p.capabilities.indexOf(cap)>=0;}).map(copy));},
    byCategory:function(cat){return originalByCategory(cat).concat(addedProviders.filter(function(p){return p.categories.indexOf(cat)>=0;}).map(copy));}
  });
  var originalAllCaps=baseTax.all.bind(baseTax),originalRecognized=baseTax.isRecognized.bind(baseTax),originalCanonical=baseTax.isCanonical.bind(baseTax),originalEquivalent=baseTax.canonicalEquivalent.bind(baseTax),originalGroup=baseTax.groupOf.bind(baseTax);
  var canonical=Object.assign({},baseTax.CANONICAL,{INTELLIGENCE:CAPS.slice()});
  FTN.CapabilityTaxonomy=Object.assign({},baseTax,{
    CANONICAL:canonical,
    all:function(){return Array.from(new Set(originalAllCaps().concat(CAPS)));},
    isRecognized:function(cap){return CAPS.indexOf(cap)>=0||originalRecognized(cap);},
    isCanonical:function(cap){return CAPS.indexOf(cap)>=0||originalCanonical(cap);},
    canonicalEquivalent:function(cap){return CAPS.indexOf(cap)>=0?cap:originalEquivalent(cap);},
    groupOf:function(cap){return CAPS.indexOf(cap)>=0?'INTELLIGENCE':originalGroup(cap);}
  });
  FTN.IbisIntelligenceFabricExtension={applied:true,capabilities:CAPS.slice(),providerIds:addedProviders.map(function(p){return p.id;})};
})(typeof window!=='undefined'?window:globalThis);
