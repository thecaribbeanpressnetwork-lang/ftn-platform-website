// FTN Platform Website — FTN Love workspace (Sprint 1, Wave 2).
// Shell only + a real preference intake, per the founder's scoping: no matching engine, no
// profile system, no messaging exists yet, so none of that is simulated. What's real today is
// capturing what someone values in a connection, saved via the Integration Adapter Layer --
// honestly framed as shaping the eventual compatibility model, not as a live match.
(function (global) {
  'use strict';

  var VALUES = ['Faith', 'Family', 'Ambition', 'Humor', 'Honesty', 'Adventure', 'Stability', 'Creativity', 'Community'];

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'love',
      mountId: 'workspace-root',
      accentSmallVar: '--color-love-on-dark',
      build: function (content, api) {
        content.innerHTML =
          '<p class="u-max-60ch">There\'s no matching engine or messaging system to plug into yet ' +
          '-- so this doesn\'t pretend to find you a match. What\'s real: telling us what you value ' +
          'in a connection now helps shape the compatibility model FTN Love is actually built on.</p>' +
          '<form id="love-form" novalidate>' +
          '<div class="workspace-field"><label for="love-goal">What are you looking for?</label>' +
          '<select id="love-goal" name="goal" required><option value="">Select an answer</option>' +
          '<option>Friendship</option><option>A relationship</option><option>Marriage-minded</option>' +
          '<option>Not sure yet</option></select></div>' +
          '<div class="workspace-field"><label>Which values matter most to you? (pick up to 3)</label>' +
          VALUES.map(function (v) {
            return '<label class="workspace-checkbox-label"><input type="checkbox" name="value" value="' +
              v + '"> ' + v + '</label>';
          }).join('') +
          '</div>' +
          '<button type="submit" class="btn btn-primary">Save my preferences</button>' +
          '</form>' +
          '<div id="love-output"></div>';

        var form = document.getElementById('love-form');
        var output = document.getElementById('love-output');
        var checkboxes = form.querySelectorAll('input[name="value"]');

        checkboxes.forEach(function (box) {
          box.addEventListener('change', function () {
            var checkedCount = form.querySelectorAll('input[name="value"]:checked').length;
            checkboxes.forEach(function (b) { b.disabled = checkedCount >= 3 && !b.checked; });
          });
        });

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var goal = form.goal.value;
          var values = Array.prototype.slice.call(form.querySelectorAll('input[name="value"]:checked'))
            .map(function (b) { return b.value; });

          if (!goal || !values.length) {
            var errors = [];
            if (!goal) errors.push('Choose what you\'re looking for.');
            if (!values.length) errors.push('Pick at least one value.');
            output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(errors);
            return;
          }

          global.FTN.IntegrationAdapter.submit('love', { goal: goal, values: values }).then(function (res) {
            api.notify(res.message, 'success');
            output.innerHTML = '<div class="workspace-output"><h3>Saved</h3>' +
              '<p>Looking for: ' + escapeHtml(goal) + '<br>Values: ' + escapeHtml(values.join(', ')) + '</p></div>';
          });
        });
      },
    });
  });
})(window);
