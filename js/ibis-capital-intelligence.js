// FTN Platform — ibis Caribbean Capital Intelligence: deterministic income-capital modelling.
// This module performs educational scenario math only. It does not fetch rates, choose products,
// or present regulated financial advice. Inputs must come from verified sources or the user.
(function(global){
  'use strict';
  function fail(code,message,meta){return Object.assign({success:false,errorType:code,reason:message},meta||{});}
  function planIncome(input){
    input=input||{};var M=global.FTN&&global.FTN.IbisMath;if(!M)return fail('MATH_KERNEL_UNAVAILABLE','FTN.IbisMath must be loaded first.');
    var monthly=Number(input.monthlyIncome),gross=Number(input.grossYieldPercent),tax=Number(input.taxOnYieldPercent||0),fees=Number(input.annualFeesPercent||0),inflation=input.inflationPercent==null?null:Number(input.inflationPercent);
    if(![monthly,gross,tax,fees].every(Number.isFinite)||(inflation!==null&&!Number.isFinite(inflation)))return fail('INVALID_INPUT','All supplied financial inputs must be finite numbers.');
    if(monthly<0)return fail('INVALID_INCOME_TARGET','Monthly income target cannot be negative.');if(gross<=0)return fail('INVALID_YIELD','Gross annual yield must be greater than zero.');if(tax<0||tax>100)return fail('INVALID_TAX_RATE','Tax on yield must be between 0% and 100%.');if(fees<0)return fail('INVALID_FEES','Annual fees cannot be negative.');
    var afterTaxGross=gross*(1-tax/100);var netNominal=afterTaxGross-fees;if(netNominal<=0)return fail('NON_POSITIVE_NET_YIELD','After tax and fees, net yield is not positive.',{netNominalYieldPercent:netNominal});
    var nominalCapital=M.requiredCapitalForIncome(monthly,netNominal,2);if(!nominalCapital.ok)return fail(nominalCapital.error,nominalCapital.message);
    var result={success:true,capability:'CAPITAL_INCOME_PLAN',monthlyIncomeTarget:monthly,annualIncomeTarget:monthly*12,grossYieldPercent:gross,taxOnYieldPercent:tax,annualFeesPercent:fees,netNominalYieldPercent:netNominal,capitalToPreserveNominalPrincipal:nominalCapital.value,capitalToPreservePurchasingPower:null,realNetYieldPercent:null,formula:{netNominalYield:'gross yield × (1 − tax rate) − annual fees',nominalCapital:'annual income target ÷ net nominal yield',realYield:'((1 + net nominal yield) ÷ (1 + inflation)) − 1',realCapital:'annual income target ÷ real net yield'},assumptions:['Yield is treated as a stable annual percentage for this static scenario.','Taxes are modelled only as the supplied percentage of yield; jurisdiction-specific tax rules are not inferred.','Fees are modelled as an annual percentage of capital.','No deposit insurance limit, liquidity constraint, FX risk, rate changes, sequence risk or product-specific restriction is included unless modelled separately.'],adviceStatus:'EDUCATIONAL_MODEL_NOT_REGULATED_ADVICE'};
    if(inflation!==null){var real=M.realReturn(netNominal,inflation,6);if(!real.ok)return fail(real.error,real.message);result.inflationPercent=inflation;result.realNetYieldPercent=real.value;if(real.value>0){var realCapital=M.requiredCapitalForIncome(monthly,real.value,2);result.capitalToPreservePurchasingPower=realCapital.ok?realCapital.value:null;}else{result.purchasingPowerWarning='Net real yield is zero or negative; this yield cannot fund the target indefinitely while preserving purchasing power under the stated inflation assumption.';}}
    return result;
  }
  function scenarios(input,yields){if(!Array.isArray(yields)||!yields.length)return fail('EMPTY_SCENARIOS','Provide at least one gross-yield scenario.');return{success:true,capability:'CAPITAL_INCOME_SCENARIOS',scenarios:yields.map(function(y){return planIncome(Object.assign({},input,{grossYieldPercent:y}));})};}
  global.FTN=global.FTN||{};global.FTN.IbisCapital={planIncome:planIncome,scenarios:scenarios};
})(typeof window!=='undefined'?window:globalThis);
