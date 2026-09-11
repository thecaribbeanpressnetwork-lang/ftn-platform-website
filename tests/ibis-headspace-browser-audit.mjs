import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.FTN_TEST_BASE||'http://127.0.0.1:4173';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.FTN_CHROME_PATH||undefined});

async function isolateExternalAssets(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient:function(){return{auth:{getUser:async function(){return{data:{user:null},error:null}},getSession:async function(){return{data:{session:null},error:null}},onAuthStateChange:function(){}},from:function(){throw new Error("fixture database access not expected")},functions:{invoke:async function(){return{data:null,error:new Error("fixture")}}}}}};'}));
}
async function semanticGoto(page,url,selector){await page.goto(url,{waitUntil:'commit',timeout:15000});await page.locator(selector).waitFor({state:'visible',timeout:15000});}

const landing=await browser.newPage({viewport:{width:1440,height:1000}});
await isolateExternalAssets(landing);
await semanticGoto(landing,base+'/ibis-preview/','#askInput');
assert.match(await landing.locator('.hero h1').innerText(),/Give ibis a problem, opportunity, product, song, document or goal/i,'Investor invitation headline must exist');
await landing.screenshot({path:'test-artifacts/ibis-headspace-lander.png',fullPage:false});
await landing.locator('#askInput').fill('What is the latest USD selling rate?');
await landing.locator('#askForm button[type="submit"]').click();
await landing.waitForURL(/\/ibis-headspace-preview\/\?q=/,{waitUntil:'commit',timeout:15000});
assert.match(landing.url(),/ibis-headspace-preview/,'Landing intent should enter Headspace');
await landing.close();

const page=await browser.newPage({viewport:{width:1440,height:1000}});
await isolateExternalAssets(page);
await page.route('https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/actions/runs?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_count:1,workflow_runs:[{name:'FTN Scout 2.0',event:'schedule',status:'completed',conclusion:'success',run_number:18,run_started_at:'2026-09-09T14:41:22Z'}]})}));
await page.route('**/functions/v1/ftn-opportunities*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-09-08T12:00:00Z',warnings:[],items:[{id:'fixture-caribbean-ai-grant',title:'Caribbean AI Grant',organization:'Fixture Official Institution',country:'Trinidad and Tobago / Caribbean',type:'Grant / Funding',deadline:'2026-10-05',fee:0,payoutCompatible:true,ownershipImpact:'non-dilutive, no equity',strategicValue:5,probability:.75,amount:'USD 100,000',eligibility:'Trinidad and Tobago registered entities may apply.',summary:'Source-backed browser fixture for the connected funding funnel.',sourceUrl:'https://example.test/caribbean-ai-grant',lastVerified:'2026-09-08T12:00:00Z'}]})}));
const consoleErrors=[];page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});page.on('pageerror',err=>consoleErrors.push(err.message));
await semanticGoto(page,base+'/ibis-headspace-preview/','#headspaceQuery');
assert.equal(await page.locator('.thought').count()>=10,true,'Headspace thought surfaces must exist');
assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/What do you need/i,'Investor Headspace should open neutral.');
assert.equal(await page.locator('[data-thought="graph"]').evaluate(el=>el.classList.contains('dematerialized')),true,'Placeholder graph must stay hidden initially.');
await page.waitForFunction(()=>/Scout 2\.0: 9 official discovery sources configured/.test(document.querySelector('#scoutStatus')?.textContent||''),{timeout:10000});
assert.match(await page.locator('#scoutStatus').innerText(),/latest observed run #18 success/i,'Headspace must distinguish a completed scheduled Scout run from a currently running scout.');
assert.match(await page.locator('#scoutStatus').innerText(),/automatic applications off.*automatic spend off.*founder approval required/i,'Scout health must expose consequential-action boundaries.');
assert.equal(await page.locator('#scoutStatus').getAttribute('data-health'),'healthy','Latest successful scheduled run should be healthy, not running.');
await page.waitForFunction(()=>{const n=document.querySelector('#toolStatus');return n&&!/Checking governed/.test(n.textContent||'');},{timeout:8000}).catch(()=>{});
assert.doesNotMatch(await page.locator('#toolStatus').innerText(),/runtime catalog is unavailable/i,'Tool-health surface must verify its own dependencies.');

async function ask(text){await page.locator('#headspaceQuery').fill(text);await page.locator('#inputOrbit button[type="submit"]').click();await page.waitForTimeout(900);}
await ask('What is the latest USD selling rate?');
assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('headspace-engaged')),true,'Headspace should enter engaged attention mode');
assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/USD|TTD|selling|rate/i,'Verified statistics answer should materialize');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--snapshot').count(),1,'Central Bank series must be SNAPSHOT');
await ask('show live population');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--live-model').count(),1,'Modelled population must be LIVE MODEL');
assert.match(await page.locator('[data-thought="answer"] p').innerText(),/not live official measurement/i,'LIVE MODEL truth distinction must remain visible');
await ask('How much capital do I need to live on TT$35,000 a month at 5%?');
assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/8,400,000|8\.4/i,'Capital scenario should calculate TT$8.4M');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--scenario').count(),1,'Capital sensitivity must be SCENARIO');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--live-model').count(),0,'Graph reuse must clear stale LIVE MODEL state');
await ask('Find the strongest funding opportunity for FTN');
assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/Caribbean AI Grant/,'Connected funding source should reach the founder decision funnel');
assert.match(await page.locator('[data-thought="cognition"] .thought-bar>span').innerText(),/VERIFIED/,'Founder Cognitive Layer must be visible');
await ask('Apply for the strongest funding opportunity and submit it');
assert.match(await page.locator('#commandHint').innerText(),/paused at the Permission Ledger/i,'External submission must pause for permission');
await ask('what is connected to FTN Opportunities');
assert.equal(await page.locator('.ibis-context-constellation').count(),1,'Context Graph should materialize');
assert.equal(await page.locator('[data-thought="answer"]').evaluate(el=>el.classList.contains('dematerialized')),true,'Stale answer should dematerialize when Context Graph owns attention');

const active=page.locator('[data-thought="context"]');
await active.scrollIntoViewIfNeeded();const before=await active.boundingBox();if(before){const sx=before.x+before.width/2,sy=before.y+Math.min(before.height/2,100);await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+150,sy+120,{steps:8});await page.mouse.up();await page.waitForTimeout(150);const after=await active.boundingBox();assert(after&&(Math.abs(after.x-before.x)>10||Math.abs(after.y-before.y)>10),'Active thought should be draggable');assert.equal(await page.locator('#field').getAttribute('data-layout'),'freeform','Dragging a snapped card should unsnap Headspace');}
await page.screenshot({path:'test-artifacts/ibis-headspace-desktop.png',fullPage:true});

const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
await isolateExternalAssets(mobile);await semanticGoto(mobile,base+'/ibis-headspace-preview/','#headspaceQuery');
const rail=mobile.locator('.rail');if(await rail.count())assert.equal(await rail.evaluate(el=>getComputedStyle(el).display),'none','Desktop rail should collapse on mobile');
const bodyWidth=await mobile.evaluate(()=>document.body.scrollWidth),viewportWidth=await mobile.evaluate(()=>window.innerWidth);assert(bodyWidth<=viewportWidth+2,'Headspace mobile layout must not create horizontal overflow');
await mobile.locator('#headspaceQuery').fill('What is the latest USD selling rate?');await mobile.locator('#inputOrbit button[type="submit"]').click();await mobile.waitForTimeout(900);assert.equal(await mobile.locator('.thought:not(.dematerialized)').count()<=3,true,'Mobile attention mode should keep only necessary thoughts visible');
await mobile.screenshot({path:'test-artifacts/ibis-headspace-mobile.png',fullPage:true});

assert.equal(consoleErrors.length,0,'Headspace should not emit browser console/page errors: '+consoleErrors.join(' | '));
await browser.close();
console.log('ibis Headspace browser audit passed.');
