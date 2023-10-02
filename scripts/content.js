chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
  const currentTabId = response.tabId;
  // console.log('Current Tab ID:', currentTabId);
});
