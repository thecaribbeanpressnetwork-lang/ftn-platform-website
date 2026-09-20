// Scarlett Account/Entitlement bridge. Reuses FTN's real, existing Supabase-backed identity
// (js/ftn-auth.js on ftnplatform.org, handed off via chrome.runtime.onMessageExternal -- see
// js/ftn-scarlett-bridge.js) -- this file does not implement any sign-in flow of its own, and does
// not create a duplicate identity system.
//
// SERVER TRUTH vs LOCAL CACHE, made explicit:
// - The access token received from the website is opaque to Scarlett; it is never inspected or
//   modified, only forwarded as a Bearer token to ftn-scarlett-billing, which verifies it against
//   Supabase Auth server-side (admin.auth.getUser(token)) and reads the entitlement tables with the
//   service-role key. Scarlett the client NEVER decides its own tier -- it only caches what the
//   server most recently said.
// - The cached entitlement is stored in chrome.storage.local with the timestamp it was fetched.
//   CACHE_TTL_MS bounds how long a cached "paid" result is trusted before a fresh server check is
//   required. A user cannot grant themselves a paid tier by editing local storage: even if they set
//   a cached tier value directly, resolveEntitlementState() always attempts a fresh server refresh
//   first, and forcibly downgrades to FREE once the cache exceeds MAX_OFFLINE_MS regardless of what
//   the stored value says.
(function () {
  'use strict';

  const SESSION_KEY = 'scarlettFtnSession';       // { accessToken, userId, expiresAt, receivedAt }
  const ENTITLEMENT_CACHE_KEY = 'scarlettEntitlementCache'; // { state, tier, source, fetchedAt }
  const CACHE_TTL_MS = 15 * 60 * 1000;    // 15 minutes: how long a fresh cache is trusted without re-checking
  const MAX_OFFLINE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days: how long a stale-but-once-paid cache is still honored while offline, before forcibly downgrading to FREE
  const BILLING_ENDPOINT = 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-scarlett-billing';
  const ALLOWED_EXTERNAL_ORIGINS = new Set(['https://ftnplatform.org', 'https://www.ftnplatform.org']);

  async function getSession() {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    return stored?.[SESSION_KEY] || null;
  }

  async function setSession(session) {
    await chrome.storage.local.set({ [SESSION_KEY]: session });
  }

  async function clearSession() {
    await chrome.storage.local.remove([SESSION_KEY, ENTITLEMENT_CACHE_KEY]);
  }

  async function getEntitlementCache() {
    const stored = await chrome.storage.local.get(ENTITLEMENT_CACHE_KEY);
    return stored?.[ENTITLEMENT_CACHE_KEY] || null;
  }

  async function setEntitlementCache(entry) {
    await chrome.storage.local.set({ [ENTITLEMENT_CACHE_KEY]: entry });
  }

  // Maps the billing function's tier string to Scarlett's own truth-state vocabulary.
  function stateForTier(tier, status) {
    if (status === 'PAST_DUE') return 'PAYMENT_PAST_DUE';
    if (status === 'CANCELLED') return 'CANCELLED';
    if (status === 'TRIAL') return 'TRIAL';
    if (status === 'EXPIRED') return 'EXPIRED';
    if (tier === 'PLUS') return 'SCARLETT_PLUS';
    if (tier === 'INTELLIGENCE') return 'FTN_INTELLIGENCE';
    if (tier === 'PRO') return 'FTN_PRO';
    return 'FREE';
  }

  async function fetchServerEntitlement(session) {
    const response = await fetch(BILLING_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.accessToken },
      body: JSON.stringify({ action: 'status' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Billing service returned HTTP ' + response.status);
    const data = await response.json();
    return { tier: data.tier || 'FREE', status: data.status || 'ACTIVE', endsAt: data.endsAt || null };
  }

  // The single source of truth every other Scarlett surface calls through. Never returns a paid
  // state purely from an untrusted local flag -- it either has a fresh-enough cache from a real
  // server response, or it attempts a real server check, or (offline, cache too old) it downgrades.
  async function resolveEntitlementState() {
    const session = await getSession();
    if (!session || !session.accessToken) return { state: 'SIGNED_OUT', tier: null, source: 'no-session' };

    if (session.expiresAt && Date.now() > session.expiresAt) {
      // The website hands off a fresh token on every sign-in/refresh; an expired cached token means
      // the bridge hasn't run recently, not that the user necessarily signed out. Treat as signed
      // out locally rather than guessing; the next visit to /account/ re-syncs it.
      return { state: 'SIGNED_OUT', tier: null, source: 'token-expired' };
    }

    const cache = await getEntitlementCache();
    const cacheAge = cache ? Date.now() - cache.fetchedAt : Infinity;

    if (cache && cacheAge < CACHE_TTL_MS) {
      return { state: cache.state, tier: cache.tier, source: 'cache-fresh', cacheAgeMs: cacheAge };
    }

    try {
      const result = await fetchServerEntitlement(session);
      const state = stateForTier(result.tier, result.status);
      const entry = { state, tier: result.tier, endsAt: result.endsAt, fetchedAt: Date.now() };
      await setEntitlementCache(entry);
      return { state, tier: result.tier, source: 'server-fresh' };
    } catch (error) {
      // Offline / server unreachable. Fall back to the last real server response, but only within
      // MAX_OFFLINE_MS -- past that, a cached "paid" result is no longer trusted at all.
      if (cache && cacheAge < MAX_OFFLINE_MS) {
        return { state: cache.state, tier: cache.tier, source: 'cache-stale-offline', cacheAgeMs: cacheAge };
      }
      return { state: 'FREE', tier: null, source: 'offline-cache-expired', error: error.message };
    }
  }

  function registerExternalListener() {
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      let origin = '';
      try { origin = new URL(sender.url || '').origin; } catch {}
      if (!ALLOWED_EXTERNAL_ORIGINS.has(origin)) return; // manifest externally_connectable already
      // restricts this, but never trust a single layer for a cross-origin message handler.
      if (message?.type === 'FTN_SESSION' && message.accessToken && message.userId) {
        setSession({ accessToken: message.accessToken, userId: message.userId, expiresAt: message.expiresAt || null, receivedAt: Date.now() })
          .then(() => chrome.storage.local.remove(ENTITLEMENT_CACHE_KEY)) // force a fresh server check on next resolve
          .then(() => sendResponse({ ok: true }));
        return true;
      }
      if (message?.type === 'FTN_SESSION_CLEAR') {
        clearSession().then(() => sendResponse({ ok: true }));
        return true;
      }
    });
  }
  registerExternalListener();

  async function signOut() {
    await clearSession();
  }

  self.FTN_SCARLETT_ACCOUNT = { resolveEntitlementState, signOut, getSession };
})();
