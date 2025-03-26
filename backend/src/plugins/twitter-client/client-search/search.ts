import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { tweetQueries } from '../../bork-extensions/src/db/queries';
import { TwitterConfigService } from '../lib/services/twitter-config-service';
import type { TwitterService } from '../lib/services/twitter-service';
import type { TopicWeightRow } from '../lib/types/topic';
import { storeMentions } from '../lib/utils/mentions-processing';
import { processTweets } from '../lib/utils/tweet-processing';

export class TwitterSearchClient {
  private twitterConfigService: TwitterConfigService;
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  
  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterService = twitterService;
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterSearch] Starting search client');
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

    // Get topic weights
    let topicWeights: TopicWeightRow[] = [];
    try {
      topicWeights = await tweetQueries.getTopicWeights();

      if (!topicWeights.length) {
        elizaLogger.info(
          '[TwitterSearch] No topic weights found, initializing them',
        );
        const defaultTopics = this.runtime.character.topics || [
          'injective protocol',
        ];

        await tweetQueries.initializeTopicWeights(defaultTopics);
        elizaLogger.info(
          `[TwitterSearch] Initialized ${defaultTopics.length} default topics`,
        );

        // Reload the topic weights
        topicWeights = await tweetQueries.getTopicWeights();

        if (!topicWeights.length) {
          elizaLogger.error(
            '[TwitterSearch] Failed to initialize topic weights',
          );
          return; // Exit early if we still can't get topic weights
        }
      }
    } catch (dbError) {
      elizaLogger.error(
        '[TwitterSearch] Database error getting topic weights:',
        dbError,
      );
      return; // Exit early if we can't get topic weights
    }

    try {
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
          config.search.tweetLimits.searchResults,
          SearchMode.Top,
          '[TwitterSearch]',
          config.search.parameters,
          config.search.engagementThresholds,
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

      // Process mentions from each tweet
      for (const tweet of filteredTweets) {
        await storeMentions(tweet);
      }

      // Process all tweets together
      await processTweets(
        this.runtime,
        this.twitterService,
        filteredTweets,
        topicWeights,
      );

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
