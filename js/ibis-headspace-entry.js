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
    requestAnimationFrame(function(){
      setTimeout(function(){form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},260);
    });
    if(window.history&&window.history.replaceState)window.history.replaceState({},document.title,window.location.pathname);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enter,{once:true});else enter();
})();