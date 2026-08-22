// FTN Platform Website — global navigation behavior (progressive enhancement).
(function () {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  function loadOnce(src, marker) {
    if (document.querySelector('script[' + marker + ']')) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(marker, 'true');
    document.head.appendChild(script);
  }

  loadOnce('/js/smart-export.js', 'data-ftn-smart-export');
  loadOnce('/js/ux-primitives.js', 'data-ftn-ux-primitives');
  loadOnce('/js/platform-foundation.js?v=20260812.1', 'data-ftn-platform-foundation');
  loadOnce('/js/analytics.js?v=20260818.3', 'data-ftn-analytics');
  loadOnce('/js/ibis-widget.js?v=20260820.3', 'data-ftn-ibis-widget');

  if (location.pathname.indexOf('/radio') === 0) loadOnce('/js/radio-airtime.js', 'data-ftn-radio-airtime');
  if (location.pathname.indexOf('/screen') === 0) loadOnce('/js/screen-festival-package.js', 'data-ftn-screen-festival');
  if (location.pathname.indexOf('/applications') === 0) loadOnce('/js/applications-creator-doorways.js', 'data-ftn-creator-doorways');

  document.querySelectorAll('a[href="/contact/#investors"],a[href="/contact/?#investors"]').forEach(function (a) {
    a.setAttribute('href', '/invest/');
    a.textContent = 'FTN Invest-in';
  });

  // Sitewide ecosystem-header pass: the global nav must show FTN is an ecosystem, not a set of
  // abstract section labels -- every anchor keeps its real "FTN <Product>" name (the brand
  // prefix is never stripped to save space; the "FTN Ecosystem" overflow menu is the answer to
  // "not enough room," not shorter labels). This is a deliberately small, hand-ordered priority
  // list (an explicit founder-set order, not something the Product Registry encodes) -- the
  // FULL product list still comes from the registry itself, see buildEcosystemMenu() below, so
  // there's exactly one hardcoded list here, not two competing ones.
  // Ecosystem Simplification pass: FTN Live retired as an independent identity (it is FTN
  // Observer now -- deep investigation, not ambient viewing) and FTN Now retired outright; both
  // roles are covered by the new FTN Display. Screen and Radio moved out of the primary row (they
  // remain one click away in FTN Ecosystem) to make room for FTN Display and FTN Learn, per the
  // founder's explicit priority order.
  var PRIMARY_NAV=[
    ['FTN Platform','/','The FTN Platform home — the Caribbean ecosystem entry point'],
    ['FTN Community Connect','/community-connect/','Report and track local civic issues'],
    ['FTN Display','/display/','One screen. Watch what is happening in Trinidad & Tobago'],
    ['FTN Observer','/observatory/','Investigate Trinidad & Tobago in depth — indicators and correlations'],
    ['FTN Kaiso','/kaiso/','Caribbean current-affairs and news desk'],
    ['FTN Parliament','/parliament/','Parliament of Trinidad and Tobago public records'],
    ['FTN TV','/tv/','Caribbean television, programmed with purpose'],
    ['FTN Riddim','/riddim/','Caribbean music creation hub — Fire, DJ Tube, DAW, EPK'],
    ['FTN Opportunities','/opportunities/','Jobs, grants and Caribbean opportunities'],
    ['FTN Learn','/learn/','Find something to learn — FTN Skills and FTN School'],
    ['FTN ibis.ai','/ibis-ai/','Ask ibis — FTN’s Caribbean-first AI assistant']
  ];
  function escNav(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function isCurrent(route){return location.pathname===route||(route!=='/'&&location.pathname.indexOf(route)===0);}
  function primaryLinkHtml(item,idx,extraClass){
    var current=isCurrent(item[1]);
    return '<a href="'+item[1]+'"'+(extraClass?' class="'+extraClass+'"':'')+(current?' aria-current="page"':'')+
      (idx!=null?' data-nav-priority="'+idx+'"':'')+' title="'+escNav(item[2])+'" aria-label="'+escNav(item[0])+' — '+escNav(item[2])+'">'+escNav(item[0])+'</a>';
  }
  function links(className){return PRIMARY_NAV.map(function(item){return primaryLinkHtml(item,null,className);}).join('');}

  // FTN Ecosystem overflow menu -- the Product Registry (js/product-registry-data.js +
  // js/product-registry.js) is the one source of truth for the full grouped list, per the
  // brief's own instruction not to maintain a second hardcoded product directory. Lazily loaded
  // (most pages don't otherwise need it) and rendered once available; the trigger itself is
  // always present so nothing shifts layout while it loads.
  function loadOnceBySrc(src,marker){
    // Some pages (e.g. the homepage) already carry a static, versioned
    // <script src="/js/product-registry-data.js?v=..."> tag for their own use -- loadOnce()'s
    // marker-attribute check doesn't see those, so it would inject a second copy. Check by src
    // substring first (ignoring any ?v= query) before falling back to a fresh load.
    var base=src.split('?')[0];
    if(document.querySelector('script[src^="'+base+'"]'))return;
    loadOnce(src,marker);
  }
  function ensureRegistryLoaded(callback){
    if(globalThis.FTN&&globalThis.FTN.ProductRegistry){callback();return;}
    loadOnceBySrc('/js/product-registry-data.js','data-ftn-registry-data');
    loadOnceBySrc('/js/product-registry.js','data-ftn-registry-api');
    var tries=0;(function poll(){if((globalThis.FTN&&globalThis.FTN.ProductRegistry)||tries++>120)callback();else setTimeout(poll,25);})();
  }
  function ecosystemMenuHtml(){
    var groups=globalThis.FTN.ProductRegistry.ecosystemGroups();
    return '<div class="ecosystem-menu__grid">'+groups.map(function(group){
      return '<div class="ecosystem-menu__group"><p class="ecosystem-menu__group-title">'+escNav(group.title)+'</p><ul>'+
        group.products.map(function(p){return '<li><a href="'+p.route+'"'+(isCurrent(p.route)?' aria-current="page"':'')+'>'+escNav(p.name)+'</a></li>';}).join('')+
      '</ul></div>';
    }).join('')+'</div>';
  }
  function populateEcosystemMenus(){
    ensureRegistryLoaded(function(){
      if(!globalThis.FTN||!globalThis.FTN.ProductRegistry)return;
      var html=ecosystemMenuHtml();
      document.querySelectorAll('[data-ecosystem-menu-panel]').forEach(function(panel){panel.innerHTML=html;});
      document.querySelectorAll('[data-ecosystem-menu-mobile]').forEach(function(panel){panel.innerHTML=html;});
    });
  }

  function normalizeNavigation(){
    document.querySelectorAll('.site-nav').forEach(function(nav){
      nav.setAttribute('aria-label','Primary');
      nav.innerHTML='<ul class="site-nav__list">'+
        PRIMARY_NAV.map(function(item,idx){return '<li class="site-nav__item" data-nav-priority-item="'+idx+'">'+primaryLinkHtml(item,idx,'site-nav__trigger site-nav__trigger--link')+'</li>';}).join('')+
        '<li class="site-nav__item" data-nav-item><button type="button" class="site-nav__trigger" data-nav-trigger aria-haspopup="true" aria-expanded="false">FTN Ecosystem<svg class="chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button><div class="site-nav__dropdown site-nav__dropdown--mega" data-ecosystem-menu-panel><p class="ecosystem-menu__loading">Loading FTN Ecosystem…</p></div></li>'+
        '</ul>';
    });
    document.querySelectorAll('.nexus-nav').forEach(function(nav){
      nav.setAttribute('aria-label','Primary');
      nav.innerHTML=PRIMARY_NAV.map(function(item,idx){return primaryLinkHtml(item,idx,null);}).join('')+
        '<div class="nexus-nav__item" data-nav-item><button type="button" class="nexus-nav__ecosystem-trigger" data-nav-trigger aria-haspopup="true" aria-expanded="false">FTN Ecosystem ▾</button><div class="site-nav__dropdown site-nav__dropdown--mega nexus-nav__dropdown" data-ecosystem-menu-panel><p class="ecosystem-menu__loading">Loading FTN Ecosystem…</p></div></div>';
    });
    document.querySelectorAll('.mobile-nav__links').forEach(function(nav){
      nav.innerHTML=links('mobile-nav__link--top')+
        '<details class="mobile-nav__ecosystem"><summary>More FTN products</summary><div data-ecosystem-menu-mobile><p class="ecosystem-menu__loading">Loading…</p></div></details>';
    });
    // Return-to-origin href is set by js/platform-foundation.js's accountLinks() (loaded a few
    // lines below, and the actual authority here since it always runs after this synchronous
    // block) -- this just sets the accessible label; not duplicating its return= logic.
    document.querySelectorAll('[data-sign-in-entry]').forEach(function(a){a.textContent='Account';a.setAttribute('aria-label','Open FTN Account');});
    document.querySelectorAll('.nexus-header__bar').forEach(function(bar){if(bar.querySelector('[data-nexus-nav-toggle]'))return;var panel=document.createElement('div');panel.className='nexus-mobile-nav';panel.id='nexus-mobile-nav';panel.innerHTML=links('')+'<details class="mobile-nav__ecosystem"><summary>More FTN products</summary><div data-ecosystem-menu-mobile><p class="ecosystem-menu__loading">Loading…</p></div></details>';bar.parentNode.appendChild(panel);var button=document.createElement('button');button.type='button';button.className='nexus-nav-toggle';button.setAttribute('data-nexus-nav-toggle','');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','nexus-mobile-nav');button.textContent='Menu';bar.appendChild(button);button.onclick=function(){var open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!open));panel.classList.toggle('is-open',!open);};});
    // Deferred to DOMContentLoaded: nav.js itself is a plain (non-deferred) <script> that can
    // run before LATER static tags on the same page -- e.g. the homepage's own
    // <script src="/js/product-registry-data.js?v=..."> -- have been parsed into the DOM. Calling
    // this synchronously here made ensureRegistryLoaded()'s "is it already on the page" check
    // race that later tag and load a second, unversioned copy. Waiting for DOMContentLoaded
    // (or firing at once if it already passed) makes the DOM-presence check reliable, since the
    // whole document is parsed by then; the dropdown itself is hidden until opened regardless.
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',populateEcosystemMenus);else populateEcosystemMenus();
  }
  normalizeNavigation();

  // Canonical Platform / Company / Legal structure -- one shared footer, same on every
  // site-footer page (see CLAUDE.md FIX 6). Social icons are normalized separately below
  // since they live in .site-footer__brand, a sibling this function does not touch.
  var FOOTER_PLATFORM=[['About FTN','/about/'],['Community Connect','/community-connect/'],['FTN Display','/display/'],['FTN Observer','/observatory/'],['FTN Learn','/learn/'],['Scenario Workspace','/scenario-workspace/'],['FTN Events','/events/'],['Face The Nation','/facethenation'],['ibis.ai','/ibis-ai/'],['FTN Riddim','/riddim/'],['FTN Kaiso','/kaiso/'],['FTN Radio','/radio/'],['FTN Screen','/screen/'],['FTN Opportunities','/opportunities/'],['Display Network','/display-network/']];
  var FOOTER_COMPANY=[['About FTN','/about/'],['FTN Invest-in','/invest/'],['Contact','/contact/'],['Trust Centre','/trust/']];
  var FOOTER_LEGAL=[['Privacy Policy','/legal/privacy-policy/'],['Terms of Service','/legal/terms-of-service/'],['Cookie Policy','/legal/cookie-policy/'],['Data Retention','/legal/data-retention/']];
  var FOOTER_SOCIAL=[['https://x.com/realityarttv','X','social-x.svg'],['https://facebook.com/realityarttv','Facebook','social-facebook.svg'],['https://instagram.com/realityarttv','Instagram','social-instagram.svg'],['https://youtube.com/realityarttv','YouTube','social-youtube.svg'],['https://linkedin.com/company/realityarttv','LinkedIn','social-linkedin.svg']];
  function footerColumn(title,items){return '<div><p class="site-footer__heading">'+title+'</p><div class="site-footer__links">'+items.map(function(i){return '<a href="'+i[1]+'">'+i[0]+'</a>';}).join('')+'</div></div>';}
  function normalizeFooter(){
    document.querySelectorAll('.site-footer__columns').forEach(function(footer){footer.innerHTML=footerColumn('Platform',FOOTER_PLATFORM)+footerColumn('Company',FOOTER_COMPANY)+footerColumn('Legal',FOOTER_LEGAL);});
    document.querySelectorAll('.site-footer__bottom-links').forEach(function(row){row.innerHTML='<a href="/sitemap/">Sitemap</a><a href="/accessibility/">Accessibility</a><a href="/applications/">FTN Directory</a>';});
    document.querySelectorAll('.site-footer__brand').forEach(function(brand){
      if(brand.querySelector('.site-footer__social'))return;
      var wrap=document.createElement('div');
      wrap.className='site-footer__social';
      wrap.innerHTML=FOOTER_SOCIAL.map(function(s){return '<a href="'+s[0]+'" aria-label="FTN Platform on '+s[1]+'"><img src="/assets/icons/'+s[2]+'" alt="" width="16" height="16"></a>';}).join('');
      brand.appendChild(wrap);
    });
  }
  normalizeFooter();

  // Shared session/auth-loading plumbing (Pass 16) -- reused by both the God Mode owner
  // control below and the authenticated-identity chip, instead of each independently checking
  // localStorage and injecting its own copy of ftn-auth.js. This is still Supabase Auth end to
  // end -- no new auth system, just one shared loader instead of two near-duplicate ones.
  function hasLikelySession(){var found=false;try{for(var i=0;i<localStorage.length;i++){if(/^sb-.*-auth-token$/.test(localStorage.key(i)||'')){found=true;break;}}}catch(e){}return found;}
  function ensureAuthLoaded(callback){
    if(globalThis.FTN&&globalThis.FTN.Auth){callback();return;}
    if(document.querySelector('script[data-ftn-auth-shared]')){var tries=0;(function poll(){if(globalThis.FTN&&globalThis.FTN.Auth||tries++>80)callback();else setTimeout(poll,25);})();return;}
    var script=document.createElement('script');script.src='/js/ftn-auth.js?v=20260812.1';script.setAttribute('data-ftn-auth-shared','');script.onload=function(){callback();};script.onerror=function(){callback();};document.head.appendChild(script);
  }

  function maybeMountOwnerControl(){if(!hasLikelySession())return;ensureAuthLoaded(function(){if(!globalThis.FTN||!globalThis.FTN.Auth)return;globalThis.FTN.Auth.ownerAccess().then(function(result){if(!result||!result.allowed)return;document.querySelectorAll('.site-header__actions,.nexus-header__bar').forEach(function(host){if(host.querySelector('[data-owner-console]'))return;var link=document.createElement('a');link.href='/god-mode/';link.textContent='God Mode';link.className='btn btn-primary btn-sm';link.setAttribute('data-owner-console','');link.setAttribute('aria-label','Open FTN Nexus Command God Mode');host.appendChild(link);});}).catch(function(){});});}
  maybeMountOwnerControl();

  // FTN Rule 4 (authenticated identity): a signed-in user must know they're signed in. Reuses
  // the exact same Supabase Auth session (FTN.Auth.getVerifiedUser()) already powering /account/
  // -- no new auth system, no new session store. Replaces the plain "Account" link with a real
  // identity chip (initials/avatar + name where space permits) carrying a small menu. Guests
  // (no likely session, or a session that turns out invalid) keep the existing plain link
  // unchanged -- it already routes to /account/'s own real sign-in flow.
  function escText(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function chipInitials(user){
    var name=(user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name))||'';
    var parts=String(name).trim().split(/\s+/).filter(Boolean);
    if(parts.length>=2)return(parts[0][0]+parts[1][0]).toUpperCase();
    if(parts.length===1)return parts[0].slice(0,2).toUpperCase();
    var email=user.email||'';
    return email.slice(0,2).toUpperCase()||'FT';
  }
  function ensureSaveLoaded(callback){
    if(globalThis.FTN&&globalThis.FTN.Save){callback();return;}
    // storage.js is already a static <script> tag on most pages (not loaded via loadOnce), so
    // dedupe by checking any existing src rather than a loadOnce marker that would never match
    // those static tags and would otherwise inject a second copy.
    function withStorage(next){
      if(globalThis.FTN&&globalThis.FTN.storage){next();return;}
      if(document.querySelector('script[src="/js/storage.js"]')){var tries=0;(function poll(){if((globalThis.FTN&&globalThis.FTN.storage)||tries++>80)next();else setTimeout(poll,25);})();return;}
      var s=document.createElement('script');s.src='/js/storage.js';s.onload=function(){next();};s.onerror=function(){next();};document.head.appendChild(s);
    }
    withStorage(function(){
      if(document.querySelector('script[data-ftn-save-shared]')){var tries=0;(function poll(){if((globalThis.FTN&&globalThis.FTN.Save)||tries++>80)callback();else setTimeout(poll,25);})();return;}
      var script=document.createElement('script');script.src='/js/ftn-save.js';script.setAttribute('data-ftn-save-shared','');script.onload=function(){callback();};script.onerror=function(){callback();};
      document.head.appendChild(script);
    });
  }
  function mountAccountIdentity(){
    if(!hasLikelySession())return;
    ensureAuthLoaded(function(){
      if(!globalThis.FTN||!globalThis.FTN.Auth)return;
      globalThis.FTN.Auth.getVerifiedUser().then(function(user){
        if(!user)return;
        ensureSaveLoaded(function(){renderAccountChip(user);});
      }).catch(function(){});
    });
  }
  function renderAccountChip(user){
        var label=(user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name))||user.email||'Signed in';
        var initials=chipInitials(user);
        // Only ever added when a real saved item exists -- no decorative/empty menu rows.
        var savedCount=(globalThis.FTN.Save&&globalThis.FTN.Save.count)?globalThis.FTN.Save.count():0;
        var savedItem=savedCount>0?'<a role="menuitem" href="/account/#saved">Saved ('+savedCount+')</a>':'';
        document.querySelectorAll('[data-sign-in-entry]').forEach(function(a){
          if(!a||a.closest('[data-account-chip]'))return;
          var chip=document.createElement('div');
          chip.className='ftn-account-chip';
          chip.setAttribute('data-account-chip','');
          chip.innerHTML='<button type="button" class="ftn-account-chip__trigger" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu — signed in as '+escText(label)+'"><span class="ftn-account-chip__avatar" aria-hidden="true">'+escText(initials)+'</span><span class="ftn-account-chip__name">'+escText(label)+'</span></button><div class="ftn-account-chip__menu" role="menu" hidden><p class="ftn-account-chip__signed-in">Signed in as<br><strong>'+escText(label)+'</strong></p><a role="menuitem" href="/account/">Account</a>'+savedItem+'<button role="menuitem" type="button" data-account-sign-out>Sign out</button></div>';
          a.replaceWith(chip);
          var trigger=chip.querySelector('.ftn-account-chip__trigger'),menu=chip.querySelector('.ftn-account-chip__menu');
          trigger.addEventListener('click',function(e){e.stopPropagation();var open=trigger.getAttribute('aria-expanded')==='true';trigger.setAttribute('aria-expanded',String(!open));menu.hidden=open;});
          chip.querySelector('[data-account-sign-out]').addEventListener('click',function(){globalThis.FTN.Auth.signOut().then(function(){location.href='/account/';});});
        });
        document.addEventListener('click',function(e){document.querySelectorAll('[data-account-chip]').forEach(function(chip){if(chip.contains(e.target))return;var trigger=chip.querySelector('.ftn-account-chip__trigger'),menu=chip.querySelector('.ftn-account-chip__menu');if(trigger)trigger.setAttribute('aria-expanded','false');if(menu)menu.hidden=true;});});
        document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;document.querySelectorAll('[data-account-chip] .ftn-account-chip__menu').forEach(function(m){m.hidden=true;});document.querySelectorAll('[data-account-chip] .ftn-account-chip__trigger').forEach(function(t){t.setAttribute('aria-expanded','false');});});
  }
  mountAccountIdentity();

  function mountInvestInEntry() {
    if (location.pathname.indexOf('/invest') === 0) return;
    var host = document.querySelector('.nexus-header__actions, .nexus-nav');
    if (!host || host.querySelector('a[href="/invest/"]')) return;
    var link = document.createElement('a');
    link.className = 'btn btn-outline btn-sm';
    link.href = '/invest/';
    link.textContent = 'FTN Invest-in';
    host.insertBefore(link, host.firstChild);
  }

  mountInvestInEntry();

  var toggle = document.querySelector('[data-nav-toggle]');
  var mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      mobileNav.classList.toggle('is-open', !isOpen);
    });
  }

  var navItems = document.querySelectorAll('[data-nav-item]');
  function closeAll(except) {
    navItems.forEach(function (item) {
      if (item !== except) {
        item.classList.remove('is-open');
        var trigger = item.querySelector('[data-nav-trigger]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  navItems.forEach(function (item) {
    var trigger = item.querySelector('[data-nav-trigger]');
    if (!trigger) return;
    trigger.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      closeAll(item);
      item.classList.toggle('is-open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });
  });
  document.addEventListener('click', function (event) { if (!event.target.closest('[data-nav-item]')) closeAll(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeAll();
      if (mobileNav && mobileNav.classList.contains('is-open')) {
        mobileNav.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
})();
