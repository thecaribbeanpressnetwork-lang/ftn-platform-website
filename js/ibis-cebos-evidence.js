// CEBOS evidence adapter over FTN.SourceProvenance. This deliberately reuses the existing source
// gateway and source-class vocabulary; it adds decision/discovery semantics and temporal fields
// without creating a competing provenance system.
(function(global){
  'use strict';
  var AUTHORITY={PRIMARY_EVIDENCE:100,OFFICIAL_GOVERNMENT:95,LEGISLATION_PUBLIC_RECORD:95,ACADEMIC:85,REPUTABLE_JOURNALISM:75,CORPORATE_STATEMENT:60,COMMUNITY_DISCUSSION:35,CREATOR_SOCIAL:30,PERSONAL_COMMENTARY:20,MARKETING_ADVOCACY:10,UNKNOWN:0};
  var DISCOVERY={PRIMARY_EVIDENCE:85,OFFICIAL_GOVERNMENT:70,LEGISLATION_PUBLIC_RECORD:65,ACADEMIC:65,REPUTABLE_JOURNALISM:80,CORPORATE_STATEMENT:75,COMMUNITY_DISCUSSION:80,CREATOR_SOCIAL:85,PERSONAL_COMMENTARY:60,MARKETING_ADVOCACY:45,UNKNOWN:20};
  var STATUS=['VERIFIED','CORROBORATED','STRONG_INFERENCE','WORKING_INFERENCE','MODEL_ASSUMPTION','SPECULATIVE_LEAD','CONTRADICTED','UNRESOLVED'];
  var TRACE_STATUS=['FOUND','ABSENT_AFTER_SEARCH','CONTRADICTED','NOT_YET_SEARCHED','INACCESSIBLE'];
  function scores(sourceClass){sourceClass=AUTHORITY[sourceClass]===undefined?'UNKNOWN':sourceClass;return{discoveryUtility:DISCOVERY[sourceClass],decisionAuthority:AUTHORITY[sourceClass]};}
  function normalizeStatus(value){return STATUS.indexOf(value)>=0?value:'UNRESOLVED';}
  function evidenceRecord(input){
    input=input||{};var base=global.FTN&&global.FTN.SourceProvenance&&global.FTN.SourceProvenance.sourceRecord?global.FTN.SourceProvenance.sourceRecord(input):input;
    var sc=scores(base.sourceClass||'UNKNOWN');
    return Object.assign({},base,{
      claim:input.claim||null,
      evidenceStatus:normalizeStatus(input.evidenceStatus||input.status),
      discoveryUtility:Number.isFinite(input.discoveryUtility)?input.discoveryUtility:sc.discoveryUtility,
      decisionAuthority:Number.isFinite(input.decisionAuthority)?input.decisionAuthority:sc.decisionAuthority,
      eventTime:input.eventTime||null,
      recordTime:input.recordTime||base.publishedAt||null,
      actorAccessTime:input.actorAccessTime||null,
      contradictions:Array.isArray(input.contradictions)?input.contradictions.slice():[],
    });
  }
  function expectedTrace(hypothesis,trace,status){return{hypothesis:String(hypothesis||''),trace:String(trace||''),status:TRACE_STATUS.indexOf(status)>=0?status:'NOT_YET_SEARCHED',evidenceIds:[]};}
  function promoteClaim(records){
    records=Array.isArray(records)?records:[];if(!records.length)return{status:'UNRESOLVED',reason:'No evidence supplied'};
    if(records.some(function(r){return r.evidenceStatus==='CONTRADICTED';})&&records.some(function(r){return r.evidenceStatus==='VERIFIED'||r.evidenceStatus==='CORROBORATED';}))return{status:'UNRESOLVED',reason:'Material contradiction remains'};
    var official=records.filter(function(r){return(r.decisionAuthority||0)>=95;});if(official.length)return{status:'VERIFIED',reason:'Authoritative evidence present'};
    var strong=records.filter(function(r){return(r.decisionAuthority||0)>=75;}),owners={};strong.forEach(function(r,i){owners[r.owner||r.publisher||r.platform||r.url||('s'+i)]=true;});if(Object.keys(owners).length>=2)return{status:'CORROBORATED',reason:'Independent high-authority sources corroborate'};
    if(strong.length)return{status:'WORKING_INFERENCE',reason:'One strong source; further corroboration preferred'};
    return{status:'SPECULATIVE_LEAD',reason:'Discovery evidence only; not decision-grade'};
  }
  global.FTN=global.FTN||{};global.FTN.CebosEvidence={STATUS:STATUS.slice(),TRACE_STATUS:TRACE_STATUS.slice(),scores:scores,evidenceRecord:evidenceRecord,expectedTrace:expectedTrace,promoteClaim:promoteClaim};
})(typeof window!=='undefined'?window:globalThis);
