import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
const routes=[
  '/',
  '/ibis-ai/',
  '/scenario-workspace/',
  '/observatory/',
  '/events/',
  '/opportunities/',
  '/radio/',
  '/riddim/',
  '/riddim/daw/',
  '/screen/',
  '/tv/',
  '/kaiso/'
];

// These are guardrails, not synthetic speed scores. They deliberately focus on things
// FTN owns and can control reliably in CI: initial FTN payload, DOM size, script/style
// count and accidental eager third-party embeds. Real-user timing should be added from
// Cloudflare once production analytics access is connected.
const BUDGET={
  ownTransferBytes: 3_500_000,
  ownJsBytes: 1_200_000,
  ownCssBytes: 700_000,
  ownImageBytes: 2_500_000,
  domNodes: 2600,
  scriptElements: 45,
  stylesheetElements: 30,
  eagerIframes: 2,
  longTasks: 12,
  maxLongTaskMs: 250
};

function mb(n){return (n/1024/1024).toFixed(2)+' MB';}
function kb(n){return (n/1024).toFixed(0)+' KB';}

const failures=[];
const rows=[];

for(const route of routes){
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  // Keep this owned-code budget deterministic: provider latency and scripts have their
  // own staging checks and must not be attributed to FTN's transfer/long-task budget.
  await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await context.route('https://fonts.gstatic.com/**',r=>r.fulfill({status:200,contentType:'font/woff2',body:Buffer.alloc(0)}));
  await context.route('https://www.youtube.com/iframe_api',r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.YT={PlayerState:{ENDED:0,PLAYING:1,PAUSED:2},Player:function(){}};'}));
  await context.route(/https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/.*/,r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Provider fixture</title>'}));
  await context.route('**/functions/v1/**',r=>{const u=r.request().url();var body={};if(u.includes('dj-tube-discovery'))body={results:[],providers:{fixture:true},fetchedAt:'2026-08-10T12:00:00Z'};else if(u.includes('ftn-opportunities'))body={items:[],warnings:[],fetchedAt:'2026-08-10T12:00:00Z'};else if(u.includes('ftn-news-sources'))body={items:[],fetchedAt:'2026-08-10T12:00:00Z'};else if(u.includes('ftn-live-sources'))body={satellite:{sourceUrl:'https://www.star.nesdis.noaa.gov/',sourceTimestamp:'fixture'}};r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
  const page=await context.newPage();
  const requests=new Map();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent',e=>requests.set(e.requestId,{url:e.request.url,type:e.type||'Other',bytes:0}));
  cdp.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r)r.bytes=e.encodedDataLength||0;});
  await page.addInitScript(()=>{
    window.__ftnLongTasks=[];
    try{
      new PerformanceObserver(list=>{for(const e of list.getEntries())window.__ftnLongTasks.push({start:e.startTime,duration:e.duration,name:e.name});}).observe({entryTypes:['longtask']});
    }catch{}
  });
  try{
    const response=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:45000});
    assert(response&&response.ok(),`${route} returned ${response?.status()}`);
    const country=page.locator('.country-switcher-dialog.is-open [data-country-code="TT"]');
    if(await country.count()){
      await country.first().click();
      await page.waitForFunction(()=>!document.querySelector('.country-switcher-dialog.is-open'),{timeout:5000});
    }
    // Allow product bootstraps to settle, but do not wait for a user to press Play or Search.
    await page.waitForTimeout(3500);
    const metrics=await page.evaluate(()=>{
      const scripts=[...document.scripts];
      const styles=[...document.querySelectorAll('link[rel="stylesheet"],style')];
      const iframes=[...document.querySelectorAll('iframe')];
      const longTasks=(window.__ftnLongTasks||[]).filter(x=>x.name==='self'||String(x.name).startsWith('same-origin'));
      return {
        domNodes:document.getElementsByTagName('*').length,
        scripts:scripts.length,
        styles:styles.length,
        eagerIframes:iframes.filter(f=>f.loading!=='lazy').length,
        longTasks:longTasks.length,
        maxLongTask:longTasks.reduce((m,x)=>Math.max(m,x.duration||0),0),
        dcl:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd||0,
        load:performance.getEntriesByType('navigation')[0]?.loadEventEnd||0
      };
    });
    let own=0,js=0,css=0,image=0,thirdParty=0;
    for(const r of requests.values()){
      let u;try{u=new URL(r.url);}catch{continue;}
      if(u.origin===new URL(BASE).origin){
        own+=r.bytes;
        if(r.type==='Script'||/\.m?js(?:\?|$)/i.test(u.pathname))js+=r.bytes;
        else if(r.type==='Stylesheet'||/\.css(?:\?|$)/i.test(u.pathname))css+=r.bytes;
        else if(r.type==='Image'||/\.(?:png|jpe?g|webp|gif|svg)(?:\?|$)/i.test(u.pathname))image+=r.bytes;
      }else if(/^https?:/.test(u.protocol)) thirdParty++;
    }
    rows.push({route,own,js,css,image,thirdParty,...metrics});
    const checks=[
      ['own transfer',own,BUDGET.ownTransferBytes,mb],
      ['own JS',js,BUDGET.ownJsBytes,kb],
      ['own CSS',css,BUDGET.ownCssBytes,kb],
      ['own images',image,BUDGET.ownImageBytes,mb],
      ['DOM nodes',metrics.domNodes,BUDGET.domNodes,String],
      ['script elements',metrics.scripts,BUDGET.scriptElements,String],
      ['stylesheet/style elements',metrics.styles,BUDGET.stylesheetElements,String],
      ['eager iframes',metrics.eagerIframes,BUDGET.eagerIframes,String],
      ['long tasks',metrics.longTasks,BUDGET.longTasks,String],
      ['max long task',metrics.maxLongTask,BUDGET.maxLongTaskMs,x=>x.toFixed(0)+' ms']
    ];
    for(const [label,value,limit,format] of checks){
      if(value>limit)failures.push(`${route} ${label}: ${format(value)} > budget ${format(limit)}`);
    }
  }catch(e){failures.push(`${route} audit error: ${e.message}`);}finally{await context.close();}
}
await browser.close();

console.log('\nFTN PERFORMANCE BUDGET');
for(const r of rows){
  console.log(`${r.route.padEnd(26)} own=${mb(r.own).padStart(8)} js=${kb(r.js).padStart(7)} css=${kb(r.css).padStart(7)} img=${mb(r.image).padStart(8)} DOM=${String(r.domNodes).padStart(4)} third=${String(r.thirdParty).padStart(3)} long=${String(r.longTasks).padStart(2)} max=${r.maxLongTask.toFixed(0)}ms DCL=${r.dcl.toFixed(0)}ms load=${r.load.toFixed(0)}ms`);
}
if(failures.length){
  console.error('\nPERFORMANCE BUDGET FAILURES');
  for(const f of failures)console.error('- '+f);
  process.exit(1);
}
console.log(`\n${rows.length}/${routes.length} representative FTN routes stayed inside the owned performance budgets.`);
