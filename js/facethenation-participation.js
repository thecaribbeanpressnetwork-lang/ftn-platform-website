// FTN Platform Website — Face The Nation audience participation.
(function (global) {
  'use strict';

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
    });
  }

  function mountForm(root, kind) {
    if (!root) return;
    var isTopic = kind === 'topic';
    var title = isTopic ? 'Suggest a Topic' : 'Recommend a Guest';
    var button = isTopic ? 'Save Topic Suggestion' : 'Save Guest Recommendation';

    root.innerHTML =
      '<form class="ftn-participation-form" novalidate>' +
        '<div class="workspace-field"><label>Name</label><input name="name" type="text" required></div>' +
        '<div class="workspace-field"><label>Email</label><input name="email" type="email" required></div>' +
        '<div class="workspace-field"><label>Constituency / community</label><input name="community" type="text"></div>' +
        '<div class="workspace-field"><label>Issue area</label><select name="issue"><option value="">Select</option><option>Community infrastructure</option><option>Local government</option><option>National policy</option><option>Economy and jobs</option><option>Crime and public safety</option><option>Health</option><option>Education</option><option>Environment</option><option>Culture</option><option>Other</option></select></div>' +
        (isTopic
          ? '<div class="workspace-field"><label>What should Face The Nation discuss?</label><textarea name="detail" rows="5" required></textarea></div>'
          : '<div class="workspace-field"><label>Guest name / organisation</label><input name="guest" type="text" required></div><div class="workspace-field"><label>Why should this person be invited?</label><textarea name="detail" rows="5" required></textarea></div>') +
        '<div class="workspace-field"><label>Supporting link (optional)</label><input name="link" type="url" placeholder="https://"></div>' +
        '<label class="ftn-consent"><input type="checkbox" name="consent" required> I understand this is a programme suggestion, not a guarantee of coverage or an invitation.</label>' +
        '<button class="btn btn-primary" type="submit">' + button + '</button>' +
        '<p class="ftn-form-status" role="status" aria-live="polite"></p>' +
      '</form>';

    var form = root.querySelector('form');
    var status = root.querySelector('.ftn-form-status');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var payload = {
        kind: kind,
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        community: String(data.get('community') || '').trim(),
        issue: String(data.get('issue') || '').trim(),
        guest: String(data.get('guest') || '').trim(),
        detail: String(data.get('detail') || '').trim(),
        link: String(data.get('link') || '').trim(),
        consent: data.get('consent') === 'on'
      };
      var errors = [];
      if (!payload.name) errors.push('Enter your name.');
      if (!payload.email || payload.email.indexOf('@') === -1) errors.push('Enter a valid email address.');
      if (!payload.detail) errors.push(isTopic ? 'Tell us what should be discussed.' : 'Explain why this guest should be invited.');
      if (!isTopic && !payload.guest) errors.push('Enter the guest name or organisation.');
      if (!payload.consent) errors.push('Confirm the programme-suggestion notice.');
      if (errors.length) {
        status.textContent = errors.join(' ');
        status.className = 'ftn-form-status ftn-form-status--error';
        return;
      }

      var toolId = isTopic ? 'facethenation-topic' : 'facethenation-guest';
      var adapter = global.FTN && global.FTN.IntegrationAdapter;
      if (!adapter) {
        status.textContent = 'Submission storage is unavailable in this browser.';
        status.className = 'ftn-form-status ftn-form-status--error';
        return;
      }
      adapter.submit(toolId, payload).then(function () {
        status.textContent = 'Saved on this device for programme review. Online editorial submission will connect here when the FTN backend is enabled.';
        status.className = 'ftn-form-status ftn-form-status--ok';
        form.reset();
        renderHistory();
      });
    });
  }

  function renderHistory() {
    var mount = document.getElementById('ftn-participation-history');
    if (!mount || !global.FTN || !global.FTN.IntegrationAdapter) return;
    var topics = global.FTN.IntegrationAdapter.history('facethenation-topic') || [];
    var guests = global.FTN.IntegrationAdapter.history('facethenation-guest') || [];
    var rows = topics.map(function (r) { return { type: 'Topic', at: r.submittedAt, label: r.payload && r.payload.detail }; })
      .concat(guests.map(function (r) { return { type: 'Guest', at: r.submittedAt, label: r.payload && r.payload.guest }; }))
      .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); })
      .slice(0, 6);

    if (!rows.length) {
      mount.innerHTML = '<p class="ftn-history-empty">No suggestions saved on this device yet.</p>';
      return;
    }
    mount.innerHTML = '<div class="ftn-history-list">' + rows.map(function (row) {
      var when = row.at ? new Date(row.at).toLocaleString() : '';
      return '<div class="ftn-history-item"><span>' + escapeHtml(row.type) + '</span><strong>' + escapeHtml(row.label || '(untitled)') + '</strong><small>' + escapeHtml(when) + '</small></div>';
    }).join('') + '</div>';
  }

  function init() {
    mountForm(document.getElementById('ftn-topic-form'), 'topic');
    mountForm(document.getElementById('ftn-guest-form'), 'guest');
    renderHistory();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
