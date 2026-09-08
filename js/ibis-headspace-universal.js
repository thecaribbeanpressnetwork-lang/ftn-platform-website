// FTN Platform — final Headspace submit fallback.
// Specialist capture handlers execute first. This handler only receives requests no specialist
// claimed, then routes them through the persistent ibis runtime instead of showing prototype copy.
(function(global){
  'use strict';
  var form=document.getElementById('inputOrbit'),input=document.getElementById('headspaceQuery'),hint=document.getElementById('commandHint');
  if(!form||!input)return;
  function answerCard(){return document.querySelector('[data-thought="answer"]');}
  function renderWaiting(result){var F=global.FTN&&global.FTN.HeadspaceFabric,a=answerCard();if(F)F.focus(['answer','tools']);if(a){a.querySelector('.thought-bar>span').textContent='PERMISSION REQUIRED';a.querySelector('h2').textContent='ibis is ready to continue, but this action changes something outside Headspace.';var waits=result&&result.run&&result.run.result&&result.run.result.waitingPermissions||[];a.querySelector('p').textContent=waits.length?'Approval required for '+waits.map(function(x){return x.agent.toLowerCase();}).join(', ')+'.':'Approval is required before ibis can perform the external step.';}if(hint)hint.textContent='Execution paused at the permission boundary.';}
  function bestText(result){var outputs=result&&result.run&&result.run.result&&result.run.result.outputs||[];for(var i=outputs.length-1;i>=0;i--){var o=outputs[i].output||{},d=o.data||o.result||{};if(d.answer)return d.answer;if(o.result&&o.result.answer)return o.result.answer;if(typeof d==='string')return d;}return null;}
  function renderResult(result,route){var F=global.FTN&&global.FTN.HeadspaceFabric,a=answerCard();if(result&&result.status==='WAITING_PERMISSION'){renderWaiting(result);return;}if(F)F.focus(['answer']);if(a){a.querySelector('.thought-bar>span').textContent='IBIS';var txt=bestText(result);a.querySelector('h2').textContent=result&&result.success?'ibis completed this reasoning pass.':'ibis could not complete that request yet.';a.querySelector('p').textContent=txt||((result&&result.status)?'Execution status: '+result.status+'. ':'')+'Route: '+(route&&route.operations||[]).join(' · ')+'.';}if(hint)hint.textContent=result&&result.success?'Answered through the universal ibis runtime.':'ibis routed the request but one or more required faculties did not complete.';}
  form.addEventListener('submit',async function(e){
    // This listener is intentionally registered last. Specialist handlers use capture +
    // stopImmediatePropagation; if one claimed the request, this fallback never runs.
    var text=input.value.trim();if(!text)return;e.preventDefault();e.stopImmediatePropagation();if(hint)hint.textContent='ibis is assembling the faculties this request needs…';
    try{var FTN=global.FTN=global.FTN||{};if(FTN.IbisRuntimeReady)await FTN.IbisRuntimeReady;if(!FTN.IbisRuntime)throw new Error('Universal runtime is unavailable.');var inputs=FTN.HeadspaceInputContext||{},context={attachments:(inputs.attachments||[]).slice()},route=FTN.UniversalRouter.route(text,context),result=await FTN.IbisRuntime.ask(text,context);renderResult(result,route);}catch(err){var a=answerCard();global.FTN&&global.FTN.HeadspaceFabric&&global.FTN.HeadspaceFabric.focus(['answer']);if(a){a.querySelector('.thought-bar>span').textContent='IBIS';a.querySelector('h2').textContent='This request reached the universal router, but execution failed.';a.querySelector('p').textContent=err&&err.message||String(err);}if(hint)hint.textContent='Universal execution failed closed; no result was fabricated.';}
  });
})(typeof window!=='undefined'?window:globalThis);
