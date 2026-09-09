// FTN Platform — Headspace Scout Network truth-state.
// Separates configured discovery sources, scheduled automation and observed workflow execution.
// It never implies that every named scout lens is a separate running process, and it never
// authorizes applications, spending or other consequential actions.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  var REGISTRY_URL='/data/scout-2-source-registry.json';
  var RUNS_URL='https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/actions/runs?event=schedule&per_page=20';
  var WORKFLOW_NAME='FTN Scout 2.0';
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
  function findRun(payload){
    var rows=payload&&Array.isArray(payload.workflow_runs)?payload.workflow_runs:[];
    return rows.find(function(run){return run&&run.name===WORKFLOW_NAME&&run.event==='schedule';})||null;
  }
  function runText(run){
    if(!run)return'latest scheduled run not observable from this browser';
    if(run.status==='in_progress'||run.status==='queued')return'run #'+run.run_number+' is '+run.status.replace('_',' ')+' now';
    var when=run.run_started_at||run.created_at||run.updated_at;
    var stamp=when?new Date(when).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'time unavailable';
    if(run.status==='completed')return'latest observed run #'+run.run_number+' '+(run.conclusion||'completed')+' · '+stamp;
    return'latest observed run #'+run.run_number+' · '+run.status;
  }
  async function refresh(){
    var target=node();
    if(!target||typeof global.fetch!=='function')return null;
    target.textContent='Checking Scout 2.0 registry and schedule state. Automatic applications and spend remain disabled.';
    try{
      var registry=await fetchJson(REGISTRY_URL,5000);
      var sources=Array.isArray(registry.sources)?registry.sources:[];
      var guards=policyText(registry.policy);
      var run=null,runError=null;
      try{run=findRun(await fetchJson(RUNS_URL,5000));}catch(error){runError=error;}
      target.textContent='Scout 2.0: '+sources.length+' official discovery sources configured · '+SCHEDULE_LABEL+' · '+runText(run)+'.'+(guards?' Safety: '+guards+'.':'')+(runError?' GitHub run history could not be refreshed; schedule/source state is still verified locally.':'');
      target.dataset.health=run&&run.status==='completed'&&run.conclusion==='success'?'healthy':run&&run.status==='in_progress'?'running':'configured';
      target.dataset.sourceCount=String(sources.length);
      target.dataset.latestRun=run?String(run.run_number||''):'';
      target.dataset.latestConclusion=run?String(run.conclusion||run.status||''):'';
      return{registry:registry,latestRun:run,runHistoryError:runError&&String(runError.message||runError)};
    }catch(error){
      target.textContent='Scout state could not be verified. ibis will not claim a scout is running. Automatic applications and spend remain disabled.';
      target.dataset.health='unverified';
      return null;
    }
  }
  FTN.HeadspaceScoutHealth={refresh:refresh,findRun:findRun,runText:runText};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
    else refresh();
  }
})(typeof window!=='undefined'?window:globalThis);
