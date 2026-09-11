import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
for(const p of [
  'supabase/functions/_shared/ibis-cebos.ts',
  'supabase/functions/_shared/ibis-opportunity-scanner.ts',
  'supabase/functions/_shared/ibis-intelligence-gateway.ts',
  'supabase/functions/ibis-web-research/index.ts',
  'supabase/functions/ibis-assistant/index.ts',
  'js/ftn-source-provenance.js',
  'js/ibis-provenance.js',
  'js/ibis-cebos-evidence.js',
  'js/ibis-web-research-workspace.js',
  'js/ibis-task-partner-workspace.js',
  'js/ibis-provider-registry.js',
]) assert(fs.existsSync(p),`Missing CEBOS architecture component: ${p}`);

const core=read('supabase/functions/_shared/ibis-cebos.ts');
for(const token of ['CebosReasoningState','CebosEvidence','CebosExpectedTrace','CebosOpportunitySignal','eventTime','recordTime','actorAccessTime','discoveryUtility','decisionAuthority','CONTRADICTED','UNRESOLVED','ABSENT_AFTER_SEARCH','chooseNextBottleneck','researchSourcePlan','providerReasoningDirective']) assert(core.includes(token),`CEBOS core missing ${token}`);
assert.match(core,/PRIMARY_EVIDENCE[^\n]*100|PRIMARY_EVIDENCE:\s*100/,'Primary evidence must carry highest decision authority');
assert.match(core,/CREATOR_SOCIAL[^\n]*85|CREATOR_SOCIAL:\s*85/,'Caribbean discovery logic must allow social traces to have high discovery utility without making them decision authority');

const gateway=read('supabase/functions/_shared/ibis-intelligence-gateway.ts');
assert.match(gateway,/createReasoningState/,'Gateway must instantiate CEBOS state, not just mention CEBOS in a prompt');
assert.match(gateway,/evidence\?:\s*CebosEvidence\[\]/,'Gateway must accept structured evidence objects');
assert.match(gateway,/locationContext\?:/,'Gateway must accept contextual geography');
assert.match(gateway,/NO_VERIFIED_PERSON_EVIDENCE/,'Person lookup must remain evidence-gated');
assert.doesNotMatch(gateway,/Founder Reasoning Model for every response/i,'The old public framework-every-response policy must never return');

const assistant=read('supabase/functions/ibis-assistant/index.ts');
assert.match(assistant,/providerReasoningDirective/,'Assistant must derive provider instructions from CEBOS state');
assert.match(assistant,/sanitizedEvidence/,'Assistant must validate incoming evidence before synthesis');
assert.match(assistant,/locationContext/,'Assistant must carry location context without treating it as a universal filter');

const research=read('supabase/functions/ibis-web-research/index.ts');
assert.match(research,/tools:\s*\[\{\s*googleSearch:\s*\{\}/,'Universal research must use a real broad-web search tool rather than model memory');
assert.match(research,/sourceClassFor/,'Research results must be classified before synthesis');
assert.match(research,/sourceScores/,'Research must distinguish discovery utility from decision authority');
assert.match(research,/scanOpportunitySignals/,'Research must run the low-priority economic-shadow scanner');
assert.match(research,/state\.evidence\.length/,'Universal research must fail closed when grounding evidence is absent');

const source=read('js/ftn-source-provenance.js');
const adapter=read('js/ibis-cebos-evidence.js');
assert.match(adapter,/FTN\.SourceProvenance\.sourceRecord/,'CEBOS evidence must extend the existing provenance system, not duplicate it');
assert.match(adapter,/promoteClaim/,'Evidence promotion must be explicit');
assert.match(adapter,/Material contradiction remains/,'Contradictions must prevent silent claim promotion');
assert.match(source,/claimConfidence/,'Existing source corroboration logic must remain available');

const web=read('js/ibis-web-research-workspace.js');
assert.match(web,/ibis-web-research/,'Evidence-dependent ASK requests must have a universal research route');
assert.match(web,/No factual answer was substituted from model memory/,'Universal research must fail closed rather than hallucinate');
assert.match(web,/ibis-task-partner-workspace/,'Research workspace must expose the task partner exchange without duplicating providers');

const partners=read('js/ibis-task-partner-workspace.js');
assert.match(partners,/FTN\.IbisProviders/,'Task partner exchange must reuse the canonical provider registry');
assert.match(partners,/byCapability/,'Task ranking must start from required capability');
assert.match(partners,/costToIbis/,'Task ranking must account for cost posture');
assert.match(partners,/p\.enabled/,'Task output must distinguish IBIS-executable providers from link-only handoffs');
assert.doesNotMatch(partners,/var\s+providers\s*=\s*\[/,'Task partner exchange must not create a second provider registry');

const opp=read('supabase/functions/_shared/ibis-opportunity-scanner.ts');
assert.match(opp,/recordOpportunity/,'Economic-shadow scanning must write structured opportunity signals');
assert.match(opp,/controllable:\s*true/,'Opportunity signals must be tied to a controllable mechanism');

console.log('CEBOS architecture gate passed: state, evidence, provenance, research, opportunity scanning and task partner orchestration are structural and reuse canonical FTN systems.');
