document.addEventListener('DOMContentLoaded', () => {

  let isDataLoaded = false; // Track if data is already loaded
  let currentTabId = null; // Store the current tab ID

  // Request the current tab ID from background.js
  chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
    const currentTabId = response.tabId;
    // Use the currentTabId as needed
    console.log('Current Tab ID:', currentTabId);
  });


  function createPostElement(postData) {
    const liElement = document.createElement('li');
    liElement.classList.add('li__table');

    const detailsElement = document.createElement('details');
    detailsElement.setAttribute('name', 'detalhes');

    const summaryElement = document.createElement('summary');
    const reportNumber = document.createElement('p');
    reportNumber.id = 'id_report_data';
    reportNumber.textContent = `REPORT#${postData.reportNumber}`;
    summaryElement.appendChild(reportNumber);

    const titleElement = document.createElement('p');
    titleElement.id = `id_report_title_${postData.post_id}`; // Use unique ID for each title element
    titleElement.textContent = postData.title;

    const hrContainerElement = document.createElement('div');
    hrContainerElement.classList.add('hr-container-veryfied');
    const hrElement1 = document.createElement('hr');
    const hrTextElement = document.createElement('span');
    hrTextElement.classList.add('hr-text-veryfied');
    hrTextElement.textContent = 'Verified';
    const hrElement2 = document.createElement('hr');
    hrContainerElement.append(hrElement1, hrTextElement, hrElement2);

    const textElement = document.createElement('p');
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
      { id: 'info__source', dataAttribute: 'data-source', dataValue: postData.source },
      { id: 'info__score', dataAttribute: 'data-score', dataValue: postData.score },
      { id: 'info__thread', dataAttribute: 'data-thread', dataValue: postData.thread_link },
    ];

    infoElements.forEach((info) => {
      const infoElement = document.createElement('p');
      infoElement.id = info.id;
      infoElement.classList.add('info__col');
      infoElement.textContent = `${info.dataValue}`;
      infoElement.setAttribute(info.dataAttribute, info.dataValue);
      infoColElement.appendChild(infoElement);
    });

    detailsElement.append(summaryElement, titleElement, hrContainerElement, textElement, infoColElement);
    liElement.appendChild(detailsElement);
    return liElement;
  }

  function fetchSubredditPosts(scanButton, currentTabId) {
    scanButton.disabled = true;
    scanButton.removeEventListener('click', scanButtonOnclick);

    const postListElement = document.getElementById('popup-container');

    postListElement.innerHTML = ''; // Clear existing posts

    const subredditName = 'worldwidecheck';
    // const subredditName = 'BACHARELOVE';

    const loadingSpinner = createLoadingSpinner();
    postListElement.appendChild(loadingSpinner); // Add the loading spinner

    fetch(`https://www.reddit.com/r/${subredditName}/new.json?tabId=${currentTabId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        const posts = data.data.children;
        isDataLoaded = true;

        if (posts.length !== 0) {
          displayPosts(posts, currentTabId);
        } else {
          showNoDataMessage();
        }
      })
      .catch(error => {
        console.log('Error occurred while fetching subreddit posts:', error);
        isDataLoaded = true;

        // Display the network error message
        const errorParagraph = document.createElement('p');
        errorParagraph.textContent = 'Network error, please wait and try again.';
        errorParagraph.classList.add('sver_network-error');
        postListElement.appendChild(errorParagraph);
      }).finally(() => {
        removeLoadingSpinner(); // Remove the loading spinner
        scanButton.disabled = false
        scanButton.addEventListener('click', scanButtonOnclick);
      })
  }

  function createLoadingSpinner() {
    const loadingSpinner = document.createElement('div');
    loadingSpinner.classList.add('loader');
    return loadingSpinner;
  }

  function removeLoadingSpinner() {
    const loadingSpinner = document.querySelector('.loader');
    if (loadingSpinner) {
      loadingSpinner.remove();
    }
  }

  async function displayPosts(posts, currentTabId) {
    const ulElement = document.createElement('ul');
    ulElement.id = 'post_list';
    ulElement.classList.add('ul__table');

    ulElement.innerHTML = '';
    console.log("total subreddits posts: ", posts.length)

      const usrurl = await getUserURLFromLocalStorage();
      const postnewData = posts;
      const matchingTitles = []; // Store the matching titles

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
          // Add more data properties as needed
        };

        if (postData.fURL === usrurl) {
          const postElement = createPostElement(postData, currentTabId);
          ulElement.appendChild(postElement);
          matchingTitles.push(postData.title); // Add the title to the matchingTitles array
        }
      });

    const popupContainer = document.getElementById('popup-container');
    popupContainer.appendChild(ulElement);

    console.log("Number of <li> elements:", ulElement.querySelectorAll('li').length); // Log the number of <li> elements

    if (ulElement.querySelectorAll('li').length === 0) {
      const noDataParagraph = document.createElement('p');
      noDataParagraph.textContent = 'No data found';
      noDataParagraph.classList.add('no-data-found');
      popupContainer.appendChild(noDataParagraph);
    }

    // Update data-tab attribute values
    const labels = document.querySelectorAll('.tabs__label');
    labels.forEach((label, index) => {
      const tabCount = ulElement.querySelectorAll('li').length;
      label.setAttribute('data-tab', tabCount);
    });
  }

  function getUserURLFromLocalStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('payload', (result) => {
        const { payload } = result;
        if (payload) {
          const { usrurl } = payload;
          resolve(usrurl);
        } else {
          resolve('');
        }
      });
    });
  }

  function extractURLFromText(text) {
    const regex = /\[.*?\]\((.*?)\)/; // Regular expression to match [text](url) pattern
    const matches = text.match(regex);
    if (matches && matches.length > 1) {
      return matches[1]; // Extract the URL from the second match group
    }
    return '';
  }

  const scanButtonOnclick = () => {
    // Send the tab ID to background.js
    chrome.runtime.sendMessage({ action: 'sendTabId', tabId: currentTabId });

    // Use the currentTabId in your fetchSubredditPosts function or any other relevant functions
    fetchSubredditPosts(scanButton, currentTabId);
  }

  const scanButton = document.getElementById('id_scan-btn');
  scanButton.addEventListener('click', scanButtonOnclick);
});