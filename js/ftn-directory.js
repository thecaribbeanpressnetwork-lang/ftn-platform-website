(function(global){
'use strict';
var GROUPS=[
  {title:'Civic and public life',ids:['community-connect','govern','parliament','facethenation']},
  {title:'Information and intelligence',ids:['ftn-live','kaiso','ibis-ai','scenario-workspace']},
  {title:'Media and culture',ids:['radio','screen','tv']},
  {title:'Music and creation',ids:['riddim','ftn-fire','dj-tube','daw','epk']},
  {title:'Opportunities and business',ids:['opportunities','invest','top-picks']},
  {title:'Community and infrastructure',ids:['events','display-network']},
  {title:'Shared access',ids:['account'],utility:true}
];
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function announce(message){var live=document.getElementById('ftn-directory-status');if(live)live.textContent=message;}
async function copy(url,name){try{await navigator.clipboard.writeText(url);announce(name+' link copied.');}catch(e){announce('Copy was unavailable. Open '+name+' and copy the address from your browser.');}}
async function share(url,name,purpose){if(navigator.share){try{await navigator.share({title:name,text:purpose,url:url});announce(name+' share sheet opened.');return;}catch(e){if(e&&e.name==='AbortError')return;}}copy(url,name);}
function card(p){var absolute=new URL(p.route,location.origin).href,accent=p.accent||'var(--color-red-on-dark)';return'<article class="ftn-directory-card" style="--product-accent:'+esc(accent)+'"><div class="ftn-directory-card__body"><div class="ftn-directory-card__title"><span class="ftn-directory-card__mark" aria-hidden="true"></span><h3>'+esc(p.name)+'</h3><span class="ftn-directory-card__status" data-status="'+esc(p.status)+'">'+esc(p.status)+'</span></div><p>'+esc(p.description)+'</p><small>'+esc(p.visualMnemonic||p.productType||'FTN product')+'</small></div><div class="ftn-directory-card__actions"><a href="'+esc(p.route)+'" aria-label="Open '+esc(p.name)+'">Open</a><button type="button" data-copy="'+esc(absolute)+'" data-product="'+esc(p.name)+'" aria-label="Copy link to '+esc(p.name)+'">Copy link</button><button type="button" data-share="'+esc(absolute)+'" data-product="'+esc(p.name)+'" data-purpose="'+esc(p.description)+'" aria-label="Share '+esc(p.name)+'">Share</button></div></article>';}
function mount(host){if(!global.FTN||!global.FTN.ProductRegistry)return;host.innerHTML='<div class="ftn-directory__intro"><span>FTN DIRECTORY</span><h2 id="ftn-directory-title">Explore the complete FTN ecosystem.</h2><p>Each public product has one job, one truthful release state and a direct route. Private and vaulted work stays outside public discovery; FTN Account appears only as shared access.</p></div><div class="ftn-directory__groups">'+GROUPS.map(function(group){var products=group.ids.map(function(id){return global.FTN.ProductRegistry.get(id);}).filter(function(p){return p&&p.publicVisibility!==false&&['PRIVATE','VAULTED'].indexOf(p.status)===-1;});return'<section class="ftn-directory-group'+(group.utility?' ftn-directory-group--utility':'')+'" aria-labelledby="ftn-directory-'+group.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'"><h3 id="ftn-directory-'+group.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'">'+esc(group.title)+'</h3><div class="ftn-directory-group__list">'+products.map(card).join('')+'</div></section>';}).join('')+'</div><p class="u-sr-only" id="ftn-directory-status" role="status" aria-live="polite"></p>';
  host.querySelectorAll('[data-copy]').forEach(function(button){button.addEventListener('click',function(){copy(button.dataset.copy,button.dataset.product);});});host.querySelectorAll('[data-share]').forEach(function(button){button.addEventListener('click',function(){share(button.dataset.share,button.dataset.product,button.dataset.purpose);});});
}
document.querySelectorAll('[data-ftn-directory]').forEach(mount);
})(window);
