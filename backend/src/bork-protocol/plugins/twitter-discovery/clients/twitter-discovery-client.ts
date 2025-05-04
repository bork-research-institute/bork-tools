import { TweetQueueService } from '@/services/twitter/analysis-queue.service';
import { TwitterConfigService } from '@/services/twitter/twitter-config-service';
import { TwitterService } from '@/services/twitter/twitter-service';
import type { Client, ClientInstance, IAgentRuntime } from '@elizaos/core';
import { Scraper } from 'agent-twitter-client';
import { TwitterAccountDiscoveryService } from '../services/twitter-account-discovery-service';
import { TwitterAccountsClient } from './twitter-accounts-client';
import { TwitterSearchClient } from './twitter-search-client';

export class TwitterDiscoveryClient implements Client {
  name = 'TwitterDiscoveryClient';
  private accountsClient: TwitterAccountsClient | null = null;
  private searchClient: TwitterSearchClient | null = null;
  private discoveryService: TwitterAccountDiscoveryService | null = null;
  private tweetQueueService: TweetQueueService | null = null;
  private twitterService: TwitterService | null = null;
  private configService: TwitterConfigService | null = null;

  async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    // Initialize TwitterService with a Scraper instance
    const twitterClient = new Scraper();
    this.twitterService = new TwitterService(twitterClient, runtime);
    await this.twitterService.initialize();

    this.configService = new TwitterConfigService(runtime);
    this.tweetQueueService = TweetQueueService.getInstance(
      runtime,
      this.twitterService,
    );

    this.accountsClient = new TwitterAccountsClient(
      this.twitterService,
      runtime,
      this.tweetQueueService,
    );
    this.searchClient = new TwitterSearchClient(
      this.twitterService,
      runtime,
      this.tweetQueueService,
    );
    this.discoveryService = new TwitterAccountDiscoveryService(
      this.twitterService,
      this.configService,
    );

    if (this.accountsClient) {
      await this.accountsClient.start();
    }
    if (this.searchClient) {
      await this.searchClient.start();
    }
    // DiscoveryService may need a start method if it has a loop

    return this;
  }

  async stop(): Promise<void> {
    if (this.accountsClient) {
      await this.accountsClient.stop();
    }
    if (this.searchClient) {
      await this.searchClient.stop();
    }
    // DiscoveryService may need a stop method if it has a loop
  }
}
