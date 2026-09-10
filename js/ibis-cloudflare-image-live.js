// ibis Cloudflare image runtime activation.
// Static registry evidence remains conservative. This layer upgrades only the two reviewed
// Cloudflare image providers at runtime after the deployed zero-cost health action proves the
// server-side route is configured. If health fails, nothing is promoted.
(function(global){
  'use strict';
  var ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-image-cloudflare';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var IDS=new Set(['cloudflare-workers-ai-image-flux','cloudflare-workers-ai-image-sdxl']);
  var ready=false;

  function promote(provider){
    if(!provider||!IDS.has(provider.id)||!ready)return provider;
    return Object.assign({},provider,{
      enabled:true,
      lifecycleState:'ELIGIBLE',
      apiStatus:'LIVE_HEALTH_VERIFIED',
      runtimeHealthVerified:true
    });
  }

  function install(){
    var FTN=global.FTN=global.FTN||{};
    var registry=FTN.IbisProviders;
    if(!registry||registry.__cloudflareImageLiveInstalled)return false;
    var original={
      all:registry.all.bind(registry),
      byCategory:registry.byCategory.bind(registry),
      byCapability:registry.byCapability.bind(registry),
      get:registry.get.bind(registry)
    };
    registry.all=function(){return original.all().map(promote);};
    registry.byCategory=function(category){return original.byCategory(category).map(promote);};
    registry.byCapability=function(capability){return original.byCapability(capability).map(promote);};
    registry.get=function(id){return promote(original.get(id));};
    registry.__cloudflareImageLiveInstalled=true;
    return true;
  }

  function probe(){
    return fetch(ENDPOINT,{
      method:'POST',
      headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},
      body:JSON.stringify({action:'health'})
    }).then(function(response){return response.ok?response.json():null;})
      .then(function(body){
        ready=Boolean(body&&body.ready===true&&body.configured===true&&body.generationAttempted===false);
        install();
        global.dispatchEvent(new CustomEvent('IbisCloudflareImageHealth',{detail:{ready:ready,checkedAt:new Date().toISOString()}}));
        return ready;
      }).catch(function(){
        ready=false;
        install();
        global.dispatchEvent(new CustomEvent('IbisCloudflareImageHealth',{detail:{ready:false,checkedAt:new Date().toISOString()}}));
        return false;
      });
  }

  global.FTN=global.FTN||{};
  global.FTN.IbisCloudflareImageLive={probe:probe,isReady:function(){return ready;},endpoint:ENDPOINT};
  var attempts=0;
  (function waitForRegistry(){
    if(install()){probe();return;}
    if(attempts++<80)setTimeout(waitForRegistry,50);
  })();
})(window);
