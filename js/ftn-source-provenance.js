// FTN Source Gateway -- Provenance & Source-Quality foundation (Pass 15).
//
// This is NOT a research agent, a crawler, or an installer for any third-party tool. It is the
// smallest reusable data shape FTN's own intelligence-gathering work (the Open-Source Scout, ibis,
// or any future Source Gateway adapter) can record findings into, so "what did we find, from
// where, how credible, how confident" is answered the same way everywhere -- not invented per
// feature. Mirrors the existing fail-closed-on-unrecognized-value discipline already used by
// js/ibis-eligibility.js and js/ftn-walkthrough.js.
//
// Deliberately a SEPARATE vocabulary from js/trust-card.js's classification list
// (Official/Sourced/FTN Derived/FTN Estimated/FTN Modelled/Demonstration). Trust Card classifies
// FTN's OWN claims about FTN's OWN indicators. SOURCE_QUALITY below classifies EXTERNAL material
// FTN did not produce (a GitHub repo, a government filing, a tweet). Conflating the two would
// misuse Trust Card's vocabulary for a question it was never designed to answer.
//
// Core rule, stated once so every consumer inherits it rather than reimplementing it: SOURCE
// CREDIBILITY and CLAIM CONFIDENCE are never the same number. claimConfidence() below sets a
// confidence CEILING from the single highest-quality corroborating source -- it never lets sheer
// corroboration count from low-quality sources manufacture high confidence. Ten CREATOR_SOCIAL
// posts repeating the same claim stay LOW confidence; one OFFICIAL_GOVERNMENT record is HIGH
// confidence alone.
(function (global) {
  'use strict';

  var SOURCE_QUALITY = [
    'PRIMARY_EVIDENCE', 'OFFICIAL_GOVERNMENT', 'LEGISLATION_PUBLIC_RECORD', 'ACADEMIC',
    'REPUTABLE_JOURNALISM', 'CORPORATE_STATEMENT', 'COMMUNITY_DISCUSSION', 'CREATOR_SOCIAL',
    'PERSONAL_COMMENTARY', 'MARKETING_ADVOCACY', 'UNKNOWN',
  ];

  // Ordinal weight, highest first. Used ONLY to compute a confidence ceiling -- never to
  // auto-promote a claim just because a source exists. UNKNOWN always sits at the bottom, same
  // fail-closed posture as an unrecognized capability string in js/ibis-capability-taxonomy.js.
  var QUALITY_WEIGHT = {
    PRIMARY_EVIDENCE: 10, OFFICIAL_GOVERNMENT: 9, LEGISLATION_PUBLIC_RECORD: 9, ACADEMIC: 8,
    REPUTABLE_JOURNALISM: 7, CORPORATE_STATEMENT: 5, COMMUNITY_DISCUSSION: 3, CREATOR_SOCIAL: 3,
    PERSONAL_COMMENTARY: 2, MARKETING_ADVOCACY: 1, UNKNOWN: 0,
  };

  var RETRIEVAL_METHODS = [
    'DIRECT_FETCH', 'OFFICIAL_API', 'PUBLIC_SEARCH', 'RSS_FEED', 'MANUAL_ENTRY', 'THIRD_PARTY_AGGREGATOR',
  ];

  function isRecognizedQuality(value) {
    return SOURCE_QUALITY.indexOf(value) !== -1;
  }
  function isRecognizedRetrievalMethod(value) {
    return RETRIEVAL_METHODS.indexOf(value) !== -1;
  }

  // The smallest real record a Source Gateway finding must carry. Fails closed: an unrecognized
  // sourceQuality/retrievalMethod is coerced to UNKNOWN/MANUAL_ENTRY rather than silently accepted
  // as-typed, so a typo can never pass through as a false credibility signal.
  function sourceRecord(input) {
    input = input || {};
    return {
      sourceId: input.sourceId || null,
      platform: input.platform || null,
      sourceClass: isRecognizedQuality(input.sourceClass) ? input.sourceClass : 'UNKNOWN',
      owner: input.owner || null,
      url: input.url || null,
      author: input.author || null,
      publishedAt: input.publishedAt || null,
      retrievedAt: input.retrievedAt || null,
      retrievalMethod: isRecognizedRetrievalMethod(input.retrievalMethod) ? input.retrievalMethod : 'MANUAL_ENTRY',
      contentHash: input.contentHash || null,
      geographicRelevance: input.geographicRelevance || null,
      permissions: input.permissions || 'READ_ONLY_RESEARCH',
      consumingProducts: Array.isArray(input.consumingProducts) ? input.consumingProducts.slice() : [],
    };
  }

  function freshnessDays(record, nowIso) {
    if (!record || !record.retrievedAt) return null;
    var now = nowIso ? new Date(nowIso) : new Date();
    var then = new Date(record.retrievedAt);
    if (isNaN(then.getTime()) || isNaN(now.getTime())) return null;
    return Math.round((now.getTime() - then.getTime()) / 86400000);
  }

  // Claim confidence: HIGH requires either (a) a single PRIMARY_EVIDENCE/OFFICIAL_GOVERNMENT/
  // LEGISLATION source (authoritative alone), or (b) at least 2 independent ACADEMIC/JOURNALISM-
  // tier-or-better sources. Everything below that tier caps at MODERATE (with >=3 independent
  // sources) or LOW. Independence is counted by distinct owner/platform/url, not raw source count
  // -- three re-posts of the same tweet from the same account are one source, not three.
  function claimConfidence(sources) {
    sources = Array.isArray(sources) ? sources : [];
    if (!sources.length) return { confidence: 'UNSUPPORTED', ceilingQuality: null, corroboration: 0 };
    var best = { w: -1, quality: 'UNKNOWN' };
    sources.forEach(function (s) {
      var quality = isRecognizedQuality(s && s.sourceClass) ? s.sourceClass : 'UNKNOWN';
      var w = QUALITY_WEIGHT[quality];
      if (w > best.w) best = { w: w, quality: quality };
    });
    var owners = {};
    sources.forEach(function (s, i) {
      var key = (s && (s.owner || s.platform || s.url)) || ('unattributed-' + i);
      owners[key] = true;
    });
    var independentCount = Object.keys(owners).length;
    var confidence;
    if (best.w >= 9) confidence = 'HIGH';
    else if (best.w >= 7) confidence = independentCount >= 2 ? 'HIGH' : 'MODERATE';
    else if (best.w >= 3) confidence = independentCount >= 3 ? 'MODERATE' : 'LOW';
    else confidence = 'LOW';
    return { confidence: confidence, ceilingQuality: best.quality, corroboration: independentCount };
  }

  global.FTN = global.FTN || {};
  global.FTN.SourceProvenance = {
    SOURCE_QUALITY: SOURCE_QUALITY.slice(),
    RETRIEVAL_METHODS: RETRIEVAL_METHODS.slice(),
    isRecognizedQuality: isRecognizedQuality,
    isRecognizedRetrievalMethod: isRecognizedRetrievalMethod,
    sourceRecord: sourceRecord,
    freshnessDays: freshnessDays,
    claimConfidence: claimConfidence,
  };
})(typeof window !== 'undefined' ? window : globalThis);
