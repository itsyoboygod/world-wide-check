let title, fullHTMLTEXT = '';
let matchingTitles = [];
let badgeTextValues = {};


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentTabId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0].id;
      var tabUrl = tabs[0].url;
      sendResponse({ tabId: currentTabId, tabUrl: tabUrl });
    });
    return true;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const tabId = currentTab.id;

    if (tabId) {
      const subredditName = 'worldwidecheck';
      fetch(`https://www.reddit.com/r/${subredditName}/new.json`)
        .then(response => {
          return !response.ok ? new Error('Network response was not ok') : response.json();
        })
        .then(data => {
          const posts = data.data.children;
          posts.length !== 0 ? console.log(posts) : 'No data found !';

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
      chrome.action.setBadgeText(
        { text: badgeTextValue, tabId: tabId }, () => { });
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
});

// showNotification();

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