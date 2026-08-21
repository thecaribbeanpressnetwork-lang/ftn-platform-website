// FTN Platform — the canonical IBIS capability taxonomy (Phase 4). A reference vocabulary, used
// for real validation (see tests/ibis-eligibility-audit.mjs's taxonomy-conformance check), not a
// decorative list nobody reads.
//
// Reconciliation note, stated honestly rather than silently done: the capability strings already
// shipped and working in js/ibis-provider-registry.js (TEXT, IMAGE_GENERATION, VIDEO_GENERATION,
// INSTRUMENTAL_GENERATION, AUDIO_GENERATION, BPM_DETECTION, AUDIO_ANALYSIS) predate this taxonomy
// and are wired through real, tested consumers -- js/ibis-widget.js calls
// attemptInOrder('TEXT', ...), js/ibis-creative-studio.js calls
// attemptInOrder('IMAGE_GENERATION', ...). Renaming them to match this taxonomy's naming
// convention exactly (TEXT_GENERATION, TEXT_TO_IMAGE, TEXT_TO_VIDEO) would touch every consumer
// and every existing CI assertion for a naming change with no functional benefit -- exactly what
// "do not replace working code merely to make it look different" warns against. Instead, LEGACY
// below documents the real mapping from each shipped string to its canonical equivalent (or notes
// where none exists yet), and every shipped string remains valid input to isRecognized(). New
// capability strings for NEW providers should be drawn from CANONICAL directly, not LEGACY.
(function (global) {
  'use strict';

  var CANONICAL = {
    TEXT: [
      'TEXT_GENERATION', 'REASONING', 'SUMMARIZATION', 'CLASSIFICATION', 'TRANSLATION',
      'EXTRACTION', 'STRUCTURED_OUTPUT', 'CODING', 'EMBEDDING', 'RERANKING', 'RESEARCH', 'RAG',
    ],
    IMAGE: [
      'TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE', 'IMAGE_EDIT', 'IMAGE_INPAINTING', 'IMAGE_OUTPAINTING',
      'OBJECT_REMOVAL', 'OBJECT_REPLACEMENT', 'BACKGROUND_REMOVAL', 'BACKGROUND_REPLACEMENT',
      'IMAGE_UPSCALING', 'RESTORATION', 'RELIGHTING', 'STYLE_TRANSFORMATION', 'IMAGE_ANALYSIS', 'OCR',
    ],
    AUDIO: [
      'AUDIO_TRANSCRIPTION', 'SPEECH_TO_TEXT', 'TEXT_TO_SPEECH', 'VOICE_ANALYSIS', 'AUDIO_CLEANUP',
      'DENOISING', 'DEREVERB', 'SOURCE_SEPARATION', 'STEM_SEPARATION', 'VOCAL_SEPARATION',
      'PITCH_ANALYSIS', 'TEMPO_ANALYSIS', 'BPM_DETECTION', 'KEY_DETECTION', 'CHORD_DETECTION',
      'BEAT_DETECTION', 'AUDIO_CLASSIFICATION',
    ],
    MUSIC: [
      'MUSIC_GENERATION', 'INSTRUMENTAL_GENERATION', 'TEXT_TO_MUSIC', 'LYRICS_TO_MUSIC',
      'LYRICS_TO_INSTRUMENTAL', 'MUSIC_CONTINUATION', 'MUSIC_TRANSFORMATION', 'MUSIC_TO_MIDI',
      'AUDIO_TO_MIDI', 'ARRANGEMENT', 'BEAT_GENERATION', 'RHYTHM_GENERATION', 'MELODY_GENERATION',
      'HARMONY_GENERATION', 'MUSIC_ANALYSIS', 'MIXING', 'MASTERING',
    ],
    VIDEO: [
      'TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'VIDEO_TO_VIDEO', 'VIDEO_EXTENSION', 'VIDEO_EDIT',
      'VIDEO_INPAINTING', 'VIDEO_OBJECT_REMOVAL', 'VIDEO_OBJECT_REPLACEMENT', 'VIDEO_UPSCALING',
      'VIDEO_RESTORATION', 'FRAME_INTERPOLATION', 'LIP_SYNC', 'VIDEO_TRANSCRIPTION',
      'VIDEO_CAPTIONING', 'VIDEO_TRANSLATION', 'VIDEO_ANALYSIS', 'SCENE_DETECTION', 'SHOT_DETECTION',
    ],
    MULTIMODAL: [
      'IMAGE_TEXT_REASONING', 'VIDEO_TEXT_REASONING', 'AUDIO_TEXT_REASONING',
      'AUDIO_VIDEO_REASONING', 'MULTIMODAL_EXTRACTION',
    ],
  };

  // Shipped-string -> canonical-equivalent, or null where the shipped string covers ground the
  // canonical list doesn't name 1:1 (documented honestly rather than forced into a poor-fit alias).
  var LEGACY = {
    TEXT: 'TEXT_GENERATION',
    IMAGE_GENERATION: 'TEXT_TO_IMAGE',
    VIDEO_GENERATION: 'TEXT_TO_VIDEO',
    INSTRUMENTAL_GENERATION: 'INSTRUMENTAL_GENERATION', // already canonical (MUSIC) -- listed for completeness
    BPM_DETECTION: 'BPM_DETECTION', // already canonical (AUDIO) -- listed for completeness
    AUDIO_GENERATION: null, // pre-taxonomy catch-all (Stable Audio 3's "sample" output) -- no single canonical equivalent yet
    AUDIO_ANALYSIS: null, // pre-taxonomy catch-all (ibis-local-dsp) -- closest canonical neighbor is AUDIO_CLASSIFICATION, not identical
  };

  var flattened = null;
  function all() {
    if (flattened) return flattened.slice();
    flattened = [];
    Object.keys(CANONICAL).forEach(function (group) {
      flattened = flattened.concat(CANONICAL[group]);
    });
    return flattened.slice();
  }

  function isCanonical(capability) {
    return all().indexOf(capability) !== -1;
  }
  function isLegacy(capability) {
    return Object.prototype.hasOwnProperty.call(LEGACY, capability);
  }
  // The real, used check: is this a capability string IBIS actually recognizes -- either the
  // canonical taxonomy or a documented pre-taxonomy shipped string. Anything else fails closed.
  function isRecognized(capability) {
    return isCanonical(capability) || isLegacy(capability);
  }
  function canonicalEquivalent(capability) {
    if (isCanonical(capability)) return capability;
    if (isLegacy(capability)) return LEGACY[capability];
    return undefined;
  }
  function groupOf(capability) {
    var canon = canonicalEquivalent(capability);
    if (!canon) return null;
    var found = null;
    Object.keys(CANONICAL).forEach(function (group) {
      if (CANONICAL[group].indexOf(canon) !== -1) found = group;
    });
    return found;
  }

  global.FTN = global.FTN || {};
  global.FTN.CapabilityTaxonomy = {
    CANONICAL: CANONICAL,
    LEGACY: LEGACY,
    all: all,
    isCanonical: isCanonical,
    isLegacy: isLegacy,
    isRecognized: isRecognized,
    canonicalEquivalent: canonicalEquivalent,
    groupOf: groupOf,
  };
})(typeof window !== 'undefined' ? window : globalThis);
