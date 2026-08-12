// FTN Platform Website — Country scope notice + FTN Live source loader.
(function (global) {
  'use strict';
  function render() {
    var Country=global.FTN&&global.FTN.Country;if(!Country)return;var current=Country.get();var notices=document.querySelectorAll('[data-country-scope-notice]');
    for(var i=0;i<notices.length;i++){var el=notices[i];if(current.code==='TT'){el.hidden=true;}else{el.textContent='FTN is expanding to '+current.name+'. Trinidad & Tobago is available today.';el.hidden=false;}}
  }
  function loadObservatoryLiveMedia(){var path=global.location&&global.location.pathname?global.location.pathname:'';if(path.indexOf('/observatory')!==0)return;if(document.querySelector('script[data-ftn-live-media]'))return;var script=document.createElement('script');script.src='/js/observatory-live-media.js?v=20260812.2';script.defer=true;script.setAttribute('data-ftn-live-media','true');document.head.appendChild(script);}
  function init(){render();loadObservatoryLiveMedia();global.addEventListener('ftn:country-changed',render);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
