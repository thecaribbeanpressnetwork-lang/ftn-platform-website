// FTN ibis — authoritative semantic output contracts for the public workspace.
// Real image and governed Caribbean-news contracts stay here; broader evidence-dependent ASK
// requests are delegated to the universal CEBOS web-research workspace rather than generic model
// memory or narrow software-community feeds.
(function(global){
  'use strict';
  var SUPABASE='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var IMAGE_ENDPOINT=SUPABASE+'ibis-image-cloudflare';
  var NEWS_ENDPOINT=SUPABASE+'ftn-news-sources';
  var PROVIDERS=['cloudflare-workers-ai-image-flux','cloudflare-workers-ai-image-sdxl'];
  var LOCAL_FIXTURE_PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  var LIVE_PHRASES=['right now','happening now','currently','as of today','latest on','latest news','current news','recent news','this week','up to date','up-to-date','today','this month'];

  // Transitional loader: ibis-ai/index.html already loads this contract bridge on every public
  // workspace. Keep the universal research module separate, but ensure it is present without
  // duplicating research logic inside this file. A later bundling pass can move the script tag.
  (function loadUniversalResearch(){if(document.querySelector('script[src^="/js/ibis-web-research-workspace.js"]'))return;var s=document.createElement('script');s.src='/js/ibis-web-research-workspace.js?v=20260911.1';s.async=false;document.head.appendChild(s);})();

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function localFixtureHost(){return location.hostname==='127.0.0.1'||location.hostname==='localhost';}
  function activeVisual(){var b=document.querySelector('#ibis-form [data-mode="visual"]');return Boolean(b&&b.getAttribute('aria-pressed')==='true');}
  function imageIntent(text){var q=String(text||'').toLowerCase();return activeVisual()||(/\b(create|generate|make|render|draw|illustrate|design)\b/.test(q)&&/\b(image|picture|photo|photograph|visual|poster|graphic|thumbnail|cover|flyer|scene|portrait|landscape|logo|ibis|bird)\b/.test(q));}
  function currentIntent(text){var q=String(text||'').toLowerCase();return LIVE_PHRASES.some(function(p){return q.indexOf(p)!==-1;})||/\b(news|headlines|breaking|what(?:'s| is) happening)\b/.test(q);}
  function caribbeanNewsIntent(text){var q=String(text||'').toLowerCase();return currentIntent(q)&&(/\b(news|headlines|happening|current|latest|today)\b/.test(q))&&/\b(trinidad|tobago|trinidad and tobago|t&t|caribbean|caricom|local)\b/.test(q);}
  function append(kind,html){var log=document.getElementById('ibis-conversation');if(!log)return null;var welcome=document.getElementById('ibis-chat-welcome');if(welcome)welcome.remove();var row=document.createElement('div');row.className='ibis-msg ibis-msg--'+kind;var bubble=document.createElement('div');bubble.className='ibis-msg__bubble'+(kind==='ibis'?' ibis-msg__bubble--ibis':'');bubble.innerHTML=html;row.appendChild(bubble);log.appendChild(row);log.scrollTop=log.scrollHeight;return bubble;}
  function status(state){try{var host=document.getElementById('ibis-ai-status');if(host&&global.FTN&&global.FTN.IbisVisualState)global.FTN.IbisVisualState.set(host,state);}catch(_){} }

  function imageRequest(providerId,prompt){if(localFixtureHost())return Promise.resolve({ok:true,body:{image:LOCAL_FIXTURE_PNG,mimeType:'image/png',extension:'png',provider:'Deterministic release fixture',model:'fixture-png'}});return fetch(IMAGE_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({prompt:String(prompt||'').slice(0,2000),providerId:providerId})}).then(function(r){return r.json().catch(function(){return{};}).then(function(body){return{ok:r.ok,status:r.status,body:body};});});}
  function renderArtifact(out,prompt,b,providerId){var mime=b.mimeType==='image/jpeg'?'image/jpeg':'image/png',ext=b.extension==='jpg'?'jpg':'png',src='data:'+mime+';base64,'+b.image;out.innerHTML='<span class="workspace-kicker">IBIS · REAL IMAGE GENERATION</span><div class="ibis-visual-result"><img src="'+src+'" alt="'+esc(prompt)+'"><div><a class="btn btn-primary" download="ibis-generated-image.'+ext+'" href="'+src+'">Download image</a><button type="button" class="btn btn-outline" data-live-image-regenerate>Regenerate</button></div><p class="workspace-muted">Provider: '+esc(b.provider||'Cloudflare Workers AI')+' · Model: '+esc(b.model||providerId)+' · Output contract: generated image artifact.</p></div>';var button=out.querySelector('[data-live-image-regenerate]');if(button)button.onclick=function(){generate(prompt,out);};}
  async function generate(prompt,out){status('generating');out.innerHTML='<p class="ibis-msg__thinking">ibis is generating a real image artifact…</p>';for(var i=0;i<PROVIDERS.length;i++){try{var r=await imageRequest(PROVIDERS[i],prompt),b=r.body||{};if(r.ok&&b.image&&b.mimeType&&b.extension){renderArtifact(out,prompt,b,PROVIDERS[i]);status('idle');return true;}}catch(_){} }out.innerHTML='<span class="workspace-kicker">IMAGE GENERATION UNAVAILABLE</span><p>ibis understood this as a real image-generation request, but no verified image provider returned an image artifact. It will not substitute an on-device poster and pretend the task succeeded.</p>';status('idle');return false;}

  async function newsRequest(){
    if(localFixtureHost())return{ok:true,body:{localItems:[{title:'Trinidad fixture headline',publisher:'Fixture Trinidad Publisher',url:'https://example.test/trinidad-story',publishedAt:'2026-09-11T10:00:00Z',classification:'Publisher headline',verificationState:'Attributed publisher headline'}],items:[],fetchedAt:new Date().toISOString(),notice:'Release fixture'}};
    try{var r=await fetch(NEWS_ENDPOINT,{method:'GET',headers:{apikey:KEY}}),body=await r.json().catch(function(){return{};});return{ok:r.ok,body:body};}catch(e){return{ok:false,body:{error:e&&e.message||'network error'}};}
  }
  function freshEnough(item){var d=new Date(item&&item.publishedAt||0);return !Number.isNaN(d.getTime())&&(Date.now()-d.getTime())<=14*86400000;}
  function sourceRow(item){var date='';try{date=new Date(item.publishedAt).toLocaleDateString('en-TT',{month:'short',day:'numeric',year:'numeric'});}catch(_){}return'<a class="ibis-live-source" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer"><span class="ibis-live-source__platform">'+esc(item.publisher||'Source')+'</span><span class="ibis-live-source__title">'+esc(item.title||'Untitled')+'</span><span class="ibis-live-source__meta">'+esc(item.classification||'Current source')+(date?' · '+esc(date):'')+'</span></a>';}
  async function renderCaribbeanNews(prompt,out){
    status('working');out.innerHTML='<p class="ibis-msg__thinking">ibis is checking governed Caribbean news sources…</p>';
    var response=await newsRequest(),b=response.body||{};
    if(!response.ok){out.innerHTML='<span class="workspace-kicker">CURRENT-SOURCE ROUTE UNAVAILABLE</span><p>ibis recognized this as a current Caribbean news request, but the governed publisher-source route did not return evidence. It will not substitute GitHub, Hacker News or model memory.</p>';status('idle');return false;}
    var q=String(prompt||'').toLowerCase(),items=/\btrinidad|tobago|t&t|local\b/.test(q)?(b.localItems||[]):([].concat(b.localItems||[],b.items||[]));
    var fresh=items.filter(freshEnough).sort(function(a,c){return new Date(c.publishedAt)-new Date(a.publishedAt);}).slice(0,8);
    if(!fresh.length){out.innerHTML='<span class="workspace-kicker">CURRENT CARIBBEAN SOURCES · NO QUALIFYING HEADLINES</span><p>The configured publisher and institutional sources returned no recent headlines that satisfy ibis’s evidence gate. No replacement story was invented.</p>';status('idle');return false;}
    out.innerHTML='<span class="workspace-kicker ibis-live-kicker">CURRENT CARIBBEAN SOURCES · publisher/institutional evidence</span><p>Here are the most recent source-attributed headlines ibis can verify from its configured Caribbean source set. Open the original source for the full report.</p><div class="ibis-live-sources">'+fresh.map(sourceRow).join('')+'</div><p class="workspace-muted">Retrieved '+esc(new Date(b.fetchedAt||Date.now()).toLocaleString())+' · '+esc(b.notice||'Headline metadata is source discovery, not independent FTN verification.')+'</p>';
    status('idle');return true;
  }

  document.addEventListener('submit',function(e){
    var form=e.target;if(!form||form.id!=='ibis-form')return;
    var input=document.getElementById('ibis-goal'),prompt=input&&input.value.trim();if(!prompt)return;
    var kind=imageIntent(prompt)?'image':caribbeanNewsIntent(prompt)?'caribbean-news':'';
    if(!kind)return;
    e.preventDefault();e.stopImmediatePropagation();append('user',esc(prompt));var out=append('ibis','<p class="ibis-msg__thinking">ibis is matching the request to an evidence/output contract…</p>');if(input)input.value='';
    if(!out)return;if(kind==='image')generate(prompt,out);else renderCaribbeanNews(prompt,out);
  },true);

  global.FTN=global.FTN||{};
  global.FTN.IbisLiveContracts={generateImage:generate,renderCaribbeanNews:renderCaribbeanNews,providers:PROVIDERS.slice(),imageEndpoint:IMAGE_ENDPOINT,newsEndpoint:NEWS_ENDPOINT};
})(window);
