function readDom() {
    const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let fullHTMLTEXT = '';
    while (textNodes.nextNode()) {
        let textNode = textNodes.currentNode;
        fullHTMLTEXT += textNode.nodeValue.trim() + ' ';
    }
    chrome.runtime.sendMessage({ action: 'sendfullHTMLTEXT', fullTxt: fullHTMLTEXT.trim() });
}
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'matchingTitleSelected') {
        const matchingText = request.payload;
        const paragraphs = document.querySelectorAll('p');

        paragraphs.forEach(paragraph => {
            const paragraphText = paragraph.textContent;
            if (paragraphText.includes(matchingText)) {
                const parts = paragraphText.split(matchingText);
                const span = document.createElement('span');
                span.textContent = matchingText;

                const newTextContent = parts.join(`
                    <span id="highlighted-text" data-flair="${request.flair}">
                        ${matchingText}
                    </span>`);
                paragraph.innerHTML = newTextContent;
            }
        });
        document.documentElement.style.setProperty('--clr-flair', request.clrFlair);
    }
});
readDom();