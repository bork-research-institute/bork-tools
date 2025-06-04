import { getClientEnv } from '@/lib/config/client-env';
import getUuidByString from 'uuid-by-string';

export async function postMessage(message: string, userPublicKey: string) {
  const messageObject = {
    userId: getUuidByString(userPublicKey),
    userPublicKey: userPublicKey,
    agentId: '416659f6-a8ab-4d90-87b5-fd5635ebe37d',
    text: message,
  };
  const clientEnv = getClientEnv();
  const response = await fetch(`${clientEnv.NEXT_PUBLIC_BACKEND_URL}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...messageObject,
    }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Insufficient token balance');
    }
    throw new Error('Failed to send message');
  }

  return response.json();
}
