let tabUrl = null;
let flaggedContent = null;
chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
  tabUrl = response.tabUrl
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "openFlagModal") {
    flaggedContent = { flags: request.flags, selectedText: request.selectedText };
    test(request.flags, request.selectedText);
  }
});

function test(flags, text) {
  flags.forEach((flag) => {
    console.log("FLAG: " + flag)
  });
  console.log("TEXT: " + text)
}

function createElement(tag, { className = '', textContent = '', id = '', href = '', target = '', } = {}) {
  const element = document.createElement(tag);
  className ? element.classList.add(className) : ""
  textContent ? element.textContent = textContent : ""
  id ? element.id = id : ""
  target ? element.target = target : ""
  href ? element.href = href : ""
  return element;
}

function createPostElement(postData, tabCount) {
  const liElement = createElement('li', { className: 'li__table' });
  const detailsElement = createElement('details', { name: 'details' });
  const summaryElement = createElement('summary');

  const titleText = flaggedContent ? `${postData.title} - Flagged as: ${flaggedContent.selectedText}` : postData.title;

  const reportNumber = createElement('label', { id: 'id_report_data', textContent: `REPORT#${tabCount + 1}` });
  reportNumber.dataset.flair = postData.flair;
  reportNumber.style.setProperty('--clr-flair', postData.clr_flair);
  summaryElement.append(reportNumber, createElement('span', { textContent: '>' }));

  const hrElement = createElement('hr', { className: 'hr-status' });
  hrElement.setAttribute('data-hr_status', 'verified');
  const idReportDataElement = summaryElement.querySelector('#id_report_data');
  idReportDataElement.dataset.flair = postData.flair;
  let colorFlair = postData.clr_flair
  idReportDataElement.style.setProperty('--clr-flair', colorFlair);

  // Add additional <li> with user-selected text, if available
  if (flaggedContent) {
    const userSelectionLi = createElement('li', {
      className: 'user-selection',
      textContent: `User Flagged Text: ${flaggedContent.selectedText}`
    });
    detailsElement.appendChild(userSelectionLi);
  }

  detailsElement.append(
    summaryElement,
    createElement('p', { id: `id_report_title_${postData.post_id}`, textContent: postData.title }),
    hrElement,
    createElement('p', { id: `id_report_text_${postData.post_id}`, className: 'verified', textContent: postData.text }),
    createInfoCol(postData)
  );
  liElement.appendChild(detailsElement);
  chrome.runtime.sendMessage({ action: 'matchingTitleSelected', payload: postData.title, flair: postData.flair, clrFlair: colorFlair });

  return liElement;
}

function createInfoCol(postData) {
  const infoColElement = createElement('div', { className: 'li__info__col' });
  const infoElements = [
    { id: 'info__id', dataAttribute: 'data-id', dataValue: postData.post_id },
    { id: 'info__report_date', dataAttribute: 'data-report_date', dataValue: postData.report_date },
    { id: 'info__url', dataAttribute: 'data-url', dataValue: postData.fURL },
    { id: 'info__score', dataAttribute: 'data-score', dataValue: postData.score },
  ];

  infoElements.forEach((info) => {
    const infoElement = createElement('p', { id: info.id, textContent: info.dataValue });
    infoElement.setAttribute(info.dataAttribute, info.dataValue);
    infoColElement.appendChild(infoElement);
  });

  const threadLink = createElement('a', { id: 'info__thread', textContent: postData.thread_link, className: 'info__col', href: `${postData.thread_link}`, target: '_blank' });
  infoColElement.appendChild(threadLink);
  return infoColElement;
}

async function fetchSubredditPosts() {
  const postListElement = document.getElementById('popup-container');
  postListElement ? postListElement.innerHTML = '' : ""
  try {
    const response = await fetch(`https://www.reddit.com/r/worldwidecheck/new.json`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    const posts = data.data.children || [];
    posts.length > 0 ? displayPosts(posts) : showNoDataMessage(postListElement)
  } catch (error) {
    console.error('Error fetching subreddit posts:', error);
  } finally {
    removeLoadingMsg();
  }
}

async function displayPosts(posts) {
  const ulElement = createElement('ul', { className: 'ul__table', id: 'post_list', innerHTML: '' });
  const postnewData = posts;
  postnewData.forEach((post, index) => {
    const fURL = extractURLFromText(post.data.selftext);
    const cleanedSelftext = cleanSelftextWithURL(post.data.selftext);
    const timestampMs = post.data.created_utc * 1000;
    const date = new Date(timestampMs);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const formattedDate = `${day}/${month}/${year}`;
    const postData = {
      reportNumber: index + 1,
      title: post.data.title,
      text: cleanedSelftext,
      post_id: post.data.id,
      fURL,
      source: post.data.source,
      score: post.data.score,
      flair: post.data.link_flair_text,
      thread_link: post.data.url,
      clr_flair: post.data.link_flair_background_color,
      report_date: formattedDate
    };

    if (postData.fURL === tabUrl) {
      const postElement = createPostElement(postData, ulElement.querySelectorAll('li').length);
      ulElement.appendChild(postElement);
    }
  });

  const popupContainer = document.getElementById('report-content');
  popupContainer ? popupContainer.appendChild(ulElement) : ""

  if (ulElement.querySelectorAll('li').length === 0) {
    const noDataParagraph = createElement('p', { className: 'no-data-found', textContent: 'All clear. No data found on this page!' });
    popupContainer ? popupContainer.appendChild(noDataParagraph) : '';
  }

  const labels = document.querySelectorAll('.tabs__label');
  labels.forEach((label) => {
    let tabCount = ulElement.querySelectorAll('li').length;
    label.setAttribute('data-tab', tabCount);
    let msg = tabCount
    chrome.runtime.sendMessage({ action: 'showNotification', payload: msg });
  });
}

function removeLoadingMsg() {
  const loadingmsg = document.getElementById("loading-message")
  loadingmsg ? loadingmsg.remove() : "remove loading message [error]"
}

function extractURLFromText(text) {
  const regex = /\[.*?\]\((.*?)\)/;
  const matches = text.match(regex);
  return matches && matches.length > 1 ? matches[1] : '';
}

function cleanSelftextWithURL(text) {
  return text.replace(/fURL: \[(.*?)\]\((.*?)\)/, 'fURL: $2\n');
}

fetchSubredditPosts();