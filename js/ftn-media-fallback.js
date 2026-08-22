// FTN Media Fallback — one shared resolver for "the external video we wanted didn't load."
// Any surface embedding YouTube through js/ftn-media-discovery.js can use this instead of its own
// dead-iframe handling: try each candidate in turn (an iframe 'error' event or a slow/never-fired
// load is the real-world signal for private/deleted/non-embeddable video), then fall back to a
// clearly-labelled FTN house slate rather than a blank player or a permanent spinner.
(function (global) {
  'use strict';

  function tryEmbed(frame, videoId, timeoutMs) {
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () { if (!settled) { settled = true; resolve(false); } }, timeoutMs || 6000);
      function onError() { if (!settled) { settled = true; clearTimeout(timer); resolve(false); } }
      function onLoad() { if (!settled) { settled = true; clearTimeout(timer); resolve(true); } }
      frame.addEventListener('error', onError, { once: true });
      frame.addEventListener('load', onLoad, { once: true });
      frame.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&mute=1&rel=0&playsinline=1';
    });
  }

  // Walks a candidate list (already-discovered results from js/ftn-media-discovery.js), trying
  // each in order until one actually loads. Never fabricates a candidate that wasn't supplied.
  async function resolveFirstPlayable(frame, candidates, timeoutMs) {
    for (var i = 0; i < candidates.length; i++) {
      var ok = await tryEmbed(frame, candidates[i].videoId, timeoutMs);
      if (ok) return candidates[i];
    }
    return null;
  }

  // The house fallback when nothing embeddable was found -- looks like intentional FTN
  // programming, not an error screen. Reuses the real, already-approved Face the Nation hero
  // photograph and badge (assets/face-the-nation/) rather than generating new artwork.
  function houseFallbackHTML() {
    return (
      '<div class="ftn-media-fallback">' +
        '<img src="/assets/face-the-nation/ftn-hero-master-shot.jpg" alt="Face the Nation with Ricardo Antoine" loading="lazy">' +
        '<div class="ftn-media-fallback__overlay">' +
          '<img class="ftn-media-fallback__badge" src="/assets/face-the-nation/ftn-badge-logo.jpg" alt="" width="48" height="48">' +
          '<p class="ftn-media-fallback__eyebrow">Now on FTN</p>' +
          '<h3>Watch Face The Nation</h3>' +
          '<p>with Ricardo Antoine</p>' +
          '<a class="btn btn-primary btn-sm" href="/facethenation">Open Face The Nation &rarr;</a>' +
        '</div>' +
      '</div>'
    );
  }

  global.FTN = global.FTN || {};
  global.FTN.MediaFallback = { resolveFirstPlayable: resolveFirstPlayable, houseFallbackHTML: houseFallbackHTML };
})(window);
