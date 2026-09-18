// FTN Consolidation (2026-09-18): the filter-chain construction and WAV/MP3 encoding have moved
// to js/ftn-audio-dsp-engine.js, a headless module with no DOM dependency, so ibis's
// AUDIO_PROCESSING capability (and any future consumer) runs the exact same DSP math this page
// does. This file now delegates to it for those pieces -- same processing, same output, zero
// behavior change on this page; everything else here (live playback, waveform/spectrum drawing,
// version save/load, form wiring) is page-UI only.
const Engine=window.FTN&&window.FTN.AudioDSP;
const $=id=>document.getElementById(id),KEY='ftn-daw-versions-v3',status=$('status');let ctx=null,buffer=null,fileName='',source=null,nodes=null,raf=0,startedAt=0,offset=0,playingNeutral=false;const ids=['gain','tempo','lowCut','highCut','lowFreq','low','lowMidFreq','lowMid','lowMidQ','highMidFreq','highMid','highMidQ','highFreq','high'];
function settings(){return {gain:+gain.value,tempo:+tempo.value,lowCut:+lowCut.value,highCut:+highCut.value,lowFreq:+lowFreq.value,low:+low.value,lowMidFreq:+lowMidFreq.value,lowMid:+lowMid.value,lowMidQ:+lowMidQ.value,highMidFreq:+highMidFreq.value,highMid:+highMid.value,highMidQ:+highMidQ.value,highFreq:+highFreq.value,high:+high.value,intent:intent.value.trim()}}
// Pass 16 UX Guardian fix: this was named neutral(), the exact id of <button id="neutral">
// RESET CONTROLS</button>. A global function declaration wins over Window's named-property
// element fallback, so bare `neutral` resolved to this function everywhere, not the button --
// `neutral.onclick=...` (below) was silently setting a property on the function object, and the
// real button never got a listener. Renamed to eliminate the collision entirely.
function neutralSettings(){return Object.assign(Engine.neutralSettings(),{intent:intent.value})}
function khz(v){return Engine.khz(v)}function db(v){return Engine.db(v)}function fmt(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function labels(){gainVal.textContent=(+gain.value).toFixed(1)+' dB';tempoVal.textContent=tempo.value+'%';lowCutVal.textContent=khz(+lowCut.value);highCutVal.textContent=khz(+highCut.value);lowFreqVal.textContent=khz(+lowFreq.value);lowVal.textContent=(+low.value).toFixed(1)+' dB';lowMidFreqVal.textContent=khz(+lowMidFreq.value);lowMidVal.textContent=(+lowMid.value).toFixed(1)+' dB';lowMidQVal.textContent=(+lowMidQ.value).toFixed(2);highMidFreqVal.textContent=khz(+highMidFreq.value);highMidVal.textContent=(+highMid.value).toFixed(1)+' dB';highMidQVal.textContent=(+highMidQ.value).toFixed(2);highFreqVal.textContent=khz(+highFreq.value);highVal.textContent=(+high.value).toFixed(1)+' dB';drawEq()}
function drawEq(){const s=settings(),freqs=[60,100,180,300,500,800,1200,2500,4000,6500,10000,16000],els=[...eqMap.children];freqs.forEach((f,i)=>{let g=0;if(f<s.lowFreq)g+=s.low;if(f>=s.lowMidFreq/2&&f<=s.lowMidFreq*2)g+=s.lowMid*Math.max(0,1-Math.abs(Math.log2(f/s.lowMidFreq))/2);if(f>=s.highMidFreq/2&&f<=s.highMidFreq*2)g+=s.highMid*Math.max(0,1-Math.abs(Math.log2(f/s.highMidFreq))/2);if(f>s.highFreq)g+=s.high;if(f<s.lowCut||f>s.highCut)g-=18;els[i].style.height=Math.max(8,Math.min(78,42+g*2))+'px'})}
function buildWave(){wave.innerHTML='';if(!buffer)return;const data=buffer.getChannelData(0),bars=120,step=Math.max(1,Math.floor(data.length/bars));for(let i=0;i<bars;i++){let peak=0;for(let j=0;j<step;j++)peak=Math.max(peak,Math.abs(data[i*step+j]||0));const e=document.createElement('i');e.style.height=Math.max(5,peak*92)+'%';wave.appendChild(e)}timeTotal.textContent=fmt(buffer.duration)}
// Autonomous QA find: the real cause of DAW's ~270ms performance-budget long task was this
// function -- 705,600 samples (8s stereo @ 44.1kHz) of procedural synthesis run synchronously,
// unconditionally, on every page load. lazy-loading the (unrelated) MP3 encoder did not touch
// this. Chunked across requestIdleCallback slices instead of run in one block: same generation
// order and math per sample (channel 0 fully, then channel 1, exactly as before, so noise()'s
// shared seed produces byte-identical output), just yielded to the browser between slices so no
// single task blocks the main thread past a couple of milliseconds.
let starterGenerationToken=0;
function loadStarter(announce=true){
  stopPlayback();
  const myToken=++starterGenerationToken;
  const rate=44100,duration=8,length=rate*duration;
  const myBuffer=new AudioBuffer({numberOfChannels:2,length,sampleRate:rate});
  let seed=2408;
  function noise(){seed=(seed*16807)%2147483647;return seed/1073741823.5-1}
  const notes=[55,65.41,73.42,65.41];
  fileName='FTN-Port-of-Spain-Practice-Groove.wav';
  trackName.textContent='Port of Spain Practice Groove';
  trackMeta.textContent='8 sec · 44.1 kHz · FTN-owned procedural drums, bass and chord pulse';
  fileHint.textContent='Generating the FTN practice groove…';
  stemOverview.hidden=false;
  status.textContent='Generating the FTN practice groove…';
  const schedule=window.requestIdleCallback?window.requestIdleCallback.bind(window):(fn=>setTimeout(()=>fn({timeRemaining:()=>4,didTimeout:true}),0));
  let c=0,i=0;
  function step(deadline){
    if(myToken!==starterGenerationToken)return;
    const out=myBuffer.getChannelData(c);
    while(i<length&&(deadline.timeRemaining()>1||deadline.didTimeout)){
      const t=i/rate,half=t%.5,quarter=t%.25,bar=t%2,kick=Math.sin(2*Math.PI*(58-22*half)*half)*Math.exp(-16*half),snarePos=(t+.5)%1,snare=noise()*Math.exp(-24*snarePos)*.24,hat=noise()*Math.exp(-75*quarter)*.08,bassFreq=notes[Math.floor(t/2)%notes.length],bass=Math.sin(2*Math.PI*bassFreq*t)*(.22+.08*Math.sin(2*Math.PI*2*t)),chord=(Math.sin(2*Math.PI*261.63*t)+Math.sin(2*Math.PI*329.63*t)+Math.sin(2*Math.PI*392*t))*.035*(bar<.18?Math.exp(-7*bar):.18);
      out[i]=Math.max(-1,Math.min(1,kick*.42+snare+hat+bass+chord));
      i++;
    }
    if(i<length){schedule(step);return}
    if(c<1){c++;i=0;schedule(step);return}
    buffer=myBuffer;
    fileHint.textContent='FTN practice groove loaded. Replace it with audio you are authorized to use at any time.';
    buildWave();
    status.textContent=announce?'Starter project loaded. Press Play or choose a Caribbean remix starting point.':'Starter project ready. Press Play to hear it.';
  }
  schedule(step);
}
function makeNodes(s){const an=ctx.createAnalyser();an.connect(ctx.destination);const chain=Engine.buildFilterChain(ctx,s,an);nodes=Object.assign({},chain.nodes,{an});updateNodes(s);return chain.input}
function updateNodes(s=settings()){if(!nodes)return;const t=ctx.currentTime,sm=.02;nodes.hp.frequency.setTargetAtTime(s.lowCut,t,sm);nodes.lo.frequency.setTargetAtTime(s.lowFreq,t,sm);nodes.lo.gain.setTargetAtTime(s.low,t,sm);nodes.lm.frequency.setTargetAtTime(s.lowMidFreq,t,sm);nodes.lm.Q.setTargetAtTime(s.lowMidQ,t,sm);nodes.lm.gain.setTargetAtTime(s.lowMid,t,sm);nodes.hm.frequency.setTargetAtTime(s.highMidFreq,t,sm);nodes.hm.Q.setTargetAtTime(s.highMidQ,t,sm);nodes.hm.gain.setTargetAtTime(s.highMid,t,sm);nodes.hi.frequency.setTargetAtTime(s.highFreq,t,sm);nodes.hi.gain.setTargetAtTime(s.high,t,sm);nodes.lp.frequency.setTargetAtTime(s.highCut,t,sm);nodes.g.gain.setTargetAtTime(db(s.gain),t,sm);if(source)source.playbackRate.setTargetAtTime(s.tempo/100,t,.03)}
// Pass 16 UX Guardian fix: this was named stop(), the exact id of <button id="stop"> (the
// desktop transport's STOP button). Same shadowing bug as neutral() above -- renamed so the
// real button element is reachable again via the bare `stop` identifier.
function stopPlayback(reset=true){if(source){try{source.stop()}catch{}try{source.disconnect()}catch{}source=null}cancelAnimationFrame(raf);livePill.classList.remove('on');play.textContent='PLAY';mPlay.textContent='PLAY';if(reset){offset=0;playhead.style.left='0%';timeNow.textContent='0:00';document.querySelector('.meter i').style.width='0'}}
function tick(){if(!source||!buffer)return;const rate=source.playbackRate.value||1,elapsed=(ctx.currentTime-startedAt)*rate,pos=Math.min(buffer.duration,offset+elapsed);playhead.style.left=(pos/buffer.duration*100)+'%';timeNow.textContent=fmt(pos);const arr=new Uint8Array(nodes.an.frequencyBinCount);nodes.an.getByteFrequencyData(arr);let sum=0;for(const v of arr)sum+=v;document.querySelector('.meter i').style.width=Math.min(100,(sum/arr.length)/1.6)+'%';[...spectrum.children].forEach((bar,i)=>{const bin=Math.min(arr.length-1,Math.floor(Math.pow(i/24,1.7)*arr.length));bar.style.height=Math.max(3,(arr[bin]||0)/255*40)+'px'});raf=requestAnimationFrame(tick)}
async function start(useNeutral=false,from=offset){if(!buffer){status.textContent='Load a track first.';return}if(source)stopPlayback(false);ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')await ctx.resume();playingNeutral=useNeutral;const s=useNeutral?neutralSettings():settings();source=ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=s.tempo/100;source.connect(makeNodes(s));offset=Math.max(0,Math.min(buffer.duration-.01,from||0));startedAt=ctx.currentTime;source.start(0,offset);source.onended=()=>stopPlayback();livePill.classList.add('on');play.textContent='RESTART';mPlay.textContent='RESTART';status.textContent=useNeutral?'Playing original signal.':'Playing live FTN DAW signal — move controls while it plays.';tick()}
function seek(e){if(!buffer)return;const r=timeline.getBoundingClientRect(),p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));offset=p*buffer.duration;playhead.style.left=(p*100)+'%';timeNow.textContent=fmt(offset);if(source)start(playingNeutral,offset)}timeline.addEventListener('pointerdown',seek)
function apply(v){ids.forEach(id=>{if(v[id]!=null)$(id).value=v[id]});intent.value=v.intent||'';labels();updateNodes()}
function all(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}function put(v){localStorage.setItem(KEY,JSON.stringify(v))}function safe(s){return String(s||'').replace(/[<>&\"]/g,'')}
function renderVersions(){const v=all();versions.innerHTML=v.length?v.slice().reverse().map((x,i)=>{const idx=v.length-1-i;return '<div class="version"><strong>'+safe(x.name)+'</strong><span class="hint">'+safe(x.fileName||'')+' · '+new Date(x.savedAt).toLocaleString()+'</span><div class="row"><button data-load="'+idx+'">LOAD</button><button data-del="'+idx+'">DELETE</button></div></div>'}).join(''):'<div class="hint">No saved versions yet.</div>';versions.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{const x=all()[+b.dataset.load];apply(x.settings);versionName.value=x.name;status.textContent='Loaded '+x.name});versions.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const v=all();v.splice(+b.dataset.del,1);put(v);renderVersions()})}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
// Pass 16 UX Guardian fix: this was named recipe(), the exact id of <button id="recipe">
// DOWNLOAD RECIPE</button> -- same shadowing bug as neutral()/stop() above.
function buildRecipe(){return {format:'ftn-daw-recipe',version:3,source:{fileName},settings:settings(),savedAt:new Date().toISOString()}}
async function renderWav(){if(!buffer){status.textContent='Load a track first.';return}status.textContent='Rendering WAV locally…';const blob=Engine.wavFromBuffer(await Engine.renderProcessedBuffer(buffer,settings()));download(blob,(fileName.replace(/\.[^.]+$/,'')||'ftn-daw')+'-FTN-DAW.wav');status.textContent='Processed WAV downloaded.'}
async function renderMp3(){if(!buffer){status.textContent='Load a track first.';return}try{status.textContent='Loading the local MP3 encoder…';await Engine.loadLameEncoder();status.textContent='Rendering and encoding MP3 locally…';const rendered=await Engine.renderProcessedBuffer(buffer,settings()),blob=Engine.mp3FromBuffer(rendered);download(blob,(fileName.replace(/\.[^.]+$/,'')||'ftn-daw')+'-FTN-DAW.mp3');status.textContent='Processed MP3 downloaded. Audio never left this device.'}catch(e){status.textContent='MP3 export could not complete: '+e.message}}
file.onchange=async e=>{const f=e.target.files[0];if(!f)return;stop();fileName=f.name;fileHint.textContent='Decoding '+f.name+'…';ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();try{buffer=await ctx.decodeAudioData(await f.arrayBuffer());trackName.textContent=f.name;trackMeta.textContent=(buffer.duration/60).toFixed(2)+' min · '+buffer.sampleRate+' Hz · '+buffer.numberOfChannels+' channel'+(buffer.numberOfChannels===1?'':'s');fileHint.textContent='Ready. Audio remains local.';stemOverview.hidden=true;buildWave();status.textContent='Track loaded. Press Play, then move controls live.'}catch{status.textContent='This browser could not decode that audio file.'}};
ids.forEach(id=>$(id).oninput=()=>{labels();if(source&&!playingNeutral){updateNodes();status.textContent='Live change applied: '+id.replace(/([A-Z])/g,' $1').toLowerCase()+'.'}else if(source&&playingNeutral){status.textContent='Original comparison is playing. Press Play to return to live processing.'}});starter.onclick=()=>loadStarter(true);document.querySelectorAll('[data-remix]').forEach(button=>button.onclick=()=>{const presets={soca:{tempo:112,low:3,lowMid:-1,highMid:2,high:1},reggae:{tempo:82,low:4,lowMid:1,highMid:-1,high:1},dancehall:{tempo:96,low:5,lowMid:-2,highMid:2,high:2},calypso:{tempo:104,low:1,lowMid:2,highMid:3,high:2}},name=button.dataset.remix,p=presets[name];Object.entries(p).forEach(([id,value])=>$(id).value=value);labels();updateNodes();status.textContent=name.charAt(0).toUpperCase()+name.slice(1)+' starter settings applied. These are adjustable mix controls, not automatic mastering.';});play.onclick=()=>start(false,0);
// Pass 16 UX Guardian fix: wired via $('id') explicitly (not the bare `stop`/`neutral`/`recipe`
// identifiers) so this stays correct even if a future edit reintroduces a same-named function --
// the whole class of bug above was bare-identifier ambiguity between a function and a DOM id.
$('stop').onclick=()=>stopPlayback();original.onclick=()=>start(true,0);mPlay.onclick=()=>start(false,0);mStop.onclick=()=>stopPlayback();mOriginal.onclick=()=>start(true,0);$('neutral').onclick=()=>{apply(neutralSettings());status.textContent='Controls reset to neutral.'};back.onclick=()=>location.href='../';save.onclick=()=>{if(!buffer){status.textContent='Load a track first.';return}const v=all(),name=versionName.value.trim()||'Version '+(v.length+1);v.push({name,fileName,settings:settings(),savedAt:new Date().toISOString()});put(v);versionName.value=name;renderVersions();status.textContent='Saved '+name};wav.onclick=renderWav;mp3.onclick=renderMp3;$('recipe').onclick=()=>download(new Blob([JSON.stringify(buildRecipe(),null,2)],{type:'application/json'}),(fileName.replace(/\.[^.]+$/,'')||'ftn-daw')+'-recipe.json');for(let i=0;i<24;i++)spectrum.appendChild(document.createElement('i'));labels();renderVersions();loadStarter(false);
