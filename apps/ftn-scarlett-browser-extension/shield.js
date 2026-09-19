// Data Faucet / Shield: observation + optional blocking of third-party network activity.
// SCARLETT CORE (activeTab/scripting/storage) never touches this file's capabilities -- everything
// here is gated behind optional_permissions/optional_host_permissions in manifest.json, requested
// only when the user explicitly turns on Data Faucet Protection (see popup.js), never on install
// and never silently. importScripts'd by background.js (classic MV3 service worker script, not a
// module) so it shares background.js's top-level scope.
(function () {
  'use strict';

  const SHIELD_PERMISSIONS = { permissions: ['webRequest', 'declarativeNetRequest'], origins: ['<all_urls>'] };
  const DNR_RULE_ID_BASE = 1000;
  const EXCEPTIONS_KEY = 'scarlettShieldExceptions';
  const ENABLED_KEY = 'scarlettShieldEnabled';

  const tabLogs = new Map(); // tabId -> { requests: [{hostname,category,purpose,knownTracker,ts}] }
  const MAX_LOG_PER_TAB = 400;

  function recordRequest(details) {
    try {
      // Data Faucet answers "who is this page talking to?" -- the page's own origin is not a
      // third party. The top-level navigation itself (main_frame) is never a "connection this page
      // makes"; any other request whose initiator origin matches the request's own origin (a
      // same-origin asset/API call) is likewise excluded from the tally. Confirmed live: without
      // this, a plain page load counted its own origin as an "UNKNOWN" external connection.
      if (details.type === 'main_frame') return;
      const url = new URL(details.url);
      if (details.initiator && details.initiator === url.origin) return;
      const info = self.FTN_SCARLETT_TRACKERS.classify(url.hostname);
      const log = tabLogs.get(details.tabId) || { requests: [] };
      log.requests.push({
        hostname: url.hostname,
        category: info.category,
        purpose: info.purpose,
        knownTracker: info.knownTracker,
        matchedDomain: info.matchedDomain,
        ts: Date.now(),
      });
      if (log.requests.length > MAX_LOG_PER_TAB) log.requests.shift();
      tabLogs.set(details.tabId, log);
    } catch { /* malformed/unsupported URL -- skip, never throw inside a webRequest listener */ }
  }

  function registerObserver() {
    if (!chrome.webRequest || chrome.webRequest.onBeforeRequest.hasListener(recordRequest)) return;
    chrome.webRequest.onBeforeRequest.addListener(recordRequest, { urls: ['<all_urls>'] });
  }
  function unregisterObserver() {
    try { chrome.webRequest?.onBeforeRequest.removeListener(recordRequest); } catch {}
    tabLogs.clear();
  }

  chrome.tabs?.onRemoved.addListener((tabId) => tabLogs.delete(tabId));
  // Clear a tab's log on navigation so Data Faucet always reflects only the current page load, not
  // an ever-growing cross-navigation history (privacy: this is transient, in-memory, per-tab only).
  chrome.webNavigation?.onBeforeNavigate.addListener((details) => { if (details.frameId === 0) tabLogs.delete(details.tabId); });

  async function isGranted() {
    return new Promise((resolve) => chrome.permissions.contains(SHIELD_PERMISSIONS, resolve));
  }

  async function getExceptions() {
    const stored = await chrome.storage.local.get(EXCEPTIONS_KEY);
    return stored?.[EXCEPTIONS_KEY] || [];
  }

  async function applyBlockingRules(enabled) {
    if (!chrome.declarativeNetRequest) return;
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r) => r.id);
    if (removeRuleIds.length) await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
    if (!enabled) return;
    const exceptions = await getExceptions();
    const domains = self.FTN_SCARLETT_TRACKERS.blockableDomains();
    const addRules = domains.map((d, i) => ({
      id: DNR_RULE_ID_BASE + i,
      priority: 1,
      action: { type: 'block' },
      condition: {
        requestDomains: [d.domain],
        resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'ping', 'media', 'other'],
        excludedInitiatorDomains: exceptions.length ? exceptions : undefined,
      },
    }));
    if (addRules.length) await chrome.declarativeNetRequest.updateDynamicRules({ addRules });
  }

  async function shieldStatus() {
    const granted = await isGranted();
    const stored = await chrome.storage.local.get(ENABLED_KEY);
    const enabled = !!(granted && stored?.[ENABLED_KEY]);
    return { granted, enabled };
  }

  async function requestShield() {
    // Must be called from a genuine user gesture context (the popup's own click handler) --
    // chrome.permissions.request() refuses to run otherwise. This is the ONLY place Scarlett ever
    // asks for a permission beyond Core, and only after the user explicitly clicked "Turn on".
    const granted = await new Promise((resolve) => chrome.permissions.request(SHIELD_PERMISSIONS, resolve));
    if (granted) {
      registerObserver();
      await chrome.storage.local.set({ [ENABLED_KEY]: true });
      await applyBlockingRules(true);
    }
    return { granted };
  }

  async function revokeShield() {
    unregisterObserver();
    await applyBlockingRules(false);
    await chrome.storage.local.set({ [ENABLED_KEY]: false });
    await chrome.storage.local.remove(EXCEPTIONS_KEY);
    return new Promise((resolve) => chrome.permissions.remove(SHIELD_PERMISSIONS, (removed) => {
      if (chrome.runtime.lastError) { resolve({ removed: false, error: chrome.runtime.lastError.message }); return; }
      resolve({ removed: !!removed });
    }));
  }

  async function toggleBlocking(enabled) {
    await chrome.storage.local.set({ [ENABLED_KEY]: !!enabled });
    await applyBlockingRules(!!enabled);
    return { enabled: !!enabled };
  }

  async function addSiteException(hostname) {
    const exceptions = await getExceptions();
    if (!exceptions.includes(hostname)) exceptions.push(hostname);
    await chrome.storage.local.set({ [EXCEPTIONS_KEY]: exceptions });
    const status = await shieldStatus();
    if (status.enabled) await applyBlockingRules(true);
    return { exceptions };
  }

  async function faucetSummary(tabId) {
    const log = tabLogs.get(tabId) || { requests: [] };
    const status = await shieldStatus();
    const domains = new Map();
    for (const req of log.requests) {
      const existing = domains.get(req.hostname) || { hostname: req.hostname, category: req.category, purpose: req.purpose, knownTracker: req.knownTracker, matchedDomain: req.matchedDomain, count: 0 };
      existing.count += 1;
      domains.set(req.hostname, existing);
    }
    const rows = Array.from(domains.values()).map((row) => ({
      ...row,
      status: status.enabled && row.knownTracker ? 'BLOCKED' : row.category === 'FUNCTIONALLY_REQUIRED' ? 'FUNCTIONALLY_REQUIRED' : row.knownTracker ? 'ALLOWED' : 'UNKNOWN',
    }));
    return {
      shieldGranted: status.granted,
      shieldEnabled: status.enabled,
      totalConnections: rows.length,
      knownTrackers: rows.filter((r) => r.knownTracker).length,
      byCategory: {
        ANALYTICS: rows.filter((r) => r.category === 'ANALYTICS').length,
        ADVERTISING: rows.filter((r) => r.category === 'ADVERTISING').length,
        SOCIAL: rows.filter((r) => r.category === 'SOCIAL').length,
        FUNCTIONALLY_REQUIRED: rows.filter((r) => r.category === 'FUNCTIONALLY_REQUIRED').length,
        UNKNOWN: rows.filter((r) => r.category === 'UNKNOWN').length,
      },
      blocked: rows.filter((r) => r.status === 'BLOCKED').length,
      allowed: rows.filter((r) => r.status !== 'BLOCKED').length,
      rows: rows.slice(0, 60),
    };
  }

  // Service workers restart often; re-attach the observer on every startup if the permission was
  // already granted in an earlier session (chrome.permissions state persists across restarts even
  // though in-memory listeners do not).
  isGranted().then((granted) => { if (granted) registerObserver(); });

  self.FTN_SCARLETT_SHIELD = { shieldStatus, requestShield, revokeShield, toggleBlocking, addSiteException, faucetSummary };
})();
