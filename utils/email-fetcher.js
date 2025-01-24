async function fetchGmailMessages(authToken) {
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

    // Fetch message details
    return await Promise.all(
      messageList.messages.map(async (message) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!detailResponse.ok)
          throw new Error('Failed to fetch message details.');

        const email = await detailResponse.json();
        const subjectHeader = email.payload.headers.find((h) => h.name === 'Subject');

        const subject = subjectHeader ? subjectHeader.value : 'No Subject';
        const label = assignLabel(subject);
        const score = calculateScore(label);

        return {
          id: message.id,
          subject,
          label,
          score,
          internalDate: email.internalDate,
        };
      })
    );
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    return [];
  }
}

function assignLabel(subject) {
  if (subject.toLowerCase().includes('internship')) return 'Internship';
  if (subject.toLowerCase().includes('worship')) return 'Worship';
  if (subject.toLowerCase().includes('hackathon')) return 'Hackathon';
  return 'General';
}

function calculateScore(label) {
  switch (label) {
    case 'Internship':
      return 90;
    case 'Hackathon':
      return 80;
    case 'Worship':
      return 70;
    default:
      return 50;
  }
}
