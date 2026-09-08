import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function load(path,ctx){vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});}
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const listeners={};
const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Promise,crypto:{randomUUID:()=>`id-${Math.random()}`},localStorage:storage(),navigator:{},addEventListener:(n,fn)=>{(listeners[n]||(listeners[n]=[])).push(fn);},removeEventListener:(n,fn)=>{listeners[n]=(listeners[n]||[]).filter(x=>x!==fn);}});
ctx.globalThis=ctx;ctx.window=ctx;ctx.FTN={};
load('js/ibis-personal-context.js',ctx);
load('js/ibis-permission-ledger.js',ctx);
load('js/ibis-app-registry.js',ctx);
load('js/ibis-universal-router.js',ctx);
load('js/ibis-multi-agent-orchestrator.js',ctx);
load('js/ibis-runtime.js',ctx);
load('js/ibis-device-sensor-bridge.js',ctx);

await ctx.FTN.PersonalContext.upsert('personal','favorite-layout',{value:'headspace'});
assert.equal((await ctx.FTN.PersonalContext.get('personal','favorite-layout')).content.value,'headspace');
assert.equal((await ctx.FTN.PersonalContext.snapshot()).length,1);

const unknown=ctx.FTN.UniversalRouter.route('Explain why birds migrate');
assert.equal(unknown.success,true);assert(unknown.capabilityCandidates.includes('TEXT'),'Unknown topics must retain TEXT fallback');
const external=ctx.FTN.UniversalRouter.route('Build the website and deploy it');
assert.equal(external.sideEffect,'EXTERNAL');assert(external.agents.includes('ENGINEERING'));assert(external.agents.includes('OPS'));assert(external.agents.includes('COMMS'));

let executed=0;
ctx.FTN.MultiAgentOrchestrator.configure({router:ctx.FTN.UniversalRouter,permissionLedger:ctx.FTN.PermissionLedger,executor:async()=>{executed++;return{success:true,data:{ok:true}};},persistence:{saveRun:async x=>x,saveTask:async x=>x}});
let run=await ctx.FTN.MultiAgentOrchestrator.execute('Build the website and deploy it',{});
assert.equal(run.status,'WAITING_PERMISSION','External work must block without explicit permission');
assert(run.run.tasks.some(t=>t.status==='WAITING_PERMISSION'));
await ctx.FTN.PermissionLedger.set('agent:ENGINEERING','external_action','ALLOW');
await ctx.FTN.PermissionLedger.set('agent:OPS','external_action','ALLOW');
await ctx.FTN.PermissionLedger.set('agent:COMMS','external_action','ALLOW');
run=await ctx.FTN.MultiAgentOrchestrator.execute('Build the website and deploy it',{});
assert.equal(run.status,'COMPLETED');assert(executed>0);

const thermal=ctx.FTN.DeviceSensorBridge.thermalPolicy({sourceType:'RGB_CAMERA',realThermalSensor:false});
assert.equal(thermal.allowed,false);assert.equal(thermal.code,'THERMAL_SENSOR_REQUIRED');
assert.equal(ctx.FTN.DeviceSensorBridge.thermalPolicy({sourceType:'FLIR_ONE',realThermalSensor:true}).allowed,true);

console.log('ibis runtime foundation audit: persistent guest context, universal TEXT fallback, permissioned multi-agent execution and thermal/device truth guard verified.');