// FTN Platform Website — FTN Events workspace (Sprint 1, Wave 2).
// The page-specific consumer of js/workspace-shell.js: builds the event-plan form, runs it
// through js/generator-engine.js + js/events-generator.js, renders the result, and wires
// js/export-framework.js (TXT/JSON/Print) and js/integration-adapter.js (save locally).
(function (global) {
  'use strict';

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function planToText(plan) {
    var lines = [plan.title, ''];
    plan.sections.forEach(function (s) {
      lines.push(s.heading.toUpperCase());
      s.items.forEach(function (i) { lines.push('- ' + i); });
      lines.push('');
    });
    return lines.join('\n');
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'events',
      mountId: 'workspace-root',
      accentSmallVar: '--color-events',
      toolbar: false,
      build: function (content, api) {
        content.innerHTML =
          '<p class="u-max-60ch">Answer a few questions about your event and get a complete, ' +
          'exportable planning checklist -- permits, logistics, safety, vendors, marketing, and ' +
          'day-of operations -- generated from real event-planning logic, tailored to what you ' +
          'tell us. Nothing here is AI-written: every line comes from a rule tied to your answers.</p>' +
          '<form id="events-form" novalidate>' +
          '<div class="workspace-field"><label for="ev-name">Event name</label>' +
          '<input type="text" id="ev-name" name="name" required></div>' +
          '<div class="workspace-field"><label for="ev-type">Event type</label>' +
          '<select id="ev-type" name="type" required><option value="">Select a type</option>' +
          '<option>Concert</option><option>Festival</option><option>Conference</option>' +
          '<option>Wedding</option><option>Corporate</option><option>Community</option>' +
          '<option>Other</option></select></div>' +
          '<div class="workspace-field"><label for="ev-guests">Expected guest count</label>' +
          '<input type="number" id="ev-guests" name="guestCount" min="1" required></div>' +
          '<div class="workspace-field"><label for="ev-venue">Venue type</label>' +
          '<select id="ev-venue" name="venueType" required><option value="">Select a venue type</option>' +
          '<option>Indoor</option><option>Outdoor</option><option>Hybrid</option></select></div>' +
          '<div class="workspace-field"><label for="ev-budget">Budget tier</label>' +
          '<select id="ev-budget" name="budgetTier" required><option value="">Select a budget tier</option>' +
          '<option>Grassroots</option><option>Standard</option><option>Flagship</option></select></div>' +
          '<button type="submit" class="btn btn-primary">Generate event plan</button>' +
          '</form>' +
          '<div id="events-output"></div>';

        var form = document.getElementById('events-form');
        var output = document.getElementById('events-output');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var input = {
            name: form.name.value,
            type: form.type.value,
            guestCount: form.guestCount.value,
            venueType: form.venueType.value,
            budgetTier: form.budgetTier.value,
          };
          var result = global.FTN.GeneratorEngine.run(global.FTN.EventsGenerator, input);
          if (!result.valid) {
            output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(result.errors);
            return;
          }
          renderPlan(result.output, output, api);
        });
      },
    });
  });

  function renderPlan(plan, output, api) {
    var html = '<div class="workspace-output"><h3>' + escapeHtml(plan.title) + '</h3>';
    plan.sections.forEach(function (s) {
      html += '<h4>' + escapeHtml(s.heading) + '</h4><ul>' +
        s.items.map(function (i) { return '<li>' + escapeHtml(i) + '</li>'; }).join('') + '</ul>';
    });
    html += global.FTN.WorkspaceShell.exportRowHTML('events-save', 'Save this plan') + '</div>';
    output.innerHTML = html;

    global.FTN.WorkspaceShell.wireExportButtons(output, {
      title: plan.title,
      txtBody: function () { return planToText(plan); },
      richBody: plan,
    });

    document.getElementById('events-save').addEventListener('click', function () {
      global.FTN.IntegrationAdapter.submit('events', plan).then(function (res) {
        api.notify(res.message, 'success');
      });
    });
  }
})(window);
