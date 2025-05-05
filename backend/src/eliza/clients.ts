import { startInjectiveClient } from '@/clients/injective-client';
import { startTwitterClient } from '@/clients/x-client';
import type { Character, ClientInstance, IAgentRuntime } from '@elizaos/core';

export async function initializeClients(
  _character: Character,
  runtime: IAgentRuntime,
): Promise<ClientInstance[]> {
  const clients = [];

  if (runtime.getSetting('TWITTER_USERNAME')) {
    const twitterClient = await startTwitterClient(runtime);
    clients.push(twitterClient);
  }

  if (runtime.getSetting('INJECTIVE_ENABLED') === 'true') {
    const injectiveClient = await startInjectiveClient(runtime);
    clients.push(injectiveClient);
  }

  return clients;
}
