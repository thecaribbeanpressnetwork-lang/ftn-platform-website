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

  if (location.pathname.indexOf('/radio') === 0) loadOnce('/js/radio-airtime.js', 'data-ftn-radio-airtime');
  if (location.pathname.indexOf('/screen') === 0) loadOnce('/js/screen-festival-package.js', 'data-ftn-screen-festival');
  if (location.pathname.indexOf('/applications') === 0) loadOnce('/js/applications-creator-doorways.js', 'data-ftn-creator-doorways');

  document.querySelectorAll('a[href="/contact/#investors"],a[href="/contact/?#investors"]').forEach(function (a) {
    a.setAttribute('href', '/invest/');
    a.textContent = 'FTN Invest-in';
  });

  var PRIMARY_LINKS=[['NOW','/now/'],['COMMUNITY','/community-connect/'],['CULTURE','/riddim/'],['OPPORTUNITY','/opportunities/'],['MY FTN','/account/'],['ASK IBIS','/ibis-ai/']];
  function links(className){return PRIMARY_LINKS.map(function(item){var current=location.pathname===item[1]||(item[1]!=='/'&&location.pathname.indexOf(item[1])===0);return'<a href="'+item[1]+'"'+(className?' class="'+className+'"':'')+(current?' aria-current="page"':'')+'>'+item[0]+'</a>';}).join('');}
  function normalizeNavigation(){
    document.querySelectorAll('.site-nav').forEach(function(nav){nav.setAttribute('aria-label','Primary');nav.innerHTML='<ul class="site-nav__list">'+PRIMARY_LINKS.map(function(item){return'<li class="site-nav__item"><a class="site-nav__trigger site-nav__trigger--link" href="'+item[1]+'">'+item[0]+'</a></li>';}).join('')+'</ul>';});
    document.querySelectorAll('.nexus-nav').forEach(function(nav){nav.setAttribute('aria-label','Primary');nav.innerHTML=links('');});
    document.querySelectorAll('.mobile-nav__links').forEach(function(nav){nav.innerHTML=links('mobile-nav__link--top');});
    document.querySelectorAll('[data-sign-in-entry]').forEach(function(a){a.href='/account/';a.textContent='Account';a.setAttribute('aria-label','Open FTN Account');});
    document.querySelectorAll('.nexus-header__bar').forEach(function(bar){if(bar.querySelector('[data-nexus-nav-toggle]'))return;var panel=document.createElement('div');panel.className='nexus-mobile-nav';panel.id='nexus-mobile-nav';panel.innerHTML=links('');bar.parentNode.appendChild(panel);var button=document.createElement('button');button.type='button';button.className='nexus-nav-toggle';button.setAttribute('data-nexus-nav-toggle','');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','nexus-mobile-nav');button.textContent='Menu';bar.appendChild(button);button.onclick=function(){var open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!open));panel.classList.toggle('is-open',!open);};});
  }
  normalizeNavigation();

  function normalizeFooter(){document.querySelectorAll('.site-footer__columns').forEach(function(footer){footer.innerHTML='<div><p class="site-footer__heading">Explore FTN</p><div class="site-footer__links"><a href="/now/">NOW</a><a href="/community-connect/">COMMUNITY</a><a href="/riddim/">CULTURE</a><a href="/opportunities/">OPPORTUNITY</a><a href="/account/">MY FTN</a><a href="/ibis-ai/">ASK IBIS</a></div></div><div><p class="site-footer__heading">Directory</p><div class="site-footer__links"><a href="/applications/">FTN Directory</a><a href="/observatory/">FTN Live</a><a href="/parliament/">FTN Parliament</a><a href="/invest/">FTN Invest-in</a><a href="/about/">About FTN</a><a href="/contact/">Contact</a></div></div><div><p class="site-footer__heading">Legal and access</p><div class="site-footer__links"><a href="/trust/">Trust Centre</a><a href="/legal/privacy-policy/">Privacy</a><a href="/legal/terms-of-service/">Terms</a><a href="/accessibility/">Accessibility</a></div></div>';});document.querySelectorAll('.site-footer__bottom-links').forEach(function(row){row.innerHTML='<a href="/sitemap/">Sitemap</a><a href="/accessibility/">Accessibility</a><a href="/applications/">FTN Directory</a>';});}
  normalizeFooter();

  function maybeMountOwnerControl(){var hasSession=false;try{for(var i=0;i<localStorage.length;i++){if(/^sb-.*-auth-token$/.test(localStorage.key(i)||'')){hasSession=true;break;}}}catch(e){}if(!hasSession)return;var script=document.createElement('script');script.src='/js/ftn-auth.js?v=20260812.1';script.onload=function(){if(!globalThis.FTN||!globalThis.FTN.Auth)return;globalThis.FTN.Auth.ownerAccess().then(function(result){if(!result||!result.allowed)return;document.querySelectorAll('.site-header__actions,.nexus-header__bar').forEach(function(host){if(host.querySelector('[data-owner-console]'))return;var link=document.createElement('a');link.href='/god-mode/';link.textContent='God Mode';link.className='btn btn-primary btn-sm';link.setAttribute('data-owner-console','');link.setAttribute('aria-label','Open FTN Nexus Command God Mode');host.appendChild(link);});});};document.head.appendChild(script);}
  maybeMountOwnerControl();

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
