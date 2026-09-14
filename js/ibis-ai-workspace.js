// FTN Platform — FTN ibis functional intelligence workspace.
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
  // Correction (canonical-brain completion pass): a client-side keyword gate used to live here
  // (QUICK_LIVE_PHRASES/quickLooksLikeLiveRequest) and decide, in the browser, that a message
  // "looks like" a live/current-events request -- routing it straight to renderLiveResearch()
  // (Hacker News + GitHub search only) and returning BEFORE serverAI()/the canonical brain ever
  // ran. That is exactly the architecture being corrected: the browser must never decide a query
  // is too current for canonical orchestration. Freshness classification now happens exactly once,
  // inside supabase/functions/_shared/ibis-intent-router.ts's classifyIntent(), which every prompt
  // reaches via serverAI() -> FTN.IbisRuntime.ask() (or, if that is unavailable, degradedTextFallback()
  // -> canonicalServerQuery()'s action:'canonical_query' call). renderLiveResearch() itself is left
  // in place below as an available capability, just no longer a pre-emptive authority over ordinary
  // conversation.
  // Final integration pass (Caribbean intelligence): loads the real, cited lexical-marker
  // detector (js/ibis-caribbean-language-id.js, Phase 13) so ASK-mode requests can honestly note
  // when a user's own message already contains real Trinidad English/Creole vocabulary --
  // understanding, never forcing dialect back. This never dumps a glossary into a prompt: it only
  // ever adds one real, cited note when the detector actually finds a marker in THIS message.
  function ensureCaribbeanLanguageId(){if(global.FTN&&global.FTN.CaribbeanLanguageId)return Promise.resolve();return loadScript('/js/ibis-caribbean-language-id.js');}
  // The public workspace calls the same governed IBIS Client as every other node. Dependencies are
  // lazy-loaded so first paint remains small; a guest prompt goes to the public gateway and signed-
  // in users can still use any additional provider made eligible by policy.
  async function ensureIbisClient(){
    if(!global.FTN||!global.FTN.NodeRegistry)await loadScript('/js/ftn-node-registry.js');
    if(!global.FTN||!global.FTN.CapabilityTaxonomy)await loadScript('/js/ibis-capability-taxonomy.js');
    if(!global.FTN||!global.FTN.IbisEligibility)await loadScript('/js/ibis-eligibility.js');
    if(!global.FTN||!global.FTN.IbisProvenance)await loadScript('/js/ibis-provenance.js');
    if(!global.FTN||!global.FTN.IbisClient)await loadScript('/js/ibis-client.js');
  }
  // Canonical-routing fix: regular ibis previously never loaded or consulted the Universal Router at
  // all -- every plain-text question went straight to the default TEXT provider, bypassing the Founder
  // Cognitive Layer, Butterfly Engine, Connection Fabric and multi-agent orchestration entirely, even
  // when the request genuinely called for one of them. js/ibis-headspace-universal.js already gates on
  // this same router; this mirrors that exact pattern so regular ibis and Headspace share one
  // classification step instead of the workspace silently short-circuiting past it. ibis-runtime-loader.js
  // is idempotent (guards each script by testing the primitive it registers), so calling this from both
  // surfaces on the same page never double-loads anything.
  async function ensureRuntime(){
    if(global.FTN&&global.FTN.IbisRuntime)return;
    await loadScript('/js/ibis-runtime-loader.js');
    if(global.FTN&&global.FTN.IbisRuntimeReady)await withTimeout(global.FTN.IbisRuntimeReady,15000,null);
  }
  // Correction (this pass): an isPlainAnswer() predicate used to live here, mirroring
  // js/ibis-headspace-universal.js, and serverAI() used it to decide in the BROWSER whether a
  // question was "plain" enough to skip FTN.IbisRuntime.ask() entirely. That is exactly the
  // architectural violation this pass removes: the browser must never decide a question is simple
  // and route around canonical orchestration on that basis. js/ibis-runtime.js's own ask() already
  // calls FTN.UniversalRouter.route() and FTN.MultiAgentOrchestrator.execute() internally -- "this is
  // a simple question, answer it directly" is a legitimate outcome, but it must be decided INSIDE
  // that canonical planner, not by a client-side gate that prevents the planner from ever running.
  // serverAI() below now calls FTN.IbisRuntime.ask() unconditionally for every prompt.
  //
  // Identical extraction to js/ibis-headspace-universal.js's bestText() -- FTN.IbisRuntime.ask() returns
  // the multi-agent orchestrator's raw result shape, not the {answer,...} shape serverAI() otherwise
  // returns, so this normalizes it the same way Headspace already does.
  function bestRuntimeText(result){var direct=result&&(result.data||result.result)||{};if(direct.answer)return direct.answer;var outputs=result&&result.run&&result.run.result&&result.run.result.outputs||[];for(var i=outputs.length-1;i>=0;i--){var o=outputs[i].output||{},d=o.data||o.result||{};if(d.answer)return d.answer;if(o.result&&o.result.answer)return o.result.answer;if(typeof d==='string')return d;}return null;}
  // Pass 16: IBIS Live Intelligence lazy-load. js/ibis-provider-registry.js is already a static
  // script tag on this page; the eligibility engine and the live-research capability itself are
  // loaded on demand, same pattern as every other ensure* helper here.
  async function ensureLiveResearch(){
    if(!global.FTN||!global.FTN.SourceProvenance)await loadScript('/js/ftn-source-provenance.js');
    if(!global.FTN||!global.FTN.IbisEligibility)await loadScript('/js/ibis-eligibility.js');
    if(!global.FTN||!global.FTN.LiveResearch)await loadScript('/js/ibis-live-research.js');
  }
  // Phase 4B: the shared provenance envelope + evidence decision matrix + Trust Card, loaded once,
  // reused by both the Live Intelligence and TEXT (serverAI/localAI) render paths below.
  async function ensureEvidence(){
    if(!global.FTN||!global.FTN.IbisProvenance)await loadScript('/js/ibis-provenance.js');
    if(!global.FTN||!global.FTN.IbisEvidence)await loadScript('/js/ibis-evidence.js');
    // trust-card.js is already a static <script> tag on several pages (e.g. Observatory) -- guard
    // by src, not just a marker, so this never loads a second, duplicate #trust-card-dialog. Same
    // fix js/ibis-widget.js's own loadScriptOnce() needed for the identical reason.
    if(!global.FTN||!global.FTN.TrustCard){
      if(!document.querySelector('script[src^="/js/trust-card.js"]'))await loadScript('/js/trust-card.js');
    }
  }
  var SOURCE_CLASS_LABEL={COMMUNITY_DISCUSSION:'Community discussion',REPUTABLE_JOURNALISM:'Journalism',OFFICIAL_GOVERNMENT:'Official government',ACADEMIC:'Academic',PRIMARY_EVIDENCE:'Primary evidence',CORPORATE_STATEMENT:'Corporate statement',CREATOR_SOCIAL:'Creator/social',PERSONAL_COMMENTARY:'Personal commentary',MARKETING_ADVOCACY:'Marketing/advocacy',LEGISLATION_PUBLIC_RECORD:'Legislation/public record',UNKNOWN:'Unknown'};
  function sourceCardHTML(source){
    return '<a class="ibis-live-source" href="'+esc(source.url||'#')+'" target="_blank" rel="noopener noreferrer">'
      +'<span class="ibis-live-source__platform">'+esc(source.platform||'Source')+'</span>'
      +'<span class="ibis-live-source__title">'+esc(source.title||source.url||'Untitled')+'</span>'
      +'<span class="ibis-live-source__meta">'+esc(SOURCE_CLASS_LABEL[source.sourceClass]||source.sourceClass)+(source.engagement?' · '+esc(source.engagement):'')+' · retrieved '+esc(new Date(source.retrievedAt).toLocaleTimeString())+'</span>'
      +'</a>';
  }
  // Real evidence-backed current-source research -- distinct visual treatment (a bordered
  // "Live Intelligence" block with real linked sources) so this is never mistaken for ordinary
  // model reasoning. Routed through the existing eligibility/provider engine, not a bypass.
  async function renderLiveResearch(query,out){
    await ensureLiveResearch();
    await ensureEvidence();
    if(!global.FTN.IbisEligibility||!global.FTN.LiveResearch){
      out.innerHTML='<span class="workspace-kicker">Live Intelligence unavailable</span><p>The live-research module could not load in this browser. Falling back to ibis\'s ordinary answer.</p>';
      mountEvidence(out,{capability:'LIVE_INTELLIGENCE',degradedState:'NO_ELIGIBLE_PROVIDER'},{prompt:query});
      return false;
    }
    var attempt=await global.FTN.IbisEligibility.attemptInOrder('LIVE_INTELLIGENCE',{authenticated:false},async function(provider){
      var startedAt=Date.now();
      try{
        var result=await global.FTN.LiveResearch.research(query);
        return {success:true,latencyMs:Date.now()-startedAt,data:result};
      }catch(e){
        return {success:false,latencyMs:Date.now()-startedAt,errorType:'SERVER_ERROR'};
      }
    });
    // Real provenance envelope for this path -- renderLiveResearch calls IbisEligibility directly
    // (see the header comment above), not js/ibis-client.js's request(), so no envelope exists
    // unless built here. Deliberately omits attempt.attempts/routingPath from what's exposed --
    // internal retry history, not evidence -- see js/ibis-evidence.js's own header comment.
    if(!attempt.success){
      out.innerHTML='<span class="workspace-kicker">Live Intelligence unavailable</span><p>'+esc(attempt.reason||'No current-source research route is eligible right now.')+'</p>';
      mountEvidence(out,{capability:'LIVE_INTELLIGENCE',degradedState:attempt.attempts&&attempt.attempts.length?'ALL_PROVIDERS_FAILED':'NO_ELIGIBLE_PROVIDER'},{prompt:query});
      return false;
    }
    var data=attempt.result;
    var sourcesHTML=data.sources.length?'<div class="ibis-live-sources">'+data.sources.map(sourceCardHTML).join('')+'</div>':'';
    out.innerHTML='<span class="workspace-kicker ibis-live-kicker">Live Intelligence · current public sources, not model memory</span>'
      +'<p>'+esc(data.synthesis)+'</p>'
      +sourcesHTML
      +'<p class="workspace-muted">Retrieved '+esc(new Date(data.retrievedAt).toLocaleString())+' · claim confidence: <strong>'+esc(data.claimConfidence.confidence)+'</strong> ('+esc(data.claimConfidence.corroboration)+' independent source(s)) · '+esc(data.sourceCredibilityNote)+'</p>';
    var firstSource=data.sources[0];
    var provenance=global.FTN.IbisProvenance?global.FTN.IbisProvenance.build({
      capability:'LIVE_INTELLIGENCE',provider:attempt.provider&&attempt.provider.id,
      sourceIdentity:firstSource&&(firstSource.title||firstSource.platform),
      sourceUrl:firstSource&&firstSource.url,publisher:firstSource&&firstSource.platform,
      sourceRetrievedAt:data.retrievedAt,retrievalMethod:'LIVE_API_FETCH',
      confidenceBasis:data.claimConfidence&&data.claimConfidence.confidence,
      costToIbis:'ZERO_COST_TO_IBIS',
    }):{capability:'LIVE_INTELLIGENCE'};
    mountEvidence(out,provenance,{prompt:query,sources:data.sources,limitations:data.sourceCredibilityNote});
    return true;
  }
  // Small wrapper: never lets a missing/failed-to-load evidence module break the response itself.
  function mountEvidence(out,provenance,extra){
    try{ if(global.FTN&&global.FTN.IbisEvidence)global.FTN.IbisEvidence.mount(out,provenance,extra); }catch(e){}
  }
  // Returns just the matched term tokens (e.g. ['lime','bacchanal']), not a pre-built sentence --
  // the server (supabase/functions/ibis-query) re-validates each token against its own copy of
  // the same small whitelist before using them, so a client can never inject arbitrary text into
  // the server's system instruction via this field. localAI (below) is the one place a full
  // sentence is built directly, since that only ever reaches the user's own local on-device model
  // -- no server trust boundary is crossed there.
  async function caribbeanTerms(prompt){
    try{
      await ensureCaribbeanLanguageId();
      var detector=global.FTN&&global.FTN.CaribbeanLanguageId;
      if(!detector)return [];
      var result=detector.identify(prompt);
      if(result.evidenceType!=='RESEARCH_DERIVED'||!result.matches.length)return [];
      return result.matches.map(function(m){return m.term;});
    }catch(e){return [];}
  }
  function noteFromTerms(terms){
    if(!terms||!terms.length)return null;
    return 'The user\'s own message already contains real Trinidad English/Creole vocabulary ('+terms.join(', ')+'). Respond naturally in clear English -- do not attempt to imitate or exaggerate Trinidadian dialect back at them.';
  }
  function answerHTML(text){
    var lines=String(text||'').split(/\r?\n/),html='',list=null;
    function inline(value){return esc(value).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');}
    function closeList(){if(list){html+='</'+list+'>';list=null;}}
    lines.forEach(function(raw){
      var line=raw.trim();
      if(!line){closeList();return;}
      if(/^Decision:\s*/.test(line)){closeList();html+='<p class="ibis-answer-decision">'+inline(line)+'</p>';return;}
      if(/^(Real objective|Strongest path|Risks to control|Next actions|Relevant FTN routes)$/.test(line)){closeList();html+='<h3 class="ibis-answer-heading">'+esc(line)+'</h3>';return;}
      if(/^\d+\.\s+/.test(line)){if(list!=='ol'){closeList();list='ol';html+='<ol class="ibis-answer-list">';}html+='<li>'+inline(line.replace(/^\d+\.\s+/,''))+'</li>';return;}
      if(/^[-*]\s+/.test(line)){if(list!=='ul'){closeList();list='ul';html+='<ul class="ibis-answer-list">';}html+='<li>'+inline(line.replace(/^[-*]\s+/,''))+'</li>';return;}
      closeList();html+='<p>'+inline(line)+'</p>';
    });
    closeList();return html;
  }
  function wantsFtnRoutes(text){return /\b(open|where|which ftn|find an? ftn|route me|what ftn|ftn tool|ftn product)\b/i.test(String(text||''));}
  function answerMeta(server){
    if(server.answerClass==='CALCULATION')return'<p class="ibis-answer-meta">Calculated locally by ibis.</p>';
    if(server.answerClass==='CONVERSATION'||server.answerClass==='PRODUCT_IDENTITY'||server.answerClass==='FTN_REGISTRY')return'';
    if(server.answerClass==='FOUNDER_REASONING_FALLBACK')return'<p class="ibis-answer-meta">Owned ibis reasoning · external facts not claimed'+(server.uncertainty?' · '+esc(server.uncertainty):'')+'</p>';
    return'<p class="ibis-answer-meta">'+esc(server.provider||'Governed ibis route')+(server.model?' · '+esc(server.model):'')+(server.uncertainty?' · '+esc(server.uncertainty):'')+'</p>';
  }
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
  // CORRECTED (this pass -- the prior version of this gate was itself still a bypass): local
  // execution used to be gated by calling FTN.UniversalRouter.route() directly IN THE BROWSER --
  // but that router is not the canonical server brain. A browser deciding, on its own, that a
  // question is "plain" or "non-fresh" and therefore safe to answer locally is exactly the
  // architecture being corrected, even when the classifier it consults is a real one. The
  // authority now lives exclusively server-side: every prompt is sent to
  // action:"canonical_query" FIRST, and that response's executionInstruction
  // (see supabase/functions/_shared/ibis-response-envelope.ts) is the ONLY thing that may
  // authorize FTN LanguageModel execution. A malformed, rejected, timed-out or unreachable
  // canonical response never defaults to authorizing local execution -- it defaults to using the
  // canonical answer itself (which the same response already carries), or, if canonical_query is
  // entirely unreachable, falls through to the existing serverAI() path below. Local execution is
  // never the "safe default" on any failure path.
  var PUBLISHABLE_KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var ASSISTANT_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-assistant';
  function productsSummary(){return global.FTN.ProductRegistry&&global.FTN.ProductRegistry.publicProducts?global.FTN.ProductRegistry.publicProducts({includeSupporting:true}).map(function(p){return{name:p.name,route:p.route,tagline:p.tagline};}):[];}
  async function requestCanonicalDecision(prompt){
    try{
      var response=await withTimeout(fetch(ASSISTANT_ENDPOINT,{
        method:'POST',
        headers:{'content-type':'application/json',apikey:PUBLISHABLE_KEY,authorization:'Bearer '+PUBLISHABLE_KEY},
        body:JSON.stringify({action:'canonical_query',messages:[{role:'user',content:prompt}],products:productsSummary()}),
      }),15000,null);
      if(!response||!response.ok)return null;
      var envelope=await response.json().catch(function(){return null;});
      if(!envelope||typeof envelope.answer!=='string')return null;
      return envelope;
    }catch(e){return null;}
  }
  // Fire-and-forget: the completion/receipt path so the canonical system has a real record of what
  // browser-local execution actually did (not just what it authorized). Never blocks rendering --
  // a receipt-recording failure must not affect the user's answer.
  function recordExecutionReceipt(receipt){
    try{
      fetch(ASSISTANT_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',apikey:PUBLISHABLE_KEY,authorization:'Bearer '+PUBLISHABLE_KEY},body:JSON.stringify({action:'record_execution_receipt',receipt:receipt})}).catch(function(){});
    }catch(e){}
  }
  async function localAI(prompt){
    if(!('LanguageModel' in global))return null;
    try{
      var opts={expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]};
      var availability=await withTimeout(global.LanguageModel.availability(opts),5000,null);
      if(availability!=='available')return null;
      var session=await withTimeout(global.LanguageModel.create(opts),8000,null);
      if(!session)return null;
      var caribbeanNote=noteFromTerms(await caribbeanTerms(prompt));
      var instruction='You are FTN ibis, FTN Platform’s Ai powered by Caribbean intelligence. Be practical, concise and transparent. Do not invent current facts. When the user asks for an FTN action, connect the answer to the appropriate FTN tool. User country context: '+country()+'.'+(caribbeanNote?' '+caribbeanNote:'')+'\n\nUser request: '+prompt;
      var answer=await withTimeout(session.prompt(instruction),20000,null);
      try{session.destroy();}catch(e){}
      return answer;
    }catch(e){return null;}
  }
  // Builds the non-secret receipt every serverAI() response now carries: which reasoning modes the
  // canonical planner actually ran (from the route FTN.IbisRuntime.ask() itself produced, never
  // guessed), versus a degraded stage name when canonical orchestration could not run at all. This
  // is the honest alternative to letting a fallback answer look identical to a canonical one.
  function canonicalReceipt(route,failedStage){
    return{
      orchestration:failedStage?'DEGRADED':'CANONICAL',
      failedStage:failedStage||null,
      capabilityCandidates:(route&&route.capabilityCandidates)||[],
      agents:(route&&route.agents)||[],
      sideEffect:(route&&route.sideEffect)||null,
    };
  }
  // Canonical-brain server slice (feature-flagged action:'canonical_query' on the ibis-assistant
  // Edge Function -- see supabase/functions/_shared/ibis-canonical-brain.ts). Called as the FIRST
  // fallback attempt below, ahead of the bare TEXT provider call, because it is a strict superset
  // of that call for the cases it covers today: freshness-sensitive prompts get real search (or an
  // honest SEARCH_UNAVAILABLE with direct-link alternatives) instead of silently answering from
  // model memory, and every other prompt still gets the exact same deterministic/provider/founder-
  // rules-fallback chain the bare TEXT call would have used anyway. Returns null (never throws) on
  // any failure so the caller falls straight through to the unconditional bare TEXT call -- this
  // must never be the only route to an answer.
  async function canonicalServerQuery(prompt,products,context){
    try{
      var response=await withTimeout(fetch('https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-assistant',{
        method:'POST',
        headers:{'content-type':'application/json',apikey:'sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z',authorization:'Bearer sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z'},
        body:JSON.stringify({action:'canonical_query',messages:[{role:'user',content:prompt}],products:products}),
      }),12000,null);
      if(!response||!response.ok)return null;
      var envelope=await response.json().catch(function(){return null;});
      if(!envelope||typeof envelope.answer!=='string'||!envelope.answer)return null;
      return envelope;
    }catch(e){return null;}
  }
  // Runtime unavailable, timed out, or returned nothing usable: answer through the canonical server
  // brain first, then the direct TEXT provider, so the user is never dead-ended, but mark the
  // response degraded and name the stage that failed -- never disguise this as a canonical response
  // from FTN.IbisRuntime.ask() (the browser-side canonical path this function is a fallback FOR).
  async function degradedTextFallback(prompt,products,context,failedStage,route){
    var canonical=await canonicalServerQuery(prompt,products,context);
    if(canonical){
      return{available:true,degraded:true,failedStage:failedStage,answer:canonical.answer,provider:'FTN ibis canonical brain',providerId:(canonical.providerPath&&canonical.providerPath[0])||null,model:'',generatedAt:canonical.generatedAt||new Date().toISOString(),confidence:canonical.confidence||null,uncertainty:canonical.confidenceBasis||null,answerClass:canonical.queryClass||null,provenance:{sources:canonical.sources,alternatives:canonical.alternatives,queryClass:canonical.queryClass},receipt:Object.assign({},canonicalReceipt(route,failedStage),{serverEnvelope:canonical.receipt})};
    }
    var response=await global.FTN.IbisClient.request({nodeId:'ibis-ai',capability:'TEXT',context:context,payload:{prompt:prompt,products:products}});
    if(!response||!response.success)return{available:false,degraded:true,failedStage:failedStage,reason:(response&&response.reason)||'No eligible ibis answer route is available.',receipt:canonicalReceipt(route,failedStage)};
    var result=response.result||{};
    return{available:true,degraded:true,failedStage:failedStage,answer:result.answer,provider:result.provider||response.provenance.provider||'FTN ibis',providerId:response.provenance.provider||null,model:result.model||response.provenance.model||'',generatedAt:result.generatedAt||new Date().toISOString(),confidence:result.confidence||null,uncertainty:result.uncertainty||null,answerClass:result.answerClass||null,provenance:response.provenance,receipt:canonicalReceipt(route,failedStage)};
  }
  async function serverAI(prompt){
    try{
      await ensureIbisClient();
      if(!global.FTN||!global.FTN.IbisClient)return{available:false,degraded:true,failedStage:'IBIS_CLIENT_LOAD',reason:'The ibis client did not load.',receipt:canonicalReceipt(null,'IBIS_CLIENT_LOAD')};
      var user=null;
      if(global.FTN.Auth&&global.FTN.Auth.getVerifiedUser)user=await withTimeout(global.FTN.Auth.getVerifiedUser(),4000,null);
      var products=global.FTN.ProductRegistry&&global.FTN.ProductRegistry.publicProducts?global.FTN.ProductRegistry.publicProducts({includeSupporting:true}).map(function(p){return{name:p.name,route:p.route,tagline:p.tagline};}):[];
      var context={authenticated:!!user};

      // Every prompt enters the canonical planner unconditionally -- no client-side "is this plain"
      // gate exists any more (see the comment above where isPlainAnswer() used to live). If the
      // runtime genuinely cannot load, that is a real degraded state, reported as one, not silently
      // disguised as a normal answer.
      var runtimeLoadFailed=null;
      try{await ensureRuntime();}catch(e){runtimeLoadFailed=(e&&e.message)||'runtime failed to load';}
      if(runtimeLoadFailed||!global.FTN||!global.FTN.IbisRuntime){
        return degradedTextFallback(prompt,products,context,'RUNTIME_UNAVAILABLE',null);
      }

      var runtimeResult;
      try{
        var TIMED_OUT={};
        runtimeResult=await withTimeout(global.FTN.IbisRuntime.ask(prompt,context),25000,TIMED_OUT);
        if(runtimeResult===TIMED_OUT)return degradedTextFallback(prompt,products,context,'ORCHESTRATION_TIMEOUT',null);
      }catch(e){
        return degradedTextFallback(prompt,products,context,'ORCHESTRATION_EXCEPTION',null);
      }

      var route=runtimeResult&&runtimeResult.route;
      if(runtimeResult&&runtimeResult.errorType==='RUNTIME_NOT_READY'){
        return degradedTextFallback(prompt,products,context,'RUNTIME_NOT_READY',route);
      }
      if(runtimeResult&&runtimeResult.status==='WAITING_PERMISSION'){
        return{available:true,degraded:false,answer:'This needs your approval before ibis can continue -- it would take an action outside this conversation. Open Headspace to approve or decline it.',provider:'FTN ibis runtime',providerId:'ibis-runtime',model:'',generatedAt:new Date().toISOString(),confidence:null,uncertainty:'Action requires explicit permission.',answerClass:'WAITING_PERMISSION',provenance:{route:route},receipt:canonicalReceipt(route,null)};
      }
      var runtimeAnswer=bestRuntimeText(runtimeResult);
      if(runtimeAnswer){
        return{available:true,degraded:false,answer:runtimeAnswer,provider:'FTN ibis runtime',providerId:'ibis-runtime',model:'',generatedAt:new Date().toISOString(),confidence:null,uncertainty:null,answerClass:'RUNTIME_RESPONSE',provenance:{route:route,runtime:true},receipt:canonicalReceipt(route,null)};
      }
      // The canonical planner ran but produced nothing usable -- degrade explicitly rather than
      // silently retrying a different route the user can't see was different.
      return degradedTextFallback(prompt,products,context,'RUNTIME_NO_ANSWER',route);
    }catch(e){return{available:false,degraded:true,failedStage:'SERVER_AI_EXCEPTION',reason:e.message||'The ibis gateway is unavailable.',receipt:canonicalReceipt(null,'SERVER_AI_EXCEPTION')};}
  }
  // A contextual entry point (e.g. Learn/Opportunities/Screen linking here with ?scope=learn)
  // biases ranking toward its own product without ever hard-filtering out a better FTN match --
  // see js/product-registry.js's scopeMatches()/SCOPE_BONUS. Read once per call (not cached) so
  // ibis-query-bootstrap.js's URL-driven arrival and an ordinary in-page follow-up question both
  // see the correct scope for whichever way the user actually got here.
  function routeResults(goal){var scope=new URLSearchParams(location.search).get('scope')||null;var matches=global.FTN&&global.FTN.IntentRouter?global.FTN.IntentRouter.route(goal,{scopeProductId:scope}):[];if(!matches.length)return'<p>No strong FTN route matched. Try describing the outcome, not the product name.</p>';return'<div class="ibis-action-grid">'+matches.slice(0,5).map(function(m){return'<a class="ibis-action" href="'+esc(m.product.route)+'"><strong>'+esc(m.product.name)+'</strong><span>'+esc(m.product.tagline)+'</span><small>'+esc(m.explanation)+'</small></a>';}).join('')+'</div>';}
  function renderAnalysis(q){var rows=relevantIndicators(q);if(!rows.length)return'<p>No matching indicator history is loaded yet.</p>';return'<div class="ibis-data-list">'+rows.map(function(x){var c=x.c,p=c&&c.pct!=null?((c.pct>=0?'+':'')+c.pct.toFixed(1)+'%'):'history loaded',trust=global.FTN.TrustCard?global.FTN.TrustCard.trustScoreLabel(x.i):'Trust details available';return'<article><strong>'+esc(x.i.title)+'</strong><span>'+esc(x.i.category)+'</span><b>'+p+'</b><small>'+esc(trust)+' · '+esc(x.i.sourceName||'')+'</small></article>';}).join('')+'</div><p class="workspace-muted">Open <a href="/observatory/">FTN Live</a> or <a href="/scenario-workspace/#correlation-engine">Mission Control</a> to inspect relationships and evidence.</p>';}
  async function renderMedia(q,out){out.innerHTML='<p>Searching FTN media discovery…</p>';var lower=q.toLowerCase(),music=/song|music|soca|reggae|dancehall|calypso|kaiso|chutney|kompa|zouk|steelpan/.test(lower),d;try{if(music){var genre=/reggae/.test(lower)?'reggae':/dancehall/.test(lower)?'dancehall':/calypso|kaiso/.test(lower)?'calypso':/chutney/.test(lower)?'chutney':/kompa|zouk/.test(lower)?'zouk-kompa':'soca';d=await global.FTN.MediaDiscovery.discover({mode:'music',genre:genre,queries:[q+' official video Caribbean',q+' official audio Caribbean'],limit:60},{force:true});}else d=await global.FTN.MediaDiscovery.discover({mode:'video',queries:[q,q+' Trinidad Tobago',q+' Caribbean'],limit:60},{force:true});var items=d.results||[];out.innerHTML='<div class="ibis-media-grid">'+items.slice(0,24).map(function(t){return'<a href="https://www.youtube.com/watch?v='+encodeURIComponent(t.videoId)+'" target="_blank" rel="noopener"><img src="'+esc(t.thumbnail||'')+'" alt=""><strong>'+esc(t.title)+'</strong><span>'+esc(t.channel||'YouTube')+'</span></a>';}).join('')+'</div><p class="workspace-muted">'+items.length+' embeddable source results found. Open music in <a href="/riddim/dj/">FTN DJ Tube</a>, films in <a href="/screen/">FTN Screen</a>, or scheduled programming in <a href="/tv/">FTN TV</a>.</p>';}catch(e){out.innerHTML='<p>'+esc(e.message)+'</p>';}}
  async function createVisual(prompt,out){var ai=await localAI('Write a short headline of no more than 9 words for a Caribbean technology visual about: '+prompt);var title=(ai||prompt).replace(/[\n\r]+/g,' ').trim().slice(0,120),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;var ctx=canvas.getContext('2d'),h=hash(prompt),hue=h%360;var g=ctx.createLinearGradient(0,0,1200,630);g.addColorStop(0,'#050505');g.addColorStop(.65,'hsl('+hue+' 55% 18%)');g.addColorStop(1,'#111');ctx.fillStyle=g;ctx.fillRect(0,0,1200,630);for(var i=0;i<14;i++){var x=(h*(i+3)%1100)+50,y=(h*(i+11)%530)+50,r=8+(h*(i+17)%40);ctx.strokeStyle='hsla('+((hue+i*17)%360)+' 80% 70% / .25)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#E10613';ctx.fillRect(72,70,96,8);ctx.fillStyle='#fff';ctx.font='800 30px Inter,Arial';ctx.fillText('FTN ibis · FTN PLATFORM',72,125);ctx.font='800 68px Inter,Arial';var bottom=wrap(ctx,title,72,230,920,78,4);ctx.font='500 24px Inter,Arial';ctx.fillStyle='#d5d7dc';wrap(ctx,'Caribbean-first intelligence · '+country(),72,Math.min(535,bottom+38),900,32,2);ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1000,120);ctx.quadraticCurveTo(1080,160,1040,250);ctx.quadraticCurveTo(1000,325,1080,400);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(1040,250,10,0,Math.PI*2);ctx.fill();var url=canvas.toDataURL('image/png');out.innerHTML='<span class="workspace-kicker">On-device visual draft — not an AI-generated image</span><div class="ibis-visual-result"><img src="'+url+'" alt="Generated FTN visual"><div><a class="btn btn-primary" download="ibis-ftn-visual.png" href="'+url+'">Download PNG</a><button type="button" class="btn btn-outline" data-new-visual>Regenerate</button></div></div>';var b=out.querySelector('[data-new-visual]');if(b)b.onclick=function(){createVisual(prompt,out);};}

  var EXAMPLES=[
    ['What changed?','Show me the biggest changes in national indicators'],
    ['Find Caribbean movies','Find Trinidad and Caribbean movies I can watch'],
    ['Find soca','Find current soca tracks, not DJ mixes'],
    ['Find funding','I need funding opportunities for a Caribbean technology startup'],
    ['Create a visual','Create a visual for a Caribbean digital infrastructure campaign'],
  ];

  function injectStyle(){if(document.querySelector('link[data-ibis-style]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href='/css/components/ibis-ai.css?v=20260911.1';l.setAttribute('data-ibis-style','true');document.head.appendChild(l);}

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
          +'<header class="ibis-chat__header"><div><span class="workspace-kicker">Ask · Find · Analyze · Create</span><h2>ibis</h2></div><span id="ibis-ai-status"></span></header>'
          +'<div class="ibis-chat__conversation" id="ibis-conversation" role="log" aria-live="polite">'
            +'<div class="ibis-chat__welcome" id="ibis-chat-welcome"><h2>What do you need done?</h2><p>Ask ibis in plain language — find Caribbean films, analyze what changed, help with a grant, create a visual, route me to the right FTN tool…</p></div>'
          +'</div>'
          +'<form class="ibis-chat__composer" id="ibis-form" data-ftn-no-draft="true">'
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
      function revealAnswer(out){
        var message=out&&out.closest?out.closest('.ibis-msg'):null;
        if(!message)return;
        global.requestAnimationFrame(function(){conversation.scrollTop=Math.max(0,message.offsetTop-conversation.offsetTop-12);});
      }

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
        // The freshness/live-events pre-filter that used to gate here is removed (see the note
        // above QUICK_LIVE_PHRASES' old location, near the top of this file): a message reading
        // as current-events now reaches serverAI() like any other message, and freshness
        // classification happens once, canonically, in the server-side intent router.
        if(mode==='visual'||/create|generate|make/.test(q.toLowerCase())&&/image|visual|poster|graphic/.test(q.toLowerCase())){
          setStatus('generating');
          await createVisual(q,out);
          setStatus('idle');
          revealAnswer(out);
          return;
        }
        // Narrowed (canonical-brain completion pass): bare "find"/"search" used to be sufficient
        // to divert free-typed text to media discovery -- "search the internet for X" is a general
        // web-search request, not a media request, and must reach canonical orchestration like any
        // other question, not be silently claimed by YouTube discovery first. A genuine
        // media-domain term is still required for the free-text auto-trigger; the explicit Find
        // mode button (mode==='find') is a deliberate user action and is unaffected.
        if(mode==='find'||/movie|film|song|music|youtube|soca|reggae|dancehall|calypso|kaiso|chutney|kompa|zouk|steelpan/.test(q.toLowerCase())){
          setStatus('working');
          await renderMedia(q,out);
          setStatus('idle');
          revealAnswer(out);
          return;
        }
        // Keyword-sniffed auto-trigger removed (canonical-brain completion pass): "indicator",
        // "econom", "weather" etc. used to divert an ordinarily-typed question straight to the
        // local FTN indicator lookup before serverAI() ever ran -- exactly the kind of "the
        // browser decides this is too specialized for canonical orchestration" bypass being
        // corrected, and it silently swallowed the mandatory forex-indicators acceptance test
        // ("...foreign-exchange indicators" matches /indicator/). The explicit Analyze mode button
        // (mode==='analyze') is a deliberate user action, not a keyword guess, and is preserved.
        if(mode==='analyze'){
          out.innerHTML=renderAnalysis(q);
          setStatus('idle');
          revealAnswer(out);
          return;
        }
        setStatus('verifying');
        // Every prompt reaches the canonical server brain FIRST, unconditionally. Only its own
        // executionInstruction may authorize browser-local execution (see the note above
        // requestCanonicalDecision() for why the browser must never make this call itself).
        var canonical=await requestCanonicalDecision(q);
        if(canonical&&canonical.executionInstruction&&canonical.executionInstruction.executionAuthorized===true){
          var localStartedAt=Date.now();
          var localAnswer=await localAI(q);
          if(localAnswer){
            recordExecutionReceipt({planId:canonical.executionInstruction.planId,executionTarget:'browser_local',provider:'browser_local_language_model',success:true,degraded:false,latencyMs:Date.now()-localStartedAt});
            out.innerHTML='<span class="workspace-kicker">On-device AI (server-authorized)</span>'+answerHTML(localAnswer)+(wantsFtnRoutes(q)?'<hr>'+routeResults(q):'');
            // Phase 4B: on-device inference never leaves the browser and calls no FTN provider at
            // all -- a synthetic envelope built here (localAI() doesn't route through IbisClient,
            // same reasoning as the Live Intelligence path above), only ever shown when the
            // decision matrix judges the TOPIC (not the capability) evidence-worthy.
            await ensureEvidence();
            mountEvidence(out,{capability:'TEXT',provider:'On-device browser AI (server-authorized: planId '+esc(canonical.executionInstruction.planId)+')',costToIbis:'ZERO_COST_TO_IBIS',confidenceBasis:'NOT_ASSESSED'},{prompt:q});
            setStatus('idle');
            scrollToEnd();
            return;
          }
          // Authorized but local execution itself failed/unavailable -- record it honestly and
          // fall through to the canonical answer already carried in this same response, never a
          // silent guess about whether local execution "should have" worked.
          recordExecutionReceipt({planId:canonical.executionInstruction.planId,executionTarget:'browser_local',provider:'browser_local_language_model',success:false,degraded:true,latencyMs:Date.now()-localStartedAt});
        }
        if(canonical&&typeof canonical.answer==='string'&&canonical.answer){
          out.innerHTML='<span class="workspace-kicker">FTN ibis canonical brain</span>'+answerHTML(canonical.answer)+'<p class="ibis-answer-meta">'+esc((canonical.providerPath&&canonical.providerPath[0])||'Governed ibis route')+(canonical.confidence?' · '+esc(canonical.confidence):'')+'</p>'+(wantsFtnRoutes(q)?'<hr>'+routeResults(q):'');
          await ensureEvidence();
          mountEvidence(out,{capability:'TEXT',provider:(canonical.providerPath&&canonical.providerPath[0])||'FTN ibis canonical brain',sourceRetrievedAt:canonical.generatedAt,confidenceBasis:canonical.confidence||'NOT_ASSESSED'},{prompt:q,limitations:canonical.confidenceBasis});
          setStatus('idle');
          revealAnswer(out);
          return;
        }
        // canonical_query was entirely unreachable (network down, malformed response, etc.) --
        // never invent a decision about local execution on this failure. Fall through to the
        // existing serverAI() path (FTN.IbisRuntime.ask() -> degradedTextFallback() -> bare TEXT),
        // itself already a real, tested, non-fabricating chain.
        var server=await serverAI(q);
        if(server.available){
          out.innerHTML='<span class="workspace-kicker">FTN ibis</span>'+answerHTML(server.answer)+answerMeta(server)+(wantsFtnRoutes(q)?'<hr>'+routeResults(q):'');
          await ensureEvidence();
          mountEvidence(out,server.provenance||{capability:'TEXT',provider:server.providerId,model:server.model,sourceRetrievedAt:server.generatedAt,confidenceBasis:server.confidence||'NOT_ASSESSED'},{prompt:q,limitations:server.uncertainty});
        }else{
          out.innerHTML='<span class="workspace-kicker">FTN deterministic router</span><p>'+esc(server.reason)+'</p><p>No server answer was claimed. Your deterministic FTN routes remain available.</p>'+routeResults(q);
        }
        setStatus('idle');
        revealAnswer(out);
      });

      input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
    }});}
  document.addEventListener('DOMContentLoaded',init);
})(window);
