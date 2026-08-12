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
  loadOnce('/js/platform-foundation.js', 'data-ftn-platform-foundation');

  if (location.pathname.indexOf('/radio') === 0) loadOnce('/js/radio-airtime.js', 'data-ftn-radio-airtime');
  if (location.pathname.indexOf('/screen') === 0) loadOnce('/js/screen-festival-package.js', 'data-ftn-screen-festival');
  if (location.pathname.indexOf('/applications') === 0) loadOnce('/js/applications-creator-doorways.js', 'data-ftn-creator-doorways');

  document.querySelectorAll('a[href="/contact/#investors"],a[href="/contact/?#investors"]').forEach(function (a) {
    a.setAttribute('href', '/invest/');
  });

  function mountSupportChooser() {
    if (document.querySelector('[data-ftn-support-trigger]') || location.pathname.indexOf('/support') === 0) return;
    var mobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    var host = mobile ? document.querySelector('.mobile-nav__actions') : document.querySelector('.site-header__actions');
    host = host || document.querySelector('.nexus-header__actions, .nexus-nav');
    if (!host) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline btn-sm';
    button.textContent = 'Support Us';
    button.setAttribute('data-ftn-support-trigger', 'true');
    button.setAttribute('aria-haspopup', 'dialog');
    if (mobile) host.appendChild(button); else host.insertBefore(button, host.firstChild);

    var wrap = document.createElement('div');
    wrap.hidden = true;
    wrap.setAttribute('data-ftn-support-dialog', 'true');
    wrap.innerHTML = '<div data-ftn-support-backdrop style="position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.66);backdrop-filter:blur(7px);display:grid;place-items:center;padding:20px"><section role="dialog" aria-modal="true" aria-labelledby="ftn-support-title" style="width:min(440px,100%);background:#0d0e11;color:#fff;border:1px solid #34363d;border-radius:22px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.55)"><p style="margin:0 0 6px;color:#ff4551;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase">Support FTN</p><h2 id="ftn-support-title" style="margin:0 0 8px;font:800 1.45rem/1.15 Montserrat,Inter,sans-serif">Choose how you want to help.</h2><p style="margin:0 0 18px;color:#b8bbc2;line-height:1.55;font-size:.92rem">No pressure. Pick the option that suits you, or simply keep using and sharing FTN.</p><div style="display:grid;gap:10px"><a class="btn btn-primary" href="https://ko-fi.com/facethenationtt" rel="noopener noreferrer">One-time support · Ko-fi</a><a class="btn btn-outline btn-outline--on-dark" href="https://www.patreon.com/cw/FTNPlatform" rel="noopener noreferrer">Ongoing support · Patreon</a><a class="btn btn-outline btn-outline--on-dark" href="/invest/">InvestIn · strategic support or partnership</a></div><button type="button" data-ftn-support-close style="margin-top:16px;border:0;background:none;color:#aeb2ba;cursor:pointer;padding:6px 0;font:700 12px Inter,sans-serif">Not now</button></section></div>';
    document.body.appendChild(wrap);
    function close(){wrap.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',function(){wrap.hidden=false;button.setAttribute('aria-expanded','true');var closeBtn=wrap.querySelector('[data-ftn-support-close]');if(closeBtn)closeBtn.focus();});
    wrap.querySelector('[data-ftn-support-close]').addEventListener('click',close);
    wrap.querySelector('[data-ftn-support-backdrop]').addEventListener('click',function(e){if(e.target===e.currentTarget)close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!wrap.hidden)close();});
  }

  mountSupportChooser();

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
