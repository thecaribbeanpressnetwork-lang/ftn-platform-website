(function(){
'use strict';
var URL='https://jshmidfpqrajxtukzges.supabase.co',KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
var state={session:null,summary:null,mapData:null,national:null,nationalPromise:null,map:null,mapLayer:null,mapMarkers:{},categoryOptions:[]};
var $=function(id){return document.getElementById(id);};
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'})[c];});};
var iso=function(days){return new Date(Date.now()+days*86400000).toISOString().slice(0,10);};
function num(v){return Number(v||0).toLocaleString();}
function list(id,items,render,empty){$(id).innerHTML=(items||[]).map(function(x){return '<li>'+render(x)+'</li>';}).join('')||'<li>'+esc(empty)+'</li>';}
function filters(){return {p_from:new Date($('mayorFrom').value).toISOString(),p_to:new Date($('mayorTo').value).toISOString(),p_community:$('mayorCommunity').value||null,p_category:$('mayorCategory').value||null,p_status:$('mayorReportStatus').value||null};}
async function rpc(name,payload){
 var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);
 try{
  var res=await fetch(URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+state.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
  if(!res.ok)throw new Error(name+' did not return an authorized result.');
  return await res.json();
 }finally{clearTimeout(timer);}
}
function national(){
 if(state.national)return Promise.resolve(state.national);if(state.nationalPromise)return state.nationalPromise;
 state.nationalPromise=Promise.all([fetch('/data/crime-statistics.json',{cache:'no-cache'}),fetch('/data/fx-usd-ttd.json',{cache:'no-cache'})]).then(function(r){if(!r[0].ok||!r[1].ok)throw new Error('National source snapshot could not be read.');return Promise.all([r[0].json(),r[1].json()]);}).then(function(rows){var crime=rows[0],fx=rows[1],annual=crime.annual||[],latest=annual[annual.length-1]||{},month=(fx.monthly||[]).slice(-1)[0]||{};state.national={crime:crime,fx:fx,latestHistorical:latest,latestFx:month};return state.national;});
 return state.nationalPromise;
}
function renderNational(n){
 var c=n.crime,h=n.latestHistorical,f=n.latestFx,current=c.current||{};
 var cards=[['TTPS reported murders',num(current.reported),'Current-year cumulative · retrieved '+(current.asOf||'not stated')],['CSO reported murders',num(h.reported),'Historical annual '+(h.year||'not stated')+' · retrieved '+((c.source||{}).retrieved||'not stated')],['TT$/US$ selling rate','TT$ '+Number(f.usdSelling||0).toFixed(4),'Central Bank monthly '+(f.period||'not stated')+' · retrieved '+((n.fx.source||{}).retrieved||'not stated')]];
 $('mayorNationalMetrics').innerHTML=cards.map(function(x){return '<article class="mayor-card"><strong>'+esc(x[1])+'</strong><span>'+esc(x[0])+'<small>'+esc(x[2])+'</small></span></article>';}).join('');
 $('mayorNational').innerHTML='<p><strong>'+num(current.reported)+' reported murders</strong><br><small>TTPS current-year cumulative figure; retrieved '+esc(current.asOf||'not stated')+'.</small><br><a href="'+esc(current.sourceUrl||'https://ttps.gov.tt/')+'" target="_blank" rel="noopener">Open TTPS source</a></p><p><strong>'+num(h.reported)+' reported murders in '+esc(h.year)+'</strong><br><small>CSO historical national series; reference year '+esc(h.year)+', retrieved '+esc((c.source||{}).retrieved||'not stated')+'.</small><br><a href="'+esc((c.source||{}).url||'https://cso.gov.tt/')+'" target="_blank" rel="noopener">Open CSO source</a></p><p><strong>TT$ '+Number(f.usdSelling||0).toFixed(4)+' per US$</strong><br><small>Central Bank monthly selling rate; reference month '+esc(f.period||'not stated')+', retrieved '+esc((n.fx.source||{}).retrieved||'not stated')+'.</small><br><a href="'+esc((n.fx.source||{}).url||'https://www.central-bank.org.tt/exchange-rates-monthly/')+'" target="_blank" rel="noopener">Open Central Bank source</a></p><p><small>National indicators are context only. They are not combined with Community Connect reports to claim a local causal relationship.</small></p>';
}
function syncOptions(d){
 var community=$('mayorCommunity'),selectedCommunity=community.value;community.innerHTML='<option value="">All communities</option>'+(d.communities||[]).map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');community.value=selectedCommunity;
 if(!state.categoryOptions.length&&d.categories&&d.categories.length)state.categoryOptions=d.categories.map(function(x){return x.category;});
 var category=$('mayorCategory'),selectedCategory=category.value;category.innerHTML='<option value="">All categories</option>'+state.categoryOptions.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');category.value=selectedCategory;
}
function renderSummary(d,n){
 var t=d.totals||{},p=d.previous_totals||{},change=Number(t.reports||0)-Number(p.reports||0);
 $('mayorMetrics').innerHTML=[['Reports',t.reports],['Open',t.open],['Resolved',t.resolved],['Communities',t.communities],['Change vs prior period',(change>0?'+':'')+change]].map(function(x){return '<article class="mayor-card"><strong>'+esc(num(x[1]))+'</strong><span>'+esc(x[0])+'</span></article>';}).join('');
 syncOptions(d);
 list('mayorCategories',d.categories,function(x){return '<span>'+esc(x.category)+'</span><strong>'+num(x.count)+'</strong>';},'No report categories match these filters.');
 list('mayorCorrelations',d.correlations,function(x){return '<span>'+esc(x.signal)+'<small>'+esc(x.basis)+'</small></span><strong>'+num(x.count)+'</strong>';},'No repeated category signals meet the current threshold.');
 list('mayorHeat',d.heat_cells,function(x){return '<span>Aggregate activity area</span><strong>'+num(x.count)+' reports</strong>';},'No aggregate activity areas meet the privacy threshold.');
 renderNational(n);
}
function ensureMap(){
 if(state.map||!window.L)return state.map;
 state.map=L.map('mayorMap',{zoomControl:true}).setView([10.2797,-61.4680],13);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(state.map);
 state.mapLayer=L.layerGroup().addTo(state.map);return state.map;
}
function selectReport(report,focus){
 if(!report)return;
 document.querySelectorAll('.mayor-map-item').forEach(function(el){el.classList.toggle('is-active',el.dataset.reportId===String(report.id));});
 var lat=Number(report.latitude),lon=Number(report.longitude),q=encodeURIComponent(lat+','+lon);
 $('mayorSelected').hidden=false;$('mayorSelected').innerHTML='<h3>'+esc(report.case_number||'Community report')+'</h3><p><strong>'+esc(report.title||report.category||'Report')+'</strong><br>'+esc(report.community||'Community not stated')+' · '+esc(report.category||'Uncategorized')+' · '+esc(report.status||'Status not stated')+'<br>Reported '+esc(report.created_at?new Date(report.created_at).toLocaleString():'date not stated')+'</p><div class="mayor-selected-links"><a href="https://www.google.com/maps/search/?api=1&query='+q+'" target="_blank" rel="noopener">Google Maps</a><a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+q+'" target="_blank" rel="noopener">Street View</a></div><p><small>Map coordinates shown here are privacy-generalized, not the reporter\'s precise submitted location.</small></p>';
 var marker=state.mapMarkers[String(report.id)];if(focus&&state.map&&marker){state.map.setView(marker.getLatLng(),16);marker.openPopup();}
}
function renderMap(data){
 var reports=(data&&data.reports)||[],map=ensureMap();
 $('mayorMapCount').textContent=reports.length?reports.length+' real Community Connect report location'+(reports.length===1?'':'s')+' match the current filters.':'No geolocated Community Connect reports match the current filters.';
 $('mayorMapList').innerHTML=reports.map(function(r){return '<button class="mayor-map-item" type="button" data-report-id="'+esc(r.id)+'"><strong>'+esc(r.case_number||r.title||'Community report')+'</strong><small>'+esc(r.community||'Community not stated')+' · '+esc(r.category||'Uncategorized')+' · '+esc(r.status||'Status not stated')+'</small></button>';}).join('')||'<div class="mayor-card"><span>No map points to display. The map will populate from real Community Connect reports as geolocated submissions arrive.</span></div>';
 if(!map){$('mayorMapCount').textContent='The map library could not load. Report data remains available in the analysis view.';return;}
 state.mapLayer.clearLayers();state.mapMarkers={};var bounds=[];
 reports.forEach(function(r){var lat=Number(r.latitude),lon=Number(r.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;var marker=L.circleMarker([lat,lon],{radius:8,color:'#fff',weight:2,fillColor:'#e10613',fillOpacity:.92}).addTo(state.mapLayer);marker.bindPopup('<strong>'+esc(r.case_number||'Community report')+'</strong><br>'+esc(r.category||'Uncategorized')+'<br><small>'+esc(r.community||'')+'</small>');marker.on('click',function(){selectReport(r,false);});state.mapMarkers[String(r.id)]=marker;bounds.push([lat,lon]);});
 if(bounds.length===1)map.setView(bounds[0],15);else if(bounds.length>1)map.fitBounds(bounds,{padding:[36,36],maxZoom:16});else map.setView([10.2797,-61.4680],13);
 $('mayorMapList').querySelectorAll('.mayor-map-item').forEach(function(btn){btn.addEventListener('click',function(){var r=reports.find(function(x){return String(x.id)===btn.dataset.reportId;});selectReport(r,true);});});
 $('mayorSelected').hidden=true;setTimeout(function(){map.invalidateSize();},0);
}
async function refresh(){
 var status=$('mayorStatus');status.textContent='Updating the authorized community picture…';
 try{
  var f=filters(),results=await Promise.all([rpc('mayor_dashboard_summary_v2',f),rpc('mayor_map_data',f),national()]);
  state.summary=Array.isArray(results[0])?results[0][0]:results[0];state.mapData=Array.isArray(results[1])?results[1][0]:results[1];
  renderSummary(state.summary,results[2]);renderMap(state.mapData);status.textContent='Community picture updated from current authorized data.';
  return true;
 }catch(e){status.textContent='The protected Mayor data did not finish loading. Refresh to try again.';return false;}
}
async function brief(){
 if(!state.summary){var loaded=await refresh();if(!loaded||!state.summary){$('mayorStatus').textContent='A Mayor brief cannot be generated until the authorized community data loads successfully.';return;}}
 var d=state.summary,t=d.totals||{},n=state.national,current=n.crime.current||{},fx=n.latestFx||{};
 $('mayorBriefPanel').hidden=false;
 $('mayorBriefBody').textContent=(d.community||'All communities')+' · '+(d.category||'All categories')+' · '+(d.status||'All statuses')+' · '+new Date(d.period.from).toLocaleDateString()+'–'+new Date(d.period.to).toLocaleDateString()+'\n\n'+num(t.reports)+' Community Connect reports: '+num(t.open)+' open and '+num(t.resolved)+' resolved.\n\nPriority signals: '+((d.correlations||[]).map(function(x){return x.signal+' ('+x.count+')';}).join('; ')||'No repeated category signals in this period.')+'\n\nNational context: TTPS current-year reported murders '+num(current.reported)+' (retrieved '+(current.asOf||'not stated')+'). CSO historical reported murders '+num(n.latestHistorical.reported)+' in '+n.latestHistorical.year+'. Central Bank monthly TT$/US$ selling rate '+Number(fx.usdSelling||0).toFixed(4)+' for '+(fx.period||'not stated')+'.\n\nMethod: Community Connect figures are authorized aggregate reports for the selected filters and period. Map coordinates are generalized to 3 decimals. National indicators are separately sourced context and are not combined to infer causation.';
 $('mayorBriefPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function setView(mode){var mapMode=mode==='map';$('mayorMapView').hidden=!mapMode;$('mayorAnalysisView').hidden=mapMode;$('mayorMapTab').setAttribute('aria-pressed',String(mapMode));$('mayorAnalysisTab').setAttribute('aria-pressed',String(!mapMode));if(mapMode&&state.map)setTimeout(function(){state.map.invalidateSize();},0);}
async function boot(){
 $('mayorFrom').value=iso(-30);$('mayorTo').value=iso(1);
 $('mayorSignIn').addEventListener('click',function(){$('mayorLoginStatus').textContent='Opening secure FTN sign-in…';window.FTN.Auth.signInWithGoogle('/mayor-dashboard/').catch(function(){$('mayorLoginStatus').textContent='Secure sign-in could not be started.';});});
 $('mayorRefresh').addEventListener('click',refresh);$('mayorBrief').addEventListener('click',brief);$('mayorPrint').addEventListener('click',function(){window.print();});$('mayorMapTab').addEventListener('click',function(){setView('map');});$('mayorAnalysisTab').addEventListener('click',function(){setView('analysis');});
 ['mayorCommunity','mayorCategory','mayorReportStatus'].forEach(function(id){$(id).addEventListener('change',refresh);});
 try{await window.FTN.Auth.completeAuthRedirect();state.session=await window.FTN.Auth.getSession();}catch(e){}
 if(state.session){$('mayorLogin').hidden=true;$('mayorWorkspace').hidden=false;ensureMap();await refresh();}
}
document.addEventListener('DOMContentLoaded',boot);
})();