import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.FTN_TEST_BASE||'http://127.0.0.1:4173';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.FTN_CHROME_PATH||undefined});
const context=await browser.newContext({serviceWorkers:'block'});

async function isolate(page){
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient:function(){return{auth:{getUser:async function(){return{data:{user:null},error:null}},getSession:async function(){return{data:{session:null},error:null}},onAuthStateChange:function(){}},from:function(){throw new Error("fixture database access not expected")},functions:{invoke:async function(){return{data:null,error:new Error("fixture")}}}}}};'}));
}
async function mountHeadspace(page){
  let html=fs.readFileSync('ibis-headspace-preview/index.html','utf8');
  const scripts=[...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
  html=html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g,'');
  html=html.replace('<head>','<head><base href="'+base+'/">');
  await page.setContent(html,{waitUntil:'domcontentloaded',timeout:10000});
  for(const src of scripts)await page.addScriptTag({url:new URL(src,base+'/').href});
  await page.locator('#headspaceQuery').waitFor({state:'attached',timeout:10000});
}

const landing=await context.newPage();
await isolate(landing);
const landingResponse=await landing.goto(base+'/ibis-preview/index.html',{waitUntil:'domcontentloaded',timeout:15000});
assert(landingResponse&&landingResponse.ok());
await landing.locator('#askInput').waitFor({state:'visible'});
assert.match(await landing.locator('.hero h1').innerText(),/Give ibis a problem, opportunity, product, song, document or goal/i);
await landing.screenshot({path:'test-artifacts/ibis-headspace-lander.png',fullPage:false});
await landing.close();

const page=await context.newPage();
await isolate(page);
await page.route('https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/actions/runs?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_count:1,workflow_runs:[{name:'FTN Scout 2.0',event:'schedule',status:'completed',conclusion:'success',run_number:18,run_started_at:'2026-09-09T14:41:22Z'}]})}));
await page.route('**/functions/v1/ftn-opportunities*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-09-08T12:00:00Z',warnings:[],items:[{id:'fixture-caribbean-ai-grant',title:'Caribbean AI Grant',organization:'Fixture Official Institution',country:'Trinidad and Tobago / Caribbean',type:'Grant / Funding',deadline:'2026-10-05',fee:0,payoutCompatible:true,ownershipImpact:'non-dilutive, no equity',strategicValue:5,probability:.75,amount:'USD 100,000',eligibility:'Trinidad and Tobago registered entities may apply.',summary:'Source-backed browser fixture for the connected funding funnel.',sourceUrl:'https://example.test/caribbean-ai-grant',lastVerified:'2026-09-08T12:00:00Z'}]})}));
const consoleErrors=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});page.on('pageerror',e=>consoleErrors.push(e.message));
await mountHeadspace(page);await page.waitForTimeout(500);
assert.equal(await page.locator('.thought').count()>=10,true);assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/What do you need/i);assert.equal(await page.locator('[data-thought="graph"]').evaluate(el=>el.classList.contains('dematerialized')),true);
await page.waitForFunction(()=>/Scout 2\.0: 9 official discovery sources configured/.test(document.querySelector('#scoutStatus')?.textContent||''),{timeout:10000});assert.match(await page.locator('#scoutStatus').innerText(),/latest observed run #18 success/i);assert.match(await page.locator('#scoutStatus').innerText(),/automatic applications off.*automatic spend off.*founder approval required/i);assert.equal(await page.locator('#scoutStatus').getAttribute('data-health'),'healthy');
await page.waitForFunction(()=>{const n=document.querySelector('#toolStatus');return n&&!/Checking governed/.test(n.textContent||'');},{timeout:8000}).catch(()=>{});assert.doesNotMatch(await page.locator('#toolStatus').innerText(),/runtime catalog is unavailable/i);

async function ask(text){await page.locator('#headspaceQuery').fill(text);await page.locator('#inputOrbit button[type="submit"]').click();await page.waitForTimeout(900);}
await ask('What is the latest USD selling rate?');assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('headspace-engaged')),true);assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/USD|TTD|selling|rate/i);assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--snapshot').count(),1);
await ask('show live population');assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--live-model').count(),1);assert.match(await page.locator('[data-thought="answer"] p').innerText(),/not live official measurement/i);
await ask('How much capital do I need to live on TT$35,000 a month at 5%?');assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/8,400,000|8\.4/i);assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--scenario').count(),1);assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--live-model').count(),0);
await ask('Find the strongest funding opportunity for FTN');assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/Caribbean AI Grant/);assert.match(await page.locator('[data-thought="cognition"] .thought-bar>span').innerText(),/VERIFIED/);
await ask('Apply for the strongest funding opportunity and submit it');assert.match(await page.locator('#commandHint').innerText(),/paused at the Permission Ledger/i);
await ask('what is connected to FTN Opportunities');assert.equal(await page.locator('.ibis-context-constellation').count(),1);assert.equal(await page.locator('[data-thought="answer"]').evaluate(el=>el.classList.contains('dematerialized')),true);

const active=page.locator('[data-thought="context"]');await active.scrollIntoViewIfNeeded();const before=await active.boundingBox();if(before){const sx=before.x+before.width/2,sy=before.y+Math.min(before.height/2,100);await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+150,sy+120,{steps:8});await page.mouse.up();await page.waitForTimeout(150);const after=await active.boundingBox();assert(after&&(Math.abs(after.x-before.x)>10||Math.abs(after.y-before.y)>10));assert.equal(await page.locator('#field').getAttribute('data-layout'),'freeform');}
await page.screenshot({path:'test-artifacts/ibis-headspace-desktop.png',fullPage:true});

const mobile=await context.newPage();await isolate(mobile);await mobile.setViewportSize({width:390,height:844});await mountHeadspace(mobile);const rail=mobile.locator('.rail');if(await rail.count())assert.equal(await rail.evaluate(el=>getComputedStyle(el).display),'none');const bw=await mobile.evaluate(()=>document.body.scrollWidth),vw=await mobile.evaluate(()=>window.innerWidth);assert(bw<=vw+2);await mobile.locator('#headspaceQuery').fill('What is the latest USD selling rate?');await mobile.locator('#inputOrbit button[type="submit"]').click();await mobile.waitForTimeout(900);assert.equal(await mobile.locator('.thought:not(.dematerialized)').count()<=3,true);await mobile.screenshot({path:'test-artifacts/ibis-headspace-mobile.png',fullPage:true});

assert.equal(consoleErrors.length,0,'Headspace should not emit browser console/page errors: '+consoleErrors.join(' | '));await context.close();await browser.close();console.log('ibis Headspace browser audit passed.');
