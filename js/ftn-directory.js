(function(global){
'use strict';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function announce(message){var live=document.getElementById('ftn-directory-status');if(live)live.textContent=message;}
async function copy(url,name){try{await navigator.clipboard.writeText(url);announce(name+' link copied.');}catch(e){announce('Copy was unavailable. Open '+name+' and copy the address from your browser.');}}
async function share(url,name,purpose){if(navigator.share){try{await navigator.share({title:name,text:purpose,url:url});announce(name+' share sheet opened.');return;}catch(e){if(e&&e.name==='AbortError')return;}}copy(url,name);}
function card(p){var absolute=new URL(p.route,location.origin).href,accent=p.atmosphere&&p.atmosphere.accent||'var(--color-red-on-dark)';return'<article class="ftn-directory-card" style="--product-accent:'+esc(accent)+'"><div class="ftn-directory-card__body"><div class="ftn-directory-card__title"><span class="ftn-directory-card__mark" aria-hidden="true"></span><h3>'+esc(p.name)+'</h3><span class="ftn-directory-card__status" data-status="'+esc(p.status)+'">'+esc(p.status)+'</span></div><p>'+esc(p.description)+'</p><small>'+esc(p.visualMnemonic||p.productType||'FTN product')+'</small></div><div class="ftn-directory-card__actions"><a href="'+esc(p.route)+'" aria-label="Open '+esc(p.name)+'">Open</a><button type="button" data-copy="'+esc(absolute)+'" data-product="'+esc(p.name)+'" aria-label="Copy link to '+esc(p.name)+'">Copy link</button><button type="button" data-share="'+esc(absolute)+'" data-product="'+esc(p.name)+'" data-purpose="'+esc(p.description)+'" aria-label="Share '+esc(p.name)+'">Share</button></div></article>';}
function ecosystemLink(p){return'<a class="ecosystem-product-link" href="'+esc(p.route)+'"><span class="ecosystem-product-link__signal" aria-hidden="true"></span><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.tagline)+'</small></span><span class="ecosystem-product-link__arrow" aria-hidden="true">&rarr;</span></a>';}
function groupMarkup(group,variant){var id='ftn-directory-'+group.id,heading=variant==='ecosystem'?'<div class="ftn-directory-group__heading"><h3 id="'+id+'">'+esc(group.title)+'</h3><p>'+esc(group.description)+'</p></div>':'<h3 id="'+id+'">'+esc(group.title)+'</h3>';return'<section class="ftn-directory-group" aria-labelledby="'+id+'">'+heading+'<div class="ftn-directory-group__list">'+group.products.map(variant==='ecosystem'?ecosystemLink:card).join('')+'</div></section>';}
function mount(host){
  if(!global.FTN||!global.FTN.ProductRegistry)return;
  var Registry=global.FTN.ProductRegistry,variant=host.dataset.ftnDirectory==='ecosystem'?'ecosystem':'directory';
  var groups=Registry.ecosystemGroups();
  var intro=variant==='ecosystem'?'<div class="ftn-directory__intro"><span>THE CONNECTED PLATFORM</span><h2 id="ftn-directory-title">Everything connects here.</h2><p>Choose a purpose, then enter the FTN product built for that job.</p></div>':'<div class="ftn-directory__intro"><span>FTN DIRECTORY</span><h2 id="ftn-directory-title">Explore the complete FTN ecosystem.</h2><p>Each public product has one job, one truthful release state and a direct route. Private and vaulted work stays outside public discovery; FTN Account appears only as shared access.</p></div>';
  var account=Registry.get('account');
  var utility=account?'<aside class="ftn-account-utility" aria-label="Shared FTN Account utility"><span>SHARED ACCESS</span><div><h3>'+esc(account.name)+'</h3><p>'+esc(account.description)+'</p></div><a href="'+esc(account.route)+'">Open account <span aria-hidden="true">&rarr;</span></a></aside>':'';
  host.innerHTML=intro+'<div class="ftn-directory__groups">'+groups.map(function(group){return groupMarkup(group,variant);}).join('')+'</div>'+utility+'<p class="u-sr-only" id="ftn-directory-status" role="status" aria-live="polite"></p>';
  host.querySelectorAll('[data-copy]').forEach(function(button){button.addEventListener('click',function(){copy(button.dataset.copy,button.dataset.product);});});
  host.querySelectorAll('[data-share]').forEach(function(button){button.addEventListener('click',function(){share(button.dataset.share,button.dataset.product,button.dataset.purpose);});});
}
function showRetry(host){
  if(host.parentNode.querySelector('.ftn-directory__notice'))return;
  var notice=document.createElement('p');
  notice.className='ftn-directory__notice';
  notice.setAttribute('role','alert');
  notice.innerHTML='Live directory data did not load, so this list may be out of date. <button type="button" data-ftn-directory-retry>Retry</button>';
  host.parentNode.insertBefore(notice,host);
  notice.querySelector('[data-ftn-directory-retry]').addEventListener('click',function(){location.reload();});
}
function boot(host){
  if(global.FTN&&global.FTN.ProductRegistry){mount(host);return;}
  // Registry scripts may still be loading (defer) -- give them one tick before treating this
  // as a real failure, so a normal slow-network load doesn't trip the retry banner needlessly.
  global.setTimeout(function(){
    if(global.FTN&&global.FTN.ProductRegistry){mount(host);}
    else{showRetry(host);}
  },1500);
}
document.querySelectorAll('[data-ftn-directory]').forEach(boot);
})(window);
