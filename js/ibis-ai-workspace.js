// FTN Platform — ibis.ai functional intelligence workspace.
//
// UX quick-fix (this pass): the composer, conversation and shortcuts were three separate stacked
// page sections, so submitting a request left the answer somewhere the user had to scroll to find.
// This rewrite changes ONLY the layout/interaction shape -- every generation function below
// (createVisual/renderMedia/renderAnalysis/localAI/serverAI/routeResults) keeps its exact original
// body and behavior; only where each one's HTML gets inserted changed (into a per-turn message
// bubble instead of one page-level panel that got wholesale-replaced each submission). Routing,
// providers, authentication, economics and fail-closed behavior are all untouched.
(function(global){'use strict';
  function loadScript(src){return new Promise(function(resolve){if(document.querySelector('script[src="'+src+'"]')){resolve();return;}var s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);});}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function country(){return global.FTN&&global.FTN.Country&&global.FTN.Country.get?global.FTN.Country.get().name:'Trinidad & Tobago';}
  function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){var words=String(text).split(/\s+/),line='',lines=[];for(var i=0;i<words.length;i++){var test=line?line+' '+words[i]:words[i];if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=words[i];if(lines.length>=maxLines-1)break;}else line=test;}if(line&&lines.length<maxLines)lines.push(line);lines.forEach(function(l,n){ctx.fillText(l,x,y+n*lineHeight);});return y+lines.length*lineHeight;}
  // Bounded-wait helper: resolves with fallbackValue if promise hasn't settled within ms,
  // instead of leaving a caller awaiting forever. The abandoned promise is left to settle on
  // its own (harmless) -- this only ever changes what THIS request waits for, not whether the
  // underlying operation (e.g. a background model download) keeps running.
  function withTimeout(promise,ms,fallbackValue){return new Promise(function(resolve){var settled=false;var timer=setTimeout(function(){if(!settled){settled=true;resolve(fallbackValue);}},ms);promise.then(function(v){if(!settled){settled=true;clearTimeout(timer);resolve(v);}},function(){if(!settled){settled=true;clearTimeout(timer);resolve(fallbackValue);}});});}
  async function ensureData(){await loadScript('/js/ftn-media-discovery.js');if(!global.FTN.Auth)await loadScript('/js/ftn-auth.js');if(!global.FTN.Sources)await loadScript('/js/source-registry.js');if(!global.FTN.DataSource)await loadScript('/js/data-source.js');if(!global.FTN.indicators)await loadScript('/js/indicators-data.js');if(!global.FTN.Relationships)await loadScript('/js/relationships-data.js');}
  function ensureVisualState(){if(global.FTN&&global.FTN.IbisVisualState)return Promise.resolve();return loadScript('/js/ibis-visual-state.js');}
  function numericHistory(i){return(i&&Array.isArray(i.history)?i.history:[]).map(Number).filter(Number.isFinite);}
  function change(i){var s=numericHistory(i);if(s.length<2)return null;var a=s[0],b=s[s.length-1];return{delta:b-a,pct:a?(b-a)/Math.abs(a)*100:null};}
  function relevantIndicators(q){var terms=q.toLowerCase().split(/[^a-z0-9]+/).filter(function(x){return x.length>2;});return(global.FTN.indicators||[]).map(function(i){var hay=(i.title+' '+i.category+' '+(i.changeLabel||'')).toLowerCase(),score=terms.reduce(function(n,t){return n+(hay.indexOf(t)>=0?1:0);},0);return{i:i,score:score,c:change(i)};}).filter(function(x){return x.score>0||x.c;}).sort(function(a,b){return b.score-a.score||Math.abs((b.c&&b.c.pct)||0)-Math.abs((a.c&&a.c.pct)||0);}).slice(0,8);}
  // Diagnostic fix: a 'downloadable' availability state means the on-device model is NOT yet
  // present -- calling create() would silently start a real (multi-hundred-MB) background
  // download as a side effect of answering one chat message, with no progress indicator and no
  // way for the user to know why "thinking" never ends. Only 'available' (already downloaded,
  // ready now) is allowed to use the on-device path; 'downloadable' and 'unavailable' both fall
  // straight through to the existing server/router fallback instead, same as before. The
  // capability itself is preserved -- an already-warm on-device model still answers locally.
  async function localAI(prompt){
    if(!('LanguageModel' in global))return null;
    try{
      var opts={expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]};
      var availability=await withTimeout(global.LanguageModel.availability(opts),5000,null);
      if(availability!=='available')return null;
      var session=await withTimeout(global.LanguageModel.create(opts),8000,null);
      if(!session)return null;
      var answer=await withTimeout(session.prompt('You are ibis.ai, FTN Platform’s Caribbean-first intelligence assistant. Be practical, concise and transparent. Do not invent current facts. When the user asks for an FTN action, connect the answer to the appropriate FTN tool. User country context: '+country()+'.\n\nUser request: '+prompt),20000,null);
      try{session.destroy();}catch(e){}
      return answer;
    }catch(e){return null;}
  }
  var TIMED_OUT={};
  async function serverAI(prompt){
    if(!(global.FTN&&global.FTN.Auth))return{available:false,reason:'FTN Account did not load.'};
    try{
      var user=await withTimeout(global.FTN.Auth.getVerifiedUser(),8000,TIMED_OUT);
      if(user===TIMED_OUT)return{available:false,reason:'ibis AI is temporarily unavailable. Please try again in a moment.'};
      if(!user)return{available:false,guest:true,reason:'Sign in to use the protected server AI route.'};
      var result=await withTimeout(global.FTN.Auth.invoke('ibis-query',{prompt:prompt,country:country()}),25000,TIMED_OUT);
      if(result===TIMED_OUT)return{available:false,reason:'ibis AI is temporarily unavailable. Please try again in a moment.'};
      if(!result||!result.answer)return{available:false,reason:'The server returned no answer.'};
      return{available:true,answer:result.answer,provider:result.provider||'Configured provider',model:result.model||'',generatedAt:result.generatedAt||new Date().toISOString()};
    }catch(e){return{available:false,reason:e.message||'The protected server AI route is unavailable.'};}
  }
  function routeResults(goal){var matches=global.FTN&&global.FTN.IntentRouter?global.FTN.IntentRouter.route(goal):[];if(!matches.length)return'<p>No strong FTN route matched. Try describing the outcome, not the product name.</p>';return'<div class="ibis-action-grid">'+matches.slice(0,5).map(function(m){return'<a class="ibis-action" href="'+esc(m.product.route)+'"><strong>'+esc(m.product.name)+'</strong><span>'+esc(m.product.tagline)+'</span><small>'+esc(m.explanation)+'</small></a>';}).join('')+'</div>';}
  function renderAnalysis(q){var rows=relevantIndicators(q);if(!rows.length)return'<p>No matching indicator history is loaded yet.</p>';return'<div class="ibis-data-list">'+rows.map(function(x){var c=x.c,p=c&&c.pct!=null?((c.pct>=0?'+':'')+c.pct.toFixed(1)+'%'):'history loaded';return'<article><strong>'+esc(x.i.title)+'</strong><span>'+esc(x.i.category)+'</span><b>'+p+'</b><small>'+esc(x.i.classification||'')+' · '+esc(x.i.sourceName||'')+'</small></article>';}).join('')+'</div><p class="workspace-muted">Open <a href="/observatory/">FTN Live</a> or <a href="/scenario-workspace/#correlation-engine">Mission Control</a> to inspect relationships and evidence.</p>';}
  async function renderMedia(q,out){out.innerHTML='<p>Searching FTN media discovery…</p>';var lower=q.toLowerCase(),music=/song|music|soca|reggae|dancehall|calypso|kaiso|chutney|kompa|zouk|steelpan/.test(lower),d;try{if(music){var genre=/reggae/.test(lower)?'reggae':/dancehall/.test(lower)?'dancehall':/calypso|kaiso/.test(lower)?'calypso':/chutney/.test(lower)?'chutney':/kompa|zouk/.test(lower)?'zouk-kompa':'soca';d=await global.FTN.MediaDiscovery.discover({mode:'music',genre:genre,queries:[q+' official video Caribbean',q+' official audio Caribbean'],limit:60},{force:true});}else d=await global.FTN.MediaDiscovery.discover({mode:'video',queries:[q,q+' Trinidad Tobago',q+' Caribbean'],limit:60},{force:true});var items=d.results||[];out.innerHTML='<div class="ibis-media-grid">'+items.slice(0,24).map(function(t){return'<a href="https://www.youtube.com/watch?v='+encodeURIComponent(t.videoId)+'" target="_blank" rel="noopener"><img src="'+esc(t.thumbnail||'')+'" alt=""><strong>'+esc(t.title)+'</strong><span>'+esc(t.channel||'YouTube')+'</span></a>';}).join('')+'</div><p class="workspace-muted">'+items.length+' embeddable source results found. Open music in <a href="/riddim/dj/">FTN DJ Tube</a>, films in <a href="/screen/">FTN Screen</a>, or scheduled programming in <a href="/tv/">FTN TV</a>.</p>';}catch(e){out.innerHTML='<p>'+esc(e.message)+'</p>';}}
  async function createVisual(prompt,out){var ai=await localAI('Write a short headline of no more than 9 words for a Caribbean technology visual about: '+prompt);var title=(ai||prompt).replace(/[\n\r]+/g,' ').trim().slice(0,120),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;var ctx=canvas.getContext('2d'),h=hash(prompt),hue=h%360;var g=ctx.createLinearGradient(0,0,1200,630);g.addColorStop(0,'#050505');g.addColorStop(.65,'hsl('+hue+' 55% 18%)');g.addColorStop(1,'#111');ctx.fillStyle=g;ctx.fillRect(0,0,1200,630);for(var i=0;i<14;i++){var x=(h*(i+3)%1100)+50,y=(h*(i+11)%530)+50,r=8+(h*(i+17)%40);ctx.strokeStyle='hsla('+((hue+i*17)%360)+' 80% 70% / .25)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#E10613';ctx.fillRect(72,70,96,8);ctx.fillStyle='#fff';ctx.font='800 30px Inter,Arial';ctx.fillText('ibis.ai · FTN PLATFORM',72,125);ctx.font='800 68px Inter,Arial';var bottom=wrap(ctx,title,72,230,920,78,4);ctx.font='500 24px Inter,Arial';ctx.fillStyle='#d5d7dc';wrap(ctx,'Caribbean-first intelligence · '+country(),72,Math.min(535,bottom+38),900,32,2);ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1000,120);ctx.quadraticCurveTo(1080,160,1040,250);ctx.quadraticCurveTo(1000,325,1080,400);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(1040,250,10,0,Math.PI*2);ctx.fill();var url=canvas.toDataURL('image/png');out.innerHTML='<div class="ibis-visual-result"><img src="'+url+'" alt="Generated FTN visual"><div><a class="btn btn-primary" download="ibis-ftn-visual.png" href="'+url+'">Download PNG</a><button type="button" class="btn btn-outline" data-new-visual>Regenerate</button></div></div>';var b=out.querySelector('[data-new-visual]');if(b)b.onclick=function(){createVisual(prompt,out);};}

  var EXAMPLES=[
    ['What changed?','Show me the biggest changes in national indicators'],
    ['Find Caribbean movies','Find Trinidad and Caribbean movies I can watch'],
    ['Find soca','Find current soca tracks, not DJ mixes'],
    ['Find funding','I need funding opportunities for a Caribbean technology startup'],
    ['Create a visual','Create a visual for a Caribbean digital infrastructure campaign'],
  ];

  function injectStyle(){if(document.querySelector('link[data-ibis-style]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href='/css/components/ibis-ai.css?v=20260821.1';l.setAttribute('data-ibis-style','true');document.head.appendChild(l);}

  async function init(){injectStyle();await ensureData();global.FTN.WorkspaceShell.init({productId:'ibis-ai',mountId:'workspace-root',accentSmallVar:'--color-ibis-on-dark',build:function(content){
      content.innerHTML='<div class="ibis-chat">'
        +'<aside class="ibis-chat__sidebar" id="ibis-chat-sidebar">'
          +'<button type="button" class="btn btn-outline ibis-chat__new" id="ibis-new-chat">+ New chat</button>'
          +'<div class="ibis-chat__section"><span class="ibis-chat__section-label">Try asking</span><div class="ibis-chat__shortcuts">'
            +EXAMPLES.map(function(e){return'<button type="button" data-example="'+esc(e[1])+'">'+esc(e[0])+'</button>';}).join('')
          +'</div></div>'
        +'</aside>'
        +'<button type="button" class="ibis-chat__sidebar-toggle" id="ibis-sidebar-toggle" aria-expanded="false" aria-controls="ibis-chat-sidebar">Menu</button>'
        +'<div class="ibis-chat__main">'
          +'<header class="ibis-chat__header"><div><span class="workspace-kicker">Ask · Find · Analyze · Create</span><h1>ibis</h1></div><span id="ibis-ai-status"></span></header>'
          +'<div class="ibis-chat__conversation" id="ibis-conversation" role="log" aria-live="polite">'
            +'<div class="ibis-chat__welcome" id="ibis-chat-welcome"><h2>What do you need done?</h2><p>Ask ibis in plain language — find Caribbean films, analyze what changed, help with a grant, create a visual, route me to the right FTN tool…</p></div>'
          +'</div>'
          +'<form class="ibis-chat__composer" id="ibis-form">'
            +'<div class="ibis-mode-row"><button type="button" data-mode="ask" aria-pressed="true">ASK</button><button type="button" data-mode="find">FIND</button><button type="button" data-mode="analyze">ANALYZE FTN</button><button type="button" data-mode="visual">CREATE VISUAL</button></div>'
            +'<div class="ibis-chat__input-row"><textarea id="ibis-goal" rows="1" placeholder="Message ibis…" required></textarea><button type="submit" class="btn btn-primary ibis-chat__send" aria-label="Send">&rarr;</button></div>'
          +'</form>'
        +'</div>'
      +'</div>'
      // Real anchor for js/ibis-creative-studio.js, unrelated to this pass's UX fix -- that
      // script's mount() looks for .ibis-shortcuts (document.querySelector) and inserts its own
      // "Creative Studio" section immediately after it. The interactive shortcut buttons moved
      // into the sidebar above, but this class name must keep existing somewhere real or the
      // whole Creative Studio section silently stops mounting (see tests/creative-studio-release.mjs).
      +'<div class="ibis-shortcuts" aria-hidden="true" hidden></div>';

      var mode='ask';
      var form=document.getElementById('ibis-form'),input=document.getElementById('ibis-goal');
      var conversation=document.getElementById('ibis-conversation');
      var welcome=document.getElementById('ibis-chat-welcome');
      var statusHost=document.getElementById('ibis-ai-status');
      var sidebar=document.getElementById('ibis-chat-sidebar');
      var sidebarToggle=document.getElementById('ibis-sidebar-toggle');

      ensureVisualState().then(function(){setStatus('idle');});
      function setStatus(state){if(!statusHost||!global.FTN||!global.FTN.IbisVisualState)return;global.FTN.IbisVisualState.set(statusHost,state);}
      function scrollToEnd(){conversation.scrollTop=conversation.scrollHeight;}

      function appendUserMessage(text){
        if(welcome){welcome.remove();welcome=null;}
        var el=document.createElement('div');
        el.className='ibis-msg ibis-msg--user';
        el.innerHTML='<div class="ibis-msg__bubble">'+esc(text).replace(/\n/g,'<br>')+'</div>';
        conversation.appendChild(el);
        scrollToEnd();
      }
      // Returns the content element a generation function can treat exactly like the old
      // page-level "out" panel -- createVisual/renderMedia already just do out.innerHTML=..., so
      // no change was needed in either function body.
      function appendIbisMessage(){
        var el=document.createElement('div');
        el.className='ibis-msg ibis-msg--ibis';
        var content=document.createElement('div');
        content.className='ibis-msg__bubble ibis-msg__bubble--ibis';
        content.innerHTML='<p class="ibis-msg__thinking">ibis is thinking…</p>';
        el.appendChild(content);
        conversation.appendChild(el);
        scrollToEnd();
        return content;
      }

      content.querySelectorAll('[data-mode]').forEach(function(b){b.addEventListener('click',function(){mode=b.getAttribute('data-mode');content.querySelectorAll('[data-mode]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});input.focus();});});
      content.querySelectorAll('[data-example]').forEach(function(b){b.addEventListener('click',function(){input.value=b.getAttribute('data-example');if(/visual/i.test(input.value))mode='visual';else if(/changed|indicator/i.test(input.value))mode='analyze';else if(/find|movie|soca/i.test(input.value))mode='find';form.requestSubmit();if(global.innerWidth<821)closeSidebar();});});

      function openSidebar(){sidebar.classList.add('is-open');sidebarToggle.setAttribute('aria-expanded','true');}
      function closeSidebar(){sidebar.classList.remove('is-open');sidebarToggle.setAttribute('aria-expanded','false');}
      sidebarToggle.addEventListener('click',function(){if(sidebar.classList.contains('is-open'))closeSidebar();else openSidebar();});

      document.getElementById('ibis-new-chat').addEventListener('click',function(){
        conversation.innerHTML='<div class="ibis-chat__welcome" id="ibis-chat-welcome"><h2>What do you need done?</h2><p>Ask ibis in plain language — find Caribbean films, analyze what changed, help with a grant, create a visual, route me to the right FTN tool…</p></div>';
        welcome=document.getElementById('ibis-chat-welcome');
        input.value='';
        input.focus();
        if(global.innerWidth<821)closeSidebar();
      });

      form.addEventListener('submit',async function(e){
        e.preventDefault();
        var q=input.value.trim();
        if(!q)return;
        input.value='';
        appendUserMessage(q);
        var out=appendIbisMessage();
        setStatus('thinking');
        if(mode==='visual'||/create|generate|make/.test(q.toLowerCase())&&/image|visual|poster|graphic/.test(q.toLowerCase())){
          setStatus('generating');
          await createVisual(q,out);
          setStatus('idle');
          scrollToEnd();
          return;
        }
        if(mode==='find'||/find|search|movie|film|song|music|youtube/.test(q.toLowerCase())){
          setStatus('working');
          await renderMedia(q,out);
          setStatus('idle');
          scrollToEnd();
          return;
        }
        if(mode==='analyze'||/what changed|correlat|indicator|econom|inflation|weather|pressure/.test(q.toLowerCase())){
          out.innerHTML=renderAnalysis(q);
          setStatus('idle');
          scrollToEnd();
          return;
        }
        var answer=await localAI(q);
        if(answer){
          out.innerHTML='<span class="workspace-kicker">On-device AI</span><p>'+esc(answer).replace(/\n/g,'<br>')+'</p><hr>'+routeResults(q);
          setStatus('idle');
          scrollToEnd();
          return;
        }
        setStatus('verifying');
        var server=await serverAI(q);
        if(server.available){
          out.innerHTML='<span class="workspace-kicker">Authenticated server AI · '+esc(server.provider)+'</span><p>'+esc(server.answer).replace(/\n/g,'<br>')+'</p><p class="workspace-muted">Model: '+esc(server.model||'configured server model')+' · Generated '+esc(server.generatedAt)+'</p><hr>'+routeResults(q);
        }else{
          out.innerHTML='<span class="workspace-kicker">FTN deterministic router</span><p>'+esc(server.reason)+'</p>'+(server.guest?'<p><a href="/account/?return=%2Fibis-ai%2F">Sign in for the protected server AI route</a>. Your prompt has not been sent to that provider.</p>':'<p>No server answer was claimed. Your deterministic FTN routes remain available.</p>')+routeResults(q);
        }
        setStatus('idle');
        scrollToEnd();
      });

      input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
    }});}
  document.addEventListener('DOMContentLoaded',init);
})(window);
