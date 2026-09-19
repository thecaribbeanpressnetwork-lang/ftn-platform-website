(function(global){'use strict';
var root=document.getElementById('scarlett-analytics-root');if(!root)return;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pct(v){return v==null?'—':Math.round(v*1000)/10+'%';}
function n(v){return v==null?'—':esc(v);}
function metric(label,value,sub){return'<article class="command-metric"><span>'+esc(label)+'</span><strong>'+n(value)+'</strong><small>'+esc(sub||'')+'</small></article>';}
function badge(v){return'<span class="command-status command-status--'+esc(String(v||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'">'+esc(v||'UNKNOWN')+'</span>';}
function table(headers,rows){if(!rows.length)return'<p class="command-copy">No data in the current 90-day window.</p>';return'<div class="command-table"><div class="command-table__head">'+headers.map(function(h){return'<span>'+esc(h)+'</span>';}).join('')+'</div>'+rows.map(function(r){return'<div class="command-table__row">'+r.map(function(c){return'<span>'+esc(c)+'</span>';}).join('')+'</div>';}).join('')+'</div>';}
function breakdown(obj,limit){return Object.entries(obj||{}).sort(function(a,b){return b[1]-a[1];}).slice(0,limit||10);}

function funnelSteps(steps){return'<div class="command-row" style="flex-direction:column;align-items:flex-start;gap:6px">'+steps.map(function(s,i){return'<div><strong>'+esc(s[0])+'</strong><span> — '+n(s[1])+(i>0&&steps[i-1][1]?' ('+pct(s[1]/steps[i-1][1])+' of previous step)':'')+'</span></div>';}).join('')+'</div>';}

function render(d){
  var a=d.adoption||{},sub=d.subscriptions||{},f=d.funnels||{},fu=d.featureUsage||{},pw=d.paywall||{},life=d.subscriptionLifecycleEvents||{},rel=d.reliability||{},dim=d.dimensions||{},acq=d.acquisition||{};
  root.className='index-ops';
  root.innerHTML='<div class="index-ops__shell"><div class="index-ops__top"><div><span class="nexus-eyebrow">SCARLETT ANALYTICS · PRIVATE FOUNDER CONTROL</span><h1>Adoption, retention and conversion -- product usage only.</h1><p>90-day window, computed from '+n(a.installs)+' tracked installs. No URL, page text, search query or browsing content is ever collected by this pipeline -- see the methodology panel below.</p></div><a class="index-ops__back" href="/god-mode/">&larr; God Mode</a></div>'+

  '<div class="command-metrics">'+
    metric('Installs',a.installs,'tracked, 90-day window')+
    metric('Activated',a.activatedInstalls,'used a real Scarlett feature')+
    metric('DAU',a.dau,'active installs today')+
    metric('WAU',a.wau,'active installs, 7d')+
    metric('MAU',a.mau,'active installs, 30d')+
  '</div>'+

  '<div class="command-metrics">'+
    metric('D1 retention',pct(a.retention&&a.retention.d1),(a.retention?a.retention.d1Returned+' / '+a.retention.d1Eligible+' eligible':''))+
    metric('D7 retention',pct(a.retention&&a.retention.d7),(a.retention?a.retention.d7Returned+' / '+a.retention.d7Eligible+' eligible':''))+
    metric('D30 retention',pct(a.retention&&a.retention.d30),(a.retention?a.retention.d30Returned+' / '+a.retention.d30Eligible+' eligible':''))+
  '</div>'+

  '<div class="command-columns">'+
    '<section class="command-panel"><div class="command-panel__head"><div><span>SUBSCRIPTIONS · SERVER TRUTH</span><h2>Free, trial, paid</h2></div>'+badge(sub.mrrStatus==='live'?'billing live':'billing not live')+'</div>'+
      '<div class="command-metrics">'+metric('Trial users',sub.trialUsers)+metric('Paid users',sub.paidUsers)+metric('Past due',sub.pastDueUsers)+'</div>'+
      '<div class="command-row"><div><strong>MRR</strong><span>'+(sub.mrrStatus==='live'?(sub.mrrMinorUnits/100).toFixed(2)+' '+esc(sub.mrrCurrency||''):'Not live yet -- no Scarlett plan is active')+'</span></div></div>'+
      '<div class="command-row"><div><strong>Install &rarr; paid (approx.)</strong><span>'+pct(sub.installToPaidApprox)+'</span></div></div>'+
      '<p class="command-copy">'+esc(sub.installToPaidApproxNote||'')+'</p>'+
      '<div class="command-row"><div><strong>Trial &rarr; paid conversion</strong><span>'+esc(sub.trialToPaidConversion||'')+'</span></div></div>'+
      '<div class="command-row"><div><strong>Cancellations / expirations (event count)</strong><span>'+n(sub.cancellations30d)+' / '+n(sub.expired30dEvents)+'</span></div></div>'+
    '</section>'+
    '<section class="command-panel"><div class="command-panel__head"><div><span>RELIABILITY</span><h2>Errors &amp; performance</h2></div></div>'+
      '<div class="command-metrics">'+metric('Error rate',pct(rel.errorRate))+metric('Errors',rel.errorCount)+'</div>'+
      table(['Error class','Count'],breakdown(rel.errorsByClass).map(function(x){return[x[0],x[1]];}))+
      '<div class="command-panel__head" style="margin-top:12px"><div><span>PERFORMANCE BY FEATURE</span></div></div>'+
      Object.keys(rel.performanceByFeature||{}).map(function(feat){return'<div class="command-row"><div><strong>'+esc(feat)+'</strong><span>'+breakdown(rel.performanceByFeature[feat],6).map(function(x){return x[0]+': '+x[1];}).join(' · ')+'</span></div></div>';}).join('')+
    '</section>'+
  '</div>'+

  '<div class="command-columns">'+
    '<section class="command-panel"><div class="command-panel__head"><div><span>ACTIVATION FUNNEL</span></div></div>'+funnelSteps([['Install',f.activation&&f.activation.install],['Onboarding started',f.activation&&f.activation.onboardingStarted],['Onboarding completed',f.activation&&f.activation.onboardingCompleted],['First mode used',f.activation&&f.activation.firstModeUsed],['Second session',f.activation&&f.activation.secondSession]])+(f.activation&&f.activation.note?'<p class="command-copy">'+esc(f.activation.note)+'</p>':'')+'</section>'+
    '<section class="command-panel"><div class="command-panel__head"><div><span>PRIVACY FUNNEL</span></div></div>'+funnelSteps([['Data Faucet opened',f.privacy&&f.privacy.dataFaucetOpened],['Shield enabled',f.privacy&&f.privacy.shieldEnabled],['Shield retained',f.privacy&&f.privacy.shieldRetained]])+'</section>'+
  '</div>'+
  '<div class="command-columns">'+
    '<section class="command-panel"><div class="command-panel__head"><div><span>PREMIUM FUNNEL</span></div></div>'+funnelSteps([['Premium feature encountered',f.premium&&f.premium.premiumFeatureEncountered],['Paywall seen',f.premium&&f.premium.paywallSeen],['Checkout started',f.premium&&f.premium.checkoutStarted],['Subscription activated',f.premium&&f.premium.subscriptionActivated]])+'</section>'+
    '<section class="command-panel"><div class="command-panel__head"><div><span>INTELLIGENCE FUNNEL</span></div></div>'+funnelSteps([['Search',f.intelligence&&f.intelligence.search],['Find',f.intelligence&&f.intelligence.find],['ibis handoff',f.intelligence&&f.intelligence.ibisHandoff],['Headspace handoff',f.intelligence&&f.intelligence.headspaceHandoff]])+'</section>'+
  '</div>'+

  '<section class="command-panel command-panel--wide"><div class="command-panel__head"><div><span>FEATURE USAGE</span><h2>Modes &amp; capabilities</h2></div></div><div class="command-metrics">'+
    Object.entries(fu.modeUsage||{}).map(function(x){return metric(x[0],x[1]);}).join('')+
    metric('Data Faucet opened',fu.dataFaucetOpened)+metric('Shield enabled',fu.shieldEnabled)+metric('Search used',fu.searchUsed)+metric('Find used',fu.findUsed)+metric('ibis handoffs',fu.ibisHandoff)+metric('Headspace handoffs',fu.headspaceHandoff)+
  '</div></section>'+

  '<section class="command-panel command-panel--wide"><div class="command-panel__head"><div><span>PAYWALL &amp; CHECKOUT</span></div></div><div class="command-metrics">'+
    metric('Paywall seen',pw.paywallSeen)+metric('Premium previews',pw.premiumPreviewUsed)+metric('Checkout started',pw.checkoutStarted)+metric('Checkout completed',pw.checkoutCompleted)+metric('Checkout failed',pw.checkoutFailed)+metric('Completion rate',pct(pw.checkoutCompletionRate))+
  '</div><div class="command-row"><div><strong>Subscription lifecycle events</strong><span>started '+n(life.started)+' · renewed '+n(life.renewed)+' · cancelled '+n(life.cancelled)+' · expired '+n(life.expired)+' · past due '+n(life.pastDue)+'</span></div></div></section>'+

  '<section class="command-panel command-panel--wide"><div class="command-panel__head"><div><span>DIMENSIONS</span><h2>Where adoption is coming from</h2></div></div><div class="command-columns">'+
    '<div>'+table(['Version','Events'],breakdown(dim.byVersion).map(function(x){return[x[0],x[1]];}))+'</div>'+
    '<div>'+table(['Browser','Events'],breakdown(dim.byBrowser).map(function(x){return[x[0],x[1]];}))+'</div>'+
  '</div><div class="command-columns">'+
    '<div>'+table(['Platform','Events'],breakdown(dim.byPlatform).map(function(x){return[x[0],x[1]];}))+'</div>'+
    '<div>'+table(['Self-reported tier','Events'],breakdown(dim.bySelfReportedTier).map(function(x){return[x[0],x[1]];}))+'</div>'+
  '</div><div class="command-columns">'+
    '<div>'+table(['Acquisition source','Events'],breakdown(dim.byAcquisitionSource).map(function(x){return[x[0],x[1]];}))+'</div>'+
    '<div>'+table(['Region (locale-derived)','Events'],breakdown(dim.byRegion).map(function(x){return[x[0],x[1]];}))+'</div>'+
  '</div><p class="command-copy">Region is derived from the request\'s Accept-Language header, not IP geolocation -- a coarse, self-reported browser/OS locale signal, not an authoritative location claim. Self-reported tier is client-declared for dimension purposes only; paid-user counts above come from server-verified entitlements, not this column.</p></section>'+

  '<section class="command-panel command-panel--wide"><div class="command-panel__head"><div><span>ACQUISITION ATTRIBUTION</span><h2>Channel &rarr; conversion (one-way, no identity link)</h2></div></div><div class="command-metrics">'+metric('Channel touches',acq.touches)+metric('Converted',acq.converted)+'</div>'+table(['Source','Converted'],breakdown(acq.bySourceConverted).map(function(x){return[x[0],x[1]];}))+'</section>'+

  '<section class="command-panel"><div class="command-panel__head"><div><span>METHODOLOGY</span></div></div><p class="command-copy">'+esc((d.methodology&&d.methodology.cohortDefinition)||'')+' '+esc((d.methodology&&d.methodology.activationDefinition)||'')+' '+esc((d.methodology&&d.methodology.returnDefinition)||'')+' '+esc((d.methodology&&d.methodology.retentionDenominatorNote)||'')+' Timezone basis: '+esc((d.methodology&&d.methodology.timezoneBasis)||'')+'</p></section>'+

  '</div>';
}

async function load(){
  try{
    var access=await global.FTN.Auth.ownerAccess();
    if(!access||!access.allowed){
      if(access&&access.ownerIdentity&&access.deviceApprovalRequired){
        root.innerHTML='<span class="nexus-eyebrow">SCARLETT ANALYTICS · PRIVATE</span><h1>Founder device approval required.</h1><p>Enroll or approve this device from <a href="/god-mode/">God Mode</a> first -- Scarlett analytics uses the exact same founder-device authorization, not a separate one.</p><a class="nexus-primary" href="/god-mode/">Open God Mode</a>';
        return;
      }
      root.innerHTML='<span class="nexus-eyebrow">SCARLETT ANALYTICS · PRIVATE</span><h1>Authorization required.</h1><p>'+esc((access&&access.error)||'Founder authorization denied.')+'</p><a class="nexus-primary" href="/account/?return=%2Fgod-mode%2Fscarlett%2F">Open FTN Account</a>';
      return;
    }
    var data=await global.FTN.Auth.ownerInvoke({action:'scarlett-analytics'});
    if(data&&data.error)throw new Error(data.error);
    render(data);
  }catch(e){
    root.innerHTML='<span class="nexus-eyebrow">SCARLETT ANALYTICS · PRIVATE</span><h1>Console unavailable.</h1><p>'+esc(e.message||'Could not load Scarlett analytics.')+'</p><a href="/god-mode/">Back to God Mode</a>';
  }
}
if(global.FTN&&global.FTN.Auth)load();else window.addEventListener('load',load,{once:true});
})(window);
