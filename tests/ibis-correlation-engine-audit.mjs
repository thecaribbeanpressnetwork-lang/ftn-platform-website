import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx={window:{},console}; vm.createContext(ctx);
for(const file of ['js/ibis-math.js','js/ibis-correlation-engine.js']) vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const C=ctx.window.FTN.IbisCorrelation;
assert(C,'IbisCorrelation must be exposed');

const a={id:'a',label:'A',unit:'index',frequency:'ANNUAL',source:{publisher:'Source A'},periods:['2020','2021','2022','2023','2024'],values:[1,2,3,4,5]};
const b={id:'b',label:'B',unit:'count',frequency:'ANNUAL',source:{publisher:'Source B'},periods:['2020','2021','2022','2023','2024'],values:[10,20,30,40,50]};
const r=C.analyze(a,b);
assert.equal(r.success,true); assert(Math.abs(r.r-1)<1e-12); assert.equal(r.n,5); assert.equal(r.causal,false); assert.match(r.warning,/does not establish causation/i); assert.equal(r.provenance.transformation.includes('no interpolation'),true);

const staggered=C.analyze(
  {...a,periods:['2019','2020','2021','2022','2023','2024'],values:[0,1,2,3,4,5]},
  {...b,periods:['2021','2022','2023','2024','2025','2026'],values:[20,30,40,50,60,70]},
  {minPairs:4}
);
assert.equal(staggered.success,true); assert.deepEqual(staggered.alignedPeriods,['2021','2022','2023','2024']); assert.equal(staggered.n,4);

const tooThin=C.analyze(a,{...b,periods:['2023','2024'],values:[40,50]});
assert.equal(tooThin.success,false); assert.equal(tooThin.errorType,'INSUFFICIENT_OVERLAP');
const mismatched=C.analyze(a,{...b,frequency:'MONTHLY'});
assert.equal(mismatched.success,false); assert.equal(mismatched.errorType,'FREQUENCY_MISMATCH');
const duplicate=C.analyze({...a,periods:['2020','2020','2022','2023','2024']},b);
assert.equal(duplicate.success,false); assert.equal(duplicate.errorType,'DUPLICATE_PERIOD');
const zeroVariance=C.analyze({...a,values:[1,1,1,1,1]},b);
assert.equal(zeroVariance.success,false); assert.equal(zeroVariance.errorType,'ZERO_VARIANCE');

const lagged=C.analyze(a,b,{lags:[-1,0,1]});
assert.equal(lagged.success,true); assert.equal(lagged.lags.length,3); assert.equal(lagged.lags[1].lag,0); assert(Math.abs(lagged.lags[1].r-1)<1e-12);

console.log('ibis Correlation Engine: exact-period alignment, sample guards, frequency guards, provenance and non-causality contract verified.');
