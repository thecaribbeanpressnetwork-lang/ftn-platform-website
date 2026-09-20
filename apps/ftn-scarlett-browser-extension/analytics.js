// Scarlett product analytics: real, network-transmitted, privacy-bounded product telemetry --
// never a browsing-history database. Full contract: docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md.
//
// Two local mirrors, one purpose each:
//   scarlettAnalyticsLog    -- everything logEvent() was ever asked to record, sanitized, kept
//                              locally so a user can inspect "what Scarlett would send" (the
//                              analytics-dashboard.html transparency view). Never transmitted.
//   scarlettTelemetryQueue  -- the subset actually queued for network delivery (only when the
//                              analytics preference is on). Only background.js's periodic
//                              chrome.alarms tick ever flushes this -- content scripts and the
//                              popup only ever enqueue, never fetch, so a network send only ever
//                              happens once per batch, from one place, on a bounded schedule (see
//                              §8/§12: no continuous transmission, no per-content-script pinging).
(function (scope) {
  'use strict';

  const TELEMETRY_ENDPOINT = 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-scarlett-telemetry';
  const INSTALL_ID_KEY = 'scarlettAnonymousInstallId';
  const SESSION_KEY = 'scarlettAnonymousSession';
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min inactivity -> a new anonymous session, a standard analytics boundary
  const LOG_KEY = 'scarlettAnalyticsLog';
  const QUEUE_KEY = 'scarlettTelemetryQueue';
  const MAX_LOCAL_LOG = 500;
  const MAX_QUEUE = 300; // bounded: if delivery has been failing, oldest queued events are dropped rather than growing without limit
  const FLUSH_BATCH_SIZE = 25; // matches the ingestion function's MAX_EVENTS_PER_BATCH
  const ANALYTICS_PREF_KEY = 'scarlettAnalyticsEnabled';

  // Every event name this build can fire, closed to exactly the server's own allow-list
  // (supabase/functions/ftn-scarlett-telemetry/index.ts's ALLOWED_EVENT_NAMES) -- an unlisted name
  // is dropped here, before it ever reaches the network layer.
  const ALLOWED_EVENTS = new Set([
    'install', 'extension_updated',
    'onboarding_started', 'onboarding_completed',
    'session_started',
    'mode_used', 'assist_used', 'adapt_used', 'transform_used', 'compare_used', 'blend_used',
    'data_faucet_opened', 'shield_enabled', 'shield_disabled', 'site_break_recovery_used',
    'search_used', 'find_used',
    'ibis_handoff', 'headspace_handoff',
    'paywall_seen', 'premium_preview_used', 'checkout_started', 'checkout_completed', 'checkout_failed',
    'subscription_started', 'subscription_renewed', 'subscription_cancelled', 'subscription_expired', 'subscription_past_due',
    'error', 'performance_sample',
  ]);
  const BUCKETS = ['<50ms', '50-100ms', '100-250ms', '250-500ms', '500ms-1s', '>1s'];
  function bucket(ms) {
    if (!Number.isFinite(ms) || ms < 0) return null;
    if (ms < 50) return BUCKETS[0]; if (ms < 100) return BUCKETS[1]; if (ms < 250) return BUCKETS[2];
    if (ms < 500) return BUCKETS[3]; if (ms < 1000) return BUCKETS[4]; return BUCKETS[5];
  }

  // Structural privacy boundary, mirrored server-side (defense in depth): only a closed set of
  // short, non-content-shaped properties survive into either the local log or the network queue.
  const METADATA_VALIDATORS = {
    pageType: (v) => typeof v === 'string' && ['APP', 'LISTING', 'FORM_SERVICE', 'ARTICLE', 'GENERIC'].includes(v),
    blendLevel: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100,
    resultCount: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1000,
    trackerCategory: (v) => typeof v === 'string' && ['analytics', 'advertising', 'social', 'essential', 'unknown'].includes(v),
    capability: (v) => typeof v === 'string' && /^[a-z][a-z0-9.]{1,60}$/.test(v),
    searchIntent: (v) => typeof v === 'string' && ['SHOPPING', 'OPPORTUNITY', 'LOCATION', 'CURRENT_EVENTS', 'RESEARCH', 'GENERAL'].includes(v),
  };
  function sanitizeMetadata(props) {
    const clean = {};
    for (const [key, validate] of Object.entries(METADATA_VALIDATORS)) {
      const value = props?.[key];
      if (value === undefined || !validate(value)) continue;
      if (typeof value === 'string' && value.length > 60) continue;
      clean[key] = value;
    }
    return clean;
  }

  async function storageGet(key) { try { const r = await chrome.storage.local.get(key); return r?.[key]; } catch { return undefined; } }
  async function storageSet(obj) { try { await chrome.storage.local.set(obj); } catch {} }

  async function getInstallId() {
    let id = await storageGet(INSTALL_ID_KEY);
    if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) return id;
    id = crypto.randomUUID();
    await storageSet({ [INSTALL_ID_KEY]: id });
    return id;
  }
  // Bounded session boundary: explicit extension activity within SESSION_TIMEOUT_MS keeps the same
  // session id; a gap longer than that (or the very first event) starts a new one. This is what
  // makes "second session" (the activation funnel's last step) and DAU/WAU/MAU meaningful without
  // any persistent background polling to "prove the extension is alive" -- a session boundary is
  // only ever computed as a side effect of a real event that was going to fire anyway.
  async function getSessionId() {
    const now = Date.now();
    const stored = await storageGet(SESSION_KEY);
    if (stored && typeof stored.id === 'string' && now - (stored.lastActivityAt || 0) < SESSION_TIMEOUT_MS) {
      await storageSet({ [SESSION_KEY]: { id: stored.id, lastActivityAt: now } });
      return { id: stored.id, isNew: false };
    }
    const id = crypto.randomUUID();
    await storageSet({ [SESSION_KEY]: { id, lastActivityAt: now } });
    return { id, isNew: true };
  }

  function detectBrowserFamily() {
    const brands = (navigator.userAgentData?.brands || []).map((b) => b.brand.toLowerCase());
    if (brands.some((b) => b.includes('edge'))) return 'edge';
    if (brands.some((b) => b.includes('opera') || b.includes('opr'))) return 'opera';
    if (brands.some((b) => b.includes('chromium') || b.includes('chrome'))) return 'chrome';
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'edge'; if (/OPR\//.test(ua)) return 'opera'; if (/Chrome\//.test(ua)) return 'chrome';
    return 'other';
  }
  function detectPlatformFamily() {
    const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
    if (platform.includes('win')) return 'windows'; if (platform.includes('mac')) return 'mac';
    if (platform.includes('cros') || platform.includes('chrome os')) return 'chromeos';
    if (platform.includes('linux')) return 'linux';
    return 'other';
  }
  // A coarse bucket, not the exact build number -- matches browser_version_bucket's role as a
  // dimension for "which versions produce errors", not a fingerprinting-grade signal.
  function detectBrowserVersionBucket() {
    const full = navigator.userAgentData?.brands?.find((b) => /chrom/i.test(b.brand))?.version || (navigator.userAgent.match(/Chrom(?:e|ium)\/(\d+)/) || [])[1];
    const major = parseInt(full, 10);
    return Number.isFinite(major) ? `${major}.x` : null;
  }

  async function analyticsEnabled() {
    const pref = await storageGet(ANALYTICS_PREF_KEY);
    return pref !== false; // default ON, per docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md section 4's disclosed default
  }

  let writeQueue = Promise.resolve();
  function serialize(fn) { writeQueue = writeQueue.then(fn, fn); return writeQueue; }

  async function logEvent(name, props) {
    if (!ALLOWED_EVENTS.has(name)) return; // never log or queue an ad hoc event name
    return serialize(async () => {
      const [installId, session, enabled] = await Promise.all([getInstallId(), getSessionId(), analyticsEnabled()]);
      const clean = sanitizeMetadata(props);
      // Top-level schema columns -- always camelCase at every call site, matching this codebase's
      // own convention (see props.pageType/blendLevel etc. below for the separate, allow-listed
      // metadata keys).
      const knownColumns = { subscription_tier: props?.subscriptionTier ?? null, mode: props?.mode ?? null, feature: props?.feature ?? null, result: props?.result ?? null, account_state: props?.accountState ?? null, error_class: props?.errorClass ?? null, error_code: props?.errorCode ?? null, acquisition_source: props?.acquisitionSource ?? null, campaign_id: props?.campaignId ?? null, duration_bucket: props?.durationMs !== undefined ? bucket(props.durationMs) : null, performance_bucket: props?.performanceMs !== undefined ? bucket(props.performanceMs) : null };

      // Local transparency log -- always kept, regardless of the network preference, so a user can
      // see what Scarlett would send even with analytics off.
      const logRow = { name, props: { ...clean, ...Object.fromEntries(Object.entries(knownColumns).filter(([, v]) => v != null)) }, ts: Date.now() };
      const log = (await storageGet(LOG_KEY)) || [];
      log.push(logRow); while (log.length > MAX_LOCAL_LOG) log.shift();
      await storageSet({ [LOG_KEY]: log });
      if (session.isNew) {
        const startedRow = { name: 'session_started', props: {}, ts: Date.now() };
        log.push(startedRow); while (log.length > MAX_LOCAL_LOG) log.shift();
        await storageSet({ [LOG_KEY]: log });
      }
      if (!enabled) return; // honor the preference: nothing below this line is ever queued for the network

      const queue = (await storageGet(QUEUE_KEY)) || [];
      const envelope = (eventName) => ({
        eventId: crypto.randomUUID(), eventName, eventVersion: 1,
        anonymousInstallId: installId, anonymousSessionId: session.id,
        scarlettVersion: chrome.runtime.getManifest?.().version || null,
        browserFamily: detectBrowserFamily(), browserVersionBucket: detectBrowserVersionBucket(), platformFamily: detectPlatformFamily(),
        acquisitionSource: knownColumns.acquisition_source || 'unknown', campaignId: knownColumns.campaign_id,
        accountState: knownColumns.account_state, subscriptionTier: knownColumns.subscription_tier,
        feature: knownColumns.feature, mode: knownColumns.mode, result: knownColumns.result,
        durationBucket: knownColumns.duration_bucket, performanceBucket: knownColumns.performance_bucket,
        errorClass: knownColumns.error_class, errorCode: knownColumns.error_code,
        metadata: clean,
      });
      if (session.isNew) queue.push(envelope('session_started'));
      queue.push(envelope(name));
      while (queue.length > MAX_QUEUE) queue.shift();
      await storageSet({ [QUEUE_KEY]: queue });
    });
  }

  // Only ever called from background.js's chrome.alarms tick -- see that file. Batched, bounded,
  // never invoked on a per-event or per-content-script basis.
  async function flushQueue() {
    const queue = (await storageGet(QUEUE_KEY)) || [];
    if (!queue.length) return { sent: 0 };
    const batch = queue.slice(0, FLUSH_BATCH_SIZE);
    try {
      const response = await fetch(TELEMETRY_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: batch }) });
      if (!response.ok) return { sent: 0 }; // leave the queue as-is; retried on the next tick
      const remaining = queue.slice(batch.length);
      await storageSet({ [QUEUE_KEY]: remaining });
      return { sent: batch.length };
    } catch { return { sent: 0 }; } // offline or unreachable -- best-effort, never blocks any feature
  }

  async function readLog() { return (await storageGet(LOG_KEY)) || []; }
  async function clearLog() { await chrome.storage.local.remove([LOG_KEY, QUEUE_KEY]); }
  async function setAnalyticsEnabled(value) { await storageSet({ [ANALYTICS_PREF_KEY]: value !== false }); }
  async function getAnalyticsEnabled() { return analyticsEnabled(); }

  scope.FTN_SCARLETT_ANALYTICS = { logEvent, readLog, clearLog, flushQueue, setAnalyticsEnabled, getAnalyticsEnabled, getInstallId, ALLOWED_EVENTS };
})(typeof self !== 'undefined' ? self : this);
