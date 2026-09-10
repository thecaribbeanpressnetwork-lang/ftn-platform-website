// ibis.ai — investor-safe bootstrap + native-provider-first video routing.
// Recovery preview truth boundary marker: Headspace remains permission/capability gated until live browser acceptance passes.
// Public truth boundary: IBIS may claim native video only when the live provider returns a native artifact.
// Otherwise the page must disclose the native attempt and fall back to creator-tool handoff.
(function(global){
  'use strict';

  var PUBLISHABLE_KEY = 'sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var BYTEZ_ENDPOINT = 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-video-bytez';

  function chooseMode(prompt){
    var p=String(prompt||'').toLowerCase();
    if(/\b(create|generate|make|render|produce|animate)\b/.test(p)&&/\b(video|clip|mp4|movie|animation|text-to-video|text to video)\b/.test(p))return'visual';
    if(/image|visual|poster|flyer|graphic|thumbnail|social card|cover/.test(p))return'visual';
    if(/analy[sz]e|compare|correlat|indicator|data|trend|what changed/.test(p))return'analyze';
    if(/find|search|watch|movie|film|music|track|video|episode/.test(p))return'find';
    return'ask';
  }

  function loadScriptOnce(src,marker){
    return new Promise(function(resolve){
      if((marker&&document.querySelector('script['+marker+']'))||document.querySelector('script[src^="'+src.split('?')[0]+'"]')){resolve();return;}
      var s=document.createElement('script');s.src=src;s.async=false;if(marker)s.setAttribute(marker,'true');s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);
    });
  }

  function loadHealthModules(){
    loadScriptOnce('/js/ibis-cloudflare-image-live.js?v=20260909.2','data-ibis-cloudflare-image-live');
    loadScriptOnce('/js/ibis-provider-registry.js?v=20260909.1','data-ibis-provider-registry')
      .then(function(){return loadScriptOnce('/js/ibis-native-video-activation.js?v=20260910.1','data-ibis-native-video-activation');})
      .then(function(){return loadScriptOnce('/js/ibis-eligibility.js?v=20260909.1','data-ibis-eligibility');})
      .then(function(){return loadScriptOnce('/js/ibis-provider-fabric.js?v=20260910.1','data-ibis-provider-fabric');});
  }

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function exposeHeadspace(){
    var main=document.getElementById('main');
    if(!main||document.querySelector('[data-ibis-headspace-entry]'))return;
    var entry=document.createElement('section');
    entry.setAttribute('data-ibis-headspace-entry','');
    entry.setAttribute('aria-label','ibis Headspace');
    entry.className='container';
    entry.style.cssText='padding-top:.75rem;padding-bottom:.25rem';
    entry.innerHTML='<div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;padding:.85rem 1rem;border:1px solid rgba(0,0,0,.14);border-radius:14px"><div style="flex:1 1 320px"><strong>ibis Headspace</strong><div style="font-size:.9rem;opacity:.75;margin-top:.15rem">Spatial Caribbean intelligence workspace. Live tools remain capability, health and permission gated.</div></div><a class="btn btn-primary btn-sm" href="/ibis-headspace-preview/" data-open-headspace>Open Headspace</a></div>';
    var root=document.getElementById('workspace-root');
    if(root&&root.parentNode===main)main.insertBefore(entry,root);else main.appendChild(entry);
  }

  function isVideoIntent(text){
    var q=String(text||'').toLowerCase();
    return /\b(create|generate|make|render|produce|animate)\b/.test(q)&&/\b(video|clip|mp4|movie|animation|text-to-video|text to video)\b/.test(q);
  }

  function appendBubble(kind,html){
    var conversation=document.getElementById('ibis-conversation');
    if(!conversation)return null;
    var welcome=document.getElementById('ibis-chat-welcome');if(welcome)welcome.remove();
    var el=document.createElement('div');el.className='ibis-msg ibis-msg--'+kind;
    var bubble=document.createElement('div');bubble.className='ibis-msg__bubble'+(kind==='ibis'?' ibis-msg__bubble--ibis':'');
    bubble.innerHTML=html;el.appendChild(bubble);conversation.appendChild(el);conversation.scrollTop=conversation.scrollHeight;return bubble;
  }

  function buildVideoPackage(prompt){
    var clean=String(prompt||'').replace(/\s+/g,' ').trim();
    return 'Create a 6-10 second vertical or horizontal AI video based on this brief: '+clean+'\n\nStyle: cinematic, Caribbean-authentic, photorealistic where appropriate, natural motion, stable anatomy, no random text, no fake logos, no watermark unless required by the tool.\n\nShot plan: 1) establishing Caribbean context, 2) main subject action, 3) close detail/motion, 4) clean ending frame suitable for caption or logo overlay.\n\nDeliverable: export MP4 and keep the final prompt, tool, model and license notes for provenance.';
  }

  function renderVideoHandoff(out,prompt,attempt){
    var optimized=buildVideoPackage(prompt);
    var nativeLine=attempt?'<p><strong>Native provider attempt:</strong> '+esc(attempt)+'</p>':'';
    out.innerHTML='<span class="workspace-kicker">IBIS Video Studio Handoff</span><h3>Native provider unavailable. Video brief prepared.</h3>'+nativeLine+'<p>IBIS can prepare the prompt, storyboard, shot list, caption package and metadata. Because the native provider did not return a usable video artifact, rendering remains with approved creator routes below. This is a truthful fallback, not a fake in-platform render.</p><div class="ibis-data-list"><article><strong>PixVerse</strong><span>Fast creator video workflow</span><a href="https://app.pixverse.ai/" target="_blank" rel="noopener">Open PixVerse</a></article><article><strong>Kling</strong><span>Cinematic AI video route</span><a href="https://klingai.com/" target="_blank" rel="noopener">Open Kling</a></article><article><strong>OpenArt</strong><span>Image/video creator suite</span><a href="https://openart.ai/" target="_blank" rel="noopener">Open OpenArt</a></article><article><strong>Runway</strong><span>Professional video generation/editing</span><a href="https://runwayml.com/" target="_blank" rel="noopener">Open Runway</a></article></div><p><strong>Optimized prompt</strong></p><pre style="white-space:pre-wrap;overflow:auto;max-height:260px;border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:12px;background:rgba(0,0,0,.035)">'+esc(optimized)+'</pre><p class="workspace-muted">Truth label: creator-tool handoff after native provider attempt.</p>';
  }

  function renderNativeVideo(out,prompt,data){
    var provider=esc(data.provider||'Bytez');
    var model=esc(data.model||'Lightricks/LTX-Video-0.9.7-dev');
    var license=esc(data.modelLicense||'LTXV Open Weights License');
    if(data.videoUrl){
      out.innerHTML='<span class="workspace-kicker">IBIS Provider Fabric · Video Artifact Generated</span><h3>Native text-to-video render returned.</h3><video controls playsinline style="display:block;width:100%;max-height:420px;border-radius:16px;background:#000" src="'+esc(data.videoUrl)+'"></video><p><a href="'+esc(data.videoUrl)+'" target="_blank" rel="noopener">Open video artifact</a></p><p class="workspace-muted">Provider: '+provider+' · Model: '+model+' · License: '+license+' · Native text-to-video: yes · Free-credit only: yes · Paid fallback: no.</p>';
      return;
    }
    if(data.video){
      var mime=esc(data.mimeType||'video/mp4');
      var url='data:'+mime+';base64,'+data.video;
      out.innerHTML='<span class="workspace-kicker">IBIS Provider Fabric · Video Artifact Generated</span><h3>Video artifact returned.</h3><video controls playsinline style="display:block;width:100%;max-height:420px;border-radius:16px;background:#000" src="'+url+'"></video><p><a href="'+url+'" download="ibis-video.'+esc(data.extension||'mp4')+'">Download video</a></p><p class="workspace-muted">Provider: '+provider+' · Model: '+model+' · Native text-to-video: '+(data.nativeTextToVideo===false?'not claimed':'yes')+' · Free-credit only: yes · Paid fallback: no.</p>';
      return;
    }
    out.innerHTML='<span class="workspace-kicker">IBIS Provider Fabric · Video Job Submitted</span><h3>Native video job submitted.</h3><p>The provider accepted the prompt and returned job status instead of a finished file.</p><p class="workspace-muted">Provider: '+provider+' · Model: '+model+' · Job: '+esc(data.jobId||'submitted')+' · Native text-to-video: yes · Free-credit only: yes · Paid fallback: no.</p>';
  }

  function attemptNativeVideo(prompt){
    var started=Date.now();
    return fetch(BYTEZ_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:PUBLISHABLE_KEY,authorization:'Bearer '+PUBLISHABLE_KEY},body:JSON.stringify({action:'generate',prompt:prompt,duration:6,resolution:'1280x720',confirmFreeCreditUse:true})})
      .then(function(r){return r.json().catch(function(){return{};}).then(function(body){return{ok:r.ok,status:r.status,body:body,latencyMs:Date.now()-started};});})
      .then(function(r){
        var b=r.body||{};
        if(r.ok&&(b.videoUrl||b.video||b.jobId))return{success:true,data:b,latencyMs:r.latencyMs};
        var msg=b.publicMessage||b.error||b.message||('HTTP '+r.status);
        return{success:false,attempt:'Bytez native route returned '+msg+' after '+r.latencyMs+'ms'};
      })
      .catch(function(err){return{success:false,attempt:'Bytez native route network error: '+((err&&err.message)||'unknown')};});
  }

  function installVideoProviderHook(){
    var tries=0;
    function attach(){
      var form=document.getElementById('ibis-form'),input=document.getElementById('ibis-goal');
      if(!form||!input){if(tries++<80)setTimeout(attach,100);return;}
      if(form.dataset.ibisNativeVideoHook==='true')return;
      form.dataset.ibisNativeVideoHook='true';
      form.addEventListener('submit',function(e){
        var q=input.value.trim();if(!isVideoIntent(q))return;
        e.preventDefault();e.stopImmediatePropagation();input.value='';
        appendBubble('user',esc(q));
        var out=appendBubble('ibis','<p class="ibis-msg__thinking">ibis is attempting native text-to-video through Bytez/LTX free-credit route…</p>');
        attemptNativeVideo(q).then(function(result){
          if(result&&result.success){renderNativeVideo(out,q,result.data);return;}
          renderVideoHandoff(out,q,result&&result.attempt?result.attempt:'Bytez native route did not return a usable artifact.');
        });
      },true);
    }
    attach();
  }

  function apply(){
    var params=new URLSearchParams(location.search),prompt=(params.get('prompt')||'').trim();if(!prompt)return;
    var attempts=0;
    function tryMount(){
      var input=document.getElementById('ibis-goal'),form=document.getElementById('ibis-form');
      if(!input||!form){if(attempts++<50)setTimeout(tryMount,80);return;}
      input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));
      var mode=chooseMode(prompt),button=document.querySelector('[data-mode="'+mode+'"]');if(button)button.click();
      input.focus({preventScroll:true});form.scrollIntoView({behavior:'smooth',block:'center'});
      if(params.get('run')==='1'&&typeof form.requestSubmit==='function')setTimeout(function(){form.requestSubmit();},220);
    }
    tryMount();
  }

  function init(){loadHealthModules();exposeHeadspace();installVideoProviderHook();apply();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
