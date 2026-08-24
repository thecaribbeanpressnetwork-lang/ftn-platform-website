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
    var cur=data.current,latest=data.annual[data.annual.length-1];
    host.innerHTML='<section class="crime-intel__shell"><header class="crime-intel__head"><div><span>OFFICIAL CRIME SERIES</span><h2>Crime over time.</h2><p>Long-run CSO context and the latest TTPS current-year count, kept distinct.</p></div><div class="crime-period" role="group" aria-label="Crime comparison period"><button class="is-active" data-crime-period="ytd">YTD</button><button data-crime-period="month">Month</button><button data-crime-period="week">Week</button></div></header>'+
      '<div class="crime-kpis"><article class="crime-kpi crime-kpi--lead"><span>2026 recorded murders</span><strong data-crime-value>'+cur.reported+'</strong><p data-crime-label>recorded since 1 January '+cur.year+'</p><small data-crime-note>Official TTPS current-year total</small></article><article class="crime-kpi"><span>Detected</span><strong>'+cur.detected+'</strong><p>'+pct(cur.detected,cur.reported)+'% detection rate</p></article><article class="crime-kpi"><span>2024 reported</span><strong>'+latest.reported+'</strong><p>highest annual total in this CSO series</p></article></div>'+
      '<div class="crime-series" role="group" aria-label="Choose crime series">'+data.crimeSeries.map(function(s){return '<button class="'+(s.id==='murder'?'is-active':'')+'" data-crime-series="'+s.id+'">'+esc(s.label)+'</button>';}).join('')+'</div>'+
      '<div class="crime-intel__grid"><article><div class="crime-chart-head"><h3 data-crime-title>Murder · reported count · 2015–2024</h3><div class="crime-measure" role="group" aria-label="Choose measure"><button class="is-active" data-crime-measure="count">Count</button><button data-crime-measure="rate">Per 100k</button></div></div><div data-crime-chart>'+lineChart(seriesRows(data.crimeSeries.filter(function(s){return s.id==='murder';})[0],'count'),'Murder reported count')+'</div></article><article><h3>2024 by police division</h3>'+bars(data.divisions2024)+'</article></div>'+
      '<footer><a href="'+esc(data.source.url)+'" target="_blank" rel="noopener">CSO historical workbook</a><a href="'+esc(cur.sourceUrl)+'" target="_blank" rel="noopener">TTPS current comparative chart</a><span>FTN checked '+esc(cur.asOf)+' — TTPS does not publish a reference date for this total, so currency cannot be confirmed</span></footer></section>';
    host.querySelectorAll('[data-crime-period]').forEach(function(btn){btn.addEventListener('click',function(){host.querySelectorAll('[data-crime-period]').forEach(function(b){b.classList.toggle('is-active',b===btn);});var v=periodValue(data,btn.getAttribute('data-crime-period'));host.querySelector('[data-crime-value]').textContent=v.value;host.querySelector('[data-crime-label]').textContent=v.label;host.querySelector('[data-crime-note]').textContent=v.note;});});
    var selected='murder',measure='count';function updateChart(){var s=data.crimeSeries.filter(function(x){return x.id===selected;})[0];host.querySelector('[data-crime-title]').textContent=s.label+' · '+(measure==='rate'?'rate per 100,000':'reported count')+' · 2015–2024';host.querySelector('[data-crime-chart]').innerHTML=lineChart(seriesRows(s,measure),s.label+' '+measure);host.classList.remove('is-visible');void host.offsetWidth;host.classList.add('is-visible');}
    host.querySelectorAll('[data-crime-series]').forEach(function(btn){btn.addEventListener('click',function(){selected=btn.getAttribute('data-crime-series');host.querySelectorAll('[data-crime-series]').forEach(function(b){b.classList.toggle('is-active',b===btn);});updateChart();});});
    host.querySelectorAll('[data-crime-measure]').forEach(function(btn){btn.addEventListener('click',function(){measure=btn.getAttribute('data-crime-measure');host.querySelectorAll('[data-crime-measure]').forEach(function(b){b.classList.toggle('is-active',b===btn);});updateChart();});});
    if(!global.matchMedia('(prefers-reduced-motion: reduce)').matches){var observer=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){host.classList.add('is-visible');observer.disconnect();}});},{threshold:.2});observer.observe(host);}else host.classList.add('is-visible');
  }
  function init(){var host=document.getElementById('crime-intelligence');if(!host)return;fetch('/data/crime-statistics.json?v=20260824.2').then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(data){render(host,data);}).catch(function(){host.innerHTML='<p class="callout">Crime statistics are temporarily unavailable. Open the official CSO and TTPS sources from the Observer source directory.</p>';});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
