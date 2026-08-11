// FTN Platform Website — FTN Screen movie/cinema workspace.
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
    var lines = ['FTN Screen — Movie Record', ''];
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
    if (!records.length) { mount.innerHTML = '<p class="workspace-muted">No movie records saved on this device yet.</p>'; return; }
    mount.innerHTML = '<div class="screen-history-list">' + records.map(function (entry) {
      var record = entry.payload || {};
      var fields = record.fields || {};
      var when = entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : '';
      return '<div class="screen-history-item"><span>' + escapeHtml(fields.format || 'Film') + '</span><strong>' + escapeHtml(fields.title || 'Untitled film') + '</strong><small>' + escapeHtml(when) + '</small></div>';
    }).join('') + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'screen', mountId: 'workspace-root', accentSmallVar: '--color-screen',
      build: function (content, api) {
        var fields = global.FTN.EntityMetadataEngine.fieldsFor('screen-submission');
        var attachedFile = null;
        content.innerHTML = '<section class="screen-hero"><div><span class="screen-kicker">Where Caribbean Movies Come Alive</span><h2>Turn a Caribbean film into a complete cinema record.</h2><p>Capture the creative identity, origin, story, credits, audience, rights and distribution details that make a Caribbean film ready for discovery, programming and festival submission.</p><p class="workspace-muted"><a href="/tv/">Looking for scheduled television? Open FTN TV and the TV Guide.</a></p></div><div class="screen-mnemonic" aria-hidden="true"><span class="screen-mnemonic__frame"></span><span class="screen-mnemonic__play"></span><span class="screen-mnemonic__focus"></span></div></section>' +
          '<section class="screen-panel"><span class="screen-kicker">Movie Submission Studio</span><h3>Build the movie package</h3><p class="workspace-muted">Build and export the package locally. Sending it to FTN requires sign-in, authority confirmation, human verification and founder moderation; it never publishes automatically.</p><form id="screen-form" class="screen-form" novalidate>' + fields.map(function (f) { var wide = f.type === 'textarea' ? ' workspace-field--wide' : ''; return '<div class="workspace-field' + wide + '"><label for="sc-' + f.key + '">' + escapeHtml(f.label) + (f.required ? '' : ' <span class="workspace-field__hint">(optional)</span>') + '</label>' + fieldInputHTML(f) + '</div>'; }).join('') + '<div class="workspace-field workspace-field--wide"><label>Attach a trailer or clip <span class="workspace-field__hint">(optional local preview)</span></label><div id="screen-media-intake"></div><p class="workspace-field__hint">The preview stays on this device; only filename, type and size metadata can be included in the review request.</p></div><label class="workspace-field workspace-field--wide"><span><input name="authority" type="checkbox" required> I am the rights holder or have authority to submit this title, metadata and trailer reference for FTN review.</span></label><div class="workspace-field workspace-field--wide" data-turnstile-mount><p class="workspace-field__hint">Human verification loads here for the review request.</p></div><div class="screen-form__actions"><button type="submit" class="btn btn-primary">Generate Movie Record</button></div></form><div id="screen-output"></div></section>' +
          '<section class="screen-panel screen-history-panel"><span class="screen-kicker">Saved on this device</span><h3>Recent movie records</h3><div id="screen-history"></div></section>';

        global.FTN.MediaIntake.mount(document.getElementById('screen-media-intake'), { accept:'video/*', kind:'video', id:'screen-clip-input', label:'Choose a video file', onSelect:function(file){ attachedFile=file; } });
        var form = document.getElementById('screen-form');
        var output = document.getElementById('screen-output');
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var input = {};
          fields.forEach(function (f) { input[f.key] = form[f.key].value; });
          var result = global.FTN.EntityMetadataEngine.createRecord('screen-submission', input);
          if (!result.valid) { output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(result.errors); return; }
          if (!form.authority.checked) { output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(['Confirm that you have authority to submit this title and trailer reference.']); return; }
          result.record.intentInterpreter = 'ibis.ai';
          result.record.authorityConfirmed = true;
          result.record.attachedTrailer = attachedFile ? { name:attachedFile.name, type:attachedFile.type, size:attachedFile.size, transfer:'metadata-only-local-preview' } : null;
          renderRecord(result.record, api, output, fields, attachedFile, form);
        });
        renderHistory();
      }
    });
  });

  function renderRecord(record, api, output, fields, attachedFile, form) {
    var attachedName = attachedFile ? attachedFile.name : null;
    var html = '<div class="workspace-output"><h3>' + escapeHtml(record.fields.title) + ' — Movie Record</h3><ul>';
    fields.forEach(function (f) { html += '<li><strong>' + escapeHtml(f.label) + ':</strong> ' + escapeHtml(record.fields[f.key] || '(not provided)') + '</li>'; });
    html += '<li><strong>Attached trailer/clip:</strong> ' + escapeHtml(attachedName || '(none attached)') + '</li><li><strong>Publication status:</strong> local draft — not submitted, approved or published</li></ul>' + global.FTN.WorkspaceShell.exportRowHTML('screen-save', 'Submit for FTN review') + '</div>';
    output.innerHTML = html;
    global.FTN.WorkspaceShell.wireExportButtons(output, { title: record.fields.title + ' — Movie Record', txtBody:function(){ return recordToText(record, attachedName); }, richBody:record });
    if (global.FTN.SmartExport && global.FTN.SmartExport.register) {
      global.FTN.SmartExport.register({ productId:'screen', artifactId:'screen-record', title:record.fields.title + ' — FTN Screen Movie Record', formats:{ txt:function(){ return new Blob([recordToText(record, attachedName)], {type:'text/plain'}); }, json:function(){ return new Blob([JSON.stringify(record,null,2)], {type:'application/json'}); } } });
    }
    document.getElementById('screen-save').addEventListener('click', async function () {
      api.notify('Checking FTN Account and protected submission…');
      try {
        var user = global.FTN.Auth && await global.FTN.Auth.getVerifiedUser();
        if (!user) { api.notify('Sign in through FTN Account before submitting this title for review.', 'error'); return; }
        var token = form.querySelector('[name="cf-turnstile-response"]');
        record.accountUserId = user.id;
        var res = await global.FTN.IntegrationAdapter.submit('screen', record, { transaction:true, transactionType:'screen_title_submission', turnstileToken:token && token.value || '' });
        api.notify(res.message + (res.ok ? ' Nothing is public until founder approval.' : ' Nothing was submitted or published.'), res.ok ? 'success' : 'error');
        if (res.ok) { pulseMnemonic(); renderHistory(); }
      } catch (error) { api.notify('No review request was claimed: ' + (error.message || 'protected service unavailable'), 'error'); }
    });
  }
})(window);
