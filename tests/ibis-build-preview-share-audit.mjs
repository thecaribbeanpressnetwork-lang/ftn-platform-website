import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function load(){
  const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Promise,crypto:{randomUUID:()=>`id-${Math.random()}`}});ctx.globalThis=ctx;ctx.window=ctx;ctx.FTN={};
  vm.runInContext(fs.readFileSync('js/ibis-build-preview-share.js','utf8'),ctx,{filename:'js/ibis-build-preview-share.js'});
  return ctx.FTN.BuildPreviewShare;
}

// Happy path: tests pass first time, repair is honestly skipped, publishing and sharing stay permissioned,
// and the deployed URL must be verified before it can be shared.
const B=load();let permissions={preview_publish:'ASK',share_link:'ASK'},calls=[];
B.configure({permissionLedger:{check:async(_subject,action)=>({decision:permissions[action]||'ASK'})}});
B.registerAdapter('BUILD',{id:'builder',run:async()=>{calls.push('BUILD');return{success:true,artifact:{id:'artifact-1'}};}});
B.registerAdapter('TEST',{id:'tester',run:async()=>{calls.push('TEST');return{success:true,passed:true,summary:'all passed'};}});
B.registerAdapter('REPAIR',{id:'repairer',run:async()=>{calls.push('REPAIR');return{success:true,artifact:{id:'repaired'}};}});
B.registerAdapter('PUBLISH_PREVIEW',{id:'publisher',run:async()=>{calls.push('PUBLISH');return{success:true,previewUrl:'https://preview.example.test/abc',reachable:true};}});
B.registerAdapter('VERIFY',{id:'verifier',run:async input=>{calls.push('VERIFY');return{success:true,verified:true,url:input.previewUrl,checks:['http-200','ibis-route','community-connect-boundary']};}});
B.registerAdapter('SHARE_LINK',{id:'share',run:async input=>{calls.push('SHARE');return{success:true,delivered:true,previewUrl:input.previewUrl};}});
assert.equal(B.health().ready,true);assert.equal(B.health().capability,'BUILD_TEST_REPAIR_PUBLISH_VERIFY_SHARE');
let r=await B.execute({goal:'Build a field service app',kind:'APP'});
assert.equal(r.status,'WAITING_PERMISSION');assert.deepEqual(calls,['BUILD','TEST']);assert.equal(r.run.stages.find(x=>x.name==='REPAIR').status,'SKIPPED');
permissions.preview_publish='ALLOW';r=await B.resume(r.run,{});
assert.equal(r.status,'WAITING_PERMISSION');assert.equal(r.previewUrl,'https://preview.example.test/abc');assert.equal(r.verification.verified,true);assert.deepEqual(calls,['BUILD','TEST','PUBLISH','VERIFY']);
permissions.share_link='ALLOW';r=await B.resume(r.run,{recipients:['tester@example.test']});
assert.equal(r.success,true);assert.equal(r.status,'COMPLETED');assert.deepEqual(calls,['BUILD','TEST','PUBLISH','VERIFY','SHARE']);

// A failing test triggers bounded repair and a real retest before publishing.
const R=load();R.configure({permissionLedger:{check:async()=>({decision:'ALLOW'})}});let repairCalls=[],testNo=0;
R.registerAdapter('BUILD',{run:async()=>({success:true,artifact:{version:1}})});
R.registerAdapter('TEST',{run:async input=>{repairCalls.push('TEST-'+input.repairAttempt);testNo++;return testNo===1?{success:true,passed:false,failures:['broken route']}:{success:true,passed:true};}});
R.registerAdapter('REPAIR',{run:async input=>{repairCalls.push('REPAIR-'+input.attempt);return{success:true,artifact:{version:2}};}});
R.registerAdapter('PUBLISH_PREVIEW',{run:async input=>{repairCalls.push('PUBLISH');assert.equal(input.artifact.version,2);return{success:true,previewUrl:'https://preview.example.test/repaired',reachable:true};}});
R.registerAdapter('VERIFY',{run:async()=>{repairCalls.push('VERIFY');return{success:true,verified:true};}});
R.registerAdapter('SHARE_LINK',{run:async()=>{repairCalls.push('SHARE');return{success:true,delivered:true};}});
const repaired=await R.execute({goal:'Repair and publish app',maxRepairAttempts:2});
assert.equal(repaired.success,true);assert.equal(repaired.run.repairAttempts,1);assert.deepEqual(repairCalls,['TEST-0','REPAIR-1','TEST-1','PUBLISH','VERIFY','SHARE']);
assert.equal(repaired.run.stages.find(x=>x.name==='TEST').attempts.length,2);

// Exhausted repair attempts must prevent publishing entirely.
const F=load();F.configure({permissionLedger:{check:async()=>({decision:'ALLOW'})}});let published=false,repairs=0;
F.registerAdapter('BUILD',{run:async()=>({success:true,artifact:{id:'x'}})});
F.registerAdapter('TEST',{run:async()=>({success:true,passed:false})});
F.registerAdapter('REPAIR',{run:async()=>{repairs++;return{success:true,artifact:{id:'still-broken'}};}});
F.registerAdapter('PUBLISH_PREVIEW',{run:async()=>{published=true;return{success:true,previewUrl:'https://bad.example',reachable:true};}});
F.registerAdapter('VERIFY',{run:async()=>({success:true,verified:true})});F.registerAdapter('SHARE_LINK',{run:async()=>({success:true})});
const failed=await F.execute({goal:'Build broken app',maxRepairAttempts:1});assert.equal(failed.status,'FAILED');assert.equal(repairs,1);assert.equal(published,false);

// Publisher cannot pass with a fake/missing URL.
const U=load();U.configure({permissionLedger:{check:async()=>({decision:'ALLOW'})}});U.registerAdapter('BUILD',{run:async()=>({success:true,artifact:{}})});U.registerAdapter('TEST',{run:async()=>({success:true,passed:true})});U.registerAdapter('REPAIR',{run:async()=>({success:true})});U.registerAdapter('PUBLISH_PREVIEW',{run:async()=>({success:true,previewUrl:'not-a-url',reachable:true})});U.registerAdapter('VERIFY',{run:async()=>({success:true,verified:true})});U.registerAdapter('SHARE_LINK',{run:async()=>({success:true})});const bad=await U.execute({goal:'Build app'});assert.equal(bad.status,'FAILED');assert.equal(bad.run.stages.find(x=>x.name==='PUBLISH_PREVIEW').error.code,'NO_VERIFIABLE_PREVIEW_URL');

// A reachable URL that fails deployed verification is not shareable.
const V=load();V.configure({permissionLedger:{check:async()=>({decision:'ALLOW'})}});let shared=false;V.registerAdapter('BUILD',{run:async()=>({success:true,artifact:{}})});V.registerAdapter('TEST',{run:async()=>({success:true,passed:true})});V.registerAdapter('REPAIR',{run:async()=>({success:true})});V.registerAdapter('PUBLISH_PREVIEW',{run:async()=>({success:true,previewUrl:'https://preview.example.test/unverified',reachable:true})});V.registerAdapter('VERIFY',{run:async()=>({success:true,verified:false,checks:[{name:'route',passed:false}]})});V.registerAdapter('SHARE_LINK',{run:async()=>{shared=true;return{success:true};}});const unverified=await V.execute({goal:'Build app'});assert.equal(unverified.status,'FAILED');assert.equal(shared,false);assert.equal(unverified.run.stages.find(x=>x.name==='VERIFY').error.code,'PREVIEW_VERIFICATION_FAILED');

console.log('ibis build-preview-share audit: bounded repair/retest, publish permission, real URL, deployed verification, resumable sharing, and final permission verified.');
