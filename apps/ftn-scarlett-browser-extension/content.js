(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT__) return;

  const STYLE_ID='ftn-scarlett-v1-style';
  const PANEL_ID='ftn-scarlett-v1-panel';
  const CONTROL_ID='ftn-scarlett-v1-control';
  const DECK_ID='ftn-scarlett-v1-deck';
  const COMPARE_ID='ftn-scarlett-v1-compare';
  const SCAN_ID='ftn-scarlett-v1-scan';
  const root=document.documentElement;
  let state={mode:'ORIGINAL',lastScarlettMode:'ASSIST',model:null,ledger:[],panel:null,control:null,intent:'',a11y:null,headspaceButton:null,blendLevel:0,deckContainer:null,compareOverlay:null};

  const page=()=>globalThis.__FTN_SCARLETT_PAGE__;
  const policy=()=>globalThis.__FTN_SCARLETT_POLICY__;
  const representation=()=>globalThis.__FTN_SCARLETT_REPRESENTATION__;
  const deck=()=>globalThis.__FTN_SCARLETT_DECK__;
  const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Local-only, best-effort product analytics (see analytics.js). Never blocks the feature it's
  // attached to -- fire-and-forget, swallow any error.
  function track(name,props){ try{ globalThis.FTN_SCARLETT_ANALYTICS?.logEvent(name,props); }catch{} }

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
      html[data-ftn-scarlett-mode="ADAPT"] [data-ftn-scarlett-deprioritize],
      html[data-ftn-scarlett-mode="TRANSFORM"] [data-ftn-scarlett-deprioritize]{
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
      html[data-ftn-scarlett-mode="ADAPT"] :focus-visible,
      html[data-ftn-scarlett-mode="TRANSFORM"] :focus-visible{
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
      /* Transform: the original grounded region is hidden (never removed -- restoreLedger()
         un-hides it), the deck container takes its place visually. */
      [data-ftn-scarlett-hidden]{ display:none !important; }
      #${DECK_ID}{
        max-width:min(920px, calc(100vw - 48px));margin:24px auto;padding:20px;border-radius:20px;
        background:#0b0b0d;color:#f2f2f3;border:1px solid rgba(255,255,255,.12);
        font:15px/1.55 Inter,system-ui,sans-serif;
      }
      #${DECK_ID} .sc-deck-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
      #${DECK_ID} .sc-deck-tab{border:1px solid rgba(255,255,255,.16);background:#17171a;color:#cfd0d4;border-radius:999px;padding:8px 14px;font:inherit;cursor:pointer}
      #${DECK_ID} .sc-deck-tab[aria-selected="true"]{background:#ef3340;border-color:#ef3340;color:#fff}
      #${DECK_ID} .sc-deck-card__title{font:700 13px/1 Inter,system-ui,sans-serif;letter-spacing:.1em;color:#a9abb1;margin:0 0 10px}
      #${DECK_ID} .sc-deck-facts{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0}
      #${DECK_ID} .sc-deck-facts dt{color:#9a9ca2;font-size:13px}
      #${DECK_ID} .sc-deck-facts dd{margin:0;color:#f2f2f3}
      #${DECK_ID} .sc-deck-links{list-style:none;padding:0;margin:0;display:grid;gap:6px}
      #${DECK_ID} .sc-deck-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${DECK_ID} .sc-deck-actions button{opacity:.55;border:1px dashed rgba(255,255,255,.22);background:transparent;color:#cfd0d4;border-radius:10px;padding:8px 12px;font:inherit}
      #${DECK_ID} .sc-deck-empty{color:#7d7f85;font-style:italic}
      #${DECK_ID} .sc-deck-footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1)}
      #${DECK_ID} .sc-deck-footer__btn{border:1px solid #ef3340;background:#ef3340;color:#fff;border-radius:999px;padding:9px 14px;font:inherit;cursor:pointer}
      #${DECK_ID} .sc-deck-confidence{margin-top:10px;font-size:12px;color:#7d7f85}
      /* Signature transformation moment: a brief computational scan sweeps once, then is removed.
         Motion explains structure (a pass happened) rather than decorating -- ~420ms default,
         collapsed to near-zero for prefers-reduced-motion below. */
      #${SCAN_ID}{position:fixed;inset:0;z-index:2147483646;pointer-events:none;
        background:linear-gradient(100deg, transparent 42%, rgba(239,51,64,.16) 50%, transparent 58%);
        background-size:250% 100%;background-position:150% 0;
        animation:ftn-scarlett-scan 460ms cubic-bezier(.2,.7,.3,1) 1;
      }
      @keyframes ftn-scarlett-scan{ from{background-position:150% 0;opacity:1} to{background-position:-50% 0;opacity:0} }
      #${COMPARE_ID}{position:fixed;inset:0;z-index:2147483002;pointer-events:none}
      #${COMPARE_ID} img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
      #${COMPARE_ID} .sc-reveal-handle{position:absolute;top:0;bottom:0;width:3px;background:#ef3340;pointer-events:auto;cursor:ew-resize;box-shadow:0 0 0 100vmax rgba(0,0,0,0)}
      #${COMPARE_ID} .sc-reveal-handle::after{content:'⇄';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:34px;height:34px;background:#ef3340;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px}
      #${COMPARE_ID} .sc-reveal-label{position:absolute;top:14px;padding:6px 12px;border-radius:999px;background:rgba(11,11,13,.85);color:#fff;font:12px/1 Inter,system-ui,sans-serif;pointer-events:none}
      #${COMPARE_ID} .sc-reveal-label--original{left:14px}
      #${COMPARE_ID} .sc-reveal-label--scarlett{right:14px}
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
      #${PANEL_ID} input[type="range"]{width:100%}
      #${PANEL_ID} .sc-blend-stops{display:flex;justify-content:space-between;font-size:10px;color:#7d7f85;margin-top:4px}
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
      @media(prefers-reduced-motion:reduce){
        #${PANEL_ID} *,#${CONTROL_ID} *,html[data-ftn-scarlett-mode] *{scroll-behavior:auto!important;transition-duration:.01ms!important}
        #${SCAN_ID}{animation-duration:1ms!important}
      }
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
    if(flags.length) setAttr(root,'data-ftn-scarlett-a11y',flags.join(' '),meta);
    else unsetAttr(root,'data-ftn-scarlett-a11y',meta);
  }

  // Signature transformation moment (product definition: "a live computational layer understands
  // the page and reconfigures it"). A single sweep, ~460ms, explains that a pass happened rather
  // than decorating. Reduced-motion users get the same DOM outcome with a near-instant transition
  // via the CSS override above -- this function still runs, it just finishes immediately.
  function runScanAnimation(){
    return new Promise((resolve)=>{
      document.getElementById(SCAN_ID)?.remove();
      const sweep=document.createElement('div');
      sweep.id=SCAN_ID;
      document.body.appendChild(sweep);
      const duration=reducedMotion()?1:460;
      setTimeout(()=>{ sweep.remove(); resolve(); },duration);
    });
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

  function isComplexEscalationCandidate(model,intentText){
    if(!model) return false;
    const t=String(intentText||'').toLowerCase();
    const intentComplex=/compare|decide|due diligence|financing|mortgage|grant|contract|acquisition|multiple sources|research/.test(t);
    const pageComplex=model.pageType==='LISTING'||model.pageType==='FORM_SERVICE';
    const hasDecisionFacts=(model.commerce?.pricing?.length>0)||(model.deadlines?.length>0)||!!model.eligibilitySignal;
    return intentComplex || (pageComplex && hasDecisionFacts);
  }

  function buildPanel(model,mode,reason,a11yPrefs,extra={}){
    document.getElementById(PANEL_ID)?.remove();
    const panel=document.createElement('aside');
    panel.id=PANEL_ID;
    panel.setAttribute('aria-label','Scarlett assistance');
    const h=document.createElement('div');h.className='sc-h';
    const dot=document.createElement('span');dot.className='sc-dot';
    const title=document.createElement('span');title.className='sc-title';title.textContent='Scarlett';
    const modeLabel=document.createElement('span');modeLabel.className='sc-mode';modeLabel.textContent=mode==='BLEND'?('BLEND '+state.blendLevel+'%'):mode;
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
    if(!extra.transformFellBack && model?.pageType && representation()?.PAGE_TYPES_SUPPORTED?.includes(model.pageType) && !model?.app && model?.risk?.level!=='HIGH' && mode!=='TRANSFORM'){
      const transform=document.createElement('button');transform.type='button';transform.textContent='Transform';
      transform.title='Rebuild this page as a task-focused deck grounded in what is actually on the page.';
      transform.addEventListener('click',()=>applyMode('TRANSFORM'));
      row.appendChild(transform);
    }
    if(mode!=='COMPARE' && mode!=='ORIGINAL'){
      const compare=document.createElement('button');compare.type='button';compare.textContent='Compare';
      compare.title='Reveal Original alongside the current Scarlett presentation.';
      compare.addEventListener('click',()=>applyMode('COMPARE'));
      row.appendChild(compare);
    }
    const headspace=document.createElement('button');headspace.type='button';headspace.textContent='Open in Headspace';
    headspace.title='Leaves lightweight Scarlett assistance and opens the full FTN ibis Headspace workspace for multi-step work.';
    headspace.hidden=!isComplexEscalationCandidate(model,state.intent);
    headspace.addEventListener('click',()=>prepareIbisHandoff(model,{escalation:'HEADSPACE'}));
    row.appendChild(headspace);
    state.headspaceButton=headspace;
    const faucetToggle=document.createElement('button');faucetToggle.type='button';faucetToggle.textContent='Data Faucet';
    faucetToggle.title='See which third parties this page talks to.';
    faucetToggle.addEventListener('click',()=>toggleFaucetSection(faucetSection));
    row.appendChild(faucetToggle);

    const note=document.createElement('div');note.className='sc-note';
    note.textContent=extra.compareCaptureFailed
      ? 'Compare could not capture a before view this time (the browser only allows this right after opening the Scarlett popup). Showing the Scarlett presentation only -- try opening the popup again, then Compare.'
      : reason==='SENSITIVE_SURFACE_ASSIST_ONLY'
        ? 'Adapt was reduced to Assist because this page contains sensitive controls or content.'
        : reason==='COMPLEX_APP_MUSCLE_MEMORY'
          ? 'Complex app detected: Scarlett is preserving the native workspace.'
          : reason==='NO_GROUNDED_REPRESENTATION_FALLBACK_ADAPT'
            ? 'Transform needs more decision-relevant structure than this page offers, so Scarlett used Adapt instead.'
            : 'Page analysis stays local until you deliberately hand context to ibis.';

    const intentSection=document.createElement('div');intentSection.className='sc-section';
    const intentLabel=document.createElement('label');intentLabel.className='sc-label';intentLabel.textContent='What are you trying to do? (optional)';intentLabel.htmlFor='ftn-scarlett-intent-input';
    const intentInput=document.createElement('input');intentInput.type='text';intentInput.id='ftn-scarlett-intent-input';intentInput.placeholder='e.g. decide whether to apply, compare options…';
    intentInput.value=state.intent||'';
    intentInput.addEventListener('input',()=>{
      state.intent=intentInput.value.slice(0,220);
      if(state.headspaceButton) state.headspaceButton.hidden=!isComplexEscalationCandidate(model,state.intent);
    });
    intentSection.append(intentLabel,intentInput);

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

    // Blend section: a single staged slider, snapping to the six named stops. Dragging it re-runs
    // applyMode('BLEND', level) -- it is structural (each stop maps to a fixed operation set in
    // transformation-policy.js), not an opacity/CSS-filter gimmick.
    const blendSection=document.createElement('div');blendSection.className='sc-section';
    const blendLabel=document.createElement('span');blendLabel.className='sc-label';
    const cap=extra.blendMaxLevel ?? 100;
    blendLabel.textContent='Blend: '+(mode==='BLEND'?state.blendLevel:0)+'%'+(cap<100?' (capped at '+cap+'% on this surface)':'');
    const blendInput=document.createElement('input');blendInput.type='range';blendInput.min='0';blendInput.max='100';blendInput.step='20';
    blendInput.value=String(mode==='BLEND'?state.blendLevel:0);
    blendInput.addEventListener('change',()=>applyMode('BLEND',{blendLevel:Number(blendInput.value)}));
    const stops=document.createElement('div');stops.className='sc-blend-stops';
    for(const s of (policy()?.BLEND_STOPS||[])) stops.appendChild(document.createElement('span')).textContent=s.level+'%';
    blendSection.append(blendLabel,blendInput,stops);

    const faucetSection=document.createElement('div');faucetSection.className='sc-section';faucetSection.hidden=true;

    body.append(kicker,heading,copy);
    if(factsEl) body.appendChild(factsEl);
    body.append(row,note,intentSection,a11ySection,blendSection,faucetSection);
    panel.append(h,body);
    document.body.appendChild(panel);
    state.panel=panel;
  }

  // Data Faucet: lazy-loaded and collapsed by default (per Scarlett Bar's "collapse when
  // unnecessary" rule) -- populated only when the user actually opens it, from a background
  // summary of what this tab has observed. Never triggers the permission prompt itself (Chrome
  // only allows chrome.permissions.request() from a genuine user gesture inside the popup, which a
  // content script cannot reach) -- if Shield hasn't been granted yet, this points the user at the
  // popup instead of pretending to turn it on.
  async function toggleFaucetSection(section){
    section.hidden=!section.hidden;
    if(section.hidden || section.dataset.loaded==='true') return;
    section.dataset.loaded='true';
    section.replaceChildren();
    const label=document.createElement('span');label.className='sc-label';label.textContent='Data Faucet';
    const loading=document.createElement('p');loading.textContent='Checking what this page talks to…';
    section.append(label,loading);
    let summary;
    try{ summary=await chrome.runtime.sendMessage({type:'SCARLETT_FAUCET_SUMMARY'}); }
    catch(error){ loading.textContent='Data Faucet unavailable: '+(error?.message||String(error)); return; }
    section.replaceChildren(label);
    if(!summary?.ok){ section.appendChild(document.createElement('p')).textContent='Data Faucet unavailable this session.'; return; }
    if(!summary.shieldGranted){
      const p=document.createElement('p');
      p.textContent='Off. Open the Scarlett toolbar icon and turn on Data Faucet Protection to see and block third-party connections on every site.';
      section.appendChild(p);
      return;
    }
    const tally=document.createElement('p');
    tally.textContent=`${summary.totalConnections} external connection${summary.totalConnections===1?'':'s'} · ${summary.knownTrackers} known tracker${summary.knownTrackers===1?'':'s'} · ${summary.blocked} blocked · ${summary.allowed} allowed`;
    section.appendChild(tally);
    const cats=document.createElement('p');cats.className='sc-facts';
    cats.textContent=`Analytics ${summary.byCategory.ANALYTICS} · Advertising ${summary.byCategory.ADVERTISING} · Social ${summary.byCategory.SOCIAL} · Required ${summary.byCategory.FUNCTIONALLY_REQUIRED} · Unknown ${summary.byCategory.UNKNOWN}`;
    section.appendChild(cats);
    if(summary.rows?.length){
      const list=document.createElement('ul');list.className='sc-deck-links';
      for(const row of summary.rows.slice(0,12)){
        const li=document.createElement('li');
        li.textContent=`${row.hostname} — ${row.category.replace('_',' ').toLowerCase()} · ${row.status.replace('_',' ').toLowerCase()}${row.purpose?' · '+row.purpose:''}`;
        list.appendChild(li);
      }
      section.appendChild(list);
    }
    const actionRow=document.createElement('div');actionRow.className='sc-row';
    const closeBtn=document.createElement('button');closeBtn.type='button';
    closeBtn.textContent=summary.shieldEnabled?'Open the Faucet':'Close the Faucet';
    closeBtn.addEventListener('click',async()=>{
      await chrome.runtime.sendMessage({type:'SCARLETT_SHIELD_TOGGLE',enabled:!summary.shieldEnabled});
      section.dataset.loaded='false';
      toggleFaucetSection(section);
    });
    const brokenBtn=document.createElement('button');brokenBtn.type='button';brokenBtn.textContent='Site broken?';
    brokenBtn.title='Adds this site to a local exception list so Shield stops blocking anything on it.';
    brokenBtn.addEventListener('click',async()=>{
      await chrome.runtime.sendMessage({type:'SCARLETT_SHIELD_EXCEPTION_ADD',hostname:location.hostname});
      brokenBtn.textContent='Exception saved. Reload to apply.';
      brokenBtn.disabled=true;
    });
    actionRow.append(closeBtn,brokenBtn);
    section.appendChild(actionRow);
    const note=document.createElement('p');note.className='sc-note';
    note.textContent='Data Faucet reflects what Scarlett has actually observed on this tab since it loaded, from a curated, disclosed list of well-known domains -- not a claim of complete visibility into every tracker.';
    section.appendChild(note);
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
    for(const mode of ['ASSIST','ADAPT','TRANSFORM']){
      const b=document.createElement('button');b.type='button';b.textContent=mode[0]+mode.slice(1).toLowerCase();b.setAttribute('aria-pressed',String(state.mode===mode));
      b.addEventListener('click',()=>applyMode(mode));
      opts.appendChild(b);
    }
    c.append(toggle,opts,menu);
    document.body.appendChild(c);
    state.control=c;
  }

  function markAdapt(model){
    const main=model?._mainRegion || document.querySelector('article,main,[role="main"]');
    if(main) setAttr(main,'data-ftn-scarlett-reading','',{operationType:'readability-constraint',reason:'IMPROVE_READING_WIDTH'});
    for(const el of model?._clutterNodes || []){
      if(el.closest('nav,header,main,article,form,[role="dialog"]')) continue;
      setAttr(el,'data-ftn-scarlett-deprioritize','',{operationType:'de-emphasize',reason:'REDUCE_PERIPHERAL_CLUTTER'});
    }
  }

  // Transform: hides the grounded main region (ledger-tracked, never removed) and mounts a
  // Scarlett-owned deck built entirely from representation-engine.js's spec, which itself only
  // ever binds to real page-model facts. Falls back to Adapt when there isn't enough grounded
  // material for a page type the representation engine doesn't have a builder for, or when the
  // builder itself declines (returns null) -- Transform never fabricates structure to fill a deck.
  async function mountTransformDeck(model,resolved){
    const spec=representation()?.build(model,resolved);
    if(!spec){
      markAdapt(model);
      return {visualMode:'ADAPT',fellBack:true};
    }
    await runScanAnimation();
    const main=model?._mainRegion;
    if(main) setAttr(main,'data-ftn-scarlett-hidden','true',{operationType:'hide-original-region',reason:'TRANSFORM_REPRESENTATION'});
    document.getElementById(DECK_ID)?.remove();
    const container=document.createElement('div');
    container.id=DECK_ID;
    if(main?.parentNode) main.parentNode.insertBefore(container,main.nextSibling);
    else document.body.appendChild(container);
    deck()?.render(spec,container,(action)=>{
      if(action.kind==='ask-ibis') prepareIbisHandoff(model,{escalation:'IBIS'});
      else if(action.kind==='open-headspace') prepareIbisHandoff(model,{escalation:'HEADSPACE'});
    });
    // Preview-selling, not a paywall: Transform already works in full for free in this build (see
    // entitlements.js -- 'free' currently includes every capability this build implements). This
    // note only sets honest expectations about the FTN plan model after the user has already
    // gotten the value, per the product definition's explicit "sell after the value, never before"
    // rule -- it never blocks or degrades anything.
    const entitlements=globalThis.FTN_SCARLETT_ENTITLEMENTS;
    if(entitlements?.isPreviewOnly?.('scarlett.transform')){
      const planNote=document.createElement('p');
      planNote.className='sc-deck-confidence';
      planNote.textContent='This Transform is a preview of what Scarlett+ includes on every page. Currently free in this build.';
      container.appendChild(planNote);
      track('paywall_impression',{capability:'scarlett.transform'});
    }
    state.deckContainer=container;
    return {visualMode:'TRANSFORM',fellBack:false,spec};
  }

  // Concrete DOM application for a single visual mode (ASSIST/ADAPT/TRANSFORM). Shared by the
  // normal apply path, Compare's inner "base mode" and Blend's stop-to-mode mapping, so there is
  // exactly one place that decides what a given visual mode actually looks like.
  async function mountVisualMode(visualMode,model,resolved){
    ensureStyle(model);
    if(visualMode==='TRANSFORM'){
      const result=await mountTransformDeck(model,resolved);
      setAttr(root,'data-ftn-scarlett-mode',result.visualMode,{operationType:'mode-change',reason:resolved.reason});
      return result;
    }
    setAttr(root,'data-ftn-scarlett-mode',visualMode,{operationType:'mode-change',reason:resolved.reason});
    if(visualMode==='ADAPT') markAdapt(model);
    return {visualMode,fellBack:false};
  }

  function blendVisualMode(level){
    if(level<=0) return null;
    if(level<=20) return 'ASSIST'; // accessibility/focus-only stop reuses Assist's focus styling
    if(level<=40) return 'ASSIST';
    if(level<=60) return 'ADAPT';
    if(level<=80) return 'ADAPT';
    return 'TRANSFORM';
  }

  async function requestTabCapture(){
    try{ return await chrome.runtime.sendMessage({type:'SCARLETT_CAPTURE_TAB'}); }
    catch(error){ return {ok:false,error:error?.message||String(error)}; }
  }

  function buildCompareOverlay(dataUrl){
    document.getElementById(COMPARE_ID)?.remove();
    const overlay=document.createElement('div');
    overlay.id=COMPARE_ID;
    const img=document.createElement('img');
    img.src=dataUrl;
    img.alt='Original page before Scarlett (local, ephemeral capture)';
    const handle=document.createElement('div');handle.className='sc-reveal-handle';
    const originalLabel=document.createElement('span');originalLabel.className='sc-reveal-label sc-reveal-label--original';originalLabel.textContent='ORIGINAL';
    const scarlettLabel=document.createElement('span');scarlettLabel.className='sc-reveal-label sc-reveal-label--scarlett';scarlettLabel.textContent='SCARLETT';
    overlay.append(img,handle,originalLabel,scarlettLabel);
    document.body.appendChild(overlay);
    state.compareOverlay=overlay;

    let pct=50;
    function apply(){
      img.style.clipPath=`polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
      handle.style.left=`calc(${pct}% - 1.5px)`;
    }
    apply();
    let dragging=false;
    handle.addEventListener('pointerdown',(e)=>{ dragging=true; handle.setPointerCapture(e.pointerId); });
    handle.addEventListener('pointermove',(e)=>{
      if(!dragging) return;
      pct=Math.max(0,Math.min(100,(e.clientX/window.innerWidth)*100));
      apply();
    });
    handle.addEventListener('pointerup',(e)=>{ dragging=false; try{handle.releasePointerCapture(e.pointerId);}catch{} });
  }

  function clearPresentation(){
    restoreLedger();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(CONTROL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(DECK_ID)?.remove();
    document.getElementById(COMPARE_ID)?.remove();
    document.getElementById(SCAN_ID)?.remove();
    root.removeAttribute('data-ftn-scarlett-mode');
    root.removeAttribute('data-ftn-scarlett-a11y');
    state.panel=null;state.control=null;state.deckContainer=null;state.compareOverlay=null;
  }

  async function applyMode(requested,options={}){
    // clearPresentation() must run BEFORE analyze(): otherwise analyze() scans a DOM that still
    // contains the previous mode's own panel/control, and Scarlett's own button labels and panel
    // copy leak into the page model (observed live during QA: the panel's "Larger text" button and
    // a stray "Deadline language found: ..." string from the panel's own copy were picked up as if
    // they were page content). clearPresentation() only removes ledger-tracked attributes and
    // Scarlett's own DOM nodes, so it never depends on the model -- safe to run first.
    clearPresentation();
    const model=page().analyze();
    const upper=String(requested||'').toUpperCase();
    const resolved = upper==='BLEND'
      ? policy().resolveBlend(model, options.blendLevel ?? state.blendLevel ?? 100)
      : upper==='COMPARE'
        ? policy().resolveCompare(model, state.lastScarlettMode)
        : policy().resolve(model, requested);
    state.model=model;
    const policySummary={
      requestedMode:resolved.requestedMode,
      effectiveMode:resolved.effectiveMode,
      reason:resolved.reason,
      riskLevel:resolved.riskLevel,
      preservedRegions:resolved.preservedRegions,
      allowedOperations:resolved.allowedOperations,
      blockedOperations:resolved.blockedOperations,
      blendLevel:resolved.blendLevel,
      blendMaxLevel:resolved.blendMaxLevel,
      compareBaseMode:resolved.compareBaseMode
    };

    if(resolved.effectiveMode==='ORIGINAL'){
      state.mode='ORIGINAL';state.blendLevel=0;
      track('mode_applied',{mode:'ORIGINAL',pageType:model.pageType,reason:resolved.reason});
      return {mode:'ORIGINAL',reason:resolved.reason,policy:policySummary,model:safeModel(model)};
    }

    if(resolved.effectiveMode==='COMPARE'){
      const capture=await requestTabCapture();
      const baseMode=resolved.compareBaseMode==='ORIGINAL'?'ASSIST':resolved.compareBaseMode;
      const baseResolved=policy().resolve(model,baseMode);
      const mounted=await mountVisualMode(baseMode,model,baseResolved);
      const a11yPrefs=await loadA11yPrefs();state.a11y=a11yPrefs;applyA11y(a11yPrefs);
      const captureOk=!!(capture?.ok && capture?.dataUrl);
      if(captureOk) buildCompareOverlay(capture.dataUrl);
      state.mode='COMPARE';state.lastScarlettMode=mounted.visualMode;
      // Chrome only grants chrome.tabs.captureVisibleTab() when activeTab is genuinely active for
      // this tab (a real toolbar-icon click, not merely a declared permission) -- if the user
      // opened Compare long enough after opening the popup that the grant lapsed, capture can fail.
      // Rather than silently show nothing extra, say so plainly instead of pretending Compare
      // rendered a reveal view it didn't.
      buildPanel(model,'COMPARE',resolved.reason,a11yPrefs,{compareCaptureFailed:!captureOk});
      buildControl();
      track('compare_used',{pageType:model.pageType,captureOk});
      return {mode:'COMPARE',reason:resolved.reason,policy:policySummary,model:safeModel(model),captureOk};
    }

    if(resolved.effectiveMode==='BLEND'){
      state.blendLevel=resolved.blendLevel;
      const visualMode=blendVisualMode(resolved.blendLevel);
      if(!visualMode){ state.mode='ORIGINAL'; track('mode_applied',{mode:'ORIGINAL',pageType:model.pageType,reason:resolved.reason}); return {mode:'ORIGINAL',reason:resolved.reason,policy:policySummary,model:safeModel(model)}; }
      const mounted=await mountVisualMode(visualMode,model,resolved);
      const a11yPrefs=await loadA11yPrefs();state.a11y=a11yPrefs;applyA11y(a11yPrefs);
      state.mode='BLEND';state.lastScarlettMode=mounted.visualMode;
      buildPanel(model,'BLEND',resolved.reason,a11yPrefs,{blendMaxLevel:resolved.blendMaxLevel});
      buildControl();
      track('blend_used',{level:resolved.blendLevel,pageType:model.pageType});
      return {mode:'BLEND',reason:resolved.reason,policy:policySummary,model:safeModel(model)};
    }

    const mounted=await mountVisualMode(resolved.effectiveMode,model,resolved);
    state.mode=mounted.visualMode;
    state.lastScarlettMode=mounted.visualMode;
    const effectiveReason=mounted.fellBack?'NO_GROUNDED_REPRESENTATION_FALLBACK_ADAPT':resolved.reason;
    const a11yPrefs=await loadA11yPrefs();
    state.a11y=a11yPrefs;
    applyA11y(a11yPrefs);
    buildPanel(model,mounted.visualMode,effectiveReason,a11yPrefs,{transformFellBack:mounted.fellBack});
    buildControl();
    track('mode_applied',{mode:mounted.visualMode,pageType:model.pageType,reason:effectiveReason});
    if(mounted.visualMode==='TRANSFORM'&&!mounted.fellBack) track('transform_used',{pageType:model.pageType,confidence:mounted.spec?.confidence||null});
    return {mode:mounted.visualMode,reason:effectiveReason,policy:policySummary,model:safeModel(model)};
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
    track(escalation==='HEADSPACE'?'headspace_handoff':'ibis_handoff',{pageType:model.pageType,selectionOnly});
  }

  chrome.runtime.onMessage.addListener((message,_sender,send)=>{
    try{
      if(message?.type==='SCARLETT_ANALYZE'){
        const model=page().analyze();state.model=model;
        send({ok:true,model:safeModel(model),defaultMode:policy().defaultMode(model),mode:state.mode});
      }else if(message?.type==='SCARLETT_MODE'){
        Promise.resolve(applyMode(message.mode,{blendLevel:message.blendLevel})).then(result=>send({ok:true,...result}));return true;
      }else if(message?.type==='SCARLETT_STATE'){
        send({ok:true,mode:state.mode,lastScarlettMode:state.lastScarlettMode,intent:state.intent,blendLevel:state.blendLevel,model:state.model?safeModel(state.model):null});
      }else return false;
    }catch(error){send({ok:false,error:error?.message||String(error)});}
    return true;
  });

  globalThis.__FTN_SCARLETT__={applyMode,analyze:()=>safeModel(page().analyze()),restore:()=>applyMode('ORIGINAL')};
})();
