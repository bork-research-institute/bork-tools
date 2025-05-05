import { API_URL } from '../constants/api-url';

export async function postMessage(message: string) {
  const messageObject = {
    userId: '00000000-0000-0000-0000-000000000000',
    agentId: '416659f6-a8ab-4d90-87b5-fd5635ebe37d',
    text: message,
  };
  const response = await fetch(`${API_URL}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...messageObject,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}
