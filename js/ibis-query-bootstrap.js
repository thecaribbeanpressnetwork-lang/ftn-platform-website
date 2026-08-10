// ibis.ai — cross-product task handoff.
// Other FTN products can send a task with ?prompt=. ibis keeps the user's words intact,
// selects the most useful working mode, and runs only after its workspace is mounted.
(function(global){
  'use strict';
  function chooseMode(prompt){var p=prompt.toLowerCase();if(/image|visual|poster|flyer|graphic|thumbnail|social card|cover/.test(p))return'visual';if(/analy[sz]e|compare|correlat|indicator|data|trend|what changed/.test(p))return'analyze';if(/find|search|watch|movie|film|music|track|video|episode/.test(p))return'find';return'ask';}
  function apply(){var params=new URLSearchParams(location.search),prompt=(params.get('prompt')||'').trim();if(!prompt)return;var attempts=0;function tryMount(){var input=document.getElementById('ibis-goal'),form=document.getElementById('ibis-form');if(!input||!form){if(attempts++<50)setTimeout(tryMount,80);return;}input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));var mode=chooseMode(prompt),button=document.querySelector('[data-ibis-mode="'+mode+'"]');if(button)button.click();input.focus({preventScroll:true});form.scrollIntoView({behavior:'smooth',block:'center'});if(params.get('run')==='1'&&typeof form.requestSubmit==='function')setTimeout(function(){form.requestSubmit();},120);}tryMount();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})(window);
