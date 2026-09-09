// ibis.ai — cross-product task handoff.
// Other FTN products can send a task with ?prompt=. ibis keeps the user's words intact,
// selects the most useful working mode, and runs only after its workspace is mounted.
// Recovery note (2026-09-09): this script also restores a visible route into the separately
// implemented Headspace surface. Headspace remains status-gated until deployed browser acceptance
// passes; exposing the route must never promote prototype-only controls to LIVE.
(function(global){
  'use strict';
  function chooseMode(prompt){var p=prompt.toLowerCase();if(/image|visual|poster|flyer|graphic|thumbnail|social card|cover/.test(p))return'visual';if(/analy[sz]e|compare|correlat|indicator|data|trend|what changed/.test(p))return'analyze';if(/find|search|watch|movie|film|music|track|video|episode/.test(p))return'find';return'ask';}
  function exposeHeadspace(){
    var main=document.getElementById('main');
    if(!main||document.querySelector('[data-ibis-headspace-entry]'))return;
    var entry=document.createElement('section');
    entry.setAttribute('data-ibis-headspace-entry','');
    entry.setAttribute('aria-label','ibis Headspace');
    entry.className='container';
    entry.style.cssText='padding-top:.75rem;padding-bottom:.25rem';
    entry.innerHTML='<div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;padding:.85rem 1rem;border:1px solid rgba(0,0,0,.14);border-radius:14px"><div style="flex:1 1 320px"><strong>ibis Headspace</strong><div style="font-size:.9rem;opacity:.75;margin-top:.15rem">Connected spatial interface · recovery preview. Live tools remain capability, health and permission gated.</div></div><a class="btn btn-primary btn-sm" href="/ibis-headspace-preview/" data-open-headspace>Open Headspace</a></div>';
    var root=document.getElementById('workspace-root');
    if(root&&root.parentNode===main)main.insertBefore(entry,root);else main.appendChild(entry);
  }
  function apply(){var params=new URLSearchParams(location.search),prompt=(params.get('prompt')||'').trim();if(!prompt)return;var attempts=0;function tryMount(){var input=document.getElementById('ibis-goal'),form=document.getElementById('ibis-form');if(!input||!form){if(attempts++<50)setTimeout(tryMount,80);return;}input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));var mode=chooseMode(prompt),button=document.querySelector('[data-mode="'+mode+'"]');if(button)button.click();input.focus({preventScroll:true});form.scrollIntoView({behavior:'smooth',block:'center'});if(params.get('run')==='1'&&typeof form.requestSubmit==='function')setTimeout(function(){form.requestSubmit();},120);}tryMount();}
  function init(){exposeHeadspace();apply();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
