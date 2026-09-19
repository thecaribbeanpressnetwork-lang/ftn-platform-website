(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT__) return;

  const STYLE_ID='ftn-scarlett-v1-style';
  const PANEL_ID='ftn-scarlett-v1-panel';
  const CONTROL_ID='ftn-scarlett-v1-control';
  const root=document.documentElement;
  let state={mode:'ORIGINAL',lastScarlettMode:'ASSIST',model:null,ledger:[],panel:null,control:null};

  const page=()=>globalThis.__FTN_SCARLETT_PAGE__;
  const policy=()=>globalThis.__FTN_SCARLETT_POLICY__;

  function rememberAttr(el,name){
    if(!el || state.ledger.some(x=>x.el===el&&x.name===name)) return;
    state.ledger.push({el,name,had:el.hasAttribute(name),value:el.getAttribute(name)});
  }
  function setAttr(el,name,value){
    rememberAttr(el,name);
    el.setAttribute(name,value);
  }
  function restoreLedger(){
    for(const row of state.ledger.reverse()){
      if(!row.el?.isConnected) continue;
      if(row.had) row.el.setAttribute(row.name,row.value ?? '');
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
      #${PANEL_ID} .sc-note{font-size:12px;color:#999ca3;margin-top:10px}
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

  function safeSummary(model){
    const risk=model?.risk?.level === 'HIGH';
    if(risk) return 'Sensitive surface detected. Scarlett is keeping the original workflow intact and limiting itself to assistance.';
    if(model?.app) return model.app.label + ' detected. Scarlett is preserving native editing and familiar controls.';
    if(model?.pageType==='ARTICLE') return 'Reading-oriented page detected. Scarlett can improve hierarchy and reduce peripheral noise.';
    if(model?.pageType==='LISTING') return 'Listing or product page detected. Scarlett can foreground decision-relevant information without changing source facts.';
    if(model?.pageType==='FORM_SERVICE') return 'Form or service page detected. Scarlett can clarify hierarchy while preserving the original form and submission controls.';
    return 'Scarlett is using the least invasive intervention that improves clarity on this page.';
  }

  function buildPanel(model,mode,reason){
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
    const row=document.createElement('div');row.className='sc-row';
    const ask=document.createElement('button');ask.type='button';ask.dataset.primary='';ask.textContent='Ask ibis about this page';
    ask.addEventListener('click',()=>prepareIbisHandoff(model));
    const original=document.createElement('button');original.type='button';original.textContent='Original';
    original.addEventListener('click',()=>applyMode('ORIGINAL'));
    row.append(ask,original);
    if(model?.selection){
      const selected=document.createElement('button');selected.type='button';selected.textContent='Use selected text';
      selected.addEventListener('click',()=>prepareIbisHandoff(model,{selectionOnly:true}));
      row.insertBefore(selected,original);
    }
    const note=document.createElement('div');note.className='sc-note';
    note.textContent=reason==='SENSITIVE_SURFACE_ASSIST_ONLY'
      ? 'Adapt was reduced to Assist because this page contains sensitive controls or content.'
      : reason==='COMPLEX_APP_MUSCLE_MEMORY'
        ? 'Complex app detected: Scarlett is preserving the native workspace.'
        : 'Page analysis stays local until you deliberately hand context to ibis.';
    body.append(kicker,heading,copy,row,note);
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
    if(main) setAttr(main,'data-ftn-scarlett-reading','');
    for(const el of model?._clutterNodes || []){
      if(el.closest('nav,header,main,article,form,[role="dialog"]')) continue;
      setAttr(el,'data-ftn-scarlett-deprioritize','');
    }
  }

  function clearPresentation(){
    restoreLedger();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(CONTROL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    root.removeAttribute('data-ftn-scarlett-mode');
    state.panel=null;state.control=null;
  }

  function applyMode(requested){
    const model=page().analyze();
    const resolved=policy().resolve(model,requested);
    clearPresentation();
    state.model=model;
    state.mode=resolved.mode;
    if(resolved.mode==='ORIGINAL'){
      state.mode='ORIGINAL';
      return {mode:'ORIGINAL',reason:resolved.reason,model:safeModel(model)};
    }
    state.lastScarlettMode=resolved.mode;
    ensureStyle(model);
    setAttr(root,'data-ftn-scarlett-mode',resolved.mode);
    if(resolved.mode==='ADAPT') markAdapt(model);
    buildPanel(model,resolved.mode,resolved.reason);
    buildControl();
    return {mode:resolved.mode,reason:resolved.reason,model:safeModel(model)};
  }

  function safeModel(model){
    return {
      version:model.version,pageType:model.pageType,app:model.app,risk:model.risk,site:model.site,
      regions:model.regions,actions:model.actions,content:model.content,reducedMotion:model.reducedMotion,capturedAt:model.capturedAt,
      selectionPresent:!!model.selection
    };
  }

  async function prepareIbisHandoff(model,options={}){
    const selectionOnly=!!options.selectionOnly;
    const context={
      source:'SCARLETT',
      version:'SCARLETT_HANDOFF_V1',
      sourceUrl:location.href.slice(0,1800),
      sourceTitle:(document.title||'').slice(0,220),
      pageType:model.pageType,
      app:model.app?.id || null,
      riskLevel:model.risk?.level || 'NORMAL',
      selectedText:selectionOnly ? (model.selection||'').slice(0,4000) : (model.selection||'').slice(0,1800),
      visibleContext:selectionOnly ? '' : [model.content?.title,model.content?.description,...(model.content?.headings||[])].filter(Boolean).join('\n').slice(0,5000),
      createdAt:new Date().toISOString()
    };
    await chrome.storage.session.set({scarlettIbisHandoff:context});
    chrome.runtime.sendMessage({type:'SCARLETT_OPEN_IBIS'});
  }

  chrome.runtime.onMessage.addListener((message,_sender,send)=>{
    try{
      if(message?.type==='SCARLETT_ANALYZE'){
        const model=page().analyze();state.model=model;
        send({ok:true,model:safeModel(model),defaultMode:policy().defaultMode(model),mode:state.mode});
      }else if(message?.type==='SCARLETT_MODE'){
        Promise.resolve(applyMode(message.mode)).then(result=>send({ok:true,...result}));return true;
      }else if(message?.type==='SCARLETT_STATE'){
        send({ok:true,mode:state.mode,lastScarlettMode:state.lastScarlettMode,model:state.model?safeModel(state.model):null});
      }else return false;
    }catch(error){send({ok:false,error:error?.message||String(error)});}
    return true;
  });

  globalThis.__FTN_SCARLETT__={applyMode,analyze:()=>safeModel(page().analyze()),restore:()=>applyMode('ORIGINAL')};
})();
