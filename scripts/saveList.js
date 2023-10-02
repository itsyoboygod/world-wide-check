function saveList() {
    restorePostsFromLocalStorage()
      .then(() => {
        if (!isDataLoaded) {
          fetchSubredditPosts(scanButton, currentTabId);
        }
      })
      .catch((error) => {
        console.log('Error occurred while restoring data from local storage:', error);
        fetchSubredditPosts(scanButton, currentTabId);
      });

    window.addEventListener('beforeunload', () => {
      if (isDataLoaded) {
        const ulElement = document.getElementById('post_list');
        if (ulElement) {
          saveDataToLocalStorage(ulElement);
        } else {
          removePostsFromLocalStorage();
        }
      } else {
        removePostsFromLocalStorage();
      }
    });
  }