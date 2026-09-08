// FTN Platform — universal connected-app fabric for ibis.
// One connection primitive above direct adapters, MCP, Activepieces, Nango/OAuth and generic REST.
// Discovery never implies execution: a gateway must be registered and report ready before ibis can use it.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},gateways=new Map();
  var ORDER=['DIRECT','MCP','ACTIVEPIECES','NANGO','REST'];
  function clean(v){return String(v||'').trim();}
  function registerGateway(id,gateway){id=clean(id).toUpperCase();if(ORDER.indexOf(id)<0)throw new Error('Unknown connection gateway: '+id);if(!gateway||typeof gateway.invoke!=='function')throw new Error(id+' gateway requires invoke().');gateways.set(id,gateway);return true;}
  function gateway(id){return gateways.get(clean(id).toUpperCase())||null;}
  async function gatewayHealth(id){var g=gateway(id);if(!g)return{id:id,registered:false,ready:false};if(typeof g.health!=='function')return{id:id,registered:true,ready:true};try{var h=await g.health();return Object.assign({id:id,registered:true},h||{}, {ready:!!(h&&h.ready)});}catch(err){return{id:id,registered:true,ready:false,error:err&&err.message||String(err)};}}
  async function directReady(provider){if(!FTN.AppRegistry)return false;var a=FTN.AppRegistry.adapter&&FTN.AppRegistry.adapter(provider);if(!a)return false;if(typeof FTN.AppRegistry.health==='function'){try{return !!(await FTN.AppRegistry.health(provider)).ready;}catch(e){return false;}}return true;}
  async function resolve(provider,operation,context){provider=clean(provider);operation=clean(operation);context=context||{};if(!provider||!operation)return{success:false,errorType:'MISSING_PROVIDER_OR_OPERATION'};
    if(await directReady(provider))return{success:true,path:'DIRECT',provider:provider,operation:operation};
    for(var i=1;i<ORDER.length;i++){var id=ORDER[i],g=gateway(id);if(!g)continue;var can=true;if(typeof g.canHandle==='function'){try{can=await g.canHandle(provider,operation,context);}catch(e){can=false;}}if(!can)continue;var h=await gatewayHealth(id);if(h.ready)return{success:true,path:id,provider:provider,operation:operation,health:h};}
    return{success:false,blocked:true,code:'NO_READY_CONNECTION_PATH',provider:provider,operation:operation,recommendedPaths:ORDER.slice()};
  }
  async function invoke(provider,operation,payload,context){context=context||{};var route=await resolve(provider,operation,context);if(!route.success)return route;var started=Date.now();try{
      if(route.path==='DIRECT')return FTN.AppRegistry.invoke(provider,operation,payload||{},context);
      var g=gateway(route.path),data=await g.invoke(provider,operation,payload||{},context);return{success:true,provider:provider,operation:operation,path:route.path,latencyMs:Date.now()-started,data:data};
    }catch(err){return{success:false,provider:provider,operation:operation,path:route.path,errorType:'CONNECTION_EXECUTION_FAILED',errorDetail:err&&err.message||String(err),latencyMs:Date.now()-started};}
  }
  async function health(){var rows=[];for(var i=0;i<ORDER.length;i++){var id=ORDER[i];if(id==='DIRECT'){rows.push({id:'DIRECT',registered:!!FTN.AppRegistry,ready:!!FTN.AppRegistry});continue;}rows.push(await gatewayHealth(id));}return{ready:rows.some(function(x){return x.ready;}),gateways:rows,priority:ORDER.slice()};}
  function connectionPlan(provider){return{provider:clean(provider),preferredOrder:ORDER.slice(),principle:'Prefer product-native direct adapters when justified; otherwise use MCP or the broad open integration bus before bespoke OAuth glue.',security:'OAuth tokens and secrets stay in provider/gateway vaults. ibis stores only connection metadata/scopes and applies its own Permission Ledger to consequential actions.'};}
  FTN.ConnectionFabric={ORDER:ORDER.slice(),registerGateway:registerGateway,gateway:gateway,resolve:resolve,invoke:invoke,health:health,connectionPlan:connectionPlan};
})(typeof window!=='undefined'?window:globalThis);
