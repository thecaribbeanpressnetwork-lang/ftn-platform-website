// FTN Platform — verified Statistics -> Headspace bridge.
// Loads the existing official-source datasets and deterministic statistics modules, then returns
// graph-ready thought data with provenance and a separate confidence assessment.
(function(global){
  'use strict';
  var cache=null;
  function loadScript(src,test){if(test())return Promise.resolve();return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.onload=function(){test()?resolve():reject(new Error('Capability did not register: '+src));};s.onerror=function(){reject(new Error('Could not load '+src));};document.head.appendChild(s);});}
  async function ensure(){
    await loadScript('/js/ibis-provenance.js',function(){return !!(global.FTN&&global.FTN.IbisProvenance);});
    await loadScript('/js/ftn-statistics.js',function(){return !!(global.FTN&&global.FTN.Statistics);});
    await loadScript('/js/ftn-statistics-crime-adapter.js',function(){return !!(global.FTN&&global.FTN.StatisticsCrimeAdapter);});
    await loadScript('/js/ftn-statistics-fx-adapter.js',function(){return !!(global.FTN&&global.FTN.StatisticsFxAdapter);});
    await loadScript('/js/ibis-statistics-capability.js',function(){return !!(global.FTN&&global.FTN.IbisStatistics);});
    await loadScript('/js/ibis-confidence.js',function(){return !!(global.FTN&&global.FTN.IbisConfidence);});
    await loadScript('/js/ibis-statistics-confidence.js',function(){return !!(global.FTN&&global.FTN.IbisStatisticsConfidence);});
  }
  async function loadCatalog(){
    if(cache)return cache;
    await ensure();
    var responses=await Promise.all([fetch('/data/crime-statistics.json',{cache:'no-store'}),fetch('/data/fx-usd-ttd.json',{cache:'no-store'})]);
    if(!responses[0].ok||!responses[1].ok)throw new Error('One or more verified FTN Statistics datasets could not be loaded.');
    var crime=await responses[0].json(),fx=await responses[1].json();
    var catalog=global.FTN.IbisStatistics.buildCatalog({crime:crime,fx:fx});
    cache={catalog:catalog,raw:{crime:crime,fx:fx}};return cache;
  }
  function graphSeries(catalog,indicatorId,limit){
    limit=limit||12;
    var defs=catalog.indicatorDefinitions||[];var def=defs.find(function(d){return d.id===indicatorId;});
    var rows=(catalog.observations||[]).filter(function(o){return o.indicatorId===indicatorId&&!o.suppressionReason&&typeof o.value==='number'&&Number.isFinite(o.value);}).sort(function(a,b){return String(a.referencePeriod).localeCompare(String(b.referencePeriod));});
    if(limit&&rows.length>limit)rows=rows.slice(rows.length-limit);
    return {id:indicatorId,label:def?def.publicName:indicatorId,unit:def?def.unit:null,frequency:def?def.frequency:null,periods:rows.map(function(o){return o.referencePeriod;}),values:rows.map(function(o){return o.value;}),sourceIds:Array.from(new Set(rows.map(function(o){return o.sourceId;})))};
  }
  async function query(text,options){
    var loaded=await loadCatalog();var result=global.FTN.IbisStatistics.query(text,{catalog:loaded.catalog});
    if(result&&result.success)result=global.FTN.IbisStatisticsConfidence.enrich(result,options||{});
    var indicatorId=result&&result.fact&&result.fact.indicatorId||result&&result.indicatorId||null;
    return {result:result,series:indicatorId?graphSeries(loaded.catalog,indicatorId,18):null,catalog:loaded.catalog};
  }
  async function series(indicatorId,limit){var loaded=await loadCatalog();return graphSeries(loaded.catalog,indicatorId,limit);}
  global.FTN=global.FTN||{};global.FTN.HeadspaceStatistics={loadCatalog:loadCatalog,query:query,series:series};
})(typeof window!=='undefined'?window:globalThis);
