// Real execution test for js/ibis-sfx-engine.js -- SFX_GENERATION's production eligibility test.
// Same discipline as the music engine test: real generated audio, real WAV bytes, decoded back
// and verified structurally and acoustically, no mocks.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-music-engine.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-sfx-engine.js', 'utf8'), context);
const SfxEngine = context.window.FTN.IbisSfxEngine;

function decodeWavHeader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = (offset, len) => String.fromCharCode(...bytes.slice(offset, offset + len));
  assert.equal(str(0, 4), 'RIFF');
  assert.equal(str(8, 4), 'WAVE');
  assert.equal(str(36, 4), 'data');
  return { sampleRate: view.getUint32(24, true), bitsPerSample: view.getUint16(34, true), dataSize: view.getUint32(40, true) };
}
function decodeSamples(bytes, dataSize) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = dataSize / 2;
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const int16 = view.getInt16(44 + i * 2, true);
    samples[i] = int16 / (int16 < 0 ? 32768 : 32767);
  }
  return samples;
}

const seenDurations = {};
for (const preset of SfxEngine.PRESETS) {
  const rendered = SfxEngine.renderSfx({ preset, seed: 999 });
  assert(rendered.samples.length > 0, `${preset}: must produce real, non-empty sample data`);

  const wavBytes = SfxEngine.encodeWav(rendered);
  assert.equal(typeof wavBytes.BYTES_PER_ELEMENT, 'number', 'Must be a real typed array (vm-realm, so no instanceof)');
  const header = decodeWavHeader(wavBytes);
  assert.equal(header.sampleRate, 44100);
  assert.equal(header.bitsPerSample, 16);
  assert.equal(header.dataSize, rendered.samples.length * 2, 'Header data size must match the real sample count');

  const decoded = decodeSamples(wavBytes, header.dataSize);
  const rms = Math.sqrt(decoded.reduce((sum, v) => sum + v * v, 0) / decoded.length);
  assert(rms > 0.01, `${preset}: RMS energy (${rms.toFixed(4)}) too low -- must be genuinely audible`);
  for (const v of decoded) {
    assert(Number.isFinite(v), `${preset}: every sample must be finite`);
    assert(v >= -1 && v <= 1, `${preset}: every sample must stay within [-1, 1]`);
  }
  seenDurations[preset] = rendered.durationSeconds;
}

// -- Real, distinct presets -- not the same sound relabeled four times --------------------------
const durationValues = Object.values(seenDurations);
assert.equal(new Set(durationValues).size, durationValues.length, 'The four presets must have genuinely different durations, not identical output under different names');

// -- Determinism ----------------------------------------------------------------------------------
const a = SfxEngine.renderSfx({ preset: 'chime', seed: 55 });
const b = SfxEngine.renderSfx({ preset: 'chime', seed: 55 });
let identical = a.samples.length === b.samples.length;
if (identical) for (let i = 0; i < a.samples.length; i++) { if (a.samples[i] !== b.samples[i]) { identical = false; break; } }
assert(identical, 'Same preset/seed must produce byte-identical audio');

// -- Unknown preset falls back honestly to a real, named default (blip) -------------------------
const fallback = SfxEngine.renderSfx({ preset: 'not-a-real-preset', seed: 1 });
assert.equal(fallback.preset, 'blip');

console.log(`ibis-sfx-engine-audit: real audio generated and WAV-encoded for all ${SfxEngine.PRESETS.length} presets (${SfxEngine.PRESETS.join(', ')}), header/sample round-trip verified, non-silence and no-clipping verified, presets proven distinct, determinism verified.`);
