function createElement(tag, attributes = {}) {
    const element = document.createElement(tag);
    Object.assign(element, attributes);
    return element;
}

function openFlagModal(flags, selectedText) {
    if (document.getElementById("target-overlay")) return;

    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "target-overlay";
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10000;`;

    // Create modal
    const modal = document.createElement("div");
    modal.id = "target-modal";
    modal.style.cssText = `
        background: white; padding: 1rem; border-radius: 5px; text-align: center;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);`;

    // Title and selected text preview
    const title = document.createElement("h3");
    title.textContent = "Flag this paragraph";
    const textParagraph = document.createElement("p");
    textParagraph.id = "target-txt_selected";
    textParagraph.textContent = selectedText;

    // Dropdown to select flag reason
    const flagSelect = document.createElement("select");
    flagSelect.id = "target-select-input";
    flags.forEach((flag) => {
        const option = document.createElement("option");
        option.value = flag;
        option.textContent = flag;
        flagSelect.appendChild(option);
    });

    // reCAPTCHA button (Opens a new popup)
    const captchaBtn = document.createElement("button");
    captchaBtn.textContent = "Verify reCAPTCHA";
    captchaBtn.style.cssText = "margin-top: 10px; padding: 5px 10px; cursor: pointer;";

    // Confirm button (disabled until reCAPTCHA is verified)
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Submit Report";
    confirmBtn.disabled = true;
    confirmBtn.style.cssText = "margin-top: 10px; padding: 5px 10px; cursor: pointer;";

    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "margin-left: 10px; padding: 5px 10px; cursor: pointer;";
    cancelBtn.onclick = () => document.body.removeChild(overlay);

    // Open reCAPTCHA in a popup (Hosted on GitHub Pages)
    captchaBtn.onclick = () => {
        const recaptchaUrl = "https://itsyoboygod.github.io/recaptcha-page/";
        const popup = window.open(
            recaptchaUrl,
            "reCAPTCHA",
            "width=500,height=600"
        );

        // Listen for message from the reCAPTCHA page
        window.addEventListener("message", (event) => {
            console.log("Message received from reCAPTCHA:", event);

            // Ensure the message is coming from the correct origin
            if (event.origin === "https://itsyoboygod.github.io") {
                if (event.data === "recaptchaSuccess") {
                    console.log("✅ reCAPTCHA Verified!");
                    confirmBtn.disabled = false;
                    captchaBtn.textContent = "Verified ✅";
                    captchaBtn.disabled = true;
                    popup.close();
                } else {
                    console.log("❌ reCAPTCHA Verification Failed.");
                }
            }
        }, { once: true });
    };

    // Submit button action
    confirmBtn.onclick = async () => {
        const selectedFlair = flagSelect.value;
        injectTargetTextIntoDOM(selectedText, selectedFlair);
        const pageUrl = window.location.href;
        await saveReportToGist(pageUrl, selectedText, selectedFlair);
        document.body.removeChild(overlay);
    };

    // Append elements to the modal and overlay
    modal.appendChild(title);
    modal.appendChild(textParagraph);
    modal.appendChild(flagSelect);
    modal.appendChild(captchaBtn);
    modal.appendChild(confirmBtn);
    modal.appendChild(cancelBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
    // Modify the message listener to use openFlagModal
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "openFlagModal") {
            openFlagModal(request.flags, request.selectedText);
        }
    });

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
                const span = createElement('span', { id: 'highlighted-text', textContent: `${matchingText}`, });
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

    const GIST_URL = "https://gist.github.com/itsyoboygod";
    let GIST_TOKEN = "";

    // ✅ Fetch GIST_TOKEN securely
    fetchGistTokenFromGitHubActions().then(token => {
        if (token) {
            GIST_TOKEN = token;
            console.log("✅ GIST_TOKEN Loaded Securely:", GIST_TOKEN);
        } else {
            console.error("❌ GIST_TOKEN is not available");
        }
    });


    // ✅ Load Config (Fetches the GIST_TOKEN)
    async function loadConfig() {
        try {
            const response = await fetch("https://itsyoboygod.github.io/world-wide-check/gist-proxy.json");
            if (!response.ok) throw new Error("Config file not found");

            const config = await response.json();
            if (!config.GIST_TRIGGER_PAT) throw new Error("GIST_TRIGGER_PAT is missing");

            console.log("✅ Successfully fetched GIST_TRIGGER_PAT");
            return config.GIST_TRIGGER_PAT;
        } catch (error) {
            console.warn("⚠️ Could not load GIST_TOKEN:", error);
            return null;
        }
    }

    // ✅ Fetch Reddit Reports
    async function fetchRedditReports(url) {
        try {
            const apiUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Reddit API responded with ${response.status}`);

            const data = await response.json();
            console.log("✅ Reddit Reports Retrieved:", data);
            return data.data.children.map(post => post.data);
        } catch (error) {
            console.error("❌ Error fetching Reddit reports:", error);
            return [];
        }
    }

    // ✅ Fetch Anonymous Reports from Gist
    async function fetchAnonymousReports() {
        if (!GIST_TOKEN) {
            console.warn("⚠️ GIST_TOKEN is not available. Retrying...");
            return [];
        }

        try {
            const response = await fetch("https://api.github.com/gists", {
                method: "GET",
                headers: {
                    "Authorization": `token ${GIST_TOKEN}`
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API responded with ${response.status}`);
            }

            const gists = await response.json();
            console.log("✅ Anonymous Reports Retrieved:", gists);

            return gists;
        } catch (error) {
            console.error("❌ Error retrieving anonymous reports:", error);
            return [];
        }
    }


    // ✅ Inject Highlighted Text into DOM
    function injectTargetTextIntoDOM(selectedText, selectedFlair) {
        if (!selectedText || !selectedFlair) {
            console.warn("⚠️ No text or flair provided to highlight.");
            return;
        }

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;

        while ((node = walker.nextNode())) {
            const parent = node.parentNode;
            if (parent.closest("#highlighted-text, #target-txt_selected")) continue;

            const nodeText = node.nodeValue.trim();
            if (nodeText.includes(selectedText)) {
                const parts = nodeText.split(selectedText);
                const span = document.createElement("span");
                span.id = "target-txt_selected";
                span.textContent = selectedText;
                span.dataset.flair = selectedFlair;
                span.style.setProperty("--clr-flair", selectedFlair);

                const fragment = document.createDocumentFragment();
                if (parts[0]) fragment.appendChild(document.createTextNode(parts[0]));
                fragment.appendChild(span);
                if (parts[1]) fragment.appendChild(document.createTextNode(parts[1]));

                parent.replaceChild(fragment, node);
                break;
            }
        }
    }

    // ✅ Process and Display Reports
    async function displayExistingReports() {
        const pageUrl = window.location.href;

        const [redditReports, anonymousReports] = await Promise.all([
            fetchRedditReports(pageUrl),
            fetchAnonymousReports(GIST_TOKEN)
        ]);

        console.log("✅ Reddit Reports:", redditReports);
        console.log("✅ Anonymous Reports:", anonymousReports);

        redditReports.forEach(report => {
            injectTargetTextIntoDOM(report.title || report.selftext, "Reported");
        });

        anonymousReports.forEach(gist => {
            fetch(gist.files["report.json"].raw_url)
                .then(response => response.json())
                .then(data => injectTargetTextIntoDOM(data.selectedText, data.selectedFlair))
                .catch(error => console.warn("⚠️ Skipping invalid report:", error));
        });
    }

    async function saveReportToGist(url, selectedText, selectedFlair) {
        if (!GIST_TOKEN) {
            console.error("❌ GIST_TOKEN is not available");
            return;
        }

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
            console.log("🔄 Sending request to GitHub API:", JSON.stringify(gistData, null, 2));

            const response = await fetch("https://api.github.com/gists", {
                method: "POST",
                headers: {
                    "Authorization": `token ${GIST_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(gistData)
            });

            const data = await response.json();
            console.log("✅ GitHub API Response:", data);

            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.status} - ${data.message || "Unknown error"}`);
            }

            console.log("✅ Report saved as Gist:", data.html_url);
            return data.html_url;
        } catch (error) {
            console.error("❌ Error saving report to Gist:", error);
        }
    }


    async function fetchGistTokenFromGitHubActions() {
        try {
            console.log("🔄 Fetching GIST_TRIGGER_PAT...");
            const response = await fetch("https://itsyoboygod.github.io/world-wide-check/gist-proxy.json");

            if (!response.ok) {
                throw new Error(`GitHub API responded with ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Successfully fetched GIST_TRIGGER_PAT:", data);

            if (!data.GIST_TRIGGER_PAT) {
                throw new Error("❌ GIST_TRIGGER_PAT is missing from response.");
            }

            return data.GIST_TRIGGER_PAT;
        } catch (error) {
            console.error("❌ Failed to fetch GIST_TRIGGER_PAT:", error);
            return null;
        }
    }


    // ✅ Initialize Everything
    async function init() {
        const GIST_TOKEN = await loadConfig();
        displayExistingReports(GIST_TOKEN);
    }

    init();

    // ✅ Listen for messages from the extension
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "openFlagModal") {
            openFlagModal(request.flags, request.selectedText);
        }
    });

    function openFlagModal(flags, selectedText) {
        if (document.getElementById("target-overlay")) return;

        // Create overlay
        const overlay = document.createElement("div");
        overlay.id = "target-overlay";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; justify-content: center;
            align-items: center; z-index: 10000;
        `;

        // Create the modal
        const modal = document.createElement("div");
        modal.id = "target-modal";
        modal.style.cssText = `
            background: white; padding: 1rem; border-radius: 5px; text-align: center;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        `;

        // Title and selected text preview
        const title = document.createElement("h3");
        title.textContent = "Flag this paragraph";
        const textParagraph = document.createElement("p");
        textParagraph.id = "target-txt_selected";
        textParagraph.textContent = selectedText;

        // Dropdown to select flag reason
        const flagSelect = document.createElement("select");
        flagSelect.id = "target-select-input";
        flags.forEach((flag) => {
            const option = document.createElement("option");
            option.value = flag;
            option.textContent = flag;
            flagSelect.appendChild(option);
        });

        // Confirm button (disabled until reCAPTCHA is solved)
        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = "Submit Report";
        confirmBtn.disabled = true;
        confirmBtn.style.cssText = "margin-top: 1rem; padding: 5px 10px; cursor: pointer;";

        // Cancel button
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.cssText = "margin-left: 10px; padding: 5px 10px; cursor: pointer;";
        cancelBtn.onclick = () => document.body.removeChild(overlay);

        // Function to open reCAPTCHA popup
        function openRecaptchaPopup() {
            const recaptchaUrl = "https://itsyoboygod.github.io/recaptcha-page/";
            const popup = window.open(recaptchaUrl, "reCAPTCHA", "width=500,height=600");

            // Listen for reCAPTCHA verification success from the popup
            window.addEventListener("message", function (event) {
                if (event.origin === "https://itsyoboygod.github.io") {
                    if (event.data === "recaptchaSuccess") {
                        console.log("✅ reCAPTCHA Verified!");
                        confirmBtn.disabled = false;
                    } else {
                        console.log("❌ reCAPTCHA Failed.");
                    }
                }
            });
        }

        // Open reCAPTCHA popup when clicking the button
        const recaptchaBtn = document.createElement("button");
        recaptchaBtn.textContent = "Verify reCAPTCHA";
        recaptchaBtn.style.cssText = "margin-top: 1rem; padding: 5px 10px; cursor: pointer;";
        recaptchaBtn.onclick = openRecaptchaPopup;

        // Submit button action (only works if reCAPTCHA was verified)
        confirmBtn.onclick = async () => {
            if (!confirmBtn.disabled) {
                const selectedFlair = flagSelect.value;
                injectTargetTextIntoDOM(selectedText, selectedFlair);
                const pageUrl = window.location.href;
                await saveReportToGist(pageUrl, selectedText, selectedFlair);
                document.body.removeChild(overlay);
            } else {
                alert("You must complete reCAPTCHA before submitting!");
            }
        };

        // Append elements
        modal.append(title, textParagraph, flagSelect, recaptchaBtn, confirmBtn, cancelBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
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