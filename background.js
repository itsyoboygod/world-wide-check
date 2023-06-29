//  console.log('background running!')


// Add the getCurrentTabId function
function getCurrentTabId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0].id;
      resolve(currentTabId);
    });
  });
}


chrome.action?.onClicked.addListener(async(tab) => {
     await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['popup.js', 'content.js']
  });
});

// Send the tab ID to popup.js
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message) => {
    if (message.action === 'sendTabId') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        chrome.tabs.get(tabId, function(tab) {
          chrome.tabs.sendMessage(tabId, { tabUrl, tabId });
        });
      });
    }
  });
});


// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

  if (request.action === 'getCurrentTabId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0].id;
      var tabUrl = tabs[0].url;
      sendResponse({ tabId: currentTabId, tabUrl: tabUrl });
    });
    return true; // Add this line to indicate that we will respond asynchronously
  }

  if (request.source === 'content.js') {
    const activeTab = request.tab;
    console.log(activeTab);
    // Use the active tab information as needed
    
    sendResponse({
      //     source: "backgroundResponse", 
      //     payload: "Hello from background!" 
    });
  }

  if (request.source === "popup.js") {
    // console.log(`
    //  ${request.source} , 
    //  ${request.payload.message}
    // `);
    sendResponse({
      //     source: "backgroundResponse", 
      //     payload: "Hello from background!" 
    });
  }

  let window = self
  window.word = "coding train"
  if (request.source === "wordselec.js") {
    // console.log(`
    //  ${request.source} , 
    //  ${window.word = request.payload.message}
    // `);
    sendResponse({
      //     source: "backgroundResponse", 
      //     payload: "Hello from background!" 
    });
  }

});