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
function client(){if(!clientPromise)clientPromise=script().then(function(){return global.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});});return clientPromise;}
// Supabase returns an authorization code after a user opens an email magic link.
// The account page is the single callback owner. Disabling SDK auto-detection prevents
// two concurrent exchanges from consuming the same one-time authorization code.
async function completeEmailLink(){var code='';try{code=new URL(global.location.href).searchParams.get('code')||'';}catch(e){}if(!code)return null;var c=await client(),result=await c.auth.exchangeCodeForSession(code);if(result.error)throw result.error;try{var u=new URL(global.location.href);u.searchParams.delete('code');global.history.replaceState({},document.title,u.pathname+(u.search||'')+(u.hash||''));}catch(e){}return result.data.session||null;}
function safeReturn(value){try{var u=new URL(value||'/',location.origin);if(u.origin!==location.origin)return'/';if(/^\/account(\/|$)/.test(u.pathname))return'/';return u.pathname+u.search+u.hash;}catch(e){return'/';}}
function returnPath(){var p=new URLSearchParams(location.search);return safeReturn(p.get('return')||sessionStorage.getItem('ftn.auth.return')||'/');}
function rememberReturn(value){var safe=safeReturn(value);try{sessionStorage.setItem('ftn.auth.return',safe);}catch(e){}return safe;}
async function getSession(){var c=await client();var result=await c.auth.getSession();if(result.error)throw result.error;return result.data.session||null;}
async function getAccessToken(){var session=await getSession();return session&&session.access_token||null;}
async function getVerifiedUser(){var c=await client();var result=await c.auth.getUser();if(result.error){if(/session.*missing/i.test(result.error.message||''))return null;throw result.error;}return result.data.user||null;}
async function signInWithEmail(email,returnTo){var c=await client();var target=rememberReturn(returnTo||returnPath());var redirect=location.origin+'/account/?return='+encodeURIComponent(target);var result=await c.auth.signInWithOtp({email:String(email||'').trim(),options:{emailRedirectTo:redirect,shouldCreateUser:true}});if(result.error)throw result.error;return result.data;}
// Google OAuth uses the same FTN Account callback page as email links. The
// Supabase client exchanges the returned authorization code there, so neither
// Google credentials nor privileged Supabase keys are exposed in the browser.
async function signInWithGoogle(returnTo){var c=await client();var target=rememberReturn(returnTo||returnPath());var redirect=location.origin+'/account/?return='+encodeURIComponent(target);var result=await c.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect}});if(result.error)throw result.error;return result.data;}
async function verifyEmailOtp(email,token){var c=await client();var result=await c.auth.verifyOtp({email:String(email||'').trim(),token:String(token||'').trim(),type:'email'});if(result.error)throw result.error;return result.data.session;}
async function signOut(){var c=await client();var result=await c.auth.signOut({scope:'local'});if(result.error)throw result.error;try{sessionStorage.removeItem('ftn.auth.return');}catch(e){}}
async function invoke(name,body){var c=await client();var result=await c.functions.invoke(name,{body:body||{}});if(result.error)throw result.error;return result.data;}
var OWNER_DEVICE_KEY='ftn.owner.device.credential',OWNER_PENDING_KEY='ftn.owner.device.pending';
function ownerCredential(){try{return localStorage.getItem(OWNER_DEVICE_KEY)||'';}catch(e){return'';}}
function saveOwnerResponse(data){try{if(data&&data.deviceCredential)localStorage.setItem(OWNER_DEVICE_KEY,data.deviceCredential);if(data&&data.claimToken&&data.device&&data.device.id)localStorage.setItem(OWNER_PENDING_KEY,JSON.stringify({deviceId:data.device.id,claimToken:data.claimToken,deviceName:data.device.device_name||''}));if(data&&data.allowed&&data.deviceCredential)localStorage.removeItem(OWNER_PENDING_KEY);if(data&&data.currentDeviceRevoked)localStorage.removeItem(OWNER_DEVICE_KEY);}catch(e){}return data;}
async function ownerRequest(body,allowDenied){var session=await getSession();if(!session||!session.access_token)return{allowed:false,error:'Authenticate first'};var requestHeaders={'content-type':'application/json','apikey':KEY,'authorization':'Bearer '+session.access_token},device=ownerCredential();if(device)requestHeaders['x-ftn-device-credential']=device;var response=await fetch(URL+'/functions/v1/ftn-owner-control',{method:'POST',headers:requestHeaders,body:JSON.stringify(body||{})}),data=await response.json().catch(function(){return{};});saveOwnerResponse(data);if(!response.ok&&!allowDenied)throw new Error(data.error||'Owner authorization unavailable.');return data;}
async function ownerAccess(){try{return await ownerRequest({action:'authorize'},true);}catch(e){return{allowed:false,error:e.message||'Owner authorization unavailable.'};}}
async function enrollOwnerDevice(deviceName){return ownerRequest({action:'enroll-device',deviceName:String(deviceName||'').trim()},true);}
async function claimOwnerDevice(){var pending=null;try{pending=JSON.parse(localStorage.getItem(OWNER_PENDING_KEY)||'null');}catch(e){}if(!pending||!pending.deviceId||!pending.claimToken)return{allowed:false,ownerIdentity:true,deviceApprovalRequired:true,error:'No pending approval is stored on this device.'};return ownerRequest({action:'claim-device',deviceId:pending.deviceId,claimToken:pending.claimToken},true);}
async function ownerInvoke(body){return ownerRequest(body||{},false);}
function clearOwnerDevice(){try{localStorage.removeItem(OWNER_DEVICE_KEY);localStorage.removeItem(OWNER_PENDING_KEY);}catch(e){}}
function onChange(callback){client().then(function(c){c.auth.onAuthStateChange(function(event,session){callback(event,session);});});}
global.FTN=global.FTN||{};global.FTN.Auth={ready:client,completeEmailLink:completeEmailLink,getSession:getSession,getAccessToken:getAccessToken,getVerifiedUser:getVerifiedUser,signInWithEmail:signInWithEmail,signInWithGoogle:signInWithGoogle,verifyEmailOtp:verifyEmailOtp,signOut:signOut,invoke:invoke,ownerAccess:ownerAccess,enrollOwnerDevice:enrollOwnerDevice,claimOwnerDevice:claimOwnerDevice,ownerInvoke:ownerInvoke,clearOwnerDevice:clearOwnerDevice,onChange:onChange,safeReturn:safeReturn,rememberReturn:rememberReturn,returnPath:returnPath};
})(window);
