// FTN Platform Website — Face The Nation audience participation + media hub.
(function (global) {
  'use strict';

  var MEDIA = {
    youtube: 'https://www.youtube.com/@FaceTheNation-TT',
    latestVideoId: '',
    socials: [
      { name: 'YouTube', handle: '@FaceTheNation-TT', url: 'https://www.youtube.com/@FaceTheNation-TT' },
      { name: 'Instagram', handle: '@FaceTheNationTT', url: 'https://www.instagram.com/facethenationtt/' },
      { name: 'Facebook', handle: 'FaceTheNationTT', url: 'https://www.facebook.com/FaceTheNationTT' },
      { name: 'TikTok', handle: '@FaceTheNationTT', url: 'https://www.tiktok.com/@facethenationtt' },
      { name: 'X', handle: '@FaceTheNationTT', url: 'https://x.com/FaceTheNationTT' }
    ]
  };

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'\"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[c];
    });
  }

  function mountForm(root, kind) {
    if (!root) return;
    var isTopic = kind === 'topic';
    var isGuest = kind === 'guest';
    var isLocation = kind === 'location';
    var button = isTopic ? 'Save Topic Suggestion' : (isGuest ? 'Save Guest Recommendation' : 'Save Location Pitch');
    var specificFields = '';

    if (isTopic) {
      specificFields = '<div class="workspace-field"><label>What should Face The Nation discuss?</label><textarea name="detail" rows="5" required></textarea></div>';
    } else if (isGuest) {
      specificFields = '<div class="workspace-field"><label>Who would you like to see on Face The Nation?</label><input name="guest" type="text" required></div>' +
        '<div class="workspace-field"><label>Why should this person or organisation be heard?</label><textarea name="detail" rows="5" required></textarea></div>';
    } else {
      specificFields = '<div class="workspace-field"><label>Where should Face The Nation go?</label><input name="location" type="text" placeholder="Community, street, school, market, venue or constituency" required></div>' +
        '<div class="workspace-field"><label>What should we talk about there, and who should be part of the conversation?</label><textarea name="detail" rows="5" required></textarea></div>';
    }

    root.innerHTML =
      '<form class="ftn-participation-form" novalidate>' +
      '<div class="workspace-field"><label>Your name</label><input name="name" type="text" required></div>' +
      '<div class="workspace-field"><label>Email</label><input name="email" type="email" required></div>' +
      '<div class="workspace-field"><label>Your constituency / community</label><input name="community" type="text"></div>' +
      '<div class="workspace-field"><label>Issue area</label><select name="issue"><option value="">Select</option><option>Community infrastructure</option><option>Local government</option><option>National policy</option><option>Economy and jobs</option><option>Crime and public safety</option><option>Health</option><option>Education</option><option>Environment</option><option>Culture</option><option>Other</option></select></div>' +
      specificFields +
      '<div class="workspace-field"><label>Supporting link (optional)</label><input name="link" type="url" placeholder="https://"></div>' +
      '<label class="ftn-consent"><input type="checkbox" name="consent" required> I understand this is a public programme suggestion, not a guarantee of coverage, invitation or location selection.</label>' +
      '<button class="btn btn-primary" type="submit">' + button + '</button><p class="ftn-form-status" role="status" aria-live="polite"></p></form>';

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
        location: String(data.get('location') || '').trim(),
        detail: String(data.get('detail') || '').trim(),
        link: String(data.get('link') || '').trim(),
        consent: data.get('consent') === 'on'
      };
      var errors = [];
      if (!payload.name) errors.push('Enter your name.');
      if (!payload.email || payload.email.indexOf('@') === -1) errors.push('Enter a valid email address.');
      if (!payload.detail) errors.push('Tell us what conversation you want to see.');
      if (isGuest && !payload.guest) errors.push('Enter the guest name or organisation.');
      if (isLocation && !payload.location) errors.push('Enter the place you want Face The Nation to visit.');
      if (!payload.consent) errors.push('Confirm the programme-suggestion notice.');
      if (errors.length) { status.textContent = errors.join(' '); status.className = 'ftn-form-status ftn-form-status--error'; return; }
      var adapter = global.FTN && global.FTN.IntegrationAdapter;
      if (!adapter) { status.textContent = 'Submission storage is unavailable in this browser.'; status.className = 'ftn-form-status ftn-form-status--error'; return; }
      var toolId = isTopic ? 'facethenation-topic' : (isGuest ? 'facethenation-guest' : 'facethenation-location');
      adapter.submit(toolId, payload).then(function () {
        status.textContent = 'Saved on this device only. Online editorial submission will connect here when the FTN backend is enabled.';
        status.className = 'ftn-form-status ftn-form-status--ok'; form.reset(); renderHistory();
      });
    });
  }

  function renderHistory() {
    var mount = document.getElementById('ftn-participation-history');
    if (!mount || !global.FTN || !global.FTN.IntegrationAdapter) return;
    var topics = global.FTN.IntegrationAdapter.history('facethenation-topic') || [];
    var guests = global.FTN.IntegrationAdapter.history('facethenation-guest') || [];
    var locations = global.FTN.IntegrationAdapter.history('facethenation-location') || [];
    var rows = topics.map(function (r) { return { type: 'Topic', at: r.submittedAt, label: r.payload && r.payload.detail }; })
      .concat(guests.map(function (r) { return { type: 'Guest', at: r.submittedAt, label: r.payload && r.payload.guest }; }))
      .concat(locations.map(function (r) { return { type: 'Where', at: r.submittedAt, label: r.payload && r.payload.location }; }))
      .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); })
      .slice(0, 9);
    if (!rows.length) { mount.innerHTML = '<p class="ftn-history-empty">No suggestions saved on this device yet.</p>'; return; }
    mount.innerHTML = '<div class="ftn-history-list">' + rows.map(function (row) { var when = row.at ? new Date(row.at).toLocaleString() : ''; return '<div class="ftn-history-item"><span>' + escapeHtml(row.type) + '</span><strong>' + escapeHtml(row.label || '(untitled)') + '</strong><small>' + escapeHtml(when) + '</small></div>'; }).join('') + '</div>';
  }

  function renderMediaHub() {
    var follow = document.getElementById('follow');
    if (!follow) return;
    var watch = document.createElement('section');
    watch.className = 'section section--tint ftn-watch';
    watch.id = 'watch';
    var player = MEDIA.latestVideoId
      ? '<div class="ftn-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(MEDIA.latestVideoId) + '" title="Watch Face The Nation on YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>'
      : '<div class="ftn-video-placeholder"><span>FACE THE NATION</span><strong>YouTube home ready for Season One.</strong><p>When the first episode video ID is published in the media config, it will play here without redesigning this page.</p><a class="btn btn-primary" href="' + MEDIA.youtube + '" target="_blank" rel="noopener noreferrer">Open Face The Nation on YouTube</a></div>';
    watch.innerHTML = '<div class="container"><div class="section__header"><span class="section__eyebrow">Watch Face The Nation</span><h2>The show lives here and on YouTube.</h2><p class="u-mt-16 u-max-60ch">Visitors can watch featured episodes directly on FTN Platform, then continue to the official Face The Nation YouTube channel.</p></div>' + player + '</div>';
    follow.parentNode.insertBefore(watch, follow);

    follow.innerHTML = '<div class="container"><div class="section__header"><span class="section__eyebrow">Follow Face The Nation</span><h2>@FaceTheNationTT</h2><p class="u-mt-16 u-max-60ch">One official social hub for the programme across YouTube and the FaceTheNationTT social accounts.</p></div><div class="ftn-social-grid">' + MEDIA.socials.map(function (item) { return '<a class="ftn-social-card" href="' + item.url + '" target="_blank" rel="noopener noreferrer"><span>' + escapeHtml(item.name) + '</span><strong>' + escapeHtml(item.handle) + '</strong><small>Open official profile →</small></a>'; }).join('') + '</div></div>';
  }

  function init() {
    mountForm(document.getElementById('ftn-topic-form'), 'topic');
    mountForm(document.getElementById('ftn-guest-form'), 'guest');
    mountForm(document.getElementById('ftn-location-form'), 'location');
    renderHistory();
    renderMediaHub();
  }

  global.FTN = global.FTN || {};
  global.FTN.FaceTheNationMedia = MEDIA;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
