// FTN Riddim — Find a Studio / Producer Near Me. A real local-search hand-off (Google Maps),
// not a proprietary studio database FTN would have to build and keep current itself. House
// brands render first, transparently labelled, above genuine external search results.
(function (global) {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderHouseBrands() {
    var mount = document.getElementById('riddim-house-brands');
    if (!mount || !global.FTN.HouseBrands) return;
    var brands = global.FTN.HouseBrands.forProduct('riddim');
    mount.innerHTML = brands.map(function (b) {
      return '<div class="workspace-output"><h3>' + esc(b.name) + '</h3><p>' + esc(b.role) + '</p></div>';
    }).join('');
  }

  function initForm() {
    var form = document.getElementById('riddim-studio-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var location = document.getElementById('riddim-studio-location').value.trim() || 'Trinidad and Tobago';
      var intent = document.getElementById('riddim-studio-intent').value;
      var query = intent + ' near ' + location;
      global.open('https://www.google.com/maps/search/' + encodeURIComponent(query), '_blank', 'noopener');
    });
  }

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () { renderHouseBrands(); initForm(); });
})(window);
