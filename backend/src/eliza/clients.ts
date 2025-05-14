import type { Character, ClientInstance, IAgentRuntime } from '@elizaos/core';

export async function initializeClients(
  character: Character,
  runtime: IAgentRuntime,
): Promise<ClientInstance[]> {
  const clients = [];

  // if (character.settings.secrets.twitterUsername) {
  //   const twitterClient = await startTwitterClient(runtime);
  //   clients.push(twitterClient);
  // }

  // if (runtime.getSetting('INJECTIVE_ENABLED') === 'true') {
  //   const injectiveClient = await startInjectiveClient(runtime);
  //   clients.push(injectiveClient);
  // }
  if (character.plugins?.length > 0) {
    for (const plugin of character.plugins) {
      if (plugin.clients) {
        for (const client of plugin.clients) {
          clients.push(await client.start(runtime));
        }
      }
    }
  }

  return clients;
}
