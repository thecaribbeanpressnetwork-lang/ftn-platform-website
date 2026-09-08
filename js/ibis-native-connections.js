// FTN Platform — real, bounded first-party connection gateways used by Headspace.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  if(!FTN.ConnectionFabric)return;
  var ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-opportunities';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  FTN.ConnectionFabric.registerGateway('REST',{
    health:async function(){return{ready:typeof global.fetch==='function',services:['ftn-opportunities'],mode:'READ_ONLY_FIRST_PARTY'};},
    canHandle:async function(provider,operation){return provider==='ftn-opportunities'&&operation==='SEARCH';},
    invoke:async function(provider,operation,payload){if(provider!=='ftn-opportunities'||operation!=='SEARCH')throw new Error('Unsupported first-party REST operation.');var controller=typeof AbortController!=='undefined'?new AbortController():null,timer=controller?setTimeout(function(){controller.abort();},15000):null;try{var url=ENDPOINT+(payload&&payload.refresh?'?t='+Date.now():'');var response=await global.fetch(url,{headers:{Accept:'application/json',apikey:KEY},signal:controller&&controller.signal});var body=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(body.error||'Official opportunity source request failed.');return body;}finally{if(timer)clearTimeout(timer);}}
  });
})(typeof window!=='undefined'?window:globalThis);
