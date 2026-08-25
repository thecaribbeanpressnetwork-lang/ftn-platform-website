(function (global) {
  'use strict';
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var pct = function (a,b) { return b ? (a / b * 100).toFixed(1) : '0.0'; };
  function lineChart(rows,unit) {
    var w=900,h=330,p=48,max=Math.max.apply(null,rows.map(function(x){return x.reported;})),min=Math.min.apply(null,rows.map(function(x){return x.reported;}))-30;
    var x=function(i){return p+i*(w-p*2)/(rows.length-1);},y=function(v){return h-p-(v-min)/(max-min)*(h-p*2);};
    var points=rows.map(function(r,i){return x(i)+','+y(r.reported);}).join(' ');
    return '<svg class="crime-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(unit)+' by year, 2015 to 2024">'+
      '<defs><filter id="crimeGlow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+
      '<polyline class="crime-chart__line" points="'+points+'" pathLength="1"/>'+
      rows.map(function(r,i){return '<g><circle class="crime-chart__dot" cx="'+x(i)+'" cy="'+y(r.reported)+'" r="5"/><text x="'+x(i)+'" y="'+(h-16)+'" text-anchor="middle">'+r.year+'</text><text class="crime-chart__value" x="'+x(i)+'" y="'+(y(r.reported)-14)+'" text-anchor="middle">'+Number(r.reported).toLocaleString(undefined,{maximumFractionDigits:1})+'</text></g>';}).join('')+'</svg>';
  }
  function seriesRows(series,mode){return series[mode==='rate'?'rates':'values'].map(function(value,i){return {year:2015+i,reported:value};});}
  // Phase 5A: a real, accessible tabular alternative to the SVG chart -- collapsed by default
  // (a <details> disclosure, same "compact by default" pattern the Trust Card trigger already
  // uses elsewhere), not a decorative repeat of the chart's own labels.
  function tableHTML(rows,series,mode){
    var unit=mode==='rate'?'per 100,000':'reported count';
    return '<details class="crime-table-disclosure"><summary>View '+esc(series.label)+' as a table</summary>'+
      '<table class="crime-table"><caption class="sr-only">'+esc(series.label)+' — '+esc(unit)+' by year, 2015 to 2024</caption>'+
      '<thead><tr><th scope="col">Year</th><th scope="col">'+esc(unit)+'</th></tr></thead>'+
      '<tbody>'+rows.map(function(r){return '<tr><th scope="row">'+r.year+'</th><td>'+Number(r.reported).toLocaleString(undefined,{maximumFractionDigits:1})+'</td></tr>';}).join('')+'</tbody></table></details>';
  }
  // Phase 5A: real Trust Card wiring via the shared js/ftn-statistics.js contract + the
  // js/ftn-statistics-crime-adapter.js transform of this exact data -- not a second, ad hoc
  // evidence shape. Falls back to a no-op if any dependency isn't loaded (e.g. a future consumer
  // of this same render() function on a lighter page), never throwing and breaking the chart.
  function mountTrustCardTrigger(host,data){
    if(!global.FTN||!global.FTN.Statistics||!global.FTN.StatisticsCrimeAdapter||!global.FTN.TrustCard)return;
    try{
      var built=global.FTN.StatisticsCrimeAdapter.buildObservations(data);
      var current=built.observations.filter(function(o){return o.sourceId==='tt-ttps-crime-current';})[0];
      var provenance=global.FTN.Statistics.provenanceFor(current,built.sources.ttps);
      var trigger=document.createElement('button');
      trigger.type='button';
      trigger.className='trust-trigger trust-trigger--on-dark crime-intel__evidence-trigger';
      trigger.setAttribute('aria-haspopup','dialog');
      trigger.textContent='View evidence';
      trigger.onclick=function(){
        global.FTN.TrustCard.open({
          title:'Reported Murders — '+current.referencePeriod,
          value:current.value,units:'reported',
          publisher:provenance.publisher,
          externalSourceUrl:provenance.sourceUrl,externalSourceLabel:provenance.sourceIdentity,
          referenceDate:provenance.sourceReferenceDate,
          lastUpdated:provenance.sourceRetrievedAt,
          retrievalMethod:'Checked daily against the published TTPS page',
          methodology:'The current-year figure is the cumulative reported-murders total published by the TTPS Comparative Chart. FTN does not add an inferred daily count. Historical comparisons (2015–2024) use the separate CSO workbook compiled from the same TTPS Crime and Problem Analysis Unit source, kept distinct from the current-year total.',
          confidenceBasis:provenance.confidenceBasis,
          licensingNote:provenance.licensingNote,
          limitations:'TTPS publishes a cumulative current-year total, not incident-level dates, and does not state a statistical reference ("as at") date for it -- the date shown is FTN’s own retrieval date, not confirmation the source updated. "Reported" is not the same as confirmed/prosecuted; TTPS figures are subject to revision.',
        });
      };
      host.appendChild(trigger);
    }catch(e){/* evidence trigger is additive -- never break the chart it sits beside */}
  }
  function bars(rows) {
    var max=Math.max.apply(null,rows.map(function(x){return x.reported;}));
    return '<div class="crime-bars">'+rows.map(function(r){return '<div class="crime-bar"><span>'+esc(r.name)+'</span><div><i style="--bar:'+(r.reported/max*100).toFixed(2)+'%"></i></div><strong>'+r.reported+'</strong></div>';}).join('')+'</div>';
  }
  function periodValue(data,period) {
    var snaps=data.dailySnapshots||[],latest=snaps[snaps.length-1];
    if(period==='ytd') return {value:data.current.reported,label:'recorded since 1 January '+data.current.year,note:'Official TTPS current-year total'};
    var days=period==='week'?7:31,cut=new Date(new Date(latest.date+'T12:00:00').getTime()-days*86400000),base=null;
    snaps.forEach(function(s){if(new Date(s.date+'T12:00:00')<=cut)base=s;});
    if(!base)return {value:'—',label:period==='week'?'weekly change':'monthly change',note:'Collecting official daily snapshots'};
    return {value:latest.reported-base.reported,label:'additional recorded murders',note:'Change from '+base.date+' to '+latest.date};
  }
  function render(host,data) {
    var cur=data.current,latest=data.annual[data.annual.length-1],murderSeries=data.crimeSeries.filter(function(s){return s.id==='murder';})[0];
    host.innerHTML='<section class="crime-intel__shell"><header class="crime-intel__head"><div><span>OFFICIAL CRIME SERIES</span><h2>Crime over time.</h2><p>Long-run CSO context and the latest TTPS current-year count, kept distinct.</p><div data-crime-evidence></div></div><div class="crime-period" role="group" aria-label="Crime comparison period"><button class="is-active" data-crime-period="ytd">YTD</button><button data-crime-period="month">Month</button><button data-crime-period="week">Week</button></div></header>'+
      '<div class="crime-kpis"><article class="crime-kpi crime-kpi--lead"><span>2026 recorded murders</span><strong data-crime-value>'+cur.reported+'</strong><p data-crime-label>recorded since 1 January '+cur.year+'</p><small data-crime-note>Official TTPS current-year total</small></article><article class="crime-kpi"><span>Detected</span><strong>'+cur.detected+'</strong><p>'+pct(cur.detected,cur.reported)+'% detection rate</p></article><article class="crime-kpi"><span>2024 reported</span><strong>'+latest.reported+'</strong><p>highest annual total in this CSO series</p></article></div>'+
      '<div class="crime-series" role="group" aria-label="Choose crime series">'+data.crimeSeries.map(function(s){return '<button class="'+(s.id==='murder'?'is-active':'')+'" data-crime-series="'+s.id+'">'+esc(s.label)+'</button>';}).join('')+'</div>'+
      '<div class="crime-intel__grid"><article><div class="crime-chart-head"><h3 data-crime-title>Murder · reported count · 2015–2024</h3><div class="crime-measure" role="group" aria-label="Choose measure"><button class="is-active" data-crime-measure="count">Count</button><button data-crime-measure="rate">Per 100k</button></div></div><div data-crime-chart>'+lineChart(seriesRows(murderSeries,'count'),'Murder reported count')+'</div><div data-crime-table>'+tableHTML(seriesRows(murderSeries,'count'),murderSeries,'count')+'</div></article><article><h3>2024 by police division</h3>'+bars(data.divisions2024)+'</article></div>'+
      '<footer><a href="'+esc(data.source.url)+'" target="_blank" rel="noopener">CSO historical workbook</a><a href="'+esc(cur.sourceUrl)+'" target="_blank" rel="noopener">TTPS current comparative chart</a><span>FTN checked '+esc(cur.asOf)+' — TTPS does not publish a reference date for this total, so currency cannot be confirmed</span></footer></section>';
    var evidenceHost=host.querySelector('[data-crime-evidence]');if(evidenceHost)mountTrustCardTrigger(evidenceHost,data);
    host.querySelectorAll('[data-crime-period]').forEach(function(btn){btn.addEventListener('click',function(){host.querySelectorAll('[data-crime-period]').forEach(function(b){b.classList.toggle('is-active',b===btn);});var v=periodValue(data,btn.getAttribute('data-crime-period'));host.querySelector('[data-crime-value]').textContent=v.value;host.querySelector('[data-crime-label]').textContent=v.label;host.querySelector('[data-crime-note]').textContent=v.note;});});
    var selected='murder',measure='count';function updateChart(){var s=data.crimeSeries.filter(function(x){return x.id===selected;})[0];host.querySelector('[data-crime-title]').textContent=s.label+' · '+(measure==='rate'?'rate per 100,000':'reported count')+' · 2015–2024';host.querySelector('[data-crime-chart]').innerHTML=lineChart(seriesRows(s,measure),s.label+' '+measure);host.querySelector('[data-crime-table]').innerHTML=tableHTML(seriesRows(s,measure),s,measure);host.classList.remove('is-visible');void host.offsetWidth;host.classList.add('is-visible');}
    host.querySelectorAll('[data-crime-series]').forEach(function(btn){btn.addEventListener('click',function(){selected=btn.getAttribute('data-crime-series');host.querySelectorAll('[data-crime-series]').forEach(function(b){b.classList.toggle('is-active',b===btn);});updateChart();});});
    host.querySelectorAll('[data-crime-measure]').forEach(function(btn){btn.addEventListener('click',function(){measure=btn.getAttribute('data-crime-measure');host.querySelectorAll('[data-crime-measure]').forEach(function(b){b.classList.toggle('is-active',b===btn);});updateChart();});});
    if(!global.matchMedia('(prefers-reduced-motion: reduce)').matches){var observer=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){host.classList.add('is-visible');observer.disconnect();}});},{threshold:.2});observer.observe(host);}else host.classList.add('is-visible');
  }
  function init(){var host=document.getElementById('crime-intelligence');if(!host)return;fetch('/data/crime-statistics.json?v=20260824.2').then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(data){render(host,data);}).catch(function(){host.innerHTML='<p class="callout">Crime statistics are temporarily unavailable. Open the official CSO and TTPS sources from the Observer source directory.</p>';});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
