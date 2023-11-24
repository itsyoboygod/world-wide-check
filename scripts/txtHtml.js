let textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
let textNode = textNodes.nextNode()
let txtHtml = '';

while (textNode) {
    txtHtml += textNode.textContent;
    textNode = textNodes.nextNode();
}

chrome.runtime.sendMessage({ action: 'get_page_content', txtHtml: txtHtml});