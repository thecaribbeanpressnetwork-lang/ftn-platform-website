import {search as ibisSearch,sourceLink} from './ibis-search-client.js';

const status=document.querySelector('#status');
const facts=document.querySelector('#page-facts');
const buttons=[...document.querySelectorAll('[data-mode]')];
let tabId=null;

async function activeTab(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id) throw new Error('No active page is available.');
  return tab;
}
async function ensureRuntime(id){
  try{
    const reply=await chrome.tabs.sendMessage(id,{type:'SCARLETT_ANALYZE'});
    if(reply?.ok) return reply;
  }catch{}
  await chrome.scripting.executeScript({target:{tabId:id},files:['page-understanding.js','transformation-policy.js','representation-engine.js','deck-renderer.js','entitlements.js','content.js']});
  return chrome.tabs.sendMessage(id,{type:'SCARLETT_ANALYZE'});
}
function setPressed(mode){
  for(const button of buttons) button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
}
function render(reply){
  const model=reply.model||{};
  setPressed(reply.mode||'ORIGINAL');
  const app=model.app?.label ? model.app.label+' · ' : '';
  const risk=model.risk?.level==='HIGH' ? 'Sensitive · ' : '';
  facts.textContent=`${app}${risk}${model.pageType||'Page'} · local analysis`;
  if(model.risk?.level==='HIGH' || model.app){
    document.querySelector('[data-mode="ADAPT"]').disabled=true;
    document.querySelector('[data-mode="TRANSFORM"]').disabled=true;
    status.textContent=model.app
      ? 'Complex application detected. Scarlett keeps this surface in Assist to preserve muscle memory.'
      : 'Sensitive surface detected. Scarlett keeps this surface in Assist unless a future governed policy explicitly allows more.';
  }else{
    document.querySelector('[data-mode="ADAPT"]').disabled=false;
    document.querySelector('[data-mode="TRANSFORM"]').disabled=false;
    status.textContent=`Recommended: ${reply.defaultMode||'ASSIST'}. Original is always available.`;
  }
}
async function init(){
  try{
    const tab=await activeTab();tabId=tab.id;
    if(!/^https?:/i.test(tab.url||'')) throw new Error('Scarlett runs on normal web pages, not browser-internal pages.');
    const reply=await ensureRuntime(tabId);
    render(reply);
  }catch(error){
    status.textContent=error?.message||String(error);
    buttons.forEach(b=>b.disabled=true);
  }
}
buttons.forEach(button=>button.addEventListener('click',async()=>{
  if(!tabId) return;
  status.textContent='Applying '+button.dataset.mode.toLowerCase()+'…';
  try{
    const reply=await chrome.tabs.sendMessage(tabId,{type:'SCARLETT_MODE',mode:button.dataset.mode});
    if(!reply?.ok) throw new Error(reply?.error||'Scarlett could not update this page.');
    setPressed(reply.mode);
    if(reply.reason==='SENSITIVE_SURFACE_ASSIST_ONLY') status.textContent='Adapt was reduced to Assist on this sensitive surface.';
    else if(reply.reason==='COMPLEX_APP_MUSCLE_MEMORY') status.textContent='Adapt was reduced to Assist to preserve this application’s native workflow.';
    else status.textContent=reply.mode==='ORIGINAL'?'Original page restored.':'Scarlett '+reply.mode.toLowerCase()+' is active.';
  }catch(error){status.textContent=error?.message||String(error);}
}));
init();

// Data Faucet / Shield: the ONLY place Scarlett ever asks for a permission beyond Core, and only
// from this real user-gesture click -- chrome.permissions.request() requires exactly that context.
const shieldStatusEl=document.querySelector('#shield-status');
const shieldExplainEl=document.querySelector('#shield-explain');
const shieldToggle=document.querySelector('#shield-toggle');
async function renderShield(){
  const reply=await chrome.runtime.sendMessage({type:'SCARLETT_SHIELD_STATUS'});
  if(!reply?.ok){ shieldStatusEl.textContent='Data Faucet status unavailable.'; return; }
  if(!reply.granted){
    shieldStatusEl.textContent='Off. Scarlett cannot see third-party network activity.';
    shieldExplainEl.hidden=false;
    shieldToggle.textContent='Turn on Data Faucet Protection';
  }else{
    shieldStatusEl.textContent=reply.enabled?'On. Known trackers are being blocked.':'Granted, but blocking is paused.';
    shieldExplainEl.hidden=true;
    shieldToggle.textContent=reply.enabled?'Turn off Data Faucet Protection':'Resume blocking';
  }
}
shieldToggle.addEventListener('click',async()=>{
  shieldToggle.disabled=true;
  try{
    const current=await chrome.runtime.sendMessage({type:'SCARLETT_SHIELD_STATUS'});
    if(!current?.granted){
      const result=await chrome.runtime.sendMessage({type:'SCARLETT_SHIELD_REQUEST'});
      if(!result?.granted) shieldStatusEl.textContent='Permission was not granted. Data Faucet stays off.';
    }else if(current.enabled){
      await chrome.runtime.sendMessage({type:'SCARLETT_SHIELD_REVOKE'});
    }else{
      await chrome.runtime.sendMessage({type:'SCARLETT_SHIELD_TOGGLE',enabled:true});
    }
  }catch(error){shieldStatusEl.textContent=error?.message||String(error);}
  shieldToggle.disabled=false;
  renderShield();
});
renderShield();

// Plan/entitlement status: reads live from entitlements.js (window.FTN_SCARLETT_ENTITLEMENTS,
// loaded as a plain classic script before this module) rather than duplicating hardcoded copy, so
// the popup can never drift from the actual tier data model.
(function renderPlan(){
  const el=window.FTN_SCARLETT_ENTITLEMENTS;
  const statusEl=document.querySelector('#plan-status');
  if(!el||!statusEl) return;
  const tierId=el.currentTier();
  const tier=el.TIERS.find(t=>t.id===tierId);
  if(!tier) return;
  statusEl.textContent=`You're on ${tier.name}. Every mode built so far (Assist, Adapt, Transform, Compare, Blend, Data Faucet) is included, free.`;
})();

// Search with Scarlett / Find with Scarlett: both hit the same canonical FTN ibis endpoint
// (ibis-search-client.js) the production ibis companion extension already uses -- only on an
// explicit form submit, never as the user types.
const searchForm=document.querySelector('#search-form');
const searchQuery=document.querySelector('#search-query');
const searchStatus=document.querySelector('#search-status');
const searchResults=document.querySelector('#search-results');
let searchMode='SEARCH';
searchForm.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-search-mode]');
  if(button) searchMode=button.dataset.searchMode;
});
searchForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const query=searchQuery.value.trim();
  if(!query){ searchStatus.textContent='Type something to search or find.'; return; }
  searchResults.replaceChildren();
  searchStatus.textContent=(searchMode==='FIND'?'Finding':'Searching')+'…';
  try{
    const{rows,classification}=await ibisSearch(query,{mode:searchMode});
    searchStatus.textContent=rows.length
      ? rows.length+' result'+(rows.length===1?'':'s')+(searchMode==='FIND'?' · shown as '+classification.representation.replace('-',' '):'')
      : 'No indexed result matched. Open FTN ibis for a broader search.';
    for(const row of rows.slice(0,8)){
      const card=document.createElement('article');card.className='search-card';
      const heading=document.createElement('h3');heading.textContent=row.title||row.organization||'FTN ibis record';
      const meta=document.createElement('p');meta.className='meta';meta.textContent=[row.type,row.organization,row.geography].filter(Boolean).join(' · ');
      const summary=document.createElement('p');summary.textContent=row.summary||'Open the original source for details.';
      card.append(heading,meta,summary);
      const href=sourceLink(row.sourceUrl);
      if(href){const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noreferrer';link.textContent='Open source';card.appendChild(link);}
      searchResults.appendChild(card);
    }
  }catch(error){searchStatus.textContent=error?.message||String(error);}
});
