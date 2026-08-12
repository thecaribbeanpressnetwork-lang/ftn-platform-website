import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const xml=await fs.readFile('sitemap.xml','utf8');
const paths=[...xml.matchAll(/<loc>https:\/\/ftnplatform\.org([^<]*)<\/loc>/g)].map(m=>m[1]||'/').filter(p=>!p.startsWith('/community-connect/'));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
const failures=[];

for(const path of paths){
  try{
    const r=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:45000});
    assert(r&&r.ok(),`${path} returned ${r?.status()}`);
    await page.waitForTimeout(180);
    const country=page.locator('.country-switcher-dialog.is-open [data-country-code="TT"]');
    if(await country.count()){await country.first().click();await page.waitForFunction(()=>!document.querySelector('.country-switcher-dialog.is-open'),{timeout:5000});}
    assert(await page.locator('main').count()===1,`${path} has no single main landmark`);
    const width=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert(width<=3,`${path} horizontal overflow ${width}px`);
    const body=(await page.locator('body').innerText()).trim();
    assert(body.length>80,`${path} appears empty`);
    assert(!/\bBETA\b/.test(body),`${path} exposes a stale BETA product state`);
    assert(!/Mission Control Demo/i.test(body),`${path} exposes the retired public Mission Control Demo name`);
    console.log('ROUTE PASS',path);
  }catch(e){failures.push(`${path}: ${e.message}`);console.error('ROUTE FAIL',path,e.message);}
}
await context.close();await browser.close();
if(failures.length){console.error('\n'+failures.join('\n'));process.exit(1);}
console.log(`\n${paths.length} indexed FTN routes passed (Community Connect excluded by release scope).`);
