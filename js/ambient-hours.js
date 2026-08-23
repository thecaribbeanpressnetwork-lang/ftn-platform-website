// FTN Ambient Hours — the platform's ambient-utility measurement framework.
//
// 1 Ambient Hour = one hour during which an eligible FTN ambient experience (FTN Display, FTN
// Clock) is actively presented on a visible screen. Measured conservatively: a tick only counts
// toward a surface's local total while document.visibilityState is genuinely 'visible' — a hidden
// background tab counts zero, per the founder's explicit "do not count a background tab" rule.
//
// Two halves, both real, neither fabricated:
//  1. A per-device local total (js/storage.js, never leaves the browser) — exposed for a future
//     "your FTN ambient time" surface.
//  2. An anonymous, ephemeral aggregate via Supabase Realtime Presence (same no-identity/no-
//     location/no-fingerprint pattern already proven by js/display-presence.js) so FTN Nexus
//     Command can show real-time Ambient Hours accruing across every open screen right now.
// A historical, persisted, cross-session Ambient Hours total is NOT built here — that needs a
// server-side rollup (a real migration + deployed function), which this pass could not verify
// deploying (no Supabase CLI session available). See CLAUDE.md for the honest status record.
(function (global) {
  'use strict';

  var STORE_KEY = 'ftn-ambient-seconds-v1';
  var SUPABASE_URL = 'https://jshmidfpqrajxtukzges.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var CHANNEL_NAME = 'ftn-ambient-presence';

  function totals() {
    var s = global.FTN && global.FTN.storage;
    return s ? s.getJSON(STORE_KEY, {}) : {};
  }

  function addSeconds(surfaceId, sec) {
    var s = global.FTN && global.FTN.storage;
    if (!s || !(sec > 0)) return;
    var t = totals();
    t[surfaceId] = (t[surfaceId] || 0) + sec;
    s.setJSON(STORE_KEY, t);
  }

  function hoursFor(surfaceId) { return (totals()[surfaceId] || 0) / 3600; }

  function totalHours() {
    var t = totals(), sum = 0;
    Object.keys(t).forEach(function (k) { sum += t[k]; });
    return sum / 3600;
  }

  function loadSupabase() {
    return new Promise(function (resolve, reject) {
      if (global.supabase && global.supabase.createClient) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.min.js';
      s.async = true; s.crossOrigin = 'anonymous';
      s.onload = resolve; s.onerror = function () { reject(new Error('Ambient presence client unavailable.')); };
      document.head.appendChild(s);
    });
  }

  var channelPromise = null;
  function channel() {
    if (channelPromise) return channelPromise;
    channelPromise = loadSupabase().then(function () {
      var client = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      return client.channel(CHANNEL_NAME, { config: { presence: { key: 'ambient-' + Math.random().toString(36).slice(2) } } });
    });
    return channelPromise;
  }

  // surfaceId: 'display' | 'clock'. opts.isFullscreen: function returning current fullscreen state.
  function track(surfaceId, opts) {
    opts = opts || {};
    var isFullscreen = opts.isFullscreen || function () { return false; };
    var active = document.visibilityState === 'visible';
    var lastTick = Date.now();
    var presenceChannel = null;

    document.addEventListener('visibilitychange', function () {
      active = document.visibilityState === 'visible';
      lastTick = Date.now();
    });

    channel().then(function (ch) {
      presenceChannel = ch;
      ch.subscribe(function (status) {
        if (status === 'SUBSCRIBED') ch.track({ surfaceId: surfaceId, fullscreen: isFullscreen(), joinedAt: Date.now() });
      });
    }).catch(function () { /* Local measurement still works without the aggregate channel. */ });

    setInterval(function () {
      var now = Date.now();
      var delta = (now - lastTick) / 1000;
      lastTick = now;
      // Guard against large deltas (tab throttled, laptop slept) so a gap never gets miscounted
      // as active ambient time -- conservative measurement, per the founder's explicit rule.
      if (active && delta > 0 && delta < 5) addSeconds(surfaceId, delta);
      if (presenceChannel) { try { presenceChannel.track({ surfaceId: surfaceId, fullscreen: isFullscreen(), joinedAt: Date.now() }); } catch (e) {} }
    }, 1000);
  }

  global.FTN = global.FTN || {};
  global.FTN.AmbientHours = { track: track, hoursFor: hoursFor, totalHours: totalHours, channel: channel };
})(window);
