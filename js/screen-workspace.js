// FTN Platform Website — FTN Screen workspace, production phase 1.
(function (global) {
  'use strict';

  if (!document.querySelector('link[data-screen-production-style]')) {
    var style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/css/components/screen-production.css';
    style.setAttribute('data-screen-production-style', 'true');
    document.head.appendChild(style);
  }

  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function fieldInputHTML(f) {
    var id = 'sc-' + f.key;
    var req = f.required ? ' required' : '';
    if (f.type === 'textarea') return '<textarea id="' + id + '" name="' + f.key + '"' + req + '></textarea>';
    return '<input type="' + escapeHtml(f.type || 'text') + '" id="' + id + '" name="' + f.key + '"' + req + '>';
  }

  function recordToText(record, attachedFileName) {
    var lines = ['FTN Screen — Submission Record', ''];
    global.FTN.EntityMetadataEngine.fieldsFor(record.entityType).forEach(function (f) { lines.push(f.label + ': ' + (record.fields[f.key] || '(not provided)')); });
    lines.push('', 'Attached trailer/clip: ' + (attachedFileName || '(none attached)'), 'Generated: ' + record.generatedAt);
    return lines.join('\n');
  }

  function pulseMnemonic() {
    var mark = document.querySelector('.screen-mnemonic');
    if (!mark) return;
    mark.classList.remove('screen-mnemonic--confirmed');
    void mark.offsetWidth;
    mark.classList.add('screen-mnemonic--confirmed');
    global.setTimeout(function () { mark.classList.remove('screen-mnemonic--confirmed'); }, 1000);
  }

  function renderHistory() {
    var mount = document.getElementById('screen-history');
    if (!mount || !global.FTN.IntegrationAdapter) return;
    var records = (global.FTN.IntegrationAdapter.history('screen') || []).slice().reverse().slice(0, 8);
    if (!records.length) { mount.innerHTML = '<p class="workspace-muted">No submission records saved on this device yet.</p>'; return; }
    mount.innerHTML = '<div class="screen-history-list">' + records.map(function (entry) {
      var record = entry.payload || {};
      var fields = record.fields || {};
      var when = entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : '';
      return '<div class="screen-history-item"><span>' + escapeHtml(fields.format || 'Screen') + '</span><strong>' + escapeHtml(fields.title || 'Untitled submission') + '</strong><small>' + escapeHtml(when) + '</small></div>';
    }).join('') + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'screen',
      mountId: 'workspace-root',
      accentSmallVar: '--color-screen',
      build: function (content, api) {
        var fields = global.FTN.EntityMetadataEngine.fieldsFor('screen-submission');
        var attachedFile = null;
        content.innerHTML = '<section class="screen-hero"><div><span class="screen-kicker">Where Caribbean Stories Come Alive</span><h2>Turn a film or series into a complete programming record.</h2><p>FTN Screen’s production foundation is a canonical Caribbean screen-submission record: creative identity, format, origin, logline, synopsis, credits, audience, rights authority and distribution state. Trailer preview and export work locally today; streaming, licensing and commissioning remain future services.</p></div><div class="screen-mnemonic" aria-hidden="true"><span class="screen-mnemonic__frame"></span><span class="screen-mnemonic__play"></span><span class="screen-mnemonic__focus"></span></div></section>' +
          '<div class="screen-status-grid"><article><span>Operational now</span><strong>Canonical submission record</strong><p>Structured metadata for films, series and programming concepts.</p></article><article><span>Operational now</span><strong>Local trailer preview + export</strong><p>Preview video without upload and export the record for review.</p></article><article><span>Future platform layer</span><strong>Catalog + streaming + commissioning</strong><p>Rights workflows, storage, screening, programming decisions and distribution require production services.</p></article></div>' +
          '<section class="screen-panel"><span class="screen-kicker">Submission Studio</span><h3>Build the programming package</h3><form id="screen-form" class="screen-form" novalidate>' + fields.map(function (f) { var wide = f.type === 'textarea' ? ' workspace-field--wide' : ''; return '<div class="workspace-field' + wide + '"><label for="sc-' + f.key + '">' + escapeHtml(f.label) + (f.required ? '' : ' (optional)') + '</label>' + fieldInputHTML(f) + '</div>'; }).join('') + '<div class="workspace-field workspace-field--wide"><label>Attach a trailer or clip (optional local preview)</label><div id="screen-media-intake"></div></div><div class="screen-notice workspace-field--wide"><strong>Rights boundary:</strong> generating or saving this record does not transfer rights, create a commissioning agreement, upload the video or guarantee programming consideration.</div><div class="screen-form__actions"><button type="submit" class="btn btn-primary">Generate Submission Record</button></div></form><div id="screen-output"></div></section>' +
          '<section class="screen-panel" style="margin-top:var(--space-24)"><span class="screen-kicker">Saved on this device</span><h3>Recent Screen records</h3><div id="screen-history"></div></section>';

        global.FTN.MediaIntake.mount(document.getElementById('screen-media-intake'), { accept:'video/*', kind:'video', id:'screen-clip-input', label:'Choose a video file', onSelect:function(file){ attachedFile=file; } });
        var form = document.getElementById('screen-form');
        var output = document.getElementById('screen-output');
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var input = {};
          fields.forEach(function (f) { input[f.key] = form[f.key].value; });
          var result = global.FTN.EntityMetadataEngine.createRecord('screen-submission', input);
          if (!result.valid) { output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(result.errors); return; }
          renderRecord(result.record, api, output, fields, attachedFile);
        });
        renderHistory();
      }
    });
  });

  function renderRecord(record, api, output, fields, attachedFile) {
    var attachedName = attachedFile ? attachedFile.name : null;
    var html = '<div class="workspace-output"><h3>' + escapeHtml(record.fields.title) + ' — Submission Record</h3><ul>';
    fields.forEach(function (f) { html += '<li><strong>' + escapeHtml(f.label) + ':</strong> ' + escapeHtml(record.fields[f.key] || '(not provided)') + '</li>'; });
    html += '<li><strong>Attached trailer/clip:</strong> ' + escapeHtml(attachedName || '(none attached)') + '</li></ul>' + global.FTN.WorkspaceShell.exportRowHTML('screen-save', 'Save this record') + '</div>';
    output.innerHTML = html;
    global.FTN.WorkspaceShell.wireExportButtons(output, { title: record.fields.title + ' — Submission Record', txtBody:function(){ return recordToText(record, attachedName); }, richBody:record });
    document.getElementById('screen-save').addEventListener('click', function () {
      global.FTN.IntegrationAdapter.submit('screen', record).then(function (res) { api.notify(res.message, 'success'); pulseMnemonic(); renderHistory(); });
    });
  }
})(window);
