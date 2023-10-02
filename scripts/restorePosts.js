function restorePostsFromLocalStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('listHTML', (result) => {
        const { listHTML } = result;
        if (listHTML) {
          isDataLoaded = true;
          const ulElement = document.createElement('ul');
          ulElement.id = 'post_list';
          ulElement.classList.add('ul__table');
          ulElement.innerHTML = listHTML;
          const popupContainer = document.getElementById('popup-container');
          popupContainer.appendChild(ulElement);
        }
        resolve();
      });
    });
  }