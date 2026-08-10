// FTN Platform — public capability truth layer.
// Keeps legacy informational templates aligned with the current 13-product architecture
// while their larger templates are progressively consolidated.
(function(){
'use strict';
function textReplace(root,from,to){var w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);var n;while((n=w.nextNode()))if(n.nodeValue&&n.nodeValue.indexOf(from)>=0)n.nodeValue=n.nodeValue.split(from).join(to);}
function globalTruth(){
  document.querySelectorAll('a[href="/news/"],a[href="/news"]').forEach(function(a){a.href='/kaiso/';var t=(a.textContent||'').trim();if(t==='News'||t==='News & Stories')a.textContent='FTN Kaiso';});
  textReplace(document.body,'FTN Link','FTN EPK');
}
function aboutTruth(){
  var map={
    'Community Connect':['Flagship App','Connect. Report. Improve.'],
    'Mission Control':['Working Demonstration','Evidence, calculated relationships and scenario exploration.'],
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
function insightsTruth(){document.querySelectorAll('a[href="/news/"],a[href="/news"]').forEach(function(a){a.href='/kaiso/';if(/news/i.test(a.textContent||''))a.textContent='Open FTN Kaiso';});}
function init(){if(!document.body)return;globalTruth();var p=location.pathname;if(p.indexOf('/about/')===0)aboutTruth();if(p.indexOf('/applications/')===0)applicationsTruth();if(p.indexOf('/sitemap/')===0)sitemapTruth();if(p.indexOf('/insights/')===0)insightsTruth();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
