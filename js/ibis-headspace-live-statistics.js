// FTN Platform — materialize verified Statistics results inside ibis Headspace.
(function(global){
  'use strict';
  var queryInput=document.getElementById('headspaceQuery');
  var form=document.getElementById('inputOrbit');
  var hint=document.getElementById('commandHint');
  function isStatisticsQuestion(text){return /\b(murder|homicide|usd|us dollar|exchange rate|buying rate|selling rate)\b/i.test(text||'');}
  function reveal(name){var el=document.querySelector('[data-thought="'+name+'"]');if(!el)return;el.classList.remove('dematerialized');el.classList.add('materializing');setTimeout(function(){el.classList.remove('materializing');},760);}
  function sourceMeta(result){var p=result&&result.provenance||{};return{source:result&&result.source||p.sourceIdentity||p.publisher||null,sourceReferenceDate:p.sourceReferenceDate||result&&result.fact&&result.fact.sourceReferenceDate||null,retrievedAt:p.sourceRetrievedAt||result&&result.fact&&result.fact.retrievedAt||null};}
  function renderGraph(payload){
    var series=payload.series,result=payload.result;if(!series||!series.values||!series.values.length)return;
    var card=document.querySelector('[data-thought="graph"]');if(!card)return;
    var title=card.querySelector('.thought-bar>span');if(title)title.textContent='INTELLIGENCE VIEW';
    var host=card.querySelector('.ibis-viz-host');if(!host){host=document.createElement('div');host.className='ibis-viz-host';card.appendChild(host);}
    var meta=sourceMeta(result);
    if(global.FTN&&global.FTN.IbisPresentation){
      global.FTN.IbisPresentation.render(host,{id:series.id,title:series.label,subtitle:series.values.length+' verified observations · '+(series.frequency||'frequency not stated'),mode:'SNAPSHOT',relationship:'TIME',values:series.values,labels:series.periods,unit:series.unit,source:meta.source,sourceReferenceDate:meta.sourceReferenceDate,retrievedAt:meta.retrievedAt,confidence:result.confidence,ariaLabel:series.label+' over time'});
    }
    reveal('graph');
  }
  function renderContext(payload){
    var result=payload.result,card=document.querySelector('[data-thought="context"]');if(!card)return;
    var list=card.querySelector('ul');if(!list)return;
    var p=result.provenance||{},c=result.confidence||{};
    var source=result.source&&result.source.publisher||result.source&&result.source.name||p.publisher||p.sourceIdentity||'Source not recorded';
    var ref=p.sourceReferenceDate||result.fact&&result.fact.sourceReferenceDate||'Not published';
    var retrieved=p.sourceRetrievedAt||result.fact&&result.fact.retrievedAt||'Not recorded';
    list.innerHTML='';
    [['Data state','VERIFIED SNAPSHOT'],['Source',source],['Reference',ref],['Retrieved',retrieved],['Confidence',c.level?c.level+' · evidence quality':'Not assessed']].forEach(function(row){var li=document.createElement('li'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=row[0];span.textContent=row[1];li.append(strong,span);list.appendChild(li);});
    var old=card.querySelector('.ibis-live-strip');if(old)old.remove();
    reveal('context');
  }
  function renderAnswer(payload){
    var result=payload.result,card=document.querySelector('[data-thought="answer"]');if(!card)return;
    var h2=card.querySelector('h2'),p=card.querySelector('p');
    if(!result.success){if(h2)h2.textContent='ibis could not answer that from verified FTN Statistics.';if(p)p.textContent=result.reason||result.errorType||'The deterministic statistics engine failed closed.';reveal('answer');return;}
    if(h2)h2.textContent=result.answer;
    var bits=[];if(result.confidence&&result.confidence.level)bits.push('Confidence: '+result.confidence.level+' evidence quality');if(result.provenance&&result.provenance.publisher)bits.push('Source: '+result.provenance.publisher);if(result.calculation&&result.calculation.formula)bits.push('Formula: '+result.calculation.formula);bits.push('State: verified snapshot');
    if(p)p.textContent=bits.join(' · ');
    reveal('answer');
  }
  async function handle(text){
    if(!global.FTN||!global.FTN.HeadspaceStatistics){if(hint)hint.textContent='Verified Statistics bridge is not available.';return;}
    if(hint)hint.textContent='ibis is retrieving the verified FTN Statistics catalog…';
    try{
      var payload=await global.FTN.HeadspaceStatistics.query(text,{now:new Date().toISOString()});
      renderAnswer(payload);if(payload.result&&payload.result.success){renderGraph(payload);renderContext(payload);}
      if(hint)hint.textContent=payload.result&&payload.result.success?'Verified statistic materialized with an intelligent visual, provenance and confidence. Snapshot data remains labeled as snapshot; live feeds remain live when connected.':'The statistics engine failed closed; no number was invented.';
    }catch(error){renderAnswer({result:{success:false,reason:error.message}});if(hint)hint.textContent='Verified Statistics could not be loaded; no fallback number was invented.';}
  }
  if(form)form.addEventListener('submit',function(event){var text=queryInput&&queryInput.value||'';if(!isStatisticsQuestion(text))return;event.preventDefault();event.stopImmediatePropagation();handle(text);},true);
})(typeof window!=='undefined'?window:globalThis);
