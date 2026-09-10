// FTN Platform — IBIS investor handoff guards.
// Inadequate or unconnected public actions must explain the next step instead of pretending to execute.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  function one(sel){return document.querySelector(sel)}
  function card(name){return document.querySelector('[data-thought="'+name+'"]')}
  function setText(sel,text){var el=one(sel);if(el)el.textContent=text}
  function setHTML(sel,html){var el=one(sel);if(el)el.innerHTML=html}
  function focus(names){if(FTN.HeadspaceFabric&&typeof FTN.HeadspaceFabric.focus==='function')FTN.HeadspaceFabric.focus(names);else names.forEach(function(n){var c=card(n);if(c)c.classList.remove('dematerialized','hs-minimized')});}
  function note(title,body){return '<div class="ibis-handoff-note"><strong>'+title+'</strong><small>'+body+'</small></div>'}
  function explain(title,body,next){
    setText('[data-thought="answer"] h2',title);
    setHTML('[data-thought="answer"] p',body+note('Investor truth boundary',next));
    setText('[data-thought="explain"] h3','Why IBIS is using a handoff');
    setHTML('[data-thought="explain"] .reason-list','<li><strong>Capability gate</strong><span>The public page only claims actions that are connected, permissioned and testable.</span></li><li><strong>Execution safety</strong><span>Account, browser, device, payment, publishing and scouting actions require an authorized adapter before execution.</span></li><li><strong>Useful next step</strong><span>IBIS prepares the brief, package, route or checklist so the user can continue without a false success state.</span></li>');
    focus(['answer','explain','tools']);
  }
  function toolHandoff(kind){
    var title='Handoff prepared.';
    var body='IBIS has identified an action that needs a connected adapter before public execution.';
    var next='Connect the required service, approve the requested permission, then retry the action. Until then, IBIS will prepare the package and fail closed.';
    if(kind==='api'){title='API connection requires owner approval.';body='IBIS can list the required API, secret, scope, expected output and test route, but it will not connect an API from the public demo without owner authorization.';next='Use this as an investor-safe signal: the tool fabric is designed for governed connection, not blind access.';}
    if(kind==='link'){title='Current-link analysis needs browser permission.';body='IBIS can analyze a shared link only when the browser or user supplies page content. The public site cannot silently read private tabs.';next='Paste the link or connect the browser companion. IBIS will then summarize with source and permission labels.';}
    if(kind==='file'){title='File intake is local and permission-bound.';body='IBIS can work with a user-provided file when the browser supplies it. It will not claim access to private drives or attachments that were not uploaded.';next='Upload a text-compatible file or connect an approved drive adapter; IBIS will preserve source and provenance labels.';}
    if(kind==='agent'){title='Agent handoff needs a connected destination.';body='IBIS can prepare an agent task brief, acceptance criteria and evidence package. Sending it requires a connected destination such as GitHub, Slack, Gmail, Drive or another approved tool.';next='Until a destination is connected, IBIS shows the handoff package rather than pretending the agent received it.';}
    setText('#toolStatus',title+' '+body);
    explain(title,body,next);
  }
  function scoutHandoff(){
    setText('#scoutStatus','Scout launch is staged, not running. It requires an approved source, cadence and permission.');
    explain('Scout launch requires source and cadence approval.','IBIS can define what the scout should watch, what counts as a meaningful change, and how results should be scored. It will not claim a scout is running until an automation or source adapter is active.','For investor demo purposes, this proves the governance model: opportunity, price, policy, media and place scouts are available as designed workflows, but execution is permission-gated.');
    focus(['answer','scouts','explain','tools']);
  }
  function deviceHandoff(){
    explain('Device control requires a supported local adapter.','IBIS can map a DJ, USB, mixer or phone-data workflow, but the public website cannot control hardware without a local bridge, browser permission and compatible device interface.','IBIS should show the device plan and adapter requirements, not pretend hardware is connected.');
    focus(['answer','device','tools','explain']);
  }
  function moneyHandoff(){
    explain('Payment or purchase action requires an approved payment rail.','IBIS can prepare the invoice, payment checklist, vendor due-diligence steps and account-routing plan. It will not execute payments, purchases or transfers from the investor demo.','This protects founder control, account safety and auditability while still showing operational execution logic.');
  }
  function publishHandoff(){
    explain('Publishing requires account authorization.','IBIS can prepare metadata, captions, descriptions, files, tags and release notes. It will not publish to YouTube, social platforms, GitHub, Cloudflare, email or app stores without a connected authorized account.','The investor demo should show the publishing package and the required approval boundary.');
  }
  function classify(text){var q=String(text||'').toLowerCase();if(/\b(pay|purchase|buy|transfer|card|bank|invoice|checkout)\b/.test(q))return'money';if(/\b(publish|post|send email|email|upload to youtube|deploy|submit|ship|push live)\b/.test(q))return'publish';if(/\b(device|usb|mixer|deck|phone|camera|microphone|printer|hardware)\b/.test(q))return'device';if(/\b(launch|run|monitor|watch)\b/.test(q)&&/\b(scout|source|opportunity|price|policy|news)\b/.test(q))return'scout';return'';}
  function attach(){
    document.querySelectorAll('[data-tool]').forEach(function(btn){if(btn.dataset.ibisHandoffGuard)return;btn.dataset.ibisHandoffGuard='true';btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();toolHandoff(btn.dataset.tool);},true);});
    document.querySelectorAll('[data-launch-scout]').forEach(function(btn){if(btn.dataset.ibisHandoffGuard)return;btn.dataset.ibisHandoffGuard='true';btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();scoutHandoff();},true);});
    var form=one('#inputOrbit'),input=one('#headspaceQuery');
    if(form&&input&&!form.dataset.ibisInvestorHandoffGuard){form.dataset.ibisInvestorHandoffGuard='true';form.addEventListener('submit',function(e){var kind=classify(input.value);if(!kind)return;e.preventDefault();e.stopImmediatePropagation();if(kind==='money')moneyHandoff();else if(kind==='publish')publishHandoff();else if(kind==='device')deviceHandoff();else if(kind==='scout')scoutHandoff();},true);}
  }
  function init(){attach();setTimeout(attach,400);setTimeout(attach,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
