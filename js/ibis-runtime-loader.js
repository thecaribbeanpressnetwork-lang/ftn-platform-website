// FTN Platform — load ibis runtime primitives in dependency order.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},loads={};
  function load(src,test){if(test())return Promise.resolve();if(loads[src])return loads[src];loads[src]=new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.defer=true;s.onload=function(){test()?resolve():reject(new Error('Loaded '+src+' but expected runtime primitive did not register.'));};s.onerror=function(){reject(new Error('Could not load '+src));};document.head.appendChild(s);});return loads[src];}
  FTN.IbisRuntimeReady=(async function(){
    await load('/js/ftn-auth.js',function(){return !!FTN.Auth;});
    await load('/js/ibis-personal-context.js',function(){return !!FTN.PersonalContext;});
    await load('/js/ibis-permission-ledger.js',function(){return !!FTN.PermissionLedger;});
    await load('/js/ibis-app-registry.js',function(){return !!FTN.AppRegistry;});
    await load('/js/ibis-connection-fabric.js',function(){return !!FTN.ConnectionFabric;});
    await load('/js/ibis-universal-router.js',function(){return !!FTN.UniversalRouter;});
    await load('/js/ibis-build-preview-share.js',function(){return !!FTN.BuildPreviewShare;});
    await load('/js/ibis-multi-agent-orchestrator.js',function(){return !!FTN.MultiAgentOrchestrator;});
    await load('/js/ibis-device-sensor-bridge.js',function(){return !!FTN.DeviceSensorBridge;});
    await load('/js/ibis-runtime.js',function(){return !!FTN.IbisRuntime;});
    return FTN.IbisRuntime;
  })();
})(typeof window!=='undefined'?window:globalThis);