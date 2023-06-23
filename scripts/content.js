// content.js

// Get the currently active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    // Console log the active tab
    console.log(activeTab);
    // Send the active tab to the background script
    chrome.runtime.sendMessage({ source: 'content.js', tab: activeTab }, (response) => {
      // Handle the response, if needed
    });
  });
  