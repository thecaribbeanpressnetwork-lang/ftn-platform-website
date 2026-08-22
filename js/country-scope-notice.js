// FTN Platform Website — Country scope notice.
(function (global) {
  'use strict';
  function render() {
    var Country=global.FTN&&global.FTN.Country;if(!Country)return;var current=Country.get();var notices=document.querySelectorAll('[data-country-scope-notice]');
    for(var i=0;i<notices.length;i++){var el=notices[i];if(current.code==='TT'){el.hidden=true;}else{el.textContent='FTN is expanding to '+current.name+'. Trinidad & Tobago is available today.';el.hidden=false;}}
  }
  function init(){render();global.addEventListener('ftn:country-changed',render);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
