const MENU_ID = 'ask-ftn-ibis';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Ask FTN ibis about “%s”',
      contexts: ['selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;
  const query = info.selectionText.trim().slice(0, 160);
  if (!query) return;
  chrome.tabs.create({ url: chrome.runtime.getURL('results.html?q=' + encodeURIComponent(query)) });
});
