// FTN ecosystem homepage: immediate feedback without holding navigation hostage.
(function(){
  'use strict';
  var stage=document.querySelector('[data-eco-constellation]');
  if(!stage)return;
  var pulse=stage.querySelector('.eco-constellation__pulse');
  function signal(){
    pulse.classList.remove('is-sending');
    requestAnimationFrame(function(){pulse.classList.add('is-sending');});
    setTimeout(function(){pulse.classList.remove('is-sending');},900);
  }
  pulse.addEventListener('click',function(){
    signal();
    setTimeout(function(){document.querySelector('.eco-intent').scrollIntoView({behavior:'smooth',block:'start'});},320);
  });
  stage.querySelectorAll('.eco-door').forEach(function(door){
    door.addEventListener('click',function(event){
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      door.classList.add('is-entering');
      stage.classList.add('is-transitioning');
      setTimeout(function(){window.location.assign(door.href);},360);
    });
  });
})();
