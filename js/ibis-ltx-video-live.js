// ibis LTX video runtime health.
// This module never generates video. It checks the FTN server-side health endpoint and exposes
// quote/generation readiness to Creative Studio. Production probing is confined to FTN origins;
// local tests must explicitly opt in and mock the endpoint.
(function(global){
  'use strict';
  var ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-video-ltx';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var PROD_ORIGINS=new Set(['https://ftnplatform.org','https://www.ftnplatform.org']);
  var state={checked:false,configured:false,paidGenerationEnabled:false,readyToQuote:false,readyToGenerate:false,minimumQuotedCostUsd:null};
  function mayProbe(){return PROD_ORIGINS.has(global.location&&global.location.origin)||global.__FTN_ALLOW_EXTERNAL_HEALTH_TEST__===true;}
  function publish(next){state=Object.assign({},state,next,{checked:true});global.dispatchEvent(new CustomEvent('IbisLtxVideoHealth',{detail:Object.assign({},state)}));return state;}
  function probe(){
    if(!mayProbe())return Promise.resolve(publish({configured:false,paidGenerationEnabled:false,readyToQuote:false,readyToGenerate:false}));
    return fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({action:'health'})})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(body){return publish({configured:Boolean(body&&body.configured===true),paidGenerationEnabled:Boolean(body&&body.paidGenerationEnabled===true),readyToQuote:Boolean(body&&body.readyToQuote===true),readyToGenerate:Boolean(body&&body.readyToGenerate===true),minimumQuotedCostUsd:body&&typeof body.minimumQuotedCostUsd==='number'?body.minimumQuotedCostUsd:null,model:body&&body.model||null});})
      .catch(function(){return publish({configured:false,paidGenerationEnabled:false,readyToQuote:false,readyToGenerate:false});});
  }
  function request(payload){return fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(body){return{ok:r.ok,status:r.status,body:body};});});}
  global.FTN=global.FTN||{};
  global.FTN.IbisLtxVideoLive={probe:probe,state:function(){return Object.assign({},state);},request:request,endpoint:ENDPOINT,mayProbe:mayProbe};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',probe,{once:true});else probe();
})(window);
