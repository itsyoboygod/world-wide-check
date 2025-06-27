let tabUrl = null;

function createElement(tag, attributes = {}) {
  if (typeof tag !== 'string') {
    console.warn("Invalid tag type in createElement:", tag);
    return document.createElement('span'); // Fallback to span
  }
  const element = document.createElement(tag);
  const { dataset, ...otherAttrs } = attributes;
  Object.assign(element, otherAttrs);
  if (dataset && element.dataset) {
    Object.assign(element.dataset, dataset); // Only assign dataset if supported
  }
  return element;
}

function createPostElement(postData, tabCount) {
  const li = createElement('li', { className: 'li__table' });
  const details = createElement('details', { name: 'detalhes' });
  const summary = createElement('summary');
  const reportNumber = createElement('label', {
    id: 'id_report_data',
    textContent: `REPORT#${tabCount + 1}`,
    dataset: { flair: postData.flair },
    style: `--clr-flair: ${postData.color};`
  });
  summary.append(reportNumber, createElement('span', { textContent: '>' }));
  details.append(
    summary,
    createElement('p', { id: `id_report_title_${postData.post_id}`, textContent: postData.title }),
    createElement('hr', { className: 'hr-status', dataset: { hr_status: 'verified' } }),
    createElement('p', { id: `id_report_text_${postData.post_id}`, className: 'verified', textContent: postData.text || 'No additional text' }),
    createInfoCol(postData)
  );
  li.appendChild(details);
  chrome.runtime.sendMessage({
    action: 'matchingTitleSelected',
    payload: postData.title,
    flair: postData.flair,
    clrFlair: postData.color
  });
  return li;
}

function createInfoCol(postData) {
  const infoCol = createElement('div', { className: 'li__info__col' });
  const infoElements = [
    { id: 'info__id', dataAttribute: 'data-id', dataValue: postData.post_id || 'N/A' },
    { id: 'info__report_date', dataAttribute: 'data-report_date', dataValue: new Date(postData.timestamp).toLocaleDateString() },
    { id: 'info__url', dataAttribute: 'data-url', dataValue: postData.url || 'N/A' },
    { id: 'info__score', dataAttribute: 'data-score', dataValue: postData.score || 'N/A' }
  ];
  infoElements.forEach(info => {
    const el = createElement('p', { id: info.id, className: 'info__col', textContent: info.dataValue });
    el.setAttribute(info.dataAttribute, info.dataValue);
    infoCol.appendChild(el);
  });
  if (postData.url) {
    const threadLink = createElement('a', {
      id: 'info__thread',
      className: 'info__col',
      textContent: `https://www.reddit.com/r/worldwidecheck/comments/${postData.post_id}/`,
      href: `https://www.reddit.com/r/worldwidecheck/comments/${postData.post_id}/`,
      target: '_blank'
    });
    infoCol.appendChild(threadLink);
  }
  return infoCol;
}

// In popup.js (displayReports)
function displayReports(reports) {
  const ul = document.getElementById("post_list");
  if (!ul) {
    console.error("Missing #post_list in popup.html");
    return;
  }
  ul.innerHTML = ""; // Clear existing content
  console.log("Displaying reports:", reports);
  const relevantReports = [...reports.reddit, ...reports.anon].filter(r => {
    const reportUrl = r.url ? r.url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/[\[\]\(\)]/g, '') : '';
    const tabUrlNorm = tabUrl ? tabUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    console.log("Comparing:", { reportUrl, tabUrlNorm });
    return reportUrl === tabUrlNorm || tabUrlNorm.includes(reportUrl) || (r.text && r.text.includes(tabUrlNorm));
  });
  console.log("Relevant reports for display:", relevantReports);
  const loadingMessage = document.getElementById('loading-message');
  if (loadingMessage) {
    loadingMessage.remove(); // Remove loading message once data is processed
  }
  if (!relevantReports.length) {
    ul.appendChild(createElement('p', { className: 'no-data-found', textContent: 'All clear. No data found on this page!' }));
    return;
  }
  relevantReports.forEach((report, i) => ul.appendChild(createPostElement(report, i)));
  document.getElementById('report-content')?.appendChild(ul);
  const labels = document.querySelectorAll('.tabs__label');
  labels.forEach(label => label.setAttribute('data-tab', relevantReports.length));
}

function removeLoadingMsg() {
  const loading = document.getElementById("loading-message");
  if (loading) loading.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  const loadingMessage = document.getElementById('loading-message');
  if (loadingMessage) {
    loadingMessage.style.display = 'block'; // Ensure it’s visible initially
  }
  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
    if (response && response.tabUrl) {
      tabUrl = response.tabUrl;
      console.log("Set tabUrl:", tabUrl);
    } else {
      console.error("Failed to get tab URL:", response?.error || "Unknown error");
      tabUrl = window.location.href;
    }
    chrome.runtime.sendMessage({ action: "getReports" }, (reportResponse) => {
      if (reportResponse && (reportResponse.reddit || reportResponse.anon)) {
        displayReports(reportResponse);
      } else {
        console.error("No reports received:", reportResponse?.error || "Unknown error");
        const ul = document.getElementById("post_list");
        if (ul) ul.innerHTML = ""; // Clear list
        if (loadingMessage) loadingMessage.remove(); // Remove on failure
        ul?.appendChild(createElement('p', { className: 'no-data-found', textContent: 'No reports received.' }));
      }
    });
  });
});