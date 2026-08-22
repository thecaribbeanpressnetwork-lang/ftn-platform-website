// FTN Learn — the FTN Skills / FTN School fork, search over real listings, honest empty states,
// and provider fallback cards (PROVIDER != COURSE). Reuses the Workspace Shell, Search Foundation
// and Integration Adapter already built for the other flagship products rather than a new stack.
(function (global) {
  'use strict';
  var esc = global.FTN.WorkspaceShell.escapeHtml;

  function fmtMoney(n, currency) { return n == null ? null : (currency || 'TTD') + ' $' + Number(n).toLocaleString(); }

  function listingCardHTML(item) {
    var money = [];
    var reg = fmtMoney(item.registrationFee, item.currency);
    var tuition = fmtMoney(item.tuition, item.currency);
    if (reg) money.push('Registration ' + reg);
    if (tuition) money.push('Tuition ' + tuition);
    var contact = [];
    if (item.whatsapp) contact.push('<a href="https://wa.me/1868' + esc(item.whatsapp.replace(/[^0-9]/g, '')) + '" target="_blank" rel="noopener">WhatsApp ' + esc(item.whatsapp) + '</a>');
    if (item.phone) contact.push('<span>' + esc(item.phone) + '</span>');
    return (
      '<article class="learn-card">' +
        '<div class="learn-card__head"><span class="learn-card__status learn-card__status--' + esc((item.status || '').toLowerCase()) + '">' + esc(item.status) + '</span><span class="learn-card__track">' + esc(item.track === 'skills' ? 'FTN Skills' : 'FTN School') + '</span></div>' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<p class="learn-card__provider">' + esc(item.provider) + '</p>' +
        '<p>' + esc(item.summary) + '</p>' +
        '<dl class="learn-card__facts">' +
          '<div><dt>Where</dt><dd>' + esc(item.community || item.country) + ' · ' + esc(item.mode) + '</dd></div>' +
          (item.level ? '<div><dt>Level</dt><dd>' + esc(item.level) + '</dd></div>' : '') +
          (money.length ? '<div><dt>Cost</dt><dd>' + esc(money.join(' · ')) + '</dd></div>' : '') +
          '<div><dt>Credential</dt><dd>' + esc(item.credentialType) + '</dd></div>' +
        '</dl>' +
        (item.status === 'UNVERIFIED' ? '<p class="learn-card__caution">Sourced from a ' + esc(item.sourcePlatform || 'public post') + ' — confirm current availability with the provider before registering.</p>' : '') +
        '<div class="learn-card__actions">' + contact.join(' ') + '</div>' +
      '</article>'
    );
  }

  function providerCardHTML(p) {
    return (
      '<article class="learn-provider-card">' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p>' + esc(p.description) + '</p>' +
        '<p class="learn-provider-card__category">' + esc(p.category) + '</p>' +
        '<a class="btn btn-outline btn-sm" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">Visit ' + esc(p.name) + ' &rarr;</a>' +
      '</article>'
    );
  }

  function chipsHTML(list, name) {
    return list.map(function (c) { return '<button type="button" class="learn-chip" data-' + name + '="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  }

  function init() {
    global.FTN.WorkspaceShell.init({
      productId: 'learn', mountId: 'workspace-root', accentSmallVar: '--color-opportunities',
      build: function (content) {
        var data = global.FTN.LearnData;
        var track = 'skills';
        var searchTerm = '';

        content.innerHTML =
          '<section class="learn-fork">' +
            '<div class="learn-fork__copy"><span class="workspace__eyebrow">FTN Learn</span><h2>What do you want to learn?</h2><p>Practical skills you can use, or something you are already studying — FTN finds the real provider and gets out of the way.</p></div>' +
            '<div class="learn-fork__buttons">' +
              '<button type="button" class="learn-fork__btn is-active" data-track="skills"><strong>FTN Skills</strong><span>Learn something you can use — trades, tech, business, creative.</span></button>' +
              '<button type="button" class="learn-fork__btn" data-track="school"><strong>FTN School</strong><span>Learn something you are studying — SEA, CSEC, CAPE and more.</span></button>' +
            '</div>' +
          '</section>' +
          '<section class="learn-search">' +
            '<div class="workspace-field learn-search__field"><label for="learn-search-input">Search FTN Learn</label><input id="learn-search-input" type="search" placeholder="e.g. electrical, SEA maths, San Fernando, free"></div>' +
            '<div class="learn-chips" id="learn-category-chips"></div>' +
            '<div class="learn-chips learn-chips--quick"><button type="button" class="learn-chip" data-quick="free">Free</button><button type="button" class="learn-chip" data-quick="in-person">In person</button><button type="button" class="learn-chip" data-quick="online">Online</button></div>' +
          '</section>' +
          '<section class="learn-results" id="learn-results" aria-live="polite"></section>' +
          '<section class="learn-providers"><h2>Real Caribbean learning providers</h2><p class="learn-providers__note">FTN has not indexed these institutions’ current course catalogues — visit them directly for what they offer right now.</p><div class="learn-providers__grid" id="learn-providers-grid"></div></section>' +
          '<section class="learn-crosslink"><p>Looking for a job or funding that uses a skill? <a href="/opportunities/">Find it on FTN Opportunities &rarr;</a></p></section>';

        function renderChips() {
          var root = document.getElementById('learn-category-chips');
          root.innerHTML = chipsHTML(track === 'skills' ? data.skillsCategories : data.schoolCategories, 'category');
          root.querySelectorAll('[data-category]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              searchTerm = btn.getAttribute('data-category');
              document.getElementById('learn-search-input').value = searchTerm;
              renderResults();
            });
          });
        }

        function renderResults() {
          var root = document.getElementById('learn-results');
          var pool = data.listings.filter(function (l) { return l.track === track; });
          var result = global.FTN.SearchFoundation
            ? global.FTN.SearchFoundation.query(pool, { textQuery: searchTerm })
            : { results: pool };
          var items = result.results;
          if (!items.length) {
            root.innerHTML = '<p class="learn-empty">No verified ' + (track === 'skills' ? 'FTN Skills' : 'FTN School') + ' listings match &ldquo;' + esc(searchTerm || 'this search') + '&rdquo; yet. Try a real provider below, or check back — FTN only lists what it can honestly describe.</p>';
            return;
          }
          root.innerHTML = items.map(listingCardHTML).join('');
        }

        function renderProviders() {
          var root = document.getElementById('learn-providers-grid');
          root.innerHTML = data.providers.filter(function (p) { return p.track === 'both' || p.track === track; }).map(providerCardHTML).join('');
        }

        content.querySelectorAll('[data-track]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            track = btn.getAttribute('data-track');
            content.querySelectorAll('[data-track]').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
            searchTerm = '';
            document.getElementById('learn-search-input').value = '';
            renderChips();
            renderResults();
            renderProviders();
          });
        });

        document.getElementById('learn-search-input').addEventListener('input', function (e) {
          searchTerm = e.target.value.trim();
          renderResults();
        });

        content.querySelectorAll('[data-quick]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            searchTerm = btn.getAttribute('data-quick');
            document.getElementById('learn-search-input').value = searchTerm;
            renderResults();
          });
        });

        renderChips();
        renderResults();
        renderProviders();
      },
    });
  }

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(init);
})(window);
