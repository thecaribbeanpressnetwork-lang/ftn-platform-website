// FTN Platform — ibis Presentation Intelligence.
// Chooses a visual form from the shape/intent of trusted data, then renders through FTN.Charts.
// Critical invariant: live/updating data is never silently converted into a snapshot. Genuine live
// feeds and continuously updating models are both required to retain an update path, but are labelled
// differently so a ticking estimate is never misrepresented as a live official measurement.
(function(global){
  'use strict';
  var MODES=['LIVE','LIVE_MODEL','SNAPSHOT','DERIVED','SCENARIO'];
  function fail(code,reason){return{success:false,errorType:code,reason:reason};}
  function finiteSeries(values){return Array.isArray(values)&&values.length&&values.every(function(v){return typeof v==='number'&&Number.isFinite(v);});}
  function chooseVisual(spec){
    spec=spec||{};var values=spec.values||[],labels=spec.labels||[];
    if(spec.visual)return spec.visual;
    if(spec.kind==='MAP'||spec.coordinates)return'MAP';
    if(spec.kind==='RANGE'||spec.lower&&spec.upper)return'RANGE';
    if(spec.kind==='TABLE'||spec.rows)return'TABLE';
    if(spec.kind==='SCORE'&&values.length===1)return'GAUGE';
    if(finiteSeries(values)&&values.length===1)return'KPI';
    if(finiteSeries(values)&&values.length>=2&&spec.relationship==='TIME')return values.length>24?'LINE_DENSE':'LINE';
    if(finiteSeries(values)&&values.length>=2&&labels.length===values.length&&spec.relationship==='CATEGORY')return'BAR';
    if(finiteSeries(values)&&values.length>=2)return'LINE';
    return'TEXT';
  }
  function normalize(spec){
    spec=spec||{};var mode=String(spec.mode||'SNAPSHOT').toUpperCase();if(!MODES.includes(mode))return fail('INVALID_MODE','Presentation mode must be LIVE, LIVE_MODEL, SNAPSHOT, DERIVED or SCENARIO.');
    if((mode==='LIVE'||mode==='LIVE_MODEL')&&typeof spec.subscribe!=='function'&&typeof spec.refresh!=='function')return fail('LIVE_WITHOUT_UPDATE_PATH','Live/updating presentation requires a subscribe() or refresh() update path; ibis will not relabel a static snapshot as live.');
    var visual=chooseVisual(spec);return{success:true,presentation:{id:spec.id||null,title:spec.title||'',subtitle:spec.subtitle||'',mode:mode,visual:visual,values:Array.isArray(spec.values)?spec.values.slice():[],labels:Array.isArray(spec.labels)?spec.labels.slice():[],rows:Array.isArray(spec.rows)?spec.rows.slice():null,unit:spec.unit||null,source:spec.source||null,sourceReferenceDate:spec.sourceReferenceDate||null,retrievedAt:spec.retrievedAt||null,calculatedAt:spec.calculatedAt||null,confidence:spec.confidence||null,relationship:spec.relationship||null,ariaLabel:spec.ariaLabel||spec.title||'ibis data visualization',subscribe:typeof spec.subscribe==='function'?spec.subscribe:null,refresh:typeof spec.refresh==='function'?spec.refresh:null}};}
  function statusText(p){if(p.mode==='LIVE')return'LIVE';if(p.mode==='LIVE_MODEL')return'LIVE MODEL';if(p.mode==='DERIVED')return'DERIVED';if(p.mode==='SCENARIO')return'SCENARIO';return'SNAPSHOT';}
  function sourceText(p){var bits=[];if(p.source){if(typeof p.source==='string')bits.push(p.source);else bits.push(p.source.publisher||p.source.name||p.source.id||'');}if(p.sourceReferenceDate)bits.push('ref '+p.sourceReferenceDate);if(p.retrievedAt)bits.push('retrieved '+String(p.retrievedAt).slice(0,10));if(p.calculatedAt&&(p.mode==='DERIVED'||p.mode==='LIVE_MODEL'||p.mode==='SCENARIO'))bits.push('calculated '+String(p.calculatedAt).slice(0,19).replace('T',' '));return bits.filter(Boolean).join(' · ');}
  function render(container,spec){
    var result=normalize(spec);if(!result.success)return result;var p=result.presentation;if(!container)return fail('MISSING_CONTAINER','A render container is required.');var Charts=global.FTN&&global.FTN.Charts;if(!Charts&&['LINE','LINE_DENSE','BAR','GAUGE'].includes(p.visual))return fail('CHARTS_NOT_LOADED','FTN.Charts must be loaded for chart visuals.');
    container.innerHTML='';var shell=document.createElement('section');shell.className='ibis-data-viz ibis-data-viz--'+p.visual.toLowerCase();var head=document.createElement('header');head.className='ibis-data-viz__head';var title=document.createElement('div');var h=document.createElement('h3');h.textContent=p.title;title.appendChild(h);if(p.subtitle){var sub=document.createElement('p');sub.textContent=p.subtitle;title.appendChild(sub);}var status=document.createElement('span');status.className='ibis-data-viz__status ibis-data-viz__status--'+p.mode.toLowerCase().replace('_','-');status.textContent=statusText(p);head.append(title,status);shell.appendChild(head);
    var stage=document.createElement('div');stage.className='ibis-data-viz__stage';
    function draw(){stage.innerHTML='';if(p.visual==='LINE'||p.visual==='LINE_DENSE')stage.appendChild(Charts.lineChart(p.values,p.labels,{height:p.visual==='LINE_DENSE'?260:220,ariaLabel:p.ariaLabel}));else if(p.visual==='BAR')stage.appendChild(Charts.barChart(p.values.map(function(v,i){return{label:p.labels[i]||String(i+1),value:v,valueLabel:String(v)+(p.unit?' '+p.unit:'')};}),{ariaLabel:p.ariaLabel}));else if(p.visual==='GAUGE')stage.appendChild(Charts.gauge(p.values[0],{ariaLabel:p.ariaLabel}));else if(p.visual==='KPI'){var k=document.createElement('strong');k.className='ibis-data-viz__kpi';k.textContent=String(p.values[0])+(p.unit?' '+p.unit:'');stage.appendChild(k);}else if(p.visual==='TABLE'&&p.rows){var table=document.createElement('table');table.className='ibis-data-viz__table';if(p.rows.length){var keys=Object.keys(p.rows[0]);var trh=document.createElement('tr');keys.forEach(function(k){var th=document.createElement('th');th.textContent=k;trh.appendChild(th);});var thead=document.createElement('thead');thead.appendChild(trh);table.appendChild(thead);var tbody=document.createElement('tbody');p.rows.forEach(function(row){var tr=document.createElement('tr');keys.forEach(function(k){var td=document.createElement('td');td.textContent=row[k]==null?'':String(row[k]);tr.appendChild(td);});tbody.appendChild(tr);});table.appendChild(tbody);}stage.appendChild(table);}else{var txt=document.createElement('p');txt.textContent=p.subtitle||'No chartable data.';stage.appendChild(txt);}}
    draw();shell.appendChild(stage);var foot=document.createElement('footer');foot.className='ibis-data-viz__foot';var src=document.createElement('span');src.textContent=sourceText(p)||'Source not stated';foot.appendChild(src);if(p.confidence&&p.confidence.level){var conf=document.createElement('span');conf.textContent='Confidence '+p.confidence.level;foot.appendChild(conf);}shell.appendChild(foot);container.appendChild(shell);
    var stop=null;if(p.mode==='LIVE'||p.mode==='LIVE_MODEL'){if(p.subscribe){stop=p.subscribe(function(update){if(update&&Array.isArray(update.values))p.values=update.values.slice();if(update&&Array.isArray(update.labels))p.labels=update.labels.slice();if(update&&update.sourceReferenceDate)p.sourceReferenceDate=update.sourceReferenceDate;if(update&&update.retrievedAt)p.retrievedAt=update.retrievedAt;if(update&&update.calculatedAt)p.calculatedAt=update.calculatedAt;draw();});}else if(p.refresh){var timer=setInterval(function(){Promise.resolve(p.refresh()).then(function(update){if(update&&Array.isArray(update.values))p.values=update.values.slice();if(update&&Array.isArray(update.labels))p.labels=update.labels.slice();if(update&&update.sourceReferenceDate)p.sourceReferenceDate=update.sourceReferenceDate;if(update&&update.retrievedAt)p.retrievedAt=update.retrievedAt;if(update&&update.calculatedAt)p.calculatedAt=update.calculatedAt;draw();}).catch(function(){});},spec.refreshMs||60000);stop=function(){clearInterval(timer);};}}
    return{success:true,presentation:p,stop:typeof stop==='function'?stop:null};
  }
  global.FTN=global.FTN||{};global.FTN.IbisPresentation={MODES:MODES.slice(),chooseVisual:chooseVisual,normalize:normalize,render:render};
})(typeof window!=='undefined'?window:globalThis);
