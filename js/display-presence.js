// FTN Display — shared anonymous presence channel. One place both FTN Display (which tracks
// itself) and FTN Nexus Command (which only listens) connect to, so the "how many people have
// this open" answer is never duplicated logic. No identity, no location, no device fingerprint —
// just an ephemeral Supabase Realtime Presence key and a fullscreen flag.
(function (global) {
  'use strict';
  var SUPABASE_URL = 'https://jshmidfpqrajxtukzges.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var CHANNEL_NAME = 'ftn-display-presence';

  function loadSupabase() {
    return new Promise(function (resolve, reject) {
      if (global.supabase && global.supabase.createClient) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.min.js';
      s.async = true; s.crossOrigin = 'anonymous';
      s.onload = resolve; s.onerror = function () { reject(new Error('FTN Display presence client unavailable.')); };
      document.head.appendChild(s);
    });
  }

  function connect(presenceKey) {
    return loadSupabase().then(function () {
      var client = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      return client.channel(CHANNEL_NAME, { config: { presence: { key: presenceKey || ('viewer-' + Math.random().toString(36).slice(2)) } } });
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.DisplayPresenceChannel = { connect: connect };
})(window);
