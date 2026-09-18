// FTN Platform — shared, headless course/training discovery query layer (FTN Consolidation
// closure wave, 2026-09-18).
//
// FTN Learn has two genuinely different capabilities that were previously bundled into one
// product page (see js/product-registry-data.js's 'learn' entry): AI tutoring/explanation (a
// conversational task that belongs in ibis, no special data needed) and real provider/course
// discovery (a small, honestly-labelled, real dataset in js/learn-data.js -- one dated listing
// plus four real Trinidad and Tobago training institutions, PROVIDER != COURSE per that file's own
// header discipline). This module is the read-side query layer over that SAME data (never
// duplicated, never re-typed) so ibis can search it directly instead of only linking to /learn/.
// No DOM dependency: search() takes a query string and returns plain data.
(function (global) {
  'use strict';

  function haystack(record) {
    return [record.title || record.name, record.provider, record.category, record.subcategory, record.description, record.summary, (record.tags || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
  }

  var STOPWORDS = ['the', 'and', 'for', 'find', 'course', 'a', 'to', 'me', 'in', 'that', 'could', 'help', 'learn'];

  function search(query) {
    var Data = global.FTN && global.FTN.LearnData;
    if (!Data) return { listings: [], providers: [] };
    var words = String(query || '').toLowerCase().split(/\W+/).filter(function (w) { return w.length >= 3 && STOPWORDS.indexOf(w) === -1; });
    if (!words.length) return { listings: Data.listings.slice(0, 5), providers: Data.providers.slice(0, 5) };
    function scoreOf(record) {
      var text = haystack(record), score = 0;
      words.forEach(function (w) { if (text.indexOf(w) !== -1) score += 1; });
      return score;
    }
    var listings = Data.listings.map(function (l) { return { record: l, score: scoreOf(l) }; }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; }).map(function (r) { return r.record; });
    var providers = Data.providers.map(function (p) { return { record: p, score: scoreOf(p) }; }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; }).map(function (r) { return r.record; });
    return { listings: listings, providers: providers };
  }

  global.FTN = global.FTN || {};
  global.FTN.LearnDiscovery = { search: search };
})(typeof window !== 'undefined' ? window : globalThis);
