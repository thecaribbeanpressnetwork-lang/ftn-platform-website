// FTN Platform — the IBIS music-workflow classifier (Phase 4). Music requests are not all the
// same ("I have an idea" vs. "I have lyrics" vs. "I have vocals, give me a new beat" vs. "keep my
// vocals, replace the beat" each need a genuinely different capability chain) -- this module
// resolves free text into a real chain of taxonomy capabilities, honest about what to preserve
// vs. generate. Deterministic, whole-phrase pattern matching only -- the same discipline
// js/intent-router.js already documents for itself, never an LLM call (that would introduce a
// new provider cost dependency for what is fundamentally a routing decision, not a generation
// one). Capability strings used in each chain are the REAL, already-registered strings
// (js/ibis-provider-registry.js) wherever a provider concept exists for the step today, and the
// canonical taxonomy name (js/ibis-capability-taxonomy.js) everywhere else -- so that checking
// each chain step against js/ibis-eligibility.js produces an honest, real answer rather than one
// that looks eligible because the name happens to differ from what's actually registered.
(function (global) {
  'use strict';

  var ASSET_SIGNALS = [
    ['SONG', /\b(completed|finished|full)\s+song\b/i],
    ['VOCALS', /\bvocals?\b/i],
    ['LYRICS', /\blyrics?\b/i],
    ['INSTRUMENTAL', /\binstrumental\b/i],
    ['VIDEO', /\bvideo\b/i],
    ['IDEA', /\bidea\b/i],
  ];

  function detectAssets(text) {
    var found = [];
    ASSET_SIGNALS.forEach(function (pair) {
      if (pair[1].test(text) && found.indexOf(pair[0]) === -1) found.push(pair[0]);
    });
    return found;
  }

  var SCENARIOS = [
    {
      id: 'idea-to-song-concept',
      match: /\bidea\b.*\b(song|track|riddim)\b|\b(song|track)\s+idea\b/i,
      chain: [
        { capability: 'LYRICS_TO_MUSIC', purpose: 'Draft a lyrical/structural concept from the idea.' },
        { capability: 'INSTRUMENTAL_GENERATION', purpose: 'Generate a backing instrumental for the concept.' },
      ],
      gap: 'The canonical taxonomy has no singing-voice-synthesis capability -- a fully sung vocal performance cannot be chained yet. Real, honest limitation, not an oversight.',
    },
    {
      id: 'lyrics-to-instrumental',
      match: /\blyrics\b.*\b(make|create|build)\b.*\binstrumental\b|\bhave lyrics\b/i,
      preserves: ['LYRICS'],
      chain: [{ capability: 'INSTRUMENTAL_GENERATION', purpose: 'Generate an instrumental matching the supplied lyrics.' }],
    },
    {
      id: 'vocals-new-beat',
      match: /\bvocals\b.*\b(new|different)\b.*\bbeat\b|\buploaded vocals\b/i,
      preserves: ['VOCALS'],
      chain: [
        { capability: 'INSTRUMENTAL_GENERATION', purpose: 'Generate a new instrumental in the requested genre.' },
        { capability: 'ARRANGEMENT', purpose: 'Align the preserved vocals to the new instrumental.' },
      ],
    },
    {
      id: 'replace-beat-keep-vocals',
      match: /\bcompleted song\b.*\b(keep|preserve)\b.*\bvocals\b|\breplace the beat\b/i,
      preserves: ['VOCALS'],
      chain: [
        { capability: 'STEM_SEPARATION', purpose: 'Separate the existing song into vocal and instrumental stems.' },
        { capability: 'INSTRUMENTAL_GENERATION', purpose: 'Generate a new instrumental.' },
        { capability: 'ARRANGEMENT', purpose: 'Align the preserved vocal stem to the new instrumental.' },
      ],
    },
    {
      id: 'clean-vocals',
      match: /\bclean( up)?\b.*\bvocals\b/i,
      preserves: ['VOCALS'],
      chain: [
        { capability: 'AUDIO_CLEANUP', purpose: 'General cleanup pass.' },
        { capability: 'DENOISING', purpose: 'Remove background noise.' },
        { capability: 'DEREVERB', purpose: 'Remove unwanted room reverb.' },
      ],
    },
    {
      id: 'change-bpm',
      match: /\bchange\b.*\bbpm\b|\bbpm to \d+/i,
      chain: [
        { capability: 'BPM_DETECTION', purpose: 'Measure the current tempo. LIVE today (js/ibis-audio-analysis.js, zero cost).' },
        { capability: 'MUSIC_TRANSFORMATION', purpose: 'Retime the audio to the target BPM.' },
      ],
      gap: 'The taxonomy names BPM_DETECTION/TEMPO_ANALYSIS but no explicit tempo-change/time-stretch capability -- MUSIC_TRANSFORMATION is the closest real fit, an approximation, not an exact match.',
    },
    {
      id: 'album-cover',
      match: /\balbum cover\b|\bcreate.*\bcover\b/i,
      chain: [{ capability: 'IMAGE_GENERATION', purpose: 'Generate cover artwork from the song/brand concept.' }],
    },
    {
      id: 'song-to-music-video',
      match: /\b(turn|make)\b.*\bsong\b.*\b(music )?video\b/i,
      preserves: ['SONG'],
      chain: [
        { capability: 'MUSIC_ANALYSIS', purpose: 'Derive structure/mood/section timing from the song.' },
        { capability: 'IMAGE_GENERATION', purpose: 'Generate key visual frames per section.' },
        { capability: 'VIDEO_GENERATION', purpose: 'Animate the visuals into video scenes.' },
      ],
    },
    {
      id: 'change-one-scene',
      match: /\bchange\b.*\bscene\b/i,
      graphOperation: true,
      note: 'A project/asset-graph question (what depends on the changed scene), not a generation chain -- see js/ibis-project-graph.js. Other scenes must stay untouched.',
    },
    {
      id: 'change-one-lyric',
      match: /\bchange\b.*\b(one|this)\b.*\blyric\b/i,
      graphOperation: true,
      chain: [{ capability: 'TEXT_GENERATION', purpose: 'Produce the edited lyric line/version.' }],
      note: 'Downstream regeneration (vocals/song/video/scenes) is answered by js/ibis-project-graph.js\'s transitive dependency computation, not hardcoded here.',
    },
    {
      id: 'video-social-clips',
      match: /\bsocial clips?\b|\bclips? from this video\b/i,
      preserves: ['VIDEO'],
      chain: [
        { capability: 'SCENE_DETECTION', purpose: 'Identify candidate clip boundaries.' },
        { capability: 'VIDEO_EDIT', purpose: 'Cut and format each clip.' },
      ],
    },
    {
      id: 'radio-version',
      match: /\bradio version\b/i,
      chain: [
        { capability: 'AUDIO_CLEANUP', purpose: 'Prepare a clean broadcast-ready mix.' },
        { capability: 'MASTERING', purpose: 'Loudness/format for radio delivery.' },
      ],
    },
    {
      id: 'tv-version',
      match: /\btv version\b/i,
      preserves: ['VIDEO'],
      chain: [
        { capability: 'VIDEO_EDIT', purpose: 'Reformat/trim for TV delivery.' },
        { capability: 'VIDEO_CAPTIONING', purpose: 'Add broadcast captions.' },
      ],
    },
  ];

  function classify(text) {
    text = String(text || '');
    var existingAssets = detectAssets(text);
    var scenario = null;
    for (var i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].match.test(text)) { scenario = SCENARIOS[i]; break; }
    }
    if (!scenario) {
      return {
        matched: false, scenarioId: null, existingAssets: existingAssets, chain: [], preserves: [], graphOperation: false, gap: null, note: null,
        reason: 'No known music-workflow pattern matched this request. IBIS should ask a clarifying question rather than guess a capability chain.',
      };
    }
    return {
      matched: true,
      scenarioId: scenario.id,
      existingAssets: existingAssets,
      preserves: (scenario.preserves || []).slice(),
      chain: (scenario.chain || []).slice(),
      graphOperation: !!scenario.graphOperation,
      gap: scenario.gap || null,
      note: scenario.note || null,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisMusicWorkflow = { classify: classify, detectAssets: detectAssets, SCENARIOS: SCENARIOS };
})(typeof window !== 'undefined' ? window : globalThis);
