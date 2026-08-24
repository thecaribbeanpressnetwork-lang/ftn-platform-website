/* FTN public-shell service worker. Private/account/AI/Community data is deliberately excluded. */
'use strict';
// Bump this value for every production shell release. A new cache namespace makes
// sure a browser that previously installed FTN does not continue rendering an
// obsolete HTML/CSS/JS shell after Cloudflare has deployed a repair.
var VERSION='ftn-public-v2.4.1';
var SHELL=[
  '/','/offline/','/manifest.webmanifest','/css/tokens.css','/css/base.css',
  '/css/components/buttons.css','/css/components/nav.css','/css/components/nexus-foundation.css',
  '/css/components/ecosystem-homepage-refinement.css','/css/components/ftn-directory.css',
  '/js/nav.js','/js/platform-foundation.js','/js/product-registry-data.js','/js/product-registry.js','/js/ftn-directory.js','/js/ecosystem-homepage.js',
  '/assets/home/ftn-approved-caribbean-ecosystem.png',
  '/assets/icons/ftn-shortcut-mark.svg?v=20260811.2','/assets/icons/ftn-shortcut-mark-192.png?v=20260811.2','/assets/icons/ftn-shortcut-mark-512.png?v=20260811.2'
];
var PRIVATE=/^\/(god-mode|mission-control|account|love|health|ibis-ai)(\/|$)/;
var NEVER=/^\/(community-connect\/app|auth|api)(\/|$)/;
self.addEventListener('install',function(event){event.waitUntil(caches.open(VERSION).then(function(cache){return cache.addAll(SHELL);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==VERSION;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('message',function(event){if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',function(event){
  var req=event.request;if(req.method!=='GET')return;var url=new URL(req.url);
  if(url.origin!==self.location.origin||PRIVATE.test(url.pathname)||NEVER.test(url.pathname)||/\/functions\/v1\//.test(url.pathname))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(function(response){if(response&&response.ok){var copy=response.clone();caches.open(VERSION).then(function(cache){cache.put(req,copy);});}return response;}).catch(function(){return caches.match(req).then(function(hit){return hit||caches.match('/offline/');});}));return;
  }
  if(/\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)){
    event.respondWith(caches.match(req).then(function(hit){var refresh=fetch(req).then(function(response){if(response&&response.ok)caches.open(VERSION).then(function(cache){cache.put(req,response.clone());});return response;}).catch(function(){return hit;});return hit||refresh;}));
  }
});
