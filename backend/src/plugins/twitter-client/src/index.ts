import { type Client, type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { ClientBase } from './base.js';
import { validateTwitterConfig } from './config/env.js';
import { TwitterInteractionClient } from './interactions.js';

class TwitterManager {
  client: ClientBase;
  interaction: TwitterInteractionClient;

  constructor(runtime: IAgentRuntime) {
    this.client = new ClientBase(runtime);
    this.interaction = new TwitterInteractionClient(this.client, runtime);
  }

  async stop(): Promise<void> {
    // Cleanup resources
    if (this.interaction?.stop) {
      await this.interaction.stop();
    }
    if (this.client?.stop) {
      await this.client.stop();
    }
  }
}

interface ExtendedClient extends Client {
  stop?: (runtime: IAgentRuntime) => Promise<void>;
}

export const TwitterClientInterface: ExtendedClient = {
  name: 'twitter',
  config: {},
  async start(runtime: IAgentRuntime) {
    elizaLogger.info('[Twitter Client ] Twitter client starting');
    await validateTwitterConfig(runtime);

    const manager = new TwitterManager(runtime);
    await manager.client.init();
    await manager.interaction.start();
    return manager;
  },
  async stop(runtime: IAgentRuntime) {
    elizaLogger.info('Twitter client stopping');
    const manager = await this.start(runtime);
    await manager.stop();
    elizaLogger.info('Twitter client stopped');
  },
};

export default TwitterClientInterface;
