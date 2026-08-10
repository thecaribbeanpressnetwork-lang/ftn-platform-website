import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

async function scenario(name, fn, viewport={width:1280,height:900}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/youtube|favicon|ERR_BLOCKED_BY_CLIENT|Failed to load resource.*404/i.test(m.text())) errors.push('console: '+m.text()); });
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
function wavBuffer(seconds=1,sampleRate=8000){
  const samples=seconds*sampleRate, dataSize=samples*2, b=Buffer.alloc(44+dataSize);let o=0;
  const s=x=>{b.write(x,o,'ascii');o+=x.length};s('RIFF');b.writeUInt32LE(36+dataSize,o);o+=4;s('WAVE');s('fmt ');b.writeUInt32LE(16,o);o+=4;b.writeUInt16LE(1,o);o+=2;b.writeUInt16LE(1,o);o+=2;b.writeUInt32LE(sampleRate,o);o+=4;b.writeUInt32LE(sampleRate*2,o);o+=4;b.writeUInt16LE(2,o);o+=2;b.writeUInt16LE(16,o);o+=2;s('data');b.writeUInt32LE(dataSize,o);o+=4;for(let i=0;i<samples;i++){b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/sampleRate)*9000),o);o+=2;}return b;
}

await scenario('home-desktop', async page=>{await open(page,'/');assert(await page.locator('a[href="/ibis-ai/"]').count()>0);assert(await page.locator('a[href="/riddim/"]').count()>0);assert(await page.locator('a[href="/riddim/daw/"]').count()>0);assert(await page.locator('a[href="/riddim/dj/"]').count()>0);assert(await page.locator('.eco-live-rail').count()===1,'home live tools rail missing');});
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
  if(await page.locator('.ftn-sat__error').count()) throw new Error(await page.locator('.ftn-sat__error').innerText());
  assert(await page.locator('#ftn-sat-image img').evaluate(i=>i.naturalWidth)>0);
  await page.waitForSelector('.obs-radar',{timeout:10000});
});

await scenario('events-workflow', async page=>{
  await open(page,'/events/');
  await page.fill('#events-prompt','I need a 700 person outdoor soca concert in San Fernando with a TT$250,000 working budget and security, sound and lights.');
  await page.click('#events-interpret');
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
  const titles=(await page.locator('.ftn-radio-live__track').allInnerTexts()).slice(0,30).join(' ');assert(!/mega mix|full mix|continuous mix|hour mix/i.test(titles),'radio mix exclusion failed');
});

await scenario('dj-discovery-and-controls', async page=>{
  await open(page,'/dj-tube-prototype/?ftn=1');
  await page.waitForFunction(()=>document.querySelectorAll('[data-track]').length>10 || /failed|unavailable|error/i.test(document.querySelector('#queueStatus')?.innerText||''),{timeout:45000});
  const n=await page.locator('[data-track]').count();assert(n>10,`DJ only loaded ${n} tracks`);
  const texts=(await page.locator('[data-track]').allInnerTexts()).slice(0,40).join(' ');assert(!/mega mix|full mix|continuous mix|hour mix/i.test(texts),'DJ mix exclusion failed');
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
  await page.waitForFunction(()=>document.querySelectorAll('.ftn-episode').length>0 || /unavailable|failed|error/i.test(document.querySelector('#ftn-watch-status')?.innerText||''),{timeout:45000});
  assert(await page.locator('.ftn-episode').count()>0,'Face The Nation catalogue empty');
  assert.equal(await page.locator('#watch').count(),1,'duplicate #watch section');
});

await scenario('kaiso-newsroom', async page=>{
  await open(page,'/kaiso/');
  await page.waitForFunction(()=>document.querySelectorAll('.kaiso-story').length>0 || document.querySelectorAll('.kaiso-video').length>5 || /unavailable|failed|error/i.test((document.querySelector('#kaiso-source-status')?.innerText||'')+' '+(document.querySelector('#kaiso-video-status')?.innerText||'')),{timeout:45000});
  assert((await page.locator('.kaiso-story').count())+(await page.locator('.kaiso-video').count())>0,'Kaiso source radar empty');
  const f=page.locator('.kaiso-tip-form');await f.locator('input[name="headline"]').fill('FTN test story');await f.locator('textarea[name="summary"]').fill('Testing newsroom draft and verification workflow.');await f.locator('input[name="consent"]').check();await f.evaluate(el=>el.requestSubmit());await page.waitForTimeout(200);assert.match(await page.locator('#kaiso-history-list').innerText(),/FTN test story/i);
});

await scenario('display-network-studio', async page=>{
  await open(page,'/display-network/');await page.waitForSelector('#dn-add-content',{timeout:10000});
  await page.fill('#dn-content-title','Flood warning test');await page.fill('#dn-content-message','Avoid the low-lying road until cleared.');await page.click('#dn-add-content');assert.match(await page.locator('#dn-preview').innerText(),/Flood warning test/);assert(await page.locator('.dn-item').count()>0);
});

await scenario('love-limited-tool', async page=>{
  await open(page,'/love/');await page.selectOption('#love-goal',{label:'A relationship'});await page.locator('input[name="value"]').first().check();await page.locator('#love-form').evaluate(f=>f.requestSubmit());await page.waitForTimeout(150);assert.match(await page.locator('#love-output').innerText(),/Compatibility brief saved/i);
});

await scenario('riddim-hub-links', async page=>{
  await open(page,'/riddim/');assert(await page.locator('a[href="/riddim/daw/"]').count()>0,'DAW link missing');assert(await page.locator('a[href="/riddim/dj/"]').count()>0,'DJ link missing');await page.click('#riddim-track-choice');await page.waitForSelector('#riddim-form',{timeout:5000});
});

for (const path of ['/about/','/applications/','/contact/','/news/','/insights/','/resources/','/top-picks/','/invest/']) {
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
