// FTN Platform — ibis Intent Graph core.
// Private-by-default structured intentions. This module stores no data by itself; persistence and
// identity binding belong to an approved account/permission layer.
(function(global){
  'use strict';
  var MODES=['NEED','HAVE','PLAN','WATCH'];
  var VISIBILITY=['PRIVATE','ANONYMOUS_SIGNAL','COMMUNITY_APPROVED','COMMERCIAL_APPROVED'];
  function cleanList(v){return Array.isArray(v)?Array.from(new Set(v.map(function(x){return String(x).trim().toLowerCase();}).filter(Boolean))):[];}
  function create(fields){fields=fields||{};if(!fields.id)return{success:false,errorType:'MISSING_ID',reason:'Intent id is required.'};var mode=String(fields.mode||'NEED').toUpperCase();if(!MODES.includes(mode))return{success:false,errorType:'INVALID_MODE',reason:'Intent mode must be NEED, HAVE, PLAN or WATCH.'};var visibility=String(fields.visibility||'PRIVATE').toUpperCase();if(!VISIBILITY.includes(visibility))return{success:false,errorType:'INVALID_VISIBILITY',reason:'Unsupported intent visibility.'};var categories=cleanList(fields.categories);if(!categories.length)return{success:false,errorType:'MISSING_CATEGORY',reason:'At least one intent category is required.'};return{success:true,intent:{id:String(fields.id),mode:mode,categories:categories,keywords:cleanList(fields.keywords),geographies:cleanList(fields.geographies),currency:fields.currency?String(fields.currency).toUpperCase():null,budgetMin:Number.isFinite(fields.budgetMin)?fields.budgetMin:null,budgetMax:Number.isFinite(fields.budgetMax)?fields.budgetMax:null,timeHorizon:fields.timeHorizon||null,status:fields.status||'ACTIVE',visibility:visibility,subjectId:fields.subjectId||null,source:fields.source||'USER_STATED',createdAt:fields.createdAt||null,updatedAt:fields.updatedAt||null,notes:fields.notes||null}};}
  function Graph(){this.intents=new Map();}
  Graph.prototype.upsert=function(fields){var result=create(fields);if(!result.success)return result;this.intents.set(result.intent.id,result.intent);return{success:true,intent:Object.assign({},result.intent)};};
  Graph.prototype.get=function(id){var x=this.intents.get(String(id));return x?Object.assign({},x):null;};
  Graph.prototype.all=function(filter){var rows=Array.from(this.intents.values());filter=filter||{};if(filter.status)rows=rows.filter(function(x){return x.status===filter.status;});if(filter.mode)rows=rows.filter(function(x){return x.mode===filter.mode;});return rows.map(function(x){return Object.assign({},x);});};
  Graph.prototype.revoke=function(id){var x=this.intents.get(String(id));if(!x)return{success:false,errorType:'NOT_FOUND',reason:'Intent not found.'};x.status='REVOKED';x.visibility='PRIVATE';return{success:true,intent:Object.assign({},x)};};
  Graph.prototype.shareable=function(){return this.all({status:'ACTIVE'}).filter(function(x){return x.visibility!=='PRIVATE';});};
  global.FTN=global.FTN||{};global.FTN.IbisIntentGraph={Graph:Graph,create:create,MODES:MODES.slice(),VISIBILITY:VISIBILITY.slice()};
})(typeof window!=='undefined'?window:globalThis);
