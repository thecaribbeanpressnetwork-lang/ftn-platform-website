// FTN Platform Website — Display Network workspace (Sprint 1, Wave 2).
// A real deployment-interest intake, saved via the Integration Adapter Layer, plus the existing
// Commercial Partnerships Contact pathway for actual follow-up -- consistent with Display
// Network's Long-Term Initiative status (CLAUDE.md §4/§7.12): real interest capture, no
// availability claim, no fabricated deployment count or venue list.
(function (global) {
  'use strict';

  var VENUE_TYPES = ['Retail', 'Transit Hub', 'Government Building', 'University / School',
    'Healthcare Facility', 'Community Centre', 'Other'];

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'display-network',
      mountId: 'workspace-root',
      accentSmallVar: '--color-display-network',
      build: function (content, api) {
        content.innerHTML =
          '<p class="u-max-60ch">Display Network is a long-term FTN initiative -- there is no ' +
          'deployment schedule or venue list to show yet. If your venue might be a fit, register ' +
          'your interest below; it\'s saved in your browser today; then reach the team directly ' +
          'through Commercial Partnerships for a real conversation.</p>' +
          '<form id="dn-form" novalidate>' +
          '<div class="workspace-field"><label for="dn-venue">Venue / organization name</label>' +
          '<input type="text" id="dn-venue" name="venue" required></div>' +
          '<div class="workspace-field"><label for="dn-type">Venue type</label>' +
          '<select id="dn-type" name="venueType" required><option value="">Select a venue type</option>' +
          VENUE_TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="workspace-field"><label for="dn-screens">Estimated number of screens</label>' +
          '<input type="number" id="dn-screens" name="screenCount" min="1"></div>' +
          '<div class="workspace-field"><label for="dn-notes">Anything else we should know? (optional)</label>' +
          '<textarea id="dn-notes" name="notes"></textarea></div>' +
          '<button type="submit" class="btn btn-primary">Save deployment interest</button>' +
          '</form>' +
          '<div id="dn-output"></div>';

        var form = document.getElementById('dn-form');
        var output = document.getElementById('dn-output');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var venue = form.venue.value.trim();
          var venueType = form.venueType.value;
          if (!venue || !venueType) {
            var errors = [];
            if (!venue) errors.push('Venue / organization name is required.');
            if (!venueType) errors.push('Choose a venue type.');
            output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(errors);
            return;
          }

          var payload = {
            venue: venue,
            venueType: venueType,
            screenCount: form.screenCount.value || null,
            notes: form.notes.value.trim() || null,
          };

          global.FTN.IntegrationAdapter.submit('display-network', payload).then(function (res) {
            api.notify(res.message, 'success');
            output.innerHTML = '<div class="workspace-output"><h3>Interest saved</h3>' +
              '<p>' + escapeHtml(venue) + ' (' + escapeHtml(venueType) + ') is saved in this browser. ' +
              'For a real conversation about deployment, reach the team directly: ' +
              '<a href="/contact/#commercial">Discuss a Deployment</a>.</p></div>';
          });
        });
      },
    });
  });
})(window);
