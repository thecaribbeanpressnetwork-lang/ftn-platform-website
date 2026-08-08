(() => {
'use strict';

const DEFAULT_VIDEOS=[
{id:'JZ4h_ldPUgk',title:'Soca 2026 Mix — Soca Spark 26',creator:'DJ Ana & Ultra Simmo',genre:'Soca',region:'Trinidad & Tobago'},
{id:'svCJ3C5LviI',title:'Trinidad Carnival 2026 Road Power Soca DJ Mix',creator:'Sir Trey Benjamin',genre:'Soca',region:'Trinidad & Tobago'},
{id:'VG-NhYHjPrE',title:'Dancehall Mix 2026 — 50 Best Dancehall Songs',creator:'DJ Treasure',genre:'Dancehall',region:'Jamaica'},
{id:'eKIOU9X0MxI',title:'Dancehall Mix 2026 Vol. 4 — Raw & Clean',creator:'ZJ Liquid Music',genre:'Dancehall',region:'Jamaica'}
];

const state={decks:[null,null],deckVideos:[null,null],activeDeck:0,queue:[],crossfade:50,masterVolume:80,playing:false,ready:false};
const els={player:document.querySelector('#dj-deck-player'),deckA:document.querySelector('#dj-deck-a'),deckB:document.querySelector('#dj-deck-b'),queue:document.querySelector('#dj-queue'),now:document.querySelector('#dj-now-playing'),status:document.querySelector('#dj-player-status'),crossfade:document.querySelector('#dj-crossfade'),volume:document.querySelector('#dj-master-volume'),play:document.querySelector('#dj-play'),next:document.querySelector('#dj-next'),prev:document.querySelector('#dj-prev'),clear:document.querySelector('#dj-clear-queue')};
if(!els.player)return;

const ytApi=new Promise(resolve=>{
if(window.YT?.Player)return resolve(window.YT);
const old=window.onYouTubeIframeAPIReady;
window.onYouTubeIframeAPIReady=()=>{old?.();resolve(window.YT)};
if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)}
});
const esc=v=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const setStatus=t=>{if(els.status)els.status.textContent=t};

function deckRoot(i){return i===0?els.deckA:els.deckB}
function setDeckMeta(i,v){const r=deckRoot(i);if(!r)return;r.dataset.videoId=v?.id||'';r.dataset.loaded=v?'true':'false';r.querySelector('[data-deck-title]').textContent=v?.title||'Load a mix';r.querySelector('[data-deck-creator]').textContent=v?`${v.creator} · ${v.genre}`:'Choose a video from the queue'}
function videoFromCard(c){return{id:c.dataset.videoId,title:c.dataset.title||'DJ Tube Mix',creator:c.dataset.creator||'DJ Tube',genre:c.dataset.genre||'Caribbean',region:c.dataset.region||'Caribbean'}}
function currentVideo(){return state.deckVideos[state.activeDeck]||null}

function createPlayer(i){return ytApi.then(YT=>new Promise(resolve=>{
const host=document.querySelector(i===0?'#dj-youtube-a':'#dj-youtube-b');
if(!host)return resolve(null);
let player;
player=new YT.Player(host,{width:'100%',height:'100%',videoId:'',playerVars:{autoplay:0,controls:1,rel:0,playsinline:1,modestbranding:1},events:{
onReady:()=>resolve(player),
onStateChange:e=>{
if(e.data===YT.PlayerState.PLAYING){state.playing=true;state.activeDeck=i;updateUi()}
if(e.data===YT.PlayerState.PAUSED&&state.activeDeck===i)state.playing=false;
if(e.data===YT.PlayerState.ENDED&&state.activeDeck===i)next();
},
onError:()=>setStatus(`YouTube could not play Deck ${i===0?'A':'B'} — this video may be unavailable or may block embedding.`)
}})
}))}

async function ensurePlayers(){
if(state.ready)return;
setStatus('Connecting to YouTube…');
state.decks[0]=await createPlayer(0);state.decks[1]=await createPlayer(1);
state.ready=Boolean(state.decks[0]&&state.decks[1]);
if(!state.ready){setStatus('Player connection incomplete');return}
setStatus('YouTube connected · 2-deck mode ready');
if(!state.deckVideos[0])load(0,state.queue[0],false);
if(!state.deckVideos[1])load(1,state.queue[1]||state.queue[0],false);
state.activeDeck=0;setVolume();updateUi()
}

function load(i,v,autoplay=false){
if(!v)return;
state.deckVideos[i]=v;setDeckMeta(i,v);
const player=state.decks[i];
if(player){player.cueVideoById(v.id);if(autoplay){state.activeDeck=i;player.playVideo();state.playing=true}}
else if(autoplay){state.activeDeck=i}
setVolume();updateUi()
}

function addToQueue(v){
if(!v?.id||state.queue.some(x=>x.id===v.id))return;
state.queue.push(v);renderQueue();
if(!state.deckVideos[0])load(0,v,false);else if(!state.deckVideos[1])load(1,v,false)
}
function renderQueue(){
if(!els.queue)return;
els.queue.innerHTML=state.queue.length?state.queue.map((v,i)=>`<button type="button" class="dj-queue-item" data-index="${i}"><span class="dj-queue-item__number">${i+1}</span><span><strong>${esc(v.title)}</strong><small>${esc(v.creator)} · ${esc(v.genre)}</small></span></button>`).join(''):'<p class="dj-queue-empty">Your queue is empty. Add a mix above.</p>';
els.queue.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('click',()=>load(state.activeDeck,state.queue[Number(b.dataset.index)],true)))
}
function setVolume(){
const cf=state.crossfade/100;
const a=cf<=.5?1:2*(1-cf);const b=cf>=.5?1:2*cf;
state.decks[0]?.setVolume?.(Math.round(state.masterVolume*a));state.decks[1]?.setVolume?.(Math.round(state.masterVolume*b))
}
function togglePlay(){ensurePlayers().then(()=>{const p=state.decks[state.activeDeck];if(!p)return;if(state.playing){p.pauseVideo();state.playing=false;setStatus('Paused')}else{p.playVideo();state.playing=true;setStatus('Playing')}updateUi()})}
function next(){
if(!state.queue.length)return;
const c=currentVideo();const i=c?state.queue.findIndex(v=>v.id===c.id):-1;const nextVideo=state.queue[(i+1+state.queue.length)%state.queue.length];const target=state.activeDeck===0?1:0;load(target,nextVideo,true)
}
function prev(){
if(!state.queue.length)return;
const c=currentVideo();const i=c?state.queue.findIndex(v=>v.id===c.id):0;load(state.activeDeck,state.queue[(i-1+state.queue.length)%state.queue.length],true)
}
function updateUi(){
const v=currentVideo();if(els.now)els.now.textContent=v?`${v.title} · ${v.creator}`:'Nothing playing';if(els.play)els.play.textContent=state.playing?'Pause':'Play';if(els.crossfade)els.crossfade.value=state.crossfade;if(els.volume)els.volume.value=state.masterVolume;[els.deckA,els.deckB].forEach((r,i)=>r?.classList.toggle('is-active',i===state.activeDeck))
}

els.play?.addEventListener('click',togglePlay);els.next?.addEventListener('click',next);els.prev?.addEventListener('click',prev);
els.crossfade?.addEventListener('input',e=>{state.crossfade=Number(e.target.value);setVolume();updateUi()});
els.volume?.addEventListener('input',e=>{state.masterVolume=Number(e.target.value);setVolume();updateUi()});
els.clear?.addEventListener('click',()=>{state.queue=[];state.deckVideos=[null,null];state.playing=false;state.decks.forEach(p=>p?.stopVideo?.());setDeckMeta(0,null);setDeckMeta(1,null);renderQueue();updateUi()});

document.addEventListener('click',e=>{const c=e.target.closest('[data-dj-queue-add]');if(!c)return;e.preventDefault();addToQueue(videoFromCard(c));document.querySelector('#dj-deck-player')?.scrollIntoView({behavior:'smooth',block:'start'});ensurePlayers()});

state.queue=[...DEFAULT_VIDEOS];renderQueue();ensurePlayers();updateUi();
})();
