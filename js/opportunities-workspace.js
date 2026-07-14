// FTN Platform Website — FTN Opportunities workspace (Sprint 1, Wave 2).
// Search Foundation over a real, honestly-static list of opportunity categories (no fabricated
// job/grant listings, since no real listings feed exists yet), plus a real preference intake:
// saving which categories a visitor cares about via the Integration Adapter Layer, framed
// honestly as shaping future work, not as a live job-alert subscription that doesn't exist.
(function (global) {
  'use strict';

  var CATEGORIES = [
    { id: 'jobs', name: 'Jobs & Employment', description: 'Full-time, part-time, and freelance roles across the Caribbean.' },
    { id: 'grants', name: 'Grants & Funding', description: 'Government, NGO, and private grants for individuals and organizations.' },
    { id: 'procurement', name: 'Procurement & Tenders', description: 'Public and private sector contract opportunities.' },
    { id: 'business', name: 'Business Support', description: 'Incubators, accelerators, and small business resources.' },
    { id: 'scholarships', name: 'Scholarships & Training', description: 'Educational funding and professional development programmes.' },
    { id: 'sponsorships', name: 'Sponsorships', description: 'Event, artist, and community sponsorship opportunities.' },
  ];

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function resultsHTML(items) {
    if (!items.length) return '<p class="u-max-60ch">No categories matched that search.</p>';
    return '<ul class="workspace-beat-list">' + items.map(function (c) {
      return '<li><strong>' + escapeHtml(c.name) + '</strong><br>' + escapeHtml(c.description) + '</li>';
    }).join('') + '</ul>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'opportunities',
      mountId: 'workspace-root',
      accentSmallVar: '--color-opportunities',
      build: function (content, api) {
        content.innerHTML =
          '<p class="u-max-60ch">FTN Opportunities doesn\'t have live job or grant listings yet -- ' +
          'there\'s no real feed to search honestly. What\'s real today is the category structure ' +
          'the product is being built around: search it below, then save which categories matter ' +
          'to you so future listings can be shaped around real interest, not guesswork.</p>' +
          '<div class="workspace-field"><label for="opp-search">Search opportunity categories</label>' +
          '<input type="text" id="opp-search" placeholder="e.g. grants, procurement, training"></div>' +
          '<p id="opp-count" class="workspace-field__hint"></p>' +
          '<div id="opp-results"></div>' +
          '<form id="opp-preferences">' +
          '<div class="workspace-field"><label>Which categories interest you?</label>' +
          CATEGORIES.map(function (c) {
            return '<label class="workspace-checkbox-label">' +
              '<input type="checkbox" name="category" value="' + c.id + '"> ' + escapeHtml(c.name) + '</label>';
          }).join('') +
          '</div>' +
          '<button type="submit" class="btn btn-primary btn-sm">Save my interests</button>' +
          '</form>';

        var input = document.getElementById('opp-search');
        var results = document.getElementById('opp-results');
        var count = document.getElementById('opp-count');

        function render(query) {
          var out = global.FTN.SearchFoundation.query(CATEGORIES, { textQuery: query });
          count.textContent = out.total + ' of ' + CATEGORIES.length + ' categories' +
            (query ? ' match “' + query + '”' : '');
          results.innerHTML = resultsHTML(out.results);
        }

        input.addEventListener('input', function () { render(input.value); });
        render('');

        document.getElementById('opp-preferences').addEventListener('submit', function (e) {
          e.preventDefault();
          var checked = Array.prototype.slice.call(
            document.querySelectorAll('#opp-preferences input[name="category"]:checked')
          ).map(function (el) { return el.value; });
          global.FTN.IntegrationAdapter.submit('opportunities', { categories: checked }).then(function (res) {
            api.notify(res.message, 'success');
          });
        });
      },
    });
  });
})(window);
