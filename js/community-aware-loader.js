// Loads a dependent page script only after Community Connect live metrics have either hydrated or failed closed.
(function(){
'use strict';
var current=document.currentScript,next=current&&current.getAttribute('data-next');if(!next)return;
Promise.resolve(window.FTN&&window.FTN.communityMetricsReady).catch(function(){}).then(function(){var s=document.createElement('script');s.src=next;s.defer=false;document.body.appendChild(s);});
})();
