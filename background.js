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
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'matchingTitleSelected',
        payload: request.payload,
        flair: request.flair,
        clrFlair: request.clrFlair
      });
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const tabId = currentTab.id;

    if (tabId === tabId) {
      async function fetchSubredditPosts() {
        try {
          const subredditName = 'worldwidecheck';
          const response = await fetch(`https://www.reddit.com/r/${subredditName}/new.json`)
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json()
          const posts = data.data.children || []

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
        } catch (error) { console.log(`Error fetching data`, error) }
      }
      fetchSubredditPosts();

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

    function setTxtBadge(badgeTextValues, tabId) {
      if (request.action === 'matchingTitleSelected') {
        if (badgeTextValues > 0) {
          chrome.action.setBadgeText({ text: badgeTextValues, tabId: tabId });
          chrome.action.setBadgeBackgroundColor({ color: request.clrFlair, tabId: tabId });
          showNotification();
        }
      }
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

chrome.runtime.onInstalled.addListener(() => {
  // Clear any existing context menu items
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "flag-suspicious-paragraph",
      title: "Report with World Wide Check!",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "flag-suspicious-paragraph") {
    const flairs = ["Reported", "Suspicious", "Misleading", "False", "Needs Verification", "Spam"];

    chrome.tabs.sendMessage(tab.id, {
      action: "openFlagModal",
      flags: flairs,
      selectedText: info.selectionText,
    });
  }
});

function updateFullHTMLText(newValue) {
  fullHTMLTEXT !== newValue ? fullHTMLTEXT = newValue : ""
}

// function showNotification() {
//   const options = {
//     type: "basic",
//     title: "Online Information Warning ⚠️",
//     message: "World Wide Check community has reported suspicious information on this site! Open the extension to see it.",
//     iconUrl: "/img/path_256x256.png"
//   }
//   chrome.notifications.create(options, () => {
//     chrome.runtime.lastError ? console.error("Error creating notification:", chrome.runtime.lastError) : '';
//   });
// }