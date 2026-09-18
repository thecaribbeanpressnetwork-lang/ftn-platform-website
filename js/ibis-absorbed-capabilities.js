// FTN Platform — ibis's recognition + execution of the capabilities absorbed from FTN Fire, FTN
// DAW and FTN EPK (FTN Consolidation, 2026-09-18).
//
// This is the concrete fix for the exact gap the consolidation review flagged: "Make me a reggae
// instrumental" previously fell into js/ibis-ai-workspace.js's renderMedia() keyword trigger (it
// matches /reggae/) and searched YouTube for reggae videos instead of GENERATING one -- a
// discovery capability silently swallowing a generation request. This module runs BEFORE that
// trigger and recognizes the user's OUTCOME (generate music / process audio / build a press kit),
// not a historical product name -- there is no "open FTN Fire" branch here, only real execution
// via the shared, headless engines (js/ibis-caribbean-music-engine.js, js/ftn-audio-dsp-engine.js,
// js/ftn-epk-schema.js) or an honest, in-place hand-off when the request needs something this
// module can't do inline (e.g. a real uploaded file for audio processing).
//
// Contract: detectAndHandle(text, out, helpers) returns a Promise<boolean> -- true means this
// module fully handled the request (the caller must not fall through to any other branch), false
// means it recognized nothing and the caller should continue its own routing exactly as before.
// `out` is the ibis chat message DOM node to render into. `helpers` is {esc, loadScript} from the
// caller, so this module never re-implements HTML-escaping or script-loading.
(function (global) {
  'use strict';

  var MUSIC_GENERATION_RE = /\b(make|create|generate|produce|build|write)\b(?:(?!\b(?:epk|press kit)\b).)*\b(instrumental|riddim|beat|beats|backing track)\b/i;
  var AUDIO_PROCESSING_RE = /\b(clean up|clean|improve|process|remix|fix|master|enhance|clearer|export)\b(?:(?!\b(?:epk|press kit|instrumental)\b).)*\b(audio|mix|song|track|vocal|vocals|wav|recording)\b/i;
  var EPK_RE = /\b(epk|press kit|electronic press kit)\b/i;
  // "Where is FTN DAW?" / "What happened to FTN Fire?" / "Where did Kaiso go?" -- must be checked
  // BEFORE any discovery trigger (a bare product-name query like "Where is Kaiso?" would otherwise
  // be swallowed by ibis-ai-workspace.js's media-discovery keyword match on "kaiso"). Answers
  // honestly from the real registry (js/product-registry.js's absorbedInfo()), never claims a
  // retired product "vanished", and never re-suggests it as if it were still a separate product.
  var WHERE_DID_RE = /\b(where\s+(?:is|did|has|are)|what\s+happened\s+to|whatever\s+happened\s+to)\b/i;
  var KNOWN_RETIRED_NAMES = ['ftn daw', 'daw', 'ftn fire', 'fire', 'ftn learn', 'learn', 'ftn kaiso', 'kaiso', 'ftn parliament', 'parliament', 'ftn riddim', 'riddim', 'scenario workspace', 'ftn epk', 'epk', 'ftn tv', 'tv', 'ftn display', 'display mode', 'ftn picks', 'top picks'];

  var CARIBBEAN_STYLES = ['power-soca', 'soca', 'reggae', 'dancehall', 'calypso', 'chutney', 'kompa', 'zouk', 'island-fusion'];

  function detectStyle(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < CARIBBEAN_STYLES.length; i++) if (lower.indexOf(CARIBBEAN_STYLES[i]) !== -1) return CARIBBEAN_STYLES[i];
    return null;
  }
  function detectBpm(text) { var m = text.match(/\b(6\d|[7-9]\d|1[0-7]\d|180)\s*bpm\b/i); return m ? +m[1] : null; }
  function detectBars(text) { var m = text.match(/\b(4|8|12|16|24|32)\s*bars?\b/i); return m ? +m[1] : null; }
  function detectMood(text) {
    var moods = ['dark', 'joyful', 'road-ready', 'sensual', 'reflective', 'triumphant'], lower = text.toLowerCase();
    for (var i = 0; i < moods.length; i++) if (lower.indexOf(moods[i]) !== -1) return moods[i][0].toUpperCase() + moods[i].slice(1);
    return null;
  }

  async function ensureEngine(name, src, helpers) {
    if (global.FTN && global.FTN[name]) return global.FTN[name];
    await helpers.loadScript(src);
    return global.FTN[name];
  }

  // --- MUSIC_GENERATION ---------------------------------------------------------------------
  async function handleMusicGeneration(text, out, helpers) {
    var esc = helpers.esc;
    out.innerHTML = '<span class="workspace-kicker">MUSIC_GENERATION · FTN-owned Caribbean engine</span><p>Building your instrumental on-device — no external music-generation provider is used, no cost, nothing uploaded.</p>';
    var Engine = await ensureEngine('CaribbeanMusicEngine', '/js/ibis-caribbean-music-engine.js', helpers);
    if (!Engine) { out.innerHTML += '<p>The on-device Caribbean music engine could not load in this browser.</p>'; return; }
    var style = detectStyle(text);
    var recipe = Engine.buildRecipe({
      style: style || 'soca', bpm: detectBpm(text), bars: detectBars(text) || 8,
      mood: detectMood(text), instruments: ['bass', 'chords', 'percussion'],
      plainLanguageDirection: text,
    });
    var statusEl = document.createElement('p'); statusEl.textContent = 'Rendering ' + recipe.style.replace(/-/g, ' ') + ' at ' + recipe.bpm + ' BPM…';
    out.appendChild(statusEl);
    try {
      var wavBlob = new Blob([await Engine.renderWav(recipe)], { type: 'audio/wav' });
      var url = URL.createObjectURL(wavBlob);
      var audio = document.createElement('audio'); audio.controls = true; audio.src = url; audio.style.width = '100%';
      var dl = document.createElement('a'); dl.className = 'btn btn-primary'; dl.href = url; dl.download = 'ibis-' + recipe.style + '-' + recipe.bpm + 'bpm.wav'; dl.textContent = 'Download WAV';
      var stemsBtn = document.createElement('button'); stemsBtn.type = 'button'; stemsBtn.className = 'btn btn-outline'; stemsBtn.textContent = 'Export 4 editable stems (ZIP)';
      stemsBtn.onclick = async function () {
        stemsBtn.disabled = true; stemsBtn.textContent = 'Rendering stems…';
        var zip = await Engine.renderStemsZip(recipe, function (name) { stemsBtn.textContent = 'Rendering ' + name + '…'; });
        var zipUrl = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
        var zipLink = document.createElement('a'); zipLink.href = zipUrl; zipLink.download = 'ibis-' + recipe.style + '-stems.zip'; zipLink.click();
        setTimeout(function () { URL.revokeObjectURL(zipUrl); }, 1500);
        stemsBtn.textContent = 'Export 4 editable stems (ZIP)'; stemsBtn.disabled = false;
      };
      statusEl.textContent = 'Original ' + recipe.style.replace(/-/g, ' ') + ' instrumental sketch ready — ' + recipe.bars + ' bars, ' + recipe.bpm + ' BPM, ' + recipe.key + '. No vocals, no artist imitation.';
      var actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '10px'; actions.style.marginTop = '10px'; actions.style.flexWrap = 'wrap';
      actions.appendChild(dl); actions.appendChild(stemsBtn);
      out.appendChild(audio); out.appendChild(actions);
      var note = document.createElement('p'); note.className = 'workspace-muted';
      note.innerHTML = 'This is FTN\'s own free, on-device procedural engine (the same engine behind <a href="/riddim/fire/">FTN Fire</a>) -- not a claim that a foundation model generated this audio. Want deeper hands-on editing? <a href="/riddim/fire/">Open the full Fire workspace</a> or <a href="/riddim/daw/">FTN DAW</a>.';
      out.appendChild(note);
    } catch (e) {
      out.innerHTML += '<p>Rendering failed in this browser: ' + esc(e.message || String(e)) + '</p>';
    }
  }

  // --- AUDIO_PROCESSING ----------------------------------------------------------------------
  async function handleAudioProcessing(text, out, helpers) {
    var esc = helpers.esc;
    out.innerHTML = '<span class="workspace-kicker">AUDIO_PROCESSING · FTN-owned browser DSP</span><p>Upload the audio you want processed. It is decoded and processed entirely on this device -- nothing is uploaded to a server.</p>';
    var fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'audio/*';
    var status = document.createElement('p'); status.className = 'workspace-muted'; status.textContent = 'No file selected yet.';
    out.appendChild(fileInput); out.appendChild(status);
    fileInput.addEventListener('change', async function () {
      var file = fileInput.files && fileInput.files[0]; if (!file) return;
      status.textContent = 'Decoding ' + file.name + '…';
      try {
        var Engine = await ensureEngine('AudioDSP', '/js/ftn-audio-dsp-engine.js', helpers);
        var Ctx = global.AudioContext || global.webkitAudioContext, ctx = new Ctx();
        var buffer = await ctx.decodeAudioData(await file.arrayBuffer());
        status.textContent = 'Processing (gentle low-cut, presence lift, de-harsh) and rendering WAV…';
        var settings = Engine.cleanupPreset();
        var wavBlob = Engine.wavFromBuffer(await Engine.renderProcessedBuffer(buffer, settings));
        var url = URL.createObjectURL(wavBlob);
        var audio = document.createElement('audio'); audio.controls = true; audio.src = url; audio.style.width = '100%';
        var dl = document.createElement('a'); dl.className = 'btn btn-primary'; dl.href = url; dl.download = (file.name.replace(/\.[^.]+$/, '') || 'ibis-audio') + '-processed.wav'; dl.textContent = 'Download processed WAV';
        status.textContent = 'Processed on-device: low-cut at ' + settings.lowCut + ' Hz, presence and de-harsh applied. Audio never left this browser.';
        out.appendChild(audio); out.appendChild(dl);
        var note = document.createElement('p'); note.className = 'workspace-muted';
        note.innerHTML = 'This is the same real WebAudio processing chain behind <a href="/riddim/daw/">FTN DAW</a> -- for full manual control over each EQ stage, tempo and MP3 export, <a href="/riddim/daw/">open FTN DAW</a>.';
        out.appendChild(note);
      } catch (e) { status.textContent = 'Could not process that file: ' + esc(e.message || String(e)); }
    });
  }

  // --- EPK_GENERATION --------------------------------------------------------------------------
  async function handleEpkGeneration(text, out, helpers) {
    var esc = helpers.esc;
    var Schema = await ensureEngine('EpkSchema', '/js/ftn-epk-schema.js', helpers);
    out.innerHTML = '<span class="workspace-kicker">EPK_GENERATION</span><p>Build a reusable FTN EPK (Electronic Press Kit) record. Your details stay on this device until you choose to export or submit them.</p>' +
      '<form class="ibis-epk-form"><div class="workspace-field"><label>Creator / artist name</label><input name="name" required></div>' +
      '<div class="workspace-field"><label>Professional email</label><input name="email" type="email" required></div>' +
      '<div class="workspace-field"><label>Country / territory</label><input name="country" placeholder="Trinidad and Tobago"></div>' +
      '<div class="workspace-field"><label>Genres / roles</label><input name="roles" placeholder="Reggae artist, songwriter"></div>' +
      '<div class="workspace-field"><label>Short professional bio</label><textarea name="bio" required></textarea></div>' +
      '<button type="submit" class="btn btn-primary">Build FTN EPK</button></form><div class="ibis-epk-output"></div>';
    var form = out.querySelector('.ibis-epk-form'), resultBox = out.querySelector('.ibis-epk-output');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var record = Schema.buildRecord({ name: form.name.value, email: form.email.value, country: form.country.value, roles: form.roles.value, bio: form.bio.value });
      var errors = Schema.validate(record);
      if (errors.length) { resultBox.innerHTML = '<p>' + errors.map(esc).join(' ') + '</p>'; return; }
      var json = Schema.toPortableJSON(record);
      var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      resultBox.innerHTML = '<p><strong>' + esc(record.name) + '</strong> — ' + esc(record.roles || 'Caribbean creator') + '</p><p>' + esc(record.bio) + '</p>' +
        '<a class="btn btn-outline" download="ftn-epk-' + esc(record.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '.json" href="' + url + '">Download portable EPK (JSON)</a> ' +
        '<a class="btn btn-outline" href="/radio/#ftn-epk">Add press links and photos in the full EPK workspace &rarr;</a>';
    });
  }

  // --- "Where did X go?" -----------------------------------------------------------------------
  function findMentionedRetiredName(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < KNOWN_RETIRED_NAMES.length; i++) if (lower.indexOf(KNOWN_RETIRED_NAMES[i]) !== -1) return KNOWN_RETIRED_NAMES[i];
    return null;
  }
  function handleWhereDid(text, out, helpers) {
    if (!WHERE_DID_RE.test(text)) return false;
    var esc = helpers.esc;
    var name = findMentionedRetiredName(text);
    var Registry = global.FTN && global.FTN.ProductRegistry;
    var info = Registry && name ? Registry.absorbedInfo(name) : null;
    if (!info) return false;
    var parentName = info.absorbedIntoProduct ? info.absorbedIntoProduct.name : info.absorbedIntoId;
    var parentRoute = info.absorbedIntoProduct ? info.absorbedIntoProduct.route : '/';
    out.innerHTML = '<span class="workspace-kicker">FTN Consolidation</span>' +
      '<p><strong>' + esc(info.product.name) + '</strong> is not gone -- it stopped being a separate standalone product and is now a real capability of <strong>' + esc(parentName) + '</strong>.</p>' +
      '<p>' + esc(info.product.purposeStatement || info.product.description) + '</p>' +
      '<p><a class="btn btn-primary" href="' + esc(parentRoute) + '">Open ' + esc(parentName) + '</a> <a class="btn btn-outline" href="' + esc(info.route) + '">Its original route still works: ' + esc(info.route) + '</a></p>';
    return true;
  }

  async function detectAndHandle(text, out, helpers) {
    if (handleWhereDid(text, out, helpers)) return true;
    if (EPK_RE.test(text)) { await handleEpkGeneration(text, out, helpers); return true; }
    if (MUSIC_GENERATION_RE.test(text)) { await handleMusicGeneration(text, out, helpers); return true; }
    if (AUDIO_PROCESSING_RE.test(text)) { await handleAudioProcessing(text, out, helpers); return true; }
    return false;
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisAbsorbedCapabilities = { detectAndHandle: detectAndHandle };
})(typeof window !== 'undefined' ? window : globalThis);
