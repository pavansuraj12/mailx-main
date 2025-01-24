document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginSection = document.getElementById('login-section');
  const emailSection = document.getElementById('email-section');
  const emailList = document.getElementById('email-list');

  // Login Event
  loginBtn.addEventListener('click', async () => {
    try {
      const { token } = await authenticateWithGoogle();

      loginSection.classList.add('hidden');
      emailSection.classList.remove('hidden');

      let emails = await fetchGmailMessages(token);

      // Sort emails by score (highest to lowest)
      emails.sort((a, b) => b.score - a.score);

      // Render emails
      emailList.innerHTML = emails
        .map(
          (email) => `
          <div class="email-item">
            <div class="email-header">
              <span class="label ${email.label.toLowerCase()}">${email.label}</span>
              <div class="score ${email.score > 80
              ? 'green'
              : email.score > 50
                ? 'yellow'
                : 'red'
            }">${email.score}</div>
            </div>
            <h3 class="email-title">${email.subject}</h3>
            <p class="email-info">Received: ${new Date(
              parseInt(email.internalDate)
            ).toLocaleString()}</p>
            <div class="email-actions">
              <button class="summarize" onclick="summarizeEmail('${email.id}')">Summarize</button>
              <button class="view" onclick="viewEmail('${email.id}')">View Full Email</button>
            </div>
          </div>
        `
        )
        .join('');
    } catch (error) {
      console.error('Login failed:', error);
      alert(error.message);
    }
  });

  // Logout Event
  logoutBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['authToken'], async ({ authToken }) => {
      if (!authToken) {
        alert('You are already logged out.');
        return;
      }

      chrome.identity.removeCachedAuthToken({ token: authToken }, async () => {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${authToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          console.log('Token revoked successfully.');
        } catch (error) {
          console.error('Error revoking token:', error);
        }

        chrome.storage.sync.set({ authToken: null }, () => {
          loginSection.classList.remove('hidden');
          emailSection.classList.add('hidden');
          emailList.innerHTML = '';
          alert('Logged out successfully.');
        });
      });
    });
  });
});
