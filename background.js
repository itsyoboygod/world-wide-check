let title, fullHTMLTEXT = '';
let matchingTitles = [];
let badgeTextValues = {};
let currentTabId, tabUrl = null

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentTabId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTabId = tabs[0].id;
      tabUrl = tabs[0].url;
      sendResponse({ tabId: currentTabId, tabUrl: tabUrl });
    });
    return true;
  }

  if (request.action === 'matchingTitleSelected') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'matchingTitleSelected',
        payload: request.payload, 
        flair: request.flair, 
        clrFlair: request.clrFlair});
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const tabId = currentTab.id;

    if (tabId === tabId) {
      const subredditName = 'worldwidecheck';
      fetch(`https://www.reddit.com/r/${subredditName}/new.json`)
        .then(response => {
          return !response.ok ? new Error('Network response was not ok') : response.json();
        })
        .then(data => {
          const posts = data.data.children;
          posts.forEach(post => {
            const postData = {
              title: post.data.title
            }
            if (request.action === 'sendfullHTMLTEXT') {
              updateFullHTMLText(request.fullTxt)
              getPostTitle(postData.title, request.fullTxt)
            }
          });
          const matchesBadges = badgeTextValues[tabId] || 0;
          setTxtBadge(matchesBadges.toString(), tabId);
        })
        .catch(error => {
          console.log('Error occurred while fetching subreddit posts:', error);
        }).finally(() => {
        })

      function getPostTitle(newTitle, fulltxt) {
        if (fulltxt.trim().toLowerCase().includes(newTitle.toLowerCase())) {
          console.log(`Matching title found: ${newTitle}`);
          badgeTextValues[tabId] = (badgeTextValues[tabId] || 0) + 1;
          matchingTitles.push(newTitle)
        } else {
          console.log('no match found')
        }
      }
    }

    // ------------- Badge -------------
    function setTxtBadge(badgeTextValue, tabId) {
      chrome.action.setBadgeText({ text: badgeTextValue, tabId: tabId }, () => { });
      // badgeTextValue > 0 ? showNotification() : 'error notification !'
    }
  });

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
  badgeTextValues = {}
});

function updateFullHTMLText(newValue) {
  if (fullHTMLTEXT !== newValue) {
    fullHTMLTEXT = newValue;
    console.log(fullHTMLTEXT);
  }
}

// ------------- NOTIFICATIONS -------------
function showNotification() {
  const options = {
    type: "basic",
    title: "Online Information Warning ⚠️",
    message: "World Wide Check community has reported suspicious information on this site! Open the extension to see it.",
    iconUrl: "/img/ofc_logo_256x256.png"
  }
  chrome.notifications.create(options, (notificationId) => {
    chrome.runtime.lastError ? console.error("Error creating notification:", chrome.runtime.lastError) : '';

    // Add a click event listener for the notification
    chrome.notifications.onClicked.addListener((clickedNotificationId) => {
      if (clickedNotificationId === notificationId) {
        // Open the popup when the notification is clicked
        // chrome.action.openPopup();
      }
    });
  });
}
