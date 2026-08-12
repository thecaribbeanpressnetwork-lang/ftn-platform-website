import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));

async function open(path,selector){
  const r=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:45000});
  assert(r&&r.ok(),`${path} returned ${r?.status()}`);
  await page.waitForTimeout(220);
  const country=page.locator('.country-switcher-dialog.is-open [data-country-code="TT"]');
  if(await country.count()){await country.first().click();await page.waitForFunction(()=>!document.querySelector('.country-switcher-dialog.is-open'),{timeout:5000});}
  await page.waitForSelector(selector,{timeout:15000});
  const metrics=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  assert(metrics.sw-metrics.cw<=3,`${path} horizontal overflow ${metrics.sw-metrics.cw}px`);
}

const surfaces=[
  ['/ibis-ai/','#ibis-form'],
  ['/scenario-workspace/#correlation-engine','.mc-live-engine'],
  ['/govern/','.govern-grid'],
  ['/observatory/','.ftn-sat'],
  ['/events/','#events-form'],
  ['/opportunities/','#opp-search'],
  ['/radio/','.ftn-radio-live'],
  ['/dj-tube-prototype/?ftn=1','#playA'],
  ['/riddim/daw/','#mPlay'],
  ['/screen/','.screen-catalog'],
  ['/tv/','.tv-player'],
  ['/kaiso/','#kaiso-local-feed'],
  ['/display-network/','#dn-add-content']
];
for(const [path,selector] of surfaces){await open(path,selector);console.log('MOBILE PASS',path);}

// Touch-target sanity on the two performance-heavy music tools.
await open('/dj-tube-prototype/?ftn=1','#playA');
for(const sel of ['#playA','#playB','#cueA','#cueB']){const b=await page.locator(sel).boundingBox();assert(b&&b.width>=40&&b.height>=34,`${sel} too small for touch: ${b?.width}x${b?.height}`);}
await open('/riddim/daw/','#mPlay');
for(const sel of ['#mPlay','#mStop','#mOriginal']){const b=await page.locator(sel).boundingBox();assert(b&&b.width>=40&&b.height>=44,`${sel} too small for touch: ${b?.width}x${b?.height}`);}

assert(errors.length===0,'Mobile page errors:\n'+errors.join('\n'));
await context.close();await browser.close();
console.log(`\n${surfaces.length} critical FTN mobile surfaces passed.`);
