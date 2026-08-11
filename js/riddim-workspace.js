// FTN Platform Website — FTN Riddim workspace.
(function (global) {
  'use strict';
  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;

  function injectStyles() {
    if (document.getElementById('ftn-riddim-styles')) return;
    var s = document.createElement('style');
    s.id = 'ftn-riddim-styles';
    s.textContent = [
      '.riddim-hub{max-width:1180px;margin:0 auto;padding:clamp(22px,4vw,56px) 0}',
      '.riddim-head{max-width:780px;margin-bottom:24px}',
      '.riddim-head h1{font-size:clamp(32px,4vw,52px);margin:.22em 0}',
      '.riddim-head p{color:#b8bec7;font-size:16px;line-height:1.65}',
      '.riddim-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}',
      '.riddim-card{position:relative;display:block;text-align:left;text-decoration:none;color:inherit;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.13);border-radius:18px;padding:24px;min-height:220px;box-shadow:0 16px 38px rgba(0,0,0,.16);overflow:hidden;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}',
      '.riddim-card:hover,.riddim-card:focus-visible{transform:translateY(-3px);border-color:rgba(86,190,126,.72);box-shadow:0 20px 44px rgba(0,0,0,.28)}',
      '.riddim-card--dark{background:#0d1015;color:#fff;border-color:#2d333d}',
      '.riddim-card--epk{background:linear-gradient(145deg,rgba(217,119,6,.09),rgba(255,255,255,.025))}',
      '.riddim-card--fire{background:radial-gradient(circle at 85% 8%,rgba(255,77,0,.2),transparent 36%),linear-gradient(145deg,rgba(255,77,0,.09),rgba(255,255,255,.025));border-color:rgba(255,104,31,.45)}',
      '.riddim-card h2{font-size:23px;margin:12px 0 7px}.riddim-card p{line-height:1.55;color:#b7bec8;max-width:60ch}',
      '.riddim-card button,.riddim-card .riddim-link{margin-top:12px;font-weight:800}',
      '.riddim-card__icon{position:absolute;right:18px;top:18px;width:58px;height:58px;border:1px solid rgba(111,200,143,.55);border-radius:15px;background:#0d1114;opacity:.92}',
      '.riddim-card--epk .riddim-card__icon{border-color:rgba(217,119,6,.7)}',
      '.riddim-icon--dj:before,.riddim-icon--dj:after{content:"";position:absolute;top:14px;width:21px;height:21px;border:2px solid #e6e9ed;border-radius:50%}.riddim-icon--dj:before{left:6px}.riddim-icon--dj:after{right:6px}.riddim-icon--dj i{position:absolute;left:24px;bottom:9px;width:9px;height:3px;background:#2e9e5b}',
      '.riddim-icon--daw:before{content:"";position:absolute;left:10px;right:10px;top:12px;height:6px;background:linear-gradient(90deg,#2e9e5b 0 65%,#333a43 65%);border-radius:2px;box-shadow:0 10px 0 #333a43,0 20px 0 #276c43,0 30px 0 #333a43}.riddim-icon--daw:after{content:"";position:absolute;left:35px;top:8px;bottom:8px;width:1px;background:#fff}',
      '.riddim-icon--track:before{content:"♪";position:absolute;inset:0;display:grid;place-items:center;color:#6fc88f;font:800 30px/1 Montserrat}',
      '.riddim-icon--fire:before{content:"";position:absolute;left:17px;top:8px;width:24px;height:39px;border:3px solid #ff5b18;border-radius:70% 12% 65% 30%;transform:rotate(22deg);box-shadow:inset 0 0 12px rgba(255,189,46,.2)}.riddim-icon--fire:after{content:"";position:absolute;left:24px;top:20px;width:12px;height:22px;border:2px solid #ffbd2e;border-radius:70% 12% 65% 30%;transform:rotate(22deg)}',
      '.riddim-icon--epk:before{content:"";position:absolute;inset:9px;border:1px solid #c5c9ce;border-radius:6px}.riddim-icon--epk:after{content:"";position:absolute;left:17px;top:16px;width:11px;height:11px;border:2px solid #fff;border-radius:50%;box-shadow:0 18px 0 -4px #d97706,17px 1px 0 -4px #78808a,17px 10px 0 -4px #78808a,17px 19px 0 -4px #78808a}',
      '.riddim-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}',
      '.riddim-form-grid .workspace-field--wide{grid-column:1/-1}',
      '.riddim-detected{margin-top:10px;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.035);font-size:13px;line-height:1.55}',
      '.riddim-source-tag{display:inline-block;margin:2px 4px 2px 0;padding:3px 6px;border-radius:5px;background:rgba(255,255,255,.09);font-size:10px;font-weight:800}',
      '.riddim-rights{margin:18px 0;padding:16px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.03)}',
      '.riddim-rights h3{margin-top:0}.riddim-rights p{color:#b9c0c9;line-height:1.55}',
      '.riddim-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}',
      '.riddim-record{margin-top:18px}.riddim-record table{width:100%;border-collapse:collapse}.riddim-record th,.riddim-record td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid rgba(255,255,255,.1)}.riddim-record th{width:32%;font-size:12px}',
      '@media(max-width:900px){.riddim-grid{grid-template-columns:1fr}.riddim-card{min-height:auto}}',
      '@media(max-width:720px){.riddim-form-grid{grid-template-columns:1fr}.riddim-form-grid .workspace-field--wide{grid-column:auto}.riddim-card{padding:20px 86px 20px 20px}}',
      '@media(prefers-reduced-motion:reduce){.riddim-card{transition:none}.riddim-card:hover{transform:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function fieldInputHTML(f) {
    var id = 'rd-' + f.key;
    var req = f.required ? ' required' : '';
    if (f.type === 'textarea') return '<textarea id="' + id + '" name="' + f.key + '"' + req + '></textarea>';
    if (f.type === 'date') return '<input type="date" id="' + id + '" name="' + f.key + '"' + req + '>';
    if (f.type === 'email') return '<input type="email" id="' + id + '" name="' + f.key + '" autocomplete="email"' + req + '>';
    if (f.type === 'select') return '<select id="' + id + '" name="' + f.key + '"' + req + '><option value="">Choose an option</option>' + (f.options || []).map(function(o){ return '<option value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</option>'; }).join('') + '</select>';
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
      fields.map(function (f) { var wide = f.type === 'textarea' ? ' workspace-field--wide' : ''; return '<div class="workspace-field' + wide + '"><label for="rd-' + f.key + '">' + escapeHtml(f.label) + (f.required ? '' : ' <span class="workspace-field__hint">(optional)</span>') + '</label>' + fieldInputHTML(f) + '</div>'; }).join('') +
      '</div>' +
      '<section class="riddim-rights"><h3>Rights and identifiers</h3><p>Choose the IPI/CAE route that fits you. Use your own identifier, select the FTN administrator option, or mark that you want COTT, BMI or another Caribbean CMO/PRO route. You remain responsible for your music, ownership, splits, permissions and the accuracy of every identifier. Saving this metadata record does not itself register, transfer or administer rights.</p></section>' +
      '<div class="riddim-actions"><button type="submit" class="btn btn-primary">Validate &amp; build music record</button><button type="button" class="btn btn-secondary" id="riddim-clear">Clear form</button></div></form>' +
      '<div id="riddim-output"></div></div>';

    var form = document.getElementById('riddim-form');
    var output = document.getElementById('riddim-output');
    var detectedHost = document.getElementById('riddim-detected');

    function setIfEmpty(fieldName, value) { if (!value || !form[fieldName] || String(form[fieldName].value || '').trim()) return; form[fieldName].value = value; }
    function renderDetected(result) {
      var d = result.detected || {}, items = [];
      Object.keys(d).forEach(function (key) { if (d[key]) items.push('<span class="riddim-source-tag">' + escapeHtml(key) + '</span> ' + escapeHtml(d[key])); });
      detectedHost.innerHTML = '<strong>' + escapeHtml(result.fileName) + '</strong>' + (result.duration ? ' · ' + escapeHtml(result.duration) : '') + '<br>' + escapeHtml(result.supportNote) + (items.length ? '<br><strong>Detected:</strong><br>' + items.join('<br>') : '<br>No supported embedded fields were detected. Complete the record manually.') + '<br><em>Detected values fill blank fields only. Review and confirm everything before saving.</em>';
    }

    global.FTN.MediaIntake.mount(document.getElementById('riddim-media-intake'), {
      accept:'audio/*', kind:'audio', id:'riddim-track-input', label:'Choose an audio track',
      onSelect:function(file){
        attachedFile=file; detectedHost.textContent='Reading local track metadata…';
        if(!global.FTN.RiddimMetadata){detectedHost.textContent='Track preview is available, but the metadata reader is unavailable.';return;}
        global.FTN.RiddimMetadata.read(file).then(function(result){
          detectedMeta=result;var d=result.detected||{};setIfEmpty('trackTitle',d.trackTitle);setIfEmpty('artistName',d.artistName);setIfEmpty('albumTitle',d.albumTitle);setIfEmpty('genre',d.genre);setIfEmpty('isrc',d.isrc);setIfEmpty('publisher',d.publisher);setIfEmpty('composers',d.composer);if(d.releaseDate&&/^\d{4}-\d{2}-\d{2}$/.test(d.releaseDate))setIfEmpty('releaseDate',d.releaseDate);if(form.localFilePath)form.localFilePath.value=file.name;renderDetected(result);
        }).catch(function(){detectedHost.textContent='The track loaded, but FTN could not read embedded metadata from this file. Complete the record manually.';});
      }
    });

    document.getElementById('riddim-clear').addEventListener('click',function(){form.reset();attachedFile=null;detectedMeta=null;detectedHost.textContent='Choose a track to inspect its local metadata. Nothing is uploaded.';output.innerHTML='';});
    form.addEventListener('submit',function(e){
      e.preventDefault();var input={};fields.forEach(function(f){input[f.key]=form[f.key].value;});var result=global.FTN.EntityMetadataEngine.createRecord('music-release',input);if(!result.valid){output.innerHTML=global.FTN.WorkspaceShell.renderErrorsHTML(result.errors);return;}var record=result.record;record.source={fileName:attachedFile?attachedFile.name:'',detectedMetadata:detectedMeta?detectedMeta.detected:{},confirmationState:'user-reviewed'};var html='<div class="workspace-output riddim-record"><h3>'+escapeHtml(record.fields.trackTitle)+' — FTN Music Record</h3><p><strong>Status:</strong> user-reviewed browser record. Unknown fields remain blank; FTN does not invent metadata.</p><table><tbody>';fields.forEach(function(f){html+='<tr><th>'+escapeHtml(f.label)+'</th><td>'+escapeHtml(record.fields[f.key]||'—')+'</td></tr>';});html+='<tr><th>Attached source</th><td>'+escapeHtml(attachedFile?attachedFile.name:'—')+'</td></tr></tbody></table>'+global.FTN.WorkspaceShell.exportRowHTML('riddim-save','Save this FTN music record')+'</div>';output.innerHTML=html;global.FTN.WorkspaceShell.wireExportButtons(output,{title:record.fields.trackTitle+' — FTN Music Record',txtBody:function(){return record.fields.trackTitle+' — FTN Music Record\n\n'+fields.map(function(f){return f.label+': '+(record.fields[f.key]||'—');}).join('\n');},richBody:record});document.getElementById('riddim-save').addEventListener('click',function(){global.FTN.IntegrationAdapter.submit('riddim-music-record',record).then(function(res){api.notify(res.message,'success');});});
    });
  }

  document.addEventListener('DOMContentLoaded',function(){injectStyles();global.FTN.WorkspaceShell.init({productId:'riddim',mountId:'workspace-root',accentSmallVar:'--color-riddim',build:function(content,api){content.innerHTML='<section class="riddim-hub"><div class="riddim-head"><span class="workspace-eyebrow">FTN RIDDIM</span><h1>Powering Caribbean music.</h1><p>One Caribbean music workspace for track preparation, Caribbean-first beatmaking, rights-aware metadata, production, versioning, creator identity and DJ performance tools.</p></div><div class="riddim-grid"><a class="riddim-card riddim-card--fire" href="/riddim/fire/"><span class="riddim-card__icon riddim-icon--fire" aria-hidden="true"></span><h2>FTN Fire</h2><p>Build original Caribbean instrumental drafts—soca, reggae, dancehall, calypso, chutney, kompa and island fusion. No generated lyrics or vocalist.</p><span class="riddim-link">Light up FTN Fire →</span></a><article class="riddim-card"><span class="riddim-card__icon riddim-icon--track" aria-hidden="true"></span><h2>Track Intake &amp; Release Prep</h2><p>Attach an authorized track, inspect supported embedded metadata, complete credits and rights information, then save or export one canonical FTN music record.</p><button class="btn btn-primary" id="riddim-track-choice" type="button">Open Track Intake</button></article><a class="riddim-card" href="/riddim/daw/"><span class="riddim-card__icon riddim-icon--daw" aria-hidden="true"></span><h2>FTN DAW</h2><p>Producer workspace for authorized local audio: gain, tempo, adjustable EQ, original comparison, named versions and downloadable output.</p><span class="riddim-link">Open FTN DAW →</span></a><a class="riddim-card riddim-card--dark" href="/riddim/dj/"><span class="riddim-card__icon riddim-icon--dj" aria-hidden="true"><i></i></span><h2>FTN DJ Tube</h2><p>Two-deck Caribbean performance workspace with cue, crossfade, levels and optional browser MIDI mapping for audio you have the right to use.</p><span class="riddim-link">Open FTN DJ Tube →</span></a><a class="riddim-card riddim-card--epk" href="/radio/#ftn-epk"><span class="riddim-card__icon riddim-icon--epk" aria-hidden="true"></span><h2>FTN EPK</h2><p>Build reusable creator identity metadata, professional links, bio and press-photo references for FTN and authorized submissions.</p><span class="riddim-link">Build FTN EPK →</span></a></div></section><div id="riddim-track-mount" hidden></div>';document.getElementById('riddim-track-choice').addEventListener('click',function(){document.querySelector('.riddim-hub').hidden=true;var mount=document.getElementById('riddim-track-mount');mount.hidden=false;trackIntake(mount,api);});}});});
})(window);
