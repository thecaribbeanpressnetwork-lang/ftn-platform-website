import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const CAPTURE_DIR=process.env.FTN_CAPTURE_DIR||'';
if(CAPTURE_DIR)fs.mkdirSync(CAPTURE_DIR,{recursive:true});
const homepage=fs.readFileSync('index.html','utf8');
const shell=fs.readFileSync('js/workspace-shell.js','utf8');
const registry=fs.readFileSync('js/product-registry-data.js','utf8');
const homepageCss=fs.readFileSync('css/components/ecosystem-homepage-refinement.css','utf8');
const shellCss=fs.readFileSync('css/components/workspace-shell.css','utf8');
assert.match(homepage,/THE CARIBBEAN<br>ECOSYSTEM\./);
assert.match(homepage,/One connected home for the region’s public life, information, culture and opportunity\./);
assert.match(homepage,/Every signal connects to something bigger\./);
assert.match(homepage,/A living network of people,<br>places and purpose\./);
for(const stale of ['See what is happening now','Strengthen your community','Partner with FTN'])assert(!homepage.includes(stale),`stale homepage action returned: ${stale}`);
assert.equal((homepage.match(/ecosystem-hero__actions[\s\S]*?<\/div>/)||[''])[0].match(/<(?:a|button)\b/g)?.length,2,'homepage must keep exactly two approved hero actions');
assert(homepage.includes('/assets/home/ftn-approved-caribbean-ecosystem.png'),'approved homepage visual is not wired into the front door');
assert(fs.existsSync('assets/home/ftn-approved-caribbean-ecosystem.png'),'approved homepage visual is missing');
assert(!homepage.includes('ecosystem-map__land'),'flat map-mask approximation returned');
assert(!homepage.includes('<svg class="ecosystem-ibis"'),'hand-built ibis approximation returned');
assert(!/scarlet[ -]?ibis/i.test(homepage+homepageCss),'red/scarlet ibis language must never appear in the homepage surface');
assert(shell.includes('if(product.heroAsset)'),'shared shell does not gate hero rendering on an approved hero asset');
assert(!shell.includes('if(product.panelAsset)'),'shared shell still promotes directory panels into heroes');
assert.match(registry,/heroAsset:null/,'registry fallback must be interface-led unless an asset is explicitly approved');
assert(!/\.workspace__hero-art img\{[^}]*object-fit:cover/.test(shellCss),'shared product shell still destructively crops approved art');
assert(!/\.workspace__hero-art\{[^}]*aspect-ratio:16\/9/.test(shellCss),'shared product shell still forces approved art into a 16:9 frame');
assert(!/\.workspace__hero-art\{[^}]*max-height:230px/.test(shellCss),'shared product shell still clamps approved art to the broken release height');
assert.match(shellCss,/\.workspace__hero-art img\{[^}]*object-fit:contain/,'shared product shell must preserve approved image proportions');

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
  assert.equal(await page.locator('.ecosystem-map__land,.ecosystem-ibis').count(),0);
  assert.equal(await page.locator('.ecosystem-hero__approved').count(),3);
  assert.equal(await page.locator('[data-ecosystem-reveal]').isHidden(),true);
  if(CAPTURE_DIR&&viewport.width!==320)await page.screenshot({path:path.join(CAPTURE_DIR,`homepage-${viewport.width}x${viewport.height}.png`),fullPage:false});
  await page.locator('[data-ecosystem-toggle]').press('Enter');
  await page.waitForSelector('[data-ecosystem-reveal]:not([hidden])');
  assert.equal(await page.locator('.ecosystem-product-link').count(),21);
  assert.equal(await page.locator('.ftn-directory-group').count(),6);
  await context.close();
}

{
  const {context,page}=await open('/',{width:1280,height:900},'reduce');
  assert.equal(await page.locator('.ecosystem-hero__glimmer').first().evaluate(el=>getComputedStyle(el).display),'none');
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
