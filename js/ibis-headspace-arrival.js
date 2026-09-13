// A quiet outcome-word cadence for the Headspace arrival. The approved phrase leads and returns.
(function(){
  'use strict';
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var node=document.getElementById('outcomeWord');
  var words=['make happen?','achieve?','find?','understand?','solve?','build?','change?','prove?'];
  var index=0,wordTimer=0;
  function advance(){
    if(!node||document.body.classList.contains('headspace-engaged')){window.clearInterval(wordTimer);return;}
    node.classList.add('is-leaving');
    window.setTimeout(function(){
      index=(index+1)%words.length;
      node.classList.remove('is-leaving');
      node.classList.add('is-entering');
      node.textContent=words[index];
      requestAnimationFrame(function(){requestAnimationFrame(function(){node.classList.remove('is-entering');});});
    },900);
  }
  if(node&&!reduce)wordTimer=window.setInterval(advance,5200);

  var time=document.getElementById('headspaceTime'),date=document.getElementById('headspaceDate');
  var timeFormat=new Intl.DateTimeFormat('en-TT',{timeZone:'America/Port_of_Spain',hour:'numeric',minute:'2-digit',second:'2-digit'});
  var dateFormat=new Intl.DateTimeFormat('en-TT',{timeZone:'America/Port_of_Spain',weekday:'short',month:'short',day:'numeric'});
  var hourFormat=new Intl.DateTimeFormat('en-TT',{timeZone:'America/Port_of_Spain',hour:'2-digit',hourCycle:'h23'});
  function daypart(now){var hour=Number(hourFormat.format(now));return hour>=5&&hour<11?'morning':hour>=11&&hour<17?'daytime':hour>=17&&hour<21?'evening':'night';}
  function tick(){var now=new Date();document.body.dataset.daypart=daypart(now);if(time){time.textContent=timeFormat.format(now);time.dateTime=now.toISOString();}if(date)date.textContent=dateFormat.format(now)+' · Trinidad & Tobago';}
  tick();window.setInterval(tick,1000);

  var layers=Array.from(document.querySelectorAll('[data-scene-layer]'));
  var sceneLabel=document.getElementById('sceneLabel'),sceneArticle=document.getElementById('sceneArticle'),sceneCredit=document.getElementById('sceneCredit');
  var liveView=document.getElementById('liveView'),headspaceMenu=document.getElementById('headspaceMenu');
  var landmarks=[],sceneIndex=-1,activeLayer=0,sceneTimer=0,transitioning=false;
  function setLiveView(active){document.body.classList.toggle('ambient-live',active);if(liveView){liveView.textContent=active?'Exit live':'Live view';liveView.setAttribute('aria-pressed',String(active));}if(headspaceMenu)headspaceMenu.open=false;}
  if(liveView)liveView.addEventListener('click',function(){
    var active=document.body.classList.contains('ambient-live');
    if(active){setLiveView(false);if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){});return;}
    setLiveView(true);
    if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(function(){});
  });
  document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement&&document.body.classList.contains('ambient-live'))setLiveView(false);});
  if(headspaceMenu)headspaceMenu.addEventListener('click',function(event){if(event.target.closest('.headspace-menu-panel button,.headspace-menu-panel a'))headspaceMenu.open=false;});
  function stopScenes(){window.clearInterval(sceneTimer);sceneTimer=0;}
  function matchingLandmarks(){
    var current=document.body.dataset.daypart;
    var matched=landmarks.filter(function(item){return !item.dayparts||item.dayparts.includes(current)||(current==='night'&&item.dayparts.includes('evening'));});
    return matched.length?matched:landmarks;
  }
  function setCaption(item){
    if(sceneLabel)sceneLabel.textContent=item.landmark+' · '+item.country;
    if(sceneArticle){sceneArticle.href=item.articleUrl;sceneArticle.textContent='More about '+item.landmark;}
    if(sceneCredit){sceneCredit.href=item.descriptionUrl;sceneCredit.textContent=item.author+' · '+item.license;sceneCredit.setAttribute('aria-label',item.landmark+' photograph credit and licence');}
  }
  function showScene(item){
    if(!item||!layers.length||transitioning||document.body.classList.contains('headspace-engaged'))return;
    var nextLayer=layers.length>1?1-activeLayer:activeLayer,next=layers[nextLayer];
    transitioning=true;
    next.onload=function(){
      if(document.body.classList.contains('headspace-engaged')){transitioning=false;return;}
      setCaption(item);
      layers[activeLayer].classList.remove('is-active');
      next.classList.add('is-active');
      activeLayer=nextLayer;sceneIndex=landmarks.indexOf(item);transitioning=false;
    };
    next.onerror=function(){transitioning=false;};
    next.src=item.localPath;
    if(next.complete)next.onload();
  }
  function rotateScene(){
    if(document.body.classList.contains('headspace-engaged'))return stopScenes();
    var candidates=matchingLandmarks().filter(function(item){return landmarks.indexOf(item)!==sceneIndex;});
    showScene(candidates[Math.floor(Math.random()*candidates.length)]||matchingLandmarks()[0]);
  }
  function startScenes(items){
    landmarks=items;
    if(!landmarks.length||reduce)return;
    rotateScene();
    sceneTimer=window.setInterval(rotateScene,240000);
    new MutationObserver(function(){if(document.body.classList.contains('headspace-engaged'))stopScenes();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  if(layers.length)fetch('/data/ibis-headspace-landmarks.json',{credentials:'same-origin'}).then(function(response){if(!response.ok)throw new Error('landmark manifest unavailable');return response.json();}).then(function(data){startScenes(Array.isArray(data.landmarks)?data.landmarks:[]);}).catch(function(){/* The local Pitch Lake fallback remains visible. */});

})();
