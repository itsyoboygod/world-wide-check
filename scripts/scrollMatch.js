// document.addEventListener('DOMContentLoaded', () => {
//     const scanButton = document.getElementById('id_scan-btn');
  
//     scanButton.addEventListener('click', () => {
//       try {
//         const reportTitleElements = document.querySelectorAll('[id^="id_report_title_"]');
//         const userContentElements = document.querySelectorAll('p');
  
//         let matchCount = 0;
  
//         for (let i = 0; i < userContentElements.length; i++) {
//           const userContentElement = userContentElements[i];
//           const userContent = userContentElement.textContent.trim();
  
//           for (let j = 0; j < reportTitleElements.length; j++) {
//             const reportTitleElement = reportTitleElements[j];
//             const reportTitleContent = reportTitleElement.textContent.trim();
  
//             if (userContent.includes(reportTitleContent)) {
//               userContentElement.style.backgroundColor = 'red';
//               matchCount++;
  
//               // Scroll to the matched text
//               userContentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
//             }
//           }
//         }
  
//         console.log(`Total matches found: ${matchCount}`);
//       } catch (error) {
//         console.error('An error occurred:', error);
//       }
//     });
//   });
  