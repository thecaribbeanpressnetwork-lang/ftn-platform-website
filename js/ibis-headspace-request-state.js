// FTN Platform — one active Headspace request at a time.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},sequence=0,current=null;
  function begin(text){sequence+=1;current={id:sequence,text:String(text||'').trim(),startedAt:new Date().toISOString()};if(FTN.HeadspaceFabric)FTN.HeadspaceFabric.focus(['answer']);return current;}
  function active(token){return !!token&&!!current&&token.id===current.id;}
  function snapshot(){return current?Object.assign({},current):null;}
  FTN.HeadspaceRequestState={begin:begin,active:active,snapshot:snapshot};
  document.getElementById('inputOrbit')?.addEventListener('submit',function(){var input=document.getElementById('headspaceQuery');begin(input&&input.value||'');},true);
})(typeof window!=='undefined'?window:globalThis);
