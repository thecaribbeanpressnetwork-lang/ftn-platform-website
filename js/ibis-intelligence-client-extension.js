// FTN Platform — routes the new deterministic intelligence capabilities through the EXISTING
// IbisClient universal fabric without modifying its original executor table. The wrapper injects
// an executor only for capabilities this branch now genuinely implements; all other requests pass
// through unchanged. Eligibility, permissions, provider selection and provenance remain IbisClient's.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},base=FTN.IbisClient;
  if(!base){FTN.IbisIntelligenceClientExtension={applied:false,reason:'IbisClient must load first.'};return;}
  var runtimeIntentGraph=null;
  function transport(fn){return function(provider){var started=Date.now();try{return Promise.resolve({success:true,latencyMs:Date.now()-started,data:fn(provider)});}catch(err){return Promise.resolve({success:false,latencyMs:Date.now()-started,errorType:'SERVER_ERROR',errorDetail:err&&err.message});}};}
  function executorFor(capability,payload){payload=payload||{};
    if(capability==='CORRELATION_ANALYSIS')return transport(function(provider){if(provider.id!=='ibis-local-correlation-engine'||!FTN.IbisCorrelation)throw new Error('Correlation engine is not loaded.');if(!payload.a||!payload.b)return{success:false,errorType:'INVALID_REQUEST',reason:'Two sourced series are required.'};return FTN.IbisCorrelation.analyze(payload.a,payload.b,payload.options||{});});
    if(capability==='CAPITAL_SCENARIO')return transport(function(provider){if(provider.id!=='ibis-local-capital-intelligence'||!FTN.IbisCapital)throw new Error('Capital Intelligence is not loaded.');return FTN.IbisCapital.planIncome(payload);});
    if(capability==='CONTEXT_GRAPH_QUERY')return transport(function(provider){if(provider.id!=='ibis-local-context-graph'||!FTN.IbisContextGraph)throw new Error('Context Graph is not loaded.');var graph=FTN.IbisContextGraph.fromRegistries({scoutFindings:payload.scoutFindings||[],scoutRunDate:payload.scoutRunDate||null});var op=payload.operation||'SNAPSHOT';if(op==='NEIGHBORS')return{success:true,operation:op,rows:graph.neighbors(payload.type,payload.id,payload.options||{})};if(op==='EXPLAIN_CONNECTION')return Object.assign({success:true,operation:op},FTN.IbisContextGraph.explainConnection(graph,payload.aType,payload.aId,payload.bType,payload.bId));if(op==='GET')return{success:true,operation:op,node:graph.get(payload.type,payload.id)};return{success:true,operation:'SNAPSHOT',graph:graph.toJSON()};});
    if(capability==='INTENT_STORE')return transport(function(provider){if(provider.id!=='ibis-local-intent-graph'||!FTN.IbisIntentGraph)throw new Error('Intent Graph is not loaded.');runtimeIntentGraph=runtimeIntentGraph||new FTN.IbisIntentGraph.Graph();FTN.IbisRuntimeIntentGraph=runtimeIntentGraph;var op=payload.operation||'UPSERT';if(op==='REVOKE')return runtimeIntentGraph.revoke(payload.id);if(op==='GET')return{success:true,intent:runtimeIntentGraph.get(payload.id)};if(op==='LIST')return{success:true,intents:runtimeIntentGraph.all(payload.filter||{})};return runtimeIntentGraph.upsert(payload.intent||payload);});
    if(capability==='OPPORTUNITY_MATCH')return transport(function(provider){if(provider.id!=='ibis-local-opportunity-graph'||!FTN.IbisOpportunityGraph)throw new Error('Opportunity Graph is not loaded.');var intent=payload.intent||(runtimeIntentGraph&&payload.intentId?runtimeIntentGraph.get(payload.intentId):null);if(!intent)return{success:false,errorType:'MISSING_INTENT',reason:'A structured intent is required.'};var graph=new FTN.IbisOpportunityGraph.Graph();graph.ingestReviewedFindings(payload.findings||[]);return graph.matchIntent(intent,payload.options||{});});
    if(capability==='FORESIGHT_GENERATE')return transport(function(provider){if(provider.id!=='ibis-local-foresight-engine'||!FTN.IbisForesight)throw new Error('Foresight Engine is not loaded.');return FTN.IbisForesight.generate(payload);});
    return null;
  }
  var baseRequest=base.request.bind(base);
  function request(spec){spec=spec||{};if(spec.executor)return baseRequest(spec);var ex=executorFor(spec.capability,spec.payload);return baseRequest(ex?Object.assign({},spec,{executor:ex}):spec);}
  FTN.IbisClient=Object.assign({},base,{request:request});
  FTN.IbisIntelligenceClientExtension={applied:true,capabilities:['CORRELATION_ANALYSIS','CAPITAL_SCENARIO','CONTEXT_GRAPH_QUERY','INTENT_STORE','OPPORTUNITY_MATCH','FORESIGHT_GENERATE']};
})(typeof window!=='undefined'?window:globalThis);
