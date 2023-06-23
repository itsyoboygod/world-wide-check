const usrurl = window.location.href.replace(/\s/g, '');

const payload = {
  usrurl: usrurl
};

chrome.storage.local.set({ payload }, () => {
  console.log(`
usrURL: ${usrurl}
  `);
});
