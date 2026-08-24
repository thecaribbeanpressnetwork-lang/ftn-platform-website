import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const TRANSACTION='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-transactions';
const CLOUDFLARE_TEST_SITE_KEY='1x00000000000000000000AA';
const cfg=await fetch(BASE+'/config/public-runtime.json').then(r=>{assert(r.ok,'public runtime config missing');return r.json();});
assert.equal(cfg.schemaVersion,1,'unexpected public runtime config schema');
assert.equal(typeof cfg.turnstileSiteKey,'string','Turnstile site key config must be a string');
const siteKey=cfg.turnstileSiteKey.trim();

// Safe configuration probe: an allowed-origin request with deliberately missing transaction
// fields reaches 422 only when the server-side Turnstile secret is configured. A 503 means
// the secret is still absent. We permit that only while the PUBLIC site key is also blank,
// so FTN can ship the fail-closed preparation layer without accidentally activating half a gate.
// This request never carries a valid token or creates a transaction and cannot reveal a secret.
const probe=await fetch(TRANSACTION,{method:'POST',headers:{Origin:'https://ftnplatform.org','Content-Type':'application/json'},body:'{}'});
if(siteKey){
  assert.equal(probe.status,422,`Turnstile site key is active but the verification backend is not ready (expected 422 validation probe, received ${probe.status})`);
  console.log('TURNSTILE CLIENT + SERVER CONFIGURATION PASS');
}else{
  assert([422,503].includes(probe.status),`unexpected transaction backend probe status ${probe.status}`);
  console.log(probe.status===422?'TURNSTILE SERVER SECRET READY; PUBLIC SITE KEY PENDING':'TURNSTILE FAIL-CLOSED PRECONFIGURATION PASS; SITE KEY + SECRET PENDING');
}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
// Cloudflare documents dummy keys for automated testing because production widgets detect
// automation. Keep the real backend readiness probe above, then test FTN's client contract with
// a deterministic explicit-render adapter: response field, callback and submit enablement.
await page.route('**/config/public-runtime.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schemaVersion:1,turnstileSiteKey:CLOUDFLARE_TEST_SITE_KEY})}));
await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.turnstile={render:function(mount,options){mount.setAttribute('data-test-turnstile',options.sitekey);setTimeout(function(){options.callback('FTN_AUTOMATED_TEST_TOKEN');},0);return 'ftn-test-widget';}};`}));
const response=await page.goto(BASE+'/radio/',{waitUntil:'domcontentloaded',timeout:45000});
assert(response&&response.ok(),`Radio returned ${response?.status()}`);
const country=page.locator('.country-switcher-dialog.is-open [data-country-code="TT"]');
if(await country.count()){await country.first().click();await page.waitForFunction(()=>!document.querySelector('.country-switcher-dialog.is-open'),{timeout:5000});}
await page.waitForSelector('#radio-submit-form',{timeout:10000});
await page.waitForFunction(()=>document.querySelector('#radio-submit-form input[name="cf-turnstile-response"]')?.value==='FTN_AUTOMATED_TEST_TOKEN',{timeout:12000});
const token=page.locator('#radio-submit-form input[name="cf-turnstile-response"]');
assert.equal(await token.count(),1,'configured Turnstile must create exactly one response field');
assert.equal(await page.locator('[data-turnstile-mount]').first().getAttribute('data-test-turnstile'),CLOUDFLARE_TEST_SITE_KEY,'release test must use Cloudflare dummy site key');
const submit=page.locator('#radio-submit-form button[type="submit"],#radio-submit-form button:not([type])').first();
assert(!(await submit.isDisabled()),'successful Turnstile callback must enable secure submission');
console.log('TURNSTILE DETERMINISTIC CLIENT CONTRACT PASS');
for(const [path,formSelector,expected] of [['/screen/','#screen-form',1],['/facethenation/','.ftn-participation-form',3]]){
  await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:45000});
  // #screen-form now renders inside a collapsed native <details> (js/screen-progressive-
  // disclosure.js keeps discovery above ~7000px of creator tooling) -- open it first, the same
  // way a real filmmaker would before submitting, rather than asserting on a form Playwright
  // can't see yet.
  if(path==='/screen/'){await page.waitForSelector(formSelector,{state:'attached',timeout:10000});await page.locator(formSelector).locator('xpath=ancestor::details[1]/summary').click();}
  await page.waitForSelector(formSelector,{timeout:10000});
  await page.waitForFunction(({selector,count})=>[...document.querySelectorAll(selector)].filter(form=>form.querySelector('input[name="cf-turnstile-response"]')?.value==='FTN_AUTOMATED_TEST_TOKEN').length===count,{selector:formSelector,count:expected},{timeout:12000});
  assert.equal(await page.locator(formSelector+' input[name="cf-turnstile-response"]').count(),expected,`${path} must gate each consequential submission form exactly once`);
}
console.log('TURNSTILE SCREEN + FACE THE NATION MODERATION GATES PASS');
await context.close();await browser.close();
