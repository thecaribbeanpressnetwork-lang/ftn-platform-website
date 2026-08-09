// FTN Platform Website — FTN Opportunities workspace, production phase 1.
// Real today: opportunity-category discovery plus a structured browser-local Opportunity Profile.
// Not represented as live: job/grant feeds, subscriptions, application tracking or employer APIs.
(function (global) {
  'use strict';

  if (!document.querySelector('link[data-opportunities-style]')) {
    var styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/css/components/opportunities.css';
    styleLink.setAttribute('data-opportunities-style', 'true');
    document.head.appendChild(styleLink);
  }

  var CATEGORIES = [
    { id: 'jobs', name: 'Jobs & Employment', description: 'Full-time, part-time, contract and freelance roles across the Caribbean.' },
    { id: 'grants', name: 'Grants & Funding', description: 'Government, NGO, foundation and private funding programmes.' },
    { id: 'procurement', name: 'Procurement & Tenders', description: 'Public and private sector contract opportunities and supplier calls.' },
    { id: 'business', name: 'Business Support', description: 'Incubators, accelerators, export support and small-business programmes.' },
    { id: 'scholarships', name: 'Scholarships & Training', description: 'Education funding, certifications and professional development.' },
    { id: 'sponsorships', name: 'Sponsorships', description: 'Support opportunities for creators, events, sport and community projects.' }
  ];

  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function countryName() {
    return global.FTN.Country && global.FTN.Country.get ? global.FTN.Country.get().name : 'Trinidad & Tobago';
  }

  function resultsHTML(items) {
    if (!items.length) return '<p class="workspace-muted">No opportunity categories matched that search.</p>';
    return '<div class="opp-category-grid">' + items.map(function (c) {
      return '<article class="opp-category-card"><span class="opp-category-card__signal" aria-hidden="true"></span><strong>' + escapeHtml(c.name) + '</strong><p>' + escapeHtml(c.description) + '</p></article>';
    }).join('') + '</div>';
  }

  function renderHistory(mount) {
    if (!mount || !global.FTN.IntegrationAdapter) return;
    var rows = (global.FTN.IntegrationAdapter.history('opportunities') || []).slice().reverse().slice(0, 5);
    if (!rows.length) {
      mount.innerHTML = '<p class="workspace-muted">No Opportunity Profiles saved on this device yet.</p>';
      return;
    }
    mount.innerHTML = '<div class="opp-history">' + rows.map(function (row) {
      var p = row.payload || {};
      var when = row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '';
      return '<article><strong>' + escapeHtml((p.categories || []).join(', ') || 'Opportunity profile') + '</strong><span>' + escapeHtml(p.territory || p.country || '') + '</span><small>' + escapeHtml(when) + '</small></article>';
    }).join('') + '</div>';
  }

  function pulseMnemonic() {
    var root = document.querySelector('.workspace[data-product-id="opportunities"]');
    if (!root) return;
    root.classList.remove('opp-signal-active');
    void root.offsetWidth;
    root.classList.add('opp-signal-active');
    global.setTimeout(function () { root.classList.remove('opp-signal-active'); }, 1400);
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'opportunities',
      mountId: 'workspace-root',
      accentSmallVar: '--color-opportunities',
      build: function (content, api) {
        content.innerHTML =
          '<section class="opp-hero">' +
            '<div class="opp-hero__copy"><span class="opp-kicker">Caribbean Opportunity Radar</span><h2>Know what you are looking for before the opportunity appears.</h2><p>FTN Opportunities is building one discovery layer for jobs, grants, procurement, business support, training and sponsorships. There is no live listings feed yet, so this phase helps you define and save a structured Opportunity Profile that a future feed can match against.</p></div>' +
            '<div class="opp-mnemonic" aria-hidden="true"><span class="opp-mnemonic__axis"></span><span class="opp-mnemonic__path"></span><span class="opp-mnemonic__node opp-mnemonic__node--1"></span><span class="opp-mnemonic__node opp-mnemonic__node--2"></span><span class="opp-mnemonic__node opp-mnemonic__node--3"></span><span class="opp-mnemonic__beacon"></span></div>' +
          '</section>' +
          '<section class="opp-status-grid"><article><span>Operational now</span><strong>Category discovery</strong><p>Search FTN\'s real opportunity taxonomy.</p></article><article><span>Operational now</span><strong>Opportunity Profile</strong><p>Save the kind of work, funding and business opportunities that matter to you on this device.</p></article><article><span>Future connection</span><strong>Verified listing feeds</strong><p>Employer, government, funder and partner feeds connect only after source, expiry and provenance rules are implemented.</p></article></section>' +
          '<section class="opp-discovery"><div class="workspace-field"><label for="opp-search">Explore opportunity categories</label><input type="text" id="opp-search" placeholder="Search grants, procurement, training, sponsorships..."></div><p id="opp-count" class="workspace-field__hint"></p><div id="opp-results"></div></section>' +
          '<section class="opp-profile"><div class="opp-section-head"><span class="opp-kicker">Build your signal</span><h3>Your Opportunity Profile</h3><p>This is a browser-local preference profile, not a live alert subscription or application.</p></div>' +
            '<form id="opp-preferences" novalidate>' +
              '<div class="workspace-field"><label>What opportunity types matter to you?</label><div class="opp-check-grid">' + CATEGORIES.map(function (c) { return '<label class="workspace-checkbox-label"><input type="checkbox" name="category" value="' + c.id + '"> ' + escapeHtml(c.name) + '</label>'; }).join('') + '</div></div>' +
              '<div class="opp-form-grid"><div class="workspace-field"><label for="opp-territory">Preferred territory</label><input id="opp-territory" name="territory" type="text" value="' + escapeHtml(countryName()) + '" placeholder="Country, island, Caribbean-wide or remote"></div>' +
              '<div class="workspace-field"><label for="opp-sector">Sector / field</label><input id="opp-sector" name="sector" type="text" placeholder="e.g. media, construction, technology, tourism"></div>' +
              '<div class="workspace-field"><label for="opp-stage">Career / business stage</label><select id="opp-stage" name="stage"><option value="">Select</option><option>Student / trainee</option><option>Entry level</option><option>Experienced professional</option><option>Founder / entrepreneur</option><option>Established business</option><option>Creator / artist</option><option>Community organisation</option></select></div>' +
              '<div class="workspace-field"><label for="opp-mode">Preferred work mode</label><select id="opp-mode" name="mode"><option value="">Any</option><option>On-site</option><option>Hybrid</option><option>Remote</option><option>Project / contract</option></select></div>' +
              '<div class="workspace-field"><label for="opp-value">Target value / income (optional)</label><input id="opp-value" name="targetValue" type="text" placeholder="Salary, grant amount, contract value or range"></div>' +
              '<div class="workspace-field"><label for="opp-timing">Timing</label><select id="opp-timing" name="timing"><option>As soon as possible</option><option>Within 3 months</option><option>Within 6 months</option><option>This year</option><option>Just exploring</option></select></div></div>' +
              '<div class="workspace-field"><label for="opp-notes">What would make an opportunity a strong match?</label><textarea id="opp-notes" name="notes" rows="4" placeholder="Skills, qualifications, industries, exclusions, accessibility needs or other matching context"></textarea></div>' +
              '<button type="submit" class="btn btn-primary">Save Opportunity Profile</button><p id="opp-form-status" class="workspace-field__hint" role="status" aria-live="polite"></p>' +
            '</form>' +
          '</section>' +
          '<section class="opp-history-panel"><div class="opp-section-head"><span class="opp-kicker">Saved on this device</span><h3>Recent profiles</h3></div><div id="opp-history"></div></section>' +
          '<section class="opp-trust"><strong>Trust boundary</strong><p>FTN Opportunities does not currently claim live jobs, live grants, automatic alerts, application submission, employer verification or guaranteed eligibility. Future listings should carry source, territory, deadline, eligibility and last-verified metadata before being represented as active.</p></section>';

        var input = document.getElementById('opp-search');
        var results = document.getElementById('opp-results');
        var count = document.getElementById('opp-count');
        var history = document.getElementById('opp-history');
        var form = document.getElementById('opp-preferences');
        var status = document.getElementById('opp-form-status');

        function render(query) {
          var out = global.FTN.SearchFoundation.query(CATEGORIES, { textQuery: query });
          count.textContent = out.total + ' of ' + CATEGORIES.length + ' categories' + (query ? ' match “' + query + '”' : '');
          results.innerHTML = resultsHTML(out.results);
        }

        input.addEventListener('input', function () { render(input.value); });
        render('');
        renderHistory(history);

        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var checked = Array.prototype.slice.call(form.querySelectorAll('input[name="category"]:checked')).map(function (el) { return el.value; });
          if (!checked.length) {
            status.textContent = 'Choose at least one opportunity type.';
            return;
          }
          var data = new FormData(form);
          var payload = {
            categories: checked,
            territory: String(data.get('territory') || '').trim(),
            sector: String(data.get('sector') || '').trim(),
            stage: String(data.get('stage') || '').trim(),
            mode: String(data.get('mode') || '').trim(),
            targetValue: String(data.get('targetValue') || '').trim(),
            timing: String(data.get('timing') || '').trim(),
            notes: String(data.get('notes') || '').trim(),
            country: countryName()
          };
          global.FTN.IntegrationAdapter.submit('opportunities', payload).then(function (res) {
            status.textContent = 'Saved on this device. This is not yet a live opportunity alert subscription.';
            api.notify(res.message, 'success');
            pulseMnemonic();
            renderHistory(history);
          });
        });
      }
    });
  });
})(window);
