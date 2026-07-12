// FTN Platform Website — scroll-reveal (progressive enhancement, motion-respectful).
// Content is fully visible without this file — [data-reveal] elements render at full
// opacity by default. Only once this script runs does an element get hidden-then-revealed,
// and only if the visitor hasn't asked for reduced motion. No dependency, no framework.
//
// Safety net: hiding content by default and relying entirely on an async observer to show
// it again is fragile — if the observer never fires for an element (a rendering hiccup, an
// element positioned in a way the observer misses, a browser quirk), that content would
// stay invisible forever with no recovery. Every element therefore also gets a bounded
// fallback timer that force-reveals it regardless of intersection state, so nothing can be
// hidden longer than a fraction of a second beyond a normal reveal.
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  var FALLBACK_MS = 1200;

  function revealNow(el) {
    el.classList.add('reveal-in');
  }

  els.forEach(function (el) {
    el.classList.add('reveal-init');
    setTimeout(function () { revealNow(el); }, FALLBACK_MS);
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        revealNow(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  els.forEach(function (el) { io.observe(el); });
})();
