// FTN Platform Website — Integration Adapter Layer.
// Shared seam for local workspace saves and consequential FTN transactions.
(function (global) {
  'use strict';
  var TRANSACTION_ENDPOINT='/api/transactions';
  function storage(){return (global.FTN&&global.FTN.storage)||null;}
  function id(){return 'FTN-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,8).toUpperCase();}
  function localSave(toolId,record){var s=storage(),key='ftn-submission-'+toolId;if(s){var existing=s.getJSON(key,[]);existing.push(record);s.setJSON(key,existing);}}
  function submit(toolId,payload,options){options=options||{};var consequential=!!options.transaction;var record={transactionId:consequential?id():null,toolId:toolId,submittedAt:new Date().toISOString(),payload:payload};
    if(!consequential){localSave(toolId,record);return Promise.resolve({ok:true,message:'Saved on this device.',record:record,delivery:'local'});}
    var email=(payload&&payload.email||'').trim();if(!email||!/^\S+@\S+\.\S+$/.test(email))return Promise.resolve({ok:false,message:'A valid email address is required for this transaction.',record:record,delivery:'blocked'});
    if(!payload.authorityConfirmed)return Promise.resolve({ok:false,message:'Confirm that you have authority to make this submission.',record:record,delivery:'blocked'});
    var turnstileToken=(options.turnstileToken||'').trim();if(!turnstileToken)return Promise.resolve({ok:false,message:'Complete the human verification before submitting.',record:record,delivery:'blocked'});
    return fetch(TRANSACTION_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin',body:JSON.stringify({transactionId:record.transactionId,toolId:toolId,submittedAt:record.submittedAt,payload:payload,turnstileToken:turnstileToken})}).then(function(response){return response.json().catch(function(){return{};}).then(function(body){if(!response.ok)throw new Error(body.message||'Transaction could not be accepted.');record.server=body;localSave(toolId,record);return{ok:true,message:body.message||'FTN received your transaction for review.',record:record,delivery:'server'};});}).catch(function(error){return{ok:false,message:error.message||'FTN could not securely receive this transaction. Your work remains on this device.',record:record,delivery:'failed'};});
  }
  function history(toolId){var s=storage();return s?s.getJSON('ftn-submission-'+toolId,[]):[];}
  global.FTN=global.FTN||{};global.FTN.IntegrationAdapter={submit:submit,history:history,transactionEndpoint:TRANSACTION_ENDPOINT};
})(window);
