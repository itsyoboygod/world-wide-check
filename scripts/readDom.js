function readDom() {
    const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode = textNodes.nextNode()
    let fullHTMLTEXT = textNode.parentNode.innerHTML
    chrome.runtime.sendMessage({ action: 'sendfullHTMLTEXT', fullTxt: fullHTMLTEXT });
}
readDom()