// FTN Platform — ibis Runtime v1.
// One callable surface that joins personal context, routing, permissions, connections and multi-agent execution.
// It does not replace IbisClient: agent execution still goes through the canonical client fabric.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  // Investor-critical fix (2026-09-19): a natural funding/opportunity-strategy query could hang
  // the whole Headspace UI indefinitely with no degraded state -- traced to TWO layers with no
  // bounded deadline anywhere in the chain: FTN.MultiAgentOrchestrator.execute()'s task loop
  // (js/ibis-multi-agent-orchestrator.js) and FTN.ConnectionFabric.invoke() (js/ibis-connection-
  // fabric.js), neither of which any caller-side timeout can rescue once entered, since a caller's
  // own withTimeoutMs() only stops AWAITING the promise -- it never cancels the underlying work, so
  // a second caller reusing the same runtime method was still exposed. This is the single, canonical
  // request deadline for both of ibis Runtime's own long-running calls (ask() and invokeApp()) --
  // every caller now inherits it automatically instead of each needing its own copy. 25000ms reuses
  // the exact budget js/ibis-headspace-universal.js's ask() wrapper already established and ships
  // with in production, rather than introducing a second, competing constant.
  var DEFAULT_REQUEST_DEADLINE_MS=25000;
  var requestDeadlineMs=DEFAULT_REQUEST_DEADLINE_MS;
  // Test-only override, mirroring the existing FTN.MultiAgentOrchestrator.configure() pattern this
  // codebase already uses for dependency injection in tests/ibis-runtime-foundation-audit.mjs --
  // production code never calls this, so the shipped 25000ms budget above is never affected.
  function configureDeadline(ms){requestDeadlineMs=typeof ms==='number'&&ms>0?ms:DEFAULT_REQUEST_DEADLINE_MS;}
  function withDeadline(promise,ms,onTimeout){var settled=false;return new Promise(function(resolve){var timer=setTimeout(function(){if(settled)return;settled=true;resolve(onTimeout());},ms);promise.then(function(v){if(settled)return;settled=true;clearTimeout(timer);resolve(v);},function(err){if(settled)return;settled=true;clearTimeout(timer);resolve(onTimeout(err));});});}
  async function contextSnapshot(){return FTN.PersonalContext&&typeof FTN.PersonalContext.snapshot==='function'?await FTN.PersonalContext.snapshot(['personal','project','preference','intent','founder','goal','decision','outcome']):[];}
  async function cognitiveSnapshot(){return FTN.FounderCognitiveLayer&&typeof FTN.FounderCognitiveLayer.snapshot==='function'?FTN.FounderCognitiveLayer.snapshot():null;}
  async function publicCognitiveSnapshot(){return FTN.FounderCognitiveLayer&&typeof FTN.FounderCognitiveLayer.publicSnapshot==='function'?FTN.FounderCognitiveLayer.publicSnapshot():null;}
  async function verifiedUser(){if(!FTN.Auth||typeof FTN.Auth.getVerifiedUser!=='function')return null;try{return await FTN.Auth.getVerifiedUser();}catch(error){return null;}}
  async function founderAuthorization(user){if(!user||!FTN.Auth||typeof FTN.Auth.ownerAccess!=='function')return false;try{var access=await FTN.Auth.ownerAccess();return !!(access&&access.allowed&&access.ownerIdentity&&!access.deviceApprovalRequired);}catch(error){return false;}}
  async function ask(input,context){context=context||{};if(!FTN.UniversalRouter||!FTN.MultiAgentOrchestrator)return{success:false,errorType:'RUNTIME_NOT_READY'};var values=await Promise.all([contextSnapshot(),cognitiveSnapshot(),publicCognitiveSnapshot(),verifiedUser()]),personal=values[0],privateCognitive=values[1],publicCognitive=values[2],user=values[3],founderAuthorized=await founderAuthorization(user),cognitive=founderAuthorized?privateCognitive:publicCognitive,envelope=Object.assign({},context,{personalContext:personal,cognitiveContext:cognitive,publicCognitiveContext:publicCognitive,privateCognitiveContext:founderAuthorized?privateCognitive:null,founderPolicy:founderAuthorized&&privateCognitive&&privateCognitive.profile||null,ibisContext:Object.assign({},context.ibisContext||{},{authenticated:!!user,founderAuthorized:founderAuthorized})});var route=FTN.UniversalRouter.route(input,envelope);if(!route.success)return route;var result=await withDeadline(FTN.MultiAgentOrchestrator.execute(input,Object.assign({},envelope,{route:route})),requestDeadlineMs,function(){return{success:false,status:'TIMED_OUT',errorType:'ORCHESTRATION_TIMEOUT',degraded:true,run:null};});return Object.assign({},result,{route:route,personalContextCount:personal.length,cognitiveContext:cognitive,identity:{authenticated:!!user,founderAuthorized:founderAuthorized}});}
  async function remember(key,value,opts){if(!FTN.PersonalContext)return{success:false,errorType:'CONTEXT_STORE_UNAVAILABLE'};var row=await FTN.PersonalContext.upsert((opts&&opts.namespace)||'personal',key,value,opts||{});return{success:true,memory:row};}
  async function recall(namespace){if(!FTN.PersonalContext)return[];return FTN.PersonalContext.list(namespace||null);}
  async function permit(subject,action,decision,opts){if(!FTN.PermissionLedger)return{success:false,errorType:'PERMISSION_LEDGER_UNAVAILABLE'};return{success:true,permission:await FTN.PermissionLedger.set(subject,action,decision,opts||{})};}
  async function permission(subject,action,context){if(!FTN.PermissionLedger)return{decision:'ASK',reason:'PERMISSION_LEDGER_UNAVAILABLE'};return FTN.PermissionLedger.check(subject,action,context||{});}
  async function connect(provider,state,opts){if(!FTN.AppRegistry)return{success:false,errorType:'APP_REGISTRY_UNAVAILABLE'};return{success:true,connection:await FTN.AppRegistry.setConnection(provider,state,opts||{})};}
  async function connectionPlan(provider){if(!FTN.ConnectionFabric)return{success:false,errorType:'CONNECTION_FABRIC_UNAVAILABLE'};return{success:true,plan:FTN.ConnectionFabric.connectionPlan(provider)};}
  async function invokeApp(provider,operation,payload,context){if(!FTN.ConnectionFabric)return{success:false,errorType:'CONNECTION_FABRIC_UNAVAILABLE'};return withDeadline(FTN.ConnectionFabric.invoke(provider,operation,payload||{},context||{}),requestDeadlineMs,function(){return{success:false,blocked:true,errorType:'ORCHESTRATION_TIMEOUT',provider:provider,operation:operation};});}
  async function ensureToolCatalog(){if(!FTN.IbisToolCatalog)return null;try{await FTN.IbisToolCatalog.load();return FTN.IbisToolCatalog;}catch(error){return null;}}
  async function tools(filter){var catalog=await ensureToolCatalog();return catalog?{success:true,tools:catalog.list(filter||{}),status:catalog.status()}:{success:false,errorType:'TOOL_CATALOG_UNAVAILABLE',tools:[]};}
  async function invokeTool(id,operation,payload,context){var catalog=await ensureToolCatalog();if(!catalog)return{success:false,errorType:'TOOL_CATALOG_UNAVAILABLE'};return catalog.invoke(id,operation,payload||{},context||{});}
  async function status(){var values=await Promise.all([recall(null),FTN.PermissionLedger?FTN.PermissionLedger.list():[],FTN.AppRegistry?FTN.AppRegistry.list():[],FTN.ConnectionFabric&&typeof FTN.ConnectionFabric.health==='function'?FTN.ConnectionFabric.health():{ready:false,gateways:[]},cognitiveSnapshot(),ensureToolCatalog()]),memories=values[0],permissions=values[1],connections=values[2],connectionFabric=values[3],cognitive=values[4],catalog=values[5];return{ready:!!(FTN.UniversalRouter&&FTN.MultiAgentOrchestrator&&FTN.PersonalContext&&FTN.FounderCognitiveLayer&&FTN.PermissionLedger&&FTN.AppRegistry&&FTN.ConnectionFabric),memoryCount:memories.length,permissionCount:permissions.length,connections:connections.map(function(x){return{provider:x.provider,state:x.connection_state,scopes:x.scopes||[]};}),connectionFabric:connectionFabric,toolCatalog:catalog?catalog.status():{loaded:false,total:0,enabled:0,adapterCount:0},cognitive:{ready:!!cognitive,history:cognitive&&cognitive.history||null,digest:cognitive&&cognitive.integrity&&cognitive.integrity.digest||null}};}
  FTN.IbisRuntime={ask:ask,remember:remember,recall:recall,permit:permit,permission:permission,connect:connect,connectionPlan:connectionPlan,invokeApp:invokeApp,tools:tools,invokeTool:invokeTool,status:status,configureDeadline:configureDeadline};
})(typeof window!=='undefined'?window:globalThis);
