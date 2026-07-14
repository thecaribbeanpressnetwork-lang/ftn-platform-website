// FTN Platform Website — FTN Screen workspace (Sprint 1, Wave 2).
// Entity Metadata Engine's 'screen-submission' schema, Media Intake/Playback (attach and preview
// a trailer or clip locally), and Export Framework, wired into js/workspace-shell.js.
(function (global) {
  'use strict';

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function fieldInputHTML(f) {
    var id = 'sc-' + f.key;
    var req = f.required ? ' required' : '';
    if (f.type === 'textarea') return '<textarea id="' + id + '" name="' + f.key + '"' + req + '></textarea>';
    return '<input type="text" id="' + id + '" name="' + f.key + '"' + req + '>';
  }

  function recordToText(record, attachedFileName) {
    var lines = ['FTN Screen — Submission Record', ''];
    var fieldDefs = global.FTN.EntityMetadataEngine.fieldsFor(record.entityType);
    fieldDefs.forEach(function (f) {
      lines.push(f.label + ': ' + (record.fields[f.key] || '(not provided)'));
    });
    lines.push('');
    lines.push('Attached trailer/clip: ' + (attachedFileName || '(none attached)'));
    lines.push('Generated: ' + record.generatedAt);
    return lines.join('\n');
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'screen',
      mountId: 'workspace-root',
      accentSmallVar: '--color-screen',
      build: function (content, api) {
        var fields = global.FTN.EntityMetadataEngine.fieldsFor('screen-submission');
        var attachedFile = null;

        content.innerHTML =
          '<p class="u-max-60ch">Build a real submission record for your film, series, or ' +
          'programming idea: fill in the details, attach a local trailer or clip to preview ' +
          'alongside it, and export a clean record you can send to a programming contact.</p>' +
          '<form id="screen-form" novalidate>' +
          fields.map(function (f) {
            return '<div class="workspace-field"><label for="sc-' + f.key + '">' + escapeHtml(f.label) +
              (f.required ? '' : ' (optional)') + '</label>' + fieldInputHTML(f) + '</div>';
          }).join('') +
          '<div class="workspace-field"><label>Attach a trailer or clip (optional preview)</label>' +
          '<div id="screen-media-intake"></div></div>' +
          '<button type="submit" class="btn btn-primary">Generate submission record</button>' +
          '</form>' +
          '<div id="screen-output"></div>';

        global.FTN.MediaIntake.mount(document.getElementById('screen-media-intake'), {
          accept: 'video/*',
          kind: 'video',
          id: 'screen-clip-input',
          label: 'Choose a video file',
          onSelect: function (file) { attachedFile = file; },
        });

        var form = document.getElementById('screen-form');
        var output = document.getElementById('screen-output');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var input = {};
          fields.forEach(function (f) { input[f.key] = form[f.key].value; });
          var result = global.FTN.EntityMetadataEngine.createRecord('screen-submission', input);
          if (!result.valid) {
            output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(result.errors);
            return;
          }
          renderRecord(result.record, api, output, fields, attachedFile);
        });
      },
    });
  });

  function renderRecord(record, api, output, fields, attachedFile) {
    var attachedName = attachedFile ? attachedFile.name : null;
    var html = '<div class="workspace-output"><h3>' + escapeHtml(record.fields.title) + ' — Submission Record</h3><ul>';
    fields.forEach(function (f) {
      html += '<li><strong>' + escapeHtml(f.label) + ':</strong> ' + escapeHtml(record.fields[f.key] || '(not provided)') + '</li>';
    });
    html += '<li><strong>Attached trailer/clip:</strong> ' + escapeHtml(attachedName || '(none attached)') + '</li>';
    html += '</ul>' + global.FTN.WorkspaceShell.exportRowHTML('screen-save', 'Save this record') + '</div>';
    output.innerHTML = html;

    global.FTN.WorkspaceShell.wireExportButtons(output, {
      title: record.fields.title + ' — Submission Record',
      txtBody: function () { return recordToText(record, attachedName); },
      richBody: record,
    });

    document.getElementById('screen-save').addEventListener('click', function () {
      global.FTN.IntegrationAdapter.submit('screen', record).then(function (res) {
        api.notify(res.message, 'success');
      });
    });
  }
})(window);
