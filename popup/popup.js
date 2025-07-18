let tabUrl = null;

function createElement(tag, attributes = {}) {
  if (typeof tag !== "string") {
    console.warn("Invalid tag type in createElement:", tag);
    return document.createElement("span"); // Fallback to span
  }
  const element = document.createElement(tag);
  const { dataset, ...otherAttrs } = attributes;
  Object.assign(element, otherAttrs);
  if (dataset && element.dataset) {
    Object.assign(element.dataset, dataset); // Only assign dataset if supported
  }
  return element;
}

function getOrCreateUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["userId"], (result) => {
      if (result.userId) {
        resolve(result.userId);
      } else {
        const userId = crypto.randomUUID(); // Generate a unique ID
        chrome.storage.local.set({ userId }, () => resolve(userId));
      }
    });
  });
}

function generateReportId(url, title) {
  // Create a unique ID based on URL and title to persist across cache clears
  const hash = `${url}-${title}`.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `anon-${hash.slice(0, 16)}`; // Shortened for practicality
}

async function createPostElement(postData, tabCount, isAIReport = false, allReports) {
  const li = createElement("li", { className: "li__table" });
  if (!li) {
    console.error("Failed to create li element for report:", postData);
    return null; // Return null if creation fails
  }
  const details = createElement("details", { name: "detalhes" });
  const summary = createElement("summary");
  const reportNumber = createElement("label", {
    id: "id_report_data",
    textContent: `REPORT#${tabCount + 1}`,
    dataset: { flair: postData.flair, counter: postData.counter || 0 },
    style: `--clr-flair: ${postData.color};`,
  });
  summary.append(reportNumber, createElement("span", { textContent: ">" }));
  const deepSearchContainer = createElement("div", {
    className: "deepsearch-container",
  });
  const deepSearchBtn = createElement("button", {
    className: "deepsearch-btn",
    textContent: "Verify with DeepSearch 🧠",
    dataset: { reportId: postData.post_id || `anon-${tabCount}` },
  });
  const deepSearchResult = createElement("p", {
    className: "deepsearch-result",
    textContent: "No DeepSearch results yet.",
    dataset: { reportId: postData.post_id || `anon-${tabCount}` },
  });
  if (isAIReport) {
    deepSearchBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage(
        {
          action: "deepSearch",
          title: postData.title,
          reportId: postData.post_id || `anon-${tabCount}`,
        },
        (response) => {
          if (response.error) {
            deepSearchResult.textContent = `Error: ${response.error}`;
          } else if (response.results) {
            deepSearchResult.textContent =
              response.results.summary || "No verification results available.";
          }
        }
      );
    });
  }
  deepSearchContainer.append(deepSearchBtn, deepSearchResult);
  details.append(
    summary,
    createElement("p", {
      id: `id_report_title_${postData.post_id || `anon-${tabCount}`}`,
      textContent: postData.title,
    }),
    createElement("hr", {
      className: "hr-status",
      dataset: { hr_status: "verified" },
    }),
    createElement("p", {
      id: `id_report_text_${postData.post_id || `anon-${tabCount}`}`,
      className: "verified",
      textContent:
        postData.text ||
        `${postData.counter || 0} people reported this text. ${
          postData.post_id ? "" : "Complete the captcha to also report it"
        }`,
    }),
    isAIReport ? deepSearchContainer : ""
  );
  // Add info column first
  const infoCol = createInfoCol(postData);
  details.appendChild(infoCol);
  // Add report button for anonymous and AI reports (not Reddit)
  if (postData.post_id === undefined && (!isAIReport || isAIReport)) {
    const reportId = generateReportId(tabUrl, postData.title);
    const userId = await getOrCreateUserId();
    return new Promise((resolve) => {
      chrome.storage.local.get(["submittedReports"], (result) => {
        const submittedReports = result.submittedReports || {};
        const userSubmissions = submittedReports[userId] || [];
        const textElement = document.getElementById(
          `id_report_text_${reportId}`
        );

        // Check if this report exists in allReports with user's flair or ID
        const isOwnReport = allReports.anon.some((r) =>
          r.url === tabUrl && r.title === postData.title && r.flair === postData.flair
        ) || userSubmissions.includes(reportId);

        if (isOwnReport) {
          if (textElement) {
            textElement.textContent = `${postData.counter || 0} people reported this text. You have already reported this.`;
          }
        } else {
          const reportBtn = createElement("button", {
            id: `report-btn-${tabCount}`,
            textContent: "Complete CAPTCHA 🤖"
          });
          reportBtn.addEventListener("click", () => {
            const popup = window.open(
              "https://itsyoboygod.github.io/recaptcha-page/",
              "reCAPTCHA",
              "width=500,height=600"
            );
            window.addEventListener("message", function handler(event) {
              if (
                event.origin === "https://itsyoboygod.github.io" &&
                event.data === "recaptchaSuccess"
              ) {
                chrome.runtime.sendMessage(
                  {
                    action: "saveReportToGist",
                    url: tabUrl,
                    selectedText: postData.title,
                    selectedFlair: postData.flair,
                  },
                  (response) => {
                    if (response.success) {
                      if (textElement) {
                        textElement.textContent = `${postData.counter || 0} people reported this text. Report submitted successfully!`;
                      }
                      // Mark as submitted and remove button
                      userSubmissions.push(reportId);
                      submittedReports[userId] = userSubmissions;
                      chrome.storage.local.set({ submittedReports });
                      if (reportBtn.parentNode) {
                        reportBtn.parentNode.removeChild(reportBtn);
                      }
                    } else {
                      console.error("Failed to save report:", response.error);
                    }
                  }
                );
                window.removeEventListener("message", handler);
              }
            });
          });
          if (reportBtn && reportBtn instanceof Node) {
            details.insertBefore(reportBtn, infoCol);
          } else {
            console.error("Invalid reportBtn node:", reportBtn);
          }
        }
        li.appendChild(details);
        resolve(li);
      });
    });
  } else {
    li.appendChild(details);
    return Promise.resolve(li);
  }
}

function createInfoCol(postData) {
  const infoCol = createElement("div", { className: "li__info__col" });
  const infoElements = [
    {
      id: "info__id",
      dataAttribute: "data-id",
      dataValue: postData.post_id || "N/A",
    },
    {
      id: "info__report_date",
      dataAttribute: "data-report_date",
      dataValue: new Date(postData.timestamp).toLocaleDateString(),
    },
    {
      id: "info__url",
      dataAttribute: "data-url",
      dataValue: postData.url || "N/A",
    },
    {
      id: "info__score",
      dataAttribute: "data-score",
      dataValue: postData.score || "N/A",
    },
  ];
  infoElements.forEach((info) => {
    const el = createElement("p", {
      id: info.id,
      className: "info__col",
      textContent: info.dataValue,
    });
    el.setAttribute(info.dataAttribute, info.dataValue);
    infoCol.appendChild(el);
  });
  if (postData.url) {
    const threadLink = createElement("a", {
      id: "info__thread",
      className: "info__col",
      textContent: `https://www.reddit.com/r/worldwidecheck/comments/${postData.post_id}/`,
      href: `https://www.reddit.com/r/worldwidecheck/comments/${postData.post_id}/`,
      target: "_blank",
    });
    infoCol.appendChild(threadLink);
  }
  return infoCol;
}

async function displayReports(reports, isAIReport = false) {
  const ul = document.getElementById(isAIReport ? "ai-post_list" : "post_list");
  if (!ul) {
    console.error(
      `Missing #${isAIReport ? "ai-post_list" : "post_list"} in popup.html`
    );
    return;
  }
  ul.innerHTML = ""; // Clear existing content
  console.log(`Displaying ${isAIReport ? "AI" : "human"} reports:`, reports);
  const relevantReports = [...reports.reddit, ...reports.anon].filter((r) => {
    const reportUrl = r.url
      ? r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
      : "";
    const tabUrlNorm = tabUrl
      ? tabUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
      : "";
    return (
      reportUrl === tabUrlNorm ||
      tabUrlNorm.includes(reportUrl) ||
      (r.text && r.text.includes(tabUrlNorm))
    );
  });
  console.log(
    `Relevant ${isAIReport ? "AI" : "human"} reports for display:`,
    relevantReports
  );
  const loadingMessage = document.getElementById(
    isAIReport ? "ai-loading-message" : "loading-message"
  );
  if (loadingMessage) {
    loadingMessage.remove(); // Remove loading message once data is processed
  }
  if (!relevantReports.length) {
    ul.appendChild(
      createElement("p", {
        className: "no-data-found",
        textContent: "All clear. No data found on this page!",
      })
    );
    return;
  }
  for (const [i, report] of relevantReports.entries()) {
    try {
      const postElement = await createPostElement(report, i, isAIReport, reports);
      if (postElement && postElement instanceof Node) {
        ul.appendChild(postElement);
      } else {
        console.warn("Skipping invalid post element for report:", report);
      }
    } catch (error) {
      console.error("Error rendering post element:", error, "Report:", report);
    }
  }
  const targetContent = document.getElementById(
    isAIReport ? "ai-report-content-list" : "report-content"
  );
  if (targetContent) targetContent.appendChild(ul);
  const labels = document.querySelectorAll(".tabs__label");
  labels.forEach((label) =>
    label.setAttribute("data-tab", relevantReports.length)
  );
}

function removeLoadingMsg(isAIReport = false) {
  const loading = document.getElementById(
    isAIReport ? "ai-loading-message" : "loading-message"
  );
  if (loading) loading.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  const loadingMessage = document.getElementById("loading-message");
  const aiLoadingMessage = document.getElementById("ai-loading-message");
  if (loadingMessage) loadingMessage.style.display = "block";
  if (aiLoadingMessage) aiLoadingMessage.style.display = "block";
  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
    if (response && response.tabUrl) {
      tabUrl = response.tabUrl;
    } else {
      console.error(
        "Failed to get tab URL:",
        response?.error || "Unknown error"
      );
      tabUrl = window.location.href;
    }
    chrome.runtime.sendMessage({ action: "getReports" }, (reportResponse) => {
      if (reportResponse && (reportResponse.reddit || reportResponse.anon)) {
        displayReports(reportResponse); // Human reports
        displayReports(reportResponse, true); // AI reports
      } else {
        console.error(
          "No reports received:",
          reportResponse?.error || "Unknown error"
        );
        const ul = document.getElementById("post_list");
        const aiUl = document.getElementById("ai-post_list");
        if (ul) ul.innerHTML = "";
        if (aiUl) aiUl.innerHTML = "";
        if (loadingMessage) loadingMessage.remove();
        if (aiLoadingMessage) aiLoadingMessage.remove();
        ul?.appendChild(
          createElement("p", {
            className: "no-data-found",
            textContent: "No reports received.",
          })
        );
        aiUl?.appendChild(
          createElement("p", {
            className: "no-data-found",
            textContent: "No reports received.",
          })
        );
      }
    });
  });
});