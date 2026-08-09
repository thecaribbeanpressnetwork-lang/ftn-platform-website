// FTN Platform Website — FTN Riddim workspace.
(function (global) {
  'use strict';

  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;
  var ADMIN_IPI = '01126226295-RickBosz';
  var ADMIN_PUBLISHER = 'Boss Entertainment Publishing';

  function injectStyles() {
    if (document.getElementById('ftn-riddim-styles')) return;
    var s = document.createElement('style');
    s.id = 'ftn-riddim-styles';
    s.textContent = [
      '.riddim-hub{max-width:1180px;margin:0 auto;padding:clamp(22px,4vw,56px) 0}',
      '.riddim-head{max-width:780px;margin-bottom:24px}',
      '.riddim-head h1{font-size:clamp(32px,4vw,52px);margin:.22em 0}',
      '.riddim-head p{color:var(--color-text-muted,#666);font-size:16px;line-height:1.65}',
      '.riddim-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}',
      '.riddim-card{display:block;text-align:left;text-decoration:none;color:inherit;background:#fff;border:1px solid #d8d8d8;border-radius:18px;padding:24px;min-height:240px;box-shadow:0 8px 28px rgba(0,0,0,.06)}',
      '.riddim-card--dark{background:#0d1015;color:#fff;border-color:#2d333d}',
      '.riddim-card h2{font-size:23px;margin:12px 0 7px}.riddim-card p{line-height:1.55;color:#666}.riddim-card--dark p{color:#aeb5c0}',
      '.riddim-card button,.riddim-card .riddim-link{margin-top:12px;font-weight:800}',
      '.riddim-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}',
      '.riddim-form-grid .workspace-field--wide{grid-column:1/-1}',
      '.riddim-detected{margin-top:10px;padding:12px;border:1px solid #d7d7d7;border-radius:10px;background:#fafafa;font-size:13px;line-height:1.55}',
      '.riddim-source-tag{display:inline-block;margin:2px 4px 2px 0;padding:3px 6px;border-radius:5px;background:#eceff3;font-size:10px;font-weight:800}',
      '.riddim-rights{margin:18px 0;padding:16px;border:1px solid #dedede;border-radius:12px;background:#fafafa}',
      '.riddim-rights h3{margin-top:0}.riddim-rights label{display:flex;gap:10px;align-items:flex-start;line-height:1.5}',
      '.riddim-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}',
      '.riddim-record{margin-top:18px}.riddim-record table{width:100%;border-collapse:collapse}.riddim-record th,.riddim-record td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #e7e7e7}.riddim-record th{width:32%;font-size:12px}',
      '@media(max-width:900px){.riddim-grid{grid-template-columns:1fr}.riddim-card{min-height:auto}}',
      '@media(max-width:720px){.riddim-form-grid{grid-template-columns:1fr}.riddim-form-grid .workspace-field--wide{grid-column:auto}}'
    ].join('');
    document.head.appendChild(s);
  }

  function fieldInputHTML(f) {
    var id = 'rd-' + f.key;
    var req = f.required ? ' required' : '';
    if (f.type === 'textarea') return '<textarea id="' + id + '" name="' + f.key + '"' + req + '></textarea>';
    if (f.type === 'date') return '<input type="date" id="' + id + '" name="' + f.key + '"' + req + '>';
    return '<input type="text" id="' + id + '" name="' + f.key + '"' + req + '>';
  }

  function trackIntake(content, api) {
    var fields = global.FTN.EntityMetadataEngine.fieldsFor('music-release');
    var attachedFile = null;
    var detectedMeta = null;

    content.innerHTML = '<div class="workspace-card">' +
      '<span class="workspace-eyebrow">FTN RIDDIM · TRACK INTAKE</span>' +
      '<h2>Build one canonical music record</h2>' +
      '<p class="u-max-60ch">Attach an authorized track, read supported embedded metadata locally, complete or correct the record, then save one reusable FTN music record for release preparation and other FTN music tools.</p>' +
      '<div class="workspace-field workspace-field--wide"><label>Track file</label><div id="riddim-media-intake"></div><div id="riddim-detected" class="riddim-detected" aria-live="polite">Choose a track to inspect its local metadata. Nothing is uploaded.</div></div>' +
      '<form id="riddim-form" novalidate><div class="riddim-form-grid">' +
      fields.map(function (f) {
        var wide = f.type === 'textarea' ? ' workspace-field--wide' : '';
        return '<div class="workspace-field' + wide + '"><label for="rd-' + f.key + '">' + escapeHtml(f.label) + (f.required ? '' : ' (optional)') + '</label>' + fieldInputHTML(f) + '</div>';
      }).join('') +
      '</div>' +
      '<section class="riddim-rights" aria-labelledby="riddim-admin-title"><h3 id="riddim-admin-title">Publishing administration fallback</h3>' +
      '<p>If the artist/writer has their own IPI/CAE, enter it above. If they do not, FTN can offer publishing administration through ' + escapeHtml(ADMIN_PUBLISHER) + ' using IPI ' + escapeHtml(ADMIN_IPI) + '.</p>' +
      '<p><strong>Disclosure:</strong> if royalties are actually received through this administrator IPI arrangement, the artist/rightsholder receives 50% and the administrator receives 50%, subject to the written agreement and any unavoidable collection/payment deductions stated in that agreement.</p>' +
      '<label><input type="checkbox" id="riddim-admin-accept"> <span>I do not have an IPI/CAE for this work and I explicitly accept the 50/50 publishing-administration arrangement described above for this record.</span></label></section>' +
      '<div class="riddim-actions"><button type="submit" class="btn btn-primary">Validate &amp; build music record</button><button type="button" class="btn btn-secondary" id="riddim-clear">Clear form</button></div></form>' +
      '<div id="riddim-output"></div></div>';

    var form = document.getElementById('riddim-form');
    var output = document.getElementById('riddim-output');
    var detectedHost = document.getElementById('riddim-detected');
    var adminAccept = document.getElementById('riddim-admin-accept');

    function setIfEmpty(fieldName, value) {
      if (!value || !form[fieldName] || String(form[fieldName].value || '').trim()) return;
      form[fieldName].value = value;
    }

    function renderDetected(result) {
      var d = result.detected || {};
      var items = [];
      Object.keys(d).forEach(function (key) {
        if (d[key]) items.push('<span class="riddim-source-tag">' + escapeHtml(key) + '</span> ' + escapeHtml(d[key]));
      });
      detectedHost.innerHTML = '<strong>' + escapeHtml(result.fileName) + '</strong>' +
        (result.duration ? ' · ' + escapeHtml(result.duration) : '') + '<br>' +
        escapeHtml(result.supportNote) +
        (items.length ? '<br><strong>Detected:</strong><br>' + items.join('<br>') : '<br>No supported embedded fields were detected. Complete the record manually.') +
        '<br><em>Detected values fill blank fields only. Review and confirm everything before saving.</em>';
    }

    global.FTN.MediaIntake.mount(document.getElementById('riddim-media-intake'), {
      accept: 'audio/*', kind: 'audio', id: 'riddim-track-input', label: 'Choose an audio track',
      onSelect: function (file) {
        attachedFile = file;
        detectedHost.textContent = 'Reading local track metadata…';
        if (!global.FTN.RiddimMetadata) {
          detectedHost.textContent = 'Track preview is available, but the metadata reader is unavailable.';
          return;
        }
        global.FTN.RiddimMetadata.read(file).then(function (result) {
          detectedMeta = result;
          var d = result.detected || {};
          setIfEmpty('trackTitle', d.trackTitle);
          setIfEmpty('artistName', d.artistName);
          setIfEmpty('albumTitle', d.albumTitle);
          setIfEmpty('genre', d.genre);
          setIfEmpty('isrc', d.isrc);
          setIfEmpty('publisher', d.publisher);
          setIfEmpty('composers', d.composer);
          if (d.releaseDate && /^\d{4}-\d{2}-\d{2}$/.test(d.releaseDate)) setIfEmpty('releaseDate', d.releaseDate);
          if (form.localFilePath) form.localFilePath.value = file.name;
          renderDetected(result);
        }).catch(function () {
          detectedHost.textContent = 'The track loaded, but FTN could not read embedded metadata from this file. Complete the record manually.';
        });
      }
    });

    adminAccept.addEventListener('change', function () {
      if (adminAccept.checked) {
        if (form.artistIpi && form.artistIpi.value.trim()) {
          adminAccept.checked = false;
          api.notify('An artist/writer IPI is already entered. The fallback administrator IPI was not applied.', 'info');
          return;
        }
        form.publisher.value = ADMIN_PUBLISHER;
        form.adminIpi.value = ADMIN_IPI;
        form.publishingAdminAgreement.value = 'Accepted 50/50 administration disclosure in browser on ' + new Date().toISOString();
      } else {
        if (form.adminIpi.value === ADMIN_IPI) form.adminIpi.value = '';
        if (form.publisher.value === ADMIN_PUBLISHER) form.publisher.value = '';
        form.publishingAdminAgreement.value = '';
      }
    });

    document.getElementById('riddim-clear').addEventListener('click', function () {
      form.reset(); attachedFile = null; detectedMeta = null;
      detectedHost.textContent = 'Choose a track to inspect its local metadata. Nothing is uploaded.';
      output.innerHTML = '';
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = {};
      fields.forEach(function (f) { input[f.key] = form[f.key].value; });
      if (input.artistIpi && input.adminIpi === ADMIN_IPI) {
        output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(['Use either the artist/writer IPI or the FTN publishing-administration fallback for this record, not both.']);
        return;
      }
      if (input.adminIpi === ADMIN_IPI && !adminAccept.checked) {
        output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(['The 50/50 publishing-administration disclosure must be explicitly accepted before the administrator IPI can be used.']);
        return;
      }
      var result = global.FTN.EntityMetadataEngine.createRecord('music-release', input);
      if (!result.valid) {
        output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(result.errors);
        return;
      }
      var record = result.record;
      record.source = { fileName: attachedFile ? attachedFile.name : '', detectedMetadata: detectedMeta ? detectedMeta.detected : {}, confirmationState: 'user-reviewed' };
      var html = '<div class="workspace-output riddim-record"><h3>' + escapeHtml(record.fields.trackTitle) + ' — FTN Music Record</h3><p><strong>Status:</strong> user-reviewed browser record. Unknown fields remain blank; FTN does not invent metadata.</p><table><tbody>';
      fields.forEach(function (f) { html += '<tr><th>' + escapeHtml(f.label) + '</th><td>' + escapeHtml(record.fields[f.key] || '—') + '</td></tr>'; });
      html += '<tr><th>Attached source</th><td>' + escapeHtml(attachedFile ? attachedFile.name : '—') + '</td></tr></tbody></table>' + global.FTN.WorkspaceShell.exportRowHTML('riddim-save', 'Save this FTN music record') + '</div>';
      output.innerHTML = html;
      global.FTN.WorkspaceShell.wireExportButtons(output, {
        title: record.fields.trackTitle + ' — FTN Music Record',
        txtBody: function () { return record.fields.trackTitle + ' — FTN Music Record\n\n' + fields.map(function (f) { return f.label + ': ' + (record.fields[f.key] || '—'); }).join('\n'); },
        richBody: record
      });
      document.getElementById('riddim-save').addEventListener('click', function () {
        global.FTN.IntegrationAdapter.submit('riddim-music-record', record).then(function (res) { api.notify(res.message, 'success'); });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectStyles();
    global.FTN.WorkspaceShell.init({
      productId: 'riddim', mountId: 'workspace-root', accentSmallVar: '--color-riddim',
      build: function (content, api) {
        content.innerHTML = '<section class="riddim-hub"><div class="riddim-head"><span class="workspace-eyebrow">FTN RIDDIM</span><h1>Powering Caribbean music.</h1><p>One Caribbean music workspace for track preparation, rights-aware metadata, local audio shaping, versioning and DJ performance tools.</p></div>' +
          '<div class="riddim-grid">' +
          '<article class="riddim-card"><h2>Track Intake &amp; Release Prep</h2><p>Attach an authorized track, inspect supported embedded metadata, complete credits and rights information, then save or export one canonical FTN music record.</p><button class="btn btn-primary" id="riddim-track-choice" type="button">Open Track Intake</button></article>' +
          '<a class="riddim-card" href="/riddim/daw/"><h2>FTN DAW</h2><p>Load authorized local audio, shape gain, tempo and adjustable EQ, compare the original, save named versions, then download the processed audio and its FTN settings recipe.</p><span class="riddim-link">Open FTN DAW →</span></a>' +
          '<a class="riddim-card riddim-card--dark" href="/riddim/dj/"><h2>FTN DJ Tube</h2><p>Open the two-deck Caribbean DJ workspace with local profiles, controller mapping, tempo, cue, crossfade and performance controls.</p><span class="riddim-link">Open FTN DJ Tube →</span></a>' +
          '</div></section><div id="riddim-track-mount" hidden></div>';
        document.getElementById('riddim-track-choice').addEventListener('click', function () {
          document.querySelector('.riddim-hub').hidden = true;
          var mount = document.getElementById('riddim-track-mount');
          mount.hidden = false;
          trackIntake(mount, api);
        });
      }
    });
  });
})(window);
