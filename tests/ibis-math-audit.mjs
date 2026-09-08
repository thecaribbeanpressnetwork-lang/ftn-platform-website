import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx={window:{},console}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/ibis-math.js','utf8'),ctx);
const M=ctx.window.FTN.IbisMath;
assert(M,'IbisMath must be exposed on FTN');

assert.equal(M.divide(10,2).value,5);
assert.equal(M.divide(1,0).error,'ZERO_DENOMINATOR');
assert.equal(M.percentChange(100,125,3).value,25);
assert.equal(M.percentChange(0,10).error,'ZERO_BASELINE');
assert.equal(M.absoluteChange(7,2,2).value,-5);
assert.equal(M.mean([1,2,3,4]).value,2.5);
assert.equal(M.weightedMean([10,20],[1,3]).value,17.5);
assert.equal(M.weightedMean([10,20],[1,-1]).error,'ZERO_WEIGHT_SUM');
assert.equal(M.variance([1,2,3],false).value,2/3);
assert.equal(M.variance([1],true).error,'INSUFFICIENT_SAMPLE');
assert(Math.abs(M.standardDeviation([2,4,4,4,5,5,7,9],false).value-2)<1e-12);

const perfect=M.pearson([1,2,3,4],[2,4,6,8]);
assert.equal(perfect.ok,true); assert(Math.abs(perfect.value-1)<1e-12); assert.equal(perfect.strength,'VERY_STRONG'); assert.equal(perfect.causal,false);
const inverse=M.pearson([1,2,3,4],[8,6,4,2]);
assert(Math.abs(inverse.value+1)<1e-12); assert.equal(inverse.direction,'NEGATIVE');
assert.equal(M.pearson([1,1,1],[2,3,4]).error,'ZERO_VARIANCE');
assert.equal(M.pearson([1,2],[3,4]).error,'INSUFFICIENT_SAMPLE');
assert.equal(M.pearson([1,2,3],[1,2]).error,'LENGTH_MISMATCH');

const lag=M.laggedPearson([1,2,3,4,5],[0,1,2,3,4],-1);
assert.equal(lag.ok,true); assert.equal(lag.lag,-1); assert.equal(lag.alignedPairs,4);
assert.equal(M.laggedPearson([1,2,3],[1,2,3],0.5).error,'INVALID_LAG');

assert.equal(M.cagr(100,121,2,3).value,10);
assert.equal(M.cagr(0,121,2).error,'INVALID_GROWTH_BASE');
assert.equal(M.realReturn(10,5,6).value,4.761905);
assert.equal(M.requiredCapitalForIncome(35000,5,2).value,8400000);
assert.equal(M.requiredCapitalForIncome(35000,0).error,'INVALID_YIELD');
assert.equal(M.futureValue(1000,10,2,1,2).value,1210);

const reg=M.linearRegression([1,2,3,4],[3,5,7,9]);
assert.equal(reg.ok,true); assert(Math.abs(reg.value.slope-2)<1e-12); assert(Math.abs(reg.value.intercept-1)<1e-12); assert(Math.abs(reg.value.r2-1)<1e-12); assert.equal(reg.causal,false);

for(const fn of [()=>M.divide(NaN,2),()=>M.mean([1,Infinity]),()=>M.realReturn(NaN,2)]) assert.equal(fn().ok,false,'non-finite inputs must fail closed');

console.log('ibis Math Kernel: arithmetic, changes, descriptive statistics, Pearson/lag correlation, regression and capital/return math all fail closed and recompute correctly.');
