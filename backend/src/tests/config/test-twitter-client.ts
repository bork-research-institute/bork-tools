import {
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import { Scraper } from 'agent-twitter-client';
import { TwitterService } from '../../bork-protocol/services/twitter/twitter-service';

export class TestTwitterClient implements ClientInstance {
  public twitterService: TwitterService;
  private twitterClient: Scraper;

  constructor(runtime: IAgentRuntime) {
    this.twitterClient = new Scraper();
    this.twitterService = new TwitterService(this.twitterClient, runtime);
  }

  async start(): Promise<void> {
    elizaLogger.info('[TestTwitterClient] Starting test Twitter client');
    const initialized = await this.twitterService.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize Twitter service');
    }
    elizaLogger.info(
      '[TestTwitterClient] Successfully initialized Twitter service',
    );
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
