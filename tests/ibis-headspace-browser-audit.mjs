import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.FTN_TEST_BASE||'http://127.0.0.1:4173';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const consoleErrors=[];
page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
page.on('pageerror',err=>consoleErrors.push(err.message));
await page.goto(base+'/ibis-headspace-preview/',{waitUntil:'networkidle'});
assert.equal(await page.locator('#headspaceQuery').count(),1,'Headspace query input must exist');
assert.equal(await page.locator('.thought').count()>=10,true,'Headspace thought surfaces must exist');

async function ask(text){
  await page.locator('#headspaceQuery').fill(text);
  await page.locator('#inputOrbit button[type="submit"]').click();
  await page.waitForTimeout(900);
}

await ask('What is the latest USD selling rate?');
assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/USD|TTD|selling|rate/i,'Verified statistics answer should materialize');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz').count(),1,'Statistics should use Presentation Intelligence');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--snapshot').count(),1,'Central Bank series must be labelled SNAPSHOT');

await ask('show live population');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--live-model').count(),1,'Modelled population must be labelled LIVE MODEL');
assert.match(await page.locator('[data-thought="answer"] p').innerText(),/not live official measurement/i,'LIVE MODEL explanation must preserve truth distinction');

await ask('How much capital do I need to live on TT$35,000 a month at 5%?');
assert.match(await page.locator('[data-thought="answer"] h2').innerText(),/8,400,000|8\.4/i,'Capital scenario should calculate TT$8.4M');
assert.equal(await page.locator('[data-thought="graph"] .ibis-data-viz__status--scenario').count(),1,'Capital sensitivity must be labelled SCENARIO');

await ask('what is connected to FTN Opportunities');
assert.equal(await page.locator('.ibis-context-constellation').count(),1,'Context Graph should materialize as a constellation');
assert.match(await page.locator('[data-thought="context"] .thought-bar>span').innerText(),/CONTEXT GRAPH/i);

const answer=page.locator('[data-thought="answer"]');
const before=await answer.boundingBox();
if(before){await answer.hover();await page.mouse.down();await page.mouse.move(before.x+150,before.y+120,{steps:8});await page.mouse.up();await page.waitForTimeout(150);const after=await answer.boundingBox();assert(after&&Math.abs(after.x-before.x)>10,'Thought surface should be draggable');}
await page.screenshot({path:'test-artifacts/ibis-headspace-desktop.png',fullPage:true});

const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
await mobile.goto(base+'/ibis-headspace-preview/',{waitUntil:'networkidle'});
assert.equal(await mobile.locator('.rail').evaluate(el=>getComputedStyle(el).display),'none','Desktop rail should collapse on mobile');
const bodyWidth=await mobile.evaluate(()=>document.body.scrollWidth),viewportWidth=await mobile.evaluate(()=>window.innerWidth);
assert(bodyWidth<=viewportWidth+2,'Headspace mobile layout must not create horizontal overflow');
await mobile.screenshot({path:'test-artifacts/ibis-headspace-mobile.png',fullPage:true});

assert.equal(consoleErrors.length,0,'Headspace should not emit browser console/page errors: '+consoleErrors.join(' | '));
await browser.close();
console.log('ibis Headspace browser audit: statistics, LIVE MODEL, capital scenario, Context Graph, dragging and mobile layout verified; screenshots captured.');
