import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const eligibilitySrc=fs.readFileSync('js/ibis-eligibility.js','utf8');
const fabricSrc=fs.readFileSync('js/ibis-universal-executors.js','utf8');
const registrySrc=fs.readFileSync('js/ibis-provider-registry.js','utf8');

// Prove runtime augmentation registers Bytez while preserving every real production lock.
const real={FTN:{IbisClient:{request:async()=>({legacy:true})},CapabilityTaxonomy:{isRecognized:()=>true}},console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Promise,AbortController,CustomEvent:function(){},fetch:async()=>({ok:true,status:200,json:async()=>({ready:false,readyToGenerate:false})})};real.window=real;real.globalThis=real;vm.createContext(real);vm.runInContext(registrySrc,real);vm.runInContext(eligibilitySrc,real);vm.runInContext(fabricSrc,real);
const video=real.FTN.IbisProviders.byCapability('VIDEO_GENERATION');
assert(video.some(p=>p.id==='bytez-wan21-t2v'),'Universal fabric must register the deployed Bytez video adapter at runtime');
assert(video.some(p=>p.id==='pixverse'),'PixVerse must remain registered');
assert(video.some(p=>p.id==='kling'),'Kling must remain registered');
assert.equal(real.FTN.IbisEligibility.find('VIDEO_GENERATION',{authenticated:false}).length,0,'No locked/unverified video route may be auto-called today');
assert.equal(real.FTN.IbisEligibility.evaluate('bytez-wan21-t2v','VIDEO_GENERATION',{}).status,'INELIGIBLE');
assert.equal(real.FTN.IbisEligibility.evaluate('pixverse','VIDEO_GENERATION',{}).status,'INELIGIBLE');
assert.equal(real.FTN.IbisEligibility.evaluate('kling','VIDEO_GENERATION',{}).status,'INELIGIBLE');

// Prove the central loop itself performs A -> B failover regardless of provider brand.
const calls=[];
const providers=[
 {id:'bytez-wan21-t2v',name:'Bytez',capabilities:['VIDEO_GENERATION'],enabled:true,costToIbis:'ZERO_COST_TO_IBIS',apiStatus:'LIVE',modelId:'Wan-test'},
 {id:'pixverse',name:'PixVerse',capabilities:['VIDEO_GENERATION'],enabled:true,costToIbis:'ZERO_CUSTOMER_FUNDED',apiStatus:'LIVE',modelId:'pixverse-test'},
 {id:'kling',name:'Kling',capabilities:['VIDEO_GENERATION'],enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',apiStatus:'LIVE',modelId:'kling-test'}
];
const fake={FTN:{IbisProviders:{get:id=>providers.find(p=>p.id===id)||null,byCapability:cap=>providers.filter(p=>p.capabilities.includes(cap)),byCategory:()=>[],all:()=>providers.slice(),verifiedAt:'test'},CapabilityTaxonomy:{isRecognized:cap=>cap==='VIDEO_GENERATION'},IbisProvenance:{build:x=>x},IbisClient:{request:async()=>({legacy:true})}},console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Promise,AbortController,CustomEvent:function(){},fetch:async()=>({ok:true,status:200,json:async()=>({ready:false,readyToGenerate:false})})};fake.window=fake;fake.globalThis=fake;vm.createContext(fake);vm.runInContext(eligibilitySrc,fake);vm.runInContext(fabricSrc,fake);
assert.equal(fake.FTN.IbisClient.__universalExecutorsInstalled,true);
const result=await fake.FTN.IbisClient.request({capability:'VIDEO_GENERATION',payload:{prompt:'red ibis over Tobago'},executor:async provider=>{calls.push(provider.id);if(provider.id==='bytez-wan21-t2v')return{success:false,errorType:'AUTH_FAILURE',latencyMs:4};if(provider.id==='pixverse')return{success:true,latencyMs:8,data:{video:'https://cdn.example.test/generated.mp4',mimeType:'video/mp4',model:'pixverse-test'}};throw new Error('disabled provider must not run');}});
assert.equal(result.success,true,'Second eligible provider must recover the request');
assert.equal(result.provenance.provider,'pixverse');
assert.deepEqual(Array.from(result.provenance.attempts,x=>[x.providerId,x.success]),[['bytez-wan21-t2v',false],['pixverse',true]]);
assert.deepEqual(calls,['bytez-wan21-t2v','pixverse'],'Disabled Kling must not execute');

// Real media adapter validator: HTTP success without a playable video is not success.
assert.equal(fake.FTN.IbisUniversalExecutors.validateArtifact('VIDEO_GENERATION',{message:'queued'}),null);
assert(fake.FTN.IbisUniversalExecutors.validateArtifact('VIDEO_GENERATION',{videoUrl:'https://cdn.example.test/final.mp4'}));

// Prove health may enable zero-cost image/speech but never promotes unavailable Bytez video.
await real.FTN.IbisUniversalExecutors.refreshRuntimeHealth();
assert.equal(real.FTN.IbisProviders.get('bytez-wan21-t2v').enabled,false);

console.log('ibis universal failover PASS: runtime Bytez registration, real provider locks, A-fails/B-succeeds failover, artifact validation and no silent Kling/PixVerse spend verified.');