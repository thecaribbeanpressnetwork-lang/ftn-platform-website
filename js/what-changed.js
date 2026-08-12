// FTN Platform Website — "What Changed?" comparison panel.
(function (global) {
  'use strict';
  var PERIOD_PATTERNS = [
    { key: 'Year over Year', re: /y\/y/i },
    { key: 'Quarter over Quarter', re: /q\/q|last quarter/i },
    { key: 'Month over Month', re: /last month/i },
    { key: 'Recent', re: /.*/ },
  ];
  function parseChange(label) { var m = label.match(/([+-]?\d+(?:\.\d+)?)\s*%/); return m ? parseFloat(m[1]) : null; }
  function periodFor(label) { for (var i=0;i<PERIOD_PATTERNS.length;i++) if(PERIOD_PATTERNS[i].re.test(label)) return PERIOD_PATTERNS[i].key; return 'Recent'; }
  function generate(minMagnitude) {
    var indicators=(global.FTN&&global.FTN.indicators)||[],threshold=minMagnitude==null?0.5:minMagnitude,groups={};
    indicators.forEach(function(ind){if(!ind.changeLabel)return;var magnitude=parseChange(ind.changeLabel);if(magnitude===null||Math.abs(magnitude)<threshold)return;var period=periodFor(ind.changeLabel);groups[period]=groups[period]||[];groups[period].push({indicator:ind,magnitude:magnitude});});
    Object.keys(groups).forEach(function(period){groups[period].sort(function(a,b){return Math.abs(b.magnitude)-Math.abs(a.magnitude);});});return groups;
  }
  function render(mountId) {
    var mount=document.getElementById(mountId);if(!mount)return;var groups=generate(),periods=Object.keys(groups);if(!periods.length){mount.innerHTML='<p class="u-text-graphite">No meaningful period-over-period changes to show right now.</p>';return;}
    mount.innerHTML=periods.map(function(period){var items=groups[period].slice(0,5);return '<div class="what-changed__group"><p class="what-changed__period">'+period+'</p><ul class="what-changed__list">'+items.map(function(item){var ind=item.indicator,dir=item.magnitude>0?'up':'down';return '<li class="what-changed__item"><span class="what-changed__glyph what-changed__glyph--'+dir+'">'+global.FTN.Charts.trendGlyph(dir)+'</span><button type="button" class="trust-trigger" data-trust-card="'+ind.id+'">'+ind.title+'</button><span class="what-changed__value">'+ind.changeLabel+'</span></li>';}).join('')+'</ul></div>';}).join('');
  }
  global.FTN=global.FTN||{};global.FTN.WhatChanged={generate:generate,render:render};

  // FTN Live bootstrap: the public live surface opens with current source-backed
  // Caribbean satellite imagery before the modelled/derived indicator wall.
  function loadSatellite(){if(document.querySelector('script[data-ftn-live-satellite]'))return;var s=document.createElement('script');s.src='/js/ftn-live-satellite.js?v=20260812.2';s.defer=true;s.setAttribute('data-ftn-live-satellite','true');document.head.appendChild(s);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadSatellite);else loadSatellite();
})(window);
