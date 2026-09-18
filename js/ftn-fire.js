// FTN Fire: a real, bounded on-device instrumental draft engine. It does not claim that
// procedural synthesis is a foundation model or that an external producer API ran.
//
// FTN Consolidation (2026-09-18): the pure generation engine (rhythm/bass/harmony/melody
// scheduling, WAV/ZIP encoding) has moved to js/ibis-caribbean-music-engine.js, a headless module
// with no DOM dependency, so ibis (and any future consumer) can call the exact same engine
// directly. This file now delegates to it -- same math, same output, zero behavior change on this
// page; everything below this point is page-UI wiring only (playback transport, form handling,
// on-page waveform drawing, Flow Music hand-off, ibis producer-notes hand-off).
(function(global){
'use strict';
var recipe=null,liveContext=null,liveMaster=null,STORE='ftn-fire-recipes-v1';
var managedJobId=null;
var Engine=global.FTN&&global.FTN.CaribbeanMusicEngine;
var defaults=Engine.STYLE_DEFAULT_BPM;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function hash(s){return Engine.hash(s);}
function schedule(ctx,dest,spec,start,stem,skipSeconds){return Engine.schedule(ctx,dest,spec,start,stem,skipSeconds);}
function outputGain(ctx){return Engine.outputGain(ctx);}
// Pass 16: real playhead/pause/seek. The whole arrangement is pre-scheduled up front (every
// oscillator/buffer node gets an absolute start time when schedule() runs) -- Web Audio has no
// way to pause an individual already-scheduled node, but AudioContext.suspend()/resume() freezes
// and resumes ctx.currentTime itself, which correctly freezes every scheduled node in lock-step
// (they're all timed relative to that same clock). That is what PAUSE actually uses below --
// not a fake "pause" that just silences the output while audio keeps advancing underneath.
var playStartedAt=0,playOffsetSeconds=0,playheadTimer=null;
function scheduleFrom(offsetSeconds){
  var C=global.AudioContext||global.webkitAudioContext;
  if(!C){setStatus('BROWSER AUDIO UNAVAILABLE');return false;}
  liveContext=new C();liveMaster=outputGain(liveContext);
  var base=liveContext.currentTime+.06;
  schedule(liveContext,liveMaster,recipe,base,null,Math.max(0,offsetSeconds));
  playStartedAt=base;playOffsetSeconds=Math.max(0,offsetSeconds);
  return true;
}
function currentPositionSeconds(){
  if(!liveContext)return playOffsetSeconds;
  return playOffsetSeconds+Math.max(0,liveContext.currentTime-playStartedAt);
}
function updatePlayhead(){
  if(!recipe)return;
  var durationSeconds=recipe.durationMs/1000,pos=Math.min(durationSeconds,currentPositionSeconds()),pct=durationSeconds?(pos/durationSeconds)*100:0;
  var fill=document.getElementById('fire-progress-fill');if(fill)fill.style.width=pct+'%';
  var bar=document.getElementById('fire-progress');if(bar)bar.setAttribute('aria-valuenow',Math.round(pct));
  var cur=document.getElementById('fire-time-current');if(cur)cur.textContent=fmtTime(pos);
  var dur=document.getElementById('fire-time-duration');if(dur)dur.textContent=fmtTime(durationSeconds);
  if(liveContext&&liveContext.state==='running'&&pos>=durationSeconds){setStatus('DRAFT COMPLETE');document.getElementById('fire-play').textContent='PLAY DRAFT';stopTicker();}
}
function fmtTime(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function startTicker(){stopTicker();playheadTimer=setInterval(updatePlayhead,120);}
function stopTicker(){if(playheadTimer){clearInterval(playheadTimer);playheadTimer=null;}}
function play(){
  if(!recipe)return;
  if(liveContext&&liveContext.state==='suspended'){liveContext.resume();setStatus('PLAYING ON DEVICE');document.getElementById('fire-play').textContent='PAUSE';startTicker();return;}
  if(!scheduleFrom(0))return;
  setStatus('PLAYING ON DEVICE');document.getElementById('fire-play').textContent='PAUSE';document.getElementById('fire-stop').disabled=false;
  startTicker();
}
function pauseDraft(){if(!liveContext||liveContext.state!=='running')return;liveContext.suspend();setStatus('PAUSED');document.getElementById('fire-play').textContent='RESUME';}
function togglePlayPause(){if(liveContext&&liveContext.state==='running')pauseDraft();else play();}
function seekTo(fraction){
  if(!recipe)return;
  var durationSeconds=recipe.durationMs/1000,target=Math.max(0,Math.min(durationSeconds-.05,fraction*durationSeconds));
  var wasPlaying=!liveContext||liveContext.state==='running';
  if(liveContext)try{liveContext.close();}catch(e){}
  liveContext=null;liveMaster=null;
  if(!scheduleFrom(target))return;
  if(!wasPlaying)liveContext.suspend();
  setStatus(wasPlaying?'PLAYING ON DEVICE':'PAUSED');
  document.getElementById('fire-play').textContent=wasPlaying?'PAUSE':'RESUME';
  document.getElementById('fire-stop').disabled=false;
  updatePlayhead();if(wasPlaying)startTicker();
}
function stop(){stopTicker();if(liveMaster)try{liveMaster.gain.cancelScheduledValues(0);liveMaster.gain.setValueAtTime(0,liveContext.currentTime);}catch(e){}if(liveContext)try{liveContext.close();}catch(e){}liveContext=null;liveMaster=null;playOffsetSeconds=0;document.getElementById('fire-play').textContent='PLAY DRAFT';updatePlayhead();if(recipe)setStatus('STOPPED');}
async function exportWav(){if(!recipe)return;setStatus('RENDERING WAV');try{var blob=new Blob([await Engine.renderWav(recipe)],{type:'audio/wav'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ftn-fire-'+recipe.style+'-'+recipe.bpm+'bpm.wav';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1500);setStatus('WAV EXPORTED');}catch(e){setStatus('EXPORT FAILED');}}
async function exportStems(){if(!recipe)return;setStatus('RENDERING 4 STEMS');try{var zip=await Engine.renderStemsZip(recipe,function(name){setStatus('RENDERING '+name.toUpperCase());});var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));a.download='ftn-fire-stems-'+recipe.style+'-'+recipe.bpm+'bpm.zip';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1500);setStatus('STEMS ZIP EXPORTED');}catch(e){setStatus('STEM EXPORT FAILED');}}
function setStatus(s){document.getElementById('fire-status').textContent=s;}
function draw(spec){var canvas=document.getElementById('fire-wave'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);var g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,'#ff4d00');g.addColorStop(1,'#ffbd2e');ctx.strokeStyle='#38262a';for(var i=0;i<=16;i++){ctx.beginPath();ctx.moveTo(i*w/16,0);ctx.lineTo(i*w/16,h);ctx.stroke();}ctx.fillStyle=g;var seed=hash(JSON.stringify(spec));for(var x=0;x<128;x++){var amp=10+((seed^(x*2654435761))>>>0)%65;if(x%8===0)amp=78;ctx.fillRect(x*w/128,h/2-amp/2,Math.max(2,w/128-2),amp);}ctx.fillStyle='#fff';ctx.font='800 14px Inter';ctx.fillText(spec.style.toUpperCase()+' · '+spec.bpm+' BPM · '+spec.key,18,25);}
function parsePrompt(prompt){var lower=prompt.toLowerCase(),style=document.getElementById('fire-style');Object.keys(defaults).forEach(function(k){if(lower.indexOf(k)>=0||(k==='soca'&&/soca/.test(lower)))style.value=k;});var bpm=lower.match(/\b(6\d|[7-9]\d|1[0-7]\d|180)\s*bpm\b/);if(bpm)document.getElementById('fire-bpm').value=bpm[1];else if(prompt.trim())document.getElementById('fire-bpm').value=defaults[style.value];['Dark','Joyful','Road-ready','Sensual','Reflective','Triumphant'].forEach(function(m){if(lower.indexOf(m.toLowerCase())>=0)document.getElementById('fire-mood').value=m;});}
function flowPrompt(spec){return ['Create an original instrumental only. No vocals, lyrics, spoken word, artist imitation, interpolation or recreation of an existing recording.','Caribbean lane: '+spec.style.replace(/-/g,' ')+'.','Tempo: exactly '+spec.bpm+' BPM. Key centre: '+spec.key+'.','Mood: '+spec.mood+'. Energy: '+spec.energy+'/5. Vibe: '+spec.vibe+'.','Arrangement: '+spec.arrangement.replace(/-/g,' ')+'; use variation seed '+spec.seed+' as a creative variation cue.','Rhythm: '+spec.swing+'% swing. Instrument palette: '+spec.instruments.join(', ')+'.','Producer direction: '+spec.plainLanguageDirection,'Make it musical, original and export-ready as an instrumental.'].join('\n');}
async function copyFlowPrompt(){if(!recipe)return false;var text=recipe.flowPrompt;try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);}else{var area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();var copied=document.execCommand('copy');area.remove();if(!copied)throw new Error('Copy was unavailable.');}setStatus('PROMPT COPIED');return true;}catch(e){setStatus('PROMPT COPY UNAVAILABLE');return false;}}
function openFlow(){if(!recipe)return;var tab=global.open('https://www.flowmusic.app/','_blank','noopener');if(tab)try{tab.opener=null;}catch(e){}setStatus('FLOW MUSIC OPENED · COPYING PROMPT…');copyFlowPrompt().then(function(copied){setStatus(copied?'FLOW MUSIC OPENED · PROMPT COPIED':'FLOW MUSIC OPENED · COPY PROMPT BELOW');});}
function requestId(){return global.crypto&&crypto.randomUUID?crypto.randomUUID():'fire-'+Date.now()+'-'+Math.random().toString(16).slice(2);}
function managedStatus(message){document.getElementById('fire-managed-status').textContent=message;}
async function checkManagedJob(){if(!managedJobId)return;managedStatus('Checking the private Fire job…');try{var data=await global.FTN.Auth.invoke('ftn-fire-generate',{action:'status',jobId:managedJobId});if(data.downloadUrl){managedStatus('Your private Fire output is ready. The download link expires in five minutes.');var link=document.createElement('a');link.href=data.downloadUrl;link.textContent='DOWNLOAD PRIVATE FIRE OUTPUT';link.className='fire-primary';link.style.display='inline-block';link.style.marginTop='10px';link.download='';var host=document.getElementById('fire-managed-status');host.parentNode.appendChild(link);document.getElementById('fire-managed-check').disabled=true;}else managedStatus(data.notice||data.error||('Fire job status: '+(data.status||'processing')+'.'));}catch(e){managedStatus('Fire job status is unavailable. No output or charge is being claimed.');}}
async function requestManaged(){if(!recipe)return;managedStatus('Checking your FTN Account and Fire launch controls…');try{var user=await global.FTN.Auth.getVerifiedUser();if(!user){managedStatus('Sign in to FTN Account before requesting managed generation.');global.location.href='/account/?return=%2Friddim%2Ffire%2F';return;}var data=await global.FTN.Auth.invoke('ftn-fire-generate',{action:'generate',prompt:recipe.plainLanguageDirection,style:recipe.style,key:recipe.key,format:'wav',durationSeconds:recipe.bars<=4?15:recipe.bars>=16?45:30,rightsConfirmed:true,noArtistImitation:true,clientRequestId:requestId()});managedJobId=data.jobId||null;document.getElementById('fire-managed-check').disabled=!managedJobId;managedStatus(data.notice||'Fire request accepted. Check job status for the private result.');}catch(e){managedStatus('FTN-managed generation is not enabled yet. No provider was called and no credits were reserved. The Flow Music hand-off remains available.');}}
function build(event){event.preventDefault();if(!document.getElementById('fire-originality').checked){setStatus('CONFIRM ORIGINALITY FIRST');return;}if(liveContext)stop();var prompt=document.getElementById('fire-prompt').value.trim();parsePrompt(prompt);var style=document.getElementById('fire-style').value,bpm=Math.max(60,Math.min(180,+document.getElementById('fire-bpm').value||defaults[style])),bars=+document.getElementById('fire-bars').value,instruments=Array.from(document.querySelectorAll('[name=instrument]:checked')).map(function(x){return x.value;});if(!instruments.length){setStatus('CHOOSE AN INSTRUMENT');return;}recipe={schemaVersion:3,engine:'FTN Fire free on-device procedural sketch',status:'LOCAL_DRAFT_READY',style:style,bpm:bpm,key:document.getElementById('fire-key').value,mood:document.getElementById('fire-mood').value,energy:+document.getElementById('fire-energy').value,bars:bars,arrangement:document.getElementById('fire-arrangement').value,swing:+document.getElementById('fire-swing').value,vibe:document.getElementById('fire-vibe').value,seed:+document.getElementById('fire-seed').value||2608,instruments:instruments,plainLanguageDirection:prompt||'Original '+style+' instrumental',vocals:false,lyrics:false,artistImitation:false,provider:'FTN local browser engine',providerCost:0,durationMs:bars*4*(60/bpm)*1000,createdAt:new Date().toISOString()};recipe.flowPrompt=flowPrompt(recipe);try{var list=JSON.parse(localStorage.getItem(STORE)||'[]');list.push(recipe);localStorage.setItem(STORE,JSON.stringify(list.slice(-20)));}catch(e){}draw(recipe);document.getElementById('fire-title').textContent='Free beat draft ready';document.getElementById('fire-recipe').innerHTML='<p><strong>Your original '+esc(style.replace(/-/g,' '))+' sketch is ready on this device.</strong> Play it, export a WAV, or export four editable stems. Nothing was uploaded or charged.</p>';document.getElementById('fire-flow-prompt').value=recipe.flowPrompt;['fire-play','fire-export-wav','fire-export-stems','fire-copy-flow','fire-open-flow'].forEach(function(id){document.getElementById(id).disabled=false;});setStatus('LOCAL DRAFT READY');}
async function askIbis(){if(!recipe)return;var host=document.getElementById('fire-ibis-output');host.textContent='Checking your authenticated ibis route…';try{var user=await global.FTN.Auth.getVerifiedUser();if(!user){host.innerHTML='Sign in before transferring the recipe to the configured text provider. <a href="/account/?return=%2Friddim%2Ffire%2F">Open FTN Account</a>.';return;}var result=await global.FTN.Auth.invoke('ibis-query',{country:'Caribbean',prompt:'Act as a practical Caribbean music producer. Give arrangement notes only for this original instrumental recipe. Do not write lyrics, generate a vocalist, imitate a named artist, claim that audio was generated, or invent commercial rights. Recipe: '+JSON.stringify(recipe)});host.textContent=result&&result.answer?result.answer:'No producer notes were returned. The audio recipe was not changed.';}catch(e){host.textContent='ibis Producer Notes are unavailable. No AI-generated arrangement was claimed. Your local draft remains usable.';}}
function seekFromPointer(clientX){var bar=document.getElementById('fire-progress'),r=bar.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(clientX-r.left)/r.width));seekTo(fraction);}
function init(){var form=document.getElementById('fire-form');form.addEventListener('submit',build);document.getElementById('fire-style').onchange=function(){document.getElementById('fire-bpm').value=defaults[this.value];};document.getElementById('fire-swing').oninput=function(){document.getElementById('fire-swing-value').textContent=this.value+'%';};document.getElementById('fire-copy-flow').onclick=copyFlowPrompt;document.getElementById('fire-open-flow').onclick=openFlow;document.getElementById('fire-play').onclick=togglePlayPause;document.getElementById('fire-stop').onclick=function(){stop();this.disabled=true;};document.getElementById('fire-export-wav').onclick=exportWav;document.getElementById('fire-export-stems').onclick=exportStems;
  var progress=document.getElementById('fire-progress');
  progress.addEventListener('pointerdown',function(e){if(recipe)seekFromPointer(e.clientX);});
  progress.addEventListener('keydown',function(e){if(!recipe)return;var durationSeconds=recipe.durationMs/1000,pos=currentPositionSeconds();if(e.key==='ArrowRight'){seekTo(Math.min(1,(pos+5)/durationSeconds));e.preventDefault();}else if(e.key==='ArrowLeft'){seekTo(Math.max(0,(pos-5)/durationSeconds));e.preventDefault();}});
  document.getElementById('fire-reset').onclick=function(){stop();form.reset();recipe=null;managedJobId=null;document.getElementById('fire-swing-value').textContent='8%';document.getElementById('fire-title').textContent='Ready for your idea';document.getElementById('fire-recipe').innerHTML='<p>Set the groove, then create a free on-device instrumental sketch. You can listen, export WAV, or export individual stems.</p>';document.getElementById('fire-flow-prompt').value='';['fire-play','fire-stop','fire-export-wav','fire-export-stems','fire-copy-flow','fire-open-flow'].forEach(function(id){document.getElementById(id).disabled=true;});var c=document.getElementById('fire-wave');if(c)c.getContext('2d').clearRect(0,0,c.width,c.height);document.getElementById('fire-progress-fill').style.width='0%';document.getElementById('fire-progress').setAttribute('aria-valuenow','0');document.getElementById('fire-time-current').textContent='0:00';document.getElementById('fire-time-duration').textContent='0:00';setStatus('READY');};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
