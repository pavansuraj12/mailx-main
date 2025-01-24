async function authenticateWithGoogle() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${token}`)
        .then((response) => {
          if (!response.ok) throw new Error('Failed to fetch user profile');
          return response.json();
        })
        .then((userInfo) => {
          chrome.storage.sync.set({ authToken: token });
          resolve({ token, userInfo });
        })
        .catch((error) => reject(error));
    });
  });
}
