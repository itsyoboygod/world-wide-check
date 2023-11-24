// Add the getCurrentTabId function
async function something() {
  // Execute your scripts here
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['popup/popup.js', '/scripts/txtHtml.js']
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_page_content') {
    const pageContent = request.txtHtml;
    console.log(pageContent)

    fetchApiPosts().then(allApiReports => {
      // Create a regex pattern from the API reports.
      const apiReportsPattern = new RegExp(allApiReports, 'gi');

      // Use the regex pattern to search for matches in the page content.
      const matches = pageContent.match(apiReportsPattern);

      if (matches && matches.length > 0) {
        console.log('Found matches in page content:', matches);
        setTxtBadge(matches.length.toString());
      } else {
        console.log('No matches found in page content.');
        setTxtBadge('bruh');
      }})





    let matchingTitles = [];
    let badgeCount = matchingTitles.length
    if (badgeCount > 0) {
      setTxtBadge(badgeCount.toString())
    } else {
      badgeCount = 'bruh'
      setTxtBadge(badgeCount.toString())
    }
  }

  if (request.action === 'getCurrentTabId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0].id;
      var tabUrl = tabs[0].url;
      sendResponse({ tabId: currentTabId, tabUrl: tabUrl });
    });
    return true;
  }
});

const subredditName = 'worldwidecheck';
function fetchApiPosts() {
  return new Promise((resolve, reject) => {
    fetch(`https://www.reddit.com/r/${subredditName}/new.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        const posts = data.data.children;
        if (posts.length !== 0) {
          const allApiReports = posts.map(titlex => titlex.data.title).join('\n');
          console.log(allApiReports);
          resolve(allApiReports);
        } else {
          resolve(''); // Resolve with an empty string if there are no posts.
        }
      })
      .catch(error => {
        console.log('Error occurred while fetching subreddit posts:', error);
        reject(error);
      });
  });
}
fetchApiPosts()
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

let badgeTextValue = '';
function setTxtBadge(badgeTextValue) {
  getTabId((tabId) => {
    chrome.action.setBadgeText(
      {
        text: badgeTextValue,
        tabId: tabId,
      },
      () => { });
  });
}