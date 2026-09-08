import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Promise,crypto:{randomUUID:()=>`id-${Math.random()}`}});ctx.globalThis=ctx;ctx.window=ctx;ctx.FTN={};
vm.runInContext(fs.readFileSync('js/ibis-build-preview-share.js','utf8'),ctx,{filename:'js/ibis-build-preview-share.js'});
const B=ctx.FTN.BuildPreviewShare;
let permissions={preview_publish:'ASK',share_link:'ASK'};
B.configure({permissionLedger:{check:async(_subject,action)=>({decision:permissions[action]||'ASK'})}});
let calls=[];
B.registerAdapter('BUILD',{id:'mock-builder',run:async()=>{calls.push('BUILD');return{success:true,artifact:{id:'artifact-1'}};}});
B.registerAdapter('TEST',{id:'mock-test',run:async()=>{calls.push('TEST');return{success:true,passed:true,summary:'all passed'};}});
B.registerAdapter('PUBLISH_PREVIEW',{id:'mock-publisher',run:async()=>{calls.push('PUBLISH');return{success:true,previewUrl:'https://preview.example.test/abc',reachable:true};}});
B.registerAdapter('SHARE_LINK',{id:'mock-share',run:async input=>{calls.push('SHARE');return{success:true,delivered:true,previewUrl:input.previewUrl};}});
assert.equal(B.health().ready,true);
let r=await B.execute({goal:'Build a field service app',kind:'APP'});
assert.equal(r.status,'WAITING_PERMISSION');assert.deepEqual(calls,['BUILD','TEST']);assert.equal(r.run.stages.find(x=>x.name==='PUBLISH_PREVIEW').status,'WAITING_PERMISSION');
permissions.preview_publish='ALLOW';
r=await B.resume(r.run,{});
assert.equal(r.status,'WAITING_PERMISSION');assert.equal(r.previewUrl,'https://preview.example.test/abc');assert.deepEqual(calls,['BUILD','TEST','PUBLISH']);
permissions.share_link='ALLOW';
r=await B.resume(r.run,{recipients:['tester@example.test']});
assert.equal(r.success,true);assert.equal(r.status,'COMPLETED');assert.deepEqual(calls,['BUILD','TEST','PUBLISH','SHARE']);

// Test failure must prevent publish entirely.
const ctx2=vm.createContext({console,Date,Math,JSON,Set,Map,Promise,crypto:{randomUUID:()=>`id-${Math.random()}`}});ctx2.globalThis=ctx2;ctx2.window=ctx2;ctx2.FTN={};vm.runInContext(fs.readFileSync('js/ibis-build-preview-share.js','utf8'),ctx2);
const F=ctx2.FTN.BuildPreviewShare;F.configure({permissionLedger:{check:async()=>({decision:'ALLOW'})}});let published=false;
F.registerAdapter('BUILD',{run:async()=>({success:true,artifact:{id:'x'}})});F.registerAdapter('TEST',{run:async()=>({success:true,passed:false})});F.registerAdapter('PUBLISH_PREVIEW',{run:async()=>{published=true;return{success:true,previewUrl:'https://bad.example',reachable:true};}});F.registerAdapter('SHARE_LINK',{run:async()=>({success:true})});
const failed=await F.execute({goal:'Build broken app'});assert.equal(failed.status,'FAILED');assert.equal(published,false);

// Publisher cannot pass with a fake/missing URL.
const ctx3=vm.createContext({console,Date,Math,JSON,Set,Map,Promise,crypto:{randomUUID:()=>`id-${Math.random()}`}});ctx3.globalThis=ctx3;ctx3.window=ctx3;ctx3.FTN={};vm.runInContext(fs.readFileSync('js/ibis-build-preview-share.js','utf8'),ctx3);
const U=ctx3.FTN.BuildPreviewShare;U.configure({permissionLedger:{check:async()=>({decision:'ALLOW'})}});U.registerAdapter('BUILD',{run:async()=>({success:true,artifact:{}})});U.registerAdapter('TEST',{run:async()=>({success:true,passed:true})});U.registerAdapter('PUBLISH_PREVIEW',{run:async()=>({success:true,previewUrl:'not-a-url',reachable:true})});U.registerAdapter('SHARE_LINK',{run:async()=>({success:true})});const bad=await U.execute({goal:'Build app'});assert.equal(bad.status,'FAILED');assert.equal(bad.run.stages.find(x=>x.name==='PUBLISH_PREVIEW').error.code,'NO_VERIFIABLE_PREVIEW_URL');

console.log('ibis build-preview-share audit: test gate, publish permission, real preview URL requirement, resumable sharing and final permission verified.');