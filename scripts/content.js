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

function readDom() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const fullHTMLTEXT = nodes
    .map((node) => node.nodeValue.trim())
    .filter((t) => t)
    .join(" ");
  chrome.runtime.sendMessage({
    action: "sendfullHTMLTEXT",
    fullTxt: fullHTMLTEXT,
  });
}

function highlightText(text, flair, color, counter = 0) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodesToUpdate = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue.includes(text) && !node.parentElement?.closest('#highlighted-text')) {
      nodesToUpdate.push(node);
    }
  }
  nodesToUpdate.forEach(node => {
    const parent = node.parentElement;
    if (!parent || !(parent instanceof HTMLElement)) return;
    const parts = node.nodeValue.split(text);
    const fragment = document.createDocumentFragment();
    parts.forEach((part, i) => {
      if (i > 0) {
        const span = createElement('span', {
          id: 'highlighted-text',
          textContent: text
        });
        span.dataset.flair = flair; // Set flair in dataset
        span.dataset.counter = counter; // Set counter in dataset
        span.style.setProperty('--clr-flair', color); // Set custom property for CSS
        span.style.padding = '2px 4px'; // Inline styling for visibility
        span.style.borderRadius = '3px'; // Optional rounding
        fragment.appendChild(span);
      }
      fragment.appendChild(document.createTextNode(part));
    });
    parent.replaceChild(fragment, node);
  });
  if (flair === "NSFW🔞") {
    const spans = document.querySelectorAll('#highlighted-text[data-flair="NSFW🔞"]');
    if (spans.length > 0 && !document.getElementById('blur-slider')) injectBlurSlider();
  }
}

// In content.js (renderReports)
function renderReports({ reports, url }) {
  console.log("Rendering reports:", reports);
  const relevantReports = [...reports.reddit, ...reports.anon].filter(r => {
    const reportUrl = r.url ? r.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    const tabUrl = url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    return reportUrl === tabUrl || tabUrl.includes(reportUrl) || document.body.textContent.toLowerCase().includes(r.title.toLowerCase());
  });
  console.log("Relevant reports for rendering:", relevantReports);
  relevantReports.forEach(r => highlightText(r.title, r.flair, r.color, r.counter || 0));
}

function openFlagModal(flags, selectedText) {
  if (document.getElementById("target-overlay")) return;
  const overlay = createElement("div", { id: "target-overlay" });
  const modal = createElement("div", { id: "target-modal" });
  modal.innerHTML = `
      <h3>Flag this paragraph</h3>
      <p id="target-txt_selected">${selectedText}</p>
      <select id="target-select-input">
        ${flags
          .map((flag) => `<option value="${flag}">${flag}</option>`)
          .join("")}
      </select>
      <button id="recaptcha-btn">Verify reCAPTCHA</button>
      <button id="submit-btn" disabled>Submit Report</button>
      <button id="cancel-btn">Cancel</button>
    `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const submitBtn = modal.querySelector("#submit-btn");
  const recaptchaBtn = modal.querySelector("#recaptcha-btn");
  const cancelBtn = modal.querySelector("#cancel-btn");
  const flairSelect = modal.querySelector("#target-select-input");

  recaptchaBtn.onclick = () => {
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
        submitBtn.disabled = false;
        window.removeEventListener("message", handler); // Clean up
      }
    });
  };

  submitBtn.onclick = () => {
    if (!submitBtn.disabled) {
      const flair = flairSelect.value;
      highlightText(selectedText, flair, "#ff6347", 0);
      chrome.runtime.sendMessage(
        {
          action: "saveReportToGist",
          url: window.location.href,
          selectedText,
          selectedFlair: flair,
        },
        () => document.body.removeChild(overlay)
      );
    } else {
      alert("Please complete reCAPTCHA!");
    }
  };

  cancelBtn.onclick = () => document.body.removeChild(overlay);
}

function handleBlurLevelChange(event) {
  const blurLevel = event.target.value;
  document
    .querySelectorAll('#highlighted-text[data-flair="NSFW🔞"]')
    .forEach((element) => {
      element.style.setProperty("--blur-amount", `blur(${blurLevel}px)`);
    });
  document.getElementById("blur-value").textContent = blurLevel;
}

function injectBlurSlider() {
  const sliderContainer = createElement("div", {
    id: "blur-slider-container",
    style: { display: "none", position: "fixed" },
  });
  const label = createElement("label", {
    htmlFor: "blur-slider",
    textContent: "Blur Level: ",
  });
  const slider = createElement("input", {
    type: "range",
    id: "blur-slider",
    name: "blur-slider",
    min: "0",
    max: "10",
    value: "10",
  });
  const valueDisplay = createElement("span", {
    id: "blur-value",
    textContent: "10",
  });
  const unit = createElement("span", { textContent: " px" });
  slider.addEventListener("input", handleBlurLevelChange);
  sliderContainer.appendChild(label);
  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(valueDisplay);
  sliderContainer.appendChild(unit);
  document.body.appendChild(sliderContainer);

  let hideTimeout;
  document.body.addEventListener("mouseover", (event) => {
    const highlightedText = event.target.closest(
      '#highlighted-text[data-flair="NSFW🔞"]'
    );
    if (highlightedText) {
      clearTimeout(hideTimeout);
      const rect = highlightedText.getBoundingClientRect();
      sliderContainer.style.display = "block";
      sliderContainer.style.top = `${
        rect.top - sliderContainer.offsetHeight
      }px`;
      sliderContainer.style.left = `${rect.left}px`;
    }
  });

  sliderContainer.addEventListener("mouseenter", () =>
    clearTimeout(hideTimeout)
  );
  document.body.addEventListener("mouseout", (event) => {
    const relatedTarget = event.relatedTarget;
    const highlightedText = event.target.closest(
      '#highlighted-text[data-flair="NSFW🔞"]'
    );
    if (
      highlightedText &&
      !relatedTarget?.closest('#highlighted-text[data-flair="NSFW🔞"]') &&
      relatedTarget?.id !== "blur-slider-container" &&
      !relatedTarget?.closest("#blur-slider-container")
    ) {
      hideTimeout = setTimeout(
        () => (sliderContainer.style.display = "none"),
        300
      );
    }
  });

  sliderContainer.addEventListener("mouseleave", () => {
    hideTimeout = setTimeout(
      () => (sliderContainer.style.display = "none"),
      300
    );
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "renderReports") renderReports(request);
  if (request.action === "matchingTitleSelected") {
    highlightText(request.payload, request.flair, request.clrFlair, 0);
  }
  if (request.action === "openFlagModal")
    openFlagModal(request.flags, request.selectedText);
});

readDom(); // Run on page load