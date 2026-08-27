// FTN shared Community Connect public metrics adapter.
// Replaces historical illustrative Community indicator values with the current public redacted dataset.
(function(global){
'use strict';
var URL='https://jshmidfpqrajxtukzges.supabase.co';
var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
var IDS=['community-reports-total','community-reports-verified','community-reports-resolved','community-participation','most-active-community','service-reliability'];
function find(id){return (global.FTN&&global.FTN.indicators||[]).find(function(x){return x.id===id;});}
function removeUnverifiedCommunityIndicators(){
 if(!global.FTN||!global.FTN.indicators)return;
 global.FTN.indicators=global.FTN.indicators.filter(function(x){return IDS.indexOf(x.id)===-1;});
}
function setMetric(id,value,opts){
 var i=find(id);if(!i)return;
 i.value=String(value);i.classification='Sourced';i.sourceName='FTN Community Connect public dataset';i.sourceId=null;i.confidence='Production public data';i.updateFrequency='On page load';i.lastUpdated=new Date().toISOString();i.changeLabel='';i.trend='flat';
 i.methodology=(opts&&opts.methodology)||'Calculated from the current redacted Community Connect public dataset. QA/test records are excluded by the database public-read policy.';
 i.limitations=(opts&&opts.limitations)||'Counts reflect reports currently present in Community Connect and are not official municipal-service statistics.';
 if(opts&&opts.units!==undefined)i.units=opts.units;
}
async function get(path){var r=await fetch(URL+'/rest/v1/'+path,{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'});if(!r.ok)throw new Error('Community public data unavailable');return r.json();}
async function hydrate(){
 if(!global.FTN||!global.FTN.indicators)return;
 try{
  var rows=await Promise.all([get('issues_public?select=case_number,community,status,created_at&order=created_at.desc&limit=1000'),get('issue_verification_counts?select=case_number,response,count')]);
  var issues=rows[0]||[],verification=rows[1]||[],resolved=issues.filter(function(x){return String(x.status).toLowerCase()==='resolved';}).length;
  var verifiedCases={};verification.forEach(function(x){if(Number(x.count)>0)verifiedCases[x.case_number]=true;});
  var byCommunity={};issues.forEach(function(x){var c=(x.community||'').trim();if(c)byCommunity[c]=(byCommunity[c]||0)+1;});
  var most=Object.keys(byCommunity).sort(function(a,b){return byCommunity[b]-byCommunity[a]||a.localeCompare(b);})[0]||'—';
  setMetric('community-reports-total',issues.length,{units:'reports'});
  setMetric('community-reports-verified',Object.keys(verifiedCases).length,{units:'reports',methodology:'Number of Community Connect cases with at least one public verification response in the current public verification-count view.'});
  setMetric('community-reports-resolved',resolved,{units:'reports'});
  setMetric('most-active-community',most,{units:'',methodology:'Community with the highest number of current non-test Community Connect reports. This describes activity in FTN, not population or need.'});
  // These two historical composite indicators have no defensible live formula yet; remove them instead of fabricating scores.
  global.FTN.indicators=global.FTN.indicators.filter(function(x){return x.id!=='community-participation'&&x.id!=='service-reliability';});
 }catch(e){removeUnverifiedCommunityIndicators();}
}
global.FTN=global.FTN||{};
global.FTN.communityMetricsReady=hydrate();
})(window);
