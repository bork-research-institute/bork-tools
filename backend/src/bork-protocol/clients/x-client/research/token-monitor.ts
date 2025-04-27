import type { TweetQueueService } from '@/services/twitter/analysis-queue.service';
import { TwitterConfigService } from '@/services/twitter/twitter-config-service';
import type { TwitterService } from '@/services/twitter/twitter-service';
import { initializeTopicWeights } from '@/utils/initialize-db/topics';
import { selectTopic } from '@/utils/selection/select-topic';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { getEnv } from '../../../../config/env';

export class TwitterSearchClient {
  private twitterConfigService: TwitterConfigService;
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private readonly tweetQueueService: TweetQueueService;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    twitterService: TwitterService,
    runtime: IAgentRuntime,
    tweetQueueService: TweetQueueService,
  ) {
    this.twitterService = twitterService;
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
    this.tweetQueueService = tweetQueueService;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterSearch] Starting search client');

    // Initialize topic weights if they don't exist
    try {
      await initializeTopicWeights(this.runtime);
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccounts] Error initializing topic weights:',
        error,
      );
    }

    await this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterSearch] Stopping search client');
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  private async onReady() {
    await this.engageWithSearchTermsLoop();
  }

  private async engageWithSearchTermsLoop() {
    this.engageWithSearchTerms();
    this.searchTimeout = setTimeout(
      () => this.engageWithSearchTermsLoop(),
      Number(this.runtime.getSetting('TWITTER_POLL_INTERVAL') || 60) * 1000,
    );
  }

  private async engageWithSearchTerms() {
    elizaLogger.info('[TwitterSearch] Engaging with search terms');

    const config = await this.twitterConfigService.getConfig();
    const env = getEnv();

    try {
      // Use the new async selectTopic with runtime and configured timeframe
      const selectedTopics = await selectTopic(
        this.runtime,
        //TODO: update to get this from runtime or twitter config
        env.SEARCH_TIMEFRAME_HOURS,
        env.SEARCH_PREFERRED_TOPIC,
        5, // Request 5 topics
      );

      if (selectedTopics.length === 0) {
        elizaLogger.warn('[TwitterSearch] No topics were selected');
        return;
      }

      elizaLogger.info('[TwitterSearch] Selected topics for search:', {
        topics: selectedTopics.map((t) => ({
          topic: t.topic,
          weight: t.weight,
        })),
      });

      // Process each selected topic
      for (const selectedTopic of selectedTopics) {
        elizaLogger.info(
          `[TwitterSearch] Fetching search tweets for topic: ${selectedTopic.topic}`,
          {
            preferredTopic: env.SEARCH_PREFERRED_TOPIC,
            currentTopic: selectedTopic.topic,
            weight: selectedTopic.weight,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, 5000));

        const { tweets: searchTweets, spammedTweets } =
          await this.twitterService.searchTweets(
            selectedTopic.topic,
            config.search.tweetLimits.searchResults,
            SearchMode.Top,
            '[TwitterSearch]',
            config.search.parameters,
            config.search.engagementThresholds,
          );

        if (!searchTweets.length) {
          elizaLogger.warn(
            `[TwitterSearch] No tweets found for term: ${selectedTopic.topic}`,
          );
          continue; // Skip to next topic if no tweets found
        }

        elizaLogger.info(
          `[TwitterSearch] Found ${searchTweets.length} tweets for term: ${selectedTopic.topic}`,
          { spammedTweets },
        );

        // Add tweets to the queue instead of processing them directly
        await this.tweetQueueService.addTweets(searchTweets, 'search', 1);

        elizaLogger.info(
          `[TwitterSearch] Successfully queued search results for topic: ${selectedTopic.topic}`,
        );
      }

      elizaLogger.info(
        '[TwitterSearch] Completed search for all selected topics',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterSearch] Error engaging with search terms:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

export default TwitterSearchClient;
