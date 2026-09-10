import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const eligibilitySrc=fs.readFileSync('js/ibis-eligibility.js','utf8');
const fabricSrc=fs.readFileSync('js/ibis-universal-executors.js','utf8');
const registrySrc=fs.readFileSync('js/ibis-provider-registry.js','utf8');

// First prove the real production registry does NOT silently call locked video providers.
const real={FTN:{},console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Promise,CustomEvent:function(){}};real.window=real;real.globalThis=real;vm.createContext(real);vm.runInContext(registrySrc,real);vm.runInContext(eligibilitySrc,real);
const video=real.FTN.IbisProviders.byCapability('VIDEO_GENERATION');
assert(video.some(p=>p.id==='bytez-wan21-t2v'),'Bytez video candidate must remain registered');
assert(video.some(p=>p.id==='pixverse'),'PixVerse must remain registered');
assert(video.some(p=>p.id==='kling'),'Kling must remain registered');
assert.equal(real.FTN.IbisEligibility.find('VIDEO_GENERATION',{authenticated:false}).length,0,'No locked/unverified video route may be auto-called today');
assert.equal(real.FTN.IbisEligibility.evaluate('pixverse','VIDEO_GENERATION',{}).status,'INELIGIBLE');
assert.equal(real.FTN.IbisEligibility.evaluate('kling','VIDEO_GENERATION',{}).status,'INELIGIBLE');

// Then prove the generic fabric really fails over A -> B and validates an actual video artifact.
const calls=[];
const providers=[
 {id:'bytez-wan21-t2v',name:'Bytez',capabilities:['VIDEO_GENERATION'],enabled:true,costToIbis:'ZERO_COST_TO_IBIS',apiStatus:'LIVE',modelId:'Wan-test'},
 {id:'pixverse',name:'PixVerse',capabilities:['VIDEO_GENERATION'],enabled:true,costToIbis:'ZERO_CUSTOMER_FUNDED',apiStatus:'LIVE',modelId:'pixverse-test'},
 {id:'kling',name:'Kling',capabilities:['VIDEO_GENERATION'],enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',apiStatus:'LIVE',modelId:'kling-test'}
];
const fake={
 FTN:{
  IbisProviders:{get:id=>providers.find(p=>p.id===id)||null,byCapability:cap=>providers.filter(p=>p.capabilities.includes(cap)),all:()=>providers.slice()},
  CapabilityTaxonomy:{isRecognized:cap=>cap==='VIDEO_GENERATION'},
  IbisProvenance:{build:x=>x},
  IbisClient:{request:async()=>({legacy:true})}
 },
 console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Promise,
 fetch:async(url,opts)=>{
  calls.push({url,body:JSON.parse(opts.body)});
  if(url.includes('ibis-video-bytez'))return{ok:false,status:401,json:async()=>({error:'auth'})};
  if(url.includes('ibis-video-ltx'))throw new Error('paid route must not run');
  return{ok:true,status:200,json:async()=>({videoUrl:'https://cdn.example.test/generated.mp4',mimeType:'video/mp4',model:'pixverse-test'})};
 },
 AbortController,CustomEvent:function(){},
};
fake.window=fake;fake.globalThis=fake;vm.createContext(fake);vm.runInContext(eligibilitySrc,fake);vm.runInContext(fabricSrc,fake);
assert.equal(fake.FTN.IbisClient.__universalExecutorsInstalled,true);
const result=await fake.FTN.IbisClient.request({capability:'VIDEO_GENERATION',payload:{prompt:'red ibis over Tobago',duration:5},context:{authenticated:false}});
assert.equal(result.success,true,'Second eligible provider must recover the request');
assert.equal(result.provenance.provider,'pixverse');
assert.deepEqual(result.provenance.attempts.map(x=>[x.providerId,x.success]),[['bytez-wan21-t2v',false],['pixverse',true]]);
assert.equal(calls.length,2,'Disabled Kling and paid route must not execute');
assert(calls[0].url.includes('ibis-video-bytez'));

// A provider returning HTTP 200 without a playable artifact must still fail and continue.
const noArtifactProviders=[
 {id:'bytez-wan21-t2v',name:'A',capabilities:['VIDEO_GENERATION'],enabled:true,costToIbis:'ZERO_COST_TO_IBIS',apiStatus:'LIVE'},
 {id:'pixverse',name:'B',capabilities:['VIDEO_GENERATION'],enabled:true,costToIbis:'ZERO_CUSTOMER_FUNDED',apiStatus:'LIVE'}
];
fake.FTN.IbisProviders={get:id=>noArtifactProviders.find(p=>p.id===id)||null,byCapability:()=>noArtifactProviders,all:()=>noArtifactProviders};
fake.fetch=async url=>url.includes('bytez')?{ok:true,status:200,json:async()=>({message:'queued'})}:{ok:true,status:200,json:async()=>({video:'https://cdn.example.test/final.mp4'})};
const second=await fake.FTN.IbisClient.request({capability:'VIDEO_GENERATION',payload:{prompt:'test'}});
assert.equal(second.success,true);
assert.equal(second.provenance.attempts[0].errorType,'OUTPUT_FAILURE');
assert.equal(second.provenance.attempts[1].success,true);

console.log('ibis universal failover PASS: real registry locks respected; Bytez failure -> next eligible provider; fake success without artifact rejected; disabled/paid routes never auto-called.');
