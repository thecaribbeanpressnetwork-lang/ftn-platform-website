// FTN Riddim public hub finalization.
// Product-local only: keeps launch UI focused on things a visitor can actually open and use.
(function () {
  'use strict';

  window.addEventListener('load', function () {
    var hub = document.querySelector('.riddim-hub');
    if (!hub) return;

    var head = hub.querySelector('.riddim-head p');
    if (head) {
      head.textContent = 'One Caribbean music workspace for track preparation, rights-aware metadata, local audio shaping, versioning and DJ performance tools.';
    }

    var cards = hub.querySelectorAll('.riddim-card');
    if (cards[0]) {
      var badge0 = cards[0].querySelector('.riddim-badge');
      if (badge0) badge0.remove();
      var p0 = cards[0].querySelector('p');
      if (p0) p0.textContent = 'Attach an authorized track, inspect supported embedded metadata, complete credits and rights information, then save or export one canonical FTN music record.';
    }

    if (cards[1]) {
      var badge1 = cards[1].querySelector('.riddim-badge');
      if (badge1) badge1.remove();
      var h1 = cards[1].querySelector('h2');
      var p1 = cards[1].querySelector('p');
      var l1 = cards[1].querySelector('.riddim-link');
      if (h1) h1.textContent = 'FTN DJ Tube';
      if (p1) p1.textContent = 'Open the two-deck Caribbean DJ workspace with local profiles, controller mapping, tempo, cue, crossfade and performance controls.';
      if (l1) l1.textContent = 'Open FTN DJ Tube →';
    }

    if (cards[2]) {
      var daw = document.createElement('a');
      daw.className = 'riddim-card';
      daw.href = '/riddim/daw/';
      daw.innerHTML = '<h2>FTN DAW</h2><p>Load authorized local audio, shape gain, tempo and EQ, compare the original, save named versions, then download the processed WAV and its FTN settings recipe.</p><span class="riddim-link">Open FTN DAW →</span>';
      cards[2].replaceWith(daw);
    }
  });
})();
