(function(){
'use strict';
var URL='https://jshmidfpqrajxtukzges.supabase.co', KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
var state={session:null,summary:null,national:null};
var $=function(id){return document.getElementById(id);};
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});};
var iso=function(days){return new Date(Date.now()+days*86400000).toISOString().slice(0,10);};
function list(id,items,render,empty){$(id).innerHTML=(items||[]).map(function(x){return '<li>'+render(x)+'</li>';}).join('')||'<li>'+esc(empty)+'</li>';}
function num(v){return Number(v||0).toLocaleString();}
async function national(){
 if(state.national)return state.national;
 var r=await Promise.all([fetch('/data/crime-statistics.json',{cache:'no-cache'}),fetch('/data/fx-usd-ttd.json',{cache:'no-cache'})]);
 if(!r[0].ok||!r[1].ok)throw new Error('National source snapshot could not be read.');
 var crime=await r[0].json(),fx=await r[1].json(),annual=crime.annual||[],latest=annual[annual.length-1]||{},month=(fx.monthly||[]).slice(-1)[0]||{};
 return state.national={crime:crime,fx:fx,latestHistorical:latest,latestFx:month};
}
function renderNational(n){
 var c=n.crime, h=n.latestHistorical, f=n.latestFx, current=c.current||{};
 $('mayorNational').innerHTML='<p><strong>'+num(current.reported)+' reported murders</strong><br><small>TTPS current-year cumulative figure; retrieved '+esc(current.asOf||'not stated')+'.</small><br><a href="'+esc(current.sourceUrl||'https://ttps.gov.tt/')+'" target="_blank" rel="noopener">Open TTPS source</a></p>'+
 '<p><strong>'+num(h.reported)+' reported murders in '+esc(h.year)+'</strong><br><small>CSO historical national series; reference year '+esc(h.year)+', retrieved '+esc((c.source||{}).retrieved||'not stated')+'.</small><br><a href="'+esc((c.source||{}).url||'https://cso.gov.tt/')+'" target="_blank" rel="noopener">Open CSO source</a></p>'+
 '<p><strong>TT$ '+Number(f.usdSelling||0).toFixed(4)+' per US$</strong><br><small>Central Bank monthly selling rate; reference month '+esc(f.period||'not stated')+', retrieved '+esc((n.fx.source||{}).retrieved||'not stated')+'.</small><br><a href="'+esc((n.fx.source||{}).url||'https://www.central-bank.org.tt/exchange-rates-monthly/')+'" target="_blank" rel="noopener">Open Central Bank source</a></p>'+
 '<p><small>Method: national official indicators are context only. They are not combined with Community Connect reports and do not establish a local causal relationship.</small></p>';
}
function render(d,n){
 var t=d.totals||{},p=d.previous_totals||{},change=Number(t.reports||0)-Number(p.reports||0);
 $('mayorMetrics').innerHTML=[['Reports',t.reports],['Open',t.open],['Resolved',t.resolved],['Communities',t.communities],['Change vs prior period',(change>0?'+':'')+change]].map(function(x){return '<article class="mayor-card"><strong>'+esc(num(x[1]))+'</strong><span>'+esc(x[0])+'</span></article>';}).join('');
 var select=$('mayorCommunity'),selected=select.value;select.innerHTML='<option value="">All communities</option>'+(d.communities||[]).map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');select.value=selected;
 list('mayorCategories',d.categories,function(x){return '<span>'+esc(x.category)+'</span><strong>'+num(x.count)+'</strong>';},'No report categories in this period.');
 list('mayorCorrelations',d.correlations,function(x){return '<span>'+esc(x.signal)+'<small>'+esc(x.basis)+'</small></span><strong>'+num(x.count)+'</strong>';},'No repeated category signals meet the current threshold.');
 list('mayorHeat',d.heat_cells,function(x){return '<span>Aggregate activity area</span><strong>'+num(x.count)+' reports</strong>';},'No aggregate activity areas meet the privacy threshold.');
 renderNational(n);
}
async function refresh(){
 var status=$('mayorStatus');status.textContent='Refreshing the selected community picture…';$('mayorMetrics').setAttribute('aria-busy','true');
 var from=$('mayorFrom').value,to=$('mayorTo').value,community=$('mayorCommunity').value||null;
 try{
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);var res;try{res=await fetch(URL+'/rest/v1/rpc/mayor_dashboard_summary',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+state.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_from:new Date(from).toISOString(),p_to:new Date(to).toISOString(),p_community:community}),signal:controller.signal});}finally{clearTimeout(timer);}
  if(!res.ok)throw new Error('Protected community summary was not returned.');
  var data=await res.json();state.summary=Array.isArray(data)?data[0]:data;render(state.summary,await national());$('mayorMetrics').setAttribute('aria-busy','false');status.textContent='Community picture updated.';
 }catch(e){$('mayorMetrics').setAttribute('aria-busy','false');status.textContent='The community picture did not finish loading. Select Refresh community picture to try again.';}
}
function brief(){
 if(!state.summary)return refresh().then(brief);
 var d=state.summary,t=d.totals||{},n=state.national,current=n.crime.current||{},fx=n.latestFx||{};
 $('mayorBriefPanel').hidden=false;
 $('mayorBriefBody').textContent=(d.community||'All communities')+' · '+new Date(d.period.from).toLocaleDateString()+'–'+new Date(d.period.to).toLocaleDateString()+'\n\n'+num(t.reports)+' Community Connect reports: '+num(t.open)+' open and '+num(t.resolved)+' resolved.\n\nPriority signals: '+((d.correlations||[]).map(function(x){return x.signal+' ('+x.count+')';}).join('; ')||'No repeated category signals in this period.')+'\n\nNational context: TTPS current-year reported murders '+num(current.reported)+' (retrieved '+(current.asOf||'not stated')+'). CSO historical reported murders '+num(n.latestHistorical.reported)+' in '+n.latestHistorical.year+'. Central Bank monthly TT$/US$ selling rate '+Number(fx.usdSelling||0).toFixed(4)+' for '+(fx.period||'not stated')+'.\n\nMethod: Community Connect figures are privacy-protected aggregate reports for the selected period. National indicators are separately sourced context; they are not combined to infer causation.';
 $('mayorBriefPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
async function boot(){
 $('mayorFrom').value=iso(-30);$('mayorTo').value=iso(1);
 $('mayorSignIn').addEventListener('click',function(){$('mayorLoginStatus').textContent='Opening secure FTN sign-in…';window.FTN.Auth.signInWithGoogle('/mayor-dashboard/').catch(function(){$('mayorLoginStatus').textContent='Secure sign-in could not be started.';});});
 $('mayorRefresh').addEventListener('click',refresh);$('mayorBrief').addEventListener('click',brief);$('mayorPrint').addEventListener('click',function(){window.print();});
 try{await window.FTN.Auth.completeAuthRedirect();state.session=await window.FTN.Auth.getSession();}catch(e){}
 if(state.session){$('mayorLogin').hidden=true;$('mayorWorkspace').hidden=false;refresh();}
}
document.addEventListener('DOMContentLoaded',boot);
})();