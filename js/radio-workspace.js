// FTN Platform Website — FTN Radio workspace (Sprint 1, Wave 2).
// Media Intake/Playback (preview a local segment recording) plus a real segment-idea intake form,
// saved via the Integration Adapter Layer. Deliberately plain fields, not an Entity Metadata
// schema -- 'radio-segment' is a documented extension point, not pre-built, per the founder's
// refinement that schemas are only added once a real consumer needs them (see
// js/entity-metadata-engine.js).
(function (global) {
  'use strict';

  // Shared implementation lives in js/workspace-shell.js -- consolidated during Founder
  // Certification (was independently copy-pasted into all 9 workspace scripts).
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'radio',
      mountId: 'workspace-root',
      accentSmallVar: '--color-radio',
      build: function (content, api) {
        var attachedFile = null;

        content.innerHTML =
          '<p class="u-max-60ch">Pitch a segment idea for FTN Radio: describe it, attach a local ' +
          'recording to preview alongside it if you have one, and save it. This is saved in your ' +
          'browser today -- a real programming pipeline will pick these up once one exists.</p>' +
          '<form id="radio-form" novalidate>' +
          '<div class="workspace-field"><label for="radio-title">Segment title</label>' +
          '<input type="text" id="radio-title" name="title" required></div>' +
          '<div class="workspace-field"><label for="radio-host">Host / presenter name</label>' +
          '<input type="text" id="radio-host" name="host" required></div>' +
          '<div class="workspace-field"><label for="radio-notes">Segment description</label>' +
          '<textarea id="radio-notes" name="notes" required></textarea></div>' +
          '<div class="workspace-field"><label>Attach a recording (optional preview)</label>' +
          '<div id="radio-media-intake"></div></div>' +
          '<button type="submit" class="btn btn-primary">Save segment idea</button>' +
          '</form>' +
          '<div id="radio-output"></div>';

        global.FTN.MediaIntake.mount(document.getElementById('radio-media-intake'), {
          accept: 'audio/*',
          kind: 'audio',
          id: 'radio-clip-input',
          label: 'Choose an audio file',
          onSelect: function (file) { attachedFile = file; },
        });

        var form = document.getElementById('radio-form');
        var output = document.getElementById('radio-output');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var title = form.title.value.trim();
          var host = form.host.value.trim();
          var notes = form.notes.value.trim();
          if (!title || !host || !notes) {
            var errors = [];
            if (!title) errors.push('Segment title is required.');
            if (!host) errors.push('Host / presenter name is required.');
            if (!notes) errors.push('Segment description is required.');
            output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(errors);
            return;
          }

          var payload = { title: title, host: host, notes: notes, attachedFile: attachedFile ? attachedFile.name : null };
          global.FTN.IntegrationAdapter.submit('radio', payload).then(function (res) {
            api.notify(res.message, 'success');
            output.innerHTML = '<div class="workspace-output"><h3>' + escapeHtml(title) + '</h3><ul>' +
              '<li><strong>Host:</strong> ' + escapeHtml(host) + '</li>' +
              '<li><strong>Description:</strong> ' + escapeHtml(notes) + '</li>' +
              '<li><strong>Attached recording:</strong> ' + escapeHtml(payload.attachedFile || '(none attached)') + '</li>' +
              '</ul></div>';
          });
        });
      },
    });
  });
})(window);
