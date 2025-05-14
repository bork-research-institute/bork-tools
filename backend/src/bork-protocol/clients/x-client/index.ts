import { AnalysisQueueService } from '@/services/analysis-queue.service';
import { TwitterService } from '@/services/twitter-service';
import { cleanupPool } from '@bork/db';
import { TokenMonitorClient } from '@bork/plugins/token-monitor/clients/token-monitor-client';
import { TwitterAccountsClient } from '@bork/plugins/twitter-discovery/clients/twitter-accounts-client';
import { TwitterDiscoveryClient } from '@bork/plugins/twitter-discovery/clients/twitter-discovery-client';
import { TwitterSearchClient } from '@bork/plugins/twitter-discovery/clients/twitter-search-client';
import {
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import { InformativeThreadsClient } from './creation/informative-threads';
import { TwitterInteractionClient } from './creation/interactions';

export class TwitterClient implements ClientInstance {
  private readonly runtime: IAgentRuntime;
  private twitterService: TwitterService | null = null;
  private accountsClient: TwitterAccountsClient | null = null;
  private searchClient: TwitterSearchClient | null = null;
  private interactionClient: TwitterInteractionClient | null = null;
  private discoveryClient: TwitterDiscoveryClient | null = null;
  private analysisQueueService: AnalysisQueueService | null = null;
  private informativeThreadsClient: InformativeThreadsClient | null = null;
  private tokenMonitorClient: TokenMonitorClient | null = null;

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

      // Initialize the Twitter service
      this.twitterService = new TwitterService();
      await this.twitterService.initialize(this.runtime);

      elizaLogger.info('[TwitterClient] Initialized Twitter service');

      // Set target users if configured
      const targetUsers = this.runtime.getSetting('TWITTER_TARGET_USERS');
      if (targetUsers) {
        this.twitterService.setTargetUsers(
          targetUsers.split(',').map((u) => u.trim()),
        );
      }

      // Initialize analysis queue service
      this.analysisQueueService = AnalysisQueueService.getInstance();
      await this.analysisQueueService.initialize(this.runtime);
      elizaLogger.info('[TwitterClient] Started analysis queue service');

      elizaLogger.info('[TwitterClient] Initializing clients');
      // Initialize and start all clients
      this.accountsClient = new TwitterAccountsClient();
      this.searchClient = new TwitterSearchClient();
      this.interactionClient = new TwitterInteractionClient(
        this.twitterService,
        this.runtime,
      );
      this.discoveryClient = new TwitterDiscoveryClient();
      this.informativeThreadsClient = new InformativeThreadsClient(
        this.twitterService,
        this.runtime,
      );
      this.tokenMonitorClient = new TokenMonitorClient();

      // Start clients concurrently
      await Promise.all([
        // this.accountsClient.start(),
        // this.searchClient.start(),
        // this.interactionClient.start(),
        // this.discoveryClient.start(),
        // this.informativeThreadsClient.start(),
        // this.tokenMonitorClient.start(),
      ]);

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
      if (this.tokenMonitorClient) {
        await this.tokenMonitorClient.stop();
      }
      if (this.informativeThreadsClient) {
        await this.informativeThreadsClient.stop();
      }
      if (this.discoveryClient) {
        await this.discoveryClient.stop();
      }
      if (this.interactionClient) {
        await this.interactionClient.stop();
      }
      if (this.searchClient) {
        await this.searchClient.stop();
      }
      if (this.accountsClient) {
        await this.accountsClient.stop();
      }
      if (this.analysisQueueService) {
        await this.analysisQueueService.stop();
      }

      // Clean up the database pool used by the bork-extensions
      try {
        await cleanupPool();
        elizaLogger.info('[TwitterClient] Database connections cleaned up');
      } catch (dbError) {
        elizaLogger.error(
          '[TwitterClient] Error cleaning up database connections:',
          dbError,
        );
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
