// FTN Platform — public capability truth layer.
// Keeps legacy informational templates aligned with the current 13-product architecture
// while their larger templates are progressively consolidated.
(function(){
'use strict';
function textReplace(root,from,to){var w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);var n;while((n=w.nextNode()))if(n.nodeValue&&n.nodeValue.indexOf(from)>=0)n.nodeValue=n.nodeValue.split(from).join(to);}
function loadOnce(src,marker){if(document.querySelector('script['+marker+']')||document.querySelector('script[src="'+src+'"]'))return;var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(marker,'true');document.head.appendChild(s);}
function globalTruth(){
  document.querySelectorAll('a[href="/news/"],a[href="/news"]').forEach(function(a){a.href='/kaiso/';var t=(a.textContent||'').trim();if(t==='News'||t==='News & Stories')a.textContent='FTN Kaiso';});
  textReplace(document.body,'FTN Link','FTN EPK');
}
function aboutTruth(){
  var map={
    'Community Connect':['Flagship App','Connect. Report. Improve.'],
    'Mission Control':['Working Illustrative','Evidence, calculated relationships and scenario exploration.'],
    'Face The Nation':['Programme Hub','Interviews, public affairs and national conversation.'],
    'FTN Live':['Working Foundation','Current Caribbean satellite imagery, source-backed signals and change radar.'],
    'FTN Events':['Working MVP','Plan, procure and operate Caribbean events.'],
    'ibis.ai':['Working Foundation','Shared FTN intelligence, analysis, search and useful outputs.'],
    'FTN Riddim':['Working in Phases','Caribbean music tools, FTN DAW and FTN DJ Tube.'],
    'FTN Kaiso':['Working MVP','The Caribbean Newsroom.'],
    'FTN Radio':['Working MVP','Caribbean listening, discovery and creator workflows.'],
    'FTN Screen':['Working Experiment','Caribbean viewing, filmmaker packages and festival matching.'],
    'FTN Opportunities':['Working MVP','Source-backed Caribbean opportunities and application support.'],
    'FTN Love':['Later Phase','A limited private compatibility tool today; full matching comes after safety infrastructure.'],
    'Display Network':['Working Foundation','Prepare and preview approved screen playlists before network deployment.']
  };
  document.querySelectorAll('.ecosystem__node').forEach(function(node){var h=node.querySelector('h3');if(!h)return;var name=(h.textContent||'').trim();if(name==='Insights'||name==='News & Stories'){node.remove();return;}var spec=map[name];if(!spec)return;var status=node.querySelector('.ecosystem__status'),p=node.querySelector('p');if(status)status.textContent=spec[0];if(p)p.textContent=spec[1];});
}
function applicationsTruth(){
  document.querySelectorAll('.platform-tile').forEach(function(tile){var h=tile.querySelector('h3'),p=tile.querySelector('p');if(!h||!p)return;var name=(h.textContent||'').trim();var copy={
    'FTN Events':'Describe the event, generate an operating plan, find providers and prepare comparable RFQs.',
    'ibis.ai':'Ask, find, analyze FTN data and create useful visual outputs from one intelligence surface.',
    'FTN Radio':'Play Caribbean music, browse genres, prepare creator submissions and build an FTN EPK.',
    'FTN Screen':'Watch sourced Caribbean films, build filmmaker packages and compare festival readiness.',
    'FTN TV':'Turn on the scheduled Caribbean station, see what is on now and tune the guide.',
    'FTN Opportunities':'Search current official Caribbean opportunities, save them and track your application work.',
    'FTN Love':'Use the current private compatibility brief; the full matching platform is a later safety-controlled phase.',
    'Display Network':'Build, reorder, preview and export approved screen playlists locally.',
    'FTN Live':'Open with current Caribbean satellite imagery, connected sources and a calculated change radar.'
  };if(copy[name])p.textContent=copy[name];});
}
function sitemapTruth(){textReplace(document.body,'National Observatory','FTN Live');textReplace(document.body,'News & Stories','FTN Kaiso');}
function insightsTruth(){
  document.querySelectorAll('a[href="/news/"],a[href="/news"]').forEach(function(a){a.href='/kaiso/';if(/news/i.test(a.textContent||''))a.textContent='Open FTN Kaiso';});
  var community=document.querySelector('#community-reports .chart-card');
  if(community)community.innerHTML='<p><strong>Community data stays permission-aware.</strong> Community Connect information is not automatically published into Insights or Mission Control. When FTN presents aggregated community patterns here, the view must identify its source, date, classification and privacy boundary.</p><p class="u-mt-16"><a href="/kaiso/">Open FTN Kaiso for current source discovery and newsroom verification →</a></p>';
  var live=document.querySelector('a.module-card[href="/observatory/"] p');
  if(live)live.textContent='Current Caribbean satellite imagery, connected public sources and clearly classified national indicator context.';
  var mc=document.querySelector('a.module-card[href="/scenario-workspace/"] p');
  if(mc)mc.textContent='Calculate relationships in loaded indicator histories, inspect evidence and test disclosed illustrative scenarios.';
}
function resourcesTruth(){
  var lede=document.querySelector('.page-hero__lede');
  if(lede)lede.textContent='Answers, documentation status and media resources for the wider FTN Platform ecosystem.';
  document.querySelectorAll('.faq-item').forEach(function(item){var q=item.querySelector('summary'),a=item.querySelector('.faq-item__answer');if(!q||!a)return;var t=(q.textContent||'').trim();
    if(t==='What is FTN Platform?')a.innerHTML='<p>FTN Platform is a Caribbean-first digital infrastructure ecosystem spanning civic participation, intelligence, public affairs, journalism, music, radio, film, events, opportunities, live information and controlled display distribution. <a href="/applications/">Explore the product map</a>.</p>';
    if(t==="What's the difference between Community Connect and Mission Control?")a.innerHTML='<p>Community Connect is the public civic participation product. Mission Control is the institutional decision-support and operations layer. Permission-appropriate, structured Community Connect information may support Mission Control, but private user data is not automatically shared across products.</p>';
    if(t==='Who can access Mission Control?')a.innerHTML='<p>The public <a href="/scenario-workspace/">Mission Control workspace</a> demonstrates evidence, scenarios and calculated relationships. Any real institutional deployment requires organization-specific identity, permissions, governance and data access.</p>';
    if(t==='How is my data used?')a.innerHTML='<p>See the <a href="/legal/privacy-policy/">Privacy Policy</a> and the privacy information inside the product you are using. FTN connections are governed by purpose, consent, permissions and public/private boundaries; data does not become universally shared merely because products belong to one ecosystem.</p>';
  });
  var doc=document.querySelector('#documentation .u-text-silver');
  if(doc)doc.innerHTML='FTN already uses shared product, data, provenance and integration interfaces internally. Public developer credentials are not issued by this page. Government, media and partner organizations can <a href="/contact/#commercial">contact FTN</a> to define a scoped integration and the exact permissions it requires.';
}
function init(){if(!document.body)return;globalTruth();var p=location.pathname;if(p.indexOf('/about/')===0)aboutTruth();if(p.indexOf('/applications/')===0)applicationsTruth();if(p.indexOf('/sitemap/')===0)sitemapTruth();if(p.indexOf('/insights/')===0)insightsTruth();if(p.indexOf('/resources/')===0)resourcesTruth();if(p.indexOf('/facethenation')===0)loadOnce('/js/facethenation-empty-state.js','data-ftn-facethenation-empty-state');if(p.indexOf('/tv/')===0)loadOnce('/js/tv-facethenation-fallback.js','data-ftn-tv-facethenation-fallback');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
