(function(){
'use strict';
window.addEventListener('DOMContentLoaded',function(){
  var S=window.FTN&&window.FTN.Scarlett;
  var go=document.getElementById('scGoal');
  var range=document.getElementById('scIntensity');
  var out=document.getElementById('scIntensityOut');
  var status=document.getElementById('scStatus');
  var signals=document.getElementById('scSignals');
  function show(model){
    signals.innerHTML='<div class="sc-signal"><span>Purpose</span><strong>'+model.purpose+'</strong></div><div class="sc-signal"><span>Neural Mesh</span><strong>'+model.neuralMeshCount+' live controls</strong></div><div class="sc-signal"><span>Mode</span><strong>'+((+range.value)>55?'Scarlett':(+range.value)<45?'Source site':'Crossover')+'</strong></div>';
  }
  document.getElementById('scTransform').onclick=function(){
    if(!S)return;
    var r=S.transform({goal:go.value,intensity:+range.value});
    show(r.model);
    status.textContent='Adapted locally. '+r.plan.operations.length+' bounded operations; '+r.plan.rules.length+' evidence-labelled rules.';
  };
  document.getElementById('scRestore').onclick=function(){
    if(!S)return;
    S.restore();
    status.textContent='Original presentation restored. No source content was deleted.';
    var last=signals.querySelector('.sc-signal:last-child strong');
    if(last)last.textContent='Source site';
  };
  range.oninput=function(){
    out.value=range.value+'%';
    if(S&&S.active)S.setIntensity(+range.value,false);
    var last=signals.querySelector('.sc-signal:last-child strong');
    if(last)last.textContent=(+range.value)>55?'Scarlett':(+range.value)<45?'Source site':'Crossover';
  };
  range.onchange=function(){
    if(S&&S.active){
      range.value=S.setIntensity(+range.value,true);
      out.value=range.value+'%';
    }
  };
});
})();
