// FTN Platform — Headspace universal answer bridge.
// General questions use the live IBIS text gateway. Evidence-dependent factual requests use the
// same governed web-research route as the primary IBIS workspace so Headspace cannot become a
// weaker, model-memory-only product surface.
(function(global){
  'use strict';
  var form=document.getElementById('inputOrbit'),input=document.getElementById('headspaceQuery'),hint=document.getElementById('commandHint'),conversation=[];
  if(!form||!input)return;
  var TEXT_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-text-cloudflare';
  var RESEARCH_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-web-research';
  var IMAGE_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-image-cloudflare';
  var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';

  function answerCard(){return document.querySelector('[data-thought="answer"]');}
  function esc(v){return String(v==null?'':v);}
  function focus(names){var F=global.FTN&&global.FTN.HeadspaceFabric;if(F&&F.focus)F.focus(names);else(names||[]).forEach(function(name){var n=document.querySelector('[data-thought="'+name+'"]');if(n)n.classList.remove('dematerialized','hs-minimized');});}
  function products(){var P=global.FTN&&global.FTN.ProductRegistry;try{return P&&P.publicProducts?P.publicProducts({includeSupporting:true}).map(function(p){return{name:p.name,route:p.route,tagline:p.tagline};}).slice(0,30):[];}catch(_){return[];}}
  function locationContext(){try{var C=global.FTN&&global.FTN.Country,v=C&&C.get?C.get():null;return v&&v.name?v.name:'';}catch(_){return'';}}
  function personLookup(text){return /^(?:tell me about|who is|who was|what do you know about|give me (?:information|info) (?:about|on))\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'’-]+){1,5}[?.!]*$/.test(String(text||'').trim());}
  function needsLiveEvidence(text){var q=String(text||'').trim();if(personLookup(q))return true;if(/\b(search (?:the )?web|web search|google|look up|research|find information|find info)\b/i.test(q))return true;if(/\b(today|latest|current|currently|right now|recent|news|price|rate|weather|score|election|law|regulation|court|lawsuit|company record|owner|director|biography|credits|grant|funding|vacanc|job opening|event)\b/i.test(q))return true;return /^(?:what|who|where|when)\s+(?:is|are|was|were|did|does)\s+/i.test(q)&&/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(q);}
  function imageRequest(text){return /\b(?:create|generate|make|render|draw|illustrate|design)\b/i.test(text)&&/\b(?:image|picture|photo|photograph|visual|poster|graphic|thumbnail|cover|flyer|portrait|landscape)\b/i.test(text);}
  function mortgageAnswer(text){
    if(!/\bmortgage\b/i.test(text))return null;
    var money=String(text).match(/(?:TT\$|\$)\s*([\d,.]+)\s*(million|m)?/i),rate=String(text).match(/([\d.]+)\s*%/),years=String(text).match(/([\d.]+)\s*(?:years?|yrs?)/i);
    if(!money||!rate||!years)return null;
    var principal=parseFloat(money[1].replace(/,/g,''))*(money[2]?1000000:1),annual=parseFloat(rate[1])/100,term=parseFloat(years[1]),months=Math.round(term*12),monthlyRate=annual/12;
    if(!(principal>0&&annual>=0&&months>0))return null;
    var factor=Math.pow(1+monthlyRate,months),payment=monthlyRate?principal*monthlyRate*factor/(factor-1):principal/months,total=payment*months,interest=total-principal,fmt=new Intl.NumberFormat('en-TT',{maximumFractionDigits:2,minimumFractionDigits:2});
    return{answer:'Estimated monthly payment: TT$'+fmt.format(payment)+'. Total paid over '+term+' years: TT$'+fmt.format(total)+'. Total interest: TT$'+fmt.format(interest)+'. Formula: M = P × r(1+r)^n ÷ ((1+r)^n − 1), using principal TT$'+fmt.format(principal)+', monthly rate '+(monthlyRate*100).toFixed(4)+'%, and '+months+' monthly payments. This estimate excludes insurance, legal fees, property taxes and lender charges.',provider:'IBIS deterministic mortgage calculator',calculation:true};
  }
  function publicAnswer(value){var s=String(value||'');s=s.replace(/\*\*(?:Evidence Boundary|What Could Change It|Next Action):\*\*[\s\S]*?(?=\*\*(?:Evidence Boundary|What Could Change It|Next Action|Useful Supporting Context|Conclusion):\*\*|$)/gi,' ');s=s.replace(/\*\*(?:Conclusion|Useful Supporting Context):\*\*/gi,' ');s=s.replace(/(?:^|\s)(?:CLASS|REQUEST CLASS|CEBOS|EBR)\s*:\s*[^.\n]+[.\n]?/gi,' ');s=s.replace(/\*\*/g,'').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();return s;}
  function rememberTurn(user,answer){conversation.push({role:'user',content:String(user||'').slice(0,2000)},{role:'assistant',content:String(answer||'').slice(0,4000)});if(conversation.length>12)conversation=conversation.slice(-12);}

  async function directText(text){
    var guard='Answer the user directly. Do not output internal FTN decision-framework headings or scorecards. Do not invent facts, capabilities, links, biographies, current events or data access. If evidence is required and none is supplied, say what must be verified. ';
    var messages=conversation.slice(-8).concat([{role:'user',content:guard+'\n\nUser request: '+text}]);
    var r=await fetch(TEXT_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({messages:messages,products:products(),locationContext:locationContext()})});
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

  async function generateImage(text){
    var providers=['cloudflare-workers-ai-image-flux','cloudflare-workers-ai-image-sdxl'],last='No verified image provider returned an artifact.';
    for(var i=0;i<providers.length;i++){
      var r=await fetch(IMAGE_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+KEY},body:JSON.stringify({prompt:text,providerId:providers[i]})});
      var body=await r.json().catch(function(){return{};});
      if(r.ok&&body.image&&body.mimeType&&body.extension)return body;
      last=body.error||last;
    }
    throw new Error(last);
  }

  function clearSources(a){var old=a&&a.querySelector('.hs-grounded-sources');if(old)old.remove();}
  function renderSources(a,sources){clearSources(a);if(!a||!Array.isArray(sources)||!sources.length)return;var box=document.createElement('div');box.className='hs-grounded-sources';box.setAttribute('aria-label','Grounded sources');box.style.cssText='margin-top:18px;display:grid;gap:8px';var label=document.createElement('strong');label.textContent='Grounded sources';label.style.cssText='font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ff7ec';box.appendChild(label);sources.slice(0,8).forEach(function(s,i){if(!s||!s.url)return;var link=document.createElement('a');link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='['+(i+1)+'] '+(s.publisher||s.title||s.url);link.style.cssText='color:#bafff6;text-decoration:underline;font-size:13px;line-height:1.4';box.appendChild(link);});var actions=a.querySelector('.actions');if(actions)a.insertBefore(box,actions);else a.appendChild(box);}
  function renderWaiting(result){focus(['answer','tools']);var a=answerCard();if(a){clearSources(a);a.querySelector('.thought-bar>span').textContent='PERMISSION REQUIRED';a.querySelector('h2').textContent='ibis is ready to continue, but this action changes something outside Headspace.';var waits=result&&result.run&&result.run.result&&result.run.result.waitingPermissions||[];a.querySelector('p').textContent=waits.length?'Approval required for '+waits.map(function(x){return x.agent.toLowerCase();}).join(', ')+'.':'Approval is required before ibis can perform the external step.';}if(hint)hint.textContent='Execution paused at the permission boundary.';}
  function fitAnswer(a,text,meta){var size=String(text||'').length>1200?'long':String(text||'').length>520?'medium':'short';a.dataset.contentSize=size;a.style.removeProperty('height');a.style.removeProperty('max-height');a.style.overflow='visible';if(global.FTN&&global.FTN.HeadspaceWindowManager&&global.FTN.HeadspaceWindowManager.fit)global.FTN.HeadspaceWindowManager.fit(a,{length:String(text||'').length,sources:(meta&&meta.sources||[]).length});}
  function renderAnswer(text,meta){focus(['answer']);var a=answerCard();if(!a)return;clearSources(a);a.querySelector('.thought-bar>span').textContent=meta&&meta.sources&&meta.sources.length?'IBIS · GROUNDED WEB RESEARCH':'IBIS ANSWER';a.querySelector('h2').textContent='';var clean=publicAnswer(text);a.querySelector('p').textContent=clean;renderSources(a,meta&&meta.sources);fitAnswer(a,clean,meta);var actions=a.querySelector('.actions');if(actions)actions.style.display='flex';if(hint)hint.textContent='Answer returned through '+(meta&&meta.provider?meta.provider:'the governed IBIS route')+'.';}
  function renderImage(body,prompt){focus(['media']);var card=document.querySelector('[data-thought="media"]'),stage=card&&card.querySelector('.media-stage');if(!card||!stage)return;var mime=body.mimeType==='image/jpeg'?'image/jpeg':'image/png',ext=body.extension==='jpg'?'jpg':'png',src='data:'+mime+';base64,'+body.image;stage.innerHTML='';var img=document.createElement('img');img.src=src;img.alt=prompt;img.className='hs-generated-image';var download=document.createElement('a');download.href=src;download.download='ibis-generated-image.'+ext;download.textContent='Download image';download.className='hs-generated-download';stage.appendChild(img);stage.appendChild(download);card.dataset.contentSize='media';if(global.FTN&&global.FTN.HeadspaceWindowManager&&global.FTN.HeadspaceWindowManager.fit)global.FTN.HeadspaceWindowManager.fit(card,{media:true});if(hint)hint.textContent='Real image generated by '+(body.provider||'the verified IBIS image route')+'.';}
  function renderFailure(message){focus(['answer']);var a=answerCard();if(a){clearSources(a);a.querySelector('.thought-bar>span').textContent='IBIS';a.querySelector('h2').textContent='I could not complete that reliably.';a.querySelector('p').textContent=message||'The intelligence route is temporarily unavailable. No answer was invented.';}if(hint)hint.textContent='The request failed closed instead of falling back to prototype copy.';}

  function isPlainAnswer(route){return !route||route.sideEffect==='READ_ONLY'&&(route.capabilityCandidates||[]).every(function(cap){return cap==='TEXT';})&&(route.agents||[]).every(function(agent){return agent==='GENERAL';});}
  async function ask(text,context,route){var FTN=global.FTN=global.FTN||{},calculation=mortgageAnswer(text);if(calculation)return{kind:'DIRECT_TEXT',data:calculation};if(imageRequest(text))return{kind:'IMAGE',data:await generateImage(text)};if(needsLiveEvidence(text))return{kind:'GROUNDED_RESEARCH',data:await groundedResearch(text)};if(isPlainAnswer(route))return{kind:'DIRECT_TEXT',data:await directText(text)};if(FTN.IbisRuntimeReady)await FTN.IbisRuntimeReady;if(!FTN.IbisRuntime)throw new Error('Universal runtime is unavailable.');return{kind:'RUNTIME',data:await FTN.IbisRuntime.ask(text,context)};}
  function bestText(result){var direct=result&&(result.data||result.result)||{};if(direct.answer)return direct.answer;var outputs=result&&result.run&&result.run.result&&result.run.result.outputs||[];for(var i=outputs.length-1;i>=0;i--){var o=outputs[i].output||{},d=o.data||o.result||{};if(d.answer)return d.answer;if(o.result&&o.result.answer)return o.result.answer;if(typeof d==='string')return d;}return null;}

  form.addEventListener('submit',async function(e){
    var text=input.value.trim();if(!text)return;
    if(/^(go )?back$|^undo$|^redo$|^forward$|put (that|it) back|restore|save (this )?(headspace|space)|recall (headspace|space)$/i.test(text))return;
    e.preventDefault();e.stopImmediatePropagation();var FTN=global.FTN=global.FTN||{},token=FTN.HeadspaceRequestState&&FTN.HeadspaceRequestState.snapshot();if(hint)hint.textContent=imageRequest(text)?'ibis is generating a real image artifact…':needsLiveEvidence(text)?'ibis is researching live evidence…':'ibis is routing the request to a real intelligence capability…';input.value='';
    try{
      var context={attachments:((FTN.HeadspaceInputContext&&FTN.HeadspaceInputContext.attachments)||[]).slice()},route=null;
      if(FTN.UniversalRouter){try{route=FTN.UniversalRouter.route(text,context);}catch(_){} }
      var wrapped=await ask(text,context,route);if(FTN.HeadspaceRequestState&&!FTN.HeadspaceRequestState.active(token))return;
      if(wrapped.kind==='DIRECT_TEXT'||wrapped.kind==='GROUNDED_RESEARCH'){renderAnswer(wrapped.data.answer,wrapped.data);rememberTurn(text,wrapped.data.answer);return;}if(wrapped.kind==='IMAGE'){renderImage(wrapped.data,text);rememberTurn(text,'A real downloadable image artifact was generated.');return;}
      var result=wrapped.data;if(result&&result.status==='WAITING_PERMISSION'){renderWaiting(result);return;}var answer=bestText(result);if(answer){renderAnswer(answer,result);rememberTurn(text,answer);}else renderFailure('The selected capability returned no usable answer.');
    }catch(err){if(FTN.HeadspaceRequestState&&!FTN.HeadspaceRequestState.active(token))return;renderFailure(esc(err&&err.message||'The intelligence route failed.'));}
  });
})(typeof window!=='undefined'?window:globalThis);
