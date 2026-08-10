// FTN Platform Website — Integration Adapter Layer.
// Local workspace saves stay in-browser. Consequential submissions go through the
// FTN-owned Supabase Edge Function, Turnstile verification, and durable transaction table.
(function (global) {
  'use strict';
  var TRANSACTION_ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-transactions';
  function storage(){return (global.FTN&&global.FTN.storage)||null;}
  function localSave(toolId,record){var s=storage(),key='ftn-submission-'+toolId;if(s){var existing=s.getJSON(key,[]);existing.push(record);s.setJSON(key,existing);}}
  function pick(obj,keys){for(var i=0;i<keys.length;i++){var v=obj&&obj[keys[i]];if(v!=null&&String(v).trim())return String(v).trim();}return'';}
  function submit(toolId,payload,options){
    options=options||{};var consequential=!!options.transaction;var record={transactionId:null,toolId:toolId,submittedAt:new Date().toISOString(),payload:payload};
    if(!consequential){localSave(toolId,record);return Promise.resolve({ok:true,message:'Saved on this device.',record:record,delivery:'local'});}
    var email=pick(payload,['email','clientEmail']);if(!email||!/^\S+@\S+\.\S+$/.test(email))return Promise.resolve({ok:false,message:'A valid email address is required for this transaction.',record:record,delivery:'blocked'});
    if(!payload||payload.authorityConfirmed!==true)return Promise.resolve({ok:false,message:'Confirm that you have authority to make this submission.',record:record,delivery:'blocked'});
    var turnstileToken=(options.turnstileToken||'').trim();if(!turnstileToken)return Promise.resolve({ok:false,message:'Complete the human verification before submitting.',record:record,delivery:'blocked'});
    var body={
      client_email:email,
      tool_id:toolId,
      transaction_type:options.transactionType||pick(payload,['recordType','transactionType'])||toolId,
      authority_confirmed:true,
      turnstile_token:turnstileToken,
      creator_name:pick(payload,['artist','name','creatorName','host']),
      work_title:pick(payload,['release','title','workTitle','headline']),
      country:pick(payload,['country','territory','countryContext']),
      route:global.location?global.location.pathname:'',
      payload:payload,
      legal_version:'2026-08-10'
    };
    return fetch(TRANSACTION_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)}).then(function(response){return response.json().catch(function(){return{};}).then(function(result){if(!response.ok)throw new Error(result.error||result.message||'Transaction could not be accepted.');record.transactionId=result.transaction_id||null;record.server=result;localSave(toolId,record);return{ok:true,message:'FTN received your transaction for founder review.',record:record,delivery:'server'};});}).catch(function(error){return{ok:false,message:error.message||'FTN could not securely receive this transaction. Your work remains on this device.',record:record,delivery:'failed'};});
  }
  function history(toolId){var s=storage();return s?s.getJSON('ftn-submission-'+toolId,[]):[];}
  global.FTN=global.FTN||{};global.FTN.IntegrationAdapter={submit:submit,history:history,transactionEndpoint:TRANSACTION_ENDPOINT};
})(window);
