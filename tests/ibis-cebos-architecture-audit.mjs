import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
for(const p of [
  'supabase/functions/_shared/ibis-cebos.ts',
  'supabase/functions/_shared/ibis-opportunity-scanner.ts',
  'supabase/functions/_shared/ibis-intelligence-gateway.ts',
  'supabase/functions/ibis-web-research/index.ts',
  'supabase/functions/ibis-assistant/index.ts',
  'functions/api/ibis-web-search.js',
  'js/ftn-source-provenance.js',
  'js/ibis-provenance.js',
  'js/ibis-cebos-evidence.js',
  'js/ibis-web-research-workspace.js',
  'js/ibis-task-partner-workspace.js',
  'js/ibis-provider-registry.js',
  'tests/ibis-caribbean-query-battery.json',
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
assert.match(research,/google_search\s*:\s*\{\}/,'Universal research must attempt a real Google-grounded search tool rather than model memory');
assert.match(research,/bingSearch/,'Universal research must have an independent search fallback');
assert.match(research,/searxSearch/,'Universal research must support open metasearch retrieval');
assert.match(research,/ddgSearch/,'Universal research must support a second independent public-search fallback');
assert.match(research,/sourceClassFor/,'Research results must be classified before synthesis');
assert.match(research,/sourceScores/,'Research must distinguish discovery utility from decision authority');
assert.match(research,/scanOpportunitySignals/,'Research must run the low-priority economic-shadow scanner');
assert.match(research,/Web research completed without enough relevant evidence/,'Universal research must fail closed when grounding evidence is absent');
assert.doesNotMatch(research,/GEMINI_MODEL/,'Web research must not inherit an unrelated generic Gemini model setting');

const edgeSearch=read('functions/api/ibis-web-search.js');
assert.match(edgeSearch,/onRequestGet/,'Cloudflare Pages must expose an owned same-origin retrieval gateway');
for(const engine of ['bing(q)','searx(q)','ddg(q)']) assert(edgeSearch.includes(engine),`Owned retrieval gateway must still query ${engine} rather than collapse to one fragile scraper`);
assert.match(edgeSearch,/Promise\.all\(\[/,'Owned retrieval gateway must execute independent retrieval sources concurrently');
assert.match(edgeSearch,/verifiedFtnFacts/,'Owned retrieval should be allowed to inject directly relevant verified FTN datasets ahead of general search noise');
assert.match(edgeSearch,/\bresults\b/,'Owned gateway must expose normalized results');
assert.match(edgeSearch,/\bengines\b/,'Owned gateway must expose retrieval-engine health evidence');

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

const battery=JSON.parse(read('tests/ibis-caribbean-query-battery.json'));
assert.equal(battery.length,30,'Investor-readiness battery must contain exactly 30 representative Caribbean queries');
assert.equal(new Set(battery.map(x=>x.id)).size,30,'Battery IDs must be unique');
for(const cls of ['INFORMATION','TASK','DECISION','CREATIVE']) assert(battery.some(x=>x.requestClass===cls),`Battery missing ${cls} requests`);
for(const category of ['person_lookup','national_news','local_news','weather_hazard','fx_rate','small_business_advice','decision_support','funding_discovery','government_procedure','provider_ranking','job_discovery','travel_planning','place_recommendation','events','education','law_regulation','public_service','purchase_decision','shopping','local_recommendation','image_generation','video_generation','speech','language_context','music_discovery','tool_selection','navigation','rumor_verification']) assert(battery.some(x=>x.category===category),`Battery missing coverage category ${category}`);
assert(battery.filter(x=>x.requiresLiveEvidence).length>=18,'Battery must materially stress live research rather than mostly static model knowledge');
assert(battery.some(x=>x.forbidden?.includes('ftn.to')),'Battery must permanently regress the fabricated FTN-domain failure');
assert(battery.some(x=>x.forbidden?.includes('GitHub')),'Battery must permanently regress irrelevant GitHub-as-local-news behavior');
assert(battery.some(x=>x.artifactContract?.includes('Actual image artifact')),'Battery must enforce semantic image success rather than poster substitution');

console.log('CEBOS architecture gate passed: structural reasoning/evidence, resilient research, provenance, opportunity scanning, task orchestration and the 30-query Caribbean battery are release-enforced.');
