// FTN Platform — ibis Caribbean Language ID (Phase 13). A small, honest, deterministic,
// zero-dependency lexical-marker detector for Trinidad & Tobago English/Creole vocabulary -- NOT a
// trained language-identification model, NOT a claim of linguistic completeness, and explicitly
// NOT something that originates or inserts Trinidadian expressions into generated text. It only
// ever reports on markers already present in text a caller supplies (this satisfies IBIS-MAP.md's
// Caribbean Evidence/Authenticity System: this module's output is RESEARCH_DERIVED evidence,
// never presented as VERIFIED cultural fact, and it degrades to INSUFFICIENT_EVIDENCE honestly
// rather than guessing when no marker is found).
//
// Every marker below is sourced directly from two real, cited references (fetched and verified
// 2026-08-21 -- see CARIBBEAN-LEDGER.md for the full research trail):
//   https://en.wikipedia.org/wiki/Trinidadian_and_Tobagonian_English
//   https://en.wikipedia.org/wiki/Trinidadian_Creole
// This is deliberately a small, conservative starting set (7 terms), not an attempt at
// comprehensive coverage -- extending it requires the same real-source-citation discipline, not
// invented vocabulary.
(function (global) {
  'use strict';

  var MARKERS = [
    { term: 'lime', variants: ['lime', 'liming', 'limming'], meaning: 'to relax and hang out', source: 'Trinidadian_Creole' },
    { term: 'tabanca', variants: ['tabanca'], meaning: 'heartbreak', source: 'Trinidadian_Creole' },
    { term: 'bacchanal', variants: ['bacchanal'], meaning: 'drama, scandal, confusion or conflict', source: 'Trinidadian_Creole' },
    { term: 'bad-john', variants: ['bad-john', 'badjohn'], meaning: 'a bully or gangster', source: 'Trinidadian_Creole' },
    { term: 'dougla', variants: ['dougla'], meaning: 'a person of both Indian and African parentage', source: 'Trinidadian_Creole' },
    { term: 'jumbee', variants: ['jumbee', 'jumbie'], meaning: 'a ghost or demonic spirit', source: 'Trinidadian_Creole' },
    { term: 'broughtupsy', variants: ['broughtupsy', 'brought-upsie'], meaning: 'good manners, proper upbringing', source: 'Trinidadian_Creole' },
  ];

  var SOURCE_URLS = {
    Trinidadian_Creole: 'https://en.wikipedia.org/wiki/Trinidadian_Creole',
    Trinidadian_and_Tobagonian_English: 'https://en.wikipedia.org/wiki/Trinidadian_and_Tobagonian_English',
  };

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Word-boundary matching so "lime" does not fire inside "sublime" or "climate".
  function findMatches(text) {
    var found = [];
    MARKERS.forEach(function (marker) {
      marker.variants.forEach(function (variant) {
        var re = new RegExp('\\b' + escapeRegex(variant) + '\\b', 'i');
        if (re.test(text)) {
          found.push({
            term: marker.term,
            matchedVariant: variant,
            meaning: marker.meaning,
            source: marker.source,
            sourceUrl: SOURCE_URLS[marker.source] || null,
          });
        }
      });
    });
    // De-duplicate by term (a marker with multiple matching variants should report once).
    var seen = {};
    return found.filter(function (m) {
      if (seen[m.term]) return false;
      seen[m.term] = true;
      return true;
    });
  }

  // identify(text) -> { evidenceType, confidence, matches, disclosure }
  // evidenceType is always one of the Caribbean Evidence/Authenticity System categories
  // (IBIS-MAP.md): RESEARCH_DERIVED when real cited markers were found, INSUFFICIENT_EVIDENCE
  // otherwise -- never VERIFIED (this module has no native-speaker review step) and never
  // CREATIVE (this is analysis of supplied text, not generation).
  function identify(text) {
    var input = typeof text === 'string' ? text : '';
    if (!input.trim()) {
      return { evidenceType: 'INSUFFICIENT_EVIDENCE', confidence: 0, matches: [], disclosure: 'No text supplied.' };
    }
    var matches = findMatches(input);
    if (!matches.length) {
      return {
        evidenceType: 'INSUFFICIENT_EVIDENCE',
        confidence: 0,
        matches: [],
        disclosure: 'No known Trinidad English/Creole lexical marker was found in this text. This does not mean the text is not Trinidadian -- this detector only recognizes a small, cited list of vocabulary, not grammar, phonology, or the full lexicon.',
      };
    }
    // Confidence is a simple, honest ratio (matches found / markers in the reference set),
    // capped well below 1.0 for a small match count -- deliberately not styled as a trained
    // model's probability score, since this is lexical pattern-matching, not classification.
    var confidence = Math.min(0.9, matches.length / MARKERS.length + 0.15);
    return {
      evidenceType: 'RESEARCH_DERIVED',
      confidence: Math.round(confidence * 100) / 100,
      matches: matches,
      disclosure: 'Detected via a small, cited lexical-marker list (see each match\'s sourceUrl), not a trained language-identification model. Presence of these markers suggests Trinidad English/Creole vocabulary; absence does not rule it out.',
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.CaribbeanLanguageId = { identify: identify, MARKERS: MARKERS.slice(), SOURCE_URLS: SOURCE_URLS };
})(typeof window !== 'undefined' ? window : globalThis);
