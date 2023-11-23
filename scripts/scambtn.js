// chrome.storage.local.get(['postData'], function (result) {
//     const postData = result.postData;
//     if (postData) {
//       const postTitle = postData.postTitle;
//       console.log('Retrieved postTitle from local storage:', postTitle);
  
//       let matchCount = 0;
//       const matchingTitles = [];
  
//       const title = "postTitle";
  
//       // Create a regular expression for matching the title
//       const regex = new RegExp(title, 'gi');
  
//       // Get all text nodes in the webpage
//       const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

//       // Iterate over the text nodes and highlight the matched titles
//       while (textNode = textNodes.nextNode()) {
//         if (regex.test(textNode.textContent)) {
//           const matchedText = textNode.textContent;
  
//           const replacedText = matchedText.replace(
//             regex,
//             `<span id="id_span_match" class="highlight" style="
//               display: -webkit-inline-box;
//               background-color: orange;
//               position: relative;">
//               <p id="id_p_match" style="
//                 display: flex;
//                 background-color: transparent;
//                 margin: 1px;
//                 padding: 1px;
//                 // mix-blend-mode: difference;
//                 font-weight: bolder">${title}</p>
//               <i style="
//                 content: '*';
//                 position: absolute;
//                 right: -0.5em;
//                 top: -0.5em;
//                 min-width: 5px;
//                 min-height: 6px;
//                 outline: solid 3px;
//                 display: flex;
//                 justify-content: center;
//                 align-items: center;
//                 border-radius: 50%;
//                 color: white;
//                 background-color: red;
//                 line-height: 0px;
//                 font-family: monospace;
//                 padding: 1.2%;
//                 font-weight: 700;
//                 z-index: 999;
//                 font-size: .8rem;">!</i></span>`
//           );
//           textNode.parentNode.innerHTML = replacedText;
//           matchCount++;
//           matchingTitles.push(title);
  
//           // Scroll to the matched text
//           const matchedElement = document.getElementById('id_span_match');
//           if (matchedElement && matchedElement.scrollIntoView) {
//             matchedElement.scrollIntoView({
//               behavior: 'smooth',
//               block: 'center'
//             });
//           } else if (matchedElement && matchedElement.offsetTop !== undefined) {
//             window.scrollTo({
//               top: matchedElement.offsetTop,
//               behavior: 'smooth'
//             });
//           }
  
//           // Blink the background color smoothly
//           const blinkDuration = 3000; // 3 seconds
//           const blinkInterval = setInterval(function () {
//             const highlightElement = document.getElementById('id_span_match');
//             if (highlightElement) {
//               const currentBgColor = window.getComputedStyle(highlightElement).backgroundColor;
//               const blinkColor = currentBgColor === 'orange' ? 'transparent' : 'orange';
//               highlightElement.style.backgroundColor = blinkColor;
//             } else {
//               clearInterval(blinkInterval);
//             }
//           }, 500);
  
//           // Stop the blinking after the specified duration
//           setTimeout(function () {
//             clearInterval(blinkInterval);
//           }, blinkDuration);
//         }
//       }
//     }
//   });