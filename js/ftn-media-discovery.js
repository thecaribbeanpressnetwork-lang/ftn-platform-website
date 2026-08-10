// FTN Platform — shared browser client for FTN-owned media discovery services.
// The Supabase publishable key is intentionally client-side; provider secrets (YouTube etc.)
// remain inside the Edge Function. Never place provider/API secret keys in this file.
(function(global){
  'use strict';
  var SUPABASE_URL='https://jshmidfpqrajxtukzges.supabase.co';
  var PUBLISHABLE_KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/dj-tube-discovery';
  var cache=new Map();

  // The DJ prototype intentionally keeps two decks visible side-by-side on phones.
  // Every grid child therefore needs min-width:0; otherwise intrinsic button/iframe
  // widths can make the document wider than the viewport even when body overflow is hidden.
  if(/\/dj-tube-prototype\//.test(global.location.pathname)&&!document.getElementById('ftn-dj-mobile-width-fix')){
    var style=document.createElement('style');style.id='ftn-dj-mobile-width-fix';style.textContent='@media(max-width:620px){.wrap{width:100%;max-width:100vw}.discovery,.console,.deck,.mixer,.panel,.queue,.queue-head,.searchbar,.faders,.channel,.deckcontrols,.deckcontrols>*{min-width:0;max-width:100%}.console{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.deckcontrols{grid-template-columns:repeat(3,minmax(0,1fr))}.deckcontrols button{min-width:0;width:100%;padding-left:2px;padding-right:2px;overflow:hidden;text-overflow:clip}.deck .screen{width:100%;max-width:43vw}.queue{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.queue-head>*{min-width:0}.item{min-width:0}.item span{min-width:0;overflow:hidden}.item strong,.item small{overflow:hidden;text-overflow:ellipsis}.searchbar{width:100%}.searchbar input{min-width:0}}';document.head.appendChild(style);
  }

  function keyFor(payload){try{return JSON.stringify(payload,Object.keys(payload).sort());}catch(e){return String(Date.now());}}
  function discover(payload, options){
    payload=payload||{};options=options||{};
    var cacheKey=keyFor(payload),cached=cache.get(cacheKey);
    if(cached&&!options.force&&Date.now()-cached.at<120000)return Promise.resolve(cached.data);
    return fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify(payload)}).then(function(r){return r.json().catch(function(){return{};}).then(function(body){if(!r.ok)throw new Error(body.error||body.message||('Discovery failed ('+r.status+')'));cache.set(cacheKey,{at:Date.now(),data:body});return body;});});
  }
  function music(genre,limit){return discover({mode:'music',genre:genre,limit:limit||100});}
  function video(query,limit){return discover({mode:'video',query:query,limit:limit||50});}
  function videos(queries,limit){return discover({mode:'video',queries:queries,limit:limit||100});}
  function playlist(playlistId,mode,limit){return discover({playlistId:playlistId,mode:mode||'music',limit:limit||160});}
  function formatPublishedAt(value){
    if(!value)return'';
    var parsed=new Date(value);
    return isNaN(parsed.getTime())?String(value):parsed.toLocaleDateString();
  }
  global.FTN=global.FTN||{};
  global.FTN.MediaDiscovery={discover:discover,music:music,video:video,videos:videos,playlist:playlist,formatPublishedAt:formatPublishedAt,endpoint:ENDPOINT};
})(window);
