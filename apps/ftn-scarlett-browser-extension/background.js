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
});
