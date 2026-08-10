// FTN TV — truthful continuity for the Face The Nation schedule block.
// If the official FTN programme archive has no playable episode yet, air an attributed
// Caribbean current-affairs source instead of leaving the station black.
(function(global){
'use strict';
var busy=false;
function fallback(){
  var now=document.getElementById('tv-now-title'),status=document.getElementById('tv-status'),frame=document.getElementById('tv-frame');
  if(!now||!status||!frame||busy||now.textContent.trim()!=='Face The Nation')return;
  if(!/No embeddable source returned/i.test(status.textContent||''))return;
  if(!global.FTN||!global.FTN.MediaDiscovery)return;
  busy=true;status.textContent='The Face The Nation video archive is not published yet. Tuning attributed Caribbean current-affairs programming for this slot…';
  global.FTN.MediaDiscovery.discover({mode:'video',queries:['Ian Alleyne Trinidad current affairs','Trinidad Tobago current affairs official','Caribbean public affairs Trinidad'],limit:60},{force:true}).then(function(d){
    var t=(d.results||[])[0];
    if(!t){status.textContent='Face The Nation archive is not published yet and no alternate current-affairs source is available.';return;}
    document.getElementById('tv-title').textContent=t.title;
    document.getElementById('tv-source').textContent=(t.channel||'YouTube')+' · substitute current-affairs source';
    frame.src='https://www.youtube.com/embed/'+encodeURIComponent(t.videoId)+'?autoplay=1&mute=1&rel=0&playsinline=1';
    status.textContent='Face The Nation archive is not yet published. FTN TV is airing an attributed Caribbean current-affairs source in this scheduled slot.';
  }).catch(function(e){status.textContent='Face The Nation archive is not yet published. Alternate current-affairs source unavailable: '+e.message;}).finally(function(){busy=false;});
}
function init(){var status=document.getElementById('tv-status');if(!status){setTimeout(init,100);return;}new MutationObserver(fallback).observe(status,{childList:true,subtree:true,characterData:true});fallback();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
