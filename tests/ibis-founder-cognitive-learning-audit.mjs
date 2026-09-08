import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
function load(file,ctx){vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}
function storage(){const data=new Map();return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Promise,TextEncoder,crypto:webcrypto,localStorage:storage()});ctx.window=ctx;ctx.globalThis=ctx;ctx.FTN={};
for(const file of ['js/ibis-personal-context.js','js/ibis-founder-cognitive-layer.js','js/ibis-butterfly-engine.js','js/ibis-mission-tracker.js','js/ibis-research-hypotheses.js'])load(file,ctx);
const F=ctx.FTN.FounderCognitiveLayer;
assert(F.updatePathwayWeight(.5,{success:1})>.5,'verified success must raise pathway weight');
assert(F.updatePathwayWeight(.5,{failure:1})<.5,'verified failure must lower pathway weight');
const ordinary=ctx.FTN.ButterflyEngine.chain({action:'stay overnight',expectedEffects:[{probability:.5,strategicValue:2,connectivity:1}]});
const surprising=ctx.FTN.ButterflyEngine.chain({action:'stay overnight',expectedEffects:[{probability:.5,strategicValue:2,connectivity:1}],unexpectedEffects:[{observed:true,strategicValue:5,connectivity:4}]});
assert(surprising.actualButterflyValue>ordinary.actualButterflyValue,'unexpected positive consequences must raise butterfly value');
const transferable=F.transferScore({contextTags:['property','tobago'],confidence:1,outcomeStrength:1,founderAlignment:1,recencyRelevance:1},{contextTags:['property','tobago']});
const irrelevant=F.transferScore({contextTags:['music','copyright'],confidence:1,outcomeStrength:1,founderAlignment:1,recencyRelevance:1},{contextTags:['property','tobago']});
assert(transferable>.9&&irrelevant===0,'irrelevant success must not transfer blindly');
const first=await F.append({kind:'DECISION',decisionId:'d1',action:'book recon stay'},{source:'founder',authenticated:true});
const correction=await F.append({kind:'CORRECTION',supersedes:first.hash,lesson:'Inspect connectivity before valuation.'},{source:'founder',authenticated:true});
const records=await F.history();assert.equal(records.length,3);assert.equal(records[1].hash,first.hash);assert.equal(records[2].event.supersedes,first.hash,'correction must supersede, not erase');assert.equal((await F.verifyHistory(records)).valid,true);
const tampered=JSON.parse(JSON.stringify(records));tampered[1].event.action='silently rewritten';assert.equal((await F.verifyHistory(tampered)).valid,false,'historical changes must be detectable');
const retrospective=F.retrospective({context:{place:'Tobago'},optionsConsidered:['book','desk research'],how:['use a paid stay as reconnaissance'],why:['gain lived operating evidence'],action:'book',expectedOutcome:'property intelligence'},{actualOutcome:'property and relationship intelligence',why:['direct observation exposed new constraints'],unexpectedConsequences:['community relationship'],butterflyEffects:['seller motivation signal'],lesson:'Low-cost reversible actions can open high-value pathways.',betterFutureHow:['price information gain before immediate payoff']});
assert.equal(retrospective.kind,'RETROSPECTIVE_WHY_TO_HOW');assert(retrospective.betterFutureHow.length>0);
let mission=ctx.FTN.IbisMissionTracker.marysHill(),before=mission.probability;mission=ctx.FTN.IbisMissionTracker.applyAction(mission,{stage:'stay booked',completed:true,action:'Book Mary’s Hill Lodge',actionQuality:1,informationGain:.9,executionProbability:1,founderAlignment:1,expectedEffects:[{probability:.8,strategicValue:4,connectivity:5}]});assert(mission.probability>before);assert.equal(mission.stages.find(x=>x.label==='stay booked').status,'COMPLETED');assert.equal(mission.events.length,1);
const hypothesis=ctx.FTN.IbisResearchHypotheses.get('gill-cohesive-consciousness-hypothesis');assert.equal(hypothesis.establishedScience,false);assert.equal(hypothesis.classification,'FOUNDER_SPECULATIVE_HYPOTHESIS');
const imitation=F.resonance({behaviouralSimilarity:1,conversationalContinuity:1,authenticatedIdentity:0,trustedDevice:0});assert.equal(imitation.canAuthorize,false);assert(imitation.confidence<.5,'language imitation alone must not create founder authority');
assert(Number.isFinite(F.CONFIG.pathway.alpha)&&F.PRINCIPLES.includes('public trust'),'weighting logic must be inspectable');
console.log('ibis FCL learning audit: persistence, provenance, WHY→HOW learning, pathway weights, butterfly chains, Mary’s Hill mission, hypothesis isolation, auth safety and tamper evidence verified.');
