// FTN Platform — Headspace tool/connection health surface.
// Reports executable reality from the governed catalog and connection fabric. It never promotes
// candidate/source-ready tools to live and never exposes credentials or private connection data.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  function statusNode(){return typeof document!=='undefined'?document.getElementById('toolStatus'):null;}
  function gatewayText(row){
    if(!row)return'';
    if(row.ready)return row.id+' ready';
    if(row.registered)return row.id+' unavailable';
    return row.id+' not connected';
  }
  async function refresh(){
    var node=statusNode();
    if(!node)return null;
    node.textContent='Checking governed tool and connection health…';
    try{
      if(FTN.IbisRuntimeReady)await FTN.IbisRuntimeReady;
      if(!FTN.IbisToolCatalog||!FTN.ConnectionFabric)throw new Error('ibis runtime catalog is unavailable.');
      var registry=await FTN.IbisToolCatalog.load('/data/ibis-capability-registry.json');
      var catalog=FTN.IbisToolCatalog.status();
      var fabric=await FTN.ConnectionFabric.health();
      var ready=(fabric.gateways||[]).filter(function(row){return row.ready;});
      node.textContent='Governed registry: '+catalog.total+' tools · '+catalog.enabled+' enabled · '+catalog.adapterCount+' registered tool adapters. Connection fabric: '+(fabric.gateways||[]).map(gatewayText).join(' · ')+'.';
      node.dataset.health='ready';
      node.dataset.toolCount=String(catalog.total);
      node.dataset.enabledCount=String(catalog.enabled);
      node.dataset.readyGatewayCount=String(ready.length);
      return{registry:registry,catalog:catalog,fabric:fabric};
    }catch(error){
      node.textContent='Tool health could not be verified: '+(error&&error.message||String(error))+'. ibis will not claim disconnected tools are usable.';
      node.dataset.health='failed';
      return null;
    }
  }
  FTN.HeadspaceToolHealth={refresh:refresh};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
    else refresh();
  }
})(typeof window!=='undefined'?window:globalThis);
