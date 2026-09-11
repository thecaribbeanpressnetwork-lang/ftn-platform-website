// FTN ibis — authoritative live image generation for the public workspace.
// Captures visual-form submissions before the legacy workspace canvas fallback can run.
// Production succeeds only when the server-side image route returns a real artifact.
(function(global){
  'use strict';
  var ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-image-cloudflare';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var PROVIDERS=['cloudflare-workers-ai-image-flux','cloudflare-workers-ai-image-sdxl'];
  var LOCAL_FIXTURE_PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function localFixtureHost(){return location.hostname==='127.0.0.1'||location.hostname==='localhost';}
  function activeVisual(){var b=document.querySelector('#ibis-form [data-mode="visual"]');return Boolean(b&&b.getAttribute('aria-pressed')==='true');}
  function imageIntent(text){var q=String(text||'').toLowerCase();return activeVisual()||(/\b(create|generate|make|render|draw|illustrate|design)\b/.test(q)&&/\b(image|picture|photo|photograph|visual|poster|graphic|thumbnail|cover|flyer|scene|portrait|landscape|logo|ibis|bird)\b/.test(q));}
  function append(kind,html){var log=document.getElementById('ibis-conversation');if(!log)return null;var welcome=document.getElementById('ibis-chat-welcome');if(welcome)welcome.remove();var row=document.createElement('div');row.className='ibis-msg ibis-msg--'+kind;var bubble=document.createElement('div');bubble.className='ibis-msg__bubble'+(kind==='ibis'?' ibis-msg__bubble--ibis':'');bubble.innerHTML=html;row.appendChild(bubble);log.appendChild(row);log.scrollTop=log.scrollHeight;return bubble;}
  function status(state){try{var host=document.getElementById('ibis-ai-status');if(host&&global.FTN&&global.FTN.IbisVisualState)global.FTN.IbisVisualState.set(host,state);}catch(_){} }
  function request(providerId,prompt){if(localFixtureHost())return Promise.resolve({ok:true,body:{image:LOCAL_FIXTURE_PNG,mimeType:'image/png',extension:'png',provider:'Deterministic release fixture',model:'fixture-png'}});return fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({prompt:String(prompt||'').slice(0,2000),providerId:providerId})}).then(function(r){return r.json().catch(function(){return{};}).then(function(body){return{ok:r.ok,status:r.status,body:body};});});}
  function renderArtifact(out,prompt,b,providerId){var mime=b.mimeType==='image/jpeg'?'image/jpeg':'image/png',ext=b.extension==='jpg'?'jpg':'png',src='data:'+mime+';base64,'+b.image;out.innerHTML='<span class="workspace-kicker">IBIS · REAL IMAGE GENERATION</span><div class="ibis-visual-result"><img src="'+src+'" alt="'+esc(prompt)+'"><div><a class="btn btn-primary" download="ibis-generated-image.'+ext+'" href="'+src+'">Download image</a><button type="button" class="btn btn-outline" data-live-image-regenerate>Regenerate</button></div><p class="workspace-muted">Provider: '+esc(b.provider||'Cloudflare Workers AI')+' · Model: '+esc(b.model||providerId)+' · Output contract: generated image artifact.</p></div>';var button=out.querySelector('[data-live-image-regenerate]');if(button)button.onclick=function(){generate(prompt,out);};}
  async function generate(prompt,out){status('generating');out.innerHTML='<p class="ibis-msg__thinking">ibis is generating a real image artifact…</p>';for(var i=0;i<PROVIDERS.length;i++){try{var r=await request(PROVIDERS[i],prompt),b=r.body||{};if(r.ok&&b.image&&b.mimeType&&b.extension){renderArtifact(out,prompt,b,PROVIDERS[i]);status('idle');return true;}}catch(_){} }out.innerHTML='<span class="workspace-kicker">IMAGE GENERATION UNAVAILABLE</span><p>ibis understood this as a real image-generation request, but no verified image provider returned an image artifact. It will not substitute an on-device poster and pretend the task succeeded.</p>';status('idle');return false;}

  document.addEventListener('submit',function(e){var form=e.target;if(!form||form.id!=='ibis-form')return;var input=document.getElementById('ibis-goal'),prompt=input&&input.value.trim();if(!prompt||!imageIntent(prompt))return;e.preventDefault();e.stopImmediatePropagation();append('user',esc(prompt));var out=append('ibis','<p class="ibis-msg__thinking">ibis is generating a real image artifact…</p>');if(input)input.value='';if(out)generate(prompt,out);},true);

  global.FTN=global.FTN||{};
  global.FTN.IbisLiveImageWorkspace={generate:generate,providers:PROVIDERS.slice(),endpoint:ENDPOINT};
})(window);
