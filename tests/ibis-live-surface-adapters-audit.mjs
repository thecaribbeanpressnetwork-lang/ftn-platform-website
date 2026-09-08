import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx={window:{},console,Date,setInterval,clearInterval};
ctx.window.FTN={
  Sources:{get:(id)=>({name:'Official source',url:'https://example.org/'+id})},
  LiveClocks:{computeClockValue:(indicator,now)=>indicator.id==='budget-progress'?'54':'1,531,000'}
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/ibis-live-surface-adapters.js','utf8'),ctx);
const A=ctx.window.FTN.IbisLiveAdapters;
assert(A,'IbisLiveAdapters must register');
const model=A.fromLiveClock({id:'budget-progress',title:'Budget-Year Progress',value:'54',units:'%',classification:'FTN Derived',sourceId:'tt-mof',lastUpdated:'2026-07-01',confidence:'High',isLiveClock:true,methodology:'Calendar-derived progress',clock:{kind:'fiscal-year-progress'}});
assert.equal(model.success,true);
assert.equal(model.spec.mode,'LIVE_MODEL');
assert.equal(model.spec.values[0],54);
assert.equal(typeof model.spec.refresh,'function');
assert.equal(model.spec.source.name,'Official source');
const update=await model.spec.refresh();
assert.deepEqual(Array.from(update.values),[54]);
assert.match(update.calculatedAt,/T/);
const staticResult=A.fromLiveClock({id:'repo-rate',title:'Repo Rate',isLiveClock:false});
assert.equal(staticResult.success,false);
assert.equal(staticResult.errorType,'NOT_LIVE_CLOCK');
const live=A.fromPollingFeed({title:'Genuine live feed',values:[1],refresh:async()=>({values:[2]})});
assert.equal(live.success,true);
assert.equal(live.spec.mode,'LIVE');
assert.equal(typeof live.spec.refresh,'function');
assert.equal(A.fromPollingFeed({title:'Fake live',values:[1]}).errorType,'MISSING_REFRESH');
console.log('ibis Live Surface Adapters: LIVE_MODEL truth-label, updater retention and genuine LIVE refresh invariant verified.');
