// FTN Platform — autonomous BUILD -> TEST -> PUBLISH PREVIEW -> SHARE LINK capability.
// One user intent, explicit stage state. ibis never claims a preview exists until a publisher
// returns a concrete reachable URL, and never sends that URL without PermissionLedger ALLOW.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},adapters=new Map(),override={};
  var STAGES=['BUILD','TEST','PUBLISH_PREVIEW','SHARE_LINK'];
  function clone(x){return x==null?x:JSON.parse(JSON.stringify(x));}
  function registerAdapter(stage,adapter){stage=String(stage||'').toUpperCase();if(STAGES.indexOf(stage)<0)throw new Error('Unknown build-delivery stage: '+stage);if(!adapter||typeof adapter.run!=='function')throw new Error(stage+' adapter requires run().');adapters.set(stage,adapter);return true;}
  function adapter(stage){return adapters.get(String(stage||'').toUpperCase())||null;}
  function permissions(){return override.permissionLedger||FTN.PermissionLedger||null;}
  function uuid(){return global.crypto&&global.crypto.randomUUID?global.crypto.randomUUID():'delivery-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
  function initial(spec){spec=spec||{};return{id:spec.id||uuid(),goal:String(spec.goal||'').trim(),kind:String(spec.kind||'WEB').toUpperCase(),status:'PLANNED',createdAt:new Date().toISOString(),stages:STAGES.map(function(name){return{name:name,status:'PLANNED',startedAt:null,completedAt:null,input:null,output:null,error:null};}),artifact:null,previewUrl:null,share:null,provenance:[]};}
  function stage(run,name){return run.stages.find(function(s){return s.name===name;});}
  function record(run,name,status,data){var s=stage(run,name);s.status=status;if(status==='RUNNING')s.startedAt=new Date().toISOString();if(['COMPLETED','FAILED','WAITING_PERMISSION','BLOCKED'].indexOf(status)>=0)s.completedAt=new Date().toISOString();if(data&&data.input!==undefined)s.input=clone(data.input);if(data&&data.output!==undefined)s.output=clone(data.output);if(data&&data.error!==undefined)s.error=clone(data.error);return s;}
  async function requirePermission(action,context){var l=permissions();if(!l||typeof l.check!=='function')return{decision:'ASK',reason:'PERMISSION_LEDGER_UNAVAILABLE'};return l.check('capability:BUILD_TEST_PUBLISH_SHARE',action,context||{});}
  async function runStage(run,name,input,context){var a=adapter(name);if(!a){record(run,name,'BLOCKED',{input:input,error:{code:'ADAPTER_UNAVAILABLE',stage:name}});return{success:false,blocked:true,code:'ADAPTER_UNAVAILABLE',stage:name};}record(run,name,'RUNNING',{input:input});var started=Date.now();try{var out=await a.run(clone(input),context||{});if(!out||out.success===false){var err=out&&out.error||{code:'STAGE_FAILED'};record(run,name,'FAILED',{output:out,error:err});return{success:false,stage:name,error:err};}record(run,name,'COMPLETED',{output:out});run.provenance.push({stage:name,adapter:a.id||name,latencyMs:Date.now()-started,completedAt:new Date().toISOString()});return{success:true,stage:name,data:out};}catch(err){var e={code:'STAGE_THROW',message:err&&err.message||String(err)};record(run,name,'FAILED',{error:e});return{success:false,stage:name,error:e};}}
  async function execute(spec,context){context=context||{};var run=initial(spec);if(!run.goal)return{success:false,errorType:'MISSING_GOAL',run:run};run.status='RUNNING';
    var build=await runStage(run,'BUILD',{goal:run.goal,kind:run.kind,requirements:spec&&spec.requirements||{},source:spec&&spec.source||null},context);if(!build.success){run.status='FAILED';return{success:false,status:run.status,run:run};}
    run.artifact=clone(build.data.artifact||build.data);
    var test=await runStage(run,'TEST',{goal:run.goal,kind:run.kind,artifact:run.artifact,testPlan:spec&&spec.testPlan||null},context);if(!test.success){run.status='FAILED';return{success:false,status:run.status,run:run};}
    if(test.data&&test.data.passed===false){record(run,'PUBLISH_PREVIEW','BLOCKED',{error:{code:'TESTS_NOT_PASSED'}});run.status='FAILED';return{success:false,status:run.status,run:run};}
    var publishPermission=await requirePermission('preview_publish',context.permissionContext||{});if(publishPermission.decision!=='ALLOW'){record(run,'PUBLISH_PREVIEW','WAITING_PERMISSION',{error:{code:'PERMISSION_REQUIRED',permission:publishPermission}});run.status='WAITING_PERMISSION';return{success:false,status:run.status,run:run};}
    var pub=await runStage(run,'PUBLISH_PREVIEW',{goal:run.goal,kind:run.kind,artifact:run.artifact,testResult:test.data},context);if(!pub.success){run.status='FAILED';return{success:false,status:run.status,run:run};}
    var url=pub.data&&pub.data.previewUrl;if(!url||!/^https?:\/\//i.test(String(url))){record(run,'PUBLISH_PREVIEW','FAILED',{output:pub.data,error:{code:'NO_VERIFIABLE_PREVIEW_URL'}});run.status='FAILED';return{success:false,status:run.status,run:run};}
    run.previewUrl=String(url);
    if(pub.data.reachable===false){record(run,'PUBLISH_PREVIEW','FAILED',{output:pub.data,error:{code:'PREVIEW_NOT_REACHABLE'}});run.status='FAILED';return{success:false,status:run.status,run:run};}
    var sharePermission=await requirePermission('share_link',context.permissionContext||{});if(sharePermission.decision!=='ALLOW'){record(run,'SHARE_LINK','WAITING_PERMISSION',{input:{previewUrl:run.previewUrl},error:{code:'PERMISSION_REQUIRED',permission:sharePermission}});run.status='WAITING_PERMISSION';return{success:false,status:run.status,run:run,previewUrl:run.previewUrl};}
    var share=await runStage(run,'SHARE_LINK',{previewUrl:run.previewUrl,recipients:spec&&spec.recipients||[],message:spec&&spec.shareMessage||null},context);if(!share.success){run.status='FAILED';return{success:false,status:run.status,run:run,previewUrl:run.previewUrl};}
    run.share=clone(share.data);run.status='COMPLETED';run.completedAt=new Date().toISOString();return{success:true,status:run.status,run:run,previewUrl:run.previewUrl,share:run.share};
  }
  async function resume(run,spec,context){if(!run||!run.id)throw new Error('Existing run is required.');spec=spec||{};context=context||{};var fresh=clone(run);fresh.status='RUNNING';
    var p=stage(fresh,'PUBLISH_PREVIEW'),s=stage(fresh,'SHARE_LINK');
    if(p&&p.status==='WAITING_PERMISSION'){
      var pp=await requirePermission('preview_publish',context.permissionContext||{});if(pp.decision!=='ALLOW'){fresh.status='WAITING_PERMISSION';return{success:false,status:fresh.status,run:fresh};}
      var test=stage(fresh,'TEST'),pub=await runStage(fresh,'PUBLISH_PREVIEW',{goal:fresh.goal,kind:fresh.kind,artifact:fresh.artifact,testResult:test&&test.output||null},context);if(!pub.success){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh};}var url=pub.data&&pub.data.previewUrl;if(!url||!/^https?:\/\//i.test(String(url))||pub.data.reachable===false){record(fresh,'PUBLISH_PREVIEW','FAILED',{output:pub.data,error:{code:'NO_REACHABLE_PREVIEW'}});fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh};}fresh.previewUrl=String(url);
    }
    if(!fresh.previewUrl){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh,errorType:'MISSING_PREVIEW_URL'};}
    var sp=await requirePermission('share_link',context.permissionContext||{});if(sp.decision!=='ALLOW'){record(fresh,'SHARE_LINK','WAITING_PERMISSION',{input:{previewUrl:fresh.previewUrl},error:{code:'PERMISSION_REQUIRED',permission:sp}});fresh.status='WAITING_PERMISSION';return{success:false,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl};}
    var share=await runStage(fresh,'SHARE_LINK',{previewUrl:fresh.previewUrl,recipients:spec.recipients||[],message:spec.shareMessage||null},context);if(!share.success){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl};}fresh.share=clone(share.data);fresh.status='COMPLETED';fresh.completedAt=new Date().toISOString();return{success:true,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl,share:fresh.share};
  }
  function health(){return{capability:'BUILD_TEST_PUBLISH_SHARE',stages:STAGES.map(function(name){var a=adapter(name);return{name:name,adapterRegistered:!!a,adapterId:a&&a.id||null};}),ready:STAGES.every(function(name){return adapters.has(name);})};}
  function configure(options){override=options||{};}
  FTN.BuildPreviewShare={STAGES:STAGES.slice(),registerAdapter:registerAdapter,adapter:adapter,execute:execute,resume:resume,health:health,configure:configure};
})(typeof window!=='undefined'?window:globalThis);
