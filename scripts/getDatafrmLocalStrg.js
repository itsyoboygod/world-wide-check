function getDataFromLocalStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('postsData', (result) => {
        const { postsData } = result;
        if (postsData) {
          resolve(postsData);
        } else {
          resolve([]);
        }
      });
    });
  }