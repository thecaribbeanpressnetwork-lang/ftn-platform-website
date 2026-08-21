// FTN DJ Tube -- unified two-deck workstation (Pass 16 consolidation).
//
// Replaces two previously-separate, stacked interfaces (a local Web Audio deck pair injected by
// the old js/dj-local-workspace.js, followed by a YouTube-only deck pair rendered inside an
// iframed /dj-tube-prototype/) with ONE deck system. Each deck (A/B) now carries a real source
// toggle -- YouTube or a local file the user owns/is licensed for -- and both sources share the
// same crossfader/fader/master mixer controls.
//
// Honest technical boundary, stated once: YouTube audio plays through the IFrame Player API,
// which exposes only setVolume(0-100) -- there is no raw-audio access, so a YouTube deck can
// never have a real signal-derived waveform or true Web Audio mixing. A local file IS decoded via
// Web Audio (real AudioBuffer), so its waveform is genuinely derived from the audio data, and its
// volume is a real connected GainNode. The crossfader/fader/master sliders drive both kinds of
// deck through whichever mechanism actually applies to that deck's source -- never a fabricated
// unified signal graph pretending YouTube audio is Web-Audio-native.
(function(global){
'use strict';
const $=id=>document.getElementById(id);
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(sec){sec=Math.max(0,Math.floor(sec||0));return Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0');}

let TRACKS=[],QUEUE=[],ytApiReady=false,currentGenre='soca',mixing=false,activeDeck='A';
let ctx=null,masterGain=null;
const MAX_BYTES=50*1024*1024,MAX_SECONDS=10*60,QUEUE_STORE='ftn.dj.set-queue.v1';
const automix={active:false,mode:'ordered'};

function deckState(id){return{id,source:'youtube',ytPlayer:null,ytReady:false,index:id==='A'?0:1,buffer:null,file:null,bufferSource:null,gainNode:null,playing:false,offset:0,started:0,bpm:null,confidence:0};}
const decks={A:deckState('A'),B:deckState('B')};
function other(id){return id==='A'?'B':'A';}

// -- Shared Web Audio context (local-file decks only; YouTube never touches this graph) --------
async function ensureAudioContext(){if(!ctx){ctx=new (global.AudioContext||global.webkitAudioContext)({latencyHint:'interactive'});masterGain=ctx.createGain();masterGain.connect(ctx.destination);}if(ctx.state==='suspended')await ctx.resume();return ctx;}

function setStatus(text,type){$('status').className='status '+(type||'');$('status').textContent=text;}

// -- Real BPM estimate for a decoded local buffer (autocorrelation over an onset envelope) ------
function estimateBpm(buffer){
  const data=buffer.getChannelData(0),step=1024,n=Math.floor(data.length/step),env=new Float32Array(n);
  for(let i=0;i<n;i++){let sum=0;for(let j=0;j<step;j++)sum+=Math.abs(data[i*step+j]||0);env[i]=sum/step;}
  const fps=buffer.sampleRate/step;let best={bpm:0,score:-Infinity},energy=0;
  for(let i=0;i<n;i++)energy+=env[i]*env[i];
  for(let value=70;value<=180;value++){const lag=Math.round(fps*60/value);let score=0;for(let i=lag;i<n;i++)score+=env[i]*env[i-lag];if(score>best.score)best={bpm:value,score};}
  return{bpm:best.bpm,confidence:energy?Math.max(0,Math.min(.99,best.score/energy)):0};
}

// -- Real waveform, drawn once from the decoded buffer (truthful, not a fake animated EQ) -------
function drawWave(deck){
  const c=$('wave'+deck.id);if(!c)return;const x=c.getContext('2d'),ratio=global.devicePixelRatio||1,w=c.clientWidth||300,h=c.clientHeight||160;
  c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);x.setTransform(ratio,0,0,ratio,0,0);x.fillStyle='#08090d';x.fillRect(0,0,w,h);
  if(!deck.buffer)return;
  const data=deck.buffer.getChannelData(0),stride=Math.max(1,Math.floor(data.length/w));
  x.strokeStyle=deck.id==='A'?'#43c8ff':'#ff5866';x.lineWidth=1;x.beginPath();
  for(let px=0;px<w;px++){let min=1,max=-1;for(let j=0;j<stride;j++){const v=data[px*stride+j]||0;if(v<min)min=v;if(v>max)max=v;}x.moveTo(px,(1+min)*h/2);x.lineTo(px,(1+max)*h/2);}
  x.stroke();
}

// -- Deck source toggle: switching stops whatever is currently playing on that deck -------------
function setDeckSource(id,source){
  const deck=decks[id],article=$('deck'+id);
  stopDeck(id);
  deck.source=source;
  article.dataset.source=source;
  const isLocal=source==='local';
  $('screen'+id).querySelector('#yt'+id).hidden=isLocal;
  $('wave'+id).hidden=!isLocal;
  $('localRow'+id).hidden=!isLocal;
  $('controls'+id).hidden=isLocal;
  $('next'+id) && ($('next'+id).hidden=isLocal);
  if(isLocal){$('title'+id).textContent=deck.file?deck.file.name:'No local file loaded';$('sub'+id).textContent=deck.file?'Local file · your device only':'Choose a file you own or are licensed to use';}
  else{setMeta(id,TRACKS[deck.index]||null);}
}

function stopDeck(id){
  const deck=decks[id];
  if(deck.source==='youtube'&&deck.ytPlayer){try{deck.ytPlayer.pauseVideo();}catch(e){}}
  if(deck.source==='local'&&deck.bufferSource){try{deck.bufferSource.onended=null;deck.bufferSource.stop();}catch(e){}deck.bufferSource=null;}
  deck.playing=false;$('deck'+id).classList.remove('is-playing');
  const playBtn=$('play'+id);if(playBtn)playBtn.textContent='PLAY';
}

// ===================== YouTube deck path (adapted from the prior standalone prototype) =========
function ytPlayer(id){return decks[id].ytPlayer;}
function setMeta(id,track){
  if(!track)return;
  $('title'+id).textContent=track.title;
  $('sub'+id).textContent=(track.channel||'YouTube')+(track.durationSeconds?' · '+fmt(track.durationSeconds):'');
  $('deckA').classList.toggle('active',id==='A');$('deckB').classList.toggle('active',id==='B');
  activeDeck=id;
}
function loadYouTube(id,index,autoplay){
  if(!TRACKS.length)return;const deck=decks[id],p=deck.ytPlayer,i=(index+TRACKS.length)%TRACKS.length;
  deck.index=i;const t=TRACKS[i];setMeta(id,t);
  if(!p||!deck.ytReady)return;
  try{if(autoplay)p.loadVideoById(t.videoId);else p.cueVideoById(t.videoId);}catch(e){}
}
function toggleYouTube(id){
  const deck=decks[id],p=deck.ytPlayer;if(!p||!TRACKS.length)return;
  setMeta(id,TRACKS[deck.index]);
  try{const state=p.getPlayerState();if(state===YT.PlayerState.PLAYING)p.pauseVideo();else p.playVideo();}catch(e){}
}
function cueYouTube(id){const p=decks[id].ytPlayer;if(!p)return;try{p.pauseVideo();p.seekTo(0,true);}catch(e){}setMeta(id,TRACKS[decks[id].index]);}
function onYouTubeStateChange(id,state){
  const deck=decks[id];
  deck.playing=state===YT.PlayerState.PLAYING;
  $('deck'+id).classList.toggle('is-playing',deck.playing);
  const playBtn=$('play'+id);if(playBtn)playBtn.textContent=deck.playing?'PAUSE':'PLAY';
  if(state===YT.PlayerState.ENDED)onTrackEnded(id);
}

// ===================== Local-file deck path (adapted from the prior local-only workspace) ======
async function loadLocalFile(id,file){
  if(!file||!file.type.startsWith('audio/')){setStatus('Choose a browser-supported audio file for Deck '+id+'.','error');return;}
  if(file.size>MAX_BYTES){setStatus(file.name+' exceeds the 50 MB deck limit.','error');return;}
  setStatus('Decoding '+file.name+' locally for Deck '+id+'…');
  const deck=decks[id];
  try{
    const c=await ensureAudioContext(),buffer=await c.decodeAudioData(await file.arrayBuffer());
    if(buffer.duration>MAX_SECONDS)throw new Error('Track exceeds the 10 minute deck limit.');
    stopDeck(id);
    deck.file=file;deck.buffer=buffer;deck.offset=0;
    const result=estimateBpm(buffer);deck.bpm=result.bpm;deck.confidence=result.confidence;
    $('title'+id).textContent=file.name;$('sub'+id).textContent='Local file · '+fmt(buffer.duration)+' · your device only';
    $('bpm'+id).textContent=deck.bpm+' BPM estimate · '+Math.round(deck.confidence*100)+'% confidence -- correct by ear if needed';
    drawWave(deck);
    setStatus(file.name+' ready on Deck '+id+'. Audio never leaves this device.','good');
  }catch(e){setStatus('This browser could not prepare that file: '+e.message,'error');}
}
async function toggleLocal(id){
  const deck=decks[id];if(!deck.buffer)return;
  if(deck.playing){stopDeck(id);return;}
  const c=await ensureAudioContext(),s=c.createBufferSource(),g=c.createGain();
  s.buffer=deck.buffer;s.connect(g);g.connect(masterGain);
  deck.gainNode=g;deck.bufferSource=s;deck.started=c.currentTime;
  s.start(0,Math.min(deck.offset,deck.buffer.duration-.01));
  deck.playing=true;$('deck'+id).classList.add('is-playing');$('play'+id).textContent='PAUSE';
  s.onended=()=>{if(deck.bufferSource===s){deck.bufferSource=null;deck.playing=false;deck.offset=0;$('deck'+id).classList.remove('is-playing');$('play'+id).textContent='PLAY';onTrackEnded(id);}};
  applyVolumes();
}
function cueLocal(id){const deck=decks[id];stopDeck(id);deck.offset=0;}

// ===================== Unified mixer: applies to whichever source each deck actually uses ======
function applyVolumes(){
  const master=+$('master').value/100,cross=+$('cross').value/100,a=+$('faderA').value/100,b=+$('faderB').value/100;
  const gA=master*a*(1-cross),gB=master*b*cross;
  applyDeckVolume('A',gA);applyDeckVolume('B',gB);
}
function applyDeckVolume(id,value){
  const deck=decks[id];
  if(deck.source==='youtube'&&deck.ytPlayer){try{deck.ytPlayer.setVolume(Math.round(100*value));}catch(e){}}
  else if(deck.source==='local'&&deck.gainNode){deck.gainNode.gain.value=value;}
}

function timedMix(){
  if(mixing||!TRACKS.length&&!decks.A.buffer&&!decks.B.buffer)return;
  mixing=true;
  const toB=activeDeck==='A',target=toB?100:0,otherId=toB?'B':'A';
  ensureDeckIsPlaying(otherId);
  let start=+$('cross').value,step=0;const steps=36;
  const timer=setInterval(()=>{
    step++;$('cross').value=Math.round(start+(target-start)*(step/steps));applyVolumes();
    if(step>=steps){clearInterval(timer);mixing=false;
      if(decks[otherId].source==='youtube')setMeta(otherId,TRACKS[decks[otherId].index]);
      else activeDeck=otherId;
    }
  },70);
}
function ensureDeckIsPlaying(id){
  const deck=decks[id];
  if(deck.source==='youtube'&&deck.ytPlayer){try{deck.ytPlayer.playVideo();}catch(e){}}
  else if(deck.source==='local'&&deck.buffer&&!deck.playing){toggleLocal(id);}
}

// ===================== Discovery results + real, persisted Set Queue ============================
function renderQueue(){
  const q=$('queue');if(!TRACKS.length){q.innerHTML='<p class="error">No playable tracks were returned. Try Refresh or another genre.</p>';return;}
  q.innerHTML=TRACKS.map((t,i)=>'<div class="item"><img src="'+esc(t.thumbnail||'')+'" alt=""><span><strong>'+esc(t.title)+'</strong><small>'+esc(t.channel||'YouTube')+(t.durationSeconds?' · '+fmt(t.durationSeconds):'')+'</small><div class="item-actions"><button data-load="A:'+i+'">DECK A</button><button data-load="B:'+i+'">DECK B</button><button data-queue-add="'+i+'">+ QUEUE</button></div></span></div>').join('');
  q.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{const[deckId,i]=b.dataset.load.split(':');if(decks[deckId].source!=='youtube'){$('source'+deckId).value='youtube';setDeckSource(deckId,'youtube');}loadYouTube(deckId,+i,true);});
  q.querySelectorAll('[data-queue-add]').forEach(b=>b.onclick=()=>addToQueue(TRACKS[+b.dataset.queueAdd]));
}
function loadQueueFromStorage(){try{const raw=JSON.parse(localStorage.getItem(QUEUE_STORE)||'[]');if(Array.isArray(raw))QUEUE=raw;}catch(e){QUEUE=[];}}
function persistQueue(){try{localStorage.setItem(QUEUE_STORE,JSON.stringify(QUEUE));}catch(e){}}
function addToQueue(track){if(!track)return;QUEUE.push(track);persistQueue();renderSetQueue();}
function removeFromQueue(i){QUEUE.splice(i,1);persistQueue();renderSetQueue();}
function moveQueue(i,delta){const j=i+delta;if(j<0||j>=QUEUE.length)return;const tmp=QUEUE[i];QUEUE[i]=QUEUE[j];QUEUE[j]=tmp;persistQueue();renderSetQueue();}
function shuffleQueue(){for(let i=QUEUE.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const tmp=QUEUE[i];QUEUE[i]=QUEUE[j];QUEUE[j]=tmp;}persistQueue();renderSetQueue();}
function clearQueue(){QUEUE=[];persistQueue();renderSetQueue();}
function renderSetQueue(){
  $('queueCount').textContent=QUEUE.length+(QUEUE.length===1?' track queued.':' tracks queued.');
  const list=$('setQueue');
  if(!QUEUE.length){list.innerHTML='<p class="note">Add tracks from the discovery panel with + QUEUE.</p>';return;}
  list.innerHTML=QUEUE.map((t,i)=>'<div class="queue-row"><strong>'+esc(t.title)+'</strong><div class="item-actions"><button data-qup="'+i+'" aria-label="Move up">↑</button><button data-qdown="'+i+'" aria-label="Move down">↓</button><button data-qdel="'+i+'" aria-label="Remove">✕</button></div></div>').join('');
  list.querySelectorAll('[data-qup]').forEach(b=>b.onclick=()=>moveQueue(+b.dataset.qup,-1));
  list.querySelectorAll('[data-qdown]').forEach(b=>b.onclick=()=>moveQueue(+b.dataset.qdown,1));
  list.querySelectorAll('[data-qdel]').forEach(b=>b.onclick=()=>removeFromQueue(+b.dataset.qdel));
}
// Loads (does not remove) the next queued track into the given deck -- used by both the manual
// "LOAD NEXT" button and Automix's auto-advance.
function loadNextIntoDeck(deckId){
  if(!QUEUE.length)return false;
  const next=automix.mode==='shuffle'?QUEUE[Math.floor(Math.random()*QUEUE.length)]:QUEUE[0];
  const idx=TRACKS.indexOf(next);
  if(decks[deckId].source!=='youtube'){$('source'+deckId).value='youtube';setDeckSource(deckId,'youtube');}
  if(idx>=0){loadYouTube(deckId,idx,true);}
  else{
    // Queued track came from a prior search that is no longer the current TRACKS list -- append
    // it so loadYouTube's index-based lookup still works, rather than silently failing.
    TRACKS.push(next);loadYouTube(deckId,TRACKS.length-1,true);
  }
  if(automix.mode!=='shuffle')QUEUE.shift();else QUEUE.splice(QUEUE.indexOf(next),1);
  persistQueue();renderSetQueue();
  return true;
}

// ===================== Automix: real track-end detection, honest volume-transition only ========
function setAutomixStatus(text){$('automixStatus').textContent=text;}
function startAutomix(){
  if(!QUEUE.length){setAutomixStatus('Add at least one track to the queue before starting Automix.');return;}
  automix.active=true;$('automixStart').disabled=true;$('automixStop').disabled=false;
  setAutomixStatus('Automix running (volume transition, not beatmatched) · '+automix.mode.toUpperCase()+' · '+QUEUE.length+' queued.');
}
function stopAutomix(){automix.active=false;$('automixStart').disabled=false;$('automixStop').disabled=true;setAutomixStatus('Automix stopped.');}
function onTrackEnded(deckId){
  if(!automix.active||deckId!==activeDeck)return;
  const targetDeck=other(deckId);
  const loaded=loadNextIntoDeck(targetDeck);
  if(!loaded){setAutomixStatus('Queue is empty -- Automix stopped.');stopAutomix();return;}
  setTimeout(()=>{timedMix();setAutomixStatus('Automix running · '+automix.mode.toUpperCase()+' · '+QUEUE.length+' queued.');},600);
}

// ===================== Discovery (unchanged network calls, same Supabase edge function) ========
async function loadGenre(genre,force){
  currentGenre=genre;$('queueTitle').textContent=genre.replace('-',' / ').toUpperCase()+' · INDIVIDUAL TRACKS';
  $('queueStatus').textContent='Finding embeddable Caribbean tracks…';setStatus('Discovering '+genre+'…');
  document.querySelectorAll('[data-genre]').forEach(b=>{const on=b.dataset.genre===genre;b.setAttribute('aria-pressed',String(on));b.disabled=true;});
  try{
    const d=await global.FTN.MediaDiscovery.discover({mode:'music',genre,limit:160},{force:!!force});
    TRACKS=(d.results||[]).filter(t=>t.videoId);renderQueue();syncDecks(false);
    $('queueStatus').textContent=TRACKS.length+' live YouTube results · mixes excluded';
    setStatus(TRACKS.length+' tracks ready · '+genre,'good');
  }catch(e){TRACKS=[];renderQueue();$('queueStatus').textContent=e.message;setStatus(e.message,'error');}
  finally{document.querySelectorAll('[data-genre]').forEach(b=>b.disabled=false);}
}
async function searchMusic(q){
  q=String(q||'').trim();if(!q)return;
  setStatus('Searching Caribbean music…');$('queueStatus').textContent='Searching for '+q+'…';
  try{
    const d=await global.FTN.MediaDiscovery.discover({mode:'music',queries:[q+' official video Caribbean',q+' official audio Caribbean',q+' Trinidad Tobago music official'],limit:150},{force:true});
    TRACKS=d.results||[];renderQueue();syncDecks(false);
    $('queueTitle').textContent='SEARCH · '+q.toUpperCase();$('queueStatus').textContent=TRACKS.length+' embeddable individual-track results';
    setStatus(TRACKS.length+' tracks ready','good');
  }catch(e){setStatus(e.message,'error');$('queueStatus').textContent=e.message;}
}
function syncDecks(autoplayA){
  if(!TRACKS.length)return;
  decks.A.index=0;decks.B.index=Math.min(1,TRACKS.length-1);
  if(decks.A.source==='youtube')setMeta('A',TRACKS[decks.A.index]);
  if(decks.B.source==='youtube'){$('titleB').textContent=TRACKS[decks.B.index].title;$('subB').textContent=TRACKS[decks.B.index].channel||'YouTube';}
  if(ytApiReady){
    try{
      if(decks.A.ytPlayer&&decks.A.source==='youtube'){decks.A.ytPlayer.cueVideoById(TRACKS[decks.A.index].videoId);if(autoplayA)decks.A.ytPlayer.playVideo();}
      if(decks.B.ytPlayer&&decks.B.source==='youtube')decks.B.ytPlayer.cueVideoById(TRACKS[decks.B.index].videoId);
    }catch(e){}
  }
}

// -- Progress/time readout, real for both sources (YouTube: polled API; local: ctx.currentTime) -
function updateTimes(){
  ['A','B'].forEach(id=>{
    const deck=decks[id];
    if(deck.source==='youtube'&&deck.ytPlayer&&deck.ytPlayer.getCurrentTime){
      try{
        const cur=deck.ytPlayer.getCurrentTime(),dur=deck.ytPlayer.getDuration();
        $('time'+id).textContent=fmt(cur)+' / '+fmt(dur);
        $('progress'+id).style.width=dur?Math.min(100,(cur/dur)*100)+'%':'0%';
      }catch(e){}
    }else if(deck.source==='local'&&deck.buffer){
      const pos=deck.playing?Math.min(deck.buffer.duration,deck.offset+(ctx.currentTime-deck.started)):deck.offset;
      $('time'+id).textContent=fmt(pos)+' / '+fmt(deck.buffer.duration);
      $('progress'+id).style.width=Math.min(100,(pos/deck.buffer.duration)*100)+'%';
    }
  });
}

function bindDeck(id){
  $('play'+id).onclick=()=>decks[id].source==='youtube'?toggleYouTube(id):toggleLocal(id);
  $('cue'+id).onclick=()=>decks[id].source==='youtube'?cueYouTube(id):cueLocal(id);
  const nextBtn=$('next'+id);if(nextBtn)nextBtn.onclick=()=>loadYouTube(id,decks[id].index+1,true);
  $('source'+id).onchange=e=>setDeckSource(id,e.target.value);
  $('file'+id).onchange=function(){loadLocalFile(id,this.files&&this.files[0]);this.value='';};
}

window.onYouTubeIframeAPIReady=()=>{
  ytApiReady=true;
  const first=TRACKS[0]?.videoId||'M7lc1UVf-VE',second=TRACKS[1]?.videoId||first;
  decks.A.ytPlayer=new YT.Player('ytA',{width:'100%',height:'100%',videoId:first,playerVars:{controls:0,rel:0,playsinline:1,origin:location.origin},events:{
    onReady:()=>{decks.A.ytReady=true;applyVolumes();if(TRACKS.length)loadYouTube('A',0,false);if(decks.B.ytReady)setStatus(TRACKS.length+' tracks ready','good');},
    onStateChange:e=>onYouTubeStateChange('A',e.data)
  }});
  decks.B.ytPlayer=new YT.Player('ytB',{width:'100%',height:'100%',videoId:second,playerVars:{controls:0,rel:0,playsinline:1,origin:location.origin},events:{
    onReady:()=>{decks.B.ytReady=true;applyVolumes();if(TRACKS.length)loadYouTube('B',1,false);if(decks.A.ytReady)setStatus(TRACKS.length+' tracks ready','good');},
    onStateChange:e=>onYouTubeStateChange('B',e.data)
  }});
};

function init(){
  bindDeck('A');bindDeck('B');
  $('cross').oninput=applyVolumes;$('faderA').oninput=applyVolumes;$('faderB').oninput=applyVolumes;$('master').oninput=applyVolumes;
  $('mix').onclick=timedMix;
  $('refresh').onclick=()=>loadGenre(currentGenre,true);
  $('genres').onclick=e=>{const b=e.target.closest('[data-genre]');if(b)loadGenre(b.dataset.genre,true);};
  $('searchForm').onsubmit=e=>{e.preventDefault();searchMusic($('search').value);};
  $('automixStart').onclick=startAutomix;$('automixStop').onclick=stopAutomix;
  $('automixOrdered').onclick=()=>{automix.mode='ordered';$('automixOrdered').setAttribute('aria-pressed','true');$('automixShuffle').setAttribute('aria-pressed','false');};
  $('automixShuffle').onclick=()=>{automix.mode='shuffle';$('automixShuffle').setAttribute('aria-pressed','true');$('automixOrdered').setAttribute('aria-pressed','false');};
  $('queueShuffle').onclick=shuffleQueue;$('queueClear').onclick=clearQueue;
  $('queueLoadNext').onclick=()=>loadNextIntoDeck('B');
  loadQueueFromStorage();renderSetQueue();
  setInterval(updateTimes,250);
  const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);
  loadGenre('soca',false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
