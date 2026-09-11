import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.FTN_CHROME_PATH||undefined});

function mockSupabaseCdn(page){
  return page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient:function(){return{auth:{getUser:async function(){return{data:{user:null},error:null}},getSession:async function(){return{data:{session:null},error:null}},onAuthStateChange:function(){}},from:function(){throw new Error("fixture database access not expected")},functions:{invoke:async function(){return{data:null,error:new Error("fixture")}}}}}};'}));
}

async function askHeadspace(page,text){
  await page.locator('#headspaceQuery').fill(text);
  await page.locator('#inputOrbit button[type="submit"]').click();
  await page.waitForTimeout(950);
}

// TASK JOURNEY 1: Headspace must route each request to the correct capability,
// replace stale state, and allow real spatial manipulation.
const head=await browser.newPage({viewport:{width:1440,height:1000}});
await mockSupabaseCdn(head);
await head.route('**/functions/v1/ibis-text-cloudflare*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'GENERAL_ROUTE_MARKER: The Caribbean contains sovereign states and dependent territories.','provider':'behavioral-fixture'})}));
await head.route('https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/actions/runs?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_count:1,workflow_runs:[{name:'FTN Scout 2.0',event:'schedule',status:'completed',conclusion:'success',run_number:18,run_started_at:'2026-09-09T14:41:22Z'}]})}));
await head.route('**/functions/v1/ftn-opportunities*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-09-08T12:00:00Z',warnings:[],items:[]})}));
await head.goto(base+'/ibis-headspace-preview/',{waitUntil:'networkidle'});

await askHeadspace(head,'What is the latest USD selling rate?');
assert.match(await head.locator('[data-thought="answer"]').innerText(),/USD|TTD|selling|rate/i,'Statistics task must own the request.');

await askHeadspace(head,'show live population');
const populationText=await head.locator('[data-thought="answer"]').innerText();
assert.match(populationText,/population/i,'Population task must materialize population state.');

await askHeadspace(head,'How much capital do I need to live on TT$35,000 a month at 5%?');
const capitalText=await head.locator('[data-thought="answer"]').innerText();
assert.match(capitalText,/8,400,000|8\.4/i,'Capital task must route to Capital Intelligence and calculate TT$8.4M.');
assert.doesNotMatch(capitalText,/Population is moving/i,'A new task must replace stale answer state from the previous handler.');

await askHeadspace(head,'list the Caribbean islands');
const generalText=await head.locator('[data-thought="answer"]').innerText();
assert.match(generalText,/GENERAL_ROUTE_MARKER/,'General knowledge must reach the general intelligence route.');
assert.doesNotMatch(generalText,/Real Objective|User Value|Ecosystem Value|Economic Value/i,'Internal decision-framework scaffolding must never leak into ordinary answers.');

const free= head.locator('[data-arrange="freeform"]');
await free.waitFor({state:'visible'});
await free.click();
assert.equal(await head.locator('#field').getAttribute('data-layout'),'freeform','Freeform must genuinely unsnap Headspace.');
const card=head.locator('[data-thought="answer"]');
const bar=card.locator('.thought-bar');
const before=await card.boundingBox();
assert(before,'Answer card must have a bounding box in freeform mode.');
const box=await bar.boundingBox();
assert(box,'Answer title bar must be draggable.');
await head.mouse.move(box.x+30,box.y+15);
await head.mouse.down();
await head.mouse.move(box.x+180,box.y+120,{steps:8});
await head.mouse.up();
await head.waitForTimeout(150);
const after=await card.boundingBox();
assert(after&&Math.abs(after.x-before.x)>20,'Freeform card must remain where the user drags it.');
await head.locator('[data-arrange="grid"]').click();
assert.equal(await head.locator('#field').getAttribute('data-layout'),'grid','Snap Grid must deliberately return freeform cards to grid layout.');
await head.screenshot({path:'test-artifacts/ibis-behavioral-headspace.png',fullPage:true});

// TASK JOURNEY 2: Primary ibis workspace must honor semantic output contracts.
const main=await browser.newPage({viewport:{width:1440,height:1000}});
await mockSupabaseCdn(main);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=';
await main.route('**/functions/v1/ibis-image-cloudflare*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({image:png,mimeType:'image/png',extension:'png',provider:'Cloudflare Workers AI',model:'fixture-image'})}));
await main.route('**/functions/v1/ftn-news-sources*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({localItems:[{title:'Trinidad fixture headline',publisher:'Fixture Trinidad Publisher',url:'https://example.test/trinidad-story',publishedAt:'2026-09-11T10:00:00Z',classification:'Publisher headline'}],items:[]})}));
await main.goto(base+'/ibis-ai/',{waitUntil:'networkidle'});

async function submitMain(text){
  const input=main.locator('#ibis-goal');
  await input.fill(text);
  await main.locator('#ibis-form button[type="submit"]').click();
  await main.waitForTimeout(650);
}

await submitMain('generate an image of a red scarlet ibis flying across the Caribbean');
const imageBubble=main.locator('.ibis-msg__bubble--ibis').last();
assert.match(await imageBubble.innerText(),/REAL IMAGE GENERATION/i,'Image intent must return the true image-generation contract, not a poster substitute.');
assert.equal(await imageBubble.locator('img').count(),1,'Image generation must return an actual image artifact.');

await submitMain('what is in the Trinidad news today?');
const newsBubble=main.locator('.ibis-msg__bubble--ibis').last();
const newsText=await newsBubble.innerText();
assert.match(newsText,/Fixture Trinidad Publisher|Trinidad fixture headline/i,'Current Trinidad news must use configured local publisher sources.');
assert.doesNotMatch(newsText,/GitHub|Hacker News|IPTV/i,'Local-news UX must not fall through to unrelated generic research sources.');

await submitMain('tell me about Keyon Byron');
const personBubble=main.locator('.ibis-msg__bubble--ibis').last();
const personText=await personBubble.innerText();
assert.match(personText,/not enough verified|could not verify|will not guess/i,'Unverified person lookup must fail closed.');
assert.doesNotMatch(personText,/musician|composer|producer/i,'Person lookup must not invent a profession or biography.');

assert.equal(await main.locator('[data-ibis-headspace-entry] a[href="/ibis-headspace-preview/"]').count(),1,'Primary ibis workspace must expose a valid Headspace route.');
await main.screenshot({path:'test-artifacts/ibis-behavioral-workspace.png',fullPage:true});

await browser.close();
console.log('IBIS behavioral UX acceptance passed: correct-handler ownership, stale-state replacement, no framework leakage, freeform/snap behavior, true image artifact contract, local-news source routing, person fail-closed behavior, and valid Headspace navigation verified.');
