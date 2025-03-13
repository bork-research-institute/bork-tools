import type { Character, IAgentRuntime } from '@elizaos/core';
import TwitterClientInterface from '../plugins/twitter-client/src';

export async function initializeClients(
  _character: Character,
  runtime: IAgentRuntime,
) {
  const clients = [];

  if (runtime.getSetting('TWITTER_USERNAME')) {
    const twitterClient = await TwitterClientInterface.start(runtime);
    clients.push(twitterClient);
  }

  return clients;
}
