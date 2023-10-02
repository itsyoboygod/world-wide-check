const usrurl = window.location.href.replace(/\s/g, '');

const payload = {
  usrurl: usrurl
};

chrome.storage.local.set(payload).then(() => {
  // console.log("usrURL: " , payload.usrurl);
})