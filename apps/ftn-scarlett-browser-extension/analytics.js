// Local-only product analytics. IMPORTANT: this file never makes a network call -- events are
// appended to chrome.storage.local (this browser profile only) and nothing more. Wiring these
// events to a real destination (even FTN's own existing Umami instance) is a deliberate, separate
// "start collecting real usage data" decision that has not been made in this pass -- see
// docs/SCARLETT_V2_ANALYTICS_PRIVACY_MODEL.md. What exists here is real and useful on its own: the
// event schema, the privacy boundary (never page content/URLs/query text/identifiers), and a local
// demo dashboard (analytics-dashboard.html) that proves the schema is populated correctly.
(function (scope) {
  'use strict';

  const LOG_KEY = 'scarlettAnalyticsLog';
  const MAX_EVENTS = 500;

  // Every event name this build actually fires. Kept as an explicit allowlist so a future call
  // site can't silently start logging something outside the privacy boundary below.
  const KNOWN_EVENTS = new Set([
    'activation', 'session_start',
    'mode_applied', 'transform_used', 'compare_used', 'blend_used',
    'shield_status_viewed', 'shield_enabled', 'shield_disabled', 'shield_exception_added',
    'search_used', 'find_used',
    'ibis_handoff', 'headspace_handoff', 'paywall_impression',
    'error',
  ]);

  // Structural privacy boundary: strips any property that looks like it could carry page content,
  // a full URL, a search query, or an identifier, even if a call site passed one by mistake. Only
  // short, closed-vocabulary values (mode names, category names, booleans, small integers) survive.
  function sanitize(props) {
    const clean = {};
    for (const [key, value] of Object.entries(props || {})) {
      if (/url|href|query|text|content|title|email|selector|selection/i.test(key)) continue;
      if (typeof value === 'string' && value.length > 40) continue;
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
      clean[key] = value;
    }
    return clean;
  }

  // Several events often fire back-to-back within the same synchronous call (a mode application
  // can log mode_applied + transform_used + paywall_impression in one go). chrome.storage.local's
  // get-then-set is not atomic, so firing those concurrently is a real read-modify-write race --
  // confirmed live: a burst of 3 events landed only 2 in the log, the middle one silently lost to
  // an overwrite. Chain every write through one promise so each logEvent's read-modify-write
  // completes before the next one starts, however many fire in the same tick.
  let writeQueue = Promise.resolve();
  async function logEvent(name, props) {
    if (!KNOWN_EVENTS.has(name)) return; // never log an ad hoc event name
    writeQueue = writeQueue.then(async () => {
      try {
        const stored = await chrome.storage.local.get(LOG_KEY);
        const log = stored?.[LOG_KEY] || [];
        log.push({ name, props: sanitize(props), ts: Date.now() });
        while (log.length > MAX_EVENTS) log.shift();
        await chrome.storage.local.set({ [LOG_KEY]: log });
      } catch { /* storage unavailable -- analytics is best-effort, never blocks the feature it's attached to */ }
    });
    return writeQueue;
  }

  async function readLog() {
    try {
      const stored = await chrome.storage.local.get(LOG_KEY);
      return stored?.[LOG_KEY] || [];
    } catch { return []; }
  }

  async function clearLog() {
    try { await chrome.storage.local.remove(LOG_KEY); } catch {}
  }

  scope.FTN_SCARLETT_ANALYTICS = { logEvent, readLog, clearLog, KNOWN_EVENTS };
})(typeof self !== 'undefined' ? self : this);
