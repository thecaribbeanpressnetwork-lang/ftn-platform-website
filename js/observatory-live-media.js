// FTN Platform Website — FTN Observatory / FTN Live media-source layer.
// Production-honest source architecture: verified official sources are linked,
// camera slots remain explicitly inactive until FTN has an authorized public feed.
(function (global) {
  'use strict';

  var FEEDS = [
    { id: 'tt-met-radar', kind: 'radar', name: 'Weather Radar', description: 'Official Trinidad & Tobago radar imagery for rainfall intensity and reflectivity.', url: 'https://www.metoffice.gov.tt/observations/radar-imagery', authority: 'Trinidad and Tobago Meteorological Service', status: 'official-live', signal: 'RADAR' },
    { id: 'tt-met-satellite', kind: 'satellite', name: 'Caribbean Satellite', description: 'Official Caribbean satellite imagery published by the Trinidad and Tobago Meteorological Service.', url: 'https://www.metoffice.gov.tt/observations/satellite-imagery', authority: 'Trinidad and Tobago Meteorological Service', status: 'official-live', signal: 'SATELLITE' },
    { id: 'tt-met-wis2', kind: 'weather-data', name: 'WIS 2.0 Observations', description: 'Official surface and upper-air observation catalogue for Trinidad and Tobago.', url: 'https://wis.metoffice.gov.tt/', authority: 'Trinidad and Tobago Meteorological Service', status: 'official-data', signal: 'DATA' },
    { id: 'tt-mowt-camera-network', kind: 'camera-network', name: 'Traffic Camera Network', description: 'MOWT confirms 24-hour red-light camera monitoring. No public embeddable livestream has been verified by FTN.', url: 'https://www.mowt.gov.tt/Divisions/Transport-Division/DrivingTT/Red-Light-Camera-Enforcement-System/How-does-the-Red-Light-Camera-Enforcement-System-w', authority: 'Ministry of Works and Transport', status: 'reference-only', signal: 'NETWORK' },
    { id: 'tt-ttps-live', kind: 'public-safety', name: 'Public Safety', description: 'Official TTPS public-safety and community-alert source. No camera feed is implied.', url: 'https://ttps.gov.tt/', authority: 'Trinidad and Tobago Police Service', status: 'official-source', signal: 'SAFETY' }
  ];

  var CAMERA_SLOTS = [
    { id: 'pos', name: 'Port of Spain' },
    { id: 'sando', name: 'San Fernando' },
    { id: 'chaguanas', name: 'Chaguanas' },
    { id: 'tobago', name: 'Scarborough / Tobago' }
  ];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function badge(status) {
    var labels = {
      'official-live': 'OFFICIAL LIVE SOURCE',
      'official-data': 'OFFICIAL DATA',
      'reference-only': 'NETWORK REFERENCE',
      'official-source': 'OFFICIAL SOURCE'
    };
    return '<span class="ftn-live-source__badge ftn-live-source__badge--' + escapeHtml(status) + '">' + escapeHtml(labels[status] || status) + '</span>';
  }

  function injectStyles() {
    if (document.getElementById('ftn-live-media-styles')) return;
    var style = document.createElement('style');
    style.id = 'ftn-live-media-styles';
    style.textContent =
      '.ftn-live-media{position:relative;margin:34px 0 10px;padding:clamp(20px,3vw,34px);overflow:hidden;border:1px solid #2a2c2f;border-radius:var(--radius-16);background:radial-gradient(circle at 82% 12%,rgba(225,6,19,.13),transparent 28%),linear-gradient(145deg,#0b0b0b,#121317 70%,#0a0a0b);color:#fff;box-shadow:var(--shadow-lg)}' +
      '.ftn-live-media:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,#000,transparent 86%)}' +
      '.ftn-live-media>*{position:relative;z-index:1}.ftn-live-media__head{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(230px,.7fr);gap:24px;align-items:end;margin-bottom:22px}.ftn-live-media__head h2{margin:6px 0 8px;color:#fff;font-size:clamp(1.65rem,3vw,2.55rem)}.ftn-live-media__head p{margin:0;color:#b6bac2;max-width:760px;line-height:1.6}.ftn-live-media__eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;color:var(--color-red-on-dark)}' +
      '.ftn-live-media__status{padding:14px 16px;border:1px solid #30333a;border-radius:12px;background:rgba(255,255,255,.035)}.ftn-live-media__status span{display:block;color:var(--color-red-on-dark);font-size:10px;font-weight:900;letter-spacing:.12em}.ftn-live-media__status strong{display:block;margin-top:6px;font-family:var(--font-heading);font-size:1.1rem}.ftn-live-media__status small{display:block;margin-top:5px;color:#9ea4ae;line-height:1.4}' +
      '.ftn-live-source-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.ftn-live-source{display:flex;flex-direction:column;min-height:238px;padding:16px;border:1px solid #292c32;border-radius:14px;background:rgba(19,21,26,.92);transition:transform .16s ease,border-color .16s ease}.ftn-live-source:hover{transform:translateY(-2px);border-color:#545961}.ftn-live-source__signal{font-family:var(--font-heading);font-size:1.55rem;letter-spacing:.04em;color:#fff;opacity:.22}.ftn-live-source h3{margin:8px 0 8px;font-size:16px;color:#fff}.ftn-live-source p{margin:0 0 14px;color:#aeb5c0;line-height:1.5;font-size:13px}.ftn-live-source__meta{margin-top:auto;color:#828b99;font-size:10px;line-height:1.45}.ftn-live-source__link{display:inline-flex;margin-top:12px;color:#fff;font-size:12px;font-weight:800;text-decoration:none}.ftn-live-source__link:hover{text-decoration:underline}.ftn-live-source__badge{display:inline-block;align-self:flex-start;margin-top:10px;padding:4px 7px;border-radius:999px;background:#242832;color:#dce2eb;font-size:8px;font-weight:900;letter-spacing:.08em}.ftn-live-source__badge--official-live{border:1px solid rgba(233,71,80,.45);background:rgba(225,6,19,.10);color:#ff9da5}.ftn-live-source__badge--official-data{background:#152737;color:#9bd8ff}' +
      '.ftn-camera-wall{margin-top:26px;padding-top:24px;border-top:1px solid #292c32}.ftn-camera-wall__top{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:13px}.ftn-camera-wall__title{margin:0 0 6px;color:#fff;font-size:1.25rem}.ftn-camera-wall__note{max-width:760px;color:#aeb5c0;margin:0;line-height:1.55}.ftn-camera-wall__legend{color:#89919e;font-size:10px;font-weight:800;letter-spacing:.08em;white-space:nowrap}.ftn-camera-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ftn-camera-slot{position:relative;aspect-ratio:16/9;display:flex;flex-direction:column;justify-content:flex-end;padding:14px;overflow:hidden;border:1px dashed #4a4e57;border-radius:12px;background:radial-gradient(circle at 50% 42%,rgba(225,6,19,.12),transparent 30%),linear-gradient(135deg,#15171c,#090a0d)}.ftn-camera-slot:before{content:"";position:absolute;inset:14% 18%;border:1px solid rgba(255,255,255,.08);border-radius:50%}.ftn-camera-slot strong,.ftn-camera-slot span{position:relative;z-index:1}.ftn-camera-slot strong{font-size:13px}.ftn-camera-slot span{margin-top:4px;color:#929aa7;font-size:9px;font-weight:800;letter-spacing:.07em}' +
      '.ftn-live-media__policy{margin-top:18px;padding:14px 16px;border-left:3px solid var(--color-red);background:rgba(255,255,255,.035);color:#bfc5cf;font-size:12px;line-height:1.55}.ftn-live-media__policy strong{color:#fff}' +
      '@media(max-width:1180px){.ftn-live-source-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:860px){.ftn-live-media__head{grid-template-columns:1fr}.ftn-live-source-grid{grid-template-columns:1fr 1fr}.ftn-camera-grid{grid-template-columns:1fr 1fr}.ftn-camera-wall__top{display:block}.ftn-camera-wall__legend{display:block;margin-top:10px}}@media(max-width:580px){.ftn-live-source-grid,.ftn-camera-grid{grid-template-columns:1fr}.ftn-live-source{min-height:auto}}@media(prefers-reduced-motion:reduce){.ftn-live-source{transition:none}.ftn-live-source:hover{transform:none}}';
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
      '<div class="ftn-live-media__head"><div><span class="ftn-live-media__eyebrow">FTN OBSERVATORY · LIVE SOURCE LAYER</span><h2 id="ftn-live-media-title">See Trinidad & Tobago through verified national sources.</h2><p>FTN Live combines the Observatory experience with authoritative radar, satellite, weather-data and public-safety sources. Only source material the originating authority actually publishes as live is labelled live.</p></div><div class="ftn-live-media__status"><span>SOURCE INTEGRITY</span><strong>Verified before displayed</strong><small>Live, official data, reference-only and awaiting-feed states are deliberately different.</small></div></div>' +
      '<div class="ftn-live-source-grid">' + FEEDS.map(function (feed) {
        return '<article class="ftn-live-source"><div class="ftn-live-source__signal" aria-hidden="true">' + escapeHtml(feed.signal) + '</div>' + badge(feed.status) + '<h3>' + escapeHtml(feed.name) + '</h3><p>' + escapeHtml(feed.description) + '</p><div class="ftn-live-source__meta">Source<br>' + escapeHtml(feed.authority) + '</div><a class="ftn-live-source__link" href="' + escapeHtml(feed.url) + '" target="_blank" rel="noopener noreferrer">Open official source →</a></article>';
      }).join('') + '</div>' +
      '<div class="ftn-camera-wall"><div class="ftn-camera-wall__top"><div><h3 class="ftn-camera-wall__title">National camera wall</h3><p class="ftn-camera-wall__note">The interface is ready for authorized public camera feeds. Until FTN verifies rights, reliability and a lawful integration method, each location remains visibly inactive rather than showing simulated footage.</p></div><span class="ftn-camera-wall__legend">SOURCE-READY · NOT YET CONNECTED</span></div><div class="ftn-camera-grid">' + CAMERA_SLOTS.map(function (slot) {
        return '<div class="ftn-camera-slot"><strong>' + escapeHtml(slot.name) + '</strong><span>AWAITING AUTHORIZED PUBLIC FEED</span></div>';
      }).join('') + '</div></div>' +
      '<div class="ftn-live-media__policy"><strong>FTN source rule:</strong> no restricted-CCTV scraping, no bypassing platform controls, and no prerecorded or demonstration footage labelled as live. External radar, satellite and agency products remain owned by their originating authorities; FTN provides attribution and a controlled integration surface.</div>';

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
