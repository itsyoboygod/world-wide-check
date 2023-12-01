let currentTabId = null;
let tabUrl = null;
let tabId = null;
let isDataLoaded = false;

// Request the current tab ID from background.js
chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
  currentTabId = response.tabId;
  tabUrl = response.tabUrl
});

function createP() { return document.createElement('p') }

function createPostElement(postData, tabCount) {
  const liElement = document.createElement('li');
  liElement.classList.add('li__table');

  const detailsElement = document.createElement('details');
  detailsElement.setAttribute('name', 'detalhes');

  const summaryElement = document.createElement('summary');
  const reportNumber = createP()
  reportNumber.id = 'id_report_data';
  reportNumber.textContent = `REPORT#${tabCount + 1}`;
  summaryElement.appendChild(reportNumber);

  const titleElement = createP()
  titleElement.id = `id_report_title_${postData.post_id}`; // Use unique ID for each title element
  titleElement.textContent = postData.title;

  const hrElement1 = document.createElement('hr');
  hrElement1.classList.add('hr-status');
  hrElement1.setAttribute('data-hr_status', 'verified');

  const textElement = createP()
  textElement.id = `id_report_text_${postData.post_id}`; // Use unique ID for each text element
  textElement.classList.add('veryfied');
  textElement.textContent = postData.text;

  const infoColElement = document.createElement('div');
  infoColElement.classList.add('li__info__col');

  const idReportDataElement = summaryElement.querySelector('#id_report_data');
  idReportDataElement.dataset.flair = postData.flair;

  const infoElements = [
    { id: 'info__id', dataAttribute: 'data-id', dataValue: postData.post_id },
    { id: 'info__url', dataAttribute: 'data-url', dataValue: postData.fURL },
    { id: 'info__score', dataAttribute: 'data-score', dataValue: postData.score },
  ];

  infoElements.forEach((info) => {
    const infoElement = createP()
    infoElement.id = info.id;
    infoElement.classList.add('info__col');
    infoElement.textContent = `${info.dataValue}`;
    infoElement.setAttribute(info.dataAttribute, info.dataValue);
    infoColElement.appendChild(infoElement);
  });

  const threadLinkElement = document.createElement('a');
  threadLinkElement.id = `info__thread`;
  threadLinkElement.classList.add('info__col');
  threadLinkElement.href = postData.thread_link;
  threadLinkElement.textContent = postData.thread_link;
  threadLinkElement.target = '_blank';
  infoColElement.appendChild(threadLinkElement);

  detailsElement.append(summaryElement, titleElement, hrElement1, textElement, infoColElement);
  liElement.appendChild(detailsElement);
  return liElement;
}

function fetchSubredditPosts() {
  const postListElement = document.getElementById('popup-container');
  postListElement ? postListElement.innerHTML : "Clear existing posts [error]";
  const subredditName = 'worldwidecheck';
  // const subredditName = 'BACHARELOVE';

  const loadingSpinner = createLoadingSpinner();
  postListElement ? postListElement.appendChild(loadingSpinner) : "eppend loadin spinner [error]";

  fetch(`https://www.reddit.com/r/${subredditName}/new.json`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      const posts = data.data.children;
      isDataLoaded = true;
      posts.length !== 0 ? displayPosts(posts) : 'No data found !';
    })
    .catch(error => {
      console.log('Error occurred while fetching subreddit posts:', error);
      isDataLoaded = true;

      const errorParagraph = document.createElement('p')
      errorParagraph.textContent = 'Network error, please wait and try again.';
      errorParagraph.classList.add('sver_network-error');
      postListElement.appendChild(errorParagraph);
    }).finally(() => {
      removeLoadingMsg()
      removeLoadingSpinner();
    })
}

function createLoadingSpinner() {
  const loadingSpinner = document.createElement('div');
  loadingSpinner.classList.add('loader');
  return loadingSpinner;
}

function removeLoadingSpinner() {
  const loadingSpinner = document.querySelector('.loader');
  loadingSpinner ? loadingSpinner.remove() : "remove loading spiner [error]"
}

function removeLoadingMsg() {
  const loadingmsg = document.getElementById("loading-message")
  loadingmsg ? loadingmsg.remove() : "remove loading message [error]"
}

async function displayPosts(posts) {
  const ulElement = document.createElement('ul');
  ulElement.id = 'post_list';
  ulElement.classList.add('ul__table');
  ulElement.innerHTML = '';
  // console.log("total subreddits posts: ", posts.length)
  const postnewData = posts;
  const matchingTitles = [];

  postnewData.forEach((post, index) => {
    const fURL = extractURLFromText(post.data.selftext);
    const postData = {
      reportNumber: index + 1,
      title: post.data.title,
      text: post.data.selftext,
      post_id: post.data.id,
      fURL,
      source: post.data.source,
      score: post.data.score,
      flair: post.data.link_flair_text,
      thread_link: post.data.url
    };

    if (postData.fURL === tabUrl) {
      const postElement = createPostElement(postData, ulElement.querySelectorAll('li').length);
      ulElement.appendChild(postElement);
    }
  });

  const popupContainer = document.getElementById('popup-container');
  popupContainer ? popupContainer.appendChild(ulElement) : "popupContainer.appendChild(ulElement)/Line:177";

  if (ulElement.querySelectorAll('li').length === 0) {
    const noDataParagraph = createP()
    noDataParagraph.textContent = 'All clear. No data found on this page!';
    noDataParagraph.classList.add('no-data-found');
    popupContainer ? popupContainer.appendChild(noDataParagraph) : "popupContainer.appendChild(noDataParagraph)/error";
  }

  // Update data-tab attribute values
  const labels = document.querySelectorAll('.tabs__label');
  labels.forEach((label) => {
    let tabCount = ulElement.querySelectorAll('li').length;
    label.setAttribute('data-tab', tabCount);
    let msg = tabCount
    chrome.runtime.sendMessage({ action: 'showNotification', payload: msg });
  });
}

function extractURLFromText(text) {
  const regex = /\[.*?\]\((.*?)\)/;
  const matches = text.match(regex);
  return matches && matches.length > 1 ? matches[1] : '';
}

//  setTimeout(()=>{
   fetchSubredditPosts(currentTabId);
//  }, 2000)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopupInCurrentTab') {
    // Open the extension's popup
    chrome.action.openPopup();
  }
});