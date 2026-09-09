import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const registry=JSON.parse(fs.readFileSync('data/ibis-capability-registry.json','utf8'));
const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Promise});
ctx.globalThis=ctx;ctx.window=ctx;ctx.FTN={PermissionLedger:{check:async()=>({decision:'ASK',reason:'TEST'})}};
vm.runInContext(fs.readFileSync('js/ibis-tool-catalog.js','utf8'),ctx,{filename:'js/ibis-tool-catalog.js'});

const catalog=ctx.FTN.IbisToolCatalog;
catalog.setRegistry(registry);
assert.equal(catalog.status().total,registry.tools.length);
assert(registry.tools.length >= 70, 'The governed registry must cover the full named capability set, not the earlier 37-tool seed.');
assert(registry.policy.lifecycle.includes('DISCOVERY')&&registry.policy.lifecycle.includes('ENABLED')&&registry.policy.lifecycle.includes('LIVE'));
assert.equal(catalog.get('model-context-protocol-registry').status,'CANDIDATE');
const requiredFields=['purpose','category','sourceUrl','license','exactModelTerms','taskTypes','inputTypes','outputTypes','runtime','status','privacyClass','permissionClass','cost','healthCheck','fallbackRole','provenanceRequirements','caribbeanRelevance','ownershipConcerns','rollbackMethod','relevantTest'];
for(const tool of registry.tools) for(const field of requiredFields) assert.ok(Object.hasOwn(tool,field),`${tool.id} missing ${field}`);
for(const name of ['OpenAI / ChatGPT','Anthropic / Claude','Google Gemini','Perplexity','APIQIK','Bytez','Venice AI','OpenF5-TTS','Fish Speech','Piper','VidRender','PixVerse','Kling AI','ElevenLabs','Suno','Youka','SearXNG','Playwright','n8n','Tesseract OCR','OCRmyPDF','Apache Tika','ComfyUI','Essentia','MicroFish','NanoChat','Impeccable','Heretic','GraphRAG','WAM','Supabase','Cloudflare Pages']) assert.ok(registry.tools.some((tool)=>tool.name===name),`Missing named capability: ${name}`);

catalog.registerAdapter('github-search-api',{health:async()=>({ready:true}),invoke:async(operation)=>({operation,items:[]})});
let ready=await catalog.eligible({query:'github',automaticOnly:true});
assert.equal(ready.length,1,'Only an enabled, healthy, matching adapter should be eligible.');
let result=await catalog.invoke('github-search-api','search',{q:'mcp'},{});
assert.equal(result.success,true,'Read-only enabled tools may execute without an additional approval.');

const blocked=JSON.parse(JSON.stringify(registry));
blocked.tools.find(tool=>tool.id==='activepieces').status='ENABLED';
catalog.setRegistry(blocked);
catalog.registerAdapter('activepieces',{invoke:async()=>({changed:true})});
result=await catalog.invoke('activepieces','send_message',{text:'test'},{});
assert.equal(result.success,false);
assert.equal(result.errorType,'TOOL_PERMISSION_REQUIRED','Consequential tools must stop at the Permission Ledger.');

const byStatus=registry.tools.reduce((acc,tool)=>{acc[tool.status]=(acc[tool.status]||0)+1;return acc;},{});
const byCategory=registry.tools.reduce((acc,tool)=>{acc[tool.category]=(acc[tool.category]||0)+1;return acc;},{});
console.log('ibis governed tool inventory:',JSON.stringify({total:registry.tools.length,byStatus,byCategory}));
console.log('ibis tool catalog audit: discovery, enablement, health and permission boundaries verified.');
