// Scarlett acquisition capture -- real, minimal, first-touch-per-session. Runs on /scarlett/ and
// /scarlett/pricing/ only. Captures document.referrer's HOSTNAME (never the full referrer URL) and
// any utm_source/utm_medium/utm_campaign/utm_content on the current page's own URL, maps them to
// the same closed vocabulary supabase/functions/ftn-scarlett-billing/index.ts validates, and stores
// the result in sessionStorage so js/scarlett-pricing.js can attach it to a real checkout if one
// happens in this session. Nothing is transmitted by this file itself -- see
// docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md section 8 for the full acquisition-attribution model and
// its honest limits (there is no install-referrer API for an unpacked Chrome extension).
(function(global){'use strict';
var KEY='scarlettAcq';
var SOURCES=['ftn_site','organic_search','youtube','tiktok','facebook','instagram','direct','partner','press','unknown'];
function hostSource(host){
  if(!host)return'direct';
  if(/(^|\.)ftnplatform\.org$/.test(host))return'ftn_site';
  if(/(^|\.)(google|bing|duckduckgo|yahoo)\./.test(host))return'organic_search';
  if(/(^|\.)(youtube\.com|youtu\.be)$/.test(host))return'youtube';
  if(/(^|\.)tiktok\.com$/.test(host))return'tiktok';
  if(/(^|\.)facebook\.com$/.test(host))return'facebook';
  if(/(^|\.)instagram\.com$/.test(host))return'instagram';
  return'unknown';
}
function hostReferrerCategory(host){
  if(!host)return'direct';
  if(/(^|\.)ftnplatform\.org$/.test(host))return'ftn_site';
  if(/(^|\.)(google|bing|duckduckgo|yahoo)\./.test(host))return'search_engine';
  if(/(^|\.)(youtube\.com|youtu\.be|tiktok\.com)$/.test(host))return'video';
  if(/(^|\.)(facebook\.com|instagram\.com)$/.test(host))return'social';
  return'unknown';
}
function capture(){
  try{
    if(sessionStorage.getItem(KEY))return; // first-touch wins for this session
    var params=new URLSearchParams(location.search);
    var utmSource=(params.get('utm_source')||'').toLowerCase();
    var referrerHost='';try{referrerHost=document.referrer?new URL(document.referrer).hostname:'';}catch(e){}
    var source=SOURCES.indexOf(utmSource)>=0?utmSource:hostSource(referrerHost);
    var acq={
      source:source,
      medium:(params.get('utm_medium')||'').slice(0,40)||null,
      campaignId:/^[a-z0-9_-]{1,60}$/.test(params.get('utm_campaign')||'')?params.get('utm_campaign'):null,
      creative:(params.get('utm_content')||'').slice(0,60)||null,
      referrerCategory:hostReferrerCategory(referrerHost),
    };
    sessionStorage.setItem(KEY,JSON.stringify(acq));
  }catch(e){/* sessionStorage unavailable -- acquisition attribution is best-effort, never blocks the page */}
}
function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null');}catch(e){return null;}}
capture();
global.FTN=global.FTN||{};global.FTN.ScarlettAcquisition={read:read};
})(window);
