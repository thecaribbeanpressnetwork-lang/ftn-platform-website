// FTN Learn — the FTN Skills / FTN School fork, search over real listings, honest empty states,
// and provider fallback cards (PROVIDER != COURSE). Reuses the Workspace Shell, Search Foundation
// and Integration Adapter already built for the other flagship products rather than a new stack.
(function (global) {
  'use strict';
  var esc = global.FTN.WorkspaceShell.escapeHtml;

  function fmtMoney(n, currency) { return n == null ? null : (currency || 'TTD') + ' $' + Number(n).toLocaleString(); }

  // Contextual entry point into the ONE shared intent-routing engine (js/intent-router.js /
  // js/product-registry.js), not a second AI brain. Only ever shown when Learn's own listing
  // search has nothing for the term typed; scope:'learn' is a ranking priority signal only
  // (see product-registry.js's scopeMatches()/SCOPE_BONUS) -- it never blocks a genuinely better
  // FTN product (e.g. FTN Opportunities for a funding-shaped query) from surfacing instead.
  function ibisFallbackHTML(term) {
    if (!term || !global.FTN.IntentRouter) return '';
    var matches = global.FTN.IntentRouter.route(term, { scopeProductId: 'learn' });
    if (!matches.length) return '';
    return '<div class="workspace-output"><h3>Other FTN products for that</h3><ul>' +
      matches.slice(0, 3).map(function (m) { return '<li><a href="' + esc(m.product.route) + '">' + esc(m.product.name) + '</a> — ' + esc(m.product.tagline) + '</li>'; }).join('') +
      '</ul></div>';
  }

  // FTN Learn's job is "find a provider, understand enough, go to the provider" -- not certifying
  // every listing. UNVERIFIED is FTN's own internal discovery-status field, not a fact about the
  // listing itself, so it no longer renders as a badge on ordinary cards (it read as bureaucratic
  // clutter, not useful signal). A genuinely factual state label -- e.g. a future EXPIRED/CLOSED --
  // still renders normally; only the blanket UNVERIFIED stamp is suppressed here.
  var NON_FACTUAL_STATUSES = { UNVERIFIED: true };

  // The underlying provenance (source platform, when FTN found it, accreditation state) is not
  // deleted -- it now routes through the shared Trust Card modal (js/trust-card.js), the same
  // source-provenance pattern Observatory/Display already use, instead of an inline paragraph on
  // every card.
  function listingTrustData(item) {
    return {
      title: item.title,
      classification: item.status === 'UNVERIFIED' ? 'Community-sourced (unverified)' : (item.status || 'Sourced'),
      whyItMatters: 'FTN found this listing rather than receiving it directly from the provider — confirm current availability and terms with ' + (item.provider || 'the provider') + ' before registering.',
      confidence: item.status === 'UNVERIFIED' ? 'Not independently confirmed by FTN' : null,
      methodology: 'Discovered via ' + (item.sourcePlatform || 'a public source') + '.',
      sourceName: item.provider,
      updateFrequency: 'Checked once, not continuously monitored',
      lastUpdated: item.lastChecked || item.firstDiscovered,
      limitations: item.accreditationState,
    };
  }

  function listingCardHTML(item) {
    var money = [];
    var reg = fmtMoney(item.registrationFee, item.currency);
    var tuition = fmtMoney(item.tuition, item.currency);
    if (reg) money.push('Registration ' + reg);
    if (tuition) money.push('Tuition ' + tuition);
    var contact = [];
    if (item.whatsapp) contact.push('<a href="https://wa.me/1868' + esc(item.whatsapp.replace(/[^0-9]/g, '')) + '" target="_blank" rel="noopener">WhatsApp ' + esc(item.whatsapp) + '</a>');
    if (item.phone) contact.push('<span>' + esc(item.phone) + '</span>');
    var showStatusBadge = item.status && !NON_FACTUAL_STATUSES[item.status];
    return (
      '<article class="learn-card">' +
        '<div class="learn-card__head">' + (showStatusBadge ? '<span class="learn-card__status learn-card__status--' + esc(item.status.toLowerCase()) + '">' + esc(item.status) + '</span>' : '') + '<span class="learn-card__track">' + esc(item.track === 'skills' ? 'FTN Skills' : 'FTN School') + '</span></div>' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<p class="learn-card__provider">' + esc(item.provider) + '</p>' +
        '<p>' + esc(item.summary) + '</p>' +
        '<dl class="learn-card__facts">' +
          '<div><dt>Where</dt><dd>' + esc(item.community || item.country) + ' · ' + esc(item.mode) + '</dd></div>' +
          (item.level ? '<div><dt>Level</dt><dd>' + esc(item.level) + '</dd></div>' : '') +
          (money.length ? '<div><dt>Cost</dt><dd>' + esc(money.join(' · ')) + '</dd></div>' : '') +
          '<div><dt>Credential</dt><dd>' + esc(item.credentialType) + '</dd></div>' +
        '</dl>' +
        '<div class="learn-card__actions">' + contact.join(' ') + '<button type="button" class="trust-trigger trust-trigger--on-dark" data-learn-trust="' + esc(item.id) + '">Source &amp; verification details</button></div>' +
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
            root.innerHTML = '<p class="learn-empty">No verified ' + (track === 'skills' ? 'FTN Skills' : 'FTN School') + ' listings match &ldquo;' + esc(searchTerm || 'this search') + '&rdquo; yet. Try a real provider below, or check back — FTN only lists what it can honestly describe.</p>' + ibisFallbackHTML(searchTerm);
            return;
          }
          root.innerHTML = items.map(listingCardHTML).join('');
          root.querySelectorAll('[data-learn-trust]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var listingItem = data.listings.filter(function (l) { return l.id === btn.getAttribute('data-learn-trust'); })[0];
              if (listingItem && global.FTN.TrustCard) global.FTN.TrustCard.open(listingTrustData(listingItem));
            });
          });
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
