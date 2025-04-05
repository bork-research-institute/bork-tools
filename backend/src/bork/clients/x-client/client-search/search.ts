import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { v4 as uuidv4 } from 'uuid';
import { tweetQueries } from '../../../extensions/src/db/queries';
import { mapTweet } from '../../lib/mappers/tweet-mapper';
import { TwitterConfigService } from '../../lib/services/twitter-config-service';
import type { TwitterService } from '../../lib/services/twitter-service';
import { processTweets } from '../../lib/utils/analysis/process-tweets';
import { initializeAndGetTopicWeights } from '../../lib/utils/topics/topics';

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

    // Get and initialize topic weights if needed
    const defaultTopics = this.runtime.character.topics || [
      'injective protocol',
    ];
    const topicWeights = await initializeAndGetTopicWeights(
      defaultTopics,
      '[TwitterSearch]',
    );

    if (topicWeights.length === 0) {
      elizaLogger.error(
        '[TwitterSearch] Could not get topic weights - aborting search',
      );
      return;
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
        return;
      }

      elizaLogger.info(
        `[TwitterSearch] Found ${searchTweets.length} tweets for term: ${selectedTopic.topic}`,
        { spammedTweets },
      );

      // Filter out tweets without IDs first
      const validTweets = searchTweets.filter((tweet) => {
        if (!tweet.id) {
          elizaLogger.warn('[TwitterSearch] Tweet missing ID:', {
            text: tweet.text?.substring(0, 100),
          });
          return false;
        }
        return true;
      });

      // Check which tweets have already been processed
      const existingTweetIds = new Set(
        (
          await Promise.all(
            validTweets.map((tweet) =>
              tweetQueries.findTweetByTweetId(tweet.id),
            ),
          )
        )
          .filter(Boolean)
          .map((tweet) => tweet.tweet_id),
      );

      // Filter out already processed tweets
      const unprocessedTweets = validTweets.filter(
        (tweet) => !existingTweetIds.has(tweet.id),
      );

      if (validTweets.length > unprocessedTweets.length) {
        elizaLogger.info(
          `[TwitterSearch] Filtered out ${
            validTweets.length - unprocessedTweets.length
          } already processed tweets`,
        );
      }

      if (unprocessedTweets.length === 0) {
        elizaLogger.info(
          `[TwitterSearch] No new tweets to process for term: ${selectedTopic.topic}`,
        );
        return;
      }

      // Map tweets to ensure all fields have default values, following same pattern as in tweet-selection.ts
      const mappedTweets = unprocessedTweets.map((tweet) => ({
        ...mapTweet(tweet),
        id: uuidv4(), // Generate a UUID for our database
        tweet_id: tweet.id, // Keep Twitter's ID
      }));

      // Process all tweets together using our processTweets utility
      await processTweets(
        this.runtime,
        this.twitterService,
        mappedTweets,
        topicWeights,
      );

      elizaLogger.info('[TwitterSearch] Successfully processed search results');
    } catch (error) {
      elizaLogger.error(
        '[TwitterSearch] Error engaging with search terms:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

export default TwitterSearchClient;
