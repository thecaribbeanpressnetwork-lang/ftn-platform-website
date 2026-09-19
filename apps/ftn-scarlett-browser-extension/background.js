chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SCARLETT_OPEN_IBIS') return;
  chrome.tabs.create({ url:'https://ftnplatform.org/ibis-ai/' });
});
