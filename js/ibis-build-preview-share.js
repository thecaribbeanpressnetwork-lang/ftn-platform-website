// FTN Platform — autonomous BUILD -> TEST -> REPAIR -> PUBLISH PREVIEW -> VERIFY -> SHARE capability.
// One user intent, explicit stage state. ibis never claims a preview exists until a publisher
// returns a concrete URL, never treats that URL as working until VERIFY passes, and never sends
// it without PermissionLedger ALLOW. Repair is bounded and deterministic: no infinite retry loop.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},adapters=new Map(),override={};
  var STAGES=['BUILD','TEST','REPAIR','PUBLISH_PREVIEW','VERIFY','SHARE_LINK'];
  function clone(x){return x==null?x:JSON.parse(JSON.stringify(x));}
  function registerAdapter(stage,adapter){stage=String(stage||'').toUpperCase();if(STAGES.indexOf(stage)<0)throw new Error('Unknown build-delivery stage: '+stage);if(!adapter||typeof adapter.run!=='function')throw new Error(stage+' adapter requires run().');adapters.set(stage,adapter);return true;}
  function adapter(stage){return adapters.get(String(stage||'').toUpperCase())||null;}
  function permissions(){return override.permissionLedger||FTN.PermissionLedger||null;}
  function uuid(){return global.crypto&&global.crypto.randomUUID?global.crypto.randomUUID():'delivery-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
  function initial(spec){spec=spec||{};return{id:spec.id||uuid(),goal:String(spec.goal||'').trim(),kind:String(spec.kind||'WEB').toUpperCase(),status:'PLANNED',createdAt:new Date().toISOString(),repairAttempts:0,maxRepairAttempts:Number.isInteger(spec.maxRepairAttempts)?Math.max(0,Math.min(spec.maxRepairAttempts,5)):2,stages:STAGES.map(function(name){return{name:name,status:'PLANNED',startedAt:null,completedAt:null,input:null,output:null,error:null,attempts:[]};}),artifact:null,previewUrl:null,verification:null,share:null,provenance:[]};}
  function stage(run,name){return run.stages.find(function(s){return s.name===name;});}
  function record(run,name,status,data){var s=stage(run,name);s.status=status;if(status==='RUNNING')s.startedAt=new Date().toISOString();if(['COMPLETED','FAILED','WAITING_PERMISSION','BLOCKED','SKIPPED'].indexOf(status)>=0)s.completedAt=new Date().toISOString();if(data&&data.input!==undefined)s.input=clone(data.input);if(data&&data.output!==undefined)s.output=clone(data.output);if(data&&data.error!==undefined)s.error=clone(data.error);if(['COMPLETED','FAILED'].indexOf(status)>=0)s.attempts.push({status:status,startedAt:s.startedAt,completedAt:s.completedAt,input:clone(s.input),output:clone(s.output),error:clone(s.error)});return s;}
  async function requirePermission(action,context){var l=permissions();if(!l||typeof l.check!=='function')return{decision:'ASK',reason:'PERMISSION_LEDGER_UNAVAILABLE'};return l.check('capability:BUILD_TEST_REPAIR_PUBLISH_VERIFY_SHARE',action,context||{});}
  async function runStage(run,name,input,context){var a=adapter(name);if(!a){record(run,name,'BLOCKED',{input:input,error:{code:'ADAPTER_UNAVAILABLE',stage:name}});return{success:false,blocked:true,code:'ADAPTER_UNAVAILABLE',stage:name};}record(run,name,'RUNNING',{input:input});var started=Date.now();try{var out=await a.run(clone(input),context||{});if(!out||out.success===false){var err=out&&out.error||{code:'STAGE_FAILED'};record(run,name,'FAILED',{output:out,error:err});return{success:false,stage:name,error:err,data:out};}record(run,name,'COMPLETED',{output:out,error:null});run.provenance.push({stage:name,adapter:a.id||name,latencyMs:Date.now()-started,completedAt:new Date().toISOString()});return{success:true,stage:name,data:out};}catch(err){var e={code:'STAGE_THROW',message:err&&err.message||String(err)};record(run,name,'FAILED',{error:e});return{success:false,stage:name,error:e};}}
  function testsPassed(result){return !!(result&&result.success&&(!result.data||result.data.passed!==false));}
  async function testAndRepair(run,spec,context){
    var test=await runStage(run,'TEST',{goal:run.goal,kind:run.kind,artifact:run.artifact,testPlan:spec&&spec.testPlan||null,repairAttempt:run.repairAttempts},context);
    while(!testsPassed(test)&&run.repairAttempts<run.maxRepairAttempts){
      var failure=test&&test.data||{success:false,error:test&&test.error||{code:'TEST_FAILED'}};
      var repair=await runStage(run,'REPAIR',{goal:run.goal,kind:run.kind,artifact:run.artifact,testResult:failure,attempt:run.repairAttempts+1},context);
      if(!repair.success)return{success:false,test:test,repair:repair};
      run.repairAttempts+=1;
      if(repair.data&&repair.data.artifact)run.artifact=clone(repair.data.artifact);
      test=await runStage(run,'TEST',{goal:run.goal,kind:run.kind,artifact:run.artifact,testPlan:spec&&spec.testPlan||null,repairAttempt:run.repairAttempts},context);
    }
    if(!testsPassed(test)){record(run,'PUBLISH_PREVIEW','BLOCKED',{error:{code:'TESTS_NOT_PASSED',repairAttempts:run.repairAttempts}});return{success:false,test:test};}
    if(run.repairAttempts===0)record(run,'REPAIR','SKIPPED',{input:{reason:'TESTS_PASSED_FIRST_ATTEMPT'},output:{success:true,needed:false}});
    return{success:true,test:test};
  }
  function validatePreview(run,pub){var url=pub&&pub.data&&pub.data.previewUrl;if(!url||!/^https?:\/\//i.test(String(url))){record(run,'PUBLISH_PREVIEW','FAILED',{output:pub&&pub.data,error:{code:'NO_VERIFIABLE_PREVIEW_URL'}});return null;}if(pub.data.reachable===false){record(run,'PUBLISH_PREVIEW','FAILED',{output:pub.data,error:{code:'PREVIEW_NOT_REACHABLE'}});return null;}return String(url);}
  async function verifyPreview(run,context){var verify=await runStage(run,'VERIFY',{previewUrl:run.previewUrl,goal:run.goal,kind:run.kind,artifact:run.artifact},context);if(!verify.success)return verify;if(verify.data&&verify.data.verified===false){record(run,'VERIFY','FAILED',{output:verify.data,error:{code:'PREVIEW_VERIFICATION_FAILED'}});return{success:false,stage:'VERIFY',error:{code:'PREVIEW_VERIFICATION_FAILED'},data:verify.data};}run.verification=clone(verify.data);return verify;}
  async function execute(spec,context){context=context||{};spec=spec||{};var run=initial(spec);if(!run.goal)return{success:false,errorType:'MISSING_GOAL',run:run};run.status='RUNNING';
    var build=await runStage(run,'BUILD',{goal:run.goal,kind:run.kind,requirements:spec.requirements||{},source:spec.source||null},context);if(!build.success){run.status='FAILED';return{success:false,status:run.status,run:run};}
    run.artifact=clone(build.data.artifact||build.data);
    var quality=await testAndRepair(run,spec,context);if(!quality.success){run.status='FAILED';return{success:false,status:run.status,run:run};}
    var publishPermission=await requirePermission('preview_publish',context.permissionContext||{});if(publishPermission.decision!=='ALLOW'){record(run,'PUBLISH_PREVIEW','WAITING_PERMISSION',{error:{code:'PERMISSION_REQUIRED',permission:publishPermission}});run.status='WAITING_PERMISSION';return{success:false,status:run.status,run:run};}
    var pub=await runStage(run,'PUBLISH_PREVIEW',{goal:run.goal,kind:run.kind,artifact:run.artifact,testResult:stage(run,'TEST').output},context);if(!pub.success){run.status='FAILED';return{success:false,status:run.status,run:run};}
    run.previewUrl=validatePreview(run,pub);if(!run.previewUrl){run.status='FAILED';return{success:false,status:run.status,run:run};}
    var verify=await verifyPreview(run,context);if(!verify.success){run.status='FAILED';return{success:false,status:run.status,run:run,previewUrl:run.previewUrl};}
    var sharePermission=await requirePermission('share_link',context.permissionContext||{});if(sharePermission.decision!=='ALLOW'){record(run,'SHARE_LINK','WAITING_PERMISSION',{input:{previewUrl:run.previewUrl,verification:run.verification},error:{code:'PERMISSION_REQUIRED',permission:sharePermission}});run.status='WAITING_PERMISSION';return{success:false,status:run.status,run:run,previewUrl:run.previewUrl,verification:run.verification};}
    var share=await runStage(run,'SHARE_LINK',{previewUrl:run.previewUrl,verification:run.verification,recipients:spec.recipients||[],message:spec.shareMessage||null},context);if(!share.success){run.status='FAILED';return{success:false,status:run.status,run:run,previewUrl:run.previewUrl};}
    run.share=clone(share.data);run.status='COMPLETED';run.completedAt=new Date().toISOString();return{success:true,status:run.status,run:run,previewUrl:run.previewUrl,verification:run.verification,share:run.share};
  }
  async function resume(run,spec,context){if(!run||!run.id)throw new Error('Existing run is required.');spec=spec||{};context=context||{};var fresh=clone(run);fresh.status='RUNNING';var p=stage(fresh,'PUBLISH_PREVIEW');
    if(p&&p.status==='WAITING_PERMISSION'){
      var pp=await requirePermission('preview_publish',context.permissionContext||{});if(pp.decision!=='ALLOW'){fresh.status='WAITING_PERMISSION';return{success:false,status:fresh.status,run:fresh};}
      var pub=await runStage(fresh,'PUBLISH_PREVIEW',{goal:fresh.goal,kind:fresh.kind,artifact:fresh.artifact,testResult:stage(fresh,'TEST')&&stage(fresh,'TEST').output||null},context);if(!pub.success){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh};}fresh.previewUrl=validatePreview(fresh,pub);if(!fresh.previewUrl){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh};}
      var verify=await verifyPreview(fresh,context);if(!verify.success){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl};}
    }
    if(!fresh.previewUrl){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh,errorType:'MISSING_PREVIEW_URL'};}
    if(!fresh.verification){var v=await verifyPreview(fresh,context);if(!v.success){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl};}}
    var sp=await requirePermission('share_link',context.permissionContext||{});if(sp.decision!=='ALLOW'){record(fresh,'SHARE_LINK','WAITING_PERMISSION',{input:{previewUrl:fresh.previewUrl,verification:fresh.verification},error:{code:'PERMISSION_REQUIRED',permission:sp}});fresh.status='WAITING_PERMISSION';return{success:false,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl,verification:fresh.verification};}
    var share=await runStage(fresh,'SHARE_LINK',{previewUrl:fresh.previewUrl,verification:fresh.verification,recipients:spec.recipients||[],message:spec.shareMessage||null},context);if(!share.success){fresh.status='FAILED';return{success:false,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl};}fresh.share=clone(share.data);fresh.status='COMPLETED';fresh.completedAt=new Date().toISOString();return{success:true,status:fresh.status,run:fresh,previewUrl:fresh.previewUrl,verification:fresh.verification,share:fresh.share};
  }
  function health(){return{capability:'BUILD_TEST_REPAIR_PUBLISH_VERIFY_SHARE',stages:STAGES.map(function(name){var a=adapter(name);return{name:name,adapterRegistered:!!a,adapterId:a&&a.id||null};}),ready:STAGES.every(function(name){return adapters.has(name);})};}
  function configure(options){override=options||{};}
  FTN.BuildPreviewShare={STAGES:STAGES.slice(),registerAdapter:registerAdapter,adapter:adapter,execute:execute,resume:resume,health:health,configure:configure};
})(typeof window!=='undefined'?window:globalThis);
