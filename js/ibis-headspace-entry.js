// FTN Platform — hand an entered landing intent into Headspace without exposing page architecture.
(function(){
  'use strict';
  function enter(){
    var params=new URLSearchParams(window.location.search);
    var text=(params.get('q')||'').trim();
    if(!text)return;
    var input=document.getElementById('headspaceQuery');
    var form=document.getElementById('inputOrbit');
    if(!input||!form)return;
    input.value=text;
    document.querySelectorAll('.thought').forEach(function(t){if(!t.classList.contains('pinned'))t.classList.add('dematerialized');});
    var submitted=false;
    function submit(){if(submitted)return;submitted=true;form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}
    var needsOpportunities=/\b(opportunit|grant|funding|procurement|accelerator|award|partner|investor|prize|fellowship|property|takeover|recon fund|mary.?s hill|scout)\b/i.test(text);
    requestAnimationFrame(function(){
      setTimeout(function(){
        if(!needsOpportunities||(window.FTN&&window.FTN.HeadspaceOpportunities))submit();
        else document.addEventListener('ibis:opportunities-ready',submit,{once:true});
      },260);
    });
    if(window.history&&window.history.replaceState)window.history.replaceState({},document.title,window.location.pathname);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enter,{once:true});else enter();
})();
