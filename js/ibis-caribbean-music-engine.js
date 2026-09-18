// FTN Platform — shared, headless Caribbean music-generation engine (FTN Consolidation, 2026-09-18).
//
// Extracted verbatim (same math, same output, byte-for-byte identical generation for a given
// recipe) from js/ftn-fire.js's pure, DOM-free generation core, so FTN Fire's page keeps working
// completely unchanged while ibis (and any future consumer -- FTN DJ Tube, a future media tool)
// can call the exact same engine directly, with no DOM dependency at all. Nothing here reads or
// writes document/window UI state -- every function takes explicit arguments and returns a value.
//
// Caribbean styles supported (same as FTN Fire's own UI): soca, power-soca, reggae, dancehall,
// calypso, chutney, kompa, zouk, island-fusion. Real drum scheduling, bass generation, harmony and
// melody -- not a generic drum-machine pattern reused across styles (see schedule()'s per-style
// branches, ported unchanged).
(function (global) {
  'use strict';

  var ROOTS = { 'C': 130.81, 'C#': 138.59, 'D': 146.83, 'D#': 155.56, 'E': 164.81, 'F': 174.61, 'F#': 185, 'G': 196, 'G#': 207.65, 'A': 220, 'A#': 233.08, 'B': 246.94 };
  var STYLE_DEFAULT_BPM = { soca: 105, 'power-soca': 158, reggae: 86, dancehall: 96, calypso: 112, chutney: 138, kompa: 118, zouk: 110, 'island-fusion': 102 };

  function note(root, semitones) { return root * Math.pow(2, semitones / 12); }

  function noiseBuffer(ctx, seed) {
    var state = (seed >>> 0) || 1, b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .16), ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; d[i] = state / 2147483648 - 1; }
    return b;
  }

  function drum(ctx, dest, time, type, level, seed) {
    var g = ctx.createGain(); g.connect(dest);
    if (type === 'kick') {
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(145, time); o.frequency.exponentialRampToValueAtTime(46, time + .14);
      g.gain.setValueAtTime(level, time); g.gain.exponentialRampToValueAtTime(.001, time + .24);
      o.connect(g); o.start(time); o.stop(time + .25);
      return;
    }
    var n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, seed);
    var f = ctx.createBiquadFilter(); f.type = type === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = type === 'hat' ? 6500 : 1700; f.Q.value = type === 'hat' ? .6 : 1.2;
    g.gain.setValueAtTime(level, time); g.gain.exponentialRampToValueAtTime(.001, time + (type === 'hat' ? .045 : .13));
    n.connect(f); f.connect(g); n.start(time); n.stop(time + .16);
  }

  function tone(ctx, dest, time, duration, frequency, type, level, cutoff) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(frequency, time);
    f.type = 'lowpass'; f.frequency.value = cutoff || 1800;
    g.gain.setValueAtTime(.001, time); g.gain.exponentialRampToValueAtTime(level, time + .012); g.gain.exponentialRampToValueAtTime(.001, time + duration);
    o.connect(f); f.connect(g); g.connect(dest); o.start(time); o.stop(time + duration + .03);
  }

  // Pre-schedules an entire arrangement's worth of oscillator/buffer nodes onto `dest`, starting
  // at absolute time `start`. `stem` (optional) restricts scheduling to one layer ('drums',
  // 'bass', 'harmony', 'melody') for stem export. `skipSeconds` skips notes before that offset
  // (seek support). Returns the arrangement's total duration in seconds.
  function schedule(ctx, dest, spec, start, stem, skipSeconds) {
    var beat = 60 / spec.bpm, step = beat / 4, root = ROOTS[spec.key.split(' ')[0]] || 220, style = spec.style, instruments = spec.instruments, duration = spec.bars * 4 * beat, seed = +spec.seed || 2608;
    var include = function (name) { return !stem || stem === name; };
    var skipBefore = start + (skipSeconds || 0);
    for (var bar = 0; bar < spec.bars; bar++) {
      var intro = spec.arrangement === 'intro-drop' && bar === 0, breakdown = spec.arrangement === 'verse-chorus-break' && bar >= Math.floor(spec.bars * .75);
      if (include('drums')) for (var s = 0; s < 16; s++) {
        var swing = s % 2 ? step * (spec.swing || 0) / 100 : 0, t = start + (bar * 16 + s) * step + swing, accent = s % 4 === 0, kick = false, snare = false;
        if (t < skipBefore) continue;
        if (style === 'reggae') { kick = s === 8; snare = s === 8; }
        else if (style === 'dancehall') { kick = [0, 6, 10, 14].indexOf(s) >= 0; snare = [4, 7, 12, 15].indexOf(s) >= 0; }
        else if (style === 'kompa' || style === 'zouk') { kick = [0, 4, 8, 12].indexOf(s) >= 0; snare = [4, 12].indexOf(s) >= 0; }
        else if (style === 'calypso') { kick = [0, 8].indexOf(s) >= 0; snare = [3, 7, 11, 15].indexOf(s) >= 0; }
        else if (style === 'chutney') { kick = [0, 3, 6, 8, 11, 14].indexOf(s) >= 0; snare = [4, 12].indexOf(s) >= 0; }
        else { kick = [0, 4, 8, 12].indexOf(s) >= 0 || (style === 'power-soca' && s % 2 === 0); snare = [4, 12].indexOf(s) >= 0; }
        if (intro && s < 8) kick = false; if (breakdown && s % 4 !== 0) kick = false;
        if (kick) drum(ctx, dest, t, 'kick', .38 + .025 * spec.energy, seed + bar * 37 + s);
        if (snare) drum(ctx, dest, t, 'snare', .19 + .018 * spec.energy, seed + bar * 41 + s);
        if (instruments.indexOf('percussion') >= 0 && (s % 2 === 0 || ((seed + s + bar) % 5 === 0))) drum(ctx, dest, t + (s % 3 === 0 ? step * .12 : 0), 'hat', accent ? .10 : .065, seed + bar * 43 + s);
      }
      if (include('bass') && instruments.indexOf('bass') >= 0 && !intro) {
        var bassSeq = style === 'reggae' ? [0, 0, 7, 5] : style === 'soca' || style === 'power-soca' ? [0, 7, 5, 7] : style === 'calypso' ? [0, 4, 7, 9] : style === 'chutney' ? [0, 7, 3, 10] : [0, 5, 7, 3];
        for (var q = 0; q < 4; q++) { var bt0 = start + (bar * 4 + q) * beat; if (bt0 < skipBefore) continue; tone(ctx, dest, bt0, beat * .72, note(root / 2, bassSeq[(bar + q) % bassSeq.length]), style === 'dancehall' ? 'sine' : 'sawtooth', .14, style === 'dancehall' ? 260 : 420); }
      }
      if (include('harmony') && (instruments.indexOf('chords') >= 0 || instruments.indexOf('guitar-keys') >= 0)) {
        var chord = [0, 3, 7], offbeat = style === 'reggae' || style === 'kompa' || style === 'zouk' || instruments.indexOf('guitar-keys') >= 0;
        for (var c = 0; c < 4; c++) {
          var ct = start + (bar * 4 + c) * beat + (offbeat ? beat * .5 : 0); if (ct < skipBefore) continue;
          chord.forEach(function (n) { tone(ctx, dest, ct, beat * .19, note(root, n + (bar % 2 ? 5 : 0)), 'triangle', .038, 2200); });
          if (instruments.indexOf('dub-fx') >= 0 && c === 3) chord.forEach(function (n) { tone(ctx, dest, ct + beat * .36, beat * .18, note(root, n + (bar % 2 ? 5 : 0)), 'triangle', .018, 1500); });
        }
      }
      if (include('melody') && instruments.indexOf('steelpan') >= 0 && !breakdown) {
        var scale = [0, 3, 5, 7, 10, 12, 10, 7], base = start + bar * 4 * beat;
        for (var m = 0; m < 8; m++) { var mt = base + m * beat * .5; if (mt < skipBefore) continue; if ((seed + bar + m) % 4 !== 0) tone(ctx, dest, mt, beat * .28, note(root * 2, scale[(m + bar) % scale.length]), 'sine', .075, 4800); }
      }
      if (include('melody') && instruments.indexOf('brass') >= 0 && !intro) {
        for (var br = 0; br < 2; br++) { var bt = start + (bar * 4 + br * 2 + 1) * beat; if (bt < skipBefore) continue; tone(ctx, dest, bt, beat * .38, note(root * 2, br ? 7 : 12), 'sawtooth', .055, 3100); }
      }
    }
    return duration;
  }

  function outputGain(ctx) {
    var compressor = ctx.createDynamicsCompressor(), master = ctx.createGain();
    master.gain.value = .72; master.connect(compressor); compressor.connect(ctx.destination);
    return master;
  }

  function wav(buffer) {
    var channels = buffer.numberOfChannels, length = buffer.length * channels * 2 + 44, out = new ArrayBuffer(length), v = new DataView(out), pos = 0;
    function str(s) { for (var i = 0; i < s.length; i++) v.setUint8(pos++, s.charCodeAt(i)); }
    function u16(x) { v.setUint16(pos, x, true); pos += 2; }
    function u32(x) { v.setUint32(pos, x, true); pos += 4; }
    str('RIFF'); u32(length - 8); str('WAVEfmt '); u32(16); u16(1); u16(channels); u32(buffer.sampleRate); u32(buffer.sampleRate * channels * 2); u16(channels * 2); u16(16); str('data'); u32(length - 44);
    for (var i = 0; i < buffer.length; i++) for (var c = 0; c < channels; c++) { var x = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i])); v.setInt16(pos, x < 0 ? x * 32768 : x * 32767, true); pos += 2; }
    return out;
  }

  var CRC_TABLE = (function () { var table = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; })();
  function crc32(bytes) { var c = 0xffffffff; for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

  function zipStore(files) {
    var encoder = new TextEncoder(), locals = [], centrals = [], offset = 0;
    files.forEach(function (file) {
      var name = encoder.encode(file.name), data = file.data, crc = crc32(data), local = new Uint8Array(30 + name.length + data.length), v = new DataView(local.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, name.length, true);
      local.set(name, 30); local.set(data, 30 + name.length); locals.push(local);
      var central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
      central.set(name, 46); centrals.push(central); offset += local.length;
    });
    var centralSize = centrals.reduce(function (n, x) { return n + x.length; }, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    var total = offset + centralSize + end.length, out = new Uint8Array(total), p = 0;
    locals.concat(centrals).concat([end]).forEach(function (x) { out.set(x, p); p += x.length; });
    return out;
  }

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // Builds a complete, valid recipe from a partial one, applying the same defaults FTN Fire's own
  // UI uses (style default BPM, sensible fallbacks for everything else) -- so a caller (ibis) that
  // only knows "reggae, 90 BPM" gets a fully playable/exportable recipe back.
  function buildRecipe(input) {
    input = input || {};
    var style = STYLE_DEFAULT_BPM.hasOwnProperty(input.style) ? input.style : 'soca';
    var bpm = Math.max(60, Math.min(180, +input.bpm || STYLE_DEFAULT_BPM[style]));
    var instruments = Array.isArray(input.instruments) && input.instruments.length ? input.instruments : ['bass', 'chords', 'percussion'];
    return {
      schemaVersion: 3, engine: 'FTN Fire free on-device procedural sketch', status: 'LOCAL_DRAFT_READY',
      style: style, bpm: bpm, key: input.key || 'C', mood: input.mood || 'Joyful', energy: +input.energy || 3,
      bars: +input.bars || 8, arrangement: input.arrangement || 'straight', swing: +input.swing || 8,
      vibe: input.vibe || '', seed: +input.seed || 2608, instruments: instruments,
      plainLanguageDirection: input.plainLanguageDirection || ('Original ' + style + ' instrumental'),
      vocals: false, lyrics: false, artistImitation: false, provider: 'FTN local browser engine', providerCost: 0,
      durationMs: (+input.bars || 8) * 4 * (60 / bpm) * 1000, createdAt: new Date().toISOString(),
    };
  }

  // Renders a complete recipe to a real WAV ArrayBuffer via OfflineAudioContext -- no live audio
  // device needed, safe to call from a chat/orchestration context. Returns a Promise<ArrayBuffer>.
  async function renderWav(recipe) {
    var rate = 44100, length = Math.ceil(recipe.durationMs / 1000 * rate), ctx = new OfflineAudioContext(2, length, rate), master = outputGain(ctx);
    schedule(ctx, master, recipe, 0);
    var rendered = await ctx.startRendering();
    return wav(rendered);
  }

  // Renders a single named stem ('drums'|'bass'|'harmony'|'melody') to WAV bytes.
  async function renderStem(recipe, name) {
    var rate = 44100, length = Math.ceil(recipe.durationMs / 1000 * rate), ctx = new OfflineAudioContext(2, length, rate), master = outputGain(ctx);
    schedule(ctx, master, recipe, 0, name);
    return new Uint8Array(wav(await ctx.startRendering()));
  }

  // Renders all four stems (drums/bass/harmony/melody) plus the recipe JSON as one ZIP archive.
  // `onProgress(name)` (optional) is called before each stem starts rendering. Returns a
  // Promise<Uint8Array> (the ZIP bytes).
  async function renderStemsZip(recipe, onProgress) {
    var names = ['drums', 'bass', 'harmony', 'melody'], files = [];
    for (var i = 0; i < names.length; i++) {
      if (onProgress) onProgress(names[i]);
      files.push({ name: 'ftn-fire-' + names[i] + '.wav', data: await renderStem(recipe, names[i]) });
    }
    files.push({ name: 'ftn-fire-recipe.json', data: new TextEncoder().encode(JSON.stringify(recipe, null, 2)) });
    return zipStore(files);
  }

  global.FTN = global.FTN || {};
  global.FTN.CaribbeanMusicEngine = {
    STYLES: Object.keys(STYLE_DEFAULT_BPM),
    STYLE_DEFAULT_BPM: STYLE_DEFAULT_BPM,
    ROOTS: ROOTS,
    buildRecipe: buildRecipe,
    schedule: schedule,
    outputGain: outputGain,
    wav: wav,
    zipStore: zipStore,
    hash: hash,
    renderWav: renderWav,
    renderStem: renderStem,
    renderStemsZip: renderStemsZip,
  };
})(typeof window !== 'undefined' ? window : globalThis);
