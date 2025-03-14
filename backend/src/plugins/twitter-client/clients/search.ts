import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { TWITTER_CONFIG } from '../../../config/twitter.js';
import { tweetQueries } from '../../bork-extensions/src/db/queries.js';
import { processAndStoreTweet } from '../lib/utils/tweet-processing.js';
import { updateMarketMetrics } from '../lib/utils/tweet-processing.js';
import type { TwitterService } from '../services/twitter.service.js';

export class TwitterSearchClient {
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterService = twitterService;
    this.runtime = runtime;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterSearch] Starting search client');
    const topicWeights = await tweetQueries.getTopicWeights();
    if (!topicWeights.length) {
      elizaLogger.error('[TwitterSearch] Topic weights need to be initialized');
      throw new Error('Topic weights need to be initialized');
    }
    this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterSearch] Stopping search client');
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  async onReady() {
    this.engageWithSearchTermsLoop();
  }

  private engageWithSearchTermsLoop() {
    this.engageWithSearchTerms();
    const { min, max } = TWITTER_CONFIG.search.searchInterval;
    this.searchTimeout = setTimeout(
      () => this.engageWithSearchTermsLoop(),
      (Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000,
    );
  }

  private async engageWithSearchTerms() {
    elizaLogger.info('[TwitterSearch] Engaging with search terms');
    try {
      // 1. Get current topic weights from database
      elizaLogger.info('[TwitterSearch] Fetching current topic weights');
      const topicWeights = await tweetQueries.getTopicWeights();

      // Sort topics by weight and select one with probability proportional to weight
      const totalWeight = topicWeights.reduce((sum, tw) => sum + tw.weight, 0);
      const randomValue = Math.random() * totalWeight;
      let accumWeight = 0;
      const selectedTopic =
        topicWeights.find((tw) => {
          accumWeight += tw.weight;
          return randomValue <= accumWeight;
        }) || topicWeights[0];

      elizaLogger.debug(
        '[TwitterSearch] Selected search term based on weights',
        {
          selectedTopic: selectedTopic.topic,
          weight: selectedTopic.weight,
          allWeights: topicWeights.map((tw) => ({
            topic: tw.topic,
            weight: tw.weight,
          })),
        },
      );

      elizaLogger.info('[TwitterSearch] Fetching search tweets');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const { tweets: filteredTweets, spammedTweets } =
        await this.twitterService.searchTweets(
          selectedTopic.topic,
          TWITTER_CONFIG.search.tweetLimits.searchResults,
          SearchMode.Top,
          '[TwitterSearch]',
          TWITTER_CONFIG.search.parameters,
          TWITTER_CONFIG.search.engagementThresholds,
        );

      if (!filteredTweets.length) {
        elizaLogger.warn(
          `[TwitterSearch] No tweets found for term: ${selectedTopic.topic}`,
        );
        return;
      }

      elizaLogger.info(
        `[TwitterSearch] Found ${filteredTweets.length} tweets for term: ${selectedTopic.topic}`,
        { spammedTweets },
      );

      // Process filtered tweets
      for (const tweet of filteredTweets) {
        await processAndStoreTweet(
          this.runtime,
          this.twitterService,
          tweet,
          topicWeights,
        );
      }

      // Update market metrics with non-spam tweets
      await updateMarketMetrics(filteredTweets);

      elizaLogger.info('[TwitterSearch] Successfully processed search results');
    } catch (error) {
      elizaLogger.error(
        '[TwitterSearch] Error engaging with search terms:',
        error,
      );
    }
  }
}

export default TwitterSearchClient;
