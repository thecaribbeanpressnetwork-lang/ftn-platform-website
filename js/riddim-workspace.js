// FTN Platform Website — FTN Riddim workspace (Sprint 1, Wave 2).
// Entity Metadata Engine's 'music-release' schema, Media Intake/Playback (attach and preview a
// track locally), and Export Framework, wired into js/workspace-shell.js.
(function (global) {
  'use strict';

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function fieldInputHTML(f) {
    var id = 'rd-' + f.key;
    var req = f.required ? ' required' : '';
    if (f.type === 'textarea') return '<textarea id="' + id + '" name="' + f.key + '"' + req + '></textarea>';
    if (f.type === 'date') return '<input type="date" id="' + id + '" name="' + f.key + '"' + req + '>';
    return '<input type="text" id="' + id + '" name="' + f.key + '"' + req + '>';
  }

  function recordToText(product, record, attachedFileName) {
    var lines = [product.name + ' — Release Sheet', ''];
    var fieldDefs = global.FTN.EntityMetadataEngine.fieldsFor(record.entityType);
    fieldDefs.forEach(function (f) {
      lines.push(f.label + ': ' + (record.fields[f.key] || '(not provided)'));
    });
    lines.push('');
    lines.push('Attached track: ' + (attachedFileName || '(none attached)'));
    lines.push('Generated: ' + record.generatedAt);
    return lines.join('\n');
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'riddim',
      mountId: 'workspace-root',
      accentSmallVar: '--color-riddim',
      build: function (content, api) {
        var fields = global.FTN.EntityMetadataEngine.fieldsFor('music-release');
        var attachedFile = null;

        content.innerHTML =
          '<p class="u-max-60ch">Build a real release sheet for your track: fill in the metadata, ' +
          'attach a local audio file to preview alongside it, and export a clean record you can ' +
          'hand to a distributor, playlist curator, or press contact.</p>' +
          '<form id="riddim-form" novalidate>' +
          fields.map(function (f) {
            return '<div class="workspace-field"><label for="rd-' + f.key + '">' + escapeHtml(f.label) +
              (f.required ? '' : ' (optional)') + '</label>' + fieldInputHTML(f) + '</div>';
          }).join('') +
          '<div class="workspace-field"><label>Attach a track (optional preview)</label>' +
          '<div id="riddim-media-intake"></div></div>' +
          '<button type="submit" class="btn btn-primary">Generate release sheet</button>' +
          '</form>' +
          '<div id="riddim-output"></div>';

        global.FTN.MediaIntake.mount(document.getElementById('riddim-media-intake'), {
          accept: 'audio/*',
          kind: 'audio',
          id: 'riddim-track-input',
          label: 'Choose an audio file',
          onSelect: function (file) { attachedFile = file; },
        });

        var form = document.getElementById('riddim-form');
        var output = document.getElementById('riddim-output');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var input = {};
          fields.forEach(function (f) { input[f.key] = form[f.key].value; });
          var result = global.FTN.EntityMetadataEngine.createRecord('music-release', input);
          if (!result.valid) {
            output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(result.errors);
            return;
          }
          renderSheet(result.record, api, output, fields, attachedFile);
        });
      },
    });
  });

  function renderSheet(record, api, output, fields, attachedFile) {
    var attachedName = attachedFile ? attachedFile.name : null;
    var html = '<div class="workspace-output"><h3>' + escapeHtml(record.fields.trackTitle) + ' — Release Sheet</h3><ul>';
    fields.forEach(function (f) {
      html += '<li><strong>' + escapeHtml(f.label) + ':</strong> ' + escapeHtml(record.fields[f.key] || '(not provided)') + '</li>';
    });
    html += '<li><strong>Attached track:</strong> ' + escapeHtml(attachedName || '(none attached)') + '</li>';
    html += '</ul>' + global.FTN.WorkspaceShell.exportRowHTML('riddim-save', 'Save this release sheet') + '</div>';
    output.innerHTML = html;

    global.FTN.WorkspaceShell.wireExportButtons(output, {
      title: record.fields.trackTitle + ' — Release Sheet',
      txtBody: function () { return recordToText(api.product, record, attachedName); },
      richBody: record,
    });

    document.getElementById('riddim-save').addEventListener('click', function () {
      global.FTN.IntegrationAdapter.submit('riddim', record).then(function (res) {
        api.notify(res.message, 'success');
      });
    });
  }
})(window);
