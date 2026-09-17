// FTN Platform — Headspace universal answer bridge.
// General questions use the live IBIS text gateway; specialist capability handlers can still claim requests first.
(function(global){
  'use strict';
  var form=document.getElementById('inputOrbit'),input=document.getElementById('headspaceQuery'),hint=document.getElementById('commandHint');
  if(!form||!input)return;
  // Reuses the already-shipped .ibis-live-source(s)/.ibis-live-kicker rules from the ibis workspace
  // stylesheet (js/ibis-ai-workspace.js's injectStyle()) instead of writing new CSS -- these class
  // names are unique to this feature, so loading this stylesheet here carries no collision risk
  // with Headspace's own styling.
  if(!document.querySelector('link[data-ibis-live-sources-style]')){var liveSourcesStyle=document.createElement('link');liveSourcesStyle.rel='stylesheet';liveSourcesStyle.href='/css/components/ibis-ai.css?v=20260911.1';liveSourcesStyle.setAttribute('data-ibis-live-sources-style','');document.head.appendChild(liveSourcesStyle);}
  var ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-text-cloudflare';
  var ASSISTANT_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-assistant';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';

  function answerCard(){return document.querySelector('[data-thought="answer"]');}
  function esc(v){return String(v==null?'':v);}
  // Security correction (independent audit): a source's url was assigned to an anchor's .href with
  // no scheme check -- a javascript:/data: URL would be clickable and would execute in this page
  // (target="_blank" does not stop a javascript: href from executing). The server now filters
  // non-https source URLs before they reach here (ibis-canonical-brain.ts's sourcesFromSearch()),
  // but this is a second, independent check at the actual DOM-insertion point.
  function safeHref(url){return /^https:\/\//i.test(String(url||''))?url:'#';}
  function focus(names){var F=global.FTN&&global.FTN.HeadspaceFabric;if(F&&F.focus)F.focus(names);else(names||[]).forEach(function(name){var n=document.querySelector('[data-thought="'+name+'"]');if(n)n.classList.remove('dematerialized','hs-minimized');});}
  function products(){var P=global.FTN&&global.FTN.ProductRegistry;try{return P&&P.publicProducts?P.publicProducts({includeSupporting:true}).map(function(p){return{name:p.name,route:p.route,tagline:p.tagline};}).slice(0,30):[];}catch(_){return[];}}
  function needsLiveEvidence(text){return /\b(today|latest|current|right now|news|price|rate|weather|score|election result|breaking)\b/i.test(text);}
  function personLookup(text){return /^(?:tell me about|who is|what do you know about)\s+[A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){1,4}[?.!]*$/.test(String(text||'').trim());}

  // Canonical-brain server slice (feature-flagged action:'canonical_query' on the ibis-assistant
  // Edge Function -- see supabase/functions/_shared/ibis-canonical-brain.ts). Tried first: it is a
  // strict superset of the bare TEXT call for the cases it covers -- a freshness-sensitive question
  // gets real search or an honest SEARCH_UNAVAILABLE with direct-link alternatives instead of
  // silently answering from model memory. Returns null (never throws) on any failure so directText()
  // falls straight through to the bare TEXT call below -- this must never be the only route to an
  // answer, since this call is itself already the fallback FOR FTN.IbisRuntime.ask().
  async function canonicalServerQuery(text){
    try{
      var r=await fetch(ASSISTANT_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({action:'canonical_query',messages:[{role:'user',content:text}],products:products()})});
      if(!r.ok)return null;
      var envelope=await r.json().catch(function(){return null;});
      if(!envelope||typeof envelope.answer!=='string'||!envelope.answer)return null;
      return envelope;
    }catch(e){return null;}
  }

  async function directText(text){
    var canonical=await canonicalServerQuery(text);
    if(canonical)return{answer:canonical.answer,provider:'FTN ibis canonical brain',queryClass:canonical.queryClass,sources:canonical.sources,alternatives:canonical.alternatives,searchCacheState:canonical.searchCacheState};
    var guard='Answer the user directly. Do not output internal FTN decision-framework headings or scorecards. Do not invent facts, capabilities, links, biographies, current events or data access. If evidence is required and none is supplied, say what must be verified. ';
    if(needsLiveEvidence(text))guard+='This request may depend on current information. Do not pretend model memory is live evidence. ';
    if(personLookup(text))guard+='This is a person lookup. Do not guess the person\'s profession, credits, biography or economic role if you cannot verify them. ';
    var r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({messages:[{role:'user',content:guard+'\n\nUser request: '+text}],products:products()})});
    var body=await r.json().catch(function(){return{};});
    if(!r.ok||!body.answer)throw new Error(body.error||'The IBIS language gateway did not return an answer.');
    return body;
  }

  function renderWaiting(result){focus(['answer','tools']);var a=answerCard();if(a){a.querySelector('.thought-bar>span').textContent='PERMISSION REQUIRED';a.querySelector('h2').textContent='ibis is ready to continue, but this action changes something outside Headspace.';var waits=result&&result.run&&result.run.result&&result.run.result.waitingPermissions||[];a.querySelector('p').textContent=waits.length?'Approval required for '+waits.map(function(x){return x.agent.toLowerCase();}).join(', ')+'.':'Approval is required before ibis can perform the external step.';}if(hint)hint.textContent='Execution paused at the permission boundary.';}

  // Live-search UX correction: canonicalServerQuery()'s real sources/alternatives (see
  // directText() above) previously reached this file but were never rendered anywhere -- only the
  // plain answer text was shown. Built with DOM APIs (not innerHTML) to match this file's existing
  // style; a plain text node per field, never trusting the server string as markup. Cleared and
  // rebuilt on every render so a later answer with no sources doesn't leave a stale list behind.
  var CACHE_STATE_LABEL={LIVE:'Live search just now',CACHED:'From a recent search (cached)'};
  function sourcesHost(card){
    var host=card.querySelector('[data-ibis-sources]');
    if(!host){host=document.createElement('div');host.setAttribute('data-ibis-sources','');host.className='ibis-live-sources-block';var p=card.querySelector('p');if(p&&p.parentNode)p.parentNode.insertBefore(host,p.nextSibling);else card.appendChild(host);}
    host.innerHTML='';
    return host;
  }
  function renderSourcesAndAlternatives(card,meta){
    var host=sourcesHost(card);
    var sources=meta&&meta.sources,alternatives=meta&&meta.alternatives;
    if(sources&&sources.length){
      if(meta.searchCacheState&&CACHE_STATE_LABEL[meta.searchCacheState]){var badge=document.createElement('span');badge.className='ibis-live-kicker';badge.textContent=CACHE_STATE_LABEL[meta.searchCacheState];host.appendChild(badge);}
      var list=document.createElement('div');list.className='ibis-live-sources';
      sources.forEach(function(s){
        var link=document.createElement('a');link.className='ibis-live-source';link.href=safeHref(s.url);link.target='_blank';link.rel='noopener noreferrer';
        var title=document.createElement('span');title.className='ibis-live-source__title';title.textContent=s.title||s.url||'Untitled source';
        var metaParts=[s.publisher,s.publishedAt?'published '+new Date(s.publishedAt).toLocaleDateString():null,'checked '+new Date(s.retrievedAt).toLocaleString()].filter(Boolean);
        var metaSpan=document.createElement('span');metaSpan.className='ibis-live-source__meta';metaSpan.textContent=metaParts.join(' · ');
        link.append(title,metaSpan);list.appendChild(link);
      });
      host.appendChild(list);
    }else if(alternatives&&alternatives.length){
      var kicker=document.createElement('span');kicker.className='ibis-live-kicker';kicker.textContent='ibis could not search live -- try these directly';host.appendChild(kicker);
      var altList=document.createElement('div');altList.className='ibis-live-sources';
      alternatives.forEach(function(alt){
        var link=document.createElement('a');link.className='ibis-live-source';link.href=safeHref(alt.url);link.target='_blank';link.rel='noopener noreferrer';
        var title=document.createElement('span');title.className='ibis-live-source__title';title.textContent=alt.label||alt.url||'External link';
        var metaSpan=document.createElement('span');metaSpan.className='ibis-live-source__meta';metaSpan.textContent=(alt.costStatus||'')+(alt.signInRequired?' · sign-in required':' · no sign-in required');
        link.append(title,metaSpan);altList.appendChild(link);
      });
      host.appendChild(altList);
    }
  }
  function renderAnswer(text,meta){focus(['answer']);var a=answerCard();if(!a)return;a.querySelector('.thought-bar>span').textContent=(meta&&meta.degraded)?'IBIS ANSWER (DEGRADED)':'IBIS ANSWER';a.querySelector('h2').textContent='';a.querySelector('p').textContent=text;var actions=a.querySelector('.actions');if(actions)actions.style.display='flex';renderSourcesAndAlternatives(a,meta);var stageNote=meta&&meta.degraded?' -- canonical orchestration did not run ('+(meta.failedStage||'unknown stage')+'); this is a direct fallback answer.':'';if(hint)hint.textContent='Answer returned through '+(meta&&meta.provider?meta.provider:'the governed IBIS route')+'.'+stageNote;}
  function renderFailure(message){focus(['answer']);var a=answerCard();if(a){a.querySelector('.thought-bar>span').textContent='IBIS';a.querySelector('h2').textContent='I could not complete that reliably.';a.querySelector('p').textContent=message||'The intelligence route is temporarily unavailable. No answer was invented.';}if(hint)hint.textContent='The request failed closed instead of falling back to prototype copy.';}

  // Correction (this pass): an isPlainAnswer() predicate used to live here and decide, in the
  // browser, whether a question was simple enough to skip FTN.IbisRuntime.ask() (canonical
  // orchestration) entirely and call the bare TEXT endpoint directly instead. That is the exact
  // architectural violation this pass removes -- js/ibis-runtime.js's own ask() already classifies
  // through FTN.UniversalRouter.route() and can itself produce a lightweight answer for a simple
  // question; that decision belongs inside the canonical planner, never in front of it. ask() below
  // now always enters the runtime. directText() is kept only as degradedFallback()'s explicit,
  // honestly-labeled degraded path when the runtime cannot run at all.
  async function ask(text,context){
    var FTN=global.FTN=global.FTN||{};
    if(FTN.IbisRuntimeReady){try{await withTimeoutMs(FTN.IbisRuntimeReady,15000);}catch(e){}}
    if(!FTN.IbisRuntime)return{kind:'DEGRADED',failedStage:'RUNTIME_UNAVAILABLE',data:await directText(text)};
    var TIMED_OUT={};
    var result;
    try{result=await withTimeoutMs(FTN.IbisRuntime.ask(text,context),25000,TIMED_OUT);}
    catch(e){return{kind:'DEGRADED',failedStage:'ORCHESTRATION_EXCEPTION',data:await directText(text)};}
    if(result===TIMED_OUT)return{kind:'DEGRADED',failedStage:'ORCHESTRATION_TIMEOUT',data:await directText(text)};
    if(result&&result.errorType==='RUNTIME_NOT_READY')return{kind:'DEGRADED',failedStage:'RUNTIME_NOT_READY',data:await directText(text)};
    return{kind:'RUNTIME',data:result};
  }
  // Resolves timeoutValue ONLY on an actual timeout; a real promise rejection always still rejects
  // (never silently relabeled as a timeout) so callers can tell a hung request apart from a thrown
  // error in the receipt they show the user.
  function withTimeoutMs(promise,ms,timeoutValue){return new Promise(function(resolve,reject){var settled=false;var timer=setTimeout(function(){if(!settled){settled=true;resolve(timeoutValue);}},ms);promise.then(function(v){if(!settled){settled=true;clearTimeout(timer);resolve(v);}},function(err){if(!settled){settled=true;clearTimeout(timer);reject(err);}});});}
  function bestText(result){var direct=result&&(result.data||result.result)||{};if(direct.answer)return direct.answer;var outputs=result&&result.run&&result.run.result&&result.run.result.outputs||[];for(var i=outputs.length-1;i>=0;i--){var o=outputs[i].output||{},d=o.data||o.result||{};if(d.answer)return d.answer;if(o.result&&o.result.answer)return o.result.answer;if(typeof d==='string')return d;}return null;}
  // Freshness-grounding correction (same fix as js/ibis-ai-workspace.js): true when any task
  // output in this runtime run carries js/ibis-multi-agent-orchestrator.js's
  // fallbackFromCapability tag -- a real capability (e.g. LIVE_INTELLIGENCE) failed and the
  // orchestrator silently substituted a bare TEXT completion. Used only to decide whether a
  // freshness-required answer can be trusted here in Headspace too.
  function runtimeGroundingDegraded(result){var outputs=result&&result.run&&result.run.result&&result.run.result.outputs||[];return outputs.some(function(o){return !!(o&&o.output&&o.output.fallbackFromCapability);});}

  // Bubble-phase fallback is deliberate: specialist Headspace capabilities register capture
  // handlers and may stop propagation first. The universal route only owns requests nobody else claimed.
  form.addEventListener('submit',async function(e){
    var text=input.value.trim();if(!text)return;
    if(/^(go )?back$|^undo$|^redo$|^forward$|put (that|it) back|restore|save (this )?(headspace|space)|recall (headspace|space)$/i.test(text))return;
    e.preventDefault();e.stopImmediatePropagation();var FTN=global.FTN=global.FTN||{},token=FTN.HeadspaceRequestState&&FTN.HeadspaceRequestState.snapshot();if(hint)hint.textContent='ibis is routing the request to a real intelligence capability…';input.value='';
    try{
      // No pre-fetched route/isPlainAnswer gate here any more -- ask() always enters
      // FTN.IbisRuntime.ask(), which computes the route itself as part of canonical orchestration
      // (see js/ibis-runtime.js). Re-deriving it here first would only be a second, unused copy of
      // the same classification, not a gating decision.
      var context={attachments:((FTN.HeadspaceInputContext&&FTN.HeadspaceInputContext.attachments)||[]).slice()};
      var wrapped=await ask(text,context);if(FTN.HeadspaceRequestState&&!FTN.HeadspaceRequestState.active(token))return;
      if(wrapped.kind==='DEGRADED'){renderAnswer(wrapped.data.answer,Object.assign({},wrapped.data,{degraded:true,failedStage:wrapped.failedStage}));return;}
      var result=wrapped.data;if(result&&result.status==='WAITING_PERMISSION'){renderWaiting(result);return;}
      // Freshness-grounding correction: a route the classifier flagged as needing a current fact
      // (e.g. "latest"/"today") must never be answered from a silently-degraded bare completion --
      // fall through to the same canonical/SearXNG-grounded path used when the runtime has nothing
      // at all, rather than presenting an ungrounded guess as current, verified information.
      if(result&&result.route&&result.route.epistemicMode==='CURRENT_FACT_REQUIRED'&&runtimeGroundingDegraded(result)){
        var grounded=await directText(text);renderAnswer(grounded.answer,Object.assign({},grounded,{degraded:true,failedStage:'FRESHNESS_GROUNDING_DEGRADED'}));return;
      }
      var answer=bestText(result);if(answer)renderAnswer(answer,{provider:'FTN ibis runtime',degraded:false});else renderFailure('The selected capability returned no usable answer.');
    }catch(err){if(FTN.HeadspaceRequestState&&!FTN.HeadspaceRequestState.active(token))return;renderFailure(esc(err&&err.message||'The intelligence route failed.'));}
  });
})(typeof window!=='undefined'?window:globalThis);
