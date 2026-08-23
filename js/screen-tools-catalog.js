// FTN Screen — verified official filmmaker-tool destinations. No affiliate links.
(function (global) {
  'use strict';
  var VERIFIED = '2026-08-12';
  var tools = [
    {name:'DaVinci Resolve',purpose:'Editing, colour, visual effects and audio post-production',cost:'Free / paid Studio edition',url:'https://www.blackmagicdesign.com/products/davinciresolve',dependency:'External desktop software; no FTN integration'},
    {name:'Kdenlive',purpose:'Non-linear video editing',cost:'Free and open source',url:'https://kdenlive.org/',dependency:'External desktop software; no FTN integration'},
    {name:'Shotcut',purpose:'Cross-platform video editing and export',cost:'Free and open source',url:'https://shotcut.org/',dependency:'External desktop software; no FTN integration'},
    {name:'Audacity',purpose:'Dialogue, sound and audio editing',cost:'Free and open source',url:'https://www.audacityteam.org/',dependency:'External desktop software; no FTN integration'},
    {name:'DCP-o-matic',purpose:'Prepare Digital Cinema Packages for theatrical screening',cost:'Free and open source',url:'https://dcpomatic.com/',dependency:'External desktop software; confirm venue specifications'},
    {name:'HandBrake',purpose:'Transcode and compress screening or review files',cost:'Free and open source',url:'https://handbrake.fr/',dependency:'External desktop software; preserve a high-quality master separately'},
    {name:'FilmFreeway',purpose:'Discover festivals and submit a prepared film package',cost:'Free account; festival fees may apply',url:'https://filmfreeway.com/',dependency:'External submission platform; rules and fees belong to each festival'},
    {name:'StudioBinder',purpose:'Production planning, shot lists, schedules and call sheets',cost:'Free entry tier / paid plans',url:'https://app.studiobinder.com/pricing/',dependency:'External cloud service; no FTN integration'}
  ];
  function esc(v) { return String(v || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function init() {
    var content = document.querySelector('.workspace__content');
    if (!content) { global.setTimeout(init, 100); return; }
    if (document.getElementById('screen-tool-catalog')) return;
    var section = document.createElement('section');
    section.id = 'screen-tool-catalog';
    section.className = 'screen-tools screen-panel';
    section.innerHTML = '<span class="screen-kicker">Filmmaker tool catalogue</span><h2>Build, finish and present the work.</h2><p class="workspace-muted">Official tool destinations verified ' + VERIFIED + '. Price labels describe the publisher’s public model, not an FTN offer. Affiliate availability is not claimed because no FTN relationship has been approved.</p><div class="screen-tools__grid">' + tools.map(function (item) {
      return '<article><div class="screen-tools__meta"><span>' + esc(item.cost) + '</span><span>No FTN affiliate relationship</span></div><h3>' + esc(item.name) + '</h3><p>' + esc(item.purpose) + '</p><p><small>' + esc(item.dependency) + ' · Last verified ' + VERIFIED + '</small></p><a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">Open official tool ↗</a></article>';
    }).join('') + '</div>';
    var discovery = document.getElementById('screen-discovery');
    if (discovery) discovery.insertAdjacentElement('afterend', section);
    else content.insertBefore(section, content.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
