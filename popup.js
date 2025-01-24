document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginSection = document.getElementById('login-section');
  const emailSection = document.getElementById('email-section');
  const emailList = document.getElementById('email-list');

  const deadlineKeywords = ["last date", "deadline", "apply by", "submission date"];
  const dateRegex = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\b\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/g;

  // Function to determine color based on priority
  function getColor(priority) {
    if (priority >= 80) return 'green';
    if (priority >= 50) return 'yellow';
    return 'red';
  }

  // Login Event
  loginBtn.addEventListener('click', async () => {
    try {
      const { token, userInfo } = await authenticateWithGoogle();
      console.log('Authentication successful:', userInfo);

      loginSection.classList.add('hidden');
      emailSection.classList.remove('hidden');

      const emails = await fetchGmailMessages(token);
      const today = new Date();

      // Enhance and sort emails based on deadline and keywords
      const enhancedEmails = emails.map((email) => {
        const content = `${email.subject} ${email.body || ''}`.toLowerCase();
        let dateAdjustment = 0;
        let isDeadlineEmail = false;

        // Check for deadline-related keywords and extract dates
        deadlineKeywords.forEach((keyword) => {
          if (content.includes(keyword)) {
            isDeadlineEmail = true;
          }
        });

        const dates = [...content.matchAll(dateRegex)];
        if (dates.length > 0) {
          dates.forEach((match) => {
            const date = new Date(match[0]);
            if (!isNaN(date)) {
              const daysRemaining = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
              if (daysRemaining >= 0) {
                // Increase score based on proximity to the deadline
                dateAdjustment += Math.max(100 - daysRemaining, 0);
              }
            }
          });
        }

        // Boost score for emails containing deadline keywords
        if (isDeadlineEmail) {
          dateAdjustment += 50; // Add a static boost for deadline mentions
        }

        // Calculate total priority score
        const totalScore = email.keywordScore + dateAdjustment;

        return {
          ...email,
          dateAdjustment,
          totalScore,
        };
      });

      // Sort by total score (descending)
      const sortedEmails = enhancedEmails.sort((a, b) => b.totalScore - a.totalScore);

      // Calculate normalized priority
      const maxScore = Math.max(...sortedEmails.map((email) => email.totalScore), 1);
      const normalizedEmails = sortedEmails.map((email) => ({
        ...email,
        normalizedPriority: Math.ceil((email.totalScore / maxScore) * 100),
      }));

      // Render sorted emails
      emailList.innerHTML = normalizedEmails
        .map((email) => {
          const color = getColor(email.normalizedPriority);
          return `
                      <div class="email-item" style="border-left: 5px solid ${color};">
                          <h3>${email.subject}</h3>
                          <p>Priority: ${email.normalizedPriority} (Keyword Score: ${email.keywordScore}, Date Adjustment: ${email.dateAdjustment})</p>
                          <p>${new Date(parseInt(email.internalDate)).toLocaleString()}</p>
                      </div>
                  `;
        })
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
