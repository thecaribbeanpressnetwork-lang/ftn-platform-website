// FTN Platform — Explore FTN (Phase B, final integration pass). A goal-oriented front door for
// the FTN Directory: "What do you want to do?" instead of a flat list of products. Reuses the
// EXISTING product registry and intent router verbatim -- no second registry, no new matching
// logic. FTN.IntentRouter.route() already does real, transparent keyword matching against
// js/product-registry-data.js (the same engine js/ibis-widget.js and /ibis-ai/ already use); this
// module only adds a goal-first presentation layer on top of it.
(function (global) {
  'use strict';

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Real phrases mapped to real product-registry keywords/capabilities -- not a second registry,
  // just a curated list of realistic user goals that route through the same search() the rest of
  // the site already relies on.
  var GOALS = [
    ['Make a film', 'make a Caribbean film or documentary'],
    ['Make a TV show', 'TV show series pilot screenplay'],
    ['Make music', 'make Caribbean music soca reggae dancehall'],
    ['Make a beat', 'make an instrumental beat riddim'],
    ['Create video', 'create or edit video content'],
    ['Create images', 'create image visual graphic poster'],
    ['Find opportunities', 'find jobs grants funding opportunities'],
    ['Promote my project', 'promote or advertise my project campaign'],
    ['Explore Caribbean resources', 'Trinidad Caribbean government civic resources'],
    ['Ask ibis', 'ask ibis a question route me to the right tool'],
  ];

  function loadScript(src, marker) {
    return new Promise(function (resolve) {
      if (document.querySelector('script[' + marker + ']')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src; s.async = false; s.setAttribute(marker, 'true'); s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  function ensureIntentRouter() {
    if (global.FTN && global.FTN.IntentRouter) return Promise.resolve();
    return loadScript('/js/intent-router.js', 'data-explore-ftn-intent-router');
  }

  function renderResults(host, goalText) {
    var matches = global.FTN.IntentRouter.route(goalText);
    if (!matches.length) {
      host.innerHTML = '<p class="explore-ftn__empty">No strong FTN match yet. Try describing the outcome you want, or <a href="/ibis-ai/">ask ibis directly</a>.</p>';
      return;
    }
    host.innerHTML = '<div class="explore-ftn__matches">' + matches.slice(0, 4).map(function (m) {
      return '<a class="explore-ftn__match" href="' + esc(m.product.route) + '">'
        + '<strong>' + esc(m.product.name) + '</strong>'
        + '<span>' + esc(m.product.tagline) + '</span>'
        + '<small>' + esc(m.explanation) + '</small>'
        + '</a>';
    }).join('') + '</div>';
  }

  function build() {
    var anchor = document.querySelector('.ftn-directory__intro');
    if (!anchor || document.getElementById('explore-ftn')) return false;
    var section = document.createElement('section');
    section.id = 'explore-ftn';
    section.className = 'explore-ftn';
    section.innerHTML =
      '<div class="explore-ftn__intro"><span>EXPLORE FTN</span><h2>What do you want to do?</h2>'
      + '<p>Pick a goal, or describe it in your own words. FTN routes you to the right product -- no need to know FTN’s internal structure first.</p></div>'
      + '<div class="explore-ftn__goals">' + GOALS.map(function (g) {
        return '<button type="button" data-goal="' + esc(g[1]) + '">' + esc(g[0]) + '</button>';
      }).join('') + '</div>'
      + '<form class="explore-ftn__form" id="explore-ftn-form"><label for="explore-ftn-input" class="u-sr-only">Describe what you want to do</label>'
      + '<input id="explore-ftn-input" type="text" maxlength="200" placeholder="Or describe it in your own words…" autocomplete="off">'
      + '<button type="submit" class="btn btn-primary btn-sm">Find my path</button></form>'
      + '<div class="explore-ftn__results" id="explore-ftn-results" role="status" aria-live="polite"></div>';
    anchor.insertAdjacentElement('afterend', section);

    ensureIntentRouter().then(function () {
      var results = document.getElementById('explore-ftn-results');
      var form = document.getElementById('explore-ftn-form');
      var input = document.getElementById('explore-ftn-input');
      section.querySelectorAll('[data-goal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          section.querySelectorAll('[data-goal]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          input.value = '';
          renderResults(results, btn.getAttribute('data-goal'));
          results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text) return;
        section.querySelectorAll('[data-goal]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        renderResults(results, text);
      });
    });
    return true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})(window);
