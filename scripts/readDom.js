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
            if (parent.closest('#highlighted-text')) {
                continue;
            }
            const nodeText = currentNode.nodeValue.trim();
            if (nodeText.includes(matchingText)) {
                const parts = nodeText.split(matchingText);
                const span = document.createElement('span');
                span.id = 'highlighted-text';
                span.dataset.flair = request.flair;
                span.style.setProperty('--clr-flair', request.clrFlair);
                span.textContent = matchingText;
                const fragment = document.createDocumentFragment();
                if (parts[0]) {
                    fragment.appendChild(document.createTextNode(parts[0]));
                }
                fragment.appendChild(span);
                if (parts[1]) {
                    fragment.appendChild(document.createTextNode(parts[1]));
                }
                parent.replaceChild(fragment, currentNode);
            }
        }

        if (!document.getElementById('blur-slider')) {
            injectBlurSlider();
        }
    }
});

function handleBlurLevelChange(event) {
    const blurLevel = event.target.value;
    const highlightedTexts = document.querySelectorAll('#highlighted-text[data-flair="NSFW🔞"]');
    highlightedTexts.forEach(element => {
        element.style.setProperty('--blur-amount', `blur(${blurLevel}px)`);
    });
    document.getElementById('blur-value').textContent = blurLevel;
}

function injectBlurSlider() {
    const sliderContainer = document.createElement('div');
    sliderContainer.id = 'blur-slider-container';
    sliderContainer.style.display = 'none';
    sliderContainer.style.position = 'fixed';

    const label = document.createElement('label');
    label.htmlFor = 'blur-slider';
    label.textContent = 'Blur Level: ';
    sliderContainer.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'blur-slider';
    slider.name = 'blur-slider';
    slider.min = '0';
    slider.max = '10';
    slider.value = '10';
    slider.style.margin = '0 10px';
    sliderContainer.appendChild(slider);

    const valueDisplay = document.createElement('span');
    valueDisplay.id = 'blur-value';
    valueDisplay.textContent = '10';
    sliderContainer.appendChild(valueDisplay);

    const unit = document.createElement('span');
    unit.textContent = ' px';
    sliderContainer.appendChild(unit);

    document.body.appendChild(sliderContainer);

    slider.addEventListener('input', handleBlurLevelChange);

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

    sliderContainer.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
    });

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