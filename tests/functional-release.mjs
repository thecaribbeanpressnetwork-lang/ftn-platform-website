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
  await context.route('https://www.youtube.com/iframe_api',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.YT={PlayerState:{ENDED:0,PLAYING:1,PAUSED:2},Player:function(id,o){this._state=2;this.loadVideoById=this.cueVideoById=function(){};this.playVideo=()=>{this._state=1;setTimeout(()=>o&&o.events&&o.events.onStateChange&&o.events.onStateChange({data:1,target:this}),0);};this.pauseVideo=()=>{this._state=2;setTimeout(()=>o&&o.events&&o.events.onStateChange&&o.events.onStateChange({data:2,target:this}),0);};this.getPlayerState=()=>this._state;this.setVolume=function(){};this.getCurrentTime=()=>0;this.getDuration=()=>180;setTimeout(()=>o&&o.events&&o.events.onReady&&o.events.onReady({target:this}),0)}};setTimeout(()=>window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady(),0);`}));
  await context.route(/https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/.*/,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Authorized fixture embed</title>'}));
  await context.route('**/functions/v1/dj-tube-discovery',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:fixtureTracks,providers:{fixture:true},fetchedAt:'2026-08-10T12:00:00Z'})}));
  await context.route('**/functions/v1/ftn-opportunities*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-08-10T12:00:00Z',warnings:[],items:[{title:'Caribbean Climate Programme Call',organization:'CARICOM Fixture Authority',country:'Regional',type:'Programme',sector:'Climate',summary:'Deterministic release-test record from an official-source adapter fixture.',deadline:'2026-12-15',sourceUrl:'https://caricom.org/',lastVerified:'2026-08-10T12:00:00Z'},{title:'Caribbean Development Procurement Notice',organization:'Caribbean Development Bank',country:'Barbados',type:'Tender',sector:'Procurement',summary:'Deterministic release-test record from the CDB adapter fixture.',deadline:'2026-11-30',sourceUrl:'https://www.caribank.org/',lastVerified:'2026-08-10T12:00:00Z'}]})}));
  await context.route('**/functions/v1/ftn-news-sources*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-08-11T12:00:00Z',items:[{title:'Member States and Associate Members',publisher:'CARICOM Press Releases',classification:'Official institutional release',publishedAt:null,excerpt:'menu-item-type-post_type menu-item-object-page <li class="menu-item">',url:'https://caricom.org/member-states-and-associate-members/'},{title:'CARICOM institutional release fixture',publisher:'CARICOM Press Releases',classification:'Official institutional release',publishedAt:'2026-08-09',excerpt:'Deterministic source-adapter fixture used only by the functional release test.',url:'https://caricom.org/caricom-institutional-release-fixture/'}],localItems:[{title:'The &#8216;Caribbean&#8217; source fixture',publisher:'Trinidad & Tobago Guardian',classification:'Publisher headline',publishedAt:'2026-08-11',verificationState:'Attributed publisher headline; FTN has not independently verified the report',url:'https://www.guardian.co.tt/news/local-fixture-6.2.1.test'},{title:'Closed publisher fixture',publisher:'Trinidad and Tobago Newsday',classification:'Publisher headline',publishedAt:'2026-08-11',verificationState:'This outlet must not render.',url:'https://newsday.co.tt/2026/08/11/closed-publisher-fixture/'}]})}));
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

await scenario('home-desktop', async page=>{await open(page,'/');assert.equal(await page.locator('.site-header--dark').count(),1,'homepage header must use the approved black surface');assert.equal(await page.locator('.ecosystem-hero__actions .btn').count(),2,'homepage hero must have exactly two actions');assert.equal(await page.locator('.ecosystem-hero h1').innerText(),'THE CARIBBEAN\nECOSYSTEM.');assert.match(await page.locator('.ecosystem-hero__copy>p').innerText(),/^One connected home for the region’s public life, information, culture and opportunity\.$/);assert.equal(await page.locator('[data-ecosystem-reveal]').isHidden(),true,'ecosystem directory must start collapsed');await page.locator('[data-ecosystem-toggle]').click();await page.waitForSelector('[data-ecosystem-reveal]:not([hidden])');assert.equal(await page.locator('[data-ecosystem-toggle]').getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.ftn-directory-group').count(),6,'registry ecosystem group count changed');assert.equal(await page.locator('.ecosystem-product-link').count(),23,'complete grouped ecosystem is not revealed');assert.equal(await page.locator('.ecosystem-product-link[href="/account/"]').count(),0,'FTN Account became a first-class public product card');assert.equal(await page.locator('.ftn-account-utility a[href="/account/"]').count(),1,'FTN Account shared utility is missing');assert.equal(await page.locator('.ecosystem-product-link[href="/love/"],.ecosystem-product-link[href="/health/"],.ecosystem-product-link[href="/mission-control/"]').count(),0,'private or vaulted work leaked into the public reveal');assert(await page.locator('.ecosystem-product-link[href="/ibis-ai/"]').count()===1);assert(await page.locator('.ecosystem-product-link[href="/govern/"]').count()===1);const text=await page.locator('body').innerText();assert.doesNotMatch(text,/See what is happening now|Strengthen your community|Partner with FTN/);assert(await page.getByRole('link',{name:'FTN Invest-in',exact:true}).count()>0,'FTN Invest-in header path missing');});
await scenario('home-release-assets-versioned', async page=>{await open(page,'/');assert.match(await page.locator('link[href*="ecosystem-homepage-refinement.css"]').getAttribute('href'),/\?v=20260823\.1$/,'homepage refinement CSS is not cache-versioned');assert.match(await page.locator('script[src*="ecosystem-homepage.js"]').getAttribute('src'),/\?v=20260819\.1$/,'homepage interaction is not cache-versioned');assert.match(await page.locator('script[src*="product-registry-data.js"]').getAttribute('src'),/\?v=20260822\.1$/,'homepage registry is not cache-versioned');});
await scenario('home-mobile', async page=>{await open(page,'/');assert.equal(await page.locator('.ecosystem-hero__actions .btn').count(),2);await page.locator('[data-ecosystem-toggle]').press('Enter');await page.waitForSelector('[data-ecosystem-reveal]:not([hidden])');assert.equal(await page.locator('[data-ecosystem-toggle]').getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.ecosystem-product-link').count(),23);},{width:390,height:844});

await scenario('header-nav-usable-at-squeeze-width', async page=>{
  // Founder walkthrough defect #16: the header was reduced from 11 items to 5 (js/nav.js
  // PRIMARY_NAV) specifically because the previous progressive-reveal breakpoints shrank nav text
  // to an unreadable 11px in the 1240-1439px band once enough items were showing. Regression-guard
  // both the item count and a real usable minimum text size at exactly that width, not just that
  // the header exists.
  await open(page,'/');
  // 5 flat PRIMARY_NAV items (js/nav.js) plus the single "FTN Ecosystem" mega-menu trigger = 6.
  assert.equal(await page.locator('.site-nav__item').count(),6,'header nav item count changed from the founder-approved 5 flat items + Ecosystem trigger');
  const homeNavFontPx=await page.locator('.site-nav__trigger').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert(homeNavFontPx>=13,`homepage header nav text is ${homeNavFontPx}px, below a usable minimum at this width -- css/components/ecosystem-homepage-refinement.css .site-header--dark .site-nav__trigger--link had its own separate, unguarded 11px override`);
  // Sign In is deliberately hidden on the homepage itself (.ecosystem-home [data-sign-in-entry])
  // -- check nav text and control height on a second, non-homepage page where it actually renders.
  await open(page,'/clock/');
  const navFontPx=await page.locator('.site-nav__trigger').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert(navFontPx>=13,`header nav text is ${navFontPx}px, below a usable minimum at this width`);
  const btnHeight=await page.locator('.site-header__actions .btn').first().evaluate(el=>el.getBoundingClientRect().height);
  assert(btnHeight>=28,`header Sign In control is ${btnHeight}px tall, below a usable minimum`);
}, {width:1300,height:900});

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

await scenario('scenario-workspace-calculation', async page=>{
  await open(page,'/scenario-workspace/#correlation-engine');
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

await scenario('opportunities-card-title-visible', async page=>{
  // Founder visual redteam: .opp-live-card h3 had no explicit color, so it inherited white from
  // the page's ambient dark theme while sitting on the card's own white background -- the single
  // most important field (the opportunity's title) rendered completely invisible, white-on-white.
  await open(page,'/opportunities/');
  await page.waitForFunction(()=>document.querySelectorAll('.opp-live-card').length>0,{timeout:45000});
  const style=await page.evaluate(()=>{
    const h3=document.querySelector('.opp-live-card h3');
    const card=document.querySelector('.opp-live-card');
    return {textColor:getComputedStyle(h3).color, cardBg:getComputedStyle(card).backgroundColor};
  });
  assert.notEqual(style.textColor,'rgb(255, 255, 255)','opportunity card title is white text -- invisible against the card\'s white background');
});

await scenario('invest-hero-has-image-and-fits-first-screen', async page=>{
  await open(page,'/invest/');
  await page.waitForSelector('.investin-hero__media img',{state:'visible',timeout:10000});
  const hero=await page.evaluate(()=>{
    const section=document.querySelector('.investin-hero');
    const image=section.querySelector('.investin-hero__media img');
    return {
      height:section.getBoundingClientRect().height,
      viewportHeight:innerHeight,
      imageWidth:image.naturalWidth,
      copyAnimation:getComputedStyle(section.querySelector('.investin-hero__copy')).animationName
    };
  });
  assert(hero.imageWidth>0,'Invest-in hero image did not load');
  assert(hero.height<=hero.viewportHeight*1.08,`Invest-in hero (${hero.height}px) overwhelms the first screen (${hero.viewportHeight}px)`);
  assert.notEqual(hero.copyAnimation,'none','Invest-in hero has no perceptible page-specific entrance motion');
});

await scenario('radio-catalog', async page=>{
  await open(page,'/radio/');
  await page.waitForFunction(()=>document.querySelectorAll('.ftn-radio-live__track').length>10 || /failed|unavailable|error/i.test(document.querySelector('#ftn-radio-status')?.innerText||''),{timeout:45000});
  const n=await page.locator('.ftn-radio-live__track').count();assert(n>10,`radio only loaded ${n} tracks`);
  const titles=(await page.locator('.ftn-radio-live__track').allInnerTexts()).slice(0,30).join(' ');assert(!/mega mix|full mix|continuous mix|hour mix|roadmix/i.test(titles),'radio mix exclusion failed');
  assert.match(await page.locator('.ftn-radio-live').innerText(),/Programme owner: FTN.*Last verified: 2026-08-11/is);
  await page.locator('.ftn-radio-live__track').first().click();await page.click('#ftn-radio-favourite');assert.equal(await page.locator('#ftn-radio-favourite').innerText(),'SAVED');assert(await page.locator('#ftn-radio-share').count()===1,'Radio share control missing');
  // Founder walkthrough defect #1: the PLAY/PAUSE button used to flip optimistically on click,
  // with no confirmation the embed actually started -- js/radio-player.js now waits for the
  // player's own real onStateChange (PLAYING/PAUSED) before updating this text.
  await page.click('#ftn-radio-play');
  await page.waitForFunction(()=>document.querySelector('#ftn-radio-play')?.textContent==='PAUSE',{timeout:10000});
  assert.match(await page.locator('#ftn-radio-status').innerText(),/Playing now/i,'radio status did not confirm real playback');
  await page.click('#ftn-radio-play');
  await page.waitForFunction(()=>document.querySelector('#ftn-radio-play')?.textContent==='PLAY',{timeout:10000});
});

await scenario('radio-empty-source-state', async page=>{
  await page.route('**/functions/v1/dj-tube-discovery',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],providers:{},fetchedAt:'2026-08-12T12:00:00Z'})}));
  await open(page,'/radio/');
  await page.waitForSelector('#ftn-radio-status',{timeout:10000});
  await page.waitForTimeout(250);
  assert.doesNotMatch(await page.locator('#ftn-radio-title').innerText(),/loading/i);
  assert.match(await page.locator('#ftn-radio-status').innerText(),/no attributed tracks are available/i);
  for(const id of ['#ftn-radio-play','#ftn-radio-next','#ftn-radio-favourite','#ftn-radio-share']) assert.equal(await page.locator(id).isDisabled(),true,`${id} must be disabled without a track`);
});

await scenario('radio-creator-delivery',async page=>{await open(page,'/radio/');await page.waitForSelector('#radio-submit-form');assert.equal(await page.locator('text=Programming Desk').count(),0);assert.equal(await page.locator('#radio-submit-form [name="delivery"]').count(),1);assert.equal(await page.locator('#radio-submit-form [name="origin"]').count(),1);assert.equal(await page.locator('.radio-submit-dock').count(),0,'giant fixed radio submit button returned');assert.equal(await page.locator('.radio-knob').count(),0,'phone-hostile radio knob returned');assert.equal(await page.locator('input[type="range"]').count()>0,true,'radio slide dial missing');});

await scenario('radio-workspace-media-guards', async page=>{
  // Founder walkthrough defects #13/#14/#15: EPK photos and local audio previously shared a MIME-
  // routing bug (an audio file misclassified into the photo pipeline and vice versa) with no way
  // to remove either. Each guard checks file.type, not the accept attribute or extension, so
  // setInputFiles here deliberately sets a real (mismatched) MIME type per file.
  await open(page,'/radio/');
  await page.waitForSelector('#epk-photo-files');
  await page.waitForSelector('#radio-audio-files');
  await page.setInputFiles('#epk-photo-files', { name: 'track.jpg', mimeType: 'audio/mpeg', buffer: Buffer.from([0,0,0,0]) });
  await page.waitForSelector('#workspace-notification:not([hidden])');
  assert.match(await page.locator('#workspace-notification').innerText(), /not an image/i, 'EPK photo intake accepted an audio-typed file');
  assert.equal(await page.locator('#epk-photo-preview img').count(), 0, 'audio-typed file rendered as an EPK photo preview');
  await page.setInputFiles('#radio-audio-files', { name: 'photo.mp3', mimeType: 'image/png', buffer: Buffer.from([0,0,0,0]) });
  await page.waitForSelector('#workspace-notification:not([hidden])');
  assert.match(await page.locator('#workspace-notification').innerText(), /not an audio file/i, 'local audio intake accepted an image-typed file');
  assert.equal(await page.locator('#radio-audio-library audio').count(), 0, 'image-typed file rendered as a local audio track');
  await page.setInputFiles('#epk-photo-files', { name: 'press.png', mimeType: 'image/png', buffer: Buffer.from([0,0,0,0]) });
  await page.waitForSelector('#epk-photo-preview img');
  assert.equal(await page.locator('#epk-photo-preview figure').count(), 1, 'valid EPK photo did not render');
  await page.setInputFiles('#radio-audio-files', { name: 'track.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from([0,0,0,0]) });
  await page.waitForSelector('#radio-audio-library audio');
  assert.equal(await page.locator('#radio-audio-library .local-audio-item').count(), 1, 'valid local audio track did not render');
  assert.equal(await page.locator('#radio-audio-library img').count(), 0, 'local audio track rendered an <img> instead of an <audio> control');
  await page.click('#radio-audio-library [data-remove-track="0"]');
  await page.waitForFunction(()=>document.querySelectorAll('#radio-audio-library .local-audio-item').length===0);
  assert.equal(await page.locator('#radio-audio-clear').isHidden(), true, 'Clear all local tracks did not hide once the library was emptied by removal');
  // Regression guard for the [hidden]-vs-.btn{display:inline-flex} cascade bug (an author-origin
  // display: declaration beats the UA [hidden]{display:none} rule regardless of specificity) --
  // this exact bug hid Clock's face/personalize toggles and the sitewide ibis widget earlier in
  // this release; check the real computed style, not just the hidden attribute or a bounding box.
  assert.equal(await page.locator('#radio-audio-clear').evaluate(el=>getComputedStyle(el).display),'none','#radio-audio-clear[hidden] is not actually computed display:none');
  await page.click('#epk-photo-preview button');
  await page.waitForFunction(()=>document.querySelectorAll('#epk-photo-preview figure').length===0);
});

await scenario('dj-discovery-and-controls', async page=>{
  // Pass 16 DJ Tube consolidation: /dj-tube-prototype/?ftn=1 (the old standalone iframe target)
  // now redirects to the real, consolidated workstation at /riddim/dj/ -- no iframe boundary, no
  // [data-track] attribute (that was the deleted js/dj-tube-prototype.js's own convention). The
  // real discovery-result markup is `.item` per track, with `[data-load]` action buttons
  // (DECK A / DECK B) inside each -- see js/ftn-dj-workstation.js.
  await open(page,'/riddim/dj/');
  await page.waitForFunction(()=>document.querySelectorAll('.item').length>10 || /failed|unavailable|error/i.test(document.querySelector('#queueStatus')?.innerText||''),{timeout:45000});
  const n=await page.locator('.item').count();assert(n>10,`DJ only loaded ${n} tracks`);
  const texts=(await page.locator('.item').allInnerTexts()).slice(0,40).join(' ');assert(!/mega mix|full mix|continuous mix|hour mix|roadmix/i.test(texts),'DJ mix exclusion failed');
  await page.locator('[data-load]').first().click();await page.waitForTimeout(200);
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
  assert.match(await page.locator('#status').innerText(),/Live change applied: gain/i,'DAW did not acknowledge the active processing change');
  assert(!/restart playback/i.test(await page.locator('#status').innerText()),'DAW still requires restart');
  const downloadEvent=page.waitForEvent('download');await page.click('#mp3');const download=await downloadEvent;
  assert.match(download.suggestedFilename(),/\.mp3$/i,'DAW did not produce an MP3 download');
  await page.waitForFunction(()=>/Processed MP3 downloaded/i.test(document.querySelector('#status')?.textContent||''),{timeout:12000});
});

await scenario('screen-view-and-festival', async page=>{
  await open(page,'/screen/');
  await page.waitForSelector('#screen-discovery',{timeout:10000});assert.equal(await page.locator('.screen-discovery__card').count(),3);assert.match(await page.locator('#screen-discovery').innerText(),/Pavilion\+.*checked 2026-08-12/is);assert(await page.locator('[data-screen-save]').count()===3,'Screen save actions missing');
  // Filmmaker tool catalogue and Festival & Distribution Desk render inside collapsed native
  // <details> (js/screen-progressive-disclosure.js) so discovery isn't buried under ~7000px of
  // creator tooling on first load -- open each one before asserting on its contents.
  await page.waitForSelector('#screen-tool-catalog',{state:'attached',timeout:10000});
  await page.locator('#screen-tool-catalog').locator('xpath=ancestor::details[1]/summary').click();
  await page.waitForSelector('#screen-tool-catalog',{timeout:10000});assert.equal(await page.locator('.screen-tools__grid article').count(),8,'verified filmmaker tool catalogue missing');
  await page.waitForFunction(()=>document.querySelectorAll('[data-screen-video]').length>5 || /failed|unavailable|error/i.test(document.querySelector('#screen-catalog-status')?.innerText||''),{timeout:45000});
  assert(await page.locator('[data-screen-video]').count()>5,'Screen catalog empty');
  await page.waitForSelector('#screen-fest-form',{state:'attached',timeout:10000});
  await page.locator('#screen-fest-form').locator('xpath=ancestor::details[1]/summary').click();
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
  assert(await page.locator('.tv-guide__row button').count()>0,'TV tune buttons missing');assert.equal(await page.locator('.tv-parliament-source a[href*="ttparliament.org"]').count(),1,'official Parliament TV source missing');
  // Founder walkthrough defect #9: the player and the NOW panel disagreed on what was airing,
  // caused by an earlier, slower discovery response landing after a newer one and overwriting the
  // UI -- js/tv-guide.js now captures a per-tune token and drops any response that arrives after a
  // newer tune has already started. Real discovery results are non-deterministic (a live search),
  // so the race itself is forced deterministically: the first discover() call is made to resolve
  // AFTER the second one, with distinguishable fake titles, so a real race is guaranteed and the
  // outcome is checkable.
  await page.evaluate(()=>{
    var real=window.FTN.MediaDiscovery.discover, n=0;
    window.FTN.MediaDiscovery.discover=function(opts,ctrl){
      n++; var call=n;
      var fake={results:[{videoId:'racetest'+call,title:'Race Test Result '+call,channel:'FTN Test Fixture',thumbnail:''}]};
      return new Promise(function(resolve){ setTimeout(function(){ resolve(fake); }, call===1?600:50); });
    };
  });
  const rows=page.locator('.tv-guide__row');
  await rows.nth(0).locator('[data-tv-tune]').click();
  await rows.nth(1).locator('[data-tv-tune]').click();
  await page.waitForTimeout(900);
  assert.equal(await page.locator('#tv-title').innerText(),'Race Test Result 2','the slower, stale first discovery response overwrote the second (real) tune');
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
  await page.waitForFunction(()=>document.querySelectorAll('.kaiso-story').length>0 || /unavailable|failed|error/i.test(document.querySelector('#kaiso-source-status')?.innerText||''),{timeout:45000});
  assert(await page.locator('.kaiso-story').count()>0,'Kaiso source radar empty');
  assert(!/Invalid Date/i.test(await page.locator('#kaiso-source-status').innerText()),'Kaiso rendered an invalid provider date');assert.match(await page.locator('#kaiso-local-feed').innerText(),/Guardian.*Attributed publisher headline/is);assert.equal(await page.locator('a[href*="trinidadexpress.com"]').count(),1,'Express direct source missing');assert.equal(await page.locator('a[href*="youtube.com/c/IanAlleyne"]').count(),0,'unapproved local source lane rendered');assert.equal(await page.locator('.kaiso-video').count(),0,'public video discovery returned to FTN Kaiso');
  const sourceText=await page.locator('#kaiso-official-feed').innerText();assert.doesNotMatch(sourceText,/menu-item|Member States and Associate Members/i,'malformed CARICOM navigation content rendered');
  const localText=await page.locator('#kaiso-local-feed').innerText();assert.doesNotMatch(localText,/Newsday|Closed publisher|&#8216;/i,'closed or encoded local source content rendered');assert.match(localText,/The ‘Caribbean’ source fixture/,'publisher entities were not decoded');
  const f=page.locator('.kaiso-tip-form');await f.locator('input[name="headline"]').fill('FTN test story');await f.locator('textarea[name="summary"]').fill('Testing newsroom draft and verification workflow.');await f.locator('input[name="consent"]').check();await f.evaluate(el=>el.requestSubmit());await page.waitForTimeout(200);assert.match(await page.locator('#kaiso-history-list').innerText(),/FTN test story/i);
});

await scenario('public-truth-language', async page=>{
  await open(page,'/observatory/');
  const liveText=await page.locator('main').innerText();assert.doesNotMatch(liveText,/Trinidad & Tobago, live\.|Pause Live Updates|demonstration data|no live external feeds yet/i);assert.match(liveText,/modelled|illustrative/i);
  await open(page,'/contact/');
  const contactText=await page.locator('main').innerText();assert.doesNotMatch(contactText,/Testing the Community Connect public release|Community Connect Release Feedback/i);assert.doesNotMatch(contactText,/engaged with Mission Control/i);
  await open(page,'/applications/');assert.doesNotMatch(await page.locator('main').innerText(),/Choose your doorway/i);
});

await scenario('observer-hero-clocks-no-clipping', async page=>{
  // Autonomous QA find: at intermediate widths (~1024-1400px) the "Trust Card" button inside
  // each .hero-clock card visually escaped its own card into the page background -- caused by
  // .hero-clock__meta being a non-wrapping flex row under real space pressure once
  // .observatory-hero__grid splits into a 1.4fr/1fr layout at the same 1024px .hero-clocks
  // switches to 4 columns. Tests the invariant (every card's action control stays inside its own
  // card) at the width that actually broke, not a specific pixel snapshot.
  await open(page,'/observatory/');
  await page.waitForSelector('.hero-clock .trust-trigger');
  const escapes=await page.evaluate(()=>Array.from(document.querySelectorAll('.hero-clock')).map(card=>{
    const c=card.getBoundingClientRect(), t=card.querySelector('.trust-trigger').getBoundingClientRect();
    return { right: Math.round(t.right-c.right), bottom: Math.round(t.bottom-c.bottom) };
  }));
  escapes.forEach((e,i)=>{
    assert(e.right<=2,`hero-clock card ${i}: Trust Card button escapes its card by ${e.right}px on the right`);
    assert(e.bottom<=2,`hero-clock card ${i}: Trust Card button escapes its card by ${e.bottom}px on the bottom`);
  });
  assert.equal(await page.locator('.observatory-hero .trust-badge--modelled').count(),0,'Observer hero leads with modelled data instead of current or official source views');
  assert.equal(await page.locator('#pause-toggle').count(),0,'Observer hero still promotes a control for pausing modelled counters');
}, {width:1024,height:900});

await scenario('observer-public-trust-score-opens-evidence', async page=>{
  await open(page,'/observatory/');
  await page.waitForSelector('.indicator-card [data-trust-card]',{state:'visible'});
  const wall=page.locator('#indicator-wall');
  assert.doesNotMatch(await page.locator('body').innerText(),/illustrative|illustrated|modelled|FTN Derived/i,'retired confidence-lowering language remains visible on Observer');
  assert.equal(await wall.getByText(/FTN Modelled|FTN Derived|FTN Estimated|Illustrative/i).count(),0,'technical evidence classifications are exposed on the public indicator wall');
  assert.equal(await page.getByText(/See the Math/i).count(),0,'a redundant See the Math action is exposed outside the Trust Card');
  assert.match(await wall.locator('.trust-badge').first().innerText(),/^Trust Score \d+\/100$/,'public indicator badge does not show a Trust Score');
  await wall.locator('[data-trust-card]').first().click();
  const dialog=page.locator('#trust-card-dialog');
  await dialog.waitFor({state:'visible'});
  assert.match(await dialog.innerText(),/How this Trust Score is calculated/,'Trust Score explanation is missing from the Trust Card');
  assert.doesNotMatch(await dialog.innerText(),/FTN Modelled|FTN Derived|FTN Estimated|Illustrative/i,'internal data-state language leaked into the visitor-facing Trust Card');
  assert.match(await dialog.innerText(),/Score = identifiable-source base/,'Trust Score traceability formula is missing');
  await dialog.getByText('See the Math',{exact:true}).click();
  assert.match(await dialog.innerText(),/Vdisplay\(t\) = Vsource\(t\)|V\(t\) = round|P\(t\) = 100|D\(t\) = max/,'Trust Card does not disclose a calculation formula');
});

await scenario('observer-crime-series-and-period-control', async page=>{
  await open(page,'/observatory/');
  await page.waitForSelector('#crime-intelligence .crime-kpi',{state:'visible'});
  const crime=page.locator('#crime-intelligence');
  assert.match(await crime.innerText(),/2026 recorded murders\s+120/,'current official TTPS murder total is blank or incorrect');
  assert.equal(await crime.locator('.crime-chart__dot').count(),10,'CSO annual murder series is incomplete');
  assert.equal(await crime.locator('.crime-bar').count(),9,'CSO police-division comparison is incomplete');
  await crime.getByRole('button',{name:'Week'}).click();
  assert.match(await crime.innerText(),/Collecting official daily snapshots/,'weekly comparison fabricates a change before enough official snapshots exist');
});

await scenario('display-network-studio', async page=>{
  await open(page,'/display-network/');await page.waitForSelector('#dn-add-content',{timeout:10000});
  assert.match(await page.locator('.dn-opening-actions').innerText(),/Host a screen.*verified message/is);await page.fill('#dn-content-title','Flood warning test');await page.fill('#dn-content-message','Avoid the low-lying road until cleared.');await page.click('#dn-add-content');assert.match(await page.locator('#dn-preview').innerText(),/Flood warning test/);assert(await page.locator('.dn-item').count()>0);
});

await scenario('display-orientation-and-customize', async page=>{
  // Founder walkthrough defects #3/#4/#5: orientation used to have zero visible effect outside
  // fullscreen, and Display had no way to choose which modules a specific commercial screen shows
  // or how densely they're packed. Regression-guard real rendered geometry changing, not just an
  // aria-pressed flag, plus the Customize module-visibility + density system actually mutating the
  // DOM and persisting.
  await open(page,'/display/');
  await page.waitForSelector('#display-pulse .pulse-card');
  // Same [hidden]-vs-.btn{display:inline-flex} cascade bug class as radio-workspace-media-guards
  // -- the rotate-pause toggle must be genuinely invisible (and non-interactive) outside
  // fullscreen, not merely carrying the hidden attribute while an author display: wins the cascade.
  assert.equal(await page.locator('#display-rotate-toggle').evaluate(el=>getComputedStyle(el).display),'none','#display-rotate-toggle[hidden] is not actually computed display:none outside fullscreen');
  await page.click('[data-orientation-option="portrait"]');
  const portraitCols=await page.locator('.display-pulse').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  await page.click('[data-orientation-option="landscape"]');
  const landscapeCols=await page.locator('.display-pulse').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  assert.notEqual(portraitCols,landscapeCols,'Display orientation toggle has no visible effect on rendered geometry');
  assert.equal(await page.locator('[data-orientation-option="landscape"]').getAttribute('aria-pressed'),'true');
  await page.click('#display-customize-toggle');
  await page.waitForSelector('.ftn-sheet.is-open');
  assert.equal(await page.locator('input[data-module]').count(),6,'Customize must list exactly the six real Display modules');
  await page.click('[data-preset="newsroom"]');
  await page.waitForFunction(()=>document.querySelectorAll('.display-module-hidden').length===2);
  assert.equal(await page.locator('#display-pulse.display-module-hidden').count(),1,'Newsroom preset did not hide National Pulse');
  await page.click('input[name="display-density"][value="dense"]');
  await page.waitForFunction(()=>document.body.getAttribute('data-display-density')==='dense');
  await page.click('[data-preset="general"]');
  await page.click('input[name="display-density"][value="focus"]');
  await page.waitForFunction(()=>document.querySelectorAll('.display-module-hidden').length===0 && document.body.getAttribute('data-display-density')==='focus');
  await page.click('[data-sheet-close]');
  // Redteam state-machine check: an unusual but reasonable order (density set, THEN orientation
  // changed, THEN fullscreen entered, all while the earlier state is still active) must not
  // combine into overflow -- each control's effect is independent, not mutually exclusive.
  await page.click('#display-customize-toggle');
  await page.waitForSelector('.ftn-sheet.is-open');
  await page.click('input[name="display-density"][value="dense"]');
  await page.click('[data-sheet-close]');
  await page.click('[data-orientation-option="portrait"]');
  await page.evaluate(()=>document.body.classList.add('display-fullscreen'));
  await page.waitForTimeout(200);
  const overflow=await page.evaluate(()=>({x:document.documentElement.scrollWidth-window.innerWidth,y:document.documentElement.scrollHeight-window.innerHeight}));
  assert(overflow.x<=2&&overflow.y<=2,`Dense + Portrait + Fullscreen combination overflows: ${JSON.stringify(overflow)}`);
  // Reset back to defaults so this scenario leaves no state behind for others.
  await page.evaluate(()=>document.body.classList.remove('display-fullscreen'));
  await page.click('[data-orientation-option="auto"]');
  await page.click('#display-customize-toggle');
  await page.waitForSelector('.ftn-sheet.is-open');
  await page.click('input[name="display-density"][value="focus"]');
  await page.click('[data-sheet-close]');
});

await scenario('sheet-rapid-open-close-cleanup', async page=>{
  // Redteam state-machine check: rapidly opening and Escape-closing the shared FTN.Sheet
  // shouldn't leak orphaned DOM nodes or leave a stuck "is-open" sheet behind, and it must still
  // work normally immediately afterward.
  await open(page,'/display/');
  await page.waitForSelector('#display-pulse .pulse-card');
  for (let i=0;i<5;i++){
    await page.click('#display-customize-toggle');
    await page.waitForTimeout(80);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.ftn-sheet').count(),0,'rapid open/close left orphaned .ftn-sheet DOM nodes');
  await page.click('#display-customize-toggle');
  await page.waitForSelector('.ftn-sheet.is-open');
  assert.equal(await page.locator('input[data-module]').count(),6,'Customize sheet did not render correctly after the rapid open/close stress sequence');
  await page.click('[data-sheet-close]');
});

await scenario('love-vaulted-outside-public-discovery', async page=>{
  await open(page,'/love/');assert.match(await page.locator('main').innerText(),/not publicly available|service is not open/i);assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');assert.equal(await page.locator('#love-private-root').count(),0);assert.equal(await page.locator('script[src*="ftn-auth"],script[src*="love-private"]').count(),0);
});

await scenario('govern-official-pathways',async page=>{await open(page,'/govern/');assert.equal(await page.locator('.govern-card').count(),4);assert.equal(await page.locator('a[href="https://ttconnect.gov.tt/"]').count(),2);assert.match(await page.locator('main').innerText(),/not a government department/i);});

await scenario('applications-progressive-directory',async page=>{await open(page,'/applications/');assert(await page.locator('.ftn-directory-card').count()>=20);assert.equal(await page.locator('.ftn-directory-card a[href="/love/"],.ftn-directory-card a[href="/health/"]').count(),0);assert.equal(await page.locator('.ftn-directory-card a[href="/govern/"]').count(),1);assert.equal(await page.locator('main').getByText('Mission Control',{exact:true}).count(),0);assert.doesNotMatch(await page.locator('main').innerText(),/\bBETA\b/);});

await scenario('parliament-source-directory', async page=>{await open(page,'/parliament/');assert.equal(await page.locator('.parl-source-card').count(),27);assert.equal(await page.locator('#parliament-country').inputValue(),'tt');assert.match(await page.locator('#parliament-watch').innerText(),/Public Administration|Trinidad and Tobago/i);await page.selectOption('#parliament-country','bb');assert.match(await page.locator('#parliament-watch').innerText(),/Senate|Barbados/i);
  // Autonomous QA find: 27 near-identical cards with no way to narrow them down. Filter must
  // actually hide non-matches (not just visually de-emphasize) and restore on clear.
  await page.fill('#parliament-catalogue-filter','jamaica');
  await page.waitForFunction(()=>document.querySelectorAll('.parl-source-card:not([hidden])').length===1);
  await page.fill('#parliament-catalogue-filter','zzznomatch');
  await page.waitForFunction(()=>document.querySelectorAll('.parl-source-card:not([hidden])').length===0);
  assert.equal(await page.locator('#parliament-catalogue-empty').isVisible(),true,'empty-state message did not show for a non-matching filter');
  await page.fill('#parliament-catalogue-filter','');
  await page.waitForFunction(()=>document.querySelectorAll('.parl-source-card:not([hidden])').length===27);
});

await scenario('investin-support-and-learning', async page=>{await open(page,'/invest/');assert.equal(await page.locator('#invest-sources .nexus-card').count(),4);await page.locator('[data-watch]').first().click();assert.match(await page.locator('#invest-watchlist').innerText(),/Ministry|Central Bank|Stock Exchange|Securities/i);assert.equal(await page.locator('a[href^="mailto:"]').count(),0,'dead mailto action remains');assert.match(await page.locator('main').innerText(),/not a bank, broker, financial adviser or public securities offering/i);});

await scenario('health-vaulted-without-intake', async page=>{await open(page,'/health/');assert.match(await page.locator('main').innerText(),/not publicly available|no FTN health service is open/i);assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');assert.equal(await page.locator('main input,main textarea,main select').count(),0,'Vaulted Health page must not collect health data');assert.match(await page.locator('main').innerText(),/not a medical|not a medical, diagnostic/i);});

await scenario('account-guest-state', async page=>{await mockGuestAuth(page);await open(page,'/account/');await page.waitForSelector('#account-email-form',{timeout:10000});assert.match(await page.locator('#account-state').innerText(),/Guest/);assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);});

await scenario('god-mode-denied-to-guest', async page=>{await mockGuestAuth(page);await open(page,'/god-mode/');await page.waitForTimeout(300);assert.match(await page.locator('#god-mode-root').innerText(),/Authorization required/i);assert.equal(await page.locator('[data-emergency]').count(),0,'owner controls must not render for guest');assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);});

await scenario('pwa-private-cache-exclusion', async page=>{await open(page,'/');var manifest=await page.evaluate(()=>fetch('/manifest.webmanifest').then(r=>r.json()));assert(!JSON.stringify(manifest).includes('/god-mode'),'public manifest advertises God Mode');assert(!JSON.stringify(manifest).includes('/love/'),'public manifest advertises vaulted Love');assert(!JSON.stringify(manifest).includes('/health/'),'public manifest advertises vaulted Health');var sw=await page.evaluate(()=>fetch('/service-worker.js').then(r=>r.text()));for(const route of ['god-mode','mission-control','account','love','health','ibis-ai'])assert(sw.includes(route),`service worker private-route exclusion missing: ${route}`);});

await scenario('version-identity-schema', async page=>{
  // /version.json is generated fresh at deploy time by .github/workflows/static-pages.yml (never
  // hand-maintained) so the founder can open the URL and know instantly what commit is live. This
  // test runs against the repo's own dev placeholder (environment:"development") when BASE is a
  // plain checkout, and the real generated file once BASE is an actual deploy -- it checks the
  // schema/shape, which is identical either way, not a specific commit or environment value.
  const r=await page.goto(BASE+'/version.json',{waitUntil:'domcontentloaded',timeout:15000});
  assert(r&&r.ok(),`/version.json returned ${r?.status()}`);
  const v=await r.json();
  assert.equal(v.product,'FTN Platform','version.json product field wrong');
  assert.match(v.commit,/^[0-9a-f]{40}$/,'version.json commit must be a real 40-char git SHA');
  assert.match(v.shortCommit,/^[0-9a-f]{7}$/,'version.json shortCommit must be a 7-char git SHA prefix');
  assert.match(v.builtAt,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,'version.json builtAt must be a real UTC ISO timestamp');
  assert(['development','production'].includes(v.environment),'version.json environment must be development or production');
});

await scenario('riddim-hub-links', async page=>{
  await open(page,'/riddim/');assert(await page.locator('a[href="/riddim/daw/"]').count()>0,'DAW link missing');assert(await page.locator('a[href="/riddim/dj/"]').count()>0,'DJ link missing');await page.click('#riddim-track-choice');await page.waitForSelector('#riddim-form',{timeout:5000});
});

await scenario('clock-personalize-share-and-fullscreen', async page=>{
  await open(page,'/clock/');
  await page.waitForSelector('#clock-face-analog');
  const t1=await page.locator('#clock-hand-second').getAttribute('style');
  await page.waitForTimeout(1100);
  const t2=await page.locator('#clock-hand-second').getAttribute('style');
  assert.notEqual(t1,t2,'analog second hand is not moving');
  await page.click('#clock-personalize-toggle');
  await page.waitForSelector('#clock-personalize:not([hidden])');
  await page.click('[data-clock-style="digital"]');
  assert.equal(await page.locator('#clock-face-digital').getAttribute('hidden'),null,'digital face did not activate');
  assert.match(await page.locator('#clock-digital-time').innerText(),/^\d{2}:\d{2}:\d{2}$/);
  await page.click('#clock-toggle-worldnow');
  await page.waitForSelector('.clock-worldnow__item');
  // Founder walkthrough defect #2: World Now expanded from 3 fixed zones to a 21-city picker
  // (Trinidad & Tobago always first, 6 defaults selected out of the box) -- see js/clock-page.js
  // WORLD_CITIES/DEFAULT_WORLD_CITY_KEYS.
  assert.equal(await page.locator('.clock-worldnow__item').count(),7,'World Now did not render Trinidad & Tobago plus its 6 default cities');
  assert.match(await page.locator('.clock-worldnow__item').first().locator('span').innerText(),/^Port of Spain$/i,'Trinidad & Tobago must always render first in World Now');
  await page.click('#clock-toggle-radio');
  await page.waitForSelector('.ftn-radio-live',{state:'attached',timeout:10000});
  assert.equal(await page.locator('#clock-radio').getAttribute('hidden'),null,'radio indicator did not become visible');
  await page.click('#clock-radio-indicator');
  await page.waitForSelector('.ftn-radio-live',{state:'visible',timeout:10000});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.click('#clock-share');
  await page.waitForSelector('.ftn-sheet.is-open');
  assert.match(await page.locator('.ftn-share-dialog__option--whatsapp').getAttribute('href'),/api\.whatsapp\.com/);
  await page.evaluate(()=>document.body.classList.add('clock-fullscreen'));
  await page.waitForTimeout(200);
  const m=await page.evaluate(()=>({sh:document.documentElement.scrollHeight,ih:innerHeight,sw:document.documentElement.scrollWidth,iw:innerWidth}));
  assert(m.sh-m.ih<=2 && m.sw-m.iw<=2, 'Clock fullscreen does not fit the viewport: '+JSON.stringify(m));
});

await scenario('clock-fullscreen-composition-invariants', async page=>{
  // Founder blocker: fullscreen Clock with Radio expanded clipped the clock, overlapped World Now,
  // and the sitewide FTN ibis floating widget sat on top of the radio controls -- fullscreen is a
  // DISPLAY MODE where the time must stay dominant and every other layer must adapt around it, not
  // intrude on it. Regression-guard real rendered geometry (bounding boxes, intersections), not
  // just an overflow number, and guard the composition survives the full realistic sequence:
  // enable optional layers, expand radio, enter fullscreen, then exit without losing state.
  await open(page,'/clock/');
  await page.waitForSelector('#clock-face-analog');
  await page.click('#clock-personalize-toggle');
  await page.waitForSelector('#clock-personalize:not([hidden])');
  await page.click('#clock-toggle-worldnow');
  await page.waitForSelector('.clock-worldnow__item');
  await page.click('#clock-toggle-radio');
  await page.waitForSelector('.ftn-radio-live',{state:'attached',timeout:10000});
  await page.click('#clock-radio-indicator');
  await page.waitForSelector('.ftn-radio-live',{state:'visible',timeout:10000});
  await page.evaluate(()=>document.body.classList.add('clock-fullscreen'));
  await page.waitForTimeout(300);
  const geometry=await page.evaluate(()=>{
    function rect(el){if(!el)return null;const r=el.getBoundingClientRect();return{top:r.top,left:r.left,right:r.right,bottom:r.bottom};}
    function intersects(a,b){if(!a||!b)return false;return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
    const face=rect(document.querySelector('.clock-face:not([hidden])'));
    const radio=rect(document.getElementById('clock-radio'));
    const worldnow=rect(document.getElementById('clock-worldnow'));
    const ibisWidget=document.getElementById('ibis-widget-trigger');
    return{
      overflowX:document.documentElement.scrollWidth-window.innerWidth,
      overflowY:document.documentElement.scrollHeight-window.innerHeight,
      face,
      faceFullyVisible: face ? (face.top>=-1 && face.left>=-1 && face.right<=window.innerWidth+1 && face.bottom<=window.innerHeight+1) : false,
      faceRadioIntersect:intersects(face,radio),
      faceWorldIntersect:intersects(face,worldnow),
      worldRadioIntersect:intersects(worldnow,radio),
      ibisWidgetVisible: ibisWidget ? getComputedStyle(ibisWidget).display!=='none' : false,
    };
  });
  assert(geometry.overflowX<=2,'Clock fullscreen has horizontal overflow: '+geometry.overflowX+'px');
  assert(geometry.overflowY<=2,'Clock fullscreen has vertical overflow: '+geometry.overflowY+'px');
  assert(geometry.faceFullyVisible,'Clock face is not fully visible inside the fullscreen viewport: '+JSON.stringify(geometry.face));
  assert(!geometry.faceRadioIntersect,'Clock face intersects the radio card in fullscreen');
  assert(!geometry.faceWorldIntersect,'Clock face intersects World Now in fullscreen');
  assert(!geometry.worldRadioIntersect,'World Now intersects the radio card in fullscreen');
  assert(!geometry.ibisWidgetVisible,'The sitewide FTN ibis widget trigger must not intrude on Clock fullscreen');
  // Exiting must preserve the radio's expanded state and leave no overflow behind on the normal page.
  await page.evaluate(()=>document.body.classList.remove('clock-fullscreen'));
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#clock-radio-shell').getAttribute('hidden'),null,'exiting fullscreen collapsed the radio card instead of preserving its state');
  const afterExitOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(afterExitOverflow<=3,'Normal page has horizontal overflow after exiting Clock fullscreen: '+afterExitOverflow+'px');
});

await scenario('clock-fullscreen-mobile-digital-composition', async page=>{
  // Same composition invariants at a narrow, short viewport with the digital face active --
  // the digital time's font-size formula previously used a pure vh-based clamp() that overflowed
  // horizontally on tall-but-narrow phones (390x844); min(vh,vw) fixed it. Regression-guard that
  // fix specifically, plus the same intersection/overflow invariants as the desktop scenario.
  await open(page,'/clock/');
  await page.waitForSelector('#clock-face-analog');
  await page.click('#clock-personalize-toggle');
  await page.waitForSelector('#clock-personalize:not([hidden])');
  await page.click('[data-clock-style="digital"]');
  await page.click('#clock-toggle-radio');
  await page.waitForSelector('.ftn-radio-live',{state:'attached',timeout:10000});
  await page.click('#clock-radio-indicator');
  await page.waitForSelector('.ftn-radio-live',{state:'visible',timeout:10000});
  await page.evaluate(()=>document.body.classList.add('clock-fullscreen'));
  await page.waitForTimeout(300);
  const geometry=await page.evaluate(()=>{
    const r=document.getElementById('clock-face-digital').getBoundingClientRect();
    return{
      overflowX:document.documentElement.scrollWidth-window.innerWidth,
      digitalFace:{top:r.top,left:r.left,right:r.right,bottom:r.bottom},
      digitalFaceFullyVisible: r.left>=-1 && r.right<=window.innerWidth+1,
    };
  });
  assert(geometry.overflowX<=2,'Clock fullscreen has horizontal overflow at mobile width: '+geometry.overflowX+'px');
  assert(geometry.digitalFaceFullyVisible,'Digital clock face overflows the mobile viewport width: '+JSON.stringify(geometry.digitalFace));
}, {width:390,height:844});

await scenario('observer-console-no-exposed-gap', async page=>{
  // Founder visual redteam: .observer-console (a rounded card, margin-top:24px) is a sibling of
  // the full-bleed black .observatory-hero above it -- this site is light-first by default, so the
  // page's own white body background showed through that 24px gap as a bare white flash between
  // two solid-black panels. Fixed with a same-color ::before bridging the gap; assert the bridge
  // is actually present and sized to cover it, not just that the gap "looks" filled in one shot.
  await open(page,'/observatory/');
  await page.waitForSelector('#observer-console');
  const bridge=await page.evaluate(()=>{
    const cs=getComputedStyle(document.getElementById('observer-console'),'::before');
    return {content:cs.content, background:cs.backgroundColor, top:cs.top, position:cs.position};
  });
  assert.notEqual(bridge.content,'none','#observer-console::before gap-bridge is missing');
  assert.equal(bridge.position,'absolute','#observer-console::before must be positioned to bridge the gap');
  assert.match(bridge.background,/rgb\(1[0-2], ?1[0-2], ?1[0-2]\)|rgb\(0, ?0, ?0\)/,'#observer-console::before is not painted the same near-black as the hero/console');
});

await scenario('display-dense-portrait-fullscreen-no-overlap', async page=>{
  // Founder visual redteam BLOCKER: the same combination that broke Clock fullscreen (Radio +
  // World Now + Fullscreen) broke Display too -- Dense + Portrait + Fullscreen collapsed all 6 KPI
  // pulse-cards' internal grid rows into each other (a too-small fr-share on the "pulse" grid area
  // for portrait+dense specifically), rendering completely overlapping, illegible text. Regression-
  // guard real bounding-box geometry, not just that the DOM nodes exist.
  await open(page,'/display/');
  await page.waitForSelector('#display-pulse .pulse-card');
  await page.click('#display-customize-toggle');
  await page.waitForSelector('.ftn-sheet.is-open');
  await page.click('input[name="display-density"][value="dense"]');
  await page.click('[data-sheet-close]');
  await page.click('[data-orientation-option="portrait"]');
  await page.evaluate(()=>document.body.classList.add('display-fullscreen'));
  await page.waitForTimeout(300);
  const cards=await page.evaluate(()=>[...document.querySelectorAll('.pulse-card')].map(c=>{
    const b=c.getBoundingClientRect();return{top:b.top,bottom:b.bottom,left:b.left,right:b.right};
  }));
  assert.equal(cards.length,6,'Display dense pulse row must render all 6 KPI cards');
  function intersects(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
  for(let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++)
    assert(!intersects(cards[i],cards[j]),`Display Dense+Portrait+Fullscreen: pulse-card ${i} overlaps pulse-card ${j}`);
  await page.evaluate(()=>document.body.classList.remove('display-fullscreen'));
});

await scenario('radio-controls-no-clipped-button', async page=>{
  // Founder visual redteam: the PLAY/NEXT/SAVE/SHARE row used flex:1 with no min-width and no
  // wrap, so on the real /radio/ page's narrower left column SHARE's min-content width pushed it
  // past the card's own right edge -- clipped invisible by the card's overflow:hidden, at full
  // 1920px desktop width, not just a narrow viewport.
  await open(page,'/radio/');
  await page.waitForFunction(()=>document.querySelectorAll('.ftn-radio-live__track').length>5,{timeout:45000});
  const geo=await page.evaluate(()=>{
    const share=document.getElementById('ftn-radio-share').getBoundingClientRect();
    const player=document.querySelector('.ftn-radio-live__player').getBoundingClientRect();
    return {shareRight:share.right, playerRight:player.right};
  });
  assert(geo.shareRight<=geo.playerRight+1,`SHARE button (right:${geo.shareRight}) is clipped outside its player card (right:${geo.playerRight})`);
});

await scenario('kaiso-heading-line-height-fits-font-size', async page=>{
  // Founder visual redteam: .kaiso-current h2 overrode font-size (clamp up to 48px) without
  // overriding the inherited base h2 line-height token (32px, tuned for a smaller default size) --
  // multi-line headings visually overlapped their own adjacent lines. line-height must never be
  // smaller than font-size for any multi-line heading.
  await open(page,'/kaiso/');
  const style=await page.evaluate(()=>{
    const h2=[...document.querySelectorAll('h2')].find(h=>h.textContent.includes('What matters'));
    const cs=getComputedStyle(h2);
    return {fontSize:parseFloat(cs.fontSize), lineHeight:parseFloat(cs.lineHeight)};
  });
  assert(style.lineHeight>=style.fontSize,`Kaiso "What matters" h2 line-height (${style.lineHeight}px) is smaller than its font-size (${style.fontSize}px) -- lines will overlap`);
});

await scenario('djtube-sticky-header-fully-opaque', async page=>{
  // Founder visual redteam: the sticky topbar (.top) used a 96%-opacity background with no blur,
  // so scrolled content faintly ghosted through behind it -- reproduced specifically after loading
  // a track onto a deck (the click scrolls the page under the sticky header).
  await open(page,'/riddim/dj/');
  await page.waitForFunction(()=>document.querySelectorAll('.item').length>5,{timeout:45000});
  await page.locator('[data-load]').first().click();
  await page.waitForTimeout(400);
  const alpha=await page.evaluate(()=>{
    const m=getComputedStyle(document.querySelector('.top')).backgroundColor.match(/[\d.]+/g);
    return m && m.length===4 ? parseFloat(m[3]) : 1;
  });
  assert.equal(alpha,1,'DJ Tube sticky topbar background is not fully opaque -- scrolled content will ghost through it');
});

await scenario('scenario-workspace-deep-link-not-clipped-by-sticky-headers', async page=>{
  // Founder visual redteam: /scenario-workspace/#correlation-engine's native anchor-scroll puts
  // the panel's top edge flush with the viewport top, but .site-header + .mc-tablist are BOTH
  // sticky and together cover ~144px. The panel's own box legitimately starts flush against the
  // tablist (that's correct -- .mc-panel's padding-block is what creates the clearance for its
  // content); the real invariant is that the panel's HEADING, not its outer box edge, must render
  // fully below the sticky stack.
  await open(page,'/scenario-workspace/#correlation-engine');
  await page.waitForSelector('.mc-live-engine',{timeout:10000});
  const geo=await page.evaluate(()=>{
    const panel=document.getElementById('correlation-engine');
    const heading=panel.querySelector('.mc-panel__header')||panel.querySelector('h2')||panel.firstElementChild;
    const headingTop=heading.getBoundingClientRect().top;
    const tablistBottom=document.querySelector('.mc-tablist').getBoundingClientRect().bottom;
    return {headingTop, tablistBottom};
  });
  assert(geo.headingTop>=geo.tablistBottom-1,`Deep-linked #correlation-engine's own heading (top:${geo.headingTop}) is clipped under the sticky tablist (bottom:${geo.tablistBottom})`);
});

for (const path of ['/about/','/applications/','/contact/','/news/','/insights/','/resources/','/top-picks/','/trust/','/glossary/','/investor-room/','/display/','/clock/','/learn/']) {
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
