// FTN Platform — Headspace correlation surface through the canonical IbisClient fabric.
(function(global){
  'use strict';
  var form=document.getElementById('inputOrbit'),input=document.getElementById('headspaceQuery'),hint=document.getElementById('commandHint');
  function relevant(text){return /\b(correlat|relationship|move together)\b/i.test(text||'');}
  async function run(){
    var F=global.FTN&&global.FTN.HeadspaceFabric;if(F)F.focus(['correlation']);var card=document.querySelector('[data-thought="correlation"]'),title=card&&card.querySelector('h3'),body=card&&card.querySelector('p');
    try{
      if(!F)throw new Error('Headspace execution fabric is not loaded.');var series=global.FTN.HeadspaceSeries;
      if(!series||!series.a||!series.b){if(title)title.textContent='Correlation engine connected — two sourced series are required.';if(body)body.textContent='ibis refused to invent a relationship. Add or select two compatible time series with explicit periods, values, frequency and source provenance; exact periods are aligned and causation is never inferred.';if(hint)hint.textContent='Real correlation capability is ready through IbisClient. Waiting for two sourced series.';return;}
      var outcome=await F.request('CORRELATION_ANALYSIS',{a:series.a,b:series.b,options:{lags:[-2,-1,0,1,2]}});if(!outcome.success)throw new Error(outcome.reason||outcome.code||'Correlation capability was blocked.');var result=outcome.result;
      if(!result.success){if(title)title.textContent='Correlation could not be calculated safely.';if(body)body.textContent=(result.reason||result.errorType)+'.';if(hint)hint.textContent='Correlation failed closed; no relationship was fabricated.';return;}
      if(title)title.textContent=result.associationStrength+' '+result.direction.toLowerCase()+' association';if(body)body.textContent=result.n+' exact-period pairs · '+result.method+'. '+result.warning;
      var host=F.prepareViz(card);host.classList.add('ibis-correlation-viz');if(global.FTN.IbisPresentation){global.FTN.IbisPresentation.render(host,{title:'Association strength',subtitle:'Absolute Pearson r shown as a 0–100 derived strength indicator. Sign and causality remain separate.',mode:'DERIVED',kind:'SCORE',values:[Math.round(Math.abs(result.r)*100)],unit:'%',source:'Two user-selected sourced series',calculatedAt:new Date().toISOString(),ariaLabel:'Correlation association strength '+Math.round(Math.abs(result.r)*100)+' percent'});}var line=card.querySelector('.correlation-line');if(line)line.innerHTML='<span>'+String(series.a.label||series.a.id||'Series A')+'</span><i></i><span>r='+result.r.toFixed(3)+'</span><i></i><span>'+String(series.b.label||series.b.id||'Series B')+'</span>';if(hint)hint.textContent='Correlation executed through IbisClient with provenance. Ask “why?” or inspect the two series before acting.';
    }catch(e){if(title)title.textContent='Correlation engine unavailable.';if(body)body.textContent=e.message;if(hint)hint.textContent='Could not execute the correlation capability safely.';}
  }
  document.addEventListener('click',function(e){if(!e.target.closest('[data-correlate]'))return;e.preventDefault();e.stopImmediatePropagation();run();},true);
  if(form)form.addEventListener('submit',function(e){var text=input&&input.value||'';if(!relevant(text))return;e.preventDefault();e.stopImmediatePropagation();run();},true);
})(typeof window!=='undefined'?window:globalThis);
