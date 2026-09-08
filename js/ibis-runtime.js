// FTN Platform — ibis Runtime v1.
// One callable surface that joins personal context, routing, permissions, connections and multi-agent execution.
// It does not replace IbisClient: agent execution still goes through the canonical client fabric.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  async function contextSnapshot(){return FTN.PersonalContext&&typeof FTN.PersonalContext.snapshot==='function'?await FTN.PersonalContext.snapshot(['personal','project','preference','intent']):[];}
  async function ask(input,context){context=context||{};if(!FTN.UniversalRouter||!FTN.MultiAgentOrchestrator)return{success:false,errorType:'RUNTIME_NOT_READY'};var personal=await contextSnapshot();var envelope=Object.assign({},context,{personalContext:personal});var route=FTN.UniversalRouter.route(input,envelope);if(!route.success)return route;var result=await FTN.MultiAgentOrchestrator.execute(input,Object.assign({},envelope,{route:route}));return Object.assign({},result,{route:route,personalContextCount:personal.length});}
  async function remember(key,value,opts){if(!FTN.PersonalContext)return{success:false,errorType:'CONTEXT_STORE_UNAVAILABLE'};var row=await FTN.PersonalContext.upsert((opts&&opts.namespace)||'personal',key,value,opts||{});return{success:true,memory:row};}
  async function recall(namespace){if(!FTN.PersonalContext)return[];return FTN.PersonalContext.list(namespace||null);}
  async function permit(subject,action,decision,opts){if(!FTN.PermissionLedger)return{success:false,errorType:'PERMISSION_LEDGER_UNAVAILABLE'};return{success:true,permission:await FTN.PermissionLedger.set(subject,action,decision,opts||{})};}
  async function permission(subject,action,context){if(!FTN.PermissionLedger)return{decision:'ASK',reason:'PERMISSION_LEDGER_UNAVAILABLE'};return FTN.PermissionLedger.check(subject,action,context||{});}
  async function connect(provider,state,opts){if(!FTN.AppRegistry)return{success:false,errorType:'APP_REGISTRY_UNAVAILABLE'};return{success:true,connection:await FTN.AppRegistry.setConnection(provider,state,opts||{})};}
  async function connectionPlan(provider){if(!FTN.ConnectionFabric)return{success:false,errorType:'CONNECTION_FABRIC_UNAVAILABLE'};return{success:true,plan:FTN.ConnectionFabric.connectionPlan(provider)};}
  async function invokeApp(provider,operation,payload,context){if(!FTN.ConnectionFabric)return{success:false,errorType:'CONNECTION_FABRIC_UNAVAILABLE'};return FTN.ConnectionFabric.invoke(provider,operation,payload||{},context||{});}
  async function status(){var memories=await recall(null),permissions=FTN.PermissionLedger?await FTN.PermissionLedger.list():[],connections=FTN.AppRegistry?await FTN.AppRegistry.list():[],connectionFabric=FTN.ConnectionFabric&&typeof FTN.ConnectionFabric.health==='function'?await FTN.ConnectionFabric.health():{ready:false,gateways:[]};return{ready:!!(FTN.UniversalRouter&&FTN.MultiAgentOrchestrator&&FTN.PersonalContext&&FTN.PermissionLedger&&FTN.AppRegistry&&FTN.ConnectionFabric),memoryCount:memories.length,permissionCount:permissions.length,connections:connections.map(function(x){return{provider:x.provider,state:x.connection_state,scopes:x.scopes||[]};}),connectionFabric:connectionFabric};}
  FTN.IbisRuntime={ask:ask,remember:remember,recall:recall,permit:permit,permission:permission,connect:connect,connectionPlan:connectionPlan,invokeApp:invokeApp,status:status};
})(typeof window!=='undefined'?window:globalThis);
