// FTN Platform — connected app registry and adapter boundary for ibis.
// Stores connection metadata/scopes only. Provider secrets/tokens belong in OAuth/provider vaults,
// never public.ibis_app_connections or browser-readable metadata.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},override={},adapters=new Map();
  var CANDIDATES=['gmail','google-calendar','google-drive','slack','github','supabase','browser','local-computer','openrouter','perplexity','google-flow','runway'];
  function auth(){return override.auth||FTN.Auth||null;} async function user(){var a=auth();return a&&typeof a.getVerifiedUser==='function'?await a.getVerifiedUser():null;} async function client(){var a=auth();return a&&typeof a.ready==='function'?await a.ready():null;}
  function sanitizeMetadata(meta){meta=Object.assign({},meta||{});['access_token','refresh_token','token','secret','apiKey','api_key','password','credential'].forEach(function(k){delete meta[k];});return meta;}
  function registerAdapter(provider,adapter){provider=String(provider||'').trim();if(!provider||!adapter||typeof adapter.invoke!=='function')throw new Error('Provider and adapter.invoke are required.');adapters.set(provider,adapter);return true;}
  function adapter(provider){return adapters.get(String(provider||''))||null;}
  async function setConnection(provider,state,opts){opts=opts||{};var u=await user();if(!u)throw new Error('Connected apps require an authenticated FTN account.');var c=await client(),row={user_id:u.id,provider:String(provider||'').trim(),account_label:opts.accountLabel||null,connection_state:String(state||'DISCONNECTED').toUpperCase(),scopes:Array.isArray(opts.scopes)?opts.scopes:[],metadata:sanitizeMetadata(opts.metadata),last_verified_at:opts.lastVerifiedAt||new Date().toISOString(),updated_at:new Date().toISOString()};if(!row.provider)throw new Error('provider is required');var q=await c.from('ibis_app_connections').upsert(row,{onConflict:'user_id,provider,account_label'}).select().single();if(q.error)throw q.error;return q.data;}
  async function list(){var u=await user();if(!u)return[];var c=await client(),q=await c.from('ibis_app_connections').select('*').eq('user_id',u.id).order('provider',{ascending:true});if(q.error)throw q.error;return q.data||[];}
  async function get(provider){var rows=await list();return rows.find(function(x){return x.provider===provider;})||null;}
  async function health(provider){var conn=await get(provider),a=adapter(provider);return{provider:provider,connectionState:conn?conn.connection_state:'DISCONNECTED',adapterRegistered:!!a,scopes:conn?conn.scopes:[],ready:!!(conn&&conn.connection_state==='CONNECTED'&&a)};}
  async function invoke(provider,operation,payload,context){var h=await health(provider);if(!h.ready)return{success:false,blocked:true,code:'APP_NOT_READY',provider:provider,health:h};var a=adapter(provider),started=Date.now();try{var result=await a.invoke(operation,payload||{},context||{});return{success:true,provider:provider,operation:operation,latencyMs:Date.now()-started,data:result};}catch(err){return{success:false,provider:provider,operation:operation,latencyMs:Date.now()-started,errorType:'APP_EXECUTION_FAILED',errorDetail:err&&err.message||String(err)};}}
  function configure(options){override=options||{};}
  FTN.AppRegistry={registerAdapter:registerAdapter,adapter:adapter,setConnection:setConnection,list:list,get:get,health:health,invoke:invoke,configure:configure,candidates:CANDIDATES.slice(),sanitizeMetadata:sanitizeMetadata};
})(typeof window!=='undefined'?window:globalThis);
