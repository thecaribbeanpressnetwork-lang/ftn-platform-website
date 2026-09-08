// FTN Platform — bridge verified Statistics results into ibis evidence-confidence assessment.
// Does not alter source data or query math. It adds a separate confidence object derived from
// existing provenance plus an explicit classification of FTN's current official statistical sources.
(function(global){
  'use strict';
  var OFFICIAL_SOURCE_IDS={
    'tt-cso-crime-historical':'OFFICIAL_PRIMARY',
    'tt-ttps-crime-current':'OFFICIAL_PRIMARY',
    'tt-cbtt-fx-monthly':'OFFICIAL_PRIMARY'
  };
  function sourceClass(result){var id=result&&result.source&&result.source.id;return OFFICIAL_SOURCE_IDS[id]||'UNKNOWN';}
  function enrich(result,options){
    if(!result||result.success!==true)return result;
    var Confidence=global.FTN&&global.FTN.IbisConfidence;
    if(!Confidence)return Object.assign({},result,{confidence:null,confidenceError:'IBIS_CONFIDENCE_NOT_LOADED'});
    var p=result.provenance||{};
    var claimType=result.calculation?'DERIVED_CALCULATION':'VERIFIED_FACT';
    var assessment=Confidence.assess({
      sourceClass:sourceClass(result),claimType:claimType,
      sourceReferenceDate:p.sourceReferenceDate||result.fact&&result.fact.sourceReferenceDate,
      retrievedAt:p.sourceRetrievedAt||result.fact&&result.fact.retrievedAt,
      independentSourceCount:result.source?1:0,
      sourceIdentity:p.sourceIdentity||result.source&&result.source.name,
      retrievalMethod:p.retrievalMethod||result.source&&result.source.accessMethod,
      degradedState:p.degradedState||null
    },options||{});
    return Object.assign({},result,{confidence:assessment});
  }
  global.FTN=global.FTN||{};global.FTN.IbisStatisticsConfidence={enrich:enrich,sourceClass:sourceClass};
})(typeof window!=='undefined'?window:globalThis);
