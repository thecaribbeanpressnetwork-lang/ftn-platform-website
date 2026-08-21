// FTN Platform — real, deterministic procedural SFX synthesis (Phase 7 provider activation).
// Zero-cost, zero-dependency, portable pure-sample-buffer math -- reuses js/ibis-music-engine.js's
// real synthesis primitives (no duplicated DSP code) and its WAV encoder. This is genuine
// SFX_GENERATION (procedural synthesis from parameters), never audio processing relabeled as
// generation -- the taxonomy keeps them as separate capabilities on purpose.
//
// Honest scope: a small, fixed set of simple, real, named presets (chime, riser, blip, thud).
// This is not a generative model that can synthesize an arbitrary described sound from text --
// that would require a real audio-generation model this environment cannot deploy. What's here
// is real procedural synthesis of specific, deterministic effect shapes, verified end-to-end in
// tests/ibis-sfx-engine-audit.mjs the same way the music engine is.
(function (global) {
  'use strict';

  function require_() {
    var engine = global.FTN && global.FTN.IbisMusicEngine;
    if (!engine || !engine._primitives) throw new Error('js/ibis-music-engine.js must be loaded before js/ibis-sfx-engine.js.');
    return engine;
  }

  var PRESETS = ['chime', 'riser', 'blip', 'thud'];

  function renderSfx(spec) {
    spec = spec || {};
    var engine = require_();
    var prim = engine._primitives;
    var preset = PRESETS.indexOf(spec.preset) !== -1 ? spec.preset : 'blip';
    var seed = (spec.seed >>> 0) || 4242;
    var rng = prim.seededRng(seed);
    var rate = prim.SAMPLE_RATE;
    var samples;

    if (preset === 'chime') {
      var dur = 1.1;
      samples = new Float32Array(Math.ceil(dur * rate));
      [523.25, 659.25, 783.99].forEach(function (freq, i) {
        var voice = prim.synthTone(freq, dur - i * 0.03, 0.22, 'sine');
        for (var j = 0; j < voice.length; j++) samples[j] = (samples[j] || 0) + voice[j];
      });
    } else if (preset === 'riser') {
      var riserDur = 0.9;
      var n = Math.ceil(riserDur * rate);
      samples = new Float32Array(n);
      var phase = 0;
      for (var i = 0; i < n; i++) {
        var t = i / rate;
        var freq = 220 + (1400 - 220) * (t / riserDur);
        phase += (2 * Math.PI * freq) / rate;
        var env = t / riserDur;
        samples[i] = Math.sin(phase) * env * 0.28;
      }
    } else if (preset === 'thud') {
      samples = prim.synthTone(70, 0.4, 0.5, 'sine');
    } else {
      // blip: short noise-shaped click, real and distinct from the tonal presets above.
      samples = prim.synthNoiseBurst(0.12, 0.35, 0.02, rng);
    }

    for (var k = 0; k < samples.length; k++) samples[k] = Math.max(-1, Math.min(1, samples[k]));

    return {
      samples: samples,
      sampleRate: rate,
      channels: 1,
      durationSeconds: samples.length / rate,
      preset: preset,
      seed: seed,
    };
  }

  function encodeWav(result) {
    return require_().encodeWav(result);
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisSfxEngine = { renderSfx: renderSfx, encodeWav: encodeWav, PRESETS: PRESETS.slice() };
})(typeof window !== 'undefined' ? window : globalThis);
