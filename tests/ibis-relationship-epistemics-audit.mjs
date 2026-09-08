import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx={window:{},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/ibis-relationship-epistemics.js','utf8'),ctx);const E=ctx.window.FTN.IbisRelationshipEpistemics;assert(E);
assert.equal(E.classify({type:'correlation',classification:'Official',confidence:'High'}),'OBSERVED_CORRELATION','Official source must not imply causal relationship');
assert.equal(E.describe({type:'correlation',classification:'Verified',confidence:'High'}).causal,false,'Verified source must not imply causality');
assert.equal(E.classify({type:'dependency',classification:'FTN Derived'}),'KNOWN_RELATIONSHIP');
assert.equal(E.classify({type:'causal',classification:'Official',causalEvidence:true}),'CONFIRMED_CAUSAL');
assert.equal(E.classify({type:'causal',classification:'Official',causalEvidence:false}),'HYPOTHESIS');
assert.equal(E.classify({type:'predictive',outOfSampleValidated:true}),'PREDICTIVE_SIGNAL');
console.log('ibis Relationship Epistemics: source authority is separated from causality; causal label requires explicit causal evidence.');
