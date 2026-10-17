(function(){
  'use strict';
  var progress=document.getElementById('reading-progress');
  var scheduled=false;
  function updateProgress(){
    var range=document.documentElement.scrollHeight-window.innerHeight;
    if(progress)progress.style.transform='scaleX('+(range>0?Math.min(1,Math.max(0,window.scrollY/range)):0)+')';
    scheduled=false;
  }
  window.addEventListener('scroll',function(){if(!scheduled){scheduled=true;window.requestAnimationFrame(updateProgress);}},{passive:true});
  window.addEventListener('resize',updateProgress);
  updateProgress();
  var search=document.getElementById('universe-search');
  var status=document.getElementById('universe-status');
  var chapters=Array.prototype.slice.call(document.querySelectorAll('#universe-catalog .universe-chapter'));
  var items=Array.prototype.slice.call(document.querySelectorAll('#universe-catalog .universe-item'));
  var previousOpen=[];
  var searching=false;
  if(search){
    document.querySelector('.catalog-tools').hidden=false;
    function filter(){
      var query=search.value.trim().toLocaleLowerCase();
      if(query&&!searching){previousOpen=chapters.map(function(c){return c.open;});searching=true;}
      var count=0;
      items.forEach(function(item){var match=!query||item.textContent.toLocaleLowerCase().includes(query);item.hidden=!match;if(match)count++;});
      chapters.forEach(function(chapter,index){
        chapter.hidden=!Array.prototype.some.call(chapter.querySelectorAll('.universe-item'),function(item){return !item.hidden;});
        if(query&&!chapter.hidden)chapter.open=true;
        if(!query&&searching)chapter.open=previousOpen[index];
      });
      if(!query)searching=false;
      status.textContent=query?(count+' result'+(count===1?'':'s')+' for “'+search.value.trim()+'”.'):(items.length+' products and capabilities. Open a chapter to explore.');
      updateProgress();
    }
    search.addEventListener('input',filter);
    document.getElementById('clear-search').addEventListener('click',function(){search.value='';filter();search.focus();});
    filter();
  }
  document.addEventListener('toggle',updateProgress,true);
  var share=document.getElementById('share-profile');
  if(share&&navigator.clipboard&&window.isSecureContext){
    share.hidden=false;
    share.addEventListener('click',async function(){
      var message=document.getElementById('share-status');
      try{await navigator.clipboard.writeText('https://ftnplatform.org/rickboss/');message.textContent='Profile link copied.';}
      catch(error){message.textContent='Copy this address: https://ftnplatform.org/rickboss/';}
    });
  }
})();
