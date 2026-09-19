// FTN Platform — one active Headspace request at a time.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},sequence=0,current=null;
  function begin(text){sequence+=1;current={id:sequence,text:String(text||'').trim(),startedAt:new Date().toISOString()};if(FTN.HeadspaceFabric)FTN.HeadspaceFabric.focus(['answer']);return current;}
  // Investor-critical fix (2026-09-19): this file's own submit listener is registered directly on
  // the #inputOrbit form, which only fires at the DOM "target" phase. Several specialist capture-
  // phase listeners (js/ibis-headspace-opportunities.js and others) are registered on `document`
  // with capture:true -- an ancestor's capture-phase listener always runs strictly before any
  // listener on the target itself, by W3C event-order spec, deterministically, on every page load,
  // not as an occasional race. Any specialist that calls stopImmediatePropagation() (every one of
  // them does, once its own relevant() check matches) therefore always ran to completion with
  // begin() never having fired -- snapshot() returned null, and active(token) on a null token
  // returned false unconditionally, silently discarding that specialist's own result (success,
  // failure, or a bounded timeout alike) forever. A caller with no valid token has no way to know
  // whether it was actually superseded; failing safe (permitting the render) is correct here --
  // failing closed (silently discarding a completed, truthful answer) is what produced the
  // appears-frozen investor demo state this fix addresses.
  function active(token){return !token||(!!current&&token.id===current.id);}
  function snapshot(){return current?Object.assign({},current):null;}
  FTN.HeadspaceRequestState={begin:begin,active:active,snapshot:snapshot};
  document.getElementById('inputOrbit')?.addEventListener('submit',function(){var input=document.getElementById('headspaceQuery');begin(input&&input.value||'');},true);
})(typeof window!=='undefined'?window:globalThis);
