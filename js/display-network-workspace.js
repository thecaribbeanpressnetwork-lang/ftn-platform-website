// FTN Platform Website — Display Network production workspace.
(function (global) {
  'use strict';

  if (!document.querySelector('link[data-ftn-display-network-style]')) {
    var styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/css/components/display-network.css';
    styleLink.setAttribute('data-ftn-display-network-style', 'true');
    document.head.appendChild(styleLink);
  }

  var VENUE_TYPES = ['Retail','Transit Hub','Government Building','University / School','Healthcare Facility','Community Centre','Hospitality','Entertainment Venue','Corporate Office','Other'];
  var PURPOSES = ['Public information','Community messaging','Commercial advertising','Wayfinding','Emergency / service notices','Events and culture','Internal communications'];
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function selectedValues(form, name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (el) { return el.value; });
  }

  function pulseMnemonic() {
    var root = document.querySelector('[data-dn-mnemonic]');
    if (!root) return;
    root.classList.remove('is-complete');
    void root.offsetWidth;
    root.classList.add('is-complete');
  }

  function renderRecent(host) {
    var items = global.FTN.storage.getJSON('ftn-intake-display-network', []);
    if (!Array.isArray(items) || !items.length) {
      host.innerHTML = '<p class="workspace-field__hint">No deployment briefs saved on this device yet.</p>';
      return;
    }
    host.innerHTML = '<div class="dn-history">' + items.slice(-4).reverse().map(function (item) {
      var p = item.payload || item;
      return '<article class="dn-history__item"><strong>' + escapeHtml(p.venue || 'Venue') + '</strong><span>' +
        escapeHtml(p.venueType || '') + (p.country ? ' · ' + escapeHtml(p.country) : '') + '</span><small>' +
        escapeHtml((p.purposes || []).join(', ') || 'Deployment interest') + '</small></article>';
    }).join('') + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'display-network', mountId: 'workspace-root', accentSmallVar: '--color-display-network',
      build: function (content, api) {
        var country = global.FTN.Country && global.FTN.Country.get ? global.FTN.Country.get() : { name: 'Trinidad & Tobago' };
        content.innerHTML =
          '<section class="dn-hero"><div class="dn-hero__copy"><span class="dn-kicker">PHYSICAL DIGITAL INFRASTRUCTURE</span><h2>Turn screens into a trusted Caribbean network.</h2><p>Plan a venue deployment, define what the screens need to do, and create a structured brief FTN can use for real partnership conversations. This page does not claim a deployed network where one does not yet exist.</p></div>' +
          '<div class="dn-mnemonic" data-dn-mnemonic aria-hidden="true"><span class="dn-screen dn-screen--a"></span><span class="dn-screen dn-screen--b"></span><span class="dn-screen dn-screen--c"></span><span class="dn-screen dn-screen--d"></span><span class="dn-link dn-link--1"></span><span class="dn-link dn-link--2"></span><span class="dn-node"></span></div></section>' +
          '<section class="dn-status-grid"><article><span>OPERATIONAL NOW</span><strong>Deployment planning</strong><p>Structured venue briefs saved on this device.</p></article><article><span>PARTNERSHIP PATH</span><strong>Commercial follow-up</strong><p>Use FTN Commercial Partnerships for real deployment conversations.</p></article><article><span>FUTURE INFRASTRUCTURE</span><strong>Managed screen network</strong><p>Devices, CMS, scheduling, proof-of-play and network operations come later.</p></article></section>' +
          '<section class="dn-planner"><div class="dn-planner__intro"><span class="dn-kicker">DEPLOYMENT DESK</span><h3>Build a venue deployment brief.</h3><p>Capture the minimum information needed to evaluate fit without locking FTN to a signage vendor, CMS or hardware stack.</p></div><form id="dn-form" novalidate>' +
          '<div class="dn-form-grid"><div class="workspace-field"><label for="dn-venue">Venue / organization name</label><input type="text" id="dn-venue" name="venue" required></div>' +
          '<div class="workspace-field"><label for="dn-type">Venue type</label><select id="dn-type" name="venueType" required><option value="">Select venue type</option>' + VENUE_TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
          '<div class="workspace-field"><label for="dn-country">Country / territory</label><input type="text" id="dn-country" name="country" value="' + escapeHtml(country.name || '') + '" required></div>' +
          '<div class="workspace-field"><label for="dn-area">City / community</label><input type="text" id="dn-area" name="area" required></div>' +
          '<div class="workspace-field"><label for="dn-screens">Estimated screen count</label><input type="number" id="dn-screens" name="screenCount" min="1" placeholder="e.g. 4"></div>' +
          '<div class="workspace-field"><label for="dn-environment">Primary environment</label><select id="dn-environment" name="environment"><option>Indoor</option><option>Outdoor</option><option>Mixed indoor / outdoor</option></select></div>' +
          '<div class="workspace-field"><label for="dn-connectivity">Connectivity available</label><select id="dn-connectivity" name="connectivity"><option>Reliable fixed internet</option><option>Mobile data only</option><option>Limited / intermittent</option><option>Not yet known</option></select></div>' +
          '<div class="workspace-field"><label for="dn-power">Power / mounting readiness</label><select id="dn-power" name="power"><option>Existing screens / power ready</option><option>Power available, screens needed</option><option>Site work likely required</option><option>Not yet assessed</option></select></div></div>' +
          '<div class="workspace-field"><label>What should the screens be used for?</label><div class="dn-purpose-grid">' + PURPOSES.map(function (p) { return '<label class="workspace-checkbox-label"><input type="checkbox" name="purpose" value="' + escapeHtml(p) + '"> ' + escapeHtml(p) + '</label>'; }).join('') + '</div></div>' +
          '<div class="workspace-field"><label for="dn-audience">Who uses or passes through this venue?</label><textarea id="dn-audience" name="audience" placeholder="Describe the audience, foot traffic, service users or community served."></textarea></div>' +
          '<div class="workspace-field"><label for="dn-notes">Deployment context</label><textarea id="dn-notes" name="notes" placeholder="Placement constraints, operating hours, existing screens, commercial interest or anything FTN should understand."></textarea></div>' +
          '<label class="dn-consent"><input type="checkbox" name="followUp"> I want FTN to consider this brief for a future commercial conversation.</label><button type="submit" class="btn btn-primary">Save deployment brief</button></form><div id="dn-output"></div></section>' +
          '<section class="dn-readiness"><div><span class="dn-kicker">NETWORK READINESS</span><h3>What turns a screen into FTN infrastructure?</h3></div><ol><li><strong>Authorized venue</strong><span>Documented permission and responsibility for each location.</span></li><li><strong>Canonical device record</strong><span>FTN-owned identifiers and metadata independent of hardware vendor.</span></li><li><strong>Content governance</strong><span>Editorial, commercial, emergency and public-information rules.</span></li><li><strong>Scheduling + proof</strong><span>Reliable playout, audit trail and proof-of-play before revenue claims.</span></li><li><strong>Security + operations</strong><span>Credential isolation, remote management, maintenance and incident handling.</span></li></ol></section>' +
          '<section class="dn-trust"><h3>Current boundary</h3><p>Saving this brief does not reserve hardware, guarantee deployment, create an advertising contract or upload venue data to a central FTN system. The record remains browser-local today. Real commercial discussions continue through <a href="/contact/#commercial">FTN Commercial Partnerships</a>.</p></section>' +
          '<section><div class="dn-section-head"><span class="dn-kicker">RECENT ON THIS DEVICE</span><h3>Deployment briefs</h3></div><div id="dn-history"></div></section>';

        var form = document.getElementById('dn-form');
        var output = document.getElementById('dn-output');
        var history = document.getElementById('dn-history');
        renderRecent(history);

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var purposes = selectedValues(form, 'purpose');
          var payload = {
            venue: form.venue.value.trim(), venueType: form.venueType.value, country: form.country.value.trim(), area: form.area.value.trim(),
            screenCount: form.screenCount.value || null, environment: form.environment.value, connectivity: form.connectivity.value, power: form.power.value,
            purposes: purposes, audience: form.audience.value.trim() || null, notes: form.notes.value.trim() || null,
            followUpRequested: !!form.followUp.checked, source: 'ftn-display-network-deployment-desk', capturedAt: new Date().toISOString()
          };
          var errors = [];
          if (!payload.venue) errors.push('Venue / organization name is required.');
          if (!payload.venueType) errors.push('Choose a venue type.');
          if (!payload.country) errors.push('Country / territory is required.');
          if (!payload.area) errors.push('City / community is required.');
          if (!purposes.length) errors.push('Choose at least one screen purpose.');
          if (errors.length) { output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(errors); return; }
          global.FTN.IntegrationAdapter.submit('display-network', payload).then(function (res) {
            api.notify(res.message, 'success'); pulseMnemonic();
            output.innerHTML = '<div class="workspace-output"><h3>Deployment brief saved</h3><p><strong>' + escapeHtml(payload.venue) + '</strong> · ' + escapeHtml(payload.area) + ', ' + escapeHtml(payload.country) + '</p><ul><li>' + escapeHtml(payload.venueType) + '</li><li>' + escapeHtml(payload.purposes.join(', ')) + '</li><li>Follow-up requested: ' + (payload.followUpRequested ? 'Yes' : 'No') + '</li></ul><p><a href="/contact/#commercial">Discuss a Deployment →</a></p></div>';
            renderRecent(history);
          });
        });
      }
    });
  });
})(window);
