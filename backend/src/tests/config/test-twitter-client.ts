import {
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import type { TwitterService } from '../../bork-protocol/services/twitter/twitter-service';

export class TestTwitterClient implements ClientInstance {
  public twitterService: TwitterService;

  constructor(_runtime: IAgentRuntime) {
    // Create a minimal TwitterService with just the methods we need for tests
    this.twitterService = {
      cacheTweet: async () => {},
      initialize: async () => true,
    } as unknown as TwitterService;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TestTwitterClient] Starting test Twitter client');
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TestTwitterClient] Stopping test Twitter client');
  }
}

export async function startTestTwitterClient(
  runtime: IAgentRuntime,
): Promise<ClientInstance> {
  const client = new TestTwitterClient(runtime);
  await client.start();
  return client;
}
