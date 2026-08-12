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
    a.textContent = 'InvestIn';
  });

  function mountInvestInEntry() {
    if (location.pathname.indexOf('/invest') === 0) return;
    var host = document.querySelector('.nexus-header__actions, .nexus-nav');
    if (!host || host.querySelector('a[href="/invest/"]')) return;
    var link = document.createElement('a');
    link.className = 'btn btn-outline btn-sm';
    link.href = '/invest/';
    link.textContent = 'InvestIn';
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
