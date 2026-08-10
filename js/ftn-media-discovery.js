// FTN Platform — shared browser client for FTN-owned media discovery services.
// The Supabase publishable key is intentionally client-side; provider secrets (YouTube etc.)
// remain inside the Edge Function. Never place provider/API secret keys in this file.
(function(global){
  'use strict';
  var SUPABASE_URL='https://jshmidfpqrajxtukzges.supabase.co';
  var PUBLISHABLE_KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/dj-tube-discovery';
  var cache=new Map();

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
  global.FTN=global.FTN||{};
  global.FTN.MediaDiscovery={discover:discover,music:music,video:video,videos:videos,playlist:playlist,endpoint:ENDPOINT};
})(window);
