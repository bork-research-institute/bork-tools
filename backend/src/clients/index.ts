import type { Character, ClientInstance, IAgentRuntime } from '@elizaos/core';
import { startTwitterClient } from '../plugins/twitter-client';

export async function initializeClients(
  _character: Character,
  runtime: IAgentRuntime,
): Promise<ClientInstance[]> {
  const clients = [];

  if (runtime.getSetting('TWITTER_USERNAME')) {
    const twitterClient = await startTwitterClient(runtime);
    clients.push(twitterClient);
  }

  return clients;
}
