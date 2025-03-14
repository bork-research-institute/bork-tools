import {
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import { Scraper } from 'agent-twitter-client';
import { TwitterAccountsClient } from './clients/accounts';
import { TwitterInteractionClient } from './clients/interactions';
import { TwitterSearchClient } from './clients/search';
import { TwitterService } from './services/twitter.service';

export class TwitterClient implements ClientInstance {
  private readonly runtime: IAgentRuntime;
  private twitterService: TwitterService | null = null;
  private accountsClient: TwitterAccountsClient | null = null;
  private searchClient: TwitterSearchClient | null = null;
  private interactionClient: TwitterInteractionClient | null = null;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterClient] Starting Twitter client');

    const twitterUsername = this.runtime.getSetting('TWITTER_USERNAME');
    const twitterPassword = this.runtime.getSetting('TWITTER_PASSWORD');
    const twitterEmail = this.runtime.getSetting('TWITTER_EMAIL');

    if (!twitterUsername || !twitterPassword || !twitterEmail) {
      elizaLogger.error(
        '[TwitterClient] Twitter credentials not found in settings',
      );
      return;
    }

    try {
      elizaLogger.info('[TwitterClient] Creating Twitter client');
      const twitterClient = new Scraper();

      // Initialize the Twitter service with the unauthenticated client
      // TwitterAuthService will handle authentication
      this.twitterService = new TwitterService(twitterClient, this.runtime);
      const initialized = await this.twitterService.initialize();

      if (!initialized) {
        throw new Error('Failed to initialize Twitter service');
      }

      elizaLogger.info('[TwitterClient] Initialized Twitter service');

      // Set target users if configured
      const targetUsers = this.runtime.getSetting('TWITTER_TARGET_USERS');
      if (targetUsers) {
        this.twitterService.setTargetUsers(
          targetUsers.split(',').map((u) => u.trim()),
        );
      }

      elizaLogger.info('[TwitterClient] Initializing clients');
      // Initialize and start all clients
      this.accountsClient = new TwitterAccountsClient(
        this.twitterService,
        this.runtime,
      );
      this.searchClient = new TwitterSearchClient(
        this.twitterService,
        this.runtime,
      );
      this.interactionClient = new TwitterInteractionClient(
        this.twitterService,
        this.runtime,
      );

      await this.accountsClient.start();
      await this.searchClient.start();
      await this.interactionClient.start();

      elizaLogger.info('[TwitterClient] Twitter client started successfully');
    } catch (error) {
      elizaLogger.error(
        '[TwitterClient] Error starting Twitter client:',
        error,
      );
      throw error;
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterClient] Stopping Twitter client');
    try {
      // Stop all clients in reverse order
      if (this.interactionClient) {
        await this.interactionClient.stop();
      }
      if (this.searchClient) {
        await this.searchClient.stop();
      }
      if (this.accountsClient) {
        await this.accountsClient.stop();
      }
      elizaLogger.info('[TwitterClient] Twitter client stopped successfully');
    } catch (error) {
      elizaLogger.error(
        '[TwitterClient] Error stopping Twitter client:',
        error,
      );
      throw error;
    }
  }
}

export async function startTwitterClient(
  runtime: IAgentRuntime,
): Promise<ClientInstance> {
  const client = new TwitterClient(runtime);
  await client.start();
  return client;
}
