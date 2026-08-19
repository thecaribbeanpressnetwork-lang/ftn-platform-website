import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const homepage=fs.readFileSync('index.html','utf8');
const shell=fs.readFileSync('js/workspace-shell.js','utf8');
const registry=fs.readFileSync('js/product-registry-data.js','utf8');
assert.match(homepage,/THE CARIBBEAN<br>ECOSYSTEM\./);
assert.match(homepage,/One connected home for the region’s public life, information, culture and opportunity\./);
assert.match(homepage,/Every signal connects to something bigger\./);
for(const stale of ['See what is happening now','Strengthen your community','Partner with FTN'])assert(!homepage.includes(stale),`stale homepage action returned: ${stale}`);
assert(shell.includes('if(product.heroAsset)'),'shared shell does not gate hero rendering on an approved hero asset');
assert(!shell.includes('if(product.panelAsset)'),'shared shell still promotes directory panels into heroes');
assert.match(registry,/heroAsset:null/,'registry fallback must be interface-led unless an asset is explicitly approved');
assert(fs.existsSync('assets/maps/caribbean-natural-earth.svg'),'verified Caribbean map asset is missing');

const browser=await chromium.launch({headless:true});
async function open(path,viewport={width:1280,height:900},reducedMotion='no-preference'){
  const context=await browser.newContext({viewport,reducedMotion});
  await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await context.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:200,contentType:'font/woff2',body:''}));
  const page=await context.newPage();
  const response=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:30000});
  assert(response?.ok(),`${path} returned ${response?.status()}`);
  await page.waitForTimeout(300);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=3,`${path} has ${overflow}px horizontal overflow at ${viewport.width}px`);
  return {context,page};
}

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:700}]){
  const {context,page}=await open('/',viewport);
  assert.equal(await page.locator('.ecosystem-hero__actions .btn').count(),2);
  assert.equal(await page.locator('[data-ecosystem-reveal]').isHidden(),true);
  await page.locator('[data-ecosystem-toggle]').press('Enter');
  await page.waitForSelector('[data-ecosystem-reveal]:not([hidden])');
  assert.equal(await page.locator('.ecosystem-product-link').count(),21);
  assert.equal(await page.locator('.ftn-directory-group').count(),6);
  await context.close();
}

{
  const {context,page}=await open('/',{width:1280,height:900},'reduce');
  assert.equal(await page.locator('.ecosystem-ibis').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('.ecosystem-signal').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  await context.close();
}

for(const path of ['/screen/','/opportunities/','/riddim/','/kaiso/','/events/','/ibis-ai/']){
  const {context,page}=await open(path);
  await page.waitForSelector('.workspace[data-surface-mode="interface"]',{timeout:10000});
  assert.equal(await page.locator('.workspace__hero-art img[src*="/assets/panels/"]').count(),0,`${path} promotes a directory panel into its hero`);
  const content=await page.locator('.workspace__content').boundingBox();
  assert(content&&content.y<650,`${path} delays its functional surface below the first useful viewport`);
  await context.close();
}

await browser.close();
console.log('FTN Surface System passed desktop, 390px, 320px, keyboard, reduced-motion and representative product-shell gates.');
