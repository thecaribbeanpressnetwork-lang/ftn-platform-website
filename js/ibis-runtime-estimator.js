// FTN Platform — real, deterministic screenplay runtime estimation. No AI model, no network call
// -- the standard screenwriting-industry heuristic (roughly one page of properly formatted
// screenplay per one minute of screen time, roughly 235 words per page for dialogue-heavy
// material) applied to raw text. This is an approximation, stated honestly: real pagination
// depends on scene-heading/action/dialogue formatting and whitespace this module never sees, not
// word count alone -- the estimate is directional, not a substitute for real pagination software.
(function (global) {
  'use strict';

  var WORDS_PER_PAGE = 235; // mid-range of the commonly cited 200-250 words/page range
  var MINUTES_PER_PAGE = 1;

  function wordCount(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function estimateRuntime(text, opts) {
    opts = opts || {};
    var words = wordCount(text);
    if (!words) {
      return { minutes: null, pages: null, wordCount: 0, reason: 'No screenplay text supplied.' };
    }
    var pages = words / WORDS_PER_PAGE;
    var minutes = pages * MINUTES_PER_PAGE;
    var result = {
      minutes: Math.round(minutes * 10) / 10,
      pages: Math.round(pages * 10) / 10,
      wordCount: words,
      reason: null,
    };
    if (typeof opts.targetMinutes === 'number' && opts.targetMinutes > 0) {
      var diff = result.minutes - opts.targetMinutes;
      result.targetMinutes = opts.targetMinutes;
      result.deltaMinutes = Math.round(diff * 10) / 10;
      result.withinTarget = Math.abs(diff) <= Math.max(2, opts.targetMinutes * 0.15);
    }
    return result;
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisRuntimeEstimator = { estimateRuntime: estimateRuntime, wordCount: wordCount };
})(typeof window !== 'undefined' ? window : globalThis);
