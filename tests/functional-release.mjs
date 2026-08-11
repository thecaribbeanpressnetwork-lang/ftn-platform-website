import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];
const fixturePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const fixtureTracks=Array.from({length:24},(_,i)=>({videoId:'ftnfixture'+String(i).padStart(2,'0'),title:(i<6?'Face The Nation Caribbean Conversation ':'Caribbean Official Track ')+(i+1),channel:i<6?'Face The Nation TT':'Fixture Rights-Holder Channel',thumbnail:'/assets/social/og-image-default.png',durationSeconds:180+i,publishedAt:'2026-08-01T12:00:00Z',embeddable:true}));
async function installDeterministicProviderFixtures(context){
  if(process.env.FTN_LIVE_PROVIDERS==='1')return;
  await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await context.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:200,contentType:'font/woff2',body:Buffer.alloc(0)}));
  await context.route('https://i.ytimg.com/**',route=>route.fulfill({status:200,contentType:'image/png',body:fixturePng}));
  await context.route('https://fixtures.ftn.invalid/**',route=>route.fulfill({status:200,contentType:'image/png',body:fixturePng}));
  await context.route('https://www.youtube.com/iframe_api',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.YT={PlayerState:{ENDED:0,PLAYING:1,PAUSED:2},Player:function(id,o){this._state=2;this.loadVideoById=this.cueVideoById=function(){};this.playVideo=()=>{this._state=1};this.pauseVideo=()=>{this._state=2};this.getPlayerState=()=>this._state;this.setVolume=function(){};this.getCurrentTime=()=>0;this.getDuration=()=>180;setTimeout(()=>o&&o.events&&o.events.onReady&&o.events.onReady({target:this}),0)}};setTimeout(()=>window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady(),0);`}));
  await context.route(/https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/.*/,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Authorized fixture embed</title>'}));
  await context.route('**/functions/v1/dj-tube-discovery',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:fixtureTracks,providers:{fixture:true},fetchedAt:'2026-08-10T12:00:00Z'})}));
  await context.route('**/functions/v1/ftn-opportunities*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-08-10T12:00:00Z',warnings:[],items:[{title:'Caribbean Climate Programme Call',organization:'CARICOM Fixture Authority',country:'Regional',type:'Programme',sector:'Climate',summary:'Deterministic release-test record from an official-source adapter fixture.',deadline:'2026-12-15',sourceUrl:'https://caricom.org/',lastVerified:'2026-08-10T12:00:00Z'},{title:'Caribbean Development Procurement Notice',organization:'Caribbean Development Bank',country:'Barbados',type:'Tender',sector:'Procurement',summary:'Deterministic release-test record from the CDB adapter fixture.',deadline:'2026-11-30',sourceUrl:'https://www.caribank.org/',lastVerified:'2026-08-10T12:00:00Z'}]})}));
  await context.route('**/functions/v1/ftn-news-sources*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-08-10T12:00:00Z',items:[{title:'CARICOM institutional release fixture',publisher:'CARICOM',classification:'Official release',publishedAt:'2026-08-09',excerpt:'Deterministic source-adapter fixture used only by the functional release test.',url:'https://caricom.org/category/pressreleases/'}]})}));
  await context.route('**/functions/v1/ftn-live-sources*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({satellite:{imageUrl:'https://fixtures.ftn.invalid/noaa.png',sourceUrl:'https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=car&src=nav',sourceTimestamp:'2026-08-10 12:00 UTC'}})}));
}

async function scenario(name, fn, viewport={width:1280,height:900}) {
  const context = await browser.newContext({ viewport });
  await installDeterministicProviderFixtures(context);
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{
    // Chromium 140 can emit this opaque DevTools formatting diagnostic during
    // smooth scrolling; it has no page stack, does not represent a thrown FTN
    // error, and is otherwise indistinguishable from a browser-internal trace.
    // Keep all real page errors fail-closed.
    const benignBrowserDiagnostic=/^%c%d\s+font-size:0;color:transparent\s+NaN$/;
    if(m.type()==='error' && !/youtube|favicon|ERR_BLOCKED_BY_CLIENT|Failed to load resource.*404|compute-pressure is not allowed|ERR_EMPTY_RESPONSE/i.test(m.text()) && !benignBrowserDiagnostic.test(m.text())) errors.push('console: '+m.text());
  });
  try {
    await fn(page);
    if(errors.length) throw new Error(errors.join('\n'));
    results.push('PASS '+name);
  } catch (e) {
    failures.push({name,error:e?.stack||String(e)});
    results.push('FAIL '+name+' — '+e.message);
    try { await page.screenshot({path:`/tmp/${name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.png`,fullPage:true}); } catch {}
  } finally { await context.close(); }
}
async function open(page,path){
  const r=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:45000});
  assert(r && r.ok(),`${path} returned ${r?.status()}`);
  await page.waitForTimeout(250);
  const firstVisit=page.locator('.country-switcher-dialog.is-open [data-country-code="TT"]');
  if(await firstVisit.count()) {
    await firstVisit.first().click({timeout:5000});
    await page.waitForFunction(()=>!document.querySelector('.country-switcher-dialog.is-open'),{timeout:5000});
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=3,`${path} horizontal overflow ${overflow}px`);
}
async function mockGuestAuth(page){
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.supabase={createClient:function(){return{auth:{getUser:async()=>({data:{user:null},error:null}),getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}},signOut:async()=>({error:null})},functions:{invoke:async()=>({data:null,error:new Error('Protected function unavailable in guest test')})},from:function(){throw new Error('Guest test must not query private tables');}}}};`}));
}
function wavBuffer(seconds=1,sampleRate=8000){
  const samples=seconds*sampleRate, dataSize=samples*2, b=Buffer.alloc(44+dataSize);let o=0;
  const s=x=>{b.write(x,o,'ascii');o+=x.length};s('RIFF');b.writeUInt32LE(36+dataSize,o);o+=4;s('WAVE');s('fmt ');b.writeUInt32LE(16,o);o+=4;b.writeUInt16LE(1,o);o+=2;b.writeUInt16LE(1,o);o+=2;b.writeUInt32LE(sampleRate,o);o+=4;b.writeUInt32LE(sampleRate*2,o);o+=4;b.writeUInt16LE(2,o);o+=2;b.writeUInt16LE(16,o);o+=2;s('data');b.writeUInt32LE(dataSize,o);o+=4;for(let i=0;i<samples;i++){b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/sampleRate)*9000),o);o+=2;}return b;
}

await scenario('home-desktop', async page=>{await open(page,'/');await page.waitForSelector('#find-your-path',{timeout:10000});assert(await page.locator('a[href="/ibis-ai/"]').count()>0);assert(await page.locator('a[href="/riddim/"]').count()>0);assert(await page.locator('a[href="/riddim/daw/"]').count()>0);assert(await page.locator('a[href="/riddim/dj/"]').count()>0);assert(await page.locator('.eco-live-rail').count()===1,'home live tools rail missing');assert.equal(await page.locator('.country-switcher-dialog.is-open').count(),0,'country selection must not be forced');});
await scenario('home-mobile', async page=>{await open(page,'/');assert(await page.locator('.eco-live-rail').count()===1);},{width:390,height:844});

await scenario('ibis-visual-and-handoff', async page=>{
  await open(page,'/ibis-ai/?prompt=create%20a%20visual%20for%20a%20Caribbean%20film');
  await page.waitForSelector('#ibis-goal',{timeout:10000});
  assert.match(await page.locator('#ibis-goal').inputValue(),/Caribbean film/i);
  const visual=page.locator('[data-mode="visual"]'); assert(await visual.count()===1,'CREATE VISUAL mode missing');
  await visual.click();
  assert.equal(await visual.getAttribute('aria-pressed'),'true');
  await page.locator('#ibis-form').evaluate(f=>f.requestSubmit());
  await page.waitForSelector('.ibis-visual-result img',{timeout:20000});
  assert((await page.locator('.ibis-visual-result img').getAttribute('src')).startsWith('data:image/png'));
  assert(await page.locator('.ibis-visual-result a[download]').count()===1,'ibis visual download missing');
});

await scenario('mission-control-calculation', async page=>{
  await open(page,'/mission-control/demo/#correlation-engine');
  await page.waitForSelector('.mc-live-engine',{timeout:10000});
  const before=await page.locator('#mc-corr-result').innerText();
  const opts=await page.locator('#mc-corr-b option').count(); assert(opts>2,'not enough correlation variables');
  await page.locator('#mc-corr-b').selectOption({index:2});
  await page.waitForTimeout(150);
  const after=await page.locator('#mc-corr-result').innerText();
  assert.notEqual(after,before,'correlation output did not change');
  assert(await page.locator('#mc-change-list .mc-live-pair').count()>0,'change explorer empty');
});

await scenario('ftn-live-satellite', async page=>{
  await open(page,'/observatory/');
  await page.waitForSelector('.ftn-sat',{timeout:10000});
  await page.waitForFunction(()=>{const img=document.querySelector('#ftn-sat-image img');const err=document.querySelector('.ftn-sat__error');return (img&&img.complete&&img.naturalWidth>0)||!!err;},{timeout:35000});
  const image=page.locator('#ftn-sat-image img');
  const fallback=page.locator('.ftn-sat__error');
  if(await image.count()) {
    assert(await image.evaluate(i=>i.naturalWidth)>0,'NOAA satellite image element did not decode');
  } else {
    assert(await fallback.count()===1,'FTN Live produced neither image nor fallback state');
    assert.match(await fallback.innerText(),/Satellite source temporarily unavailable/i,'fallback does not explain upstream state');
    const source=page.locator('#ftn-sat-source');
    assert(await source.count()===1,'official NOAA fallback link missing');
    assert.match(await source.getAttribute('href'),/star\.nesdis\.noaa\.gov/i,'fallback does not preserve official NOAA source');
  }
  await page.waitForSelector('.obs-radar',{timeout:10000});
});

await scenario('events-workflow', async page=>{
  await open(page,'/events/');
  await page.waitForSelector('.events-public-card',{timeout:10000});
  assert.equal(await page.locator('.events-public-card').count(),5,'official-source event discovery records missing');
  assert.match(await page.locator('.events-public-card').first().innerText(),/Checked 2026-08-10/i);
  await page.fill('#events-prompt','I need a 700 person outdoor soca concert in San Fernando with a TT$250,000 working budget and security, sound and lights.');
  await page.click('#events-interpret');
  assert.equal(await page.locator('#events-form input[name="guestCount"]').inputValue(),'700','event brief did not interpret attendance');
  await page.fill('#events-form input[name="name"]','FTN Test Concert');
  await page.fill('#events-form input[name="city"]','San Fernando');
  await page.locator('#events-form').evaluate(f=>f.requestSubmit());
  await page.waitForSelector('#events-output .workspace-output',{timeout:8000});
  assert.match(await page.locator('#events-output').innerText(),/FTN Test Concert/i);
  assert((await page.locator('#events-rfq-text').inputValue()).length>200,'RFQ not generated');
  assert.match(await page.locator('#events-maps').getAttribute('href'),/google\.com\/maps/);
});

await scenario('opportunities-live', async page=>{
  await open(page,'/opportunities/');
  await page.waitForFunction(()=>document.querySelectorAll('.opp-live-card').length>0 || /unavailable/i.test(document.querySelector('#opp-results')?.innerText||''),{timeout:45000});
  const cards=await page.locator('.opp-live-card').count();assert(cards>0,'no source-backed opportunities loaded');
  await page.locator('.opp-live-card [data-save]').first().click();
  await page.waitForSelector('.opp-saved',{timeout:4000});
  assert(await page.locator('.opp-live-card a[href^="http"]').count()>0);
});

await scenario('radio-catalog', async page=>{
  await open(page,'/radio/');
  await page.waitForFunction(()=>document.querySelectorAll('.ftn-radio-live__track').length>10 || /failed|unavailable|error/i.test(document.querySelector('#ftn-radio-status')?.innerText||''),{timeout:45000});
  const n=await page.locator('.ftn-radio-live__track').count();assert(n>10,`radio only loaded ${n} tracks`);
  const titles=(await page.locator('.ftn-radio-live__track').allInnerTexts()).slice(0,30).join(' ');assert(!/mega mix|full mix|continuous mix|hour mix|roadmix/i.test(titles),'radio mix exclusion failed');
  assert.match(await page.locator('.ftn-radio-live').innerText(),/Programme owner: FTN.*Last verified: 2026-08-10/is);
  await page.locator('.ftn-radio-live__track').first().click();await page.click('#ftn-radio-favourite');assert.equal(await page.locator('#ftn-radio-favourite').innerText(),'SAVED');assert(await page.locator('#ftn-radio-share').count()===1,'Radio share control missing');
});

await scenario('dj-discovery-and-controls', async page=>{
  await open(page,'/dj-tube-prototype/?ftn=1');
  await page.waitForFunction(()=>document.querySelectorAll('[data-track]').length>10 || /failed|unavailable|error/i.test(document.querySelector('#queueStatus')?.innerText||''),{timeout:45000});
  const n=await page.locator('[data-track]').count();assert(n>10,`DJ only loaded ${n} tracks`);
  const texts=(await page.locator('[data-track]').allInnerTexts()).slice(0,40).join(' ');assert(!/mega mix|full mix|continuous mix|hour mix|roadmix/i.test(texts),'DJ mix exclusion failed');
  await page.locator('[data-track]').first().click();await page.waitForTimeout(200);
  assert(await page.locator('#playA').count()===1 && await page.locator('#playB').count()===1,'DJ transport missing');
});

await scenario('daw-live-audio', async page=>{
  await open(page,'/riddim/daw/');
  await page.locator('#file').setInputFiles({name:'ftn-test.wav',mimeType:'audio/wav',buffer:wavBuffer(2)});
  await page.waitForFunction(()=>/ftn-test/i.test(document.querySelector('#trackName')?.textContent||''),{timeout:8000});
  await page.click('#play');await page.waitForTimeout(250);
  await page.locator('#gain').evaluate(el=>{el.value='6';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(150);
  assert.match(await page.locator('#gainVal').innerText(),/6/);
  assert(!/restart playback/i.test(await page.locator('#status').innerText()),'DAW still requires restart');
});

await scenario('screen-view-and-festival', async page=>{
  await open(page,'/screen/');
  await page.waitForSelector('#screen-discovery',{timeout:10000});assert.equal(await page.locator('.screen-discovery__card').count(),3);assert.match(await page.locator('#screen-discovery').innerText(),/Pavilion\+.*checked 2026-08-10/is);assert(await page.locator('[data-screen-save]').count()===3,'Screen save actions missing');
  await page.waitForFunction(()=>document.querySelectorAll('[data-screen-video]').length>5 || /failed|unavailable|error/i.test(document.querySelector('#screen-catalog-status')?.innerText||''),{timeout:45000});
  assert(await page.locator('[data-screen-video]').count()>5,'Screen catalog empty');
  await page.waitForSelector('#screen-fest-form',{timeout:10000});
  await page.fill('#screen-fest-form input[name="title"]','FTN Test Film');
  await page.fill('#screen-fest-form input[name="runtime"]','18 minutes');
  await page.fill('#screen-fest-form textarea[name="logline"]','A test Caribbean story.');
  await page.fill('#screen-fest-form textarea[name="synopsis"]','A longer synopsis for release testing.');
  await page.fill('#screen-fest-form input[name="director"]','FTN Test');
  await page.locator('#screen-fest-form').evaluate(f=>f.requestSubmit());
  assert.match(await page.locator('#screen-fest-package').innerText(),/FTN Test Film/);
  assert(await page.locator('.screen-festival-card').count()>=5,'festival matches missing');
});

await scenario('ftn-tv-on-air', async page=>{
  await open(page,'/tv/');
  await page.waitForFunction(()=>{const f=document.querySelector('.tv-player iframe');const s=document.querySelector('#tv-status')?.textContent||'';return (f&&f.src&&/youtube/.test(f.src))||/No embeddable|failed|unavailable|error/i.test(s);},{timeout:45000});
  const src=await page.locator('.tv-player iframe').getAttribute('src');assert(src&&/youtube/.test(src),'FTN TV did not tune a YouTube source');
  assert(await page.locator('.tv-guide__row button').count()>0,'TV tune buttons missing');
});

await scenario('face-the-nation-programme-hub', async page=>{
  await open(page,'/facethenation');
  await page.waitForFunction(()=>document.querySelectorAll('.ftn-episode').length>0 || /does not currently have published episodes|unavailable|failed|error/i.test(document.querySelector('#ftn-watch-status')?.innerText||''),{timeout:45000});
  const count=await page.locator('.ftn-episode').count();
  if(!count) assert.match(await page.locator('#ftn-watch-status').innerText(),/does not currently have published episodes|failed to fetch|temporarily unavailable/i);
  assert(!/Invalid Date/i.test(await page.locator('#watch').innerText()),'Face The Nation rendered an invalid provider date');
  assert.equal(await page.locator('#watch').count(),1,'duplicate #watch section');
  assert.equal(await page.locator('.ftn-participation-form [data-turnstile-mount]').count(),3,'protected moderation gates missing');
  const moderationButton=page.locator('.ftn-participation-form button[type="submit"]').first();
  assert.match(((await moderationButton.innerText())+' '+((await moderationButton.getAttribute('data-ftn-original-label'))||'')),/Moderation|human verification/i);
});

await scenario('kaiso-newsroom', async page=>{
  await open(page,'/kaiso/');
  await page.waitForFunction(()=>document.querySelectorAll('.kaiso-story').length>0 || document.querySelectorAll('.kaiso-video').length>5 || /unavailable|failed|error/i.test((document.querySelector('#kaiso-source-status')?.innerText||'')+' '+(document.querySelector('#kaiso-video-status')?.innerText||'')),{timeout:45000});
  assert((await page.locator('.kaiso-story').count())+(await page.locator('.kaiso-video').count())>0,'Kaiso source radar empty');
  assert(!/Invalid Date/i.test(await page.locator('#kaiso-video-feed').innerText()),'Kaiso rendered an invalid provider date');
  const f=page.locator('.kaiso-tip-form');await f.locator('input[name="headline"]').fill('FTN test story');await f.locator('textarea[name="summary"]').fill('Testing newsroom draft and verification workflow.');await f.locator('input[name="consent"]').check();await f.evaluate(el=>el.requestSubmit());await page.waitForTimeout(200);assert.match(await page.locator('#kaiso-history-list').innerText(),/FTN test story/i);
});

await scenario('display-network-studio', async page=>{
  await open(page,'/display-network/');await page.waitForSelector('#dn-add-content',{timeout:10000});
  await page.fill('#dn-content-title','Flood warning test');await page.fill('#dn-content-message','Avoid the low-lying road until cleared.');await page.click('#dn-add-content');assert.match(await page.locator('#dn-preview').innerText(),/Flood warning test/);assert(await page.locator('.dn-item').count()>0);
});

await scenario('love-public-entry-fails-closed-for-guest', async page=>{
  await mockGuestAuth(page);await open(page,'/love/');await page.waitForSelector('#love-private-root .nexus-card',{timeout:10000});assert.match(await page.locator('#love-private-root').innerText(),/Private access unavailable/i);assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'index,follow');
});

await scenario('parliament-source-directory', async page=>{await open(page,'/parliament/');assert.equal(await page.locator('.ftn-source-card').count(),4);await page.fill('#parliament-search','committee');assert.equal(await page.locator('.ftn-source-card').count(),1);assert.match(await page.locator('.ftn-source-card').innerText(),/Parliament of Trinidad and Tobago.*2026-08-10/is);});

await scenario('invest-learning-watchlist', async page=>{await open(page,'/invest/');assert.equal(await page.locator('#invest-sources .nexus-card').count(),3);await page.locator('[data-watch]').first().click();assert.match(await page.locator('#invest-watchlist').innerText(),/Investor education/i);assert.match(await page.locator('main').innerText(),/not (?:investment |personalized )?advice|not brokerage/i);});

await scenario('health-phase-two-only', async page=>{await open(page,'/health/');assert.match(await page.locator('main').innerText(),/PHASE 2/i);assert.equal(await page.locator('main input,main textarea,main select').count(),0,'Health preview must not collect health data');assert.match(await page.locator('main').innerText(),/not (?:a )?(?:live )?health|does not provide medical/i);});

await scenario('account-guest-state', async page=>{await mockGuestAuth(page);await open(page,'/account/');await page.waitForSelector('#account-email-form',{timeout:10000});assert.match(await page.locator('#account-state').innerText(),/Guest/);assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);});

await scenario('god-mode-denied-to-guest', async page=>{await mockGuestAuth(page);await open(page,'/god-mode/');await page.waitForTimeout(300);assert.match(await page.locator('#god-mode-root').innerText(),/Authorization required/i);assert.equal(await page.locator('[data-emergency]').count(),0,'owner controls must not render for guest');assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);});

await scenario('pwa-private-cache-exclusion', async page=>{await open(page,'/');var manifest=await page.evaluate(()=>fetch('/manifest.webmanifest').then(r=>r.json()));assert(!JSON.stringify(manifest).includes('/god-mode'),'public manifest advertises God Mode');assert(!JSON.stringify(manifest).includes('/love/'),'public manifest advertises private Love');var sw=await page.evaluate(()=>fetch('/service-worker.js').then(r=>r.text()));assert(/god-mode\|account\|love\|ibis-ai/.test(sw),'service worker private-route exclusion missing');});

await scenario('riddim-hub-links', async page=>{
  await open(page,'/riddim/');assert(await page.locator('a[href="/riddim/daw/"]').count()>0,'DAW link missing');assert(await page.locator('a[href="/riddim/dj/"]').count()>0,'DJ link missing');await page.click('#riddim-track-choice');await page.waitForSelector('#riddim-form',{timeout:5000});
});

for (const path of ['/about/','/applications/','/contact/','/news/','/insights/','/resources/','/top-picks/','/trust/','/glossary/','/investor-room/']) {
  await scenario('route-'+path.replaceAll('/','-'), async page=>{await open(page,path);assert(await page.locator('main').count()===1);});
}

await browser.close();
console.log(results.join('\n'));
if (failures.length) {
  console.error('\nFAILED SCENARIOS');
  for (const f of failures) console.error('\n### '+f.name+'\n'+f.error);
  process.exit(1);
}
console.log(`\n${results.length} functional scenarios passed.`);
