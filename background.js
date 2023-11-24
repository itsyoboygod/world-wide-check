async function something() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['popup/popup.js']
  });
}

let badgeTextValue = '';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.payload > 0) {
    setTxtBadge(`${request.payload}`);
    // showNotification();
  } else {
    setTxtBadge(`${request.payload = 0}`);
  }

  if (request.action === 'getCurrentTabId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0].id;
      var tabUrl = tabs[0].url;
      sendResponse({ tabId: currentTabId, tabUrl: tabUrl });
    });
    return true;
  }

  if (request.action === 'sendfullHTMLTEXT') {
    updateFullHTMLText(request.fullTxt);
  }
});

let matchCount = 0;
const matchingTitles = [];

let title = "postTitle";
let fullHTMLTEXT = '';

// FILTER fullHTMLTEXT AND FIND THE MATCHING TITLE FROM API FECTCH WITH REGEX AND PUT IN A ARRAY[],
//  THEN SET THE ARRAY.LENGTH AS THE badgeTextValue

function updateFullHTMLText(newValue) {
  fullHTMLTEXT = newValue;
  console.log(fullHTMLTEXT);
}

function updatedApiTitle(newTitle) {
  console.log(newTitle);
}

const regex = new RegExp(title, 'gi');

async function fetchPosts() {
  await fetch(`https://www.reddit.com/r/${subredditName}/new.json`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      const posts = data.data.children;
      posts.forEach((post) => {
        console.log(post.data.title)
        updatedApiTitle(post.data.title)
      })
      if (posts.length !== 0) {
      }
    })
    .catch(error => {
      console.log('Error occurred while fetching subreddit posts:', error);
    })
}

// ------------- NOTIFICATIONS -------------
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

// ------------- Badge -------------
function setTxtBadge(badgeTextValue) {
  chrome.action.setBadgeText(
    { text: badgeTextValue }, () => { });
}