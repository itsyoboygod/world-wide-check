let badgeTextValue, title, fullHTMLTEXT = '';
let matchCount = 0;
const matchingTitles = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.payload > 0) {
    setTxtBadge(`${request.payload}`);
  } else setTxtBadge(`${request.payload = 0}`);

  if (request.action === 'getCurrentTabId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0].id;
      var tabUrl = tabs[0].url;
      sendResponse({ tabId: currentTabId, tabUrl: tabUrl });
    });
    return true;
  }
  request.action === 'sendfullHTMLTEXT' ? updateFullHTMLText(request.fullTxt) : "request.action === sendfullHTMLTEXT [fail]"

  if (request.action === 'openPopupInCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab) {
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          function: () => {
            chrome.runtime.sendMessage({ action: 'openPopup' });
          },
        });
      }
    });
  }

});

showNotification();

function updateFullHTMLText(newValue) {
  fullHTMLTEXT = newValue;
  console.log(fullHTMLTEXT);
}

// ------------- NOTIFICATIONS -------------
function showNotification() {
  const options = {
    type: "basic",
    title: "Online Information Warning ⚠️",
    message: "World Wide Check community has reported suspicious information on this site.",
    iconUrl: "/img/ofc_logo_256x256.png"
  };

  chrome.notifications.create(options, (notificationId) => {
    chrome.runtime.lastError ? console.error("Error creating notification:", chrome.runtime.lastError) : ''
    // Add a click event listener for the notification
    chrome.notifications.onClicked.addListener((clickedNotificationId) => {
        if (clickedNotificationId === notificationId) {
            // Open the popup in the current tab when the notification is clicked
            chrome.runtime.sendMessage({ action: 'openPopupInCurrentTab' });
        }
    });
  });
  return !chrome.notifications ? console.error("Notifications not supported in this environment.") : ''
}

// ------------- Badge -------------
function setTxtBadge(badgeTextValue) {
  chrome.action.setBadgeText(
    { text: badgeTextValue }, () => { });
}