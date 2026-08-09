// FTN Platform Website — FTN Radio workspace, production phase 1.
(function (global) {
  'use strict';

  if (!document.querySelector('link[data-radio-production-style]')) {
    var style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/css/components/radio-production.css';
    style.setAttribute('data-radio-production-style', 'true');
    document.head.appendChild(style);
  }

  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function pulseMnemonic() {
    var mark = document.querySelector('.radio-mnemonic');
    if (!mark) return;
    mark.classList.remove('radio-mnemonic--live');
    void mark.offsetWidth;
    mark.classList.add('radio-mnemonic--live');
    global.setTimeout(function () { mark.classList.remove('radio-mnemonic--live'); }, 1200);
  }

  function renderHistory() {
    var mount = document.getElementById('radio-history');
    if (!mount || !global.FTN.IntegrationAdapter) return;
    var records = (global.FTN.IntegrationAdapter.history('radio') || []).slice().reverse().slice(0, 8);
    if (!records.length) { mount.innerHTML = '<p class="workspace-muted">No programming ideas saved on this device yet.</p>'; return; }
    mount.innerHTML = '<div class="radio-history-list">' + records.map(function (record) {
      var p = record.payload || {};
      var when = record.submittedAt ? new Date(record.submittedAt).toLocaleString() : '';
      return '<div class="radio-history-item"><span>' + escapeHtml(p.format || 'Segment') + '</span><strong>' + escapeHtml(p.title || 'Untitled idea') + '</strong><small>' + escapeHtml(when) + '</small></div>';
    }).join('') + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'radio',
      mountId: 'workspace-root',
      accentSmallVar: '--color-radio',
      build: function (content, api) {
        var attachedFile = null;
        content.innerHTML = '<section class="radio-hero"><div><span class="radio-kicker">The Soundtrack of the Caribbean</span><h2>Build the programme before you go on air.</h2><p>FTN Radio is being developed as a Caribbean music, talk and culture network. Today the working product is a programming desk: shape a show or segment, preview local audio and save a structured production brief. Live streaming and station automation are not represented as operational until the broadcast backend exists.</p></div><div class="radio-mnemonic" aria-hidden="true"><span class="radio-mnemonic__dial"></span><span class="radio-mnemonic__needle"></span><span class="radio-mnemonic__wave"></span></div></section>' +
          '<div class="radio-status-grid"><article><span>Operational now</span><strong>Programming brief</strong><p>Create structured show and segment concepts for Caribbean audiences.</p></article><article><span>Operational now</span><strong>Local audio preview</strong><p>Preview an audio file in-browser without uploading it.</p></article><article><span>Future broadcast layer</span><strong>Live stream + automation</strong><p>Scheduling, playout, licensing logs, streaming and audience analytics require production services.</p></article></div>' +
          '<div class="radio-grid"><section class="radio-panel"><span class="radio-kicker">Programming Desk</span><h3>Create a show or segment brief</h3><form id="radio-form" class="radio-form" novalidate>' +
          '<div class="radio-form__row"><div class="workspace-field"><label for="radio-title">Programme / segment title</label><input id="radio-title" name="title" required></div><div class="workspace-field"><label for="radio-host">Host / presenter</label><input id="radio-host" name="host" required></div></div>' +
          '<div class="radio-form__row"><div class="workspace-field"><label for="radio-format">Format</label><select id="radio-format" name="format"><option>Music show</option><option>Talk / interview</option><option>News / current affairs</option><option>Culture / lifestyle</option><option>DJ mix / specialty music</option><option>Short segment</option><option>Podcast-style programme</option></select></div><div class="workspace-field"><label for="radio-duration">Target duration</label><select id="radio-duration" name="duration"><option>5–10 minutes</option><option>15–30 minutes</option><option>30–60 minutes</option><option>60–120 minutes</option><option>2+ hours</option></select></div></div>' +
          '<div class="radio-form__row"><div class="workspace-field"><label for="radio-territory">Primary territory / audience</label><input id="radio-territory" name="territory" placeholder="Trinidad & Tobago, Caribbean-wide, diaspora..."></div><div class="workspace-field"><label for="radio-mode">Production mode</label><select id="radio-mode" name="mode"><option>Pre-recorded</option><option>Live concept</option><option>Hybrid</option></select></div></div>' +
          '<div class="workspace-field"><label for="radio-notes">Programme concept</label><textarea id="radio-notes" name="notes" placeholder="What happens in the programme, who it serves, and why it matters?" required></textarea></div>' +
          '<div class="workspace-field"><label for="radio-music">Music / talk direction</label><textarea id="radio-music" name="music" placeholder="Genres, eras, artists, talk topics, recurring features or cultural focus"></textarea></div>' +
          '<div class="radio-form__row"><div class="workspace-field"><label for="radio-frequency">Proposed frequency</label><select id="radio-frequency" name="frequency"><option>One-off</option><option>Daily</option><option>Weekly</option><option>Biweekly</option><option>Monthly</option><option>Seasonal / event-based</option></select></div><div class="workspace-field"><label for="radio-rights">Audio rights status</label><select id="radio-rights" name="rights"><option>No audio attached</option><option>I own/control the attached recording</option><option>I have permission to use it</option><option>Rights need review</option></select></div></div>' +
          '<div class="workspace-field"><label>Attach an audio recording (optional local preview)</label><div id="radio-media-intake"></div></div>' +
          '<div class="radio-notice"><strong>Production boundary:</strong> attached audio stays in this browser and is not uploaded. Saving this brief does not schedule a broadcast, clear music rights or send material to a station server.</div>' +
          '<button type="submit" class="btn btn-primary">Save Programming Brief</button></form><div id="radio-output"></div></section>' +
          '<aside class="radio-panel"><span class="radio-kicker">On-Air Readiness</span><h3>What a real broadcast launch still needs</h3><div class="radio-readiness"><div><b>1.</b><span>Approved programme schedule and editorial responsibility.</span></div><div><b>2.</b><span>Streaming/roadcast infrastructure with monitoring and failover.</span></div><div><b>3.</b><span>Music and content rights/licensing procedures appropriate to each territory.</span></div><div><b>4.</b><span>Playout automation, metadata, logging and archive policy.</span></div><div><b>5.</b><span>Audience analytics and privacy-conscious account/data practices.</span></div></div><div class="radio-notice">FTN should own the programme metadata, scheduling records and audience relationship even where third-party streaming infrastructure is used.</div></aside></div>' +
          '<section class="radio-panel" style="margin-top:var(--space-24)"><span class="radio-kicker">Saved on this device</span><h3>Recent programming briefs</h3><div id="radio-history"></div></section>';

        global.FTN.MediaIntake.mount(document.getElementById('radio-media-intake'), { accept: 'audio/*', kind: 'audio', id: 'radio-clip-input', label: 'Choose an audio file', onSelect: function (file) { attachedFile = file; } });
        var form = document.getElementById('radio-form');
        var output = document.getElementById('radio-output');
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var title = form.title.value.trim();
          var host = form.host.value.trim();
          var notes = form.notes.value.trim();
          var errors = [];
          if (!title) errors.push('Programme title is required.');
          if (!host) errors.push('Host / presenter is required.');
          if (!notes) errors.push('Programme concept is required.');
          if (errors.length) { output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(errors); return; }
          var payload = { title:title, host:host, format:form.format.value, duration:form.duration.value, territory:form.territory.value.trim(), mode:form.mode.value, notes:notes, music:form.music.value.trim(), frequency:form.frequency.value, rights:form.rights.value, attachedFile:attachedFile ? attachedFile.name : null };
          global.FTN.IntegrationAdapter.submit('radio', payload).then(function (res) {
            api.notify(res.message, 'success');
            pulseMnemonic();
            output.innerHTML = '<div class="workspace-output"><h3>' + escapeHtml(title) + '</h3><p><strong>' + escapeHtml(payload.format) + '</strong> · ' + escapeHtml(payload.duration) + ' · ' + escapeHtml(payload.frequency) + '</p><p>' + escapeHtml(notes) + '</p><p><strong>Audio:</strong> ' + escapeHtml(payload.attachedFile || 'none attached') + ' — ' + escapeHtml(payload.rights) + '</p></div>';
            renderHistory();
          });
        });
        renderHistory();
      }
    });
  });
})(window);
