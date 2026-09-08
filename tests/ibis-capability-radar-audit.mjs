import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx={window:{},globalThis:{}};ctx.window.window=ctx.window;vm.createContext(ctx);
function load(file){vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}
load('js/ibis-external-capability-catalog.js');
load('js/ibis-creative-capability-radar.js');
const FTN=ctx.window.FTN;
assert(FTN.ExternalCapabilityCatalog.all().length>=30,'External capability catalog should contain a meaningful seed set.');
assert(FTN.CreativeCapabilityRadar.all().length>=30,'Creative capability radar should contain a meaningful discovery set.');
assert.equal(FTN.ExternalCapabilityCatalog.executable().length,0,'Discovered providers must not become executable merely by catalog membership.');
assert(FTN.ExternalCapabilityCatalog.byCapability('MUSIC_GENERATE').length>=5,'Music routing should have multiple candidate providers/models.');
assert(FTN.CreativeCapabilityRadar.byCapability('BROWSER_CONTROL').length>=1,'Specialist radar should include browser automation.');
assert(FTN.CreativeCapabilityRadar.freeCandidates().length>20,'Radar should prioritize open/free/self-host capacity.');
for(const row of FTN.ExternalCapabilityCatalog.all()){
  assert(row.integrationState,'Every catalog row must state integrationState.');
  if(row.integrationState==='LIVE') assert.equal(row.licenseReviewRequired,false,'LIVE external providers must not still require license review.');
}
for(const row of FTN.CreativeCapabilityRadar.all()){
  assert(!('integrationState' in row),'Discovery radar must not masquerade as execution registry.');
  assert(row.status,'Every radar item must have a discovery status.');
}
console.log('ibis capability radar audit: discovered creative/specialist capacity remains non-executable until explicit integration and license review.');
