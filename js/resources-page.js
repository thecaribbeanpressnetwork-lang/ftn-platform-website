// FTN Platform Website — Resources page FAQ search (Product Maturity Phase, 2026-07-14).
// A real, live-filtering search over the FAQ using the same Search Foundation already proven on
// Kaiso and Opportunities -- not a new engine. The FAQ items themselves stay real static HTML
// (progressive enhancement: fully readable with JS disabled); this only hides/shows them, it
// never renders their content, so there's no risk of the search index drifting from what's
// actually on the page.
(function (global) {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('faq-search');
    var list = document.getElementById('faq-list');
    var count = document.getElementById('faq-search-count');
    var noResults = document.getElementById('faq-no-results');
    if (!input || !list || !global.FTN || !global.FTN.SearchFoundation) return;

    var items = Array.prototype.map.call(list.querySelectorAll('.faq-item'), function (el, i) {
      var question = el.querySelector('summary').textContent;
      var answer = el.querySelector('.faq-item__answer').textContent;
      return { id: i, el: el, question: question, answer: answer };
    });

    function render(query) {
      var out = global.FTN.SearchFoundation.query(items, { textQuery: query });
      var matchedIds = {};
      out.results.forEach(function (r) { matchedIds[r.id] = true; });

      items.forEach(function (item) {
        item.el.hidden = !matchedIds[item.id];
      });

      if (!query) {
        count.textContent = '';
      } else {
        count.textContent = out.total + ' of ' + items.length + ' question' + (items.length === 1 ? '' : 's') + ' match “' + query + '”';
      }
      noResults.hidden = out.total !== 0;
    }

    input.addEventListener('input', function () { render(input.value.trim()); });
  });
})(window);
