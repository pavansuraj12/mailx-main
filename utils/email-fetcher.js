async function fetchGmailMessages(authToken) {
  const priorityKeywords = ["internship", "hackathon", "student", "career", "opportunity"];
  const dateRegex = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\b\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/g;

  try {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch messages.');

    const messageList = await response.json();
    if (!messageList.messages) return [];

    const today = new Date();

    // Fetch message details
    const emails = await Promise.all(
      messageList.messages.map(async (message) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!detailResponse.ok) throw new Error('Failed to fetch message details.');

        const email = await detailResponse.json();
        const subjectHeader = email.payload.headers.find((h) => h.name === 'Subject');
        const bodyData = email.payload.body.data;
        const decodedBody = bodyData
          ? atob(bodyData.replace(/-/g, '+').replace(/_/g, '/'))
          : '';

        // Calculate keyword score
        const content = `${subjectHeader?.value || ''} ${decodedBody}`.toLowerCase();
        const keywordScore = priorityKeywords.reduce(
          (score, keyword) => score + (content.split(keyword.toLowerCase()).length - 1),
          0
        );

        // Extract dates and calculate date-based adjustment
        const dates = [...content.matchAll(dateRegex)];
        let dateAdjustment = 0;

        if (dates.length > 0) {
          dates.forEach((match) => {
            const date = new Date(match[0]);
            if (!isNaN(date)) {
              const daysRemaining = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
              if (daysRemaining >= 0) {
                dateAdjustment += Math.max(50 - daysRemaining, 0); // Higher priority for closer dates
              }
            }
          });
        }

        const priorityScore = keywordScore + dateAdjustment;

        return {
          id: message.id,
          subject: subjectHeader ? subjectHeader.value : 'No Subject',
          internalDate: email.internalDate,
          keywordScore,
          dateAdjustment,
          priorityScore,
        };
      })
    );

    return emails;
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    return [];
  }
}
