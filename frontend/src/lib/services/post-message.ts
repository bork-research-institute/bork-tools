import getUuidByString from 'uuid-by-string';
import { getClientEnv } from '../config/client-env';

export async function postMessage(message: string, userPublicKey: string) {
  const messageObject = {
    userId: getUuidByString(userPublicKey),
    agentId: '416659f6-a8ab-4d90-87b5-fd5635ebe37d',
    text: message,
  };
  const clientEnv = getClientEnv();
  console.log(clientEnv.NEXT_PUBLIC_BACKEND_URL);
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
    throw new Error('Failed to send message');
  }

  return response.json();
}
