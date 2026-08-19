// FTN ecosystem front door: one deliberate reveal, native links for every destination.
(function(){
  'use strict';
  var toggle=document.querySelector('[data-ecosystem-toggle]');
  var reveal=document.querySelector('[data-ecosystem-reveal]');
  if(!toggle||!reveal)return;
  var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function openEcosystem(){
    reveal.hidden=false;
    reveal.classList.remove('is-opening');
    toggle.setAttribute('aria-expanded','true');
    requestAnimationFrame(function(){
      reveal.classList.add('is-opening');
      reveal.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'});
      var heading=reveal.querySelector('h2');
      if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
    });
  }
  toggle.addEventListener('click',function(){
    if(reveal.hidden){openEcosystem();return;}
    reveal.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'});
  });
})();
