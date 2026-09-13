// A quiet outcome-word cadence for the Headspace arrival. The approved phrase leads and returns.
(function(){
  'use strict';
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var node=document.getElementById('outcomeWord');
  var words=['make happen','achieve','find','understand','solve','build','change','prove','make happen'];
  var index=0,wordTimer=0;
  function random(min,max){var value=Math.random();if(window.crypto&&window.crypto.getRandomValues){var bytes=new Uint32Array(1);window.crypto.getRandomValues(bytes);value=bytes[0]/4294967295;}return min+value*(max-min);}
  function advance(){
    if(!node||document.body.classList.contains('headspace-engaged')){window.clearInterval(wordTimer);return;}
    node.classList.add('is-leaving');
    window.setTimeout(function(){
      index=(index+1)%words.length;
      node.classList.remove('is-leaving');
      node.classList.add('is-entering');
      node.textContent=words[index];
      requestAnimationFrame(function(){requestAnimationFrame(function(){node.classList.remove('is-entering');});});
    },480);
  }
  if(node&&!reduce)wordTimer=window.setInterval(advance,2900);

  var time=document.getElementById('headspaceTime'),date=document.getElementById('headspaceDate');
  var timeFormat=new Intl.DateTimeFormat('en-TT',{timeZone:'America/Port_of_Spain',hour:'numeric',minute:'2-digit',second:'2-digit'});
  var dateFormat=new Intl.DateTimeFormat('en-TT',{timeZone:'America/Port_of_Spain',weekday:'short',month:'short',day:'numeric'});
  var hourFormat=new Intl.DateTimeFormat('en-TT',{timeZone:'America/Port_of_Spain',hour:'2-digit',hourCycle:'h23'});
  function daypart(now){var hour=Number(hourFormat.format(now));return hour>=5&&hour<11?'morning':hour>=11&&hour<17?'daytime':hour>=17&&hour<21?'evening':'night';}
  function tick(){var now=new Date();document.body.dataset.daypart=daypart(now);if(time){time.textContent=timeFormat.format(now);time.dateTime=now.toISOString();}if(date)date.textContent=dateFormat.format(now)+' · Trinidad & Tobago';}
  tick();window.setInterval(tick,1000);

  var scenes=Array.from(document.querySelectorAll('.arrival-scene')),sceneIndex=0,sceneTimer=0,orientationTimers=[];
  function showScene(next){scenes.forEach(function(scene,i){scene.classList.toggle('is-active',i===next);});sceneIndex=next;}
  function rotateScene(){showScene((sceneIndex+1)%scenes.length);}
  function settleRotation(){sceneTimer=window.setInterval(rotateScene,240000);}
  if(scenes.length){
    showScene(0);
    if(!reduce){
      orientationTimers.push(window.setTimeout(function(){showScene(1);},20000));
      orientationTimers.push(window.setTimeout(function(){showScene(2);},40000));
      orientationTimers.push(window.setTimeout(settleRotation,60000));
    }
  }

  var flight=document.querySelector('.ibis-flight'),flightTimer=0;
  function scheduleFlight(first){if(!flight||reduce)return;window.clearTimeout(flightTimer);flightTimer=window.setTimeout(fly,first?650:random(42000,96000));}
  function fly(){
    if(document.body.classList.contains('headspace-engaged'))return;
    var fromLeft=random(0,1)>.5;
    flight.classList.remove('is-flying','flight-from-left','flight-from-right');
    flight.classList.add(fromLeft?'flight-from-left':'flight-from-right');
    flight.style.setProperty('--flight-y',random(5,34).toFixed(1)+'svh');
    flight.style.setProperty('--flight-width',Math.round(random(300,760))+'px');
    flight.style.setProperty('--flight-duration',random(5.8,10.2).toFixed(1)+'s');
    flight.style.setProperty('--flight-rise',Math.round(random(-70,55))+'px');
    void flight.offsetWidth;
    flight.classList.add('is-flying');
    flight.addEventListener('animationend',function(){flight.classList.remove('is-flying');scheduleFlight(false);},{once:true});
  }
  scheduleFlight(true);
})();
