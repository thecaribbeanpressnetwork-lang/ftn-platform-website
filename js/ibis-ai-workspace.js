// FTN Platform Website — ibis.ai workspace (Sprint 1, Wave 2).
// A goal-in, product-out router -- not a chat interface, deliberately, since the honest
// implementation today is real keyword matching (js/intent-router.js), not a conversational
// model. Presenting it as a router rather than a chatbot keeps the UI truthful about what's
// actually running.
(function (global) {
  'use strict';

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'ibis-ai',
      mountId: 'workspace-root',
      accentSmallVar: '--color-ibis-on-dark',
      build: function (content) {
        content.innerHTML =
          '<p class="u-max-60ch">Tell ibis.ai what you\'re trying to do, in your own words. It ' +
          'checks your goal against every FTN product\'s real name, tagline, and keywords, and ' +
          'shows you exactly why each result matched -- no language model, no external API call, ' +
          'nothing hidden.</p>' +
          '<form id="ibis-form" novalidate>' +
          '<div class="workspace-field"><label for="ibis-goal">What are you trying to do?</label>' +
          '<input type="text" id="ibis-goal" name="goal" placeholder="e.g. report a pothole in my street" required></div>' +
          '<button type="submit" class="btn btn-primary">Find my product</button>' +
          '</form>' +
          '<div id="ibis-output"></div>';

        var form = document.getElementById('ibis-form');
        var output = document.getElementById('ibis-output');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var goal = form.goal.value;
          var matches = global.FTN.IntentRouter.route(goal);

          if (!matches.length) {
            output.innerHTML = '<div class="workspace-output"><h3>No match found</h3>' +
              '<p>Nothing in the FTN Platform ecosystem matched those words yet. Try different ' +
              'terms, or <a href="/">explore the full ecosystem</a> directly.</p></div>';
            return;
          }

          var html = '<div class="workspace-output"><h3>' + matches.length + ' match' +
            (matches.length === 1 ? '' : 'es') + ' for &ldquo;' + escapeHtml(goal) + '&rdquo;</h3><ul>';
          matches.slice(0, 5).forEach(function (m) {
            html += '<li><strong><a href="' + m.product.route + '">' + escapeHtml(m.product.name) + '</a></strong> ' +
              '&mdash; ' + escapeHtml(m.product.tagline) + '<br>' + escapeHtml(m.explanation) + '</li>';
          });
          html += '</ul></div>';
          output.innerHTML = html;
        });
      },
    });
  });
})(window);
