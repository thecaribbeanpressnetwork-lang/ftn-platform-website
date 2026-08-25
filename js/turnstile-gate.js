// FTN Platform — public Cloudflare Turnstile client gate.
// The Turnstile site key is PUBLIC configuration and lives in /config/public-runtime.json.
// Never put the Turnstile secret key or any provider secret in this repository/browser layer.
(function(global){
'use strict';
var CONFIG_URL='/config/public-runtime.json';
var SCRIPT_URL='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
function mounts(){return Array.prototype.slice.call(document.querySelectorAll('[data-turnstile-mount]'));}
function forms(){return mounts().map(function(m){return m.closest('form');}).filter(Boolean);}
function setExpected(v){forms().forEach(function(f){f.dataset.ftnTurnstileExpected=v?'true':'false';});document.documentElement.dataset.ftnTurnstileConfigured=v?'true':'false';}
function tokenInput(form){var input=form.querySelector('input[name="cf-turnstile-response"]');if(!input){input=document.createElement('input');input.type='hidden';input.name='cf-turnstile-response';form.appendChild(input);}return input;}
function submitButton(form){return form.querySelector('button[type="submit"],button:not([type])');}
function setLoading(){mounts().forEach(function(m){m.innerHTML='<p class="workspace-field__hint">Loading secure human verification…</p>';});forms().forEach(function(f){var b=submitButton(f);if(b){b.dataset.ftnOriginalLabel=b.textContent||'Submit';b.disabled=true;b.textContent='Complete human verification to submit';}});}
function restoreSubmit(form){var b=submitButton(form);if(b){b.disabled=false;b.textContent=b.dataset.ftnOriginalLabel||'Submit for FTN Review';delete b.dataset.ftnOriginalLabel;}}
function showUnavailable(message){setExpected(false);mounts().forEach(function(m){m.innerHTML='<p class="workspace-field__hint"><strong>Secure web submission is not active yet.</strong> '+message+'</p>';});document.dispatchEvent(new CustomEvent('ftn:turnstile-unavailable',{detail:{message:message}}));}
function loadScript(){return new Promise(function(resolve,reject){if(global.turnstile&&typeof global.turnstile.render==='function'){resolve();return;}var existing=document.querySelector('script[data-ftn-turnstile-api]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}var s=document.createElement('script');s.src=SCRIPT_URL;s.async=true;s.defer=true;s.setAttribute('data-ftn-turnstile-api','true');s.onload=resolve;s.onerror=function(){reject(new Error('Cloudflare Turnstile could not be loaded.'));};document.head.appendChild(s);});}
function render(siteKey){mounts().forEach(function(m){var form=m.closest('form');if(!form)return;m.innerHTML='';var input=tokenInput(form),button=submitButton(form);try{global.turnstile.render(m,{sitekey:siteKey,theme:'auto',action:'ftn_transaction',callback:function(token){input.value=token;input.dispatchEvent(new Event('input',{bubbles:true}));restoreSubmit(form);},'expired-callback':function(){input.value='';if(button){button.disabled=true;button.textContent='Complete human verification to submit';}},'error-callback':function(){input.value='';showUnavailable('Cloudflare could not verify this browser session. Use the safe fallback or reload and try again.');}});}catch(e){showUnavailable('The verification widget could not be rendered.');}});}
async function init(){if(!mounts().length)return;try{var r=await fetch(CONFIG_URL,{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('Public runtime configuration is unavailable.');var cfg=await r.json(),key=String(cfg.turnstileSiteKey||'').trim();if(!key){showUnavailable('The FTN Cloudflare site key still needs to be connected.');return;}setExpected(true);setLoading();await loadScript();render(key);}catch(e){showUnavailable('FTN will not bypass human verification.');}}
ready(init);
// Public re-mount hook (2026-08-25, FTN Account sign-in gate): the automatic ready(init) call
// above only ever scans the DOM once, at load -- correct for the contact page's static form, but
// account.js builds its sign-in form dynamically (after an async auth-state check), so its
// [data-turnstile-mount] element does not exist yet when ready(init) fires. Exposing init() here
// lets a caller re-scan after injecting new markup, without changing the existing static-form
// behavior at all -- mounts()/forms() re-query the live DOM every call, so calling this twice for
// the same already-rendered widget is harmless (render() re-finds the same mount and no-ops via
// Turnstile's own re-render handling).
global.FTN=global.FTN||{};
global.FTN.TurnstileGate={mount:init};
})(window);
