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
    }
});

readDom();
