// FTN Platform — Universal Question Router v1.
// Topic-agnostic front door: classify cognition/action, suggest specialist capabilities, and always
// retain a TEXT fallback so unfamiliar subjects remain answerable instead of becoming unsupported.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  var RULES=[
    {re:/\b(latest|current|today|now|this week|breaking|recent|price|weather|news)\b/i,ops:['RESEARCH','VERIFY'],caps:['LIVE_INTELLIGENCE']},
    {re:/\b(calculate|how much|percent|interest|yield|mortgage|roi|return|principal|budget)\b/i,ops:['CALCULATE'],caps:['CAPITAL_SCENARIO']},
    {re:/\b(compare|versus|vs\.?|better off|difference between)\b/i,ops:['COMPARE'],caps:[]},
    {re:/\b(correlat|relationship between|move together|associated with)\b/i,ops:['CORRELATE'],caps:['CORRELATION_ANALYSIS']},
    {re:/\b(connected to|links? to|context graph|relationship graph)\b/i,ops:['CONNECT','EXPLAIN'],caps:['CONTEXT_GRAPH_QUERY']},
    {re:/\b(what.*next|prepare for|anticipate|coming next|foresight|watch for)\b/i,ops:['PREDICT','WATCH'],caps:['FORESIGHT_GENERATE']},
    {re:/\b(opportunit|grant|tender|job|funding|accelerator|procurement)\b/i,ops:['MATCH','RESEARCH'],caps:['OPPORTUNITY_MATCH']},
    {re:/\b(remember|save this|keep this|my preference|i prefer|don't forget)\b/i,ops:['REMEMBER'],caps:[]},
    {re:/\b(recall|bring back|what did i|last time|previously)\b/i,ops:['RECALL'],caps:[]},
    {re:/\b(imagine|what if|scenario|hypothetical|suppose)\b/i,ops:['IMAGINE'],caps:[]},
    {re:/\b(explain|why|evidence|source|prove|confidence)\b/i,ops:['EXPLAIN','VERIFY'],caps:[]},
    {re:/\b(code|build|debug|deploy|website|app|database|api|github|supabase|test)\b/i,ops:['CREATE','ACT'],agents:['ENGINEERING']},
    {re:/\b(marketing|campaign|ad\b|brand|audience|conversion|seo|social content)\b/i,ops:['CREATE','ACT'],agents:['MARKETING']},
    {re:/\b(email|message|reply|contact|announce|press|post|send)\b/i,ops:['CREATE','ACT'],agents:['COMMS']},
    {re:/\b(schedule|book|apply|submit|purchase|buy|install|open|connect|upload|delete|move file|run this)\b/i,ops:['ACT'],agents:['OPS']},
    {re:/\b(strategy|plan|business model|go to market|prioritize|decision)\b/i,ops:['PLAN','COMPARE'],agents:['STRATEGY']}
  ];
  function uniq(a){return Array.from(new Set(a));}
  function sideEffect(text){if(/\b(send|submit|apply|purchase|buy|delete|install|deploy|publish|post|transfer|book|cancel)\b/i.test(text))return'EXTERNAL';if(/\b(open|connect|upload|move|rename|draft|prepare|create file)\b/i.test(text))return'REVERSIBLE';return'READ_ONLY';}
  function epistemic(text,ops){if(/\b(imagine|hypothetical|what if|suppose)\b/i.test(text))return'IMAGINATION';if(/\b(predict|forecast|will|coming next|anticipate)\b/i.test(text)||ops.indexOf('PREDICT')>=0)return'PREDICTION';if(/\b(current|latest|today|now|live)\b/i.test(text))return'CURRENT_FACT_REQUIRED';if(ops.indexOf('CALCULATE')>=0)return'DERIVED_OR_SCENARIO';return'GENERAL';}
  function route(input,context){var text=String(input||'').trim();if(!text)return{success:false,errorType:'EMPTY_INPUT'};var ops=['ANSWER'],caps=['TEXT'],agents=[],matched=[];RULES.forEach(function(r,i){if(r.re.test(text)){matched.push(i);ops=ops.concat(r.ops||[]);caps=caps.concat(r.caps||[]);agents=agents.concat(r.agents||[]);}});if(!agents.length)agents.push('GENERAL');if(ops.some(function(x){return ['PLAN','COMPARE','PREDICT','MATCH','RESEARCH'].indexOf(x)>=0;})&&agents.indexOf('STRATEGY')<0)agents.unshift('STRATEGY');var se=sideEffect(text);if(se!=='READ_ONLY'&&agents.indexOf('OPS')<0)agents.push('OPS');return{success:true,input:text,operations:uniq(ops),capabilityCandidates:uniq(caps),agents:uniq(agents),sideEffect:se,epistemicMode:epistemic(text,ops),requiresPermission:se==='EXTERNAL',matchedRules:matched,contextHints:{hasAttachments:!!(context&&context.attachments&&context.attachments.length),hasSelectedThought:!!(context&&context.selectedThought),hasPersonalContext:!!(context&&context.personalContext&&context.personalContext.length)},fallbackCapability:'TEXT'};}
  function canAlwaysAttempt(input){return !!String(input||'').trim();}
  FTN.UniversalRouter={route:route,canAlwaysAttempt:canAlwaysAttempt,RULE_COUNT:RULES.length};
})(typeof window!=='undefined'?window:globalThis);
