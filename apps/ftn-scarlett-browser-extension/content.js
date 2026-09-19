(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT__) return;

  const STYLE_ID='ftn-scarlett-v1-style';
  const PANEL_ID='ftn-scarlett-v1-panel';
  const CONTROL_ID='ftn-scarlett-v1-control';
  const root=document.documentElement;
  let state={mode:'ORIGINAL',lastScarlettMode:'ASSIST',model:null,ledger:[],panel:null,control:null,intent:'',a11y:null,headspaceButton:null};

  const page=()=>globalThis.__FTN_SCARLETT_PAGE__;
  const policy=()=>globalThis.__FTN_SCARLETT_POLICY__;

  // Transformation ledger: every mutation Scarlett makes to the host page is recorded here before
  // it is applied, with enough metadata (operationId, operationType, reason, timestamp, previous
  // state) to explain and fully reverse it. restoreLedger() (called by Original and by every mode
  // switch, since each switch rebuilds from a clean slate) walks it in reverse so nothing is left
  // behind -- this is the mechanism that makes "Original restores exact" true rather than aspirational.
  let opCounter=0;
  function nextOperationId(){ opCounter+=1; return 'sc-op-'+Date.now().toString(36)+'-'+opCounter; }
  function rememberAttr(el,name,meta){
    if(!el || state.ledger.some(x=>x.el===el&&x.name===name)) return;
    state.ledger.push({
      operationId:nextOperationId(),
      el,name,
      operationType:meta?.operationType||'attribute-change',
      reason:meta?.reason||'PRESENTATION_ADJUSTMENT',
      source:'SCARLETT',
      reversible:true,
      timestamp:new Date().toISOString(),
      had:el.hasAttribute(name),
      previousState:el.getAttribute(name),
      newState:null
    });
  }
  function setAttr(el,name,value,meta){
    rememberAttr(el,name,meta);
    el.setAttribute(name,value);
    const row=state.ledger.find(x=>x.el===el&&x.name===name);
    if(row) row.newState=value;
  }
  function unsetAttr(el,name,meta){
    rememberAttr(el,name,meta);
    el.removeAttribute(name);
    const row=state.ledger.find(x=>x.el===el&&x.name===name);
    if(row) row.newState=null;
  }
  function restoreLedger(){
    for(const row of state.ledger.reverse()){
      if(!row.el?.isConnected) continue;
      if(row.had) row.el.setAttribute(row.name,row.previousState ?? '');
      else row.el.removeAttribute(row.name);
    }
    state.ledger=[];
  }

  function ensureStyle(model){
    let style=document.getElementById(STYLE_ID);
    if(style) return style;
    style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html[data-ftn-scarlett-mode="ADAPT"] main article,
      html[data-ftn-scarlett-mode="ADAPT"] article,
      html[data-ftn-scarlett-mode="ADAPT"] main [role="main"]{
        line-height:1.62 !important;
      }
      html[data-ftn-scarlett-mode="ADAPT"] [data-ftn-scarlett-reading]{
        max-width:min(76ch, calc(100vw - 48px)) !important;
        margin-inline:auto !important;
      }
      html[data-ftn-scarlett-mode="ADAPT"] [data-ftn-scarlett-deprioritize]{
        opacity:.38 !important;
        filter:saturate(.72) !important;
        transition:opacity .18s ease, filter .18s ease !important;
      }
      html[data-ftn-scarlett-mode="ADAPT"] [data-ftn-scarlett-deprioritize]:hover,
      html[data-ftn-scarlett-mode="ADAPT"] [data-ftn-scarlett-deprioritize]:focus-within{
        opacity:1 !important;
        filter:none !important;
      }
      html[data-ftn-scarlett-mode="ASSIST"] :focus-visible,
      html[data-ftn-scarlett-mode="ADAPT"] :focus-visible{
        outline:3px solid #ef3340 !important;
        outline-offset:3px !important;
      }
      html[data-ftn-scarlett-a11y~="text-lg"] :where(main,article,[role="main"],p,li,label,button,input,textarea,h1,h2,h3){
        font-size:1.14em !important;
      }
      html[data-ftn-scarlett-a11y~="spacing-lg"] :where(main,article,[role="main"]) :where(p,li){
        line-height:1.85 !important;
        margin-bottom:1.1em !important;
      }
      html[data-ftn-scarlett-a11y~="spacing-lg"] :where(button,a,input,select,[role="button"]){
        min-height:44px !important;
        padding-block:.5em !important;
      }
      html[data-ftn-scarlett-a11y~="focus-strong"] :focus-visible{
        outline:4px solid #ef3340 !important;
        outline-offset:4px !important;
      }
      #${PANEL_ID}{
        --sc-site-accent:${model?.site?.accent || '#6f7680'};
        position:fixed;right:18px;top:72px;z-index:2147483000;width:min(360px,calc(100vw - 36px));
        max-height:min(72vh,720px);overflow:auto;background:rgba(10,10,12,.96);color:#f6f6f7;
        border:1px solid rgba(255,255,255,.14);border-left:3px solid #ef3340;border-radius:18px;
        box-shadow:0 24px 70px rgba(0,0,0,.3);font:14px/1.45 Inter,system-ui,sans-serif;
        backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      }
      #${PANEL_ID} *{box-sizing:border-box}
      #${PANEL_ID} .sc-h{display:flex;gap:10px;align-items:center;padding:14px 14px 10px}
      #${PANEL_ID} .sc-dot{width:10px;height:10px;border-radius:50%;background:#ef3340;box-shadow:0 0 0 4px rgba(239,51,64,.14)}
      #${PANEL_ID} .sc-title{font-weight:780;letter-spacing:.01em}
      #${PANEL_ID} .sc-mode{margin-left:auto;color:#bfc1c6;font-size:12px}
      #${PANEL_ID} .sc-body{padding:0 14px 14px}
      #${PANEL_ID} .sc-kicker{color:#a9abb1;font-size:12px;text-transform:uppercase;letter-spacing:.12em}
      #${PANEL_ID} h2{font:700 20px/1.15 Inter,system-ui,sans-serif;margin:7px 0 9px;color:#fff}
      #${PANEL_ID} p{margin:0 0 10px;color:#c8cad0}
      #${PANEL_ID} .sc-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      #${PANEL_ID} button{border:1px solid rgba(255,255,255,.16);background:#17171a;color:#fff;border-radius:999px;padding:9px 12px;cursor:pointer;font:inherit}
      #${PANEL_ID} button[data-primary]{border-color:#ef3340;background:#ef3340;color:#fff}
      #${PANEL_ID} button:hover{border-color:var(--sc-site-accent)}
      #${PANEL_ID} button[aria-pressed="true"]{background:#2a2a30;border-color:#8f9096}
      #${PANEL_ID} .sc-note{font-size:12px;color:#999ca3;margin-top:10px}
      #${PANEL_ID} .sc-facts{font-size:12px;color:#b7b9be;margin:0 0 10px;line-height:1.5}
      #${PANEL_ID} .sc-section{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1)}
      #${PANEL_ID} .sc-label{display:block;font-size:12px;color:#a9abb1;margin-bottom:6px}
      #${PANEL_ID} input[type="text"]{width:100%;border:1px solid rgba(255,255,255,.18);background:#151517;color:#fff;border-radius:10px;padding:8px 10px;font:inherit}
      #${CONTROL_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483001;display:flex;align-items:center;
        background:#0b0b0d;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:999px;
        box-shadow:0 14px 40px rgba(0,0,0,.28);font:13px/1 Inter,system-ui,sans-serif;overflow:hidden}
      #${CONTROL_ID} button{border:0;background:transparent;color:inherit;padding:11px 13px;cursor:pointer;font:inherit}
      #${CONTROL_ID} .sc-toggle{border-left:3px solid #ef3340;font-weight:730}
      #${CONTROL_ID} .sc-menu{border-left:1px solid rgba(255,255,255,.12);color:#bbb}
      #${CONTROL_ID}[data-expanded="true"] .sc-options{display:flex}
      #${CONTROL_ID} .sc-options{display:none;border-left:1px solid rgba(255,255,255,.12)}
      #${CONTROL_ID} .sc-options button[aria-pressed="true"]{background:#ef3340;color:#fff}
      @media(max-width:720px){#${PANEL_ID}{left:12px;right:12px;top:auto;bottom:68px;width:auto;max-height:58vh}#${CONTROL_ID}{right:12px;bottom:12px}}
      @media(prefers-reduced-motion:reduce){#${PANEL_ID} *,#${CONTROL_ID} *,html[data-ftn-scarlett-mode] *{scroll-behavior:auto!important;transition-duration:.01ms!important}}
    `;
    document.documentElement.appendChild(style);
    return style;
  }

  // Local-only accessibility preferences. Truthful and narrow: Scarlett reports exactly what it
  // changed (a data-attribute flag set -> a specific CSS rule above), never a blanket compliance
  // claim. Stored in chrome.storage.local (per-browser-profile, never sent anywhere) so a returning
  // user's preference persists across pages without a server-side personalization service.
  const A11Y_KEY='scarlettA11yPrefs';
  async function loadA11yPrefs(){
    const defaults={textScale:'normal',spacing:'normal',focus:'normal'};
    try{
      const stored=await chrome.storage.local.get(A11Y_KEY);
      return Object.assign({},defaults,stored?.[A11Y_KEY]||{});
    }catch{ return defaults; }
  }
  async function saveA11yPrefs(prefs){
    try{ await chrome.storage.local.set({[A11Y_KEY]:prefs}); }catch{ /* local storage unavailable: preference just won't persist */ }
  }
  function applyA11y(prefs){
    const flags=[];
    if(prefs.textScale==='large') flags.push('text-lg');
    if(prefs.spacing==='relaxed') flags.push('spacing-lg');
    if(prefs.focus==='strong') flags.push('focus-strong');
    const meta={operationType:'accessibility-adjustment',reason:'USER_ACCESSIBILITY_PREFERENCE'};
    // Explicit unset (not just "don't set") when every toggle is off, so a mid-session toggle-all-
    // off doesn't leave a stale attribute value from an earlier applyA11y call in the same render.
    if(flags.length) setAttr(root,'data-ftn-scarlett-a11y',flags.join(' '),meta);
    else unsetAttr(root,'data-ftn-scarlett-a11y',meta);
  }

  function safeSummary(model){
    const risk=model?.risk?.level === 'HIGH';
    if(risk) return 'Sensitive surface detected. Scarlett is keeping the original workflow intact and limiting itself to assistance.';
    if(model?.app) return model.app.label + ' detected. Scarlett is preserving native editing and familiar controls.';
    if(model?.pageType==='ARTICLE') return 'Reading-oriented page detected. Scarlett can improve hierarchy and reduce peripheral noise.';
    if(model?.pageType==='LISTING') return 'Listing or product page detected. Scarlett can foreground decision-relevant information without changing source facts.';
    if(model?.pageType==='FORM_SERVICE') return 'Form or service page detected. Scarlett can clarify hierarchy while preserving the original form and submission controls.';
    return 'Scarlett is using the least invasive intervention that improves clarity on this page.';
  }

  function decisionFacts(model){
    const facts=[];
    const prices=model?.commerce?.pricing||[];
    if(prices.length) facts.push('Price mentioned: '+prices.slice(0,2).join(', '));
    if(model?.deadlines?.length) facts.push('Deadline language found: '+model.deadlines[0]);
    if(model?.eligibilitySignal) facts.push('Eligibility/requirements language detected.');
    if(model?.downloads?.length) facts.push(model.downloads.length+' downloadable document'+(model.downloads.length===1?'':'s')+' found.');
    return facts;
  }

  // Conservative, deterministic heuristic for when "Open in Headspace" is worth showing at all --
  // per the product boundary, Scarlett never embeds Headspace, it only offers the escalation when
  // the task looks like it has outgrown a single-page assist (decision-relevant facts on a listing
  // or service page, or the user's own stated intent names a multi-factor decision).
  function isComplexEscalationCandidate(model,intentText){
    if(!model) return false;
    const t=String(intentText||'').toLowerCase();
    const intentComplex=/compare|decide|due diligence|financing|mortgage|grant|contract|acquisition|multiple sources|research/.test(t);
    const pageComplex=model.pageType==='LISTING'||model.pageType==='FORM_SERVICE';
    const hasDecisionFacts=(model.commerce?.pricing?.length>0)||(model.deadlines?.length>0)||!!model.eligibilitySignal;
    return intentComplex || (pageComplex && hasDecisionFacts);
  }

  function buildPanel(model,mode,reason,a11yPrefs){
    document.getElementById(PANEL_ID)?.remove();
    const panel=document.createElement('aside');
    panel.id=PANEL_ID;
    panel.setAttribute('aria-label','Scarlett assistance');
    const h=document.createElement('div');h.className='sc-h';
    const dot=document.createElement('span');dot.className='sc-dot';
    const title=document.createElement('span');title.className='sc-title';title.textContent='Scarlett';
    const modeLabel=document.createElement('span');modeLabel.className='sc-mode';modeLabel.textContent=mode;
    h.append(dot,title,modeLabel);
    const body=document.createElement('div');body.className='sc-body';
    const kicker=document.createElement('div');kicker.className='sc-kicker';
    kicker.textContent=(model?.app?.label || model?.pageType || 'Page') + (model?.risk?.level==='HIGH'?' · sensitive':'');
    const heading=document.createElement('h2');heading.textContent=model?.content?.title || document.title || 'Current page';
    const copy=document.createElement('p');copy.textContent=safeSummary(model);

    const facts=decisionFacts(model);
    let factsEl=null;
    if(facts.length){
      factsEl=document.createElement('p');
      factsEl.className='sc-facts';
      factsEl.textContent=facts.join(' · ');
    }

    const row=document.createElement('div');row.className='sc-row';
    const ask=document.createElement('button');ask.type='button';ask.dataset.primary='';ask.textContent='Ask ibis about this page';
    ask.addEventListener('click',()=>prepareIbisHandoff(model,{escalation:'IBIS'}));
    const original=document.createElement('button');original.type='button';original.textContent='Original';
    original.addEventListener('click',()=>applyMode('ORIGINAL'));
    row.append(ask,original);
    if(model?.selection){
      const selected=document.createElement('button');selected.type='button';selected.textContent='Use selected text';
      selected.addEventListener('click',()=>prepareIbisHandoff(model,{selectionOnly:true,escalation:'IBIS'}));
      row.insertBefore(selected,original);
    }
    const headspace=document.createElement('button');headspace.type='button';headspace.textContent='Open in Headspace';
    headspace.title='Leaves lightweight Scarlett assistance and opens the full FTN ibis Headspace workspace for multi-step work.';
    headspace.hidden=!isComplexEscalationCandidate(model,state.intent);
    headspace.addEventListener('click',()=>prepareIbisHandoff(model,{escalation:'HEADSPACE'}));
    row.appendChild(headspace);
    state.headspaceButton=headspace;

    const note=document.createElement('div');note.className='sc-note';
    note.textContent=reason==='SENSITIVE_SURFACE_ASSIST_ONLY'
      ? 'Adapt was reduced to Assist because this page contains sensitive controls or content.'
      : reason==='COMPLEX_APP_MUSCLE_MEMORY'
        ? 'Complex app detected: Scarlett is preserving the native workspace.'
        : 'Page analysis stays local until you deliberately hand context to ibis.';

    // Intent section: optional, compact, single field -- not a conversational subsystem. It only
    // ever influences (a) the Headspace escalation visibility above and (b) what is shown to the
    // user before an explicit ibis/Headspace handoff. It never changes Original/Assist/Adapt mode
    // selection, which stays deterministic and page/risk-driven per the transformation policy.
    const intentSection=document.createElement('div');intentSection.className='sc-section';
    const intentLabel=document.createElement('label');intentLabel.className='sc-label';intentLabel.textContent='What are you trying to do? (optional)';intentLabel.htmlFor='ftn-scarlett-intent-input';
    const intentInput=document.createElement('input');intentInput.type='text';intentInput.id='ftn-scarlett-intent-input';intentInput.placeholder='e.g. decide whether to apply, compare options…';
    intentInput.value=state.intent||'';
    intentInput.addEventListener('input',()=>{
      state.intent=intentInput.value.slice(0,220);
      if(state.headspaceButton) state.headspaceButton.hidden=!isComplexEscalationCandidate(model,state.intent);
    });
    intentSection.append(intentLabel,intentInput);

    // Accessibility section: three narrow, truthfully-labelled, reversible toggles. Persisted
    // locally (see loadA11yPrefs/saveA11yPrefs); never described as WCAG compliance.
    const a11ySection=document.createElement('div');a11ySection.className='sc-section';
    const a11yLabel=document.createElement('span');a11yLabel.className='sc-label';a11yLabel.textContent='Accessibility';
    const a11yRow=document.createElement('div');a11yRow.className='sc-row';
    const toggles=[
      {key:'textScale',on:'large',off:'normal',label:'Larger text'},
      {key:'spacing',on:'relaxed',off:'normal',label:'More spacing'},
      {key:'focus',on:'strong',off:'normal',label:'Stronger focus'}
    ];
    for(const t of toggles){
      const b=document.createElement('button');b.type='button';b.textContent=t.label;
      b.setAttribute('aria-pressed',String(a11yPrefs?.[t.key]===t.on));
      b.addEventListener('click',async()=>{
        // Read "is this currently on" fresh from state.a11y at click time, not from a value
        // captured once when the panel was built -- a stale capture here silently broke repeated
        // toggling (confirmed live: clicking "Larger text" twice left it on instead of turning it
        // back off, because every click re-decided direction from the same original snapshot).
        const isActive=state.a11y?.[t.key]===t.on;
        const next=Object.assign({},state.a11y);
        next[t.key]=isActive?t.off:t.on;
        state.a11y=next;
        await saveA11yPrefs(next);
        applyA11y(next);
        b.setAttribute('aria-pressed',String(next[t.key]===t.on));
      });
      a11yRow.appendChild(b);
    }
    a11ySection.append(a11yLabel,a11yRow);

    body.append(kicker,heading,copy);
    if(factsEl) body.appendChild(factsEl);
    body.append(row,note,intentSection,a11ySection);
    panel.append(h,body);
    document.body.appendChild(panel);
    state.panel=panel;
  }

  function buildControl(){
    document.getElementById(CONTROL_ID)?.remove();
    const c=document.createElement('div');c.id=CONTROL_ID;c.dataset.expanded='false';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='sc-toggle';
    toggle.textContent=state.mode==='ORIGINAL'?'Original ⇄ Scarlett':'Scarlett ⇄ Original';
    toggle.addEventListener('click',()=>applyMode(state.mode==='ORIGINAL'?state.lastScarlettMode:'ORIGINAL'));
    const menu=document.createElement('button');menu.type='button';menu.className='sc-menu';menu.textContent='⋯';menu.setAttribute('aria-label','Scarlett modes');
    menu.addEventListener('click',()=>{c.dataset.expanded=c.dataset.expanded==='true'?'false':'true';});
    const opts=document.createElement('span');opts.className='sc-options';
    for(const mode of ['ASSIST','ADAPT']){
      const b=document.createElement('button');b.type='button';b.textContent=mode[0]+mode.slice(1).toLowerCase();b.setAttribute('aria-pressed',String(state.mode===mode));
      b.addEventListener('click',()=>applyMode(mode));
      opts.appendChild(b);
    }
    c.append(toggle,opts,menu);
    document.body.appendChild(c);
    state.control=c;
  }

  function markAdapt(model){
    const main=document.querySelector('article,main,[role="main"]');
    if(main) setAttr(main,'data-ftn-scarlett-reading','',{operationType:'readability-constraint',reason:'IMPROVE_READING_WIDTH'});
    for(const el of model?._clutterNodes || []){
      if(el.closest('nav,header,main,article,form,[role="dialog"]')) continue;
      setAttr(el,'data-ftn-scarlett-deprioritize','',{operationType:'de-emphasize',reason:'REDUCE_PERIPHERAL_CLUTTER'});
    }
  }

  function clearPresentation(){
    restoreLedger();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(CONTROL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    root.removeAttribute('data-ftn-scarlett-mode');
    root.removeAttribute('data-ftn-scarlett-a11y');
    state.panel=null;state.control=null;
  }

  async function applyMode(requested){
    // clearPresentation() must run BEFORE analyze(): otherwise analyze() scans a DOM that still
    // contains the previous mode's own panel/control, and Scarlett's own button labels and panel
    // copy leak into the page model (observed live during QA: the panel's "Larger text" button and
    // a stray "Deadline language found: ..." string from the panel's own copy were picked up as if
    // they were page content). clearPresentation() only removes ledger-tracked attributes and
    // Scarlett's own DOM nodes, so it never depends on the model -- safe to run first.
    clearPresentation();
    const model=page().analyze();
    const resolved=policy().resolve(model,requested);
    state.model=model;
    state.mode=resolved.effectiveMode;
    const policySummary={
      requestedMode:resolved.requestedMode,
      effectiveMode:resolved.effectiveMode,
      reason:resolved.reason,
      riskLevel:resolved.riskLevel,
      preservedRegions:resolved.preservedRegions,
      allowedOperations:resolved.allowedOperations,
      blockedOperations:resolved.blockedOperations
    };
    if(resolved.effectiveMode==='ORIGINAL'){
      state.mode='ORIGINAL';
      return {mode:'ORIGINAL',reason:resolved.reason,policy:policySummary,model:safeModel(model)};
    }
    state.lastScarlettMode=resolved.effectiveMode;
    ensureStyle(model);
    setAttr(root,'data-ftn-scarlett-mode',resolved.effectiveMode,{operationType:'mode-change',reason:resolved.reason});
    if(resolved.effectiveMode==='ADAPT') markAdapt(model);
    const a11yPrefs=await loadA11yPrefs();
    state.a11y=a11yPrefs;
    applyA11y(a11yPrefs);
    buildPanel(model,resolved.effectiveMode,resolved.reason,a11yPrefs);
    buildControl();
    return {mode:resolved.effectiveMode,reason:resolved.reason,policy:policySummary,model:safeModel(model)};
  }

  function safeModel(model){
    return {
      version:model.version,pageType:model.pageType,app:model.app,risk:model.risk,site:model.site,
      regions:model.regions,actions:model.actions,content:model.content,reducedMotion:model.reducedMotion,capturedAt:model.capturedAt,
      commerce:model.commerce,deadlines:model.deadlines,eligibilitySignal:model.eligibilitySignal,downloads:model.downloads,
      warnings:model.warnings,accessibility:model.accessibility,focus:model.focus,potentialClutterCount:model.potentialClutterCount,
      selectionPresent:!!model.selection
    };
  }

  async function prepareIbisHandoff(model,options={}){
    const selectionOnly=!!options.selectionOnly;
    const escalation=options.escalation==='HEADSPACE' ? 'HEADSPACE' : 'IBIS';
    const context={
      source:'SCARLETT',
      version:'SCARLETT_HANDOFF_V1',
      escalation,
      sourceUrl:location.href.slice(0,1800),
      sourceTitle:(document.title||'').slice(0,220),
      pageType:model.pageType,
      app:model.app?.id || null,
      riskLevel:model.risk?.level || 'NORMAL',
      userIntent:(state.intent||'').slice(0,220),
      selectedText:selectionOnly ? (model.selection||'').slice(0,4000) : (model.selection||'').slice(0,1800),
      visibleContext:selectionOnly ? '' : [model.content?.title,model.content?.description,...(model.content?.headings||[])].filter(Boolean).join('\n').slice(0,5000),
      createdAt:new Date().toISOString()
    };
    await chrome.storage.session.set({scarlettIbisHandoff:context});
    chrome.runtime.sendMessage({type:'SCARLETT_OPEN_IBIS',escalation});
  }

  chrome.runtime.onMessage.addListener((message,_sender,send)=>{
    try{
      if(message?.type==='SCARLETT_ANALYZE'){
        const model=page().analyze();state.model=model;
        send({ok:true,model:safeModel(model),defaultMode:policy().defaultMode(model),mode:state.mode});
      }else if(message?.type==='SCARLETT_MODE'){
        Promise.resolve(applyMode(message.mode)).then(result=>send({ok:true,...result}));return true;
      }else if(message?.type==='SCARLETT_STATE'){
        send({ok:true,mode:state.mode,lastScarlettMode:state.lastScarlettMode,intent:state.intent,model:state.model?safeModel(state.model):null});
      }else return false;
    }catch(error){send({ok:false,error:error?.message||String(error)});}
    return true;
  });

  globalThis.__FTN_SCARLETT__={applyMode,analyze:()=>safeModel(page().analyze()),restore:()=>applyMode('ORIGINAL')};
})();
