import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const inputArg=process.argv.find((x)=>x.startsWith('--input='))?.slice(8)||'data/scout-2-current.json';
const outArg=process.argv.find((x)=>x.startsWith('--out='))?.slice(6)||'reports/FTN_Scout_2_Latest.md';
const jsonArg=process.argv.find((x)=>x.startsWith('--json='))?.slice(7)||outArg.replace(/\.md$/i,'.json');
const selfTest=process.argv.includes('--self-test');

const WEIGHTS={userValue:1,ecosystemValue:1.2,ownership:1.1,dataValue:1.1,economicValue:1.2,executionCost:1,futureOptionality:1,urgency:1.2,competitionGap:1.2};
const MAX=Object.values(WEIGHTS).reduce((a,b)=>a+b,0)*5;
const REQUIRED_TYPES=new Set(['MONEY','COMPETITOR','AWARD','ACCELERATOR','PROCUREMENT','PARTNER','PROBLEM','PRODUCT','DATA','CAPABILITY','ARCHITECTURE']);

function score(signals={}){
  let total=0;
  for(const [key,w] of Object.entries(WEIGHTS)){
    let v=Number(signals[key]);
    if(!Number.isFinite(v)||v<1||v>5)throw new Error(`Invalid ${key} score: ${signals[key]}`);
    if(key==='executionCost')v=6-v; // lower cost = stronger recommendation
    total+=v*w;
  }
  return Math.round((total/MAX)*100);
}
function priority(f){
  const s=f.score;
  if(f.directive==='STRATEGIC_COLLISION'||f.status==='OPEN_URGENT')return 'P0';
  if(s>=82)return 'P0';
  if(s>=70)return 'P1';
  if(s>=58)return 'P2';
  return 'WATCH';
}
function validate(data){
  if(data.schemaVersion!==2)throw new Error('Scout 2.0 requires schemaVersion 2');
  if(!Array.isArray(data.findings)||!data.findings.length)throw new Error('Scout 2.0 has no findings');
  const ids=new Set();
  for(const f of data.findings){
    for(const k of ['id','type','status','title','sourceUrl','verifiedAt','directive','whyFtn'])if(!f[k])throw new Error(`${f.id||'finding'} missing ${k}`);
    if(ids.has(f.id))throw new Error(`Duplicate finding id ${f.id}`);ids.add(f.id);
    if(!REQUIRED_TYPES.has(f.type))throw new Error(`Unknown finding type ${f.type}`);
    if(!/^https:\/\//.test(f.sourceUrl))throw new Error(`${f.id} source must be HTTPS`);
    if(!Array.isArray(f.ftnProducts)||!f.ftnProducts.length)throw new Error(`${f.id} has no FTN product match`);
    score(f.signals);
  }
}
function enrich(data){
  return data.findings.map(f=>({...f,score:score(f.signals)})).map(f=>({...f,priority:priority(f)})).sort((a,b)=>{
    const p={P0:0,P1:1,P2:2,WATCH:3};
    return p[a.priority]-p[b.priority]||b.score-a.score||a.title.localeCompare(b.title);
  });
}
function esc(s){return String(s??'').replaceAll('|','\\|').replaceAll('\n',' ')}
function markdown(data,items){
  const p0=items.filter(x=>x.priority==='P0');
  const collisions=items.filter(x=>x.directive==='STRATEGIC_COLLISION');
  const money=items.filter(x=>['MONEY','PROCUREMENT','ACCELERATOR','AWARD'].includes(x.type));
  const conflicts=items.filter(x=>x.deadlineConflict);
  const lines=[
    '# FTN Scout 2.0 — Opportunity & Competitive Intelligence',
    '',`Run date: ${data.runDate}`,`Verified findings: ${items.length}`,'',
    '> Scout 2.0 researches, scores and recommends. It does not create products, submit applications, accept contracts, spend money or modify production without the founder/Nexus gate.','',
    '## Executive signal','',
    `- P0 findings: **${p0.length}**`,
    `- Strategic collisions: **${collisions.length}**`,
    `- Funding/procurement/accelerator/award findings: **${money.length}**`,
    `- Source/deadline conflicts requiring verification: **${conflicts.length}**`,'',
  ];
  if(p0.length){lines.push('## P0 — act/review now','');for(const f of p0)lines.push(`### ${f.title} — ${f.score}/100`,`${f.type} · ${f.status} · **${f.directive}**`,``,f.summary||'',``,`**Why FTN:** ${f.whyFtn}`,f.amount?`\n**Value:** ${f.amount}`:'',f.deadline?`\n**Deadline:** ${f.deadline}`:'',f.deadlineConflict?`\n**VERIFY DEADLINE:** ${f.deadlineConflict}`:'',`\nSource: ${f.sourceUrl}`,'');}
  lines.push('## Full decision matrix','', '| Priority | Score | Type | Finding | FTN match | Directive | Status |','|---|---:|---|---|---|---|---|');
  for(const f of items)lines.push(`| ${f.priority} | ${f.score} | ${esc(f.type)} | ${esc(f.title)} | ${esc(f.ftnProducts.join(', '))} | ${esc(f.directive)} | ${esc(f.status)} |`);
  lines.push('','## Nexus rules enforced','', '- Caribbean/T&T competitors are mandatory reconnaissance before consequential builds.','- Funding, awards, accelerators, procurement and partner routes are product-planning inputs, not post-build searches.','- Direct collisions must be surfaced before BUILD recommendations.','- Existing FTN infrastructure must be reused/extended before creating another product.','- Closed opportunities remain recurrence signals but are never represented as open.','- Conflicting dates/statuses are escalated for verification rather than guessed.','- No automatic paid/token-consuming recurring search.','- Founder approval remains mandatory for applications, spending, partnerships and product creation.','');
  return lines.filter(x=>x!==undefined).join('\n');
}

if(selfTest){
  const sample={schemaVersion:2,findings:[{id:'x',type:'MONEY',status:'OPEN',title:'x',sourceUrl:'https://example.com',verifiedAt:'2026-08-27',directive:'PREPARE_NOW',whyFtn:'reuse',ftnProducts:['screen'],signals:{userValue:5,ecosystemValue:5,ownership:5,dataValue:5,economicValue:5,executionCost:1,futureOptionality:5,urgency:5,competitionGap:5}}]};
  validate(sample);const e=enrich(sample);if(e[0].score!==100||e[0].priority!=='P0')throw new Error('Scout 2.0 scoring self-test failed');console.log('Scout 2.0 self-test passed.');process.exit(0);
}

const data=JSON.parse(await fs.readFile(path.resolve(ROOT,inputArg),'utf8'));
validate(data);
const items=enrich(data);
const result={schemaVersion:2,runDate:data.runDate,generatedAt:new Date().toISOString(),method:data.method,guardrails:{automaticProductCreation:false,automaticApplicationSubmission:false,automaticSpend:false,founderApprovalRequired:true},findings:items};
await fs.mkdir(path.dirname(path.resolve(ROOT,outArg)),{recursive:true});
await fs.writeFile(path.resolve(ROOT,outArg),markdown(data,items));
await fs.writeFile(path.resolve(ROOT,jsonArg),JSON.stringify(result,null,2)+'\n');
console.log(`Scout 2.0 complete: ${items.length} findings; ${items.filter(x=>x.priority==='P0').length} P0; ${items.filter(x=>x.directive==='STRATEGIC_COLLISION').length} collisions.`);
for(const f of items.slice(0,8))console.log(`${f.priority} ${f.score} ${f.type} ${f.directive}: ${f.title}`);
