chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SCARLETT_OPEN_IBIS') return;
  const url = message.escalation === 'HEADSPACE'
    ? 'https://ftnplatform.org/ibis-headspace-preview/'
    : 'https://ftnplatform.org/ibis-ai/';
  chrome.tabs.create({ url });
});
