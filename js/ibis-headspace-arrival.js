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

  var scenes=Array.from(document.querySelectorAll('.arrival-scene')),sceneIndex=0,sceneTimer=0,orientationTimers=[];
  function showScene(next){scenes.forEach(function(scene,i){scene.classList.toggle('is-active',i===next);});sceneIndex=next;}
  function stopScenes(){orientationTimers.forEach(window.clearTimeout);orientationTimers=[];window.clearInterval(sceneTimer);sceneTimer=0;}
  function rotateScene(){if(document.body.classList.contains('headspace-engaged'))return stopScenes();showScene((sceneIndex+1)%scenes.length);}
  function settleRotation(){sceneTimer=window.setInterval(rotateScene,240000);}
  if(scenes.length){
    showScene(reduce?0:Math.floor(Math.random()*scenes.length));
    if(!reduce){
      orientationTimers.push(window.setTimeout(rotateScene,20000));
      orientationTimers.push(window.setTimeout(rotateScene,40000));
      orientationTimers.push(window.setTimeout(settleRotation,60000));
      new MutationObserver(function(){if(document.body.classList.contains('headspace-engaged'))stopScenes();}).observe(document.body,{attributes:true,attributeFilter:['class']});
    }
  }

})();
