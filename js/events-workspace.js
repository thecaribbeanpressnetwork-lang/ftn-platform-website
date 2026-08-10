// FTN Platform Website — FTN Events workspace.
(function (global) {
  'use strict';

  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;
  var HISTORY_KEY = 'ftn-events-plans-v2';

  function planToText(plan) {
    var lines = [plan.title, ''];
    plan.sections.forEach(function (s) {
      lines.push(s.heading.toUpperCase());
      s.items.forEach(function (i) { lines.push('- ' + i); });
      lines.push('');
    });
    return lines.join('\n');
  }

  function getSaved() { return global.FTN.storage ? global.FTN.storage.getJSON(HISTORY_KEY, []) : []; }
  function setSaved(items) { return global.FTN.storage ? global.FTN.storage.setJSON(HISTORY_KEY, items) : false; }

  function registerSmartExport(plan) {
    var artifact = {
      id: 'events-current-plan',
      productId: 'events',
      label: plan.title,
      description: 'Take the current FTN Events plan with you.',
      formats: [
        { id: 'txt', label: 'TXT', filename: 'ftn-event-plan.txt', mime: 'text/plain', makeFile: function () { return new File([planToText(plan)], 'ftn-event-plan.txt', { type: 'text/plain' }); } },
        { id: 'json', label: 'JSON', filename: 'ftn-event-plan.json', mime: 'application/json', makeFile: function () { return new File([JSON.stringify(plan, null, 2)], 'ftn-event-plan.json', { type: 'application/json' }); } }
      ]
    };
    if (global.FTN && global.FTN.SmartExport) global.FTN.SmartExport.registerArtifact(artifact);
    else if (global.FTN_SMART_EXPORT_QUEUE && typeof global.FTN_SMART_EXPORT_QUEUE.push === 'function') global.FTN_SMART_EXPORT_QUEUE.push(artifact);
  }

  function renderSaved(mount, api) {
    var items = getSaved();
    if (!items.length) { mount.innerHTML = '<p class="workspace-field__hint">No saved plans on this device yet.</p>'; return; }
    mount.innerHTML = items.slice().reverse().map(function (entry, reverseIndex) {
      var realIndex = items.length - 1 - reverseIndex;
      return '<article class="workspace-output" style="margin-top:12px"><h4>' + escapeHtml(entry.plan.title) + '</h4><p class="workspace-field__hint">' + escapeHtml(entry.savedAt) + ' · ' + escapeHtml(entry.plan.meta.type) + ' · ' + escapeHtml(String(entry.plan.meta.guestCount)) + ' guests</p><div class="workspace-actions"><button type="button" class="btn btn-outline btn-sm" data-open-plan="' + realIndex + '">Open</button><button type="button" class="btn btn-outline btn-sm" data-delete-plan="' + realIndex + '">Delete</button></div></article>';
    }).join('');
    mount.querySelectorAll('[data-open-plan]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var plan = getSaved()[Number(btn.getAttribute('data-open-plan'))].plan;
        renderPlan(plan, document.getElementById('events-output'), api);
        document.getElementById('events-output').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    mount.querySelectorAll('[data-delete-plan]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var all = getSaved(); all.splice(Number(btn.getAttribute('data-delete-plan')), 1); setSaved(all); renderSaved(mount, api); api.notify('Saved plan removed from this browser.', 'success');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'events', mountId: 'workspace-root', accentSmallVar: '--color-events', toolbar: false,
      build: function (content, api) {
        content.innerHTML = '<section class="workspace-card"><span class="workspace-eyebrow">FTN EVENTS · PLANNING WORKSPACE</span><h1>Turn an event idea into an operational plan.</h1><p class="u-max-60ch">FTN Events converts your answers into a structured planning file covering compliance, venue, production, safety, vendors, marketing, budget, timeline and day-of operations. The planner uses transparent rule-based logic so every recommendation can be inspected and improved.</p><div class="callout u-mt-16 u-max-60ch"><strong>Important:</strong> Permit, licensing, policing, fire, health and venue requirements vary by jurisdiction. FTN identifies planning categories; organizers must verify requirements with the responsible authority.</div></section>' +
          '<section class="workspace-card u-mt-24"><h2>Build your event</h2><form id="events-form" novalidate>' +
          '<div class="workspace-field"><label for="ev-name">Event name</label><input type="text" id="ev-name" name="name" required placeholder="e.g. South Carnival Launch"></div>' +
          '<div class="workspace-field"><label for="ev-type">Event type</label><select id="ev-type" name="type" required><option value="">Select a type</option><option>Concert</option><option>Festival</option><option>Conference</option><option>Wedding</option><option>Corporate</option><option>Community</option><option>Carnival / Fete</option><option>Sports</option><option>Fundraiser</option><option>Other</option></select></div>' +
          '<div class="workspace-field"><label for="ev-date">Target date (optional)</label><input type="date" id="ev-date" name="date"></div>' +
          '<div class="workspace-field"><label for="ev-country">Country</label><input type="text" id="ev-country" name="country" value="Trinidad &amp; Tobago" required></div>' +
          '<div class="workspace-field"><label for="ev-city">City / area (optional)</label><input type="text" id="ev-city" name="city" placeholder="San Fernando"></div>' +
          '<div class="workspace-field"><label for="ev-guests">Expected guest count</label><input type="number" id="ev-guests" name="guestCount" min="1" required></div>' +
          '<div class="workspace-field"><label for="ev-venue">Venue type</label><select id="ev-venue" name="venueType" required><option value="">Select a venue type</option><option>Indoor</option><option>Outdoor</option><option>Hybrid</option></select></div>' +
          '<div class="workspace-field"><label for="ev-budget">Budget tier</label><select id="ev-budget" name="budgetTier" required><option value="">Select a budget tier</option><option>Grassroots</option><option>Standard</option><option>Flagship</option></select></div>' +
          '<div class="workspace-field"><label for="ev-budget-amount">Working budget (optional)</label><input type="text" id="ev-budget-amount" name="budgetAmount" placeholder="e.g. TT$250,000"></div>' +
          '<div class="workspace-field"><label for="ev-goal">Describe what you need this event to accomplish (optional)</label><textarea id="ev-goal" name="goal" placeholder="Tell FTN in your own words what success looks like."></textarea></div>' +
          '<button type="submit" class="btn btn-primary">Generate event plan</button></form></section><div id="events-output"></div>' +
          '<section class="workspace-card u-mt-24"><h2>Saved event plans</h2><p class="workspace-field__hint">Saved on this device.</p><div id="events-saved"></div></section>';
        var form = document.getElementById('events-form'); var output = document.getElementById('events-output'); renderSaved(document.getElementById('events-saved'), api);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var input = { name: form.name.value, type: form.type.value, date: form.date.value, country: form.country.value, city: form.city.value, guestCount: form.guestCount.value, venueType: form.venueType.value, budgetTier: form.budgetTier.value, budgetAmount: form.budgetAmount.value, goal: form.goal.value };
          var result = global.FTN.GeneratorEngine.run(global.FTN.EventsGenerator, input);
          if (!result.valid) { output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(result.errors); return; }
          renderPlan(result.output, output, api); output.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  });

  function renderPlan(plan, output, api) {
    var html = '<section class="workspace-card u-mt-24"><div class="workspace-output"><span class="workspace-eyebrow">EVENT PLAN</span><h2>' + escapeHtml(plan.title) + '</h2><p class="workspace-field__hint">Generated ' + escapeHtml(new Date(plan.meta.generatedAt).toLocaleString()) + '</p>';
    plan.sections.forEach(function (s) { html += '<h3>' + escapeHtml(s.heading) + '</h3><ul>' + s.items.map(function (i) { return '<li>' + escapeHtml(i) + '</li>'; }).join('') + '</ul>'; });
    html += global.FTN.WorkspaceShell.exportRowHTML('events-save', 'Save plan to this device') + '</div></section>'; output.innerHTML = html;
    global.FTN.WorkspaceShell.wireExportButtons(output, { title: plan.title, txtBody: function () { return planToText(plan); }, richBody: plan });
    registerSmartExport(plan);
    var save = document.getElementById('events-save');
    if (save) save.addEventListener('click', function () {
      var all = getSaved(); all.push({ savedAt: new Date().toISOString(), plan: plan }); setSaved(all);
      global.FTN.IntegrationAdapter.submit('events', plan).then(function () { renderSaved(document.getElementById('events-saved'), api); api.notify('Event plan saved in this browser.', 'success'); });
    });
  }
})(window);
