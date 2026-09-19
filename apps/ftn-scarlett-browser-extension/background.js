importScripts('tracker-registry.js', 'shield.js', 'analytics.js');

chrome.runtime.onInstalled.addListener((details) => {
  self.FTN_SCARLETT_ANALYTICS.logEvent('activation', { reason: details.reason });
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
});
