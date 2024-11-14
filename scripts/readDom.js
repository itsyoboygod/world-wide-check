function createElement(tag, { className = '', textContent = '', id = '', href = '', target = '', display = '', position = '', type = '', min = '', max = '', value = '', htmlFor = '' } = {}) {
    const element = document.createElement(tag);
    className ? element.classList.add(className) : ""
    textContent ? element.textContent = textContent : ""
    id ? element.id = id : ""
    target ? element.target = target : ""
    href ? element.href = href : ""
    display ? element.display = display : ""
    position ? element.position = position : ""
    type ? element.type = type : ""
    min ? element.min = min : ""
    max ? element.max = max : ""
    value ? element.value = value : ""
    htmlFor ? element.htmlFor = htmlFor : ""

    return element;
}

function readDom() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        nodes.push(node);
    }
    const fullHTMLTEXT = nodes.map(node => node.nodeValue.trim()).join(' ');
    chrome.runtime.sendMessage({ action: 'sendfullHTMLTEXT', fullTxt: fullHTMLTEXT });
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'matchingTitleSelected') {
        const matchingText = request.payload;
        const allNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let currentNode;
        while (currentNode = allNodes.nextNode()) {
            const parent = currentNode.parentNode;
            if (parent.closest('#highlighted-text')) { continue; }
            const nodeText = currentNode.nodeValue.trim();
            if (nodeText.includes(matchingText)) {
                const parts = nodeText.split(matchingText);
                const span = createElement('span', { id: 'highlighted-text', textContent: `${matchingText}` });
                span.dataset.flair = request.flair;
                span.style.setProperty('--clr-flair', request.clrFlair);
                const fragment = document.createDocumentFragment();
                parts[0] ? fragment.appendChild(document.createTextNode(parts[0])) : ""
                fragment.appendChild(span);
                parts[1] ? fragment.appendChild(document.createTextNode(parts[1])) : ""
                parent.replaceChild(fragment, currentNode);
            }
        } !document.getElementById('blur-slider') ? injectBlurSlider() : ""
    }

    if (request.action === "flagParagraph") {
        const selectedText = request.selectedText.trim();
        const flaggedTexts = JSON.parse(localStorage.getItem("flaggedTexts") || "[]");

        if (flaggedTexts.includes(selectedText)) {
            alert("This paragraph is already flagged.");
        } else {
            flaggedTexts.push(selectedText);
            localStorage.setItem("flaggedTexts", JSON.stringify(flaggedTexts));
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                if (node.nodeValue.includes(selectedText)) {
                    const highlightedSpan = createElement("span", {
                        textContent: selectedText,
                        className: "flagged-text",
                    });
                    const fragment = document.createDocumentFragment();
                    const parts = node.nodeValue.split(selectedText);
                    fragment.append(document.createTextNode(parts[0]), highlightedSpan, document.createTextNode(parts[1]));
                    node.parentNode.replaceChild(fragment, node);
                }
            }
        }
    }

    // GitHub personal access token (Replace with your own token - NOT recommended for production)
    const GITHUB_TOKEN = "";
    // Helper function to create an element with attributes
    function createElement(tag, attributes = {}) {
        const element = document.createElement(tag);
        Object.assign(element, attributes);
        return element;
    }

    // Function to save a report as a Gist on GitHub
    async function saveReportToGist(url, selectedText, selectedFlair) {
        const report = {
            url,
            selectedText,
            selectedFlair,
            timestamp: new Date().toISOString()
        };

        const gistData = {
            "description": "Anonymous report",
            "public": true,
            "files": {
                "report.json": {
                    "content": JSON.stringify(report, null, 2)
                }
            }
        };

        try {
            const response = await fetch("https://api.github.com/gists", {
                method: "POST",
                headers: {
                    "Authorization": `token ${GITHUB_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(gistData)
            });

            const data = await response.json();
            console.log("Report saved as Gist:", data.html_url);
            return data.html_url; // Return the Gist URL
        } catch (error) {
            console.error("Error saving report to Gist:", error);
        }
    }

    // Function to retrieve reports for a specific URL
    async function getReportsForUrl(url) {
        try {
            const response = await fetch("https://api.github.com/gists", {
                method: "GET",
                headers: {
                    "Authorization": `token ${GITHUB_TOKEN}`
                }
            });

            const gists = await response.json();
            const reports = [];

            for (const gist of gists) {
                if (gist.files["report.json"]) {
                    const fileResponse = await fetch(gist.files["report.json"].raw_url);
                    const reportData = await fileResponse.json();

                    // Check if the report URL matches the current page URL
                    if (reportData.url === url) {
                        reports.push(reportData);
                    }
                }
            }

            return reports; // Returns an array of matching reports
        } catch (error) {
            console.error("Error retrieving reports from Gist:", error);
        }
    }

    // Function to display existing reports for the current page URL
    async function displayExistingReports() {
        const pageUrl = window.location.href;
        const reports = await getReportsForUrl(pageUrl);

        reports.forEach(report => {
            injectTargetTextIntoDOM(report.selectedText, report.selectedFlair);
        });
    }

    // Display reports when the content script loads
    displayExistingReports();

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "openFlagModal") {
            openFlagModal(request.flags, request.selectedText);
        }
    });

    // Function to open the modal for flair selection
    function openFlagModal(flags, selectedText) {
        if (document.getElementById("target-overlay")) return;

        const overlay = createElement("div", { id: "target-overlay" });
        const modal = createElement("div", { id: "target-modal" });
        const title = createElement("h3", { textContent: "Flag this paragraph" });
        const textParagraph = createElement("p", { id: "target-txt_selected", textContent: selectedText });

        const flagSelect = createElement("select", { id: "target-select-input" });
        flags.forEach((flag) => {
            const option = createElement("option", { value: flag, textContent: flag });
            flagSelect.appendChild(option);
        });

        // Confirm button to save report and inject flair
        const confirmBtn = createElement("button", { textContent: "Confirm" });
        confirmBtn.onclick = async () => {
            const selectedFlair = flagSelect.value;

            // Inject text with selected flair into DOM
            injectTargetTextIntoDOM(selectedText, selectedFlair);

            // Save the report to GitHub Gist
            const pageUrl = window.location.href;
            await saveReportToGist(pageUrl, selectedText, selectedFlair);

            // Remove the modal overlay
            document.body.removeChild(overlay);
        };

        modal.appendChild(title);
        modal.appendChild(textParagraph);
        modal.appendChild(flagSelect);
        modal.appendChild(confirmBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // Function to inject the target text with the specific selected flair into the user's DOM
    function injectTargetTextIntoDOM(selectedText, selectedFlair) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const parent = node.parentNode;

            // Skip nodes that already contain highlighted or targeted text
            if (parent.closest("#highlighted-text") || parent.closest("#target-txt_selected")) { continue; }

            const nodeText = node.nodeValue.trim();
            if (nodeText.includes(selectedText)) {
                const parts = nodeText.split(selectedText);

                // Create a span for the selected target text with the specific flair
                const targetSpan = createElement("span", {
                    id: "target-txt_selected",
                    textContent: selectedText,
                });
                targetSpan.dataset.flair = selectedFlair;  // Apply only the specific flair selected by the user
                targetSpan.style.setProperty("--clr-flair", selectedFlair); // Optional styling

                // Construct fragment with split text and span
                const fragment = document.createDocumentFragment();
                if (parts[0]) fragment.appendChild(document.createTextNode(parts[0]));
                fragment.appendChild(targetSpan);
                if (parts[1]) fragment.appendChild(document.createTextNode(parts[1]));

                // Replace the original node with the fragment
                parent.replaceChild(fragment, node);
                break; // Exit after first match
            }
        }
    }

});

function handleBlurLevelChange(event) {
    const blurLevel = event.target.value;
    const highlightedTexts = document.querySelectorAll('#highlighted-text[data-flair="NSFW🔞"]');
    highlightedTexts.forEach(element => { element.style.setProperty('--blur-amount', `blur(${blurLevel}px)`); });
    document.getElementById('blur-value').textContent = blurLevel;
}

function injectBlurSlider() {
    const sliderContainer = createElement('div', { id: 'blur-slider-container', display: 'none', position: 'fixed' });
    const label = createElement('label', { htmlFor: 'blur-slider', textContent: 'Blur Level: ' });
    const slider = createElement('input', { type: 'range', id: 'blur-slider', name: 'blur-slider', min: '0', max: '10', value: '10' });
    const valueDisplay = createElement('span', { id: 'blur-value', textContent: '10' });
    const unit = createElement('span', { textContent: ' px' });
    slider.addEventListener('input', handleBlurLevelChange);
    sliderContainer.appendChild(label);
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    sliderContainer.appendChild(unit);
    document.body.appendChild(sliderContainer);
    let hideTimeout;

    document.body.addEventListener('mouseover', (event) => {
        const highlightedText = event.target.closest('#highlighted-text[data-flair="NSFW🔞"]');
        if (highlightedText) {
            clearTimeout(hideTimeout);
            const rect = highlightedText.getBoundingClientRect();
            sliderContainer.style.display = 'block';
            sliderContainer.style.top = `${rect.top - sliderContainer.offsetHeight}px`;
            sliderContainer.style.left = `${rect.left}px`;
        }
    });

    sliderContainer.addEventListener('mouseenter', () => { clearTimeout(hideTimeout); });

    document.body.addEventListener('mouseout', (event) => {
        const relatedTarget = event.relatedTarget;
        const highlightedText = event.target.closest('#highlighted-text[data-flair="NSFW🔞"]');
        if (highlightedText && !relatedTarget.closest('#highlighted-text[data-flair="NSFW🔞"]') && relatedTarget.id !== 'blur-slider-container' && !relatedTarget.closest('#blur-slider-container')) {
            hideTimeout = setTimeout(() => {
                sliderContainer.style.display = 'none';
            }, 300);
        }
    });

    sliderContainer.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
            sliderContainer.style.display = 'none';
        }, 300);
    });
}

readDom();