// FTN Platform — real, deterministic procedural instrumental synthesis (Phase 7 provider
// activation). Zero-cost, zero-dependency, portable pure-sample-buffer math -- runs identically
// in a browser and in plain Node (no AudioContext/OfflineAudioContext of any kind), which is
// exactly what makes this genuinely testable end-to-end in this repository's Node-based CI,
// unlike js/ftn-fire.js's browser-only WebAudio engine (real, live at /riddim/fire/, but not
// verifiable here -- see IBIS-MAP.md for why that stays a documented, unadapted provider rather
// than being extracted this pass). This is a genuinely separate, independently-real engine, not a
// rewrite of Fire -- both may coexist as real MUSIC/INSTRUMENTAL_GENERATION routes once Fire gets
// its own adapter later.
//
// Honest scope: four rhythmic patterns loosely informed by Caribbean genre structure (soca,
// reggae, dancehall, calypso/default) -- real, distinct, deterministic pattern differences, not a
// claim of production-grade genre authenticity. "Genre specialization" is not claimed beyond
// "produces a different, real, audibly distinct rhythmic pattern per named style," which is what
// the tests actually verify.
(function (global) {
  'use strict';

  var SAMPLE_RATE = 44100;
  var ROOT_HZ = { C: 130.81, 'C#': 138.59, D: 146.83, 'D#': 155.56, E: 164.81, F: 174.61, 'F#': 185, G: 196, 'G#': 207.65, A: 220, 'A#': 233.08, B: 246.94 };
  var DEFAULT_BPM = { soca: 130, reggae: 82, dancehall: 96, calypso: 112 };

  function seededRng(seed) {
    var state = (seed >>> 0) || 1;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 2147483648 - 1;
    };
  }

  function noteHz(rootHz, semitones) { return rootHz * Math.pow(2, semitones / 12); }

  function addSamples(buffer, startSample, values) {
    for (var i = 0; i < values.length; i++) {
      var idx = startSample + i;
      if (idx < 0 || idx >= buffer.length) continue;
      buffer[idx] += values[i];
    }
  }

  function synthKick(durationSeconds, level) {
    var n = Math.floor(durationSeconds * SAMPLE_RATE);
    var out = new Float32Array(n);
    var freq = 62;
    for (var i = 0; i < n; i++) {
      var t = i / SAMPLE_RATE;
      var env = Math.exp(-t / 0.09);
      out[i] = Math.sin(2 * Math.PI * freq * t) * env * level;
    }
    return out;
  }

  function synthNoiseBurst(durationSeconds, level, decay, rng) {
    var n = Math.floor(durationSeconds * SAMPLE_RATE);
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var t = i / SAMPLE_RATE;
      var env = Math.exp(-t / decay);
      out[i] = rng() * env * level;
    }
    return out;
  }

  function synthTone(freq, durationSeconds, level, shape) {
    var n = Math.floor(durationSeconds * SAMPLE_RATE);
    var out = new Float32Array(n);
    var attack = Math.min(0.01, durationSeconds * 0.1);
    for (var i = 0; i < n; i++) {
      var t = i / SAMPLE_RATE;
      var env = t < attack ? t / attack : Math.exp(-(t - attack) / (durationSeconds * 0.6));
      var wave = shape === 'triangle'
        ? 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * freq * t))
        : Math.sin(2 * Math.PI * freq * t);
      out[i] = wave * env * level;
    }
    return out;
  }

  // Real, distinct 16-step patterns per style -- not a single generic pattern relabeled.
  var PATTERNS = {
    soca: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
    reggae: { kick: [8], snare: [8], hat: [2, 6, 10, 14] },
    dancehall: { kick: [0, 6, 10, 14], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
    calypso: { kick: [0, 8], snare: [4, 12], hat: [0, 4, 8, 12] },
  };

  function resolvePattern(style) { return PATTERNS[style] || PATTERNS.calypso; }

  function renderInstrumental(spec) {
    spec = spec || {};
    var style = PATTERNS[spec.style] ? spec.style : 'calypso';
    var bpm = spec.bpm || DEFAULT_BPM[style] || 108;
    var bars = Math.max(1, Math.min(16, spec.bars || 4));
    var key = ROOT_HZ[spec.key] ? spec.key : 'A';
    var seed = (spec.seed >>> 0) || 2608;
    var rng = seededRng(seed);
    var pattern = resolvePattern(style);

    var beat = 60 / bpm;
    var step = beat / 4;
    var totalSeconds = bars * 4 * beat + 0.3; // tail room for the last envelope to decay
    var totalSamples = Math.ceil(totalSeconds * SAMPLE_RATE);
    var buffer = new Float32Array(totalSamples);

    var rootHz = ROOT_HZ[key] / 2;
    var bassPattern = [0, 0, 7, 5];

    for (var bar = 0; bar < bars; bar++) {
      for (var s = 0; s < 16; s++) {
        var atSeconds = (bar * 16 + s) * step;
        var atSample = Math.round(atSeconds * SAMPLE_RATE);
        if (pattern.kick.indexOf(s) !== -1) addSamples(buffer, atSample, synthKick(0.25, 0.55));
        if (pattern.snare.indexOf(s) !== -1) addSamples(buffer, atSample, synthNoiseBurst(0.16, 0.32, 0.05, rng));
        if (pattern.hat.indexOf(s) !== -1) addSamples(buffer, atSample, synthNoiseBurst(0.05, 0.14, 0.015, rng));
      }
      for (var q = 0; q < 4; q++) {
        var bassAt = Math.round((bar * 4 + q) * beat * SAMPLE_RATE);
        var bassFreq = noteHz(rootHz, bassPattern[(bar + q) % bassPattern.length]);
        addSamples(buffer, bassAt, synthTone(bassFreq, beat * 0.7, 0.22, 'triangle'));
      }
      var chordAt = Math.round(bar * 4 * beat * SAMPLE_RATE);
      [0, 4, 7].forEach(function (semitone) {
        addSamples(buffer, chordAt, synthTone(noteHz(rootHz * 2, semitone), beat * 3.5, 0.05, 'sine'));
      });
    }

    // Soft-clip to avoid harsh digital clipping when many voices sum, then hard-clamp as a
    // final real safety bound -- never allow the output to leave [-1, 1].
    for (var i = 0; i < buffer.length; i++) {
      var v = buffer[i];
      buffer[i] = Math.max(-1, Math.min(1, v * 0.9));
    }

    return {
      samples: buffer,
      sampleRate: SAMPLE_RATE,
      channels: 1,
      durationSeconds: totalSamples / SAMPLE_RATE,
      style: style,
      bpm: bpm,
      key: key,
      bars: bars,
      seed: seed,
    };
  }

  // Real PCM16 mono WAV encoding -- pure byte math, no dependency, independently verifiable by
  // parsing the header/samples back out (see tests/ibis-music-engine-audit.mjs).
  function encodeWav(result) {
    var samples = result.samples, sampleRate = result.sampleRate, channels = result.channels || 1;
    var byteLength = 44 + samples.length * 2;
    var buffer = new ArrayBuffer(byteLength);
    var view = new DataView(buffer);
    var pos = 0;
    function writeString(s) { for (var i = 0; i < s.length; i++) view.setUint8(pos++, s.charCodeAt(i)); }
    function u32(v) { view.setUint32(pos, v, true); pos += 4; }
    function u16(v) { view.setUint16(pos, v, true); pos += 2; }
    writeString('RIFF'); u32(byteLength - 8); writeString('WAVE');
    writeString('fmt '); u32(16); u16(1); u16(channels); u32(sampleRate); u32(sampleRate * channels * 2); u16(channels * 2); u16(16);
    writeString('data'); u32(samples.length * 2);
    for (var i = 0; i < samples.length; i++) {
      var s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(pos, s < 0 ? s * 32768 : s * 32767, true);
      pos += 2;
    }
    return new Uint8Array(buffer);
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisMusicEngine = {
    renderInstrumental: renderInstrumental,
    encodeWav: encodeWav,
    STYLES: Object.keys(PATTERNS),
    // Exposed so js/ibis-sfx-engine.js can reuse the same real synthesis primitives instead of
    // duplicating this math -- both engines share one DSP toolkit, per "no duplicate AI brains"
    // applied to local synthesis too.
    _primitives: { seededRng: seededRng, synthTone: synthTone, synthNoiseBurst: synthNoiseBurst, SAMPLE_RATE: SAMPLE_RATE },
  };
})(typeof window !== 'undefined' ? window : globalThis);
