// FTN shared browser auth client. Identity is verified by Supabase Auth; authorization remains
// server-side in RLS/RPC/functions. No client email or metadata value grants a role.
(function(global){
'use strict';
var URL='https://jshmidfpqrajxtukzges.supabase.co';
var KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
var VERSION='2.112.2';
var clientPromise;
function script(){return new Promise(function(resolve,reject){
  if(global.supabase&&global.supabase.createClient){resolve();return;}
  var existing=document.querySelector('script[data-ftn-supabase]');
  if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
  var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@'+VERSION+'/dist/umd/supabase.min.js';s.async=true;s.crossOrigin='anonymous';s.setAttribute('data-ftn-supabase',VERSION);s.onload=resolve;s.onerror=function(){reject(new Error('FTN Account could not load its authentication client.'));};document.head.appendChild(s);
});}
function client(){if(!clientPromise)clientPromise=script().then(function(){return global.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});});return clientPromise;}
function safeReturn(value){try{var u=new URL(value||'/',location.origin);if(u.origin!==location.origin)return'/';if(/^\/(account|god-mode)(\/|$)/.test(u.pathname))return'/';return u.pathname+u.search+u.hash;}catch(e){return'/';}}
function returnPath(){var p=new URLSearchParams(location.search);return safeReturn(p.get('return')||sessionStorage.getItem('ftn.auth.return')||'/');}
function rememberReturn(value){var safe=safeReturn(value);try{sessionStorage.setItem('ftn.auth.return',safe);}catch(e){}return safe;}
async function getSession(){var c=await client();var result=await c.auth.getSession();if(result.error)throw result.error;return result.data.session||null;}
async function getAccessToken(){var session=await getSession();return session&&session.access_token||null;}
async function getVerifiedUser(){var c=await client();var result=await c.auth.getUser();if(result.error){if(/session.*missing/i.test(result.error.message||''))return null;throw result.error;}return result.data.user||null;}
async function signInWithEmail(email,returnTo){var c=await client();var target=rememberReturn(returnTo||returnPath());var redirect=location.origin+'/account/?return='+encodeURIComponent(target);var result=await c.auth.signInWithOtp({email:String(email||'').trim(),options:{emailRedirectTo:redirect,shouldCreateUser:true}});if(result.error)throw result.error;return result.data;}
async function verifyEmailOtp(email,token){var c=await client();var result=await c.auth.verifyOtp({email:String(email||'').trim(),token:String(token||'').trim(),type:'email'});if(result.error)throw result.error;return result.data.session;}
async function signOut(){var c=await client();var result=await c.auth.signOut({scope:'local'});if(result.error)throw result.error;try{sessionStorage.removeItem('ftn.auth.return');}catch(e){}}
async function invoke(name,body){var c=await client();var result=await c.functions.invoke(name,{body:body||{}});if(result.error)throw result.error;return result.data;}
async function ownerAccess(){try{return await invoke('ftn-owner-control',{action:'authorize'});}catch(e){return{allowed:false,error:e.message||'Owner authorization unavailable.'};}}
function onChange(callback){client().then(function(c){c.auth.onAuthStateChange(function(event,session){callback(event,session);});});}
global.FTN=global.FTN||{};global.FTN.Auth={ready:client,getSession:getSession,getAccessToken:getAccessToken,getVerifiedUser:getVerifiedUser,signInWithEmail:signInWithEmail,verifyEmailOtp:verifyEmailOtp,signOut:signOut,invoke:invoke,ownerAccess:ownerAccess,onChange:onChange,safeReturn:safeReturn,rememberReturn:rememberReturn,returnPath:returnPath};
})(window);
