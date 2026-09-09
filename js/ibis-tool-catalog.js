// FTN Platform — governed ibis tool catalog.
// Discovery can add candidates to the registry, but only an ENABLED entry with a registered,
// healthy adapter can execute. Consequential operations still require the Permission Ledger.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},registry=null,adapters=new Map(),source='/data/ibis-capability-registry.json';
  var AUTO_PREFIXES=['READ_ONLY','LOCAL_UI'];
  function clean(value){return String(value||'').trim();}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function validate(data){
    if(!data||!Array.isArray(data.tools)||!data.policy)throw new Error('Invalid ibis capability registry.');
    var ids=new Set();
    data.tools.forEach(function(tool){
      if(!clean(tool.id)||ids.has(tool.id))throw new Error('Every ibis tool needs a unique id.');
      ids.add(tool.id);
    });
    return data;
  }
  async function load(url){
    if(registry)return clone(registry);
    if(typeof global.fetch!=='function')throw new Error('Tool catalog fetch is unavailable.');
    var response=await global.fetch(url||source,{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Tool catalog returned HTTP '+response.status+'.');
    registry=validate(await response.json());
    return clone(registry);
  }
  function setRegistry(data){registry=validate(clone(data));return clone(registry);}
  function list(filter){
    var rows=registry?registry.tools.slice():[];
    filter=filter||{};
    return rows.filter(function(tool){
      return (!filter.status||tool.status===filter.status)&&(!filter.category||tool.category===filter.category)&&(!filter.decision||tool.decision===filter.decision);
    }).map(clone);
  }
  function get(id){var tool=registry&&registry.tools.find(function(item){return item.id===clean(id);});return tool?clone(tool):null;}
  function registerAdapter(id,adapter){
    id=clean(id);
    if(!id||!adapter||typeof adapter.invoke!=='function')throw new Error('Tool id and adapter.invoke are required.');
    adapters.set(id,adapter);
    return true;
  }
  function isAutomatic(tool){return AUTO_PREFIXES.some(function(prefix){return clean(tool.permissionClass).indexOf(prefix)===0;});}
  async function health(id){
    var tool=get(id),adapter=adapters.get(clean(id));
    if(!tool)return{id:clean(id),ready:false,reason:'NOT_REGISTERED'};
    if(tool.status!=='ENABLED')return{id:tool.id,ready:false,reason:'NOT_ENABLED',status:tool.status};
    if(!adapter)return{id:tool.id,ready:false,reason:'ADAPTER_NOT_REGISTERED',status:tool.status};
    if(typeof adapter.health!=='function')return{id:tool.id,ready:true,status:tool.status};
    try{var result=await adapter.health();return{id:tool.id,ready:!!(result&&result.ready),status:tool.status,detail:result||null};}
    catch(error){return{id:tool.id,ready:false,status:tool.status,reason:'HEALTH_CHECK_FAILED',error:error&&error.message||String(error)};}
  }
  async function eligible(filter){
    filter=filter||{};
    var rows=list({status:'ENABLED'}),out=[];
    for(var i=0;i<rows.length;i++){
      var tool=rows[i],haystack=[tool.id,tool.name,tool.category,tool.role,tool.integration].join(' ').toLowerCase();
      if(filter.query&&haystack.indexOf(clean(filter.query).toLowerCase())<0)continue;
      if(filter.automaticOnly&&!isAutomatic(tool))continue;
      var state=await health(tool.id);
      if(state.ready)out.push(Object.assign({},tool,{health:state}));
    }
    return out;
  }
  async function invoke(id,operation,payload,context){
    var tool=get(id),state=await health(id),adapter=adapters.get(clean(id));
    if(!tool||!state.ready)return{success:false,blocked:true,errorType:'TOOL_NOT_READY',toolId:clean(id),health:state};
    context=context||{};
    if(!isAutomatic(tool)){
      var ledger=FTN.PermissionLedger;
      var permission=ledger&&typeof ledger.check==='function'?await ledger.check('tool:'+tool.id,clean(operation)||'invoke',context.permissionContext||{}):{decision:'ASK',reason:'PERMISSION_LEDGER_UNAVAILABLE'};
      if(permission.decision!=='ALLOW')return{success:false,blocked:true,errorType:'TOOL_PERMISSION_REQUIRED',toolId:tool.id,permission:permission};
    }
    var started=Date.now();
    try{
      var result=await adapter.invoke(clean(operation),payload||{},context);
      return{success:true,toolId:tool.id,operation:clean(operation),latencyMs:Date.now()-started,data:result};
    }catch(error){
      return{success:false,toolId:tool.id,operation:clean(operation),latencyMs:Date.now()-started,errorType:'TOOL_EXECUTION_FAILED',errorDetail:error&&error.message||String(error)};
    }
  }
  function status(){return{loaded:!!registry,total:registry?registry.tools.length:0,enabled:registry?registry.tools.filter(function(tool){return tool.status==='ENABLED';}).length:0,adapterCount:adapters.size,policy:registry?clone(registry.policy):null};}
  function clear(){registry=null;adapters.clear();}
  FTN.IbisToolCatalog={load:load,setRegistry:setRegistry,list:list,get:get,registerAdapter:registerAdapter,health:health,eligible:eligible,invoke:invoke,status:status,clear:clear};
})(typeof window!=='undefined'?window:globalThis);
