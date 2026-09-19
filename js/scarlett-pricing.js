(function(global){'use strict';
var status=document.getElementById('scarlett-tier-status');
var PLANS=[{planId:'scarlett-plus-monthly',tier:'PLUS',buttonId:'scarlett-checkout-plus'},{planId:'ftn-intelligence-monthly',tier:'INTELLIGENCE',buttonId:'scarlett-checkout-intelligence'},{planId:'ftn-pro-monthly',tier:'PRO',buttonId:'scarlett-checkout-pro'}];
function show(message,tone){status.textContent=message;status.dataset.tone=tone||'';}
function markCurrent(tier){document.querySelectorAll('[data-tier-card]').forEach(function(card){card.classList.toggle('sp-plan--current',card.dataset.tierCard===tier);});}
async function checkout(planId,button){
  var originalText=button.textContent;button.disabled=true;button.textContent='Preparing secure WAM checkout…';
  try{
    var body={action:'checkout',planId:planId};
    var acq=global.FTN.ScarlettAcquisition&&global.FTN.ScarlettAcquisition.read();
    if(acq)body.acquisition=acq;
    var aid=new URLSearchParams(location.search).get('aid');
    if(aid&&/^[0-9a-f-]{36}$/i.test(aid))body.anonymousInstallId=aid;
    var result=await global.FTN.Auth.invoke('ftn-scarlett-billing',body);
    if(!result||!/^https:\/\/(staging\.)?billing\.wam\.money\/pay\//.test(result.checkoutUrl||''))throw new Error('Invalid checkout destination');
    location.assign(result.checkoutUrl);
  }catch(e){
    show((e&&e.message)||'WAM checkout is not connected yet. No charge was created.','error');
    button.disabled=false;button.textContent=originalText;
  }
}
async function boot(){
  var params=new URLSearchParams(location.search);
  if(params.get('checkout')==='return')show('Checkout finished at WAM. Your plan updates once WAM’s signed confirmation arrives — this can take a minute. Reload to check.','');
  try{
    var user=await global.FTN.Auth.getVerifiedUser();
    if(!user){
      show('Free is active · Sign in before upgrading');
      markCurrent('FREE');
      PLANS.forEach(function(p){var b=document.getElementById(p.buttonId);if(!b)return;b.textContent='Sign in to upgrade';b.onclick=function(){global.FTN.Auth.rememberReturn('/scarlett/pricing/');location.assign('/account/?return=/scarlett/pricing/');};});
      return;
    }
    var access=await global.FTN.Auth.invoke('ftn-scarlett-billing',{action:'status'});
    var tier=access&&access.tier;
    if(tier&&access.status==='ACTIVE'){
      show((tier==='PLUS'?'Scarlett+':tier==='INTELLIGENCE'?'FTN Intelligence':'FTN Pro')+' active until '+new Date(access.endsAt).toLocaleDateString(),'success');
      markCurrent(tier);
    }else{
      show('Free is active · upgrade any time');
      markCurrent('FREE');
    }
    PLANS.forEach(function(p){
      var button=document.getElementById(p.buttonId);if(!button)return;
      if(tier===p.tier&&access.status==='ACTIVE')button.textContent='Extend by 30 days';
      button.onclick=function(){checkout(p.planId,button);};
    });
  }catch(e){
    show('Access status is temporarily unavailable. No payment has been attempted.','error');
    PLANS.forEach(function(p){var b=document.getElementById(p.buttonId);if(b)b.disabled=true;});
  }
}
boot();
})(window);
