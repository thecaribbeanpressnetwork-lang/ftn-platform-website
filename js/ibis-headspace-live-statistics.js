// FTN Platform — materialize verified Statistics results inside ibis Headspace.
(function(global){
  'use strict';
  var queryInput=document.getElementById('headspaceQuery');
  var form=document.getElementById('inputOrbit');
  var hint=document.getElementById('commandHint');
  function isStatisticsQuestion(text){return /\b(murder|homicide|usd|us dollar|exchange rate|buying rate|selling rate)\b/i.test(text||'');}
  function reveal(name){var el=document.querySelector('[data-thought="'+name+'"]');if(!el)return;el.classList.remove('dematerialized');el.classList.add('materializing');setTimeout(function(){el.classList.remove('materializing');},760);}
  function escapeText(value){return value==null?'':String(value);}
  function renderGraph(series){
    if(!series||!series.values||!series.values.length)return;
    var card=document.querySelector('[data-thought="graph"]');if(!card)return;
    var title=card.querySelector('.thought-bar>span');if(title)title.textContent=series.label.toUpperCase();
    var graph=card.querySelector('.graph');var labels=card.querySelector('.graph-labels');var note=card.querySelector('p');
    var min=Math.min.apply(null,series.values),max=Math.max.apply(null,series.values),span=max-min||1;
    graph.innerHTML='';series.values.forEach(function(value){var bar=document.createElement('span');var pct=18+((value-min)/span)*78;bar.style.setProperty('--h',pct+'%');bar.title=escapeText(value)+' '+escapeText(series.unit);graph.appendChild(bar);});
    if(labels){var first=series.periods[0]||'',last=series.periods[series.periods.length-1]||'';labels.innerHTML='<span>'+escapeText(first)+'</span><span>'+escapeText(last)+'</span>';}
    if(note)note.textContent=series.values.length+' verified observations shown · '+escapeText(series.unit)+' · '+escapeText(series.frequency)+'.';
    reveal('graph');
  }
  function renderContext(payload){
    var result=payload.result,card=document.querySelector('[data-thought="context"]');if(!card)return;
    var list=card.querySelector('ul');if(!list)return;
    var p=result.provenance||{},c=result.confidence||{};
    var source=result.source&&result.source.publisher||p.publisher||p.sourceIdentity||'Source not recorded';
    var ref=p.sourceReferenceDate||result.fact&&result.fact.sourceReferenceDate||'Not published';
    var retrieved=p.sourceRetrievedAt||result.fact&&result.fact.retrievedAt||'Not recorded';
    list.innerHTML='';
    [['Source',source],['Reference',ref],['Retrieved',retrieved],['Confidence',c.level?c.level+' · evidence quality':'Not assessed']].forEach(function(row){var li=document.createElement('li'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=row[0];span.textContent=row[1];li.append(strong,span);list.appendChild(li);});
    reveal('context');
  }
  function renderAnswer(payload){
    var result=payload.result,card=document.querySelector('[data-thought="answer"]');if(!card)return;
    var h2=card.querySelector('h2'),p=card.querySelector('p');
    if(!result.success){if(h2)h2.textContent='ibis could not answer that from verified FTN Statistics.';if(p)p.textContent=result.reason||result.errorType||'The deterministic statistics engine failed closed.';reveal('answer');return;}
    if(h2)h2.textContent=result.answer;
    var bits=[];if(result.confidence&&result.confidence.level)bits.push('Confidence: '+result.confidence.level+' (evidence quality, not probability)');if(result.provenance&&result.provenance.publisher)bits.push('Source: '+result.provenance.publisher);if(result.calculation&&result.calculation.formula)bits.push('Formula: '+result.calculation.formula);
    if(p)p.textContent=bits.join(' · ');
    reveal('answer');
  }
  async function handle(text){
    if(!global.FTN||!global.FTN.HeadspaceStatistics){if(hint)hint.textContent='Verified Statistics bridge is not available.';return;}
    if(hint)hint.textContent='ibis is retrieving the verified FTN Statistics catalog…';
    try{
      var payload=await global.FTN.HeadspaceStatistics.query(text,{now:new Date().toISOString()});
      renderAnswer(payload);if(payload.result&&payload.result.success){renderGraph(payload.series);renderContext(payload);}
      if(hint)hint.textContent=payload.result&&payload.result.success?'Verified statistic materialized with provenance and confidence. Ask “why?” or “evidence” to inspect it.':'The statistics engine failed closed; no number was invented.';
    }catch(error){renderAnswer({result:{success:false,reason:error.message}});if(hint)hint.textContent='Verified Statistics could not be loaded; no fallback number was invented.';}
  }
  if(form)form.addEventListener('submit',function(event){var text=queryInput&&queryInput.value||'';if(!isStatisticsQuestion(text))return;event.preventDefault();event.stopImmediatePropagation();handle(text);},true);
})(typeof window!=='undefined'?window:globalThis);
