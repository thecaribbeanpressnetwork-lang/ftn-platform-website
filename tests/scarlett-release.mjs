import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const manifest=JSON.parse(fs.readFileSync('extensions/scarlett/manifest.json','utf8'));
assert.equal(manifest.manifest_version,3);
assert.deepEqual([...manifest.permissions].sort(),['activeTab','scripting','storage'].sort());
assert.deepEqual(manifest.host_permissions,[]);
for(const path of ['extensions/scarlett/content.js','extensions/scarlett/popup.js']){
  const src=fs.readFileSync(path,'utf8');
  assert(!/\beval\s*\(/.test(src),`${path} may not use eval`);
  assert(!/XMLHttpRequest/.test(src),`${path} may not use XMLHttpRequest`);
  assert(!/https?:\/\//.test(src),`${path} may not embed remote network endpoints`);
}
assert(!/\bfetch\s*\(/.test(fs.readFileSync('extensions/scarlett/content.js','utf8')),'Scarlett content runtime must not exfiltrate page content');

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const response=await page.goto(BASE+'/scarlett/',{waitUntil:'domcontentloaded',timeout:30000});
assert(response?.ok(),`Scarlett returned ${response?.status()}`);
await page.waitForFunction(()=>Boolean(window.FTN?.Scarlett));
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
assert(overflow<=3,`Scarlett mobile horizontal overflow ${overflow}px`);
await page.click('#scTransform');
assert.equal(await page.locator('html').getAttribute('data-scarlett'),'on');
assert.match(await page.locator('#scStatus').innerText(),/Adapted locally/i);
const model=await page.evaluate(()=>window.FTN.Scarlett.analyze());
assert(Number.isInteger(model.neuralMeshCount)&&model.neuralMeshCount>0,'Neural Mesh should identify live controls');
assert(['commerce','service','editorial','civic','creator','utility','unknown'].includes(model.purpose));
await page.locator('#scIntensity').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
await page.waitForTimeout(80);
const settled=Number(await page.locator('#scIntensity').inputValue());
assert([44,56].includes(settled),`50% crossover should settle to a stable presentation side, got ${settled}`);
await page.click('#scRestore');
assert.equal(await page.locator('html').getAttribute('data-scarlett'),null);
assert.match(await page.locator('#scStatus').innerText(),/Original presentation restored/i);
assert.equal(errors.length,0,errors.join('\n'));
await browser.close();
console.log('Scarlett release gate PASS: reversible, local-first, privacy bounded, mobile safe.');
