import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.FTN_CHROME_PATH||undefined});

async function isolateExternalAssets(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient:function(){return{auth:{getUser:async function(){return{data:{user:null},error:null}},getSession:async function(){return{data:{session:null},error:null}},onAuthStateChange:function(){}},from:function(){throw new Error("fixture database access not expected")},functions:{invoke:async function(){return{data:null,error:new Error("fixture")}}}}}};'}));
}

async function semanticGoto(page,url,readySelector){
  await page.goto(url,{waitUntil:'commit',timeout:15000});
  await page.locator(readySelector).waitFor({state:'visible',timeout:15000});
}

async function askHeadspace(page,text){
  await page.locator('#headspaceQuery').fill(text);
  await page.locator('#inputOrbit button[type="submit"]').click();
  await page.waitForTimeout(950);
}

const head=await browser.newPage({viewport:{width:1440,height:1000}});
await isolateExternalAssets(head);
await head.route('**/functions/v1/ibis-text-cloudflare*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'GENERAL_ROUTE_MARKER: The Caribbean contains sovereign states and dependent territories.','provider':'behavioral-fixture'})}));
await head.route('https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/actions/runs?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_count:1,workflow_runs:[{name:'FTN Scout 2.0',event:'schedule',status:'completed',conclusion:'success',run_number:18,run_started_at:'2026-09-09T14:41:22Z'}]})}));
await head.route('**/functions/v1/ftn-opportunities*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-09-08T12:00:00Z',warnings:[],items:[]})}));
await semanticGoto(head,base+'/ibis-headspace-preview/','#headspaceQuery');
await head.waitForTimeout(450);
assert.match(await head.locator('[data-thought="answer"] h2').innerText(),/What do you need/i,'Headspace must open neutral.');
assert.equal(await head.locator('[data-thought="graph"]').evaluate(el=>el.classList.contains('dematerialized')),true,'Placeholder demand signal must stay hidden.');
assert.doesNotMatch(await head.locator('body').innerText(),/Sample signal\s*[—-]/i,'Investor surface must not expose sample demand data.');
await head.waitForFunction(()=>{const n=document.querySelector('#toolStatus');return n&&!/Checking governed/.test(n.textContent||'');},{timeout:8000}).catch(()=>{});
assert.doesNotMatch(await head.locator('#toolStatus').innerText(),/runtime catalog is unavailable/i,'Tool health must not fail because an unrelated runtime module did not boot.');

await askHeadspace(head,'What is the latest USD selling rate?');
assert.match(await head.locator('[data-thought="answer"]').innerText(),/USD|TTD|selling|rate/i,'Statistics must own statistics intent.');
await askHeadspace(head,'show live population');
assert.match(await head.locator('[data-thought="answer"]').innerText(),/population/i,'Population handler must own population intent.');
await askHeadspace(head,'How much capital do I need to live on TT$35,000 a month at 5%?');
const capitalText=await head.locator('[data-thought="answer"]').innerText();
assert.match(capitalText,/8,400,000|8\.4/i,'Capital Intelligence must calculate TT$8.4M.');
assert.doesNotMatch(capitalText,/Population is moving/i,'New requests must replace stale answer state.');
await askHeadspace(head,'list the Caribbean islands');
const generalText=await head.locator('[data-thought="answer"]').innerText();
assert.match(generalText,/GENERAL_ROUTE_MARKER/,'General knowledge must reach general intelligence.');
assert.doesNotMatch(generalText,/Real Objective|User Value|Ecosystem Value|Economic Value/i,'Internal FTN decision scaffolding must not leak.');

const free=head.locator('[data-arrange="freeform"]');
await free.waitFor({state:'visible'});
await free.click();
assert.equal(await head.locator('#field').getAttribute('data-layout'),'freeform','Freeform must genuinely unsnap Headspace.');
const answerCard=head.locator('[data-thought="answer"]');
const bar=answerCard.locator('.thought-bar');
const before=await answerCard.boundingBox();
const drag=await bar.boundingBox();
assert(before&&drag,'Answer card must be draggable.');
await head.mouse.move(drag.x+30,drag.y+15);await head.mouse.down();await head.mouse.move(drag.x+180,drag.y+120,{steps:8});await head.mouse.up();await head.waitForTimeout(150);
const after=await answerCard.boundingBox();
assert(after&&Math.abs(after.x-before.x)>20,'Freeform card must remain where dragged.');
await head.locator('[data-arrange="grid"]').click();
assert.equal(await head.locator('#field').getAttribute('data-layout'),'grid','Snap Grid must restore grid mode.');
await head.screenshot({path:'test-artifacts/ibis-behavioral-headspace.png',fullPage:true});

const main=await browser.newPage({viewport:{width:1440,height:1000}});
await isolateExternalAssets(main);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=';
await main.route('**/functions/v1/ibis-image-cloudflare*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({image:png,mimeType:'image/png',extension:'png',provider:'Cloudflare Workers AI',model:'fixture-image'})}));
await main.route('**/functions/v1/ftn-news-sources*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({localItems:[{title:'Trinidad fixture headline',publisher:'Fixture Trinidad Publisher',url:'https://example.test/trinidad-story',publishedAt:'2026-09-11T10:00:00Z',classification:'Publisher headline'}],items:[]})}));
await semanticGoto(main,base+'/ibis-ai/','#ibis-goal');
async function submitMain(text){await main.locator('#ibis-goal').fill(text);await main.locator('#ibis-form button[type="submit"]').click();await main.waitForTimeout(650);}
await submitMain('generate an image of a red scarlet ibis flying across the Caribbean');
let bubble=main.locator('.ibis-msg__bubble--ibis').last();
assert.match(await bubble.innerText(),/REAL IMAGE GENERATION/i,'Image intent must use the true image contract.');
assert.equal(await bubble.locator('img').count(),1,'Image generation must return a real image artifact.');
await submitMain('what is in the Trinidad news today?');
bubble=main.locator('.ibis-msg__bubble--ibis').last();
const newsText=await bubble.innerText();
assert.match(newsText,/Fixture Trinidad Publisher|Trinidad fixture headline/i,'Local news must use configured Trinidad publisher sources.');
assert.doesNotMatch(newsText,/GitHub|Hacker News|IPTV/i,'Local news must reject irrelevant generic sources.');
await submitMain('tell me about Keyon Byron');
bubble=main.locator('.ibis-msg__bubble--ibis').last();
const personText=await bubble.innerText();
assert.match(personText,/not enough verified|could not verify|will not guess/i,'Unverified person lookup must fail closed.');
assert.doesNotMatch(personText,/musician|composer|producer/i,'Person lookup must not invent biography.');
assert.equal(await main.locator('[data-ibis-headspace-entry] a[href="/ibis-headspace-preview/"]').count(),1,'Workspace must expose valid Headspace navigation.');
await main.screenshot({path:'test-artifacts/ibis-behavioral-workspace.png',fullPage:true});

const widget=await browser.newPage({viewport:{width:1440,height:900}});
await isolateExternalAssets(widget);
await semanticGoto(widget,base+'/#ecosystem','#ibis-widget-trigger');
await widget.locator('#ibis-widget-trigger').click();
async function askWidget(text){await widget.locator('#ibis-widget-input').fill(text);await widget.locator('#ibis-widget-form button[type="submit"]').click();await widget.waitForTimeout(300);}
await askWidget('give me the ibis link');
let widgetText=await widget.locator('#ibis-widget-messages').innerText();
assert.doesNotMatch(widgetText,/ftn\.to/i,'Widget must never invent ftn.to.');
let link=widget.locator('#ibis-widget-messages a[href]').last();
assert.equal(await link.getAttribute('href'),base+'/ibis-ai/','IBIS link must resolve against current origin.');
await askWidget('full url');
widgetText=await widget.locator('#ibis-widget-messages').innerText();
assert.doesNotMatch(widgetText,/ftn\.to/i,'Full URL follow-up must remain authoritative.');
link=widget.locator('#ibis-widget-messages a[href]').last();
assert.equal(await link.getAttribute('href'),base+'/ibis-ai/','Full URL must remain current-origin IBIS route.');

await browser.close();
console.log('IBIS behavioral UX acceptance passed.');
