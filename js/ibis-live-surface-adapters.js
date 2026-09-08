// FTN Platform — ibis adapters for existing FTN live/updating surfaces.
// These adapters do not copy a displayed number. They retain the underlying updater so a Headspace
// presentation keeps moving when the source surface moves. Modelled clocks are explicitly LIVE_MODEL,
// never represented as live official measurements.
(function(global){
  'use strict';
  function fail(code,reason){return{success:false,errorType:code,reason:reason};}
  function numeric(value){var n=Number(String(value==null?'':value).replace(/,/g,'').replace(/[^0-9+\-.]/g,''));return Number.isFinite(n)?n:null;}
  function sourceFor(indicator){if(!indicator)return null;var FTN=global.FTN||{};if(indicator.sourceId&&FTN.Sources&&typeof FTN.Sources.get==='function'){var s=FTN.Sources.get(indicator.sourceId);if(s)return{name:s.name||indicator.sourceName||indicator.sourceId,id:indicator.sourceId,url:s.url||null};}return indicator.sourceName||indicator.sourceId||null;}
  function fromLiveClock(indicator,options){
    options=options||{};var FTN=global.FTN||{};if(!indicator||!indicator.isLiveClock)return fail('NOT_LIVE_CLOCK','Indicator is not configured as an FTN live clock.');if(!FTN.LiveClocks||typeof FTN.LiveClocks.computeClockValue!=='function')return fail('LIVE_CLOCKS_NOT_LOADED','FTN.LiveClocks must be loaded first.');
    function current(){var raw=FTN.LiveClocks.computeClockValue(indicator,new Date());var value=numeric(raw);return{raw:raw,value:value,calculatedAt:new Date().toISOString()};}
    var first=current();if(first.value===null)return fail('NON_NUMERIC_LIVE_VALUE','The live clock value cannot be rendered numerically.',{raw:first.raw});
    return{success:true,spec:{id:indicator.id,title:indicator.title,subtitle:(indicator.classification||'FTN Modelled')+' · '+(indicator.methodology||'continuously recomputed FTN model'),mode:'LIVE_MODEL',visual:'KPI',values:[first.value],unit:indicator.units||null,source:sourceFor(indicator),sourceReferenceDate:indicator.referenceDate||indicator.lastUpdated||null,calculatedAt:first.calculatedAt,confidence:indicator.confidence?{level:String(indicator.confidence).toUpperCase()}:null,refreshMs:options.refreshMs||1000,refresh:function(){var next=current();return{values:[next.value],calculatedAt:next.calculatedAt};},ariaLabel:indicator.title+' continuously updating FTN model'}};
  }
  function fromPollingFeed(config){
    config=config||{};if(typeof config.refresh!=='function')return fail('MISSING_REFRESH','A genuine live polling feed requires a refresh() function.');if(!Array.isArray(config.values)||!config.values.length)return fail('MISSING_INITIAL_VALUES','A live feed needs initial values before presentation.');
    return{success:true,spec:{id:config.id||null,title:config.title||'Live data',subtitle:config.subtitle||'',mode:'LIVE',visual:config.visual||null,kind:config.kind||null,relationship:config.relationship||null,values:config.values.slice(),labels:Array.isArray(config.labels)?config.labels.slice():[],unit:config.unit||null,source:config.source||null,sourceReferenceDate:config.sourceReferenceDate||null,retrievedAt:config.retrievedAt||null,confidence:config.confidence||null,refreshMs:config.refreshMs||60000,refresh:config.refresh,ariaLabel:config.ariaLabel||config.title||'Live ibis data'}};
  }
  global.FTN=global.FTN||{};global.FTN.IbisLiveAdapters={fromLiveClock:fromLiveClock,fromPollingFeed:fromPollingFeed};
})(typeof window!=='undefined'?window:globalThis);
