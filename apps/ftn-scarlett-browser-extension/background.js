importScripts('tracker-registry.js', 'shield.js', 'analytics.js', 'account-bridge.js');

// The session storage area defaults to accessLevel 'TRUSTED_CONTEXTS' -- extension pages and the
// background worker only. content.js (a content script, an "untrusted context" for this API)
// writes to that area for the ibis/Headspace handoff, and ibis-handoff.js reads it back the same
// way on the destination page. Without the call below, both of those throw "Access to storage is
// not allowed from this context" and the entire handoff silently fails -- found live, end to end,
// in this session's integration QA (clicking "Ask ibis about this page" produced exactly that
// error and never opened ibis at all). This is a pre-existing defect inherited from the original
// V1 scaffold, not something introduced this pass -- fixed here.
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') self.FTN_SCARLETT_ANALYTICS.logEvent('install', {});
  else if (details.reason === 'update') self.FTN_SCARLETT_ANALYTICS.logEvent('extension_updated', {});
  // 'chrome_update'/'shared_module_update' are not a Scarlett-meaningful product event -- not logged.
});

// Batched, bounded telemetry delivery -- chrome.alarms is the MV3-correct primitive for this (a
// service worker is not persistent; setInterval would not survive suspension). One tick every 2
// minutes, each tick sends at most one batch (analytics.js's FLUSH_BATCH_SIZE) -- this is "bounded
// event emission", never continuous transmission or a liveness ping.
chrome.alarms.create('scarlett-telemetry-flush', { periodInMinutes: 2 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'scarlett-telemetry-flush') self.FTN_SCARLETT_ANALYTICS.flushQueue();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SCARLETT_OPEN_IBIS') {
    const url = message.escalation === 'HEADSPACE'
      ? 'https://ftnplatform.org/ibis-headspace-preview/'
      : 'https://ftnplatform.org/ibis-ai/';
    chrome.tabs.create({ url });
    return;
  }
  if (message?.type === 'SCARLETT_CAPTURE_TAB') {
    // Compare's ephemeral pre-transformation viewport capture. Relies entirely on the same
    // activeTab grant the popup/scripting injection already used for this tab this session -- no
    // broader host permission is requested for this. The captured image never leaves the browser:
    // it is handed straight back to the requesting content script and displayed locally, never
    // written to storage or sent anywhere.
    const windowId = sender.tab?.windowId;
    if (windowId == null) { sendResponse({ ok: false, error: 'No window context available for capture.' }); return; }
    chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 70 }, (dataUrl) => {
      if (chrome.runtime.lastError) { sendResponse({ ok: false, error: chrome.runtime.lastError.message }); return; }
      sendResponse({ ok: true, dataUrl });
    });
    return true;
  }

  // Data Faucet / Shield -- all gated on the optional permission bundle requested only via
  // SCARLETT_SHIELD_REQUEST, which must originate from a genuine user gesture in the popup.
  if (message?.type === 'SCARLETT_SHIELD_STATUS') {
    self.FTN_SCARLETT_SHIELD.shieldStatus().then((r) => sendResponse({ ok: true, ...r }));
    return true;
  }
  if (message?.type === 'SCARLETT_SHIELD_REQUEST') {
    self.FTN_SCARLETT_SHIELD.requestShield().then((r) => sendResponse({ ok: true, ...r }));
    return true;
  }
  if (message?.type === 'SCARLETT_SHIELD_REVOKE') {
    self.FTN_SCARLETT_SHIELD.revokeShield().then((r) => sendResponse({ ok: true, ...r }));
    return true;
  }
  if (message?.type === 'SCARLETT_SHIELD_TOGGLE') {
    self.FTN_SCARLETT_SHIELD.toggleBlocking(message.enabled).then((r) => sendResponse({ ok: true, ...r }));
    return true;
  }
  if (message?.type === 'SCARLETT_SHIELD_EXCEPTION_ADD') {
    self.FTN_SCARLETT_SHIELD.addSiteException(message.hostname).then((r) => sendResponse({ ok: true, ...r }));
    return true;
  }
  if (message?.type === 'SCARLETT_FAUCET_SUMMARY') {
    const tabId = sender.tab?.id;
    if (tabId == null) { sendResponse({ ok: false, error: 'No tab context available.' }); return; }
    self.FTN_SCARLETT_SHIELD.faucetSummary(tabId).then((r) => sendResponse({ ok: true, ...r }));
    return true;
  }

  // Account/entitlement -- reads the session the website handed off via externally_connectable
  // (see account-bridge.js's onMessageExternal listener) and resolves real, server-checked
  // entitlement truth. Never trusts a purely local flag as subscription truth.
  if (message?.type === 'SCARLETT_ACCOUNT_STATUS') {
    self.FTN_SCARLETT_ACCOUNT.resolveEntitlementState().then((r) => sendResponse({ ok: true, ...r }));
    return true;
  }
  if (message?.type === 'SCARLETT_ACCOUNT_SIGN_OUT') {
    self.FTN_SCARLETT_ACCOUNT.signOut().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === 'SCARLETT_ACCOUNT_OPEN_SIGN_IN') {
    chrome.tabs.create({ url: 'https://ftnplatform.org/account/?return=' + encodeURIComponent('/account/') });
    return;
  }
});
