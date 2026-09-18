// FTN Platform — shared, headless browser audio-processing engine (FTN Consolidation, 2026-09-18).
//
// Extracted from js/ftn-daw.js's WebAudio DSP chain (highpass/lowshelf/peaking/peaking/highshelf/
// lowpass -- low cut, low shelf, low-mid parametric, high-mid parametric, high shelf, high cut --
// plus gain and tempo/playback-rate) and its WAV/MP3 encoders. No DOM dependency: every function
// takes an explicit AudioContext/AudioBuffer/settings object and returns a value, so FTN DAW's own
// live-playback page, ibis's AUDIO_PROCESSING capability, and any future consumer (FTN DJ Tube, a
// media tool) all run the exact same math instead of each keeping their own copy.
//
// Bonus consolidation found while extracting (not just a copy-paste move): FTN DAW's live-playback
// path (makeNodes/updateNodes, real-time AudioContext) and its offline WAV/MP3 export path each
// built an equivalent 6-stage filter chain independently, by hand, in two different functions that
// could silently drift from each other. buildFilterChain() below is the ONE place that chain is
// built now, for either a real-time or an OfflineAudioContext (both are BaseAudioContext).
(function (global) {
  'use strict';

  function db(v) { return Math.pow(10, v / 20); }
  function khz(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2).replace(/\.00$/, '') + ' kHz' : Math.round(v) + ' Hz'; }

  // Default (no-op) settings -- every stage neutral, tempo 100%. The same shape FTN DAW's own
  // neutralSettings() produces.
  function neutralSettings() {
    return { gain: 0, tempo: 100, lowCut: 20, highCut: 20000, lowFreq: 180, low: 0, lowMidFreq: 500, lowMid: 0, lowMidQ: .9, highMidFreq: 2500, highMid: 0, highMidQ: .9, highFreq: 6000, high: 0 };
  }

  // A conservative "clean up my audio" preset (gentle low-cut to remove rumble, a small presence
  // lift, gentle de-harshing) -- used when a caller (ibis) asks for audio cleanup without
  // specifying exact EQ values itself. Not mastering, not a claim of professional mixing --
  // exactly the same category of adjustable mix control FTN DAW's own remix presets already are.
  function cleanupPreset() {
    return Object.assign(neutralSettings(), { lowCut: 80, lowMid: -1, highMid: 1.5, high: 0.5 });
  }

  // Builds the real 6-stage filter chain (highpass -> lowshelf -> peaking -> peaking -> highshelf
  // -> lowpass -> gain) on `ctx` (a live AudioContext OR an OfflineAudioContext) per `settings`,
  // and connects it to `destination`. Returns the chain's INPUT node (connect your source to it).
  function buildFilterChain(ctx, settings, destination) {
    var hp = ctx.createBiquadFilter(), lo = ctx.createBiquadFilter(), lm = ctx.createBiquadFilter(), hm = ctx.createBiquadFilter(), hi = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = settings.lowCut;
    lo.type = 'lowshelf'; lo.frequency.value = settings.lowFreq; lo.gain.value = settings.low;
    lm.type = 'peaking'; lm.frequency.value = settings.lowMidFreq; lm.Q.value = settings.lowMidQ; lm.gain.value = settings.lowMid;
    hm.type = 'peaking'; hm.frequency.value = settings.highMidFreq; hm.Q.value = settings.highMidQ; hm.gain.value = settings.highMid;
    hi.type = 'highshelf'; hi.frequency.value = settings.highFreq; hi.gain.value = settings.high;
    lp.type = 'lowpass'; lp.frequency.value = settings.highCut;
    g.gain.value = db(settings.gain);
    hp.connect(lo); lo.connect(lm); lm.connect(hm); hm.connect(hi); hi.connect(lp); lp.connect(g); g.connect(destination);
    return { input: hp, nodes: { hp: hp, lo: lo, lm: lm, hm: hm, hi: hi, lp: lp, g: g } };
  }

  function wavFromBuffer(b) {
    var ch = b.numberOfChannels, rate = b.sampleRate, ab = new ArrayBuffer(44 + b.length * ch * 2), v = new DataView(ab); var o = 0;
    var w = function (s) { for (var i = 0; i < s.length; i++) v.setUint8(o++, s.charCodeAt(i)); };
    w('RIFF'); v.setUint32(o, 36 + b.length * ch * 2, true); o += 4; w('WAVEfmt '); v.setUint32(o, 16, true); o += 4;
    v.setUint16(o, 1, true); o += 2; v.setUint16(o, ch, true); o += 2; v.setUint32(o, rate, true); o += 4;
    v.setUint32(o, rate * ch * 2, true); o += 4; v.setUint16(o, ch * 2, true); o += 2; v.setUint16(o, 16, true); o += 2;
    w('data'); v.setUint32(o, b.length * ch * 2, true); o += 4;
    for (var i = 0; i < b.length; i++) for (var c = 0; c < ch; c++) { var s = Math.max(-1, Math.min(1, b.getChannelData(c)[i])); v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true); o += 2; }
    return new Blob([ab], { type: 'audio/wav' });
  }

  // MP3 encoding needs js/vendor/lame.min.js -- loaded on demand (not at module load) so pages
  // that never export MP3 never pay its parse cost. Same lazy pattern FTN DAW's own page used.
  var lameLoadPromise = null;
  function loadLameEncoder() {
    if (global.lamejs && global.lamejs.Mp3Encoder) return Promise.resolve();
    if (lameLoadPromise) return lameLoadPromise;
    lameLoadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = '/js/vendor/lame.min.js';
      s.onload = function () { resolve(); }; s.onerror = function () { lameLoadPromise = null; reject(new Error('The local MP3 encoder could not be loaded.')); };
      document.head.appendChild(s);
    });
    return lameLoadPromise;
  }

  function mp3FromBuffer(b) {
    if (!global.lamejs || !global.lamejs.Mp3Encoder) throw new Error('The local MP3 encoder did not load.');
    var channels = Math.min(2, b.numberOfChannels), encoder = new global.lamejs.Mp3Encoder(channels, b.sampleRate, 192), parts = [], block = 1152;
    var left = b.getChannelData(0), right = channels === 2 ? b.getChannelData(1) : left;
    var to16 = function (v) { var a = new Int16Array(v.length); for (var i = 0; i < v.length; i++) { var n = Math.max(-1, Math.min(1, v[i])); a[i] = n < 0 ? n * 32768 : n * 32767; } return a; };
    var l = to16(left), r = channels === 2 ? to16(right) : null;
    for (var i = 0; i < l.length; i += block) {
      var out = channels === 2 ? encoder.encodeBuffer(l.subarray(i, i + block), r.subarray(i, i + block)) : encoder.encodeBuffer(l.subarray(i, i + block));
      if (out.length) parts.push(new Int8Array(out));
    }
    var end = encoder.flush(); if (end.length) parts.push(new Int8Array(end));
    return new Blob(parts, { type: 'audio/mpeg' });
  }

  // Headless: renders `buffer` through the filter chain at `settings.tempo` playback rate via
  // OfflineAudioContext, returning a Promise<AudioBuffer> of the processed result. This is the one
  // function both FTN DAW's renderWav/renderMp3 AND ibis's AUDIO_PROCESSING capability call --
  // same processing, whichever format the caller ultimately encodes it to.
  async function renderProcessedBuffer(buffer, settings) {
    var rate = (settings.tempo || 100) / 100;
    var Offline = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var oc = new Offline(buffer.numberOfChannels, Math.ceil(buffer.length / rate), buffer.sampleRate);
    var src = oc.createBufferSource(); src.buffer = buffer; src.playbackRate.value = rate;
    var chain = buildFilterChain(oc, settings, oc.destination);
    src.connect(chain.input); src.start();
    return oc.startRendering();
  }

  // Convenience: render + encode to WAV/MP3 blob in one call.
  async function renderToWav(buffer, settings) { return wavFromBuffer(await renderProcessedBuffer(buffer, settings)); }
  async function renderToMp3(buffer, settings) { await loadLameEncoder(); return mp3FromBuffer(await renderProcessedBuffer(buffer, settings)); }

  global.FTN = global.FTN || {};
  global.FTN.AudioDSP = {
    db: db, khz: khz,
    neutralSettings: neutralSettings, cleanupPreset: cleanupPreset,
    buildFilterChain: buildFilterChain,
    wavFromBuffer: wavFromBuffer, mp3FromBuffer: mp3FromBuffer, loadLameEncoder: loadLameEncoder,
    renderProcessedBuffer: renderProcessedBuffer, renderToWav: renderToWav, renderToMp3: renderToMp3,
  };
})(typeof window !== 'undefined' ? window : globalThis);
