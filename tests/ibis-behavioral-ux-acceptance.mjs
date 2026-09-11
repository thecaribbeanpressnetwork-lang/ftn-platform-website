import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.FTN_CHROME_PATH||undefined});
const context=await browser.newContext({serviceWorkers:'block'});

async function isolate(page){
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient:function(){return{auth:{getUser:async function(){return{data:{user:null},error:null}},getSession:async function(){return{data:{session:null},error:null}},onAuthStateChange:function(){}},from:function(){throw new Error("fixture database access not expected")},functions:{invoke:async function(){return{data:null,error:new Error("fixture")}}}}}};'}));
}
async function open(page,path,selector){
  const response=await page.goto(base+path,{waitUntil:'commit',timeout:15000});
  assert(response&&response.ok(),`Expected ${path} to return 2xx, got ${response&&response.status()}`);
  await page.locator(selector).waitFor({state:'attached',timeout:15000});
}
async function askHead(page,text){await page.locator('#headspaceQuery').fill(text);await page.locator('#inputOrbit button[type="submit"]').click();await page.waitForTimeout(950);}

const head=await context.newPage();
await isolate(head);
await head.route('**/functions/v1/ibis-text-cloudflare*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'GENERAL_ROUTE_MARKER: The Caribbean contains sovereign states and dependent territories.','provider':'behavioral-fixture'})}));
await head.route('https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/actions/runs?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_count:1,workflow_runs:[{name:'FTN Scout 2.0',event:'schedule',status:'completed',conclusion:'success',run_number:18,run_started_at:'2026-09-09T14:41:22Z'}]})}));
await head.route('**/functions/v1/ftn-opportunities*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-09-08T12:00:00Z',warnings:[],items:[]})}));
await open(head,'/ibis-headspace-preview/index.html','#headspaceQuery');
await head.waitForTimeout(500);
assert.match(await head.locator('[data-thought="answer"] h2').innerText(),/What do you need/i,'Headspace must open neutral.');
assert.equal(await head.locator('[data-thought="graph"]').evaluate(el=>el.classList.contains('dematerialized')),true,'Sample graph must be hidden initially.');
assert.doesNotMatch(await head.locator('body').innerText(),/Sample signal\s*[—-]/i,'No sample demand data may appear investor-facing.');
await head.waitForFunction(()=>{const n=document.querySelector('#toolStatus');return n&&!/Checking governed/.test(n.textContent||'');},{timeout:8000}).catch(()=>{});
assert.doesNotMatch(await head.locator('#toolStatus').innerText(),/runtime catalog is unavailable/i,'Tool health must not falsely fail on unrelated runtime boot.');

await askHead(head,'What is the latest USD selling rate?');
assert.match(await head.locator('[data-thought="answer"]').innerText(),/USD|TTD|selling|rate/i);
await askHead(head,'show live population');
assert.match(await head.locator('[data-thought="answer"]').innerText(),/population/i);
await askHead(head,'How much capital do I need to live on TT$35,000 a month at 5%?');
const capital=await head.locator('[data-thought="answer"]').innerText();
assert.match(capital,/8,400,000|8\.4/i);
assert.doesNotMatch(capital,/Population is moving/i);
await askHead(head,'list the Caribbean islands');
const general=await head.locator('[data-thought="answer"]').innerText();
assert.match(general,/GENERAL_ROUTE_MARKER/);
assert.doesNotMatch(general,/Real Objective|User Value|Ecosystem Value|Economic Value/i);

const free=head.locator('[data-arrange="freeform"]');await free.waitFor({state:'visible'});await free.click();
assert.equal(await head.locator('#field').getAttribute('data-layout'),'freeform');
const card=head.locator('[data-thought="answer"]'),bar=card.locator('.thought-bar');
const before=await card.boundingBox(),drag=await bar.boundingBox();assert(before&&drag);
await head.mouse.move(drag.x+30,drag.y+15);await head.mouse.down();await head.mouse.move(drag.x+180,drag.y+120,{steps:8});await head.mouse.up();await head.waitForTimeout(150);
const after=await card.boundingBox();assert(after&&Math.abs(after.x-before.x)>20,'Dragged card must remain moved.');
await head.locator('[data-arrange="grid"]').click();assert.equal(await head.locator('#field').getAttribute('data-layout'),'grid');
await head.screenshot({path:'test-artifacts/ibis-behavioral-headspace.png',fullPage:true});

const main=await context.newPage();await isolate(main);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=';
await main.route('**/functions/v1/ibis-image-cloudflare*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({image:png,mimeType:'image/png',extension:'png',provider:'Cloudflare Workers AI',model:'fixture-image'})}));
await main.route('**/functions/v1/ftn-news-sources*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({localItems:[{title:'Trinidad fixture headline',publisher:'Fixture Trinidad Publisher',url:'https://example.test/trinidad-story',publishedAt:'2026-09-11T10:00:00Z',classification:'Publisher headline'}],items:[]})}));
await open(main,'/ibis-ai/index.html','#ibis-goal');
async function askMain(text){await main.locator('#ibis-goal').fill(text);await main.locator('#ibis-form button[type="submit"]').click();await main.waitForTimeout(700);return main.locator('.ibis-msg__bubble--ibis').last();}
let bubble=await askMain('generate an image of a red scarlet ibis flying across the Caribbean');assert.match(await bubble.innerText(),/REAL IMAGE GENERATION/i);assert.equal(await bubble.locator('img').count(),1);
bubble=await askMain('what is in the Trinidad news today?');const news=await bubble.innerText();assert.match(news,/Fixture Trinidad Publisher|Trinidad fixture headline/i);assert.doesNotMatch(news,/GitHub|Hacker News|IPTV/i);
bubble=await askMain('tell me about Keyon Byron');const person=await bubble.innerText();assert.match(person,/not enough verified|could not verify|will not guess/i);assert.doesNotMatch(person,/musician|composer|producer/i);
assert.equal(await main.locator('[data-ibis-headspace-entry] a[href="/ibis-headspace-preview/"]').count(),1);
await main.screenshot({path:'test-artifacts/ibis-behavioral-workspace.png',fullPage:true});

const widget=await context.newPage();await isolate(widget);await open(widget,'/index.html','#ibis-widget-trigger');await widget.locator('#ibis-widget-trigger').click();
async function askWidget(text){await widget.locator('#ibis-widget-input').fill(text);await widget.locator('#ibis-widget-form button[type="submit"]').click();await widget.waitForTimeout(300);}
await askWidget('give me the ibis link');let widgetText=await widget.locator('#ibis-widget-messages').innerText();assert.doesNotMatch(widgetText,/ftn\.to/i);let link=widget.locator('#ibis-widget-messages a[href]').last();assert.equal(await link.getAttribute('href'),base+'/ibis-ai/');
await askWidget('full url');widgetText=await widget.locator('#ibis-widget-messages').innerText();assert.doesNotMatch(widgetText,/ftn\.to/i);link=widget.locator('#ibis-widget-messages a[href]').last();assert.equal(await link.getAttribute('href'),base+'/ibis-ai/');

await context.close();await browser.close();console.log('IBIS behavioral UX acceptance passed.');
