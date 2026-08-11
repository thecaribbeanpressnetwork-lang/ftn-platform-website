// FTN Parliament Channel — official-source directory. No third-party streams are rehosted.
(function (global) {
  'use strict';

  var SOURCES = [
    {
      country: 'Trinidad & Tobago',
      legislature: 'Parliament of the Republic of Trinidad and Tobago',
      liveUrl: 'https://parlview.ttparliament.org/',
      officialUrl: 'https://www.ttparliament.org/',
      description: 'ParlView, chamber and committee coverage, schedule and archive.',
      status: 'Official live source verified'
    },
    {
      country: 'Guyana',
      legislature: 'Parliament of the Co-operative Republic of Guyana',
      liveUrl: 'https://parliament.gov.gy/',
      officialUrl: 'https://www.youtube.com/@parliamentofguyana1710/streams',
      description: 'National Assembly live stream, sittings, recordings and official channel archive.',
      status: 'Official live source verified'
    }
  ];

  function esc(value) {
    return String(value || '').replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function card(source) {
    return '<article class="parliament-card">' +
      '<p class="parliament-card__country">' + esc(source.country) + '</p>' +
      '<h2>' + esc(source.legislature) + '</h2>' +
      '<p>' + esc(source.description) + '</p>' +
      '<span class="parliament-card__status">' + esc(source.status) + '</span>' +
      '<div class="parliament-card__actions"><a class="btn btn-primary" href="' + esc(source.liveUrl) + '" target="_blank" rel="noopener noreferrer">Open official live source</a>' +
      '<a class="btn btn-outline" href="' + esc(source.officialUrl) + '" target="_blank" rel="noopener noreferrer">Official archive</a></div>' +
      '</article>';
  }

  function init() {
    var mount = document.getElementById('ftn-parliament-root');
    if (!mount) return;
    mount.innerHTML = '<section class="parliament-hero"><div class="container"><p class="eyebrow">FTN Parliament Channel</p><h1>Watch public democracy in session.</h1><p class="parliament-hero__lede">Official parliamentary coverage, beginning in the Caribbean. FTN links to the source; it does not alter, reframe or rehost proceedings.</p><div class="parliament-hero__actions"><a class="btn btn-primary" href="#caribbean-sources">Open Caribbean sources</a><a class="btn btn-outline btn-outline--on-dark" href="https://data.ipu.org/" target="_blank" rel="noopener noreferrer">World parliament directory</a></div></div></section>' +
      '<section class="parliament-section" id="caribbean-sources"><div class="container"><p class="eyebrow">Caribbean first</p><h2>Official live and archive sources</h2><p class="parliament-note">A source marked live may be between sittings. Check its official schedule for the next proceeding.</p><div class="parliament-grid">' + SOURCES.map(card).join('') + '</div></div></section>' +
      '<section class="parliament-section parliament-section--dark"><div class="container parliament-world"><div><p class="eyebrow">Worldwide</p><h2>A reliable world directory, not a random stream list.</h2><p>FTN uses the Inter-Parliamentary Union’s Parline directory as the country-and-chamber backbone. It covers 193 national parliaments. Live links are added only after FTN verifies that they belong to the legislature or its official broadcaster.</p><a class="btn btn-primary" href="https://data.ipu.org/" target="_blank" rel="noopener noreferrer">Browse IPU Parline</a></div><aside><strong>Source standard</strong><p>Official site or verified official channel · source date recorded · no rehosting without permission · editorial context kept separate from the live record.</p><a href="/data/parliament-live-sources.txt" target="_blank" rel="noopener">Open FTN source registry</a></aside></div></section>';
  }

  global.FTN = global.FTN || {};
  global.FTN.ParliamentChannel = { sources: SOURCES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}(window));
