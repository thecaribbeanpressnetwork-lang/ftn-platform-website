// FTN Platform — Headspace Scout Network truth-state.
// Separates configured discovery sources, scheduled automation and observed workflow execution.
// It never implies that every named scout lens is a separate running process, and it never
// authorizes applications, spending or other consequential actions.
//
// Investor-hardening fix (2026-09-19): this module used to call GitHub's own Actions REST API
// (the "list workflow runs" endpoint) DIRECTLY FROM THE BROWSER, unauthenticated, to learn whether
// the last scheduled Scout 2.0 run succeeded. Under ordinary investor-demo traffic
// this hit GitHub's public rate limit and produced a hard console error on every page load -- a
// browser logs a failed HTTP response as a console error regardless of whether application code
// catches the resulting rejected promise, so no amount of try/catch here could ever have fixed it.
// Headspace must not depend on public GitHub API quota for ordinary UI health (see the Phase 6
// Headspace-hardening directive). The fix is architectural: .github/workflows/scout-2.yml -- the
// one place that genuinely knows its own run outcome, for free, via built-in workflow context --
// now writes that status to data/scout-status.json, an FTN-controlled, same-origin static file
// this module reads instead. No GitHub token is or was ever exposed client-side either way.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  var REGISTRY_URL='/data/scout-2-source-registry.json';
  var STATUS_URL='/data/scout-status.json';
  var SCHEDULE_LABEL='daily at 06:30 Trinidad & Tobago time';

  function node(){return typeof document!=='undefined'?document.getElementById('scoutStatus'):null;}
  function fetchJson(url,timeout){
    var controller=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=controller?setTimeout(function(){controller.abort();},timeout||5000):null;
    return global.fetch(url,{headers:{Accept:'application/json'},signal:controller&&controller.signal}).then(function(response){
      if(timer)clearTimeout(timer);
      if(!response.ok)throw new Error('HTTP '+response.status);
      return response.json();
    },function(error){if(timer)clearTimeout(timer);throw error;});
  }
  function policyText(policy){
    policy=policy||{};
    var guards=[];
    if(policy.paidApis===false)guards.push('paid APIs off');
    if(policy.automaticApplications===false)guards.push('automatic applications off');
    if(policy.automaticSpend===false)guards.push('automatic spend off');
    if(policy.founderApprovalRequired===true)guards.push('founder approval required');
    return guards.join(' · ');
  }
  // Consumes data/scout-status.json's shape directly -- no filtering/lookup needed (unlike the old
  // GitHub Actions runs list, this file is already scoped to exactly one workflow) and no live
  // "in_progress"/"queued" state is representable this way (the workflow only writes this file once
  // it has already finished, via its own `if: always()` step) -- a real, disclosed trade-off of
  // moving from live polling to a static, always-available artifact. "Latest observed" language is
  // kept literal about that: this reports the last COMPLETED run, never a claim of live monitoring.
  function runText(status){
    if(!status||!status.runNumber)return'latest scheduled run not yet reported';
    var when=status.updatedAt;
    var stamp=when?new Date(when).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'time unavailable';
    // Kept as the literal GitHub Actions job-status word ("success"/"failure"/"cancelled") -- the
    // exact same vocabulary GitHub's own API used to hand back as `conclusion`, so this reads no
    // differently than the previous GitHub-API-driven sentence ever did.
    return'latest observed run #'+status.runNumber+' '+(status.status||'completed')+' · '+stamp;
  }
  async function refresh(){
    var target=node();
    if(!target||typeof global.fetch!=='function')return null;
    target.textContent='Checking Scout 2.0 registry and schedule state. Automatic applications and spend remain disabled.';
    try{
      var registry=await fetchJson(REGISTRY_URL,5000);
      var sources=Array.isArray(registry.sources)?registry.sources:[];
      var guards=policyText(registry.policy);
      var status=null,statusError=null;
      try{status=await fetchJson(STATUS_URL,5000);}catch(error){statusError=error;}
      // Item 4: never claim "healthy" when the run status itself could not be confirmed -- an
      // honest degraded sentence, not a broken-looking UI and not a silent "healthy" guess.
      var statusSentence=statusError?'Scout run status could not be confirmed; schedule/source configuration is still verified locally.':runText(status)+'.';
      target.textContent='Scout 2.0: '+sources.length+' official discovery sources configured · '+SCHEDULE_LABEL+' · '+statusSentence+(guards?' Safety: '+guards+'.':'');
      target.dataset.health=statusError?'unverified':(status&&status.status==='success')?'healthy':(status&&status.runNumber)?'attention':'configured';
      target.dataset.sourceCount=String(sources.length);
      target.dataset.latestRun=status&&status.runNumber?String(status.runNumber):'';
      target.dataset.latestConclusion=status&&status.status?String(status.status):'';
      return{registry:registry,latestStatus:status,statusError:statusError&&String(statusError.message||statusError)};
    }catch(error){
      target.textContent='Scout state could not be verified. ibis will not claim a scout is running. Automatic applications and spend remain disabled.';
      target.dataset.health='unverified';
      return null;
    }
  }
  FTN.HeadspaceScoutHealth={refresh:refresh,runText:runText};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
    else refresh();
  }
})(typeof window!=='undefined'?window:globalThis);
