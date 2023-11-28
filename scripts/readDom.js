function readDom() {
    const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let fullHTMLTEXT = '';

    while (textNodes.nextNode()) {
        let textNode = textNodes.currentNode;
        fullHTMLTEXT += textNode.nodeValue.trim() + ' ';
    }

    chrome.runtime.sendMessage({ action: 'sendfullHTMLTEXT', fullTxt: fullHTMLTEXT.trim() });
}

readDom();
