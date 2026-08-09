// FTN Platform Website — FTN Kaiso workspace, production phase 1.
(function (global) {
  'use strict';

  var BEATS = [
    { name: 'Politics & Government', description: 'Elections, policy, parliament and public administration.' },
    { name: 'Crime & Justice', description: 'Law enforcement, courts, public safety and the justice system.' },
    { name: 'Corruption & Accountability', description: 'Public accountability, procurement and investigative reporting.' },
    { name: 'Environment & Climate', description: 'Climate, conservation, pollution and environmental risk.' },
    { name: 'Weather & Disasters', description: 'Hurricanes, flooding, severe weather and emergency response.' },
    { name: 'Business & Economy', description: 'Trade, prices, employment, enterprise and the Caribbean economy.' },
    { name: 'Health', description: 'Public health, healthcare access, institutions and wellness policy.' },
    { name: 'Education', description: 'Schools, universities, students and education policy.' },
    { name: 'Technology', description: 'Innovation, digital access, cybersecurity and regional technology.' },
    { name: 'Culture & Entertainment', description: 'Carnival, music, film, heritage and the arts.' },
    { name: 'Sports', description: 'Community, regional and international sport.' },
    { name: 'Community Issues', description: 'Local infrastructure, services, development and neighbourhood concerns.' },
    { name: 'Immigration & Diaspora', description: 'Migration, diaspora communities and regional movement.' },
    { name: 'International', description: 'Global developments with material Caribbean relevance.' }
  ];

  function ensureStyles() {
    if (document.querySelector('link[data-kaiso-production-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/components/kaiso-production.css';
    link.setAttribute('data-kaiso-production-style', 'true');
    document.head.appendChild(link);
  }

  function ensureIntegrationAdapter(done) {
    if (global.FTN && global.FTN.IntegrationAdapter) { done(); return; }
    var existing = document.querySelector('script[data-ftn-integration-adapter]');
    if (existing) { existing.addEventListener('load', done, { once: true }); return; }
    var script = document.createElement('script');
    script.src = '/js/integration-adapter.js';
    script.setAttribute('data-ftn-integration-adapter', 'true');
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', done, { once: true });
    document.head.appendChild(script);
  }

  ensureStyles();
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function countryName() {
    return global.FTN.Country && global.FTN.Country.get ? global.FTN.Country.get().name : 'Trinidad & Tobago';
  }

  function beatOptions() {
    return '<option value="">Select coverage desk</option>' + BEATS.map(function (beat) {
      return '<option value="' + escapeHtml(beat.name) + '">' + escapeHtml(beat.name) + '</option>';
    }).join('');
  }

  function beatsHTML(beats) {
    if (!beats.length) return '<p class="workspace-muted">No coverage desk matched those words. A story can still be pitched using “Other / emerging issue”.</p>';
    return '<ul class="kaiso-beat-list">' + beats.map(function (beat) {
      return '<li><strong>' + escapeHtml(beat.name) + '</strong><small>' + escapeHtml(beat.description) + '</small></li>';
    }).join('') + '</ul>';
  }

  function pulseMnemonic() {
    var mnemonic = document.querySelector('.kaiso-mnemonic');
    if (!mnemonic) return;
    mnemonic.classList.remove('kaiso-mnemonic--confirmed');
    void mnemonic.offsetWidth;
    mnemonic.classList.add('kaiso-mnemonic--confirmed');
    global.setTimeout(function () { mnemonic.classList.remove('kaiso-mnemonic--confirmed'); }, 1100);
  }

  function renderHistory() {
    var mount = document.getElementById('kaiso-history-list');
    if (!mount) return;
    var adapter = global.FTN && global.FTN.IntegrationAdapter;
    if (!adapter) { mount.innerHTML = '<p class="workspace-muted">Local newsroom storage is unavailable.</p>'; return; }
    var records = (adapter.history('kaiso-story-tip') || []).slice().reverse().slice(0, 8);
    if (!records.length) { mount.innerHTML = '<p class="workspace-muted">No story pitches saved on this device yet.</p>'; return; }
    mount.innerHTML = '<div class="kaiso-history-list">' + records.map(function (record) {
      var payload = record.payload || {};
      var when = record.submittedAt ? new Date(record.submittedAt).toLocaleString() : '';
      return '<div class="kaiso-history-item"><span>' + escapeHtml(payload.beat || 'Story tip') + '</span><strong>' + escapeHtml(payload.headline || payload.summary || 'Untitled pitch') + '</strong><small>' + escapeHtml(when) + '</small></div>';
    }).join('') + '</div>';
  }

  function mountTipForm() {
    var root = document.getElementById('kaiso-tip-form');
    if (!root) return;
    root.innerHTML = '<form class="kaiso-tip-form" novalidate>' +
      '<div class="kaiso-tip-form__row"><div class="workspace-field"><label for="kaiso-beat">Coverage desk</label><select id="kaiso-beat" name="beat">' + beatOptions() + '<option>Other / emerging issue</option></select></div>' +
      '<div class="workspace-field"><label for="kaiso-location">Where is this happening?</label><input id="kaiso-location" name="location" type="text" placeholder="Community, city, country"></div></div>' +
      '<div class="workspace-field"><label for="kaiso-headline">Working headline</label><input id="kaiso-headline" name="headline" type="text" placeholder="Describe the story in one line" required></div>' +
      '<div class="workspace-field"><label for="kaiso-summary">What happened, and why does it matter?</label><textarea id="kaiso-summary" name="summary" required></textarea></div>' +
      '<div class="kaiso-tip-form__row"><div class="workspace-field"><label for="kaiso-source-type">How do you know?</label><select id="kaiso-source-type" name="sourceType"><option value="">Select</option><option>Directly witnessed it</option><option>Document / official record</option><option>Person directly involved</option><option>Multiple community reports</option><option>Public social/media material</option><option>Other</option></select></div>' +
      '<div class="workspace-field"><label for="kaiso-confidence">How certain are you?</label><select id="kaiso-confidence" name="confidence"><option value="">Select</option><option>First-hand / documented</option><option>Strong information, needs verification</option><option>Unconfirmed lead</option></select></div></div>' +
      '<div class="workspace-field"><label for="kaiso-link">Supporting public link <span class="workspace-field__hint">(optional)</span></label><input id="kaiso-link" name="link" type="url" placeholder="https://"></div>' +
      '<div class="kaiso-tip-form__row"><div class="workspace-field"><label for="kaiso-name">Your name <span class="workspace-field__hint">(optional)</span></label><input id="kaiso-name" name="name" type="text"></div><div class="workspace-field"><label for="kaiso-email">Email for follow-up <span class="workspace-field__hint">(optional)</span></label><input id="kaiso-email" name="email" type="email"></div></div>' +
      '<div class="workspace-field"><label for="kaiso-urgency">Editorial urgency</label><select id="kaiso-urgency" name="urgency"><option>Standard</option><option>Time-sensitive / developing</option><option>Public safety concern</option></select></div>' +
      '<p class="workspace-field__hint">Do not enter confidential credentials, private addresses or material that could put someone at risk.</p>' +
      '<label class="kaiso-consent"><input type="checkbox" name="consent" required> I understand this is a story lead that requires verification before publication.</label>' +
      '<button type="submit" class="btn btn-primary">Save Story Pitch</button><p class="kaiso-form-status" role="status" aria-live="polite"></p></form>';

    var form = root.querySelector('form');
    var status = root.querySelector('.kaiso-form-status');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var payload = {
        beat: String(data.get('beat') || '').trim(), location: String(data.get('location') || '').trim(), headline: String(data.get('headline') || '').trim(),
        summary: String(data.get('summary') || '').trim(), sourceType: String(data.get('sourceType') || '').trim(), confidence: String(data.get('confidence') || '').trim(),
        link: String(data.get('link') || '').trim(), name: String(data.get('name') || '').trim(), email: String(data.get('email') || '').trim(), urgency: String(data.get('urgency') || 'Standard').trim(),
        countryContext: countryName(), consent: data.get('consent') === 'on', intentInterpreter: 'ibis.ai'
      };
      var errors = [];
      if (!payload.headline) errors.push('Add a working headline.');
      if (!payload.summary) errors.push('Explain what happened and why it matters.');
      if (payload.email && payload.email.indexOf('@') === -1) errors.push('Enter a valid email or leave it blank.');
      if (!payload.consent) errors.push('Confirm the editorial notice.');
      if (errors.length) { status.textContent = errors.join(' '); status.className = 'kaiso-form-status kaiso-form-status--error'; return; }
      var adapter = global.FTN && global.FTN.IntegrationAdapter;
      if (!adapter) { status.textContent = 'Local storage is unavailable in this browser.'; status.className = 'kaiso-form-status kaiso-form-status--error'; return; }
      adapter.submit('kaiso-story-tip', payload).then(function () {
        status.textContent = 'Saved on this device.';
        status.className = 'kaiso-form-status kaiso-form-status--ok';
        pulseMnemonic(); form.reset(); renderHistory();
      });
    });
  }

  function buildWorkspace() {
    global.FTN.WorkspaceShell.init({
      productId: 'kaiso', mountId: 'workspace-root', accentSmallVar: '--color-kaiso-on-dark',
      build: function (content) {
        content.innerHTML = '<section class="kaiso-hero"><div class="kaiso-hero__copy"><span class="kaiso-kicker">The Caribbean Newsroom</span><h2>Find the story. Build the record. Verify before publishing.</h2><p>Search FTN Kaiso coverage desks and prepare a structured story pitch with the facts, source basis and context that matter.</p></div>' +
          '<div class="kaiso-mnemonic" aria-hidden="true"><span class="kaiso-mnemonic__sheet"></span><span class="kaiso-mnemonic__line kaiso-mnemonic__line--1"></span><span class="kaiso-mnemonic__line kaiso-mnemonic__line--2"></span><span class="kaiso-mnemonic__line kaiso-mnemonic__line--3"></span><span class="kaiso-mnemonic__rule"></span><span class="kaiso-mnemonic__stamp">Verify</span><span class="kaiso-mnemonic__scan"></span></div></section>' +
          '<div class="kaiso-grid"><section class="kaiso-panel"><span class="kaiso-kicker">Coverage Desk</span><h3>What should Kaiso cover?</h3><div class="workspace-field kaiso-beat-search"><label for="kaiso-search">Search coverage beats</label><input type="text" id="kaiso-search" placeholder="e.g. climate, corruption, health"></div><p id="kaiso-count" class="workspace-field__hint"></p><div id="kaiso-results"></div></section>' +
          '<section class="kaiso-panel"><span class="kaiso-kicker">Story Desk</span><h3>Prepare a story pitch</h3><p>Capture what happened, how you know and what still needs checking.</p><div id="kaiso-tip-form"></div></section></div>' +
          '<section class="kaiso-panel kaiso-history"><span class="kaiso-kicker">Saved on this device</span><h3>Recent story pitches</h3><div id="kaiso-history-list"></div></section>';

        var input = document.getElementById('kaiso-search');
        var results = document.getElementById('kaiso-results');
        var count = document.getElementById('kaiso-count');
        function render(query) {
          var out = global.FTN.SearchFoundation.query(BEATS, { textQuery: query });
          count.textContent = out.total + ' of ' + BEATS.length + ' coverage beats' + (query ? ' match “' + query + '”' : '');
          results.innerHTML = beatsHTML(out.results);
        }
        input.addEventListener('input', function () { render(input.value); });
        render(''); mountTipForm(); renderHistory();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () { ensureIntegrationAdapter(buildWorkspace); });
})(window);
