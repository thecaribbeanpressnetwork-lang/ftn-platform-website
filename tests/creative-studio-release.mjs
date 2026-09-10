import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
async function scenario(name,run,viewport={width:1280,height:900}){const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));try{await run(page);assert.equal(errors.length,0,errors.join('\n'));console.log('CREATIVE PASS',name);}finally{await context.close();}}
async function open(page,path){const response=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:30000});assert(response&&response.ok(),`${path} returned ${response?.status()}`);const layout=await page.evaluate(()=>{const root=document.documentElement,client=root.clientWidth,scroll=root.scrollWidth;const offenders=Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();const style=getComputedStyle(el);return{tag:el.tagName.toLowerCase(),id:el.id||'',className:typeof el.className==='string'?el.className:'',left:Math.round(r.left*10)/10,right:Math.round(r.right*10)/10,width:Math.round(r.width*10)/10,position:style.position,overflowX:style.overflowX};}).filter(x=>x.right>client+3||x.left<-3).sort((a,b)=>(b.right-client)-(a.right-client)).slice(0,12);return{client,scroll,overflow:scroll-client,offenders};});if(layout.overflow>3)console.error('OVERFLOW DIAGNOSTIC',path,JSON.stringify(layout));assert(layout.overflow<=3,`${path} horizontal overflow ${layout.overflow}px; offenders=${JSON.stringify(layout.offenders)}`);}
function wavBuffer(frequency=220,seconds=.4,sampleRate=8000){const samples=Math.round(seconds*sampleRate),size=samples*2,b=Buffer.alloc(44+size);let o=0;const s=x=>{b.write(x,o,'ascii');o+=x.length};s('RIFF');b.writeUInt32LE(36+size,o);o+=4;s('WAVE');s('fmt ');b.writeUInt32LE(16,o);o+=4;b.writeUInt16LE(1,o);o+=2;b.writeUInt16LE(1,o);o+=2;b.writeUInt32LE(sampleRate,o);o+=4;b.writeUInt32LE(sampleRate*2,o);o+=4;b.writeUInt16LE(2,o);o+=2;b.writeUInt16LE(16,o);o+=2;s('data');b.writeUInt32LE(size,o);o+=4;for(let i=0;i<samples;i++){b.writeInt16LE(Math.round(Math.sin(2*Math.PI*frequency*i/sampleRate)*7000),o);o+=2;}return b;}

await scenario('ibis-provider-transparent-studio',async page=>{
  const providerCalls=[];page.on('request',request=>{if(/pixverse|kling/i.test(request.url())&&!/fonts|googleapis/.test(request.url()))providerCalls.push(request.url());});
  await page.route('**/functions/v1/ibis-image-cloudflare',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capability:'IMAGE_GENERATION',provider:'cloudflare-workers-ai',configured:false,ready:false,generationAttempted:false,providerIds:['cloudflare-workers-ai-image-flux','cloudflare-workers-ai-image-sdxl']})}));
  await open(page,'/ibis-ai/');await page.waitForSelector('#ibis-creative-studio');
  assert.equal(await page.locator('.ibis-studio__toggle').getAttribute('aria-expanded'),'false','Creative Studio must not overwhelm the primary ibis conversation on arrival');
  await page.click('.ibis-studio__toggle');
  assert.equal(await page.locator('.ibis-studio__toggle').getAttribute('aria-expanded'),'true');
  assert.match(await page.locator('#ibis-creative-studio').innerText(),/No surprise API bills/i);
  assert(await page.locator('.ibis-provider').count()>=2);
  assert.equal(await page.locator('[data-studio-mode="video"]').count(),0,'VIDEO mode must not be publicly selectable while no VIDEO_GENERATION provider is enabled');
  assert.equal(await page.locator('[data-studio-mode]').count(),2,'Only IMAGE and AUTO CAMPAIGN modes should remain publicly selectable');
  await page.fill('[name="goal"]','A 15-second Caribbean food brand launch visual');
  await page.fill('[name="audience"]','Caribbean diaspora customers');
  await page.locator('#ibis-studio-form').evaluate(form=>form.requestSubmit());
  assert.match(await page.locator('#ibis-studio-output').innerText(),/PLANNED, NOT GENERATED/i);
  assert.match(await page.locator('#ibis-studio-status').innerText(),/No external generation occurred/i);
  assert.equal(await page.locator('#ibis-studio-generate-image').count(),0,'Generation must remain hidden when live health is not ready');
  assert.equal(providerCalls.length,0,'Creative planning must not call PixVerse or Kling');
});

await scenario('ibis-live-cloudflare-image-generation',async page=>{
  const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(12000,7)]).toString('base64');
  let healthCalls=0,generationCalls=0;
  await page.route('**/functions/v1/ibis-image-cloudflare',async route=>{
    const request=route.request();
    let payload={};try{payload=request.postDataJSON();}catch{}
    if(payload.action==='health'){
      healthCalls++;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capability:'IMAGE_GENERATION',provider:'cloudflare-workers-ai',configured:true,ready:true,generationAttempted:false,providerIds:['cloudflare-workers-ai-image-flux','cloudflare-workers-ai-image-sdxl'],models:['@cf/black-forest-labs/flux-1-schnell','@cf/bytedance/stable-diffusion-xl-lightning']})});
    }
    generationCalls++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({image:jpeg,mimeType:'image/jpeg',extension:'jpg',providerId:payload.providerId,model:'@cf/black-forest-labs/flux-1-schnell',generatedAt:'2026-09-10T00:00:00Z'})});
  });
  await open(page,'/ibis-ai/');await page.waitForSelector('#ibis-creative-studio');
  await page.waitForFunction(()=>window.FTN?.IbisCloudflareImageLive?.isReady()===true);
  await page.click('.ibis-studio__toggle');
  await page.fill('[name="goal"]','A premium red ibis launch image beside Caribbean water');
  await page.fill('[name="direction"]','Photorealistic sunrise, no text');
  await page.locator('#ibis-studio-form').evaluate(form=>form.requestSubmit());
  await page.waitForSelector('#ibis-studio-generate-image');
  assert.match(await page.locator('#ibis-provider-grid').innerText(),/Cloudflare Workers AI[\s\S]*ENABLED/i,'Provider evidence should reflect live runtime health');
  await page.click('#ibis-studio-generate-image');
  await page.waitForSelector('.ibis-studio__generated-image');
  const src=await page.locator('.ibis-studio__generated-image').getAttribute('src');
  assert(src.startsWith('data:image/jpeg;base64,'),'Generated preview must use server-verified JPEG MIME');
  const downloadName=await page.locator('a[download^="ibis-"]').getAttribute('download');
  assert(downloadName.endsWith('.jpg'),'Download extension must match server-verified JPEG bytes');
  assert.match(await page.locator('.ibis-studio__generate-status').innerText(),/Generated via .*image\/jpeg/i);
  assert(healthCalls>=1,'Runtime activation must require a live health probe');
  assert.equal(generationCalls,1,'One click must issue exactly one generation request when the primary succeeds');
});

await scenario('ibis-focused-answer-presentation',async page=>{
  await page.route('**/functions/v1/ibis-assistant',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'2 + 2 = 4.',provider:'FTN ibis deterministic',model:'ibis-rules-v1',answerClass:'CALCULATION',evidenceState:'DETERMINISTIC',generatedAt:'2026-09-09T20:55:21.631Z',confidence:'HIGH'})}));
  await open(page,'/ibis-ai/');
  await page.fill('#ibis-goal','What is 2 plus 2?');
  await page.click('.ibis-chat__send');
  await page.waitForSelector('.ibis-answer-meta');
  const answer=await page.locator('.ibis-msg--ibis').last().innerText();
  assert.match(answer,/2 \+ 2 = 4\./);
  assert.match(answer,/Calculated locally by ibis\./);
  assert.doesNotMatch(answer,/Model:|Generated 2026|No strong FTN route|FTN Live/,'a calculation must not be padded with raw diagnostics or unrelated product routes');
  assert.equal(await page.locator('.ibis-studio__toggle').getAttribute('aria-expanded'),'false');
});

await scenario('fire-flow-music-instrumental-handoff',async page=>{
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:BASE});
  await page.addInitScript(()=>{window.__ftnExternalOpen='';window.open=function(url){window.__ftnExternalOpen=String(url);return{opener:null};};});
  await open(page,'/riddim/fire/');
  assert.match(await page.locator('h1').innerText(),/FTN\s*FIRE/i);
  assert.match(await page.locator('.fire-boundary').innerText(),/Instrumentals only/i);
  await page.fill('#fire-prompt','Make me a dark 105 BPM soca instrumental with heavy bass, percussion and steelpan-inspired melodies.');
  await page.selectOption('#fire-bars','4');await page.check('#fire-originality');
  await page.locator('#fire-form').evaluate(form=>form.requestSubmit());
  await page.waitForFunction(()=>Boolean(document.querySelector('#fire-flow-prompt')?.value));
  await page.locator('.fire-ai summary').click();
  await page.waitForSelector('#fire-flow-prompt');
  await page.click('#fire-open-flow');
  assert.match(await page.evaluate(()=>window.__ftnExternalOpen),/^https:\/\/www\.flowmusic\.app\/$/);
  await page.waitForSelector('#fire-flow-prompt');
  const brief=await page.locator('#fire-flow-prompt').inputValue();
  assert.match(brief,/original instrumental only/i);assert.match(brief,/105 BPM/i);assert.match(brief,/No vocals, lyrics/i);
  assert.equal(await page.locator('#fire-copy-flow').isEnabled(),true);
  assert.match(await page.locator('#fire-status').innerText(),/FLOW MUSIC OPENED|PROMPT COPIED/i);
});

await scenario('daw-multitrack-arrangement-and-real-mix',async page=>{
  await open(page,'/riddim/daw/');await page.waitForSelector('#daw-arrangement');
  await page.check('#daw-rights');await page.fill('#daw-contributor','FTN release test');await page.fill('#daw-project-name','Caribbean Test Mix');
  await page.setInputFiles('#daw-import',[{name:'drums.wav',mimeType:'audio/wav',buffer:wavBuffer(180)},{name:'bass.wav',mimeType:'audio/wav',buffer:wavBuffer(90)}]);
  await page.waitForFunction(()=>document.querySelectorAll('.daw-arrangement__track').length===2);
  const second=page.locator('.daw-arrangement__track').nth(1);await second.locator('[data-field="start"]').fill('0.1');await second.locator('[data-field="start"]').blur();await second.locator('[data-field="pan"]').fill('-0.5');await second.locator('[data-field="pan"]').blur();
  await page.locator('.daw-arrangement__track').first().locator('[data-field="fadeOut"]').fill('0.1');await page.locator('.daw-arrangement__track').first().locator('[data-field="fadeOut"]').blur();
  assert.equal(await page.locator('#daw-undo').isEnabled(),true);await page.click('#daw-undo');assert.equal(await page.locator('#daw-redo').isEnabled(),true);await page.click('#daw-redo');
  const download=page.waitForEvent('download');await page.click('#daw-export-mix');const mix=await download;assert.equal(mix.suggestedFilename(),'caribbean-test-mix-mix.wav');
  await page.waitForFunction(()=>/WAV mix exported/.test(document.querySelector('#daw-arrangement-status')?.textContent||''),null,{timeout:30000});
});

await scenario('dj-local-file-two-deck-mode',async page=>{
  await open(page,'/riddim/dj/');await page.waitForSelector('#deckA');
  assert.match(await page.locator('body').innerText(),/does not download, rip, export or re-host/i);
  await page.selectOption('#sourceA','local');
  await page.setInputFiles('#fileA',{name:'owned-soca.wav',mimeType:'audio/wav',buffer:wavBuffer(220,1)});
  await page.waitForFunction(()=>/BPM estimate/.test(document.querySelector('#bpmA')?.textContent||''));
  assert.match(await page.locator('#subA').innerText(),/your device only/i);
  await page.selectOption('#sourceB','local');
  await page.setInputFiles('#fileB',{name:'licensed-reggae.wav',mimeType:'audio/wav',buffer:wavBuffer(110,1)});
  await page.waitForFunction(()=>/BPM estimate/.test(document.querySelector('#bpmB')?.textContent||''));
  await page.fill('#cross','70');assert.equal(await page.locator('#cross').inputValue(),'70');
});

await scenario('riddim-hierarchy-includes-fire',async page=>{await open(page,'/riddim/');await page.waitForSelector('.riddim-card--fire');assert.equal(await page.locator('.riddim-card--fire').getAttribute('href'),'/riddim/fire/');},{width:390,height:844});

await browser.close();
console.log('7/7 ibis live image, answer presentation, Creative Studio, FTN Fire, DAW and DJ scenarios passed.');
