// FTN Platform Website — FTN Radio production workspace.
(function(global){'use strict';
if(!document.querySelector('link[data-radio-production-style]')){var style=document.createElement('link');style.rel='stylesheet';style.href='/css/components/radio-production.css?v=20260812.2';style.setAttribute('data-radio-production-style','true');document.head.appendChild(style);}
var escapeHtml=global.FTN.WorkspaceShell.escapeHtml;
function pulse(){var m=document.querySelector('.radio-tuner');if(!m)return;m.classList.remove('radio-tuner--live');void m.offsetWidth;m.classList.add('radio-tuner--live');setTimeout(function(){m.classList.remove('radio-tuner--live');},900);}
function safeUrl(v){v=(v||'').trim();if(!v)return'';try{var u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:'';}catch(e){return'';}}
function turnstileToken(form){var el=form.querySelector('[name="cf-turnstile-response"]');return el?el.value:'';}
function registerArtifact(id,label,payload){if(!global.FTN.SmartExport||!global.FTN.SmartExport.registerArtifact)return;global.FTN.SmartExport.registerArtifact({id:id,productId:'radio',label:label,description:'FTN creator metadata record.',formats:[{id:'json',label:'JSON',filename:id+'.json',makeFile:function(){return new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});}}]});}
function renderHistory(){var mount=document.getElementById('radio-history');if(!mount)return;var rows=(global.FTN.IntegrationAdapter.history('radio')||[]).slice().reverse().slice(0,8);mount.innerHTML=rows.length?rows.map(function(r){var p=r.payload||{};return'<div class="radio-history-item"><span>'+escapeHtml(p.recordType||p.format||'Radio')+'</span><strong>'+escapeHtml(p.release||p.title||p.name||'Untitled')+'</strong><small>'+escapeHtml(r.transactionId||new Date(r.submittedAt).toLocaleString())+'</small></div>';}).join(''):'<p class="workspace-muted">No Radio records saved on this device yet.</p>';}
function fileMeta(file){return new Promise(function(resolve){var base={name:file.name,type:file.type||'',size:file.size||0,width:null,height:null};if(!/^image\//.test(file.type||'')){resolve(base);return;}var url=URL.createObjectURL(file),img=new Image();img.onload=function(){base.width=img.naturalWidth||null;base.height=img.naturalHeight||null;URL.revokeObjectURL(url);resolve(base);};img.onerror=function(){URL.revokeObjectURL(url);resolve(base);};img.src=url;});}

// A file's <input accept> attribute is only an advisory hint to the OS picker -- it does not
// block selection via "All Files", drag-and-drop, or every OS/browser combination. Real
// rejection has to happen here, in code, checked against both the browser-reported MIME type and
// (when that's empty, which real-world file pickers sometimes leave blank) the extension. MIME
// wins whenever it's present and simply wrong -- extension is only a fallback for a missing type,
// never an override for a type that actively disagrees with it.
var IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
var AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|weba)$/i;
function isImageFile(file) {
  var type = file.type || '';
  if (type) return /^image\//.test(type);
  return IMAGE_EXT_RE.test(file.name || '');
}
function isAudioFile(file) {
  var type = file.type || '';
  if (type) return /^audio\//.test(type);
  return AUDIO_EXT_RE.test(file.name || '');
}
function formatBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}
function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return null;
  var m = Math.floor(seconds / 60), s = Math.round(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
document.addEventListener('DOMContentLoaded',function(){global.FTN.WorkspaceShell.init({productId:'radio',mountId:'workspace-root',accentSmallVar:'--color-radio',build:function(content,api){var attachedFile=null,epkPhotoFiles=[],epkPhotoMetadata=[],epkPreviewUrls=[],localAudioTracks=[];content.innerHTML=
'<section class="radio-hero"><div><span class="radio-kicker">The Soundtrack of the Caribbean</span><h2>Tune in. Build. Be heard.</h2><p>Discover attributed Caribbean music, deliver authorized releases for review and build a reusable FTN EPK from one creator workspace.</p></div><div class="radio-tuner"><label for="ftn-radio-tuner"><span>Slide to tune by sound</span><output id="ftn-radio-tuner-output" for="ftn-radio-tuner">Soca</output></label><input id="ftn-radio-tuner" type="range" min="0" max="7" step="1" value="0" aria-label="Slide to choose an FTN Radio genre"><div class="radio-tuner__scale" aria-hidden="true"><span>Soca</span><span>Roots</span><span>Dancehall</span><span>Kompa</span></div><p>Built for thumbs: drag the slider, then choose a track below.</p></div></section>'+
'<section class="radio-panel radio-listen"><span class="radio-kicker">YouTube Radio</span><h3>Caribbean music, curated by FTN</h3><p class="workspace-muted">Official artist uploads, creator channels and permitted YouTube playback remain attributed to their sources.</p></section>'+
'<section class="radio-panel radio-local-audio"><span class="radio-kicker">Your Local Tracks</span><h3>Preview audio from this device</h3><p class="workspace-muted">Add local audio files to play back and review here. Files stay on this device — FTN does not upload or store these bytes unless a submission form above is used.</p><div class="local-audio-intake"><label for="radio-audio-files">Add audio files <span class="workspace-field__hint">(MP3, WAV, M4A, AAC, OGG, FLAC — up to 8 at once)</span></label><input id="radio-audio-files" type="file" accept="audio/*" multiple></div><div id="radio-audio-library" class="local-audio-library" aria-live="polite"></div><button type="button" id="radio-audio-clear" class="btn btn-outline btn-sm" hidden>Clear all local tracks</button></section>'+
'<section class="radio-panel radio-creator-panel"><span class="radio-kicker">Creator Delivery</span><h3>Submit a track to FTN Radio</h3><p class="workspace-muted">A consequential submission requires your email, authority confirmation and human verification. FTN records the transaction for founder review; nothing is automatically forwarded to a rights society.</p><form id="radio-submit-form" class="radio-form"><div class="radio-form__row"><div class="workspace-field"><label>Artist / creator name</label><input name="artist" aria-label="Artist or creator name" required></div><div class="workspace-field"><label>Email</label><input name="email" aria-label="Contact email" type="email" required autocomplete="email"></div></div><div class="radio-form__row"><div class="workspace-field"><label>Country / territory</label><input name="country" aria-label="Country or territory" placeholder="Trinidad & Tobago"></div><div class="workspace-field"><label>Release title</label><input name="release" aria-label="Release title" required></div></div><div class="radio-form__row"><div class="workspace-field"><label>Authorized delivery or release URL</label><input name="delivery" aria-label="Authorized delivery or release URL" type="url" required placeholder="https://…"></div><div class="workspace-field"><label>Source / origin</label><select name="origin" aria-label="Source or origin"><option value="artist-owned">Artist-owned destination</option><option value="authorized-download">Authorized download link</option><option value="youtube">Official YouTube upload</option><option value="distributor">Distributor / label source</option></select></div></div><div class="radio-form__row"><div class="workspace-field"><label>Genre</label><input name="genre" aria-label="Genre"></div><div class="workspace-field"><label>IPI / CAE route</label><select name="ipiRoute" aria-label="IPI or CAE route"><option value="own">I will enter my own IPI / CAE</option><option value="ftn-admin">Use FTN/Boss Entertainment Publishing administrator IPI</option><option value="cott">Help me prepare for COTT</option><option value="bmi">Help me apply/check with BMI</option><option value="other-cmo">Another Caribbean CMO/PRO</option></select></div></div><div class="workspace-field"><label>IPI / CAE <span class="workspace-field__hint">(if you have one)</span></label><input name="ipi" aria-label="IPI or CAE number" inputmode="numeric"></div><div class="workspace-field"><label>Credits, permissions and delivery notes</label><textarea name="intent" aria-label="Credits, permissions and delivery notes" required placeholder="Writers, producers, label/distributor, permissions, clean/explicit version and any download instructions."></textarea></div><label class="radio-check"><input type="checkbox" name="rights" required> I own/control this submission or have authority to submit its link and metadata.</label><div class="ftn-human-verification" data-turnstile-mount><p class="workspace-field__hint">Human verification appears here when the secure transaction service is configured.</p></div><button class="btn btn-primary">Submit for FTN Review</button></form><div id="radio-submit-output"></div></section>'+
'<section id="ftn-epk" class="radio-panel radio-link-panel" tabindex="-1"><span class="radio-kicker">FTN EPK</span><h3>Build your Caribbean electronic press kit</h3><p class="workspace-muted">Enter your professional data once for Radio, Screen, Events, Opportunities and authorized submissions. Photos remain yours: FTN can preview selected local images and retain only useful file metadata or the external references you provide — not duplicate image masters.</p><form id="radio-link-form" class="radio-form"><div class="radio-form__row"><div class="workspace-field"><label>Creator / brand name</label><input name="name" aria-label="Creator or brand name" required></div><div class="workspace-field"><label>Professional email</label><input name="email" aria-label="Contact email" type="email" required></div></div><div class="radio-form__row"><div class="workspace-field"><label>Country / territory</label><input name="country" aria-label="Country or territory"></div><div class="workspace-field"><label>Genres / roles</label><input name="roles" aria-label="Genres or roles" placeholder="Soca artist, producer, filmmaker..."></div></div><div class="workspace-field"><label>Short professional bio</label><textarea name="bio" aria-label="Short professional bio" required></textarea></div><div class="radio-link-grid"><label>YouTube<input name="youtube" type="url"></label><label>Spotify<input name="spotify" type="url"></label><label>BeatStars<input name="beatstars" type="url"></label><label>Apple Music<input name="apple" type="url"></label><label>SoundCloud<input name="soundcloud" type="url"></label><label>Bandcamp<input name="bandcamp" type="url"></label><label>Instagram<input name="instagram" type="url"></label><label>TikTok<input name="tiktok" type="url"></label><label>Website / store<input name="website" type="url"></label><label>Press photo URL 1<input name="photo1" type="url"></label><label>Press photo URL 2<input name="photo2" type="url"></label><label>Press photo URL 3<input name="photo3" type="url"></label></div><div class="epk-photo-intake"><label for="epk-photo-files">Preview up to 4 press photos from this device <span class="workspace-field__hint">(optional; not uploaded or saved by FTN)</span></label><input id="epk-photo-files" type="file" accept="image/*" multiple><div id="epk-photo-preview" class="epk-photo-preview" aria-live="polite"></div></div><p class="workspace-field__hint">Use creator-owned or authorized images. Local image bytes remain on this device; the EPK record can retain filename, type, size and dimensions so you know which press assets were selected.</p><button class="btn btn-primary">Build FTN EPK Preview</button></form><div id="radio-link-output"></div></section>'+
'<section class="radio-panel"><span class="radio-kicker">Saved on this device</span><h3>Recent Radio records</h3><div id="radio-history"></div></section>';
var photoInput=document.getElementById('epk-photo-files'),photoPreview=document.getElementById('epk-photo-preview');
function renderPhotoPreview(){
  photoPreview.innerHTML='';
  epkPhotoFiles.forEach(function(file,i){
    var url=URL.createObjectURL(file);epkPreviewUrls.push(url);
    var fig=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption'),rm=document.createElement('button');
    img.src=url;img.alt='Local EPK press photo preview '+(i+1);
    cap.textContent=file.name+' · '+formatBytes(file.size);
    rm.type='button';rm.className='btn btn-outline btn-sm';rm.textContent='Remove';rm.setAttribute('aria-label','Remove '+file.name+' from this EPK preview');
    rm.addEventListener('click',function(){
      epkPhotoFiles.splice(i,1);
      epkPhotoMetadata.splice(i,1);
      epkPreviewUrls.forEach(function(u){URL.revokeObjectURL(u);});
      epkPreviewUrls=[];
      renderPhotoPreview();
    });
    fig.appendChild(img);fig.appendChild(cap);fig.appendChild(rm);photoPreview.appendChild(fig);
  });
}
photoInput.addEventListener('change',function(){
  epkPreviewUrls.forEach(function(u){URL.revokeObjectURL(u);});epkPreviewUrls=[];
  var selected=Array.prototype.slice.call(photoInput.files||[],0);
  var rejected=selected.filter(function(f){return !isImageFile(f);});
  var accepted=selected.filter(isImageFile).slice(0,4);
  photoInput.value='';
  if(rejected.length)api.notify((rejected.length===1?rejected[0].name+' is':rejected.length+' files are')+' not an image and '+(rejected.length===1?'was':'were')+' not added. FTN EPK photo preview only accepts image files.','error');
  else if(selected.length>4)api.notify('FTN EPK uses up to four local photo previews.','error');
  epkPhotoFiles=accepted;
  photoPreview.innerHTML='';epkPhotoMetadata=[];
  if(!accepted.length){epkPreviewUrls=[];return;}
  Promise.all(epkPhotoFiles.map(fileMeta)).then(function(meta){epkPhotoMetadata=meta;renderPhotoPreview();});
});
// Local audio library -- deliberately its own state (localAudioTracks), never touching the EPK
// photo variables above. Radio audio and EPK press photos are related creator workflows but not
// the same one; routing an uploaded MP3 into the photo pipeline (or vice versa) was the actual
// production defect this separation exists to prevent.
var audioInput=document.getElementById('radio-audio-files'),audioLibrary=document.getElementById('radio-audio-library'),audioClearBtn=document.getElementById('radio-audio-clear');
function renderAudioLibrary(){
  audioLibrary.innerHTML=localAudioTracks.map(function(t,i){
    return '<div class="local-audio-item"><audio controls preload="metadata" src="'+t.url+'"></audio>'+
      '<div class="local-audio-item__meta"><strong>'+escapeHtml(t.file.name)+'</strong><span>'+formatBytes(t.file.size)+(t.duration?' · '+t.duration:'')+'</span></div>'+
      '<button type="button" class="btn btn-outline btn-sm" data-remove-track="'+i+'" aria-label="Remove '+escapeHtml(t.file.name)+'">Remove</button></div>';
  }).join('') || '<p class="workspace-muted">No local audio added yet.</p>';
  audioClearBtn.hidden=!localAudioTracks.length;
  audioLibrary.querySelectorAll('[data-remove-track]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var i=+btn.getAttribute('data-remove-track');
      URL.revokeObjectURL(localAudioTracks[i].url);
      localAudioTracks.splice(i,1);
      renderAudioLibrary();
    });
  });
  audioLibrary.querySelectorAll('audio').forEach(function(el,i){
    if(localAudioTracks[i]&&localAudioTracks[i].duration)return;
    el.addEventListener('loadedmetadata',function(){
      if(!localAudioTracks[i])return;
      localAudioTracks[i].duration=formatDuration(el.duration);
      renderAudioLibrary();
    },{once:true});
  });
}
if(audioInput){
  audioInput.addEventListener('change',function(){
    var selected=Array.prototype.slice.call(audioInput.files||[],0);
    var rejected=selected.filter(function(f){return !isAudioFile(f);});
    var accepted=selected.filter(isAudioFile).slice(0,8-localAudioTracks.length);
    audioInput.value='';
    if(rejected.length)api.notify((rejected.length===1?rejected[0].name+' is':rejected.length+' files are')+' not an audio file and '+(rejected.length===1?'was':'were')+' not added. FTN Radio local playback only accepts audio files.','error');
    if(!accepted.length)return;
    accepted.forEach(function(file){localAudioTracks.push({file:file,url:URL.createObjectURL(file),duration:null});});
    renderAudioLibrary();
  });
}
if(audioClearBtn){
  audioClearBtn.addEventListener('click',function(){
    localAudioTracks.forEach(function(t){URL.revokeObjectURL(t.url);});
    localAudioTracks=[];
    renderAudioLibrary();
  });
}
renderAudioLibrary();
var sf=document.getElementById('radio-submit-form'),so=document.getElementById('radio-submit-output');sf.addEventListener('submit',function(e){e.preventDefault();var url=safeUrl(sf.delivery.value),p={schemaVersion:3,recordType:'radio_music_submission',artist:sf.artist.value.trim(),email:sf.email.value.trim(),country:sf.country.value.trim(),release:sf.release.value.trim(),deliveryUrl:url,sourceOrigin:sf.origin.value,genre:sf.genre.value.trim(),ipiRoute:sf.ipiRoute.value,ipi:sf.ipi.value.trim(),intent:sf.intent.value.trim(),authorityConfirmed:sf.rights.checked,preparedAt:new Date().toISOString()};if(!url||!p.artist||!p.release||!p.email||!p.intent||!p.authorityConfirmed){so.innerHTML=global.FTN.WorkspaceShell.renderErrorsHTML(['Artist, email, release, valid authorized delivery URL, rights notes and authority confirmation are required.']);return;}global.FTN.IntegrationAdapter.submit('radio',p,{transaction:true,turnstileToken:turnstileToken(sf)}).then(function(r){api.notify(r.message,r.ok?'success':'error');if(!r.ok){so.innerHTML=global.FTN.WorkspaceShell.renderErrorsHTML([r.message]);return;}registerArtifact('ftn-radio-'+r.record.transactionId,p.artist+' — '+p.release,p);pulse();so.innerHTML='<div class="workspace-output"><h3>Received for FTN review</h3><p><strong>'+escapeHtml(r.record.transactionId)+'</strong></p><p>Keep this transaction ID. FTN will use your email for correspondence about this submission.</p></div>';renderHistory();});});
var ef=document.getElementById('radio-link-form'),eo=document.getElementById('radio-link-output');ef.addEventListener('submit',function(e){e.preventDefault();var links={},photos=[];['youtube','spotify','beatstars','apple','soundcloud','bandcamp','instagram','tiktok','website'].forEach(function(k){var u=safeUrl(ef[k].value);if(u)links[k]=u;});['photo1','photo2','photo3'].forEach(function(k){var u=safeUrl(ef[k].value);if(u)photos.push(u);});var p={schemaVersion:3,recordType:'ftn_epk',name:ef.name.value.trim(),email:ef.email.value.trim(),country:ef.country.value.trim(),roles:ef.roles.value.trim(),bio:ef.bio.value.trim(),links:links,photoReferences:photos,localPhotoMetadata:epkPhotoMetadata.slice(),ftnAttribution:'https://ftnplatform.org/'};if(!p.name||!p.email||!p.bio){eo.innerHTML=global.FTN.WorkspaceShell.renderErrorsHTML(['Creator name, professional email and bio are required.']);return;}global.FTN.IntegrationAdapter.submit('radio',p).then(function(r){registerArtifact('ftn-epk-'+p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),p.name+' — FTN EPK',p);eo.innerHTML='<div class="radio-link-preview"><span class="radio-kicker">FTN EPK Preview</span><h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.roles||'Caribbean creator')+' · '+escapeHtml(p.country||'Caribbean')+'</p><p>'+escapeHtml(p.bio)+'</p><p><strong>'+Object.keys(links).length+'</strong> professional links · <strong>'+(photos.length+epkPhotoMetadata.length)+'</strong> press-photo references/selections.</p><p class="workspace-field__hint">Saved on this device. The structured EPK record stores metadata and references, not the local press-photo image files.</p></div>';api.notify(r.message,'success');pulse();renderHistory();});});renderHistory();if(location.hash==='#ftn-epk'){setTimeout(function(){var target=document.getElementById('ftn-epk');if(target){target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});target.focus({preventScroll:true});}},120);}}});});})(window);
