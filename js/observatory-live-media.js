// FTN Platform Website — FTN Live media/source layer.
//
// Production-honest live-source architecture for the National Observatory.
// It links to verified authoritative Trinidad & Tobago sources and exposes
// camera/feed slots without pretending that a public stream exists when one
// has not been verified. No third-party credentials are required client-side.
(function (global) {
  'use strict';

  var FEEDS = [
    {
      id: 'tt-met-radar',
      kind: 'radar',
      name: 'TT Met Service — Weather Radar',
      description: 'Real-time radar imagery for Trinidad and Tobago, including rainfall intensity and reflectivity products.',
      url: 'https://www.metoffice.gov.tt/observations/radar-imagery',
      authority: 'Trinidad and Tobago Meteorological Service',
      status: 'official-live',
    },
    {
      id: 'tt-met-satellite',
      kind: 'satellite',
      name: 'TT Met Service — Caribbean Satellite Imagery',
      description: 'Real-time Caribbean satellite products published by the Trinidad and Tobago Meteorological Service.',
      url: 'https://www.metoffice.gov.tt/observations/satellite-imagery',
      authority: 'Trinidad and Tobago Meteorological Service',
      status: 'official-live',
    },
    {
      id: 'tt-met-wis2',
      kind: 'weather-data',
      name: 'TT Met Service — WIS 2.0 Observations',
      description: 'Official weather-observation catalogue including Trinidad and Tobago surface and upper-air datasets.',
      url: 'https://wis.metoffice.gov.tt/',
      authority: 'Trinidad and Tobago Meteorological Service',
      status: 'official-data',
    },
    {
      id: 'tt-mowt-camera-network',
      kind: 'camera-network',
      name: 'MOWT Traffic Enforcement Camera Network',
      description: 'The Ministry confirms 24-hour red-light camera monitoring. FTN does not claim a public livestream because no official embeddable public feed has been verified.',
      url: 'https://www.mowt.gov.tt/Divisions/Transport-Division/DrivingTT/Red-Light-Camera-Enforcement-System/How-does-the-Red-Light-Camera-Enforcement-System-w',
      authority: 'Ministry of Works and Transport',
      status: 'reference-only',
    },
    {
      id: 'tt-ttps-live',
      kind: 'public-safety',
      name: 'Trinidad and Tobago Police Service',
      description: 'Official TTPS public-safety and community-alert source. No public camera stream is represented unless TTPS publishes one for public use.',
      url: 'https://ttps.gov.tt/',
      authority: 'Trinidad and Tobago Police Service',
      status: 'official-source',
    },
  ];

  var CAMERA_SLOTS = [
    { id: 'pos', name: 'Port of Spain', status: 'awaiting-authorized-feed' },
    { id: 'sando', name: 'San Fernando', status: 'awaiting-authorized-feed' },
    { id: 'chaguanas', name: 'Chaguanas', status: 'awaiting-authorized-feed' },
    { id: 'tobago', name: 'Scarborough / Tobago', status: 'awaiting-authorized-feed' },
  ];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function badge(status) {
    var label = {
      'official-live': 'OFFICIAL LIVE SOURCE',
      'official-data': 'OFFICIAL DATA',
      'reference-only': 'NETWORK REFERENCE',
      'official-source': 'OFFICIAL SOURCE',
    }[status] || status;
    return '<span class="ftn-live-source__badge ftn-live-source__badge--' + escapeHtml(status) + '">' + escapeHtml(label) + '</span>';
  }

  function injectStyles() {
    if (document.getElementById('ftn-live-media-styles')) return;
    var style = document.createElement('style');
    style.id = 'ftn-live-media-styles';
    style.textContent =
      '.ftn-live-media{margin:34px 0 10px;padding:26px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:#0b0d11;color:#fff}' +
      '.ftn-live-media__head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:18px}.ftn-live-media__head h2{margin:4px 0 8px;color:#fff}.ftn-live-media__head p{margin:0;color:#b7bdc8;max-width:760px;line-height:1.55}' +
      '.ftn-live-media__eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;color:#ff3947}.ftn-live-source-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ftn-live-source{display:flex;flex-direction:column;min-height:220px;padding:16px;border:1px solid #282d35;border-radius:14px;background:#12151b}.ftn-live-source h3{margin:10px 0 8px;font-size:16px;color:#fff}.ftn-live-source p{margin:0 0 14px;color:#aeb5c0;line-height:1.5}.ftn-live-source__meta{margin-top:auto;color:#828b99;font-size:11px}.ftn-live-source__link{display:inline-flex;margin-top:13px;color:#fff;font-weight:800;text-decoration:none}.ftn-live-source__link:hover{text-decoration:underline}.ftn-live-source__badge{display:inline-block;align-self:flex-start;padding:4px 7px;border-radius:999px;background:#232832;color:#dce2eb;font-size:9px;font-weight:900;letter-spacing:.08em}.ftn-live-source__badge--official-live{background:#0b3924;color:#76f7b3}.ftn-live-source__badge--official-data{background:#0b2d47;color:#8cd7ff}' +
      '.ftn-camera-wall{margin-top:18px}.ftn-camera-wall__title{margin:0 0 6px;color:#fff;font-size:18px}.ftn-camera-wall__note{color:#aeb5c0;margin:0 0 12px;line-height:1.5}.ftn-camera-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ftn-camera-slot{aspect-ratio:16/9;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:14px;border:1px dashed #454b56;border-radius:12px;background:linear-gradient(135deg,#11141a,#0a0c10)}.ftn-camera-slot strong{font-size:13px}.ftn-camera-slot span{margin-top:5px;color:#8f98a6;font-size:10px}.ftn-live-media__policy{margin-top:16px;padding:12px;border-left:3px solid #e10613;background:#15171c;color:#bfc5cf;font-size:12px;line-height:1.5}' +
      '@media(max-width:980px){.ftn-live-source-grid{grid-template-columns:1fr 1fr}.ftn-camera-grid{grid-template-columns:1fr 1fr}}@media(max-width:620px){.ftn-live-media{padding:18px}.ftn-live-media__head{display:block}.ftn-live-source-grid,.ftn-camera-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function render() {
    var today = document.getElementById('today-in-tt');
    if (!today || document.getElementById('ftn-live-media')) return;

    var section = document.createElement('section');
    section.id = 'ftn-live-media';
    section.className = 'ftn-live-media';
    section.setAttribute('aria-labelledby', 'ftn-live-media-title');
    section.innerHTML =
      '<div class="ftn-live-media__head"><div><span class="ftn-live-media__eyebrow">LIVE SOURCE LAYER</span><h2 id="ftn-live-media-title">See the country through verified sources.</h2><p>FTN Live connects the National Observatory to authoritative weather, satellite and public-safety sources. A feed is labelled live only when the originating authority actually publishes a live source.</p></div></div>' +
      '<div class="ftn-live-source-grid">' + FEEDS.map(function (feed) {
        return '<article class="ftn-live-source">' + badge(feed.status) + '<h3>' + escapeHtml(feed.name) + '</h3><p>' + escapeHtml(feed.description) + '</p><div class="ftn-live-source__meta">Source: ' + escapeHtml(feed.authority) + '</div><a class="ftn-live-source__link" href="' + escapeHtml(feed.url) + '" target="_blank" rel="noopener noreferrer">Open official source →</a></article>';
      }).join('') + '</div>' +
      '<div class="ftn-camera-wall"><h3 class="ftn-camera-wall__title">Trinidad & Tobago camera wall</h3><p class="ftn-camera-wall__note">The camera wall is ready for authorized public streams. Until an agency or rights-holder publishes a feed FTN may legally embed, these locations remain clearly marked as awaiting source rather than showing simulated video.</p><div class="ftn-camera-grid">' + CAMERA_SLOTS.map(function (slot) {
        return '<div class="ftn-camera-slot"><strong>' + escapeHtml(slot.name) + '</strong><span>AWAITING AUTHORIZED PUBLIC FEED</span></div>';
      }).join('') + '</div></div>' +
      '<div class="ftn-live-media__policy"><strong>Source policy:</strong> FTN does not scrape restricted CCTV, bypass platform controls, or present prerecorded/demo footage as live. Satellite/radar products remain owned and operated by their originating authorities; FTN provides attribution and a controlled integration surface.</div>';

    today.parentNode.insertBefore(section, today);
  }

  function init() {
    injectStyles();
    render();
  }

  global.FTN = global.FTN || {};
  global.FTN.LiveMediaRegistry = { feeds: FEEDS.slice(), cameraSlots: CAMERA_SLOTS.slice() };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
