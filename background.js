// Cache for reports
let reportCache = { reddit: [], anon: [], lastUpdated: 0 };
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let GIST_TOKEN = process.env.GIST_TRIGGER_PAT || "";
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
let matchingTitles = []; // Initialize to fix undefined error
let badgeTextValues = {};

// Load GIST_TOKEN and OPENAI_API_KEY from environment
async function getGistToken(maxRetries = 3, retryCount = 0) {
  if (GIST_TOKEN && OPENAI_API_KEY) return { GIST_TOKEN, OPENAI_API_KEY };
  try {
    if (!GIST_TOKEN || !OPENAI_API_KEY) {
      throw new Error("GIST_TOKEN or OPENAI_API_KEY missing in environment variables");
    }
    console.log("✅ GIST_TOKEN and OPENAI_API_KEY Loaded from environment");

    // Validate GIST_TOKEN
    const testResponse = await fetch("https://api.github.com/user", {
      headers: { "Authorization": `token ${GIST_TOKEN}` }
    });
    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error("GIST_TOKEN validation failed:", { status: testResponse.status, testError });
      throw new Error(`GIST_TOKEN invalid: ${testResponse.status} - ${testError}`);
    }
    console.log("✅ GIST_TOKEN validated successfully");
    return { GIST_TOKEN, OPENAI_API_KEY };
  } catch (error) {
    console.error("❌ Failed to fetch tokens (Attempt " + (retryCount + 1) + "):", error.message);
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return getGistToken(maxRetries, retryCount + 1);
    }
    console.warn("Max retries reached. Anonymous reports and DeepSearch will be unavailable.");
    GIST_TOKEN = null;
    OPENAI_API_KEY = null;
    return null;
  }
}

// Fetch Reddit reports
async function fetchRedditReports() {
  try {
    const response = await fetch("https://www.reddit.com/r/worldwidecheck/new.json");
    if (!response.ok) throw new Error(`Reddit API error: ${response.status}`);
    const data = await response.json();
    return data.data.children.map(post => {
      const url = extractURL(post.data.selftext) || post.data.url;
      return {
        title: post.data.title,
        text: post.data.selftext,
        url: url,
        flair: post.data.link_flair_text || "Reported",
        color: post.data.link_flair_background_color || "#ff6347",
        timestamp: post.data.created_utc * 1000,
        post_id: post.data.id,
        score: post.data.score
      };
    });
  } catch (error) {
    console.error("Failed to fetch Reddit reports:", error);
    return [];
  }
}

// Fetch anonymous reports from Gists
async function fetchAnonymousReports() {
  if (!GIST_TOKEN) {
    console.warn("⚠️ GIST_TOKEN not available");
    return [];
  }
  try {
    const testResponse = await fetch("https://api.github.com/user", {
      headers: { "Authorization": `token ${GIST_TOKEN}` }
    });
    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error("Token test failed:", { status: testResponse.status, testError });
      throw new Error(`Token validation failed: ${testResponse.status} - ${testError}`);
    }
    console.log("Token validated successfully");

    const response = await fetch("https://api.github.com/gists", {
      headers: { "Authorization": `token ${GIST_TOKEN}` }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub API error for gists:", { status: response.status, errorText });
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }
    const gists = await response.json();
    console.log("Fetched Gists:", gists);
    const reports = await Promise.all(
      gists.filter(gist => gist.files && gist.files["report.json"]).map(async gist => {
        try {
          const res = await fetch(gist.files["report.json"].raw_url);
          if (!res.ok) throw new Error(`Failed to fetch report.json: ${res.status}`);
          const report = await res.json();
          console.log("Processed Gist report:", report);
          return {
            title: report.selectedText,
            url: report.url,
            flair: report.selectedFlair || "Reported",
            color: report.color || "#ff6347",
            timestamp: new Date(report.timestamp).getTime() || Date.now(),
            counter: report.counter || 1
          };
        } catch (error) {
          console.warn("Skipping invalid Gist:", error.message);
          return null;
        }
      })
    );
    // Aggregate reports to prevent duplicates
    const aggregatedReports = reports.filter(r => r).reduce((acc, r) => {
      const existing = acc.find(e => e.url === r.url && e.title === r.title);
      if (existing) {
        existing.counter += r.counter; // Increment counter for existing report
      } else {
        acc.push({ ...r, counter: r.counter });
      }
      return acc;
    }, []);
    console.log("Aggregated anonymous reports:", aggregatedReports);
    return aggregatedReports;
  } catch (error) {
    console.error("Failed to fetch anon reports:", error.message);
    return [];
  }
}

// Save anonymous report to Gist
async function saveReportToGist(url, selectedText, selectedFlair) {
  if (!GIST_TOKEN) {
    console.error("❌ GIST_TOKEN not available");
    return { success: false, error: "GIST_TOKEN missing" };
  }
  try {
    const response = await fetch("https://api.github.com/gists", {
      headers: { "Authorization": `token ${GIST_TOKEN}` }
    });
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const gists = await response.json();
    let existingReport = null;
    for (const gist of gists) {
      if (gist.files && gist.files["report.json"]) {
        const res = await fetch(gist.files["report.json"].raw_url);
        if (res.ok) {
          const report = await res.json();
          if (report.selectedText === selectedText && report.url === url) {
            existingReport = { gist, report };
            break;
          }
        }
      }
    }
    if (existingReport) {
      const updatedReport = { ...existingReport.report, counter: (existingReport.report.counter || 1) + 1 };
      const gistData = {
        description: existingReport.gist.description,
        public: existingReport.gist.public,
        files: { "report.json": { content: JSON.stringify(updatedReport, null, 2) } }
      };
      const updateResponse = await fetch(existingReport.gist.url, {
        method: "PATCH",
        headers: {
          Authorization: `token ${GIST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gistData),
      });
      if (!updateResponse.ok) throw new Error(`Failed to update Gist: ${updateResponse.status}`);
      console.log("✅ Counter updated in existing Gist:", existingReport.gist.html_url);
      return { success: true, gistUrl: existingReport.gist.html_url };
    } else {
      const report = {
        url,
        selectedText,
        selectedFlair,
        timestamp: new Date().toISOString(),
        counter: 1
      };
      const gistData = {
        description: "Anonymous report",
        public: true,
        files: { "report.json": { content: JSON.stringify(report, null, 2) } },
      };
      const createResponse = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          Authorization: `token ${GIST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gistData),
      });
      if (!createResponse.ok) throw new Error(`GitHub API error: ${createResponse.status}`);
      const data = await createResponse.json();
      console.log("✅ New report saved:", data.html_url);
      return { success: true, gistUrl: data.html_url };
    }
  } catch (error) {
    console.error("Failed to save or update report:", error);
    return { success: false, error: error.message };
  }
}

// Perform DeepSearch using xAI API
async function performDeepSearch(title, reportId) {
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY not available");
    return { reportId, error: "OPENAI_API_KEY missing. Please configure it in environment variables." };
  }
  try {
    const prompt = `Verify the accuracy of the following statement for potential misinformation: "${title}". Provide a summary of findings, including any evidence of falsehood or credibility issues.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.5
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", { status: response.status, errorText });
      if (response.status === 429) {
        return { reportId, error: "Rate limit exceeded. Please try again later." };
      }
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log("DeepSearch results:", data);
    return {
      reportId,
      results: {
        summary: data.choices?.[0]?.message?.content?.trim() || "No verification results available.",
        sources: [] // OpenAI doesn’t provide sources; adjust popup.js if needed
      }
    };
  } catch (error) {
    console.error("Failed to perform DeepSearch:", error.message);
    return { reportId, error: error.message };
  }
}

// Update badge
function updateBadge(tabId, url, fullTxt) {
  const relevantReports = [...reportCache.reddit, ...reportCache.anon].filter(r => {
    const reportUrl = r.url ? r.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    const tabUrlNorm = url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    const matchesUrl = reportUrl === tabUrlNorm || (tabUrlNorm.includes(reportUrl));
    const matchesText = fullTxt && fullTxt.toLowerCase().includes(r.title.toLowerCase());
    if (matchesUrl || matchesText);
    return matchesUrl || matchesText;
  });
  const count = relevantReports.length;
  badgeTextValues[tabId] = count;
  chrome.action.setBadgeText({ text: count > 0 ? count.toString() : "", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#ff4500" });
}

// Refresh reports
async function refreshReports() {
  if (Date.now() - reportCache.lastUpdated > CACHE_TTL) {
    try {
      const [redditReports, anonReports] = await Promise.all([
        fetchRedditReports(),
        fetchAnonymousReports()
      ]);
      reportCache.reddit = redditReports;
      reportCache.anon = anonReports;
      reportCache.lastUpdated = Date.now();
      console.log("Report cache updated:", reportCache);
      reportCache.reddit.forEach(r => console.log("Reddit report URL:", r.url));
      reportCache.anon.forEach(r => console.log("Anon report URL:", r.url));
      chrome.storage.local.set({ reports: reportCache });
    } catch (error) {
      console.error("Error refreshing reports:", error.message);
    }
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getGistToken") {
    getGistToken()
      .then((token) => sendResponse({ token }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (request.action === "fetchAnonymousReports") {
    fetchAnonymousReports()
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (request.action === "saveReportToGist") {
    saveReportToGist(request.url, request.selectedText, request.selectedFlair)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (request.action === "getReports") {
    refreshReports()
      .then(() => sendResponse(reportCache))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (request.action === "deepSearch") {
    performDeepSearch(request.title, request.reportId)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (request.action === "sendfullHTMLTEXT") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      updateBadge(tab.id, tab.url, request.fullTxt);
      chrome.tabs.sendMessage(tab.id, {
        action: "renderReports",
        reports: reportCache,
        url: tab.url,
      });
    });
    sendResponse({ success: true });
    return true;
  }
  if (request.action === "matchingTitleSelected") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, {
        action: "matchingTitleSelected",
        payload: request.payload,
        flair: request.flair,
        clrFlair: request.clrFlair,
      });
    });
    sendResponse({ success: true });
    return true;
  }
  if (request.action === "getCurrentTabId") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else if (tabs.length > 0) {
        sendResponse({ tabId: tabs[0].id, tabUrl: tabs[0].url });
      } else {
        sendResponse({ error: "No active tab found" });
      }
    });
    return true; // Keep port open for async response
  }
});

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "flag-suspicious-paragraph",
      title: "Report with World Wide Check!",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, {
    action: "openFlagModal",
    flags: [
      "Reported",
      "Suspicious",
      "Misleading",
      "False",
      "Needs Verification",
      "Spam",
    ],
    selectedText: info.selectionText,
  });
});

// On page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    refreshReports().then(() => {
      updateBadge(tabId, tab.url, "");
      chrome.tabs.sendMessage(tabId, {
        action: "renderReports",
        reports: reportCache,
        url: tab.url,
      });
    });
  }
});

// Initialize
chrome.storage.local.get("reports", (data) => {
  if (data.reports) reportCache = data.reports;
  getGistToken().then(() => {
    refreshReports().catch(err => console.error("Initial refresh failed:", err));
  }).catch(err => console.error("Token fetch failed:", err));
});

// In background.js
function extractURL(text) {
  if (!text) return null;
  const urlMatch = text.match(/fURL:\s*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/i) || // Match fURL: [text](url)
                   text.match(/https?:\/\/[^\s)]+/); // Fallback to any URL
  return urlMatch ? urlMatch[2] || urlMatch[0] : null; // Prefer the URL in parentheses, fallback to full match
}