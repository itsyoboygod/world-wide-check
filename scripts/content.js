chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
  const currentTabId = response.tabId;
  // Use the currentTabId as needed
  console.log('Current Tab ID:', currentTabId);
});
