// FTN Platform Website — Search Foundation (Sprint 1, Wave 1).
//
// Formalizes the filter pattern already proven in Observatory's indicator search
// (js/observatory.js #indicator-search) into a reusable component. Sprint 1 ships filtering only,
// but the API shape accommodates indexing/grouping/ranking/suggestions later without a rewrite --
// query() always returns { results, groups, total }, even though groups is unused until a real
// consumer needs it.
(function (global) {
  'use strict';

  // items: array of plain objects. options.filters: array of { field, value } (case-insensitive
  // substring match on that field). options.groupBy: a field name (optional, unused by any
  // Sprint 1 consumer but part of the stable shape). options.sortBy / options.limit: same status.
  function query(items, options) {
    options = options || {};
    var results = items.slice();

    (options.filters || []).forEach(function (f) {
      if (!f.value) return;
      var needle = String(f.value).toLowerCase();
      results = results.filter(function (item) {
        var haystack = String(item[f.field] || '').toLowerCase();
        return haystack.indexOf(needle) !== -1;
      });
    });

    if (options.textQuery) {
      var q = String(options.textQuery).toLowerCase().trim();
      if (q) {
        var qWords = q.split(/\s+/).filter(Boolean);
        results = results.filter(function (item) {
          var haystack = Object.keys(item).map(function (k) { return item[k]; }).join(' ').toLowerCase();
          return qWords.every(function (w) { return haystack.indexOf(w) !== -1; });
        });
      }
    }

    var groups = null;
    if (options.groupBy) {
      groups = {};
      results.forEach(function (item) {
        var key = item[options.groupBy] || 'Other';
        groups[key] = groups[key] || [];
        groups[key].push(item);
      });
    }

    if (options.sortBy) {
      results.sort(function (a, b) {
        var av = a[options.sortBy], bv = b[options.sortBy];
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      });
    }

    var total = results.length;
    if (options.limit) results = results.slice(0, options.limit);

    return { results: results, groups: groups, total: total };
  }

  global.FTN = global.FTN || {};
  global.FTN.SearchFoundation = { query: query };
})(window);
