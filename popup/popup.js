
document.addEventListener('DOMContentLoaded', () => {

  let isDataLoaded = false; // Track if data is already loaded
  let currentTabId = null; // Store the current tab ID

  // Request the current tab ID from background.js
  chrome.runtime.sendMessage({ action: 'getActiveTabId' }, (response) => {
    currentTabId = response.tabId;
    // Use the currentTabId as needed
    console.log("Current Tab ID:", currentTabId);
  });

  function createLoadingSpinner() {
    const loadingSpinner = document.createElement('div');
    loadingSpinner.id = 'loading-text';
    loadingSpinner.classList.add('loader');
    return loadingSpinner;
  }

  function removeLoadingSpinner() {
    const loadingSpinner = document.getElementById('loading-text');
    if (loadingSpinner) {
      loadingSpinner.remove();
    }
  }

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

  function fetchSubredditPosts() {
    if (!isDataLoaded) {
      // const loadingMessage = document.getElementById('loading-message');
      const postListElement = document.getElementById('post_list');
      postListElement.innerHTML = ''; // Clear existing posts

      // loadingMessage.style.display = 'none'; // Hide the loading message initially

      const subredditName = 'worldwidecheck';

      const loadingSpinner = createLoadingSpinner();
      if (loadingSpinner) {
        postListElement.appendChild(loadingSpinner); // Add the loading spinner to the post list
      }

      fetch(`https://www.reddit.com/r/${subredditName}/new.json`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          const posts = data.data.children;
          displayPosts(posts);
          isDataLoaded = true;
          removeLoadingSpinner(); // Remove the loading spinner after data is fetched
        })
        .catch(error => {
          console.log('Error occurred while fetching subreddit posts:', error);
          isDataLoaded = true;
          removeLoadingSpinner(); // Remove the loading spinner on error
          // loadingMessage.style.display = 'block'; // Show the loading message

          // Display the network error message
          const errorParagraph = document.createElement('p');
          errorParagraph.textContent = 'Network error, please wait and try again.';
          errorParagraph.classList.add('sver_network-error');
          postListElement.appendChild(errorParagraph);
        });
    } else {
      const postListElement = document.getElementById('post_list');
      let scanPageText = document.getElementById('scan_page_text');

      if (!postListElement || postListElement.children.length === 0) {
        if (!scanPageText) {
          console.log('Scan Page to find some data');
        }
        document.body.appendChild(scanPageText);
      } else if (scanPageText) {
        scanPageText.remove();
      }
    }
  }

  async function displayPosts(posts) {
    const postListElement = document.createElement('ul');
    postListElement.id = 'post_list';
    postListElement.classList.add('ul__table');

    if (posts.length === 0) {
      const noResultsElement = document.createElement('p');
      noResultsElement.textContent = 'No posts found.';
      postListElement.appendChild(noResultsElement);
      // const loadingMessage = document.getElementById('loading-message');
      // loadingMessage.style.display = 'block'; // Show the loading message
    } else {
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

        // console.log(postData.fURL);

        if (postData.fURL === usrurl) {
          const postElement = createPostElement(postData);
          postListElement.appendChild(postElement);

          matchingTitles.push(postData.title); // Add the title to the matchingTitles array
        }
      });
    }

    const popupContainer = document.getElementById('popup-container');
    popupContainer.appendChild(postListElement);

    // Update data-tab attribute values
    const labels = document.querySelectorAll('.tabs__label');
    labels.forEach((label, index) => {
      const tabCount = postListElement.querySelectorAll('li').length;
      label.setAttribute('data-tab', tabCount);
    });

    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.remove();
    }
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

  const scanButton = document.getElementById('id_scan-btn');
  scanButton.addEventListener('click', () => {
    // Send the tab ID to background.js
    chrome.runtime.sendMessage({ action: 'sendTabId', tabId: currentTabId });

    // Use the currentTabId in your fetchSubredditPosts function or any other relevant functions
    console.log("Current Tab ID in fetchSubredditPosts:", currentTabId);
    fetchSubredditPosts();
  });
});
