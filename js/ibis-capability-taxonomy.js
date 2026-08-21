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
    // Phase 6 (FTNScreen Screenwriter directive): named explicitly in the directive's own
    // taxonomy request. STORY_DEVELOPMENT/CHARACTER_DEVELOPMENT/OUTLINE/BEAT_SHEET/SCREENPLAY/
    // REVISION/CONTINUITY_CHECK/QC all require a real TEXT-capable provider (none is
    // enabled/eligible for a guest today -- see js/ibis-provider-registry.js). RUNTIME_ESTIMATION
    // is the one exception: a real, deterministic, zero-cost local calculation (see
    // js/ibis-runtime-estimator.js, provider ibis-local-script-runtime-estimator).
    // Final integration pass: extends the real pipeline order (IDEA -> LOGLINE -> SYNOPSIS ->
    // CHARACTERS -> WORLD -> OUTLINE -> SCREENPLAY -> SCENE_BREAKDOWN -> PRODUCTION_PLAN ->
    // PITCH_MATERIAL) with six new stage capabilities. Each is a genuine text-generation task a
    // TEXT-capable provider can perform -- not a fabricated capability -- see
    // js/ftnscreen-screenwriter.js's STAGES array for the real dependency wiring and
    // js/ibis-provider-registry.js for which providers now list them.
    SCREENWRITING: [
      'STORY_DEVELOPMENT', 'LOGLINE', 'SYNOPSIS', 'CHARACTER_DEVELOPMENT', 'WORLD_BUILDING',
      'OUTLINE', 'BEAT_SHEET', 'SCREENPLAY', 'SCENE_BREAKDOWN', 'PRODUCTION_PLAN',
      'PITCH_MATERIAL', 'REVISION', 'CONTINUITY_CHECK', 'RUNTIME_ESTIMATION', 'QC',
    ],
    // Phase 6 voice directive: VOICE_SYNTHESIS is distinct from the existing AUDIO group's
    // TEXT_TO_SPEECH (generic narration) -- this is specifically FTN-authorized-identity speech
    // (IAN/SARAFINA), with dialect/region/delivery-style as separate request parameters (never a
    // second voice capability per dialect -- see js/ibis-voice-registry.js).
    VOICE: ['VOICE_SYNTHESIS'],
    // Phase 7 provider-activation directive: SFX had no capability entry anywhere in the
    // taxonomy -- a real gap, not an oversight left alone. SFX_GENERATION is procedural synthesis
    // from parameters (js/ibis-sfx-engine.js); kept deliberately separate from any future audio-
    // processing capability so "processing" is never relabeled as "generation."
    SFX: ['SFX_GENERATION'],
    // Phase 13 Caribbean Intelligence directive: a single real capability, not one per named
    // dialect/territory (CARIBBEAN_LANGUAGE_ID/TRINI_LANGUAGE_ID/etc. from the directive's own
    // list are request-time region parameters to this one capability, the same pattern already
    // established for VOICE_SYNTHESIS's dialect parameter above -- never a second capability
    // string per region). Only registered because a real, cited implementation exists
    // (js/ibis-caribbean-language-id.js, provider ibis-local-caribbean-language-id) -- the
    // directive's own rule ("do not register capabilities merely because they have been named").
    CARIBBEAN: ['CARIBBEAN_LANGUAGE_ID'],
    // Pass 16: the IBIS Live Intelligence vertical slice. A single real capability -- current,
    // evidence-backed public-source research -- distinct from ordinary TEXT/REASONING, which
    // answers from model knowledge alone. Only registered because a real, working, zero-cost
    // implementation exists (js/ibis-live-research.js, provider ibis-local-live-research),
    // following the same "do not register capabilities merely because they've been named" rule
    // already established for CARIBBEAN_LANGUAGE_ID above.
    RESEARCH: ['LIVE_INTELLIGENCE'],
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
