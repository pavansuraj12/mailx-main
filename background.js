chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ authToken: null, userProfile: null });
    console.log('Extension installed.');
  });
  