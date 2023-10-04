// Add the getCurrentTabId function
  async function something(){
    // Execute your scripts here
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['popup/popup.js']
    });
  }

// Send the tab ID to popup.js  
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message) => {
    if (message.action === 'sendTabId') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { tabUrl, tabId });
      });
    }
  });
});

let badgeTextValue = '';
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // if (request.action == 'showNotification') {
    if (request.payload > 0) {
      setTxtBadge(`${request.payload}`);
      showNotification();
    }else{
      setTxtBadge(`${request.payload = 0}`);
    }
  //   sendResponse({});
  // }

  if (request.action === 'getCurrentTabId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0].id;
      var tabUrl = tabs[0].url;
      sendResponse({ tabId: currentTabId, tabUrl: tabUrl });
    });
    return true;
  }

  if (request.source === 'content.js') {
    const activeTab = request.tab;
    console.log(activeTab);
    sendResponse({});
  }
});

function showNotification() {
  if (!chrome.notifications) {
    console.error("Notifications not supported in this environment.");
    return;
  }

  const options = {
    type: "basic",
    title: "Online Information Warning ⚠️",
    message: "World Wide Check community has reported suspicious information on this site.",
    iconUrl: "/img/ofc_logo_256x256.png"
  };

  chrome.notifications.create(options, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error("Error creating notification:", chrome.runtime.lastError);
      return;
    }

    // Add a click event listener for the notification
    chrome.notifications.onClicked.addListener((clickedNotificationId) => {
      if (clickedNotificationId === notificationId) {
        // Open the extension's popup when the notification is clicked
        chrome.action.setPopup({ popup: '/popup/popup.html' });
      }
    });
  });
}

// Function to get the tab ID of the currently active tab
function getTabId(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const tabId = tabs[0].id;
      callback(tabId);
    } else {
      console.error("No active tabs found.");
    }
  });
}

function setTxtBadge(badgeTextValue) {
  getTabId((tabId) => {
    chrome.action.setBadgeText(
      {
        text: badgeTextValue,
        tabId: tabId,
      },
      () => {});
  });
}