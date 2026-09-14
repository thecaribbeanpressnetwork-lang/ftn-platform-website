// FTN Platform — Headspace universal answer bridge.
// General questions use the live IBIS text gateway; specialist capability handlers can still claim requests first.
(function(global){
  'use strict';
  var form=document.getElementById('inputOrbit'),input=document.getElementById('headspaceQuery'),hint=document.getElementById('commandHint');
  if(!form||!input)return;
  var ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-text-cloudflare';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';

  function answerCard(){return document.querySelector('[data-thought="answer"]');}
  function esc(v){return String(v==null?'':v);}
  function focus(names){var F=global.FTN&&global.FTN.HeadspaceFabric;if(F&&F.focus)F.focus(names);else(names||[]).forEach(function(name){var n=document.querySelector('[data-thought="'+name+'"]');if(n)n.classList.remove('dematerialized','hs-minimized');});}
  function products(){var P=global.FTN&&global.FTN.ProductRegistry;try{return P&&P.publicProducts?P.publicProducts({includeSupporting:true}).map(function(p){return{name:p.name,route:p.route,tagline:p.tagline};}).slice(0,30):[];}catch(_){return[];}}
  function needsLiveEvidence(text){return /\b(today|latest|current|right now|news|price|rate|weather|score|election result|breaking)\b/i.test(text);}
  function personLookup(text){return /^(?:tell me about|who is|what do you know about)\s+[A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){1,4}[?.!]*$/.test(String(text||'').trim());}

  async function directText(text){
    var guard='Answer the user directly. Do not output internal FTN decision-framework headings or scorecards. Do not invent facts, capabilities, links, biographies, current events or data access. If evidence is required and none is supplied, say what must be verified. ';
    if(needsLiveEvidence(text))guard+='This request may depend on current information. Do not pretend model memory is live evidence. ';
    if(personLookup(text))guard+='This is a person lookup. Do not guess the person\'s profession, credits, biography or economic role if you cannot verify them. ';
    var r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({messages:[{role:'user',content:guard+'\n\nUser request: '+text}],products:products()})});
    var body=await r.json().catch(function(){return{};});
    if(!r.ok||!body.answer)throw new Error(body.error||'The IBIS language gateway did not return an answer.');
    return body;
  }

  function renderWaiting(result){focus(['answer','tools']);var a=answerCard();if(a){a.querySelector('.thought-bar>span').textContent='PERMISSION REQUIRED';a.querySelector('h2').textContent='ibis is ready to continue, but this action changes something outside Headspace.';var waits=result&&result.run&&result.run.result&&result.run.result.waitingPermissions||[];a.querySelector('p').textContent=waits.length?'Approval required for '+waits.map(function(x){return x.agent.toLowerCase();}).join(', ')+'.':'Approval is required before ibis can perform the external step.';}if(hint)hint.textContent='Execution paused at the permission boundary.';}

  function renderAnswer(text,meta){focus(['answer']);var a=answerCard();if(!a)return;a.querySelector('.thought-bar>span').textContent=(meta&&meta.degraded)?'IBIS ANSWER (DEGRADED)':'IBIS ANSWER';a.querySelector('h2').textContent='';a.querySelector('p').textContent=text;var actions=a.querySelector('.actions');if(actions)actions.style.display='flex';var stageNote=meta&&meta.degraded?' -- canonical orchestration did not run ('+(meta.failedStage||'unknown stage')+'); this is a direct fallback answer.':'';if(hint)hint.textContent='Answer returned through '+(meta&&meta.provider?meta.provider:'the governed IBIS route')+'.'+stageNote;}
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
      var result=wrapped.data;if(result&&result.status==='WAITING_PERMISSION'){renderWaiting(result);return;}var answer=bestText(result);if(answer)renderAnswer(answer,{provider:'FTN ibis runtime',degraded:false});else renderFailure('The selected capability returned no usable answer.');
    }catch(err){if(FTN.HeadspaceRequestState&&!FTN.HeadspaceRequestState.active(token))return;renderFailure(esc(err&&err.message||'The intelligence route failed.'));}
  });
})(typeof window!=='undefined'?window:globalThis);
