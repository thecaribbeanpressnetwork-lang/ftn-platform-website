// FTN Platform — Headspace universal answer bridge.
// General questions use the live IBIS text gateway. Evidence-dependent factual requests use the
// same governed web-research route as the primary IBIS workspace so Headspace cannot become a
// weaker, model-memory-only product surface.
(function(global){
  'use strict';
  var form=document.getElementById('inputOrbit'),input=document.getElementById('headspaceQuery'),hint=document.getElementById('commandHint');
  if(!form||!input)return;
  var TEXT_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-text-cloudflare';
  var RESEARCH_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-web-research';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';

  function answerCard(){return document.querySelector('[data-thought="answer"]');}
  function esc(v){return String(v==null?'':v);}
  function focus(names){var F=global.FTN&&global.FTN.HeadspaceFabric;if(F&&F.focus)F.focus(names);else(names||[]).forEach(function(name){var n=document.querySelector('[data-thought="'+name+'"]');if(n)n.classList.remove('dematerialized','hs-minimized');});}
  function products(){var P=global.FTN&&global.FTN.ProductRegistry;try{return P&&P.publicProducts?P.publicProducts({includeSupporting:true}).map(function(p){return{name:p.name,route:p.route,tagline:p.tagline};}).slice(0,30):[];}catch(_){return[];}}
  function locationContext(){try{var C=global.FTN&&global.FTN.Country,v=C&&C.get?C.get():null;return v&&v.name?v.name:'';}catch(_){return'';}}
  function personLookup(text){return /^(?:tell me about|who is|who was|what do you know about|give me (?:information|info) (?:about|on))\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'’-]+){1,5}[?.!]*$/.test(String(text||'').trim());}
  function needsLiveEvidence(text){var q=String(text||'').trim();if(personLookup(q))return true;if(/\b(search (?:the )?web|web search|google|look up|research|find information|find info)\b/i.test(q))return true;if(/\b(today|latest|current|currently|right now|recent|news|price|rate|weather|score|election|law|regulation|court|lawsuit|company record|owner|director|biography|credits|grant|funding|vacanc|job opening|event)\b/i.test(q))return true;return /^(?:what|who|where|when)\s+(?:is|are|was|were|did|does)\s+/i.test(q)&&/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(q);}
  function publicAnswer(value){var s=String(value||'');s=s.replace(/\*\*(?:Evidence Boundary|What Could Change It|Next Action):\*\*[\s\S]*?(?=\*\*(?:Evidence Boundary|What Could Change It|Next Action|Useful Supporting Context|Conclusion):\*\*|$)/gi,' ');s=s.replace(/\*\*(?:Conclusion|Useful Supporting Context):\*\*/gi,' ');s=s.replace(/(?:^|\s)(?:CLASS|REQUEST CLASS|CEBOS|EBR)\s*:\s*[^.\n]+[.\n]?/gi,' ');s=s.replace(/\*\*/g,'').replace(/\s{2,}/g,' ').trim();return s;}

  async function directText(text){
    var guard='Answer the user directly. Do not output internal FTN decision-framework headings or scorecards. Do not invent facts, capabilities, links, biographies, current events or data access. If evidence is required and none is supplied, say what must be verified. ';
    var r=await fetch(TEXT_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({messages:[{role:'user',content:guard+'\n\nUser request: '+text}],products:products(),locationContext:locationContext()})});
    var body=await r.json().catch(function(){return{};});
    if(!r.ok||!body.answer)throw new Error(body.error||'The IBIS language gateway did not return an answer.');
    body.answer=publicAnswer(body.answer);return body;
  }

  async function groundedResearch(text){
    var r=await fetch(RESEARCH_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({query:text,locationContext:locationContext()})});
    var body=await r.json().catch(function(){return{};});
    if(!r.ok||!body.answer||!Array.isArray(body.sources)||!body.sources.length)throw new Error(body.error||'Grounded web research did not return enough evidence to answer.');
    body.answer=publicAnswer(body.answer);return body;
  }

  function clearSources(a){var old=a&&a.querySelector('.hs-grounded-sources');if(old)old.remove();}
  function renderSources(a,sources){clearSources(a);if(!a||!Array.isArray(sources)||!sources.length)return;var box=document.createElement('div');box.className='hs-grounded-sources';box.setAttribute('aria-label','Grounded sources');box.style.cssText='margin-top:18px;display:grid;gap:8px';var label=document.createElement('strong');label.textContent='Grounded sources';label.style.cssText='font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ff7ec';box.appendChild(label);sources.slice(0,8).forEach(function(s,i){if(!s||!s.url)return;var link=document.createElement('a');link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='['+(i+1)+'] '+(s.publisher||s.title||s.url);link.style.cssText='color:#bafff6;text-decoration:underline;font-size:13px;line-height:1.4';box.appendChild(link);});var actions=a.querySelector('.actions');if(actions)a.insertBefore(box,actions);else a.appendChild(box);}
  function renderWaiting(result){focus(['answer','tools']);var a=answerCard();if(a){clearSources(a);a.querySelector('.thought-bar>span').textContent='PERMISSION REQUIRED';a.querySelector('h2').textContent='ibis is ready to continue, but this action changes something outside Headspace.';var waits=result&&result.run&&result.run.result&&result.run.result.waitingPermissions||[];a.querySelector('p').textContent=waits.length?'Approval required for '+waits.map(function(x){return x.agent.toLowerCase();}).join(', ')+'.':'Approval is required before ibis can perform the external step.';}if(hint)hint.textContent='Execution paused at the permission boundary.';}
  function renderAnswer(text,meta){focus(['answer']);var a=answerCard();if(!a)return;clearSources(a);a.querySelector('.thought-bar>span').textContent=meta&&meta.sources&&meta.sources.length?'IBIS · GROUNDED WEB RESEARCH':'IBIS ANSWER';a.querySelector('h2').textContent='';a.querySelector('p').textContent=publicAnswer(text);renderSources(a,meta&&meta.sources);var actions=a.querySelector('.actions');if(actions)actions.style.display='flex';if(hint)hint.textContent='Answer returned through '+(meta&&meta.provider?meta.provider:'the governed IBIS route')+'.';}
  function renderFailure(message){focus(['answer']);var a=answerCard();if(a){clearSources(a);a.querySelector('.thought-bar>span').textContent='IBIS';a.querySelector('h2').textContent='I could not complete that reliably.';a.querySelector('p').textContent=message||'The intelligence route is temporarily unavailable. No answer was invented.';}if(hint)hint.textContent='The request failed closed instead of falling back to prototype copy.';}

  function isPlainAnswer(route){return !route||route.sideEffect==='READ_ONLY'&&(route.capabilityCandidates||[]).every(function(cap){return cap==='TEXT';})&&(route.agents||[]).every(function(agent){return agent==='GENERAL';});}
  async function ask(text,context,route){var FTN=global.FTN=global.FTN||{};if(needsLiveEvidence(text))return{kind:'GROUNDED_RESEARCH',data:await groundedResearch(text)};if(isPlainAnswer(route))return{kind:'DIRECT_TEXT',data:await directText(text)};if(FTN.IbisRuntimeReady)await FTN.IbisRuntimeReady;if(!FTN.IbisRuntime)throw new Error('Universal runtime is unavailable.');return{kind:'RUNTIME',data:await FTN.IbisRuntime.ask(text,context)};}
  function bestText(result){var direct=result&&(result.data||result.result)||{};if(direct.answer)return direct.answer;var outputs=result&&result.run&&result.run.result&&result.run.result.outputs||[];for(var i=outputs.length-1;i>=0;i--){var o=outputs[i].output||{},d=o.data||o.result||{};if(d.answer)return d.answer;if(o.result&&o.result.answer)return o.result.answer;if(typeof d==='string')return d;}return null;}

  form.addEventListener('submit',async function(e){
    var text=input.value.trim();if(!text)return;
    if(/^(go )?back$|^undo$|^redo$|^forward$|put (that|it) back|restore|save (this )?(headspace|space)|recall (headspace|space)$/i.test(text))return;
    e.preventDefault();e.stopImmediatePropagation();var FTN=global.FTN=global.FTN||{},token=FTN.HeadspaceRequestState&&FTN.HeadspaceRequestState.snapshot();if(hint)hint.textContent=needsLiveEvidence(text)?'ibis is researching live evidence…':'ibis is routing the request to a real intelligence capability…';input.value='';
    try{
      var context={attachments:((FTN.HeadspaceInputContext&&FTN.HeadspaceInputContext.attachments)||[]).slice()},route=null;
      if(FTN.UniversalRouter){try{route=FTN.UniversalRouter.route(text,context);}catch(_){} }
      var wrapped=await ask(text,context,route);if(FTN.HeadspaceRequestState&&!FTN.HeadspaceRequestState.active(token))return;
      if(wrapped.kind==='DIRECT_TEXT'||wrapped.kind==='GROUNDED_RESEARCH'){renderAnswer(wrapped.data.answer,wrapped.data);return;}
      var result=wrapped.data;if(result&&result.status==='WAITING_PERMISSION'){renderWaiting(result);return;}var answer=bestText(result);if(answer)renderAnswer(answer,result);else renderFailure('The selected capability returned no usable answer.');
    }catch(err){if(FTN.HeadspaceRequestState&&!FTN.HeadspaceRequestState.active(token))return;renderFailure(esc(err&&err.message||'The intelligence route failed.'));}
  });
})(typeof window!=='undefined'?window:globalThis);
