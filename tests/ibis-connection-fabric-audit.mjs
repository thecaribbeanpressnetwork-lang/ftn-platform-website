import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Promise});
ctx.globalThis=ctx;ctx.window=ctx;
let directInvoked=false;
ctx.FTN={AppRegistry:{
  adapter:(p)=>p==='gmail'?{invoke:async()=>({})}:null,
  health:async(p)=>({ready:p==='gmail'}),
  invoke:async(provider,operation,payload)=>{directInvoked=true;return{success:true,provider,operation,data:payload};}
}};
vm.runInContext(fs.readFileSync('js/ibis-connection-fabric.js','utf8'),ctx,{filename:'js/ibis-connection-fabric.js'});
const F=ctx.FTN.ConnectionFabric;
assert.deepEqual([...F.ORDER],['DIRECT','MCP','ACTIVEPIECES','NANGO','REST']);
let r=await F.resolve('gmail','search');assert.equal(r.success,true);assert.equal(r.path,'DIRECT');
let out=await F.invoke('gmail','search',{q:'test'});assert.equal(out.success,true);assert.equal(directInvoked,true);

let apCalls=0;
F.registerGateway('ACTIVEPIECES',{
  health:async()=>({ready:true}),
  canHandle:async(provider)=>provider==='hubspot',
  invoke:async(provider,operation,payload)=>{apCalls++;return{provider,operation,payload};}
});
r=await F.resolve('hubspot','find-contact');assert.equal(r.success,true);assert.equal(r.path,'ACTIVEPIECES');
out=await F.invoke('hubspot','find-contact',{email:'a@example.test'});assert.equal(out.success,true);assert.equal(out.path,'ACTIVEPIECES');assert.equal(apCalls,1);

r=await F.resolve('unknown-service','do-thing');assert.equal(r.success,false);assert.equal(r.code,'NO_READY_CONNECTION_PATH');assert(r.recommendedPaths.includes('MCP'));assert(r.recommendedPaths.includes('NANGO'));
assert.equal((await F.health()).ready,true);
console.log('ibis connection fabric audit: direct-first routing, open integration gateway fallback, honest no-path failure and gateway health verified.');
