// FTN Platform Website — FTN Kaiso workspace (Sprint 1, Wave 2).
// Search Foundation's first consumer: a real, live-filtering search over Kaiso's actual coverage
// beats (a small, honestly-static list -- not fabricated news articles, since no real newsroom
// content exists yet). Tip intake reuses the existing Contact mechanism, the same "General
// Enquiries" pathway Face the Nation's Suggest a Topic / Become a Guest already route through
// (CLAUDE.md §7.12), rather than inventing a second submission system.
(function (global) {
  'use strict';

  var BEATS = [
    { name: 'Politics & Government', description: 'Elections, policy, parliament, and public administration.' },
    { name: 'Crime & Justice', description: 'Law enforcement, the courts, and the justice system.' },
    { name: 'Corruption & Accountability', description: 'Public accountability and investigative reporting.' },
    { name: 'Environment & Climate', description: 'Climate change, conservation, and natural disasters.' },
    { name: 'Weather & Disasters', description: 'Hurricanes, flooding, and emergency response.' },
    { name: 'Business & Economy', description: 'Trade, employment, and the Caribbean economy.' },
    { name: 'Health', description: 'Public health, healthcare access, and wellness.' },
    { name: 'Education', description: 'Schools, universities, and education policy.' },
    { name: 'Technology', description: 'Innovation, digital access, and the regional tech sector.' },
    { name: 'Culture & Entertainment', description: 'Carnival, music, film, and the arts.' },
    { name: 'Sports', description: 'Regional and international sport.' },
    { name: 'Community Issues', description: 'Local infrastructure, services, and neighbourhood concerns.' },
    { name: 'Immigration & Diaspora', description: 'Migration, diaspora communities, and regional movement.' },
    { name: 'International', description: 'Global news with Caribbean relevance.' },
  ];

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function beatsHTML(beats) {
    if (!beats.length) {
      return '<p class="u-max-60ch">No coverage beats matched that search. ' +
        '<a href="/contact/#general">Submit a story tip</a> anyway -- a beat that doesn\'t exist yet ' +
        'is exactly the kind of gap tips help surface.</p>';
    }
    return '<ul class="workspace-beat-list">' + beats.map(function (b) {
      return '<li><strong>' + escapeHtml(b.name) + '</strong><br>' + escapeHtml(b.description) + '</li>';
    }).join('') + '</ul>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'kaiso',
      mountId: 'workspace-root',
      accentSmallVar: '--color-kaiso-on-dark',
      build: function (content) {
        content.innerHTML =
          '<p class="u-max-60ch">FTN Kaiso doesn\'t have published stories yet -- there\'s no ' +
          'newsroom content to search honestly. What\'s real today is the newsroom\'s planned ' +
          'coverage: search the beats below, then send a tip straight into a beat that matters ' +
          'to you.</p>' +
          '<div class="workspace-field"><label for="kaiso-search">Search coverage beats</label>' +
          '<input type="text" id="kaiso-search" placeholder="e.g. climate, corruption, health"></div>' +
          '<p id="kaiso-count" class="workspace-field__hint"></p>' +
          '<div id="kaiso-results"></div>' +
          '<div class="workspace-export-row">' +
          '<a class="btn btn-primary btn-sm" href="/contact/#general">Submit a story tip</a>' +
          '</div>';

        var input = document.getElementById('kaiso-search');
        var results = document.getElementById('kaiso-results');
        var count = document.getElementById('kaiso-count');

        function render(query) {
          var out = global.FTN.SearchFoundation.query(BEATS, { textQuery: query });
          count.textContent = out.total + ' of ' + BEATS.length + ' coverage beats' +
            (query ? ' match “' + query + '”' : '');
          results.innerHTML = beatsHTML(out.results);
        }

        input.addEventListener('input', function () { render(input.value); });
        render('');
      },
    });
  });
})(window);
