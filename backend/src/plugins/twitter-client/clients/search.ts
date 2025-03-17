import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { tweetQueries } from '../../bork-extensions/src/db/queries';
import { storeMentions } from '../lib/utils/mentions-processing';
import { processAndStoreTweet } from '../lib/utils/tweet-processing';
import { TwitterConfigService } from '../services/twitter-config-service';
import type { TwitterService } from '../services/twitter-service';
import type { TopicWeightRow } from '../types/topic';
import type { ExtendedTweet, MergedTweet } from '../types/twitter';

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

      // Process filtered tweets with thread and reply merging
      const mergedTweets = filteredTweets.map((tweet): MergedTweet => {
        const extendedTweet = tweet as ExtendedTweet;
        // Start with the original tweet text
        let mergedText = tweet.text || '';

        // First merge thread content if it exists
        if (tweet.thread && tweet.thread.length > 0) {
          // Sort thread by timestamp to ensure chronological order
          const sortedThread = tweet.thread.sort(
            (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
          );

          // Merge text from all thread tweets
          for (const threadTweet of sortedThread) {
            if (threadTweet.id !== tweet.id) {
              mergedText = `${mergedText}\n\n${threadTweet.text || ''}`;
            }
          }
        }

        // Then add top replies if they exist
        if (extendedTweet.topReplies && extendedTweet.topReplies.length > 0) {
          mergedText = `${mergedText}\n\n--- Top Replies ---\n`;

          // Add each top reply with author info
          for (const reply of extendedTweet.topReplies) {
            mergedText = `${mergedText}\n@${reply.username || 'unknown'}: ${reply.text || ''}\n`;
          }
        }

        // Create a new tweet object with merged content
        return {
          ...extendedTweet,
          text: mergedText,
          originalText: tweet.text, // Keep original text for reference
          isThreadMerged: tweet.thread?.length > 0,
          hasReplies: extendedTweet.topReplies?.length > 0,
          threadSize: tweet.thread?.length || 0,
          replyCount: extendedTweet.topReplies?.length || 0,
        };
      });

      elizaLogger.info(
        `[TwitterSearch] Merged ${mergedTweets.length} tweets with their threads and replies`,
      );

      // Now process each merged tweet
      for (const tweet of mergedTweets) {
        try {
          // Process mentions from the original tweet only
          await storeMentions(tweet);

          // Process and store the merged tweet
          await processAndStoreTweet(
            this.runtime,
            this.twitterService,
            tweet,
            topicWeights,
          );

          elizaLogger.info(
            `[TwitterSearch] Processed tweet ${tweet.id} with ${tweet.threadSize} thread tweets and ${tweet.replyCount} replies`,
            {
              isThreadMerged: tweet.isThreadMerged,
              hasReplies: tweet.hasReplies,
              textLength: tweet.text.length,
              originalTextLength: tweet.originalText.length,
            },
          );
        } catch (error) {
          elizaLogger.error(
            `[TwitterSearch] Error processing tweet ${tweet.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

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
