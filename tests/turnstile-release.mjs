import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const TRANSACTION='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-transactions';
const cfg=await fetch(BASE+'/config/public-runtime.json').then(r=>{assert(r.ok,'public runtime config missing');return r.json();});
assert.equal(cfg.schemaVersion,1,'unexpected public runtime config schema');
assert.equal(typeof cfg.turnstileSiteKey,'string','Turnstile site key config must be a string');

// Safe configuration probe: an allowed-origin request with deliberately missing transaction
// fields must reach validation (422). A 503 would mean the server-side Turnstile secret is absent.
// This never carries a valid token or creates a transaction and cannot reveal the secret value.
const probe=await fetch(TRANSACTION,{method:'POST',headers:{Origin:'https://ftnplatform.org','Content-Type':'application/json'},body:'{}'});
assert.equal(probe.status,422,`transaction verification backend is not ready (expected 422 validation probe, received ${probe.status})`);
console.log('TURNSTILE SERVER SECRET CONFIGURED PASS');

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
const response=await page.goto(BASE+'/radio/',{waitUntil:'domcontentloaded',timeout:45000});
assert(response&&response.ok(),`Radio returned ${response?.status()}`);
const country=page.locator('.country-switcher-dialog.is-open [data-country-code="TT"]');
if(await country.count()){await country.first().click();await page.waitForFunction(()=>!document.querySelector('.country-switcher-dialog.is-open'),{timeout:5000});}
await page.waitForSelector('#radio-submit-form',{timeout:10000});
await page.waitForFunction(()=>{
  const f=document.getElementById('radio-submit-form');
  return !!document.getElementById('radio-email-fallback') || !!f?.querySelector('input[name="cf-turnstile-response"]') || !!f?.querySelector('iframe[src*="challenges.cloudflare.com"]');
},{timeout:12000});
const fallback=page.locator('#radio-email-fallback');
if(await fallback.count()){
  assert.match(await fallback.getAttribute('href'),/^mailto:/,'fallback must remain user-controlled email');
  const submit=page.locator('#radio-submit-form button[type="submit"],#radio-submit-form button:not([type])').first();
  assert(await submit.isDisabled(),'secure transaction button must remain disabled without Turnstile');
  console.log('TURNSTILE SAFE FALLBACK PASS');
}else{
  const token=page.locator('#radio-submit-form input[name="cf-turnstile-response"]');
  assert(await token.count()===1,'configured Turnstile must create its response field');
  console.log('TURNSTILE WIDGET READY PASS');
}
await context.close();await browser.close();
