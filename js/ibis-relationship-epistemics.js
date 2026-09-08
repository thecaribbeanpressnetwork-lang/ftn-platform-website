// FTN Platform — conservative epistemic interpretation of relationship records.
// Source authority and relationship causality are orthogonal. An Official/Verified source may prove
// the observations came from an authority; it does NOT by itself prove the relationship is causal.
(function(global){
  'use strict';
  var TYPES={OBSERVED_CORRELATION:'Observed correlation',TEMPORAL_SEQUENCE:'Temporal sequence',KNOWN_RELATIONSHIP:'Known relationship',POSSIBLE_CONTRIBUTOR:'Possible contributor',HYPOTHESIS:'Hypothesis',PREDICTIVE_SIGNAL:'Predictive signal',CONFIRMED_CAUSAL:'Confirmed causal relationship'};
  function classify(r){r=r||{};if(r.evidenceType&&TYPES[r.evidenceType])return r.evidenceType;if(r.type==='parent-child'||r.type==='dependency')return'KNOWN_RELATIONSHIP';if(r.type==='causal'&&r.causalEvidence===true)return'CONFIRMED_CAUSAL';if(r.type==='temporal')return'TEMPORAL_SEQUENCE';if(r.type==='predictive'&&r.outOfSampleValidated===true)return'PREDICTIVE_SIGNAL';if(r.type==='correlation'&&['High','Medium'].includes(r.confidence))return'OBSERVED_CORRELATION';if(r.confidence==='Low')return'POSSIBLE_CONTRIBUTOR';return'HYPOTHESIS';}
  function describe(r){var t=classify(r);return{evidenceType:t,label:TYPES[t],causal:t==='CONFIRMED_CAUSAL',sourceAuthority:r&&r.classification||null,warning:t==='CONFIRMED_CAUSAL'?null:'This relationship should not be interpreted as causal unless separate causal evidence is supplied.'};}
  global.FTN=global.FTN||{};global.FTN.IbisRelationshipEpistemics={TYPES:TYPES,classify:classify,describe:describe};
})(typeof window!=='undefined'?window:globalThis);
