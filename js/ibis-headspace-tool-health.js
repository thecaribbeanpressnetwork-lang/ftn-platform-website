// FTN Platform — Headspace tool/connection health surface.
// Reports executable reality from the governed catalog and connection fabric. It never promotes
// candidate/source-ready tools to live and never exposes credentials or private connection data.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},loads={};
  function statusNode(){return typeof document!=='undefined'?document.getElementById('toolStatus'):null;}
  function load(src,test){
    if(test())return Promise.resolve();
    if(loads[src])return loads[src];
    loads[src]=new Promise(function(resolve,reject){
      var s=document.createElement('script');s.src=src;s.defer=true;
      s.onload=function(){test()?resolve():reject(new Error('Loaded '+src+' but the required capability did not register.'));};
      s.onerror=function(){reject(new Error('Could not load '+src));};
      document.head.appendChild(s);
    });
    return loads[src];
  }
  async function ensureToolHealthCore(){
    // Tool health must not depend on the entire IBIS runtime booting successfully. An unrelated
    // optional module must never make the tool catalog look dead. Load only the primitives this
    // surface actually needs, then verify them directly.
    await load('/js/ibis-tool-catalog.js',function(){return !!FTN.IbisToolCatalog;});
    await load('/js/ibis-connection-fabric.js',function(){return !!FTN.ConnectionFabric;});
    await load('/js/ibis-native-connections.js',function(){return !!(FTN.ConnectionFabric&&FTN.ConnectionFabric.gateway&&FTN.ConnectionFabric.gateway('REST'));});
  }
  async function refresh(){
    var node=statusNode();
    if(!node)return null;
    node.textContent='Verifying available tools…';
    try{
      await ensureToolHealthCore();
      if(!FTN.IbisToolCatalog||!FTN.ConnectionFabric)throw new Error('ibis tool-health core is unavailable.');
      var registry=await FTN.IbisToolCatalog.load('/data/ibis-capability-registry.json');
      var catalog=FTN.IbisToolCatalog.status();
      var fabric=await FTN.ConnectionFabric.health();
      var gateways=fabric.gateways||[];
      var ready=gateways.filter(function(row){return row.ready;});
      var readyNames=ready.map(function(row){return row.id;});
      node.textContent=ready.length
        ? 'Tool layer ready · '+readyNames.join(', ')+' connection'+(ready.length===1?'':'s')+' verified. Additional governed integrations activate only when the task needs them and permission allows.'
        : 'Core tool catalog loaded. No external connector is currently verified, so ibis will fail closed rather than pretend an integration is available.';
      node.dataset.health='ready';
      node.dataset.toolCount=String(catalog.total);
      node.dataset.enabledCount=String(catalog.enabled);
      node.dataset.adapterCount=String(catalog.adapterCount);
      node.dataset.readyGatewayCount=String(ready.length);
      return{registry:registry,catalog:catalog,fabric:fabric};
    }catch(error){
      node.textContent='Tool status is unavailable right now. ibis will not claim disconnected tools are usable.';
      node.dataset.health='failed';
      node.dataset.error=String(error&&error.message||error||'unknown');
      return null;
    }
  }
  FTN.HeadspaceToolHealth={refresh:refresh,ensureToolHealthCore:ensureToolHealthCore};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
    else refresh();
  }
})(typeof window!=='undefined'?window:globalThis);
