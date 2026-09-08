// FTN Platform — materialize existing FTN Live modelled clocks inside ibis Headspace.
// Reuses the SAME indicator registry + LiveClocks computation path as FTN Live. Nothing is copied
// into a static value; the Presentation layer retains refresh() and labels it LIVE MODEL.
(function(global){
  'use strict';
  var form=document.getElementById('inputOrbit'),input=document.getElementById('headspaceQuery'),hint=document.getElementById('commandHint');
  var loads={};
  function load(src,test){if(test())return Promise.resolve();if(loads[src])return loads[src];loads[src]=new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.onload=function(){test()?resolve():reject(new Error('Capability did not register: '+src));};s.onerror=function(){reject(new Error('Could not load '+src));};document.head.appendChild(s);});return loads[src];}
  async function ensure(){
    await load('/js/source-registry.js',function(){return !!(global.FTN&&global.FTN.Sources);});
    await load('/js/indicators-data.js',function(){return !!(global.FTN&&Array.isArray(global.FTN.indicators));});
    await load('/js/live-clocks.js',function(){return !!(global.FTN&&global.FTN.LiveClocks);});
    await load('/js/charts.js',function(){return !!(global.FTN&&global.FTN.Charts);});
    await load('/js/ibis-presentation.js',function(){return !!(global.FTN&&global.FTN.IbisPresentation);});
    await load('/js/ibis-live-surface-adapters.js',function(){return !!(global.FTN&&global.FTN.IbisLiveAdapters);});
  }
  function relevant(text){return /\b(live population|population now|population counter|budget progress|budget year progress|fiscal year progress|live model)\b/i.test(text||'');}
  function choose(text){var id=/budget|fiscal/i.test(text||'')?'budget-progress':'population';return (global.FTN.indicators||[]).filter(function(x){return x.id===id;})[0]||null;}
  function reveal(name){var el=document.querySelector('[data-thought="'+name+'"]');if(el){el.classList.remove('dematerialized');el.classList.add('materializing');setTimeout(function(){el.classList.remove('materializing');},760);}return el;}
  var activeStop=null;
  async function run(text){
    try{
      await ensure();var indicator=choose(text);if(!indicator){if(hint)hint.textContent='No matching FTN Live model is registered; ibis did not invent one.';return;}
      var adapted=global.FTN.IbisLiveAdapters.fromLiveClock(indicator,{refreshMs:1000});if(!adapted.success){if(hint)hint.textContent='The requested FTN surface could not be adapted safely: '+adapted.reason;return;}
      var card=reveal('graph');if(!card)return;var label=card.querySelector('.thought-bar>span');if(label)label.textContent='FTN LIVE · '+indicator.title.toUpperCase();
      var mount=card.querySelector('[data-viz-mount]');if(!mount){mount=document.createElement('div');mount.dataset.vizMount='';card.appendChild(mount);}if(activeStop){activeStop();activeStop=null;}
      var rendered=global.FTN.IbisPresentation.render(mount,adapted.spec);if(!rendered.success){if(hint)hint.textContent='Presentation Intelligence refused the live object: '+rendered.reason;return;}activeStop=rendered.stop;
      var answer=reveal('answer');if(answer){answer.querySelector('.thought-bar>span').textContent='IBIS EXPLANATION';answer.querySelector('h2').textContent=indicator.title+' is moving because ibis retained FTN’s original updater.';answer.querySelector('p').textContent=(indicator.classification||'FTN Modelled')+'. '+(indicator.methodology||'Continuously recomputed FTN model.')+' This is labelled LIVE MODEL, not live official measurement.';}
      var context=reveal('context');if(context){var list=context.querySelector('ul');list.innerHTML='';[['State','LIVE MODEL'],['Classification',indicator.classification||'Not stated'],['Source',adapted.spec.source&&adapted.spec.source.name||indicator.sourceName||'Not stated'],['Update path','FTN LiveClocks · recomputed every second']].forEach(function(row){var li=document.createElement('li'),a=document.createElement('strong'),b=document.createElement('span');a.textContent=row[0];b.textContent=row[1];li.append(a,b);list.appendChild(li);});}
      if(hint)hint.textContent='FTN '+indicator.title+' materialized as a LIVE MODEL. It will keep recomputing while this Headspace object exists.';
    }catch(e){if(hint)hint.textContent='FTN Live model could not load; no frozen substitute was shown. '+e.message;}
  }
  if(form)form.addEventListener('submit',function(e){var text=input&&input.value||'';if(!relevant(text))return;e.preventDefault();e.stopImmediatePropagation();run(text);},true);
  global.addEventListener&&global.addEventListener('beforeunload',function(){if(activeStop)activeStop();});
})(typeof window!=='undefined'?window:globalThis);
