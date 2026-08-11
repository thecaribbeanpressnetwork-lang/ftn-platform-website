import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
async function scenario(name,run,viewport={width:1280,height:900}){const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));try{await run(page);assert.equal(errors.length,0,errors.join('\n'));console.log('CREATIVE PASS',name);}finally{await context.close();}}
async function open(page,path){const response=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:30000});assert(response&&response.ok(),`${path} returned ${response?.status()}`);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert(overflow<=3,`${path} horizontal overflow ${overflow}px`);}
function wavBuffer(frequency=220,seconds=.4,sampleRate=8000){const samples=Math.round(seconds*sampleRate),size=samples*2,b=Buffer.alloc(44+size);let o=0;const s=x=>{b.write(x,o,'ascii');o+=x.length};s('RIFF');b.writeUInt32LE(36+size,o);o+=4;s('WAVE');s('fmt ');b.writeUInt32LE(16,o);o+=4;b.writeUInt16LE(1,o);o+=2;b.writeUInt16LE(1,o);o+=2;b.writeUInt32LE(sampleRate,o);o+=4;b.writeUInt32LE(sampleRate*2,o);o+=4;b.writeUInt16LE(2,o);o+=2;b.writeUInt16LE(16,o);o+=2;s('data');b.writeUInt32LE(size,o);o+=4;for(let i=0;i<samples;i++){b.writeInt16LE(Math.round(Math.sin(2*Math.PI*frequency*i/sampleRate)*7000),o);o+=2;}return b;}

await scenario('ibis-provider-transparent-studio',async page=>{
  const providerCalls=[];page.on('request',request=>{if(/pixverse|kling/i.test(request.url())&&!/fonts|googleapis/.test(request.url()))providerCalls.push(request.url());});
  await open(page,'/ibis-ai/');await page.waitForSelector('#ibis-creative-studio');
  assert.match(await page.locator('#ibis-creative-studio').innerText(),/No surprise API bills/i);
  assert(await page.locator('.ibis-provider').count()>=2);
  await page.locator('[data-studio-mode="video"]').click();
  await page.fill('[name="goal"]','A 15-second Caribbean food brand launch video');
  await page.fill('[name="audience"]','Caribbean diaspora customers');
  await page.locator('#ibis-studio-form').evaluate(form=>form.requestSubmit());
  assert.match(await page.locator('#ibis-studio-output').innerText(),/PLANNED, NOT GENERATED/i);
  assert.match(await page.locator('#ibis-studio-status').innerText(),/No external generation occurred/i);
  assert.equal(providerCalls.length,0,'Creative planning must not call PixVerse or Kling');
});

await scenario('fire-flow-music-instrumental-handoff',async page=>{
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:BASE});
  await page.route('https://www.flowmusic.app/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Flow Music fixture</title>'}));
  await open(page,'/riddim/fire/');
  assert.match(await page.locator('h1').innerText(),/FTN\s*FIRE/i);
  assert.match(await page.locator('.fire-boundary').innerText(),/Instrumentals only/i);
  await page.fill('#fire-prompt','Make me a dark 105 BPM soca instrumental with heavy bass, percussion and steelpan-inspired melodies.');
  await page.selectOption('#fire-bars','4');await page.check('#fire-originality');
  await page.locator('#fire-form').evaluate(form=>form.requestSubmit());
  await page.waitForSelector('#fire-flow-prompt');
  const popup=page.waitForEvent('popup');await page.click('#fire-open-flow');const flow=await popup;
  await flow.waitForLoadState('domcontentloaded');
  assert.match(flow.url(),/flowmusic\.app/);
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

await scenario('dj-local-rights-aware-two-deck-mode',async page=>{
  await open(page,'/riddim/dj/');await page.waitForSelector('#dj-local');
  assert.match(await page.locator('.dj-reference-label').innerText(),/No ripping.*no export/i);
  await page.check('#dj-local-rights');
  await page.setInputFiles('#dj-file-A',{name:'owned-soca.wav',mimeType:'audio/wav',buffer:wavBuffer(220,1)});
  await page.waitForFunction(()=>/BPM estimate/.test(document.querySelector('#dj-analysis-A')?.textContent||''));
  await page.setInputFiles('#dj-file-B',{name:'licensed-reggae.wav',mimeType:'audio/wav',buffer:wavBuffer(110,1)});
  await page.waitForFunction(()=>/BPM estimate/.test(document.querySelector('#dj-analysis-B')?.textContent||''));
  await page.fill('#dj-key-A','F minor');await page.fill('#dj-loop-out-A','0.5');await page.click('#dj-loop-A');await page.fill('#dj-local-cross','70');
  const download=page.waitForEvent('download');await page.click('#dj-local-save');const recipe=await download;assert.equal(recipe.suggestedFilename(),'ftn-dj-local-project.json');
  assert.match(await page.locator('#dj-local-status').innerText(),/source audio remains local/i);
});

await scenario('riddim-hierarchy-includes-fire',async page=>{await open(page,'/riddim/');await page.waitForSelector('.riddim-card--fire');assert.equal(await page.locator('.riddim-card--fire').getAttribute('href'),'/riddim/fire/');},{width:390,height:844});

await browser.close();
console.log('5/5 ibis Creative Studio, FTN Fire, DAW and DJ scenarios passed.');
