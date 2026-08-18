import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const AUTH_SCRIPT='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js';
const OWNER_ENDPOINT='**/functions/v1/ftn-owner-control';
const browser=await chromium.launch({headless:true});

async function scenario(name,ownerResponse,run){
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.route(AUTH_SCRIPT,route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.supabase={createClient:function(){return{auth:{exchangeCodeForSession:async(code)=>{window.__ftnExchangedCode=code;return{data:{session:{access_token:'fixture-access-token'}},error:null}},getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111',email:'founder@example.test',email_confirmed_at:'2026-08-12T00:00:00Z'}},error:null}),getSession:async()=>({data:{session:{access_token:'fixture-access-token'}},error:null}),onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}},signOut:async()=>({error:null})},from:function(){return{upsert:async()=>({error:null})}},functions:{invoke:async()=>({data:{ok:true},error:null})}}}};`}));
  await context.route(OWNER_ENDPOINT,route=>route.fulfill({status:ownerResponse.status||200,contentType:'application/json',body:JSON.stringify(ownerResponse.body)}));
  const page=await context.newPage();
  try{await run(page);console.log('FOUNDER ACCESS PASS',name);}finally{await context.close();}
}
async function open(page,path){const response=await page.goto(BASE+path,{waitUntil:'domcontentloaded'});assert(response&&response.ok());}

await scenario('approved-google-and-enrolled-device',{body:{allowed:true,device:{id:'device-1',name:'Current founder machine'}}},async page=>{
  await open(page,'/account/?return=%2Fparliament%2F');
  await page.waitForSelector('#account-owner-gate:not([hidden])');
  assert.equal(await page.locator('#account-owner-gate a[href="/god-mode/"]').count(),1);
  assert.equal(await page.locator('a[href="/parliament/"]').count()>0,true,'return-to-origin path missing');
  await page.click('#account-signout');
  assert.equal(await page.locator('a[href="/god-mode/"]').count(),0,'God Mode remained visible after sign-out');
  assert.match(await page.locator('#account-state').innerText(),/Guest/);
});

await scenario('non-founder-remains-undiscoverable',{status:403,body:{allowed:false,error:'Founder identity is not approved'}},async page=>{
  await open(page,'/account/');await page.waitForSelector('#account-signout');
  assert.equal(await page.locator('#account-owner-gate:not([hidden])').count(),0);
  assert.equal(await page.locator('a[href="/god-mode/"]').count(),0);
});

await scenario('new-founder-device-needs-approval',{status:403,body:{allowed:false,ownerIdentity:true,deviceApprovalRequired:true,firstDevice:false,error:'Founder device approval required'}},async page=>{
  await open(page,'/account/');await page.waitForSelector('#founder-device-form');
  assert.match(await page.locator('#account-owner-gate').innerText(),/Founder device approval required/i);
  assert.equal(await page.locator('a[href="/god-mode/"]').count(),0);
});

await scenario('revoked-device-direct-route-denied',{status:403,body:{allowed:false,ownerIdentity:true,deviceApprovalRequired:true,error:'Founder device approval required'}},async page=>{
  await open(page,'/god-mode/');await page.waitForSelector('#god-mode-root');
  assert.equal(await page.locator('[data-emergency]').count(),0);
  assert.match(await page.locator('#god-mode-root').innerText(),/approval required|authorization required/i);
});

await scenario('oauth-provider-failure-is-visible-and-consumed',{body:{allowed:false}},async page=>{
  await open(page,'/account/?return=%2Fgod-mode%2F&error=server_error&error_code=unexpected_failure&error_description=Unable%20to%20exchange%20external%20code%3A%20invalid_client');
  await page.waitForSelector('#account-google');
  const status=await page.locator('#account-status').innerText();
  assert.match(status,/Google sign-in is temporarily unavailable/i);
  assert.match(status,/God Mode remains closed/i);
  assert.doesNotMatch(status,/invalid_client|external code/i,'raw provider error leaked into the account interface');
  const current=new URL(page.url());
  assert.equal(current.searchParams.has('error'),false,'OAuth callback error was left in the URL');
  assert.equal(current.searchParams.has('error_code'),false,'OAuth callback error code was left in the URL');
  assert.equal(current.searchParams.has('error_description'),false,'OAuth callback error details were left in the URL');
  assert.equal(current.searchParams.get('return'),'/god-mode/','safe return path was not preserved');
});

await scenario('auth-callback-code-is-exchanged-and-return-preserved',{body:{allowed:true,device:{id:'device-1',name:'Current founder machine'}}},async page=>{
  await open(page,'/account/?return=%2Fgod-mode%2F&code=fixture-auth-code');
  await page.waitForSelector('#account-signout');
  assert.equal(await page.evaluate(()=>window.__ftnExchangedCode),'fixture-auth-code','callback code was not exchanged');
  const current=new URL(page.url());
  assert.equal(current.searchParams.has('code'),false,'one-time callback code was left in the URL');
  assert.equal(current.searchParams.get('return'),'/god-mode/','safe return path was not preserved after exchange');
  assert.equal(await page.locator('a').filter({hasText:'Continue task'}).getAttribute('href'),'/god-mode/');
});

await browser.close();
console.log('6/6 founder identity/device and auth-callback client-state scenarios passed; server enforcement is audited separately.');
