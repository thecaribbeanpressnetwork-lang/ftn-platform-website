// FTN Platform Website — FTN Observatory / FTN Live verified-source layer.
(function (global) {
  'use strict';

  var FEEDS = [
    { id: 'tt-met-radar', kind: 'radar', name: 'Weather Radar', description: 'Official Trinidad & Tobago radar imagery for rainfall intensity and reflectivity.', url: 'https://www.metoffice.gov.tt/observations/radar-imagery', authority: 'Trinidad and Tobago Meteorological Service', status: 'official-live', signal: 'RADAR' },
    { id: 'tt-met-satellite', kind: 'satellite', name: 'Caribbean Satellite', description: 'Official Caribbean satellite imagery published by the Trinidad and Tobago Meteorological Service.', url: 'https://www.metoffice.gov.tt/observations/satellite-imagery', authority: 'Trinidad and Tobago Meteorological Service', status: 'official-live', signal: 'SATELLITE' },
    { id: 'tt-met-wis2', kind: 'weather-data', name: 'WIS 2.0 Observations', description: 'Official surface and upper-air observation catalogue for Trinidad and Tobago.', url: 'https://wis.metoffice.gov.tt/', authority: 'Trinidad and Tobago Meteorological Service', status: 'official-data', signal: 'DATA' },
    { id: 'tt-mowt-camera-network', kind: 'camera-network', name: 'Traffic Camera Network', description: 'Official Ministry of Works and Transport information on the national red-light camera enforcement network.', url: 'https://www.mowt.gov.tt/Divisions/Transport-Division/DrivingTT/Red-Light-Camera-Enforcement-System/How-does-the-Red-Light-Camera-Enforcement-System-w', authority: 'Ministry of Works and Transport', status: 'reference-only', signal: 'NETWORK' },
    { id: 'tt-ttps-live', kind: 'public-safety', name: 'Public Safety', description: 'Official Trinidad and Tobago Police Service public-safety and community information source.', url: 'https://ttps.gov.tt/', authority: 'Trinidad and Tobago Police Service', status: 'official-source', signal: 'SAFETY' }
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
      'reference-only': 'OFFICIAL REFERENCE',
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
      '.ftn-live-media__policy{margin-top:18px;padding:14px 16px;border-left:3px solid var(--color-red);background:rgba(255,255,255,.035);color:#bfc5cf;font-size:12px;line-height:1.55}.ftn-live-media__policy strong{color:#fff}' +
      '@media(max-width:1180px){.ftn-live-source-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:860px){.ftn-live-media__head{grid-template-columns:1fr}.ftn-live-source-grid{grid-template-columns:1fr 1fr}}@media(max-width:580px){.ftn-live-source-grid{grid-template-columns:1fr}.ftn-live-source{min-height:auto}}@media(prefers-reduced-motion:reduce){.ftn-live-source{transition:none}.ftn-live-source:hover{transform:none}}';
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
      '<div class="ftn-live-media__head"><div><span class="ftn-live-media__eyebrow">FTN LIVE · VERIFIED SOURCES</span><h2 id="ftn-live-media-title">See Trinidad & Tobago through authoritative national sources.</h2><p>Open official radar, satellite, weather-data, transport and public-safety sources alongside the FTN Observatory.</p></div><div class="ftn-live-media__status"><span>SOURCE INTEGRITY</span><strong>Verified before displayed</strong><small>FTN labels a source according to what the originating authority actually provides.</small></div></div>' +
      '<div class="ftn-live-source-grid">' + FEEDS.map(function (feed) {
        return '<article class="ftn-live-source"><div class="ftn-live-source__signal" aria-hidden="true">' + escapeHtml(feed.signal) + '</div>' + badge(feed.status) + '<h3>' + escapeHtml(feed.name) + '</h3><p>' + escapeHtml(feed.description) + '</p><div class="ftn-live-source__meta">Source<br>' + escapeHtml(feed.authority) + '</div><a class="ftn-live-source__link" href="' + escapeHtml(feed.url) + '" target="_blank" rel="noopener noreferrer">Open official source →</a></article>';
      }).join('') + '</div>' +
      '<div class="ftn-live-media__policy"><strong>FTN source rule:</strong> external radar, satellite and agency products remain owned by their originating authorities. FTN provides attribution and direct access without representing unavailable feeds as live.</div>';

    today.parentNode.insertBefore(section, today);
  }

  function init() {
    injectStyles();
    render();
  }

  global.FTN = global.FTN || {};
  global.FTN.LiveMediaRegistry = { feeds: FEEDS.slice() };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
