import { tweetQueries } from '@/db/queries';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type { TopicWeightRow } from '@/types/topic';
import { getAggregatedTopicWeights } from '@/utils/topic-weights/topics';
import { processTweets } from '@/utils/tweet-analysis/process-tweets';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import { getEnv } from '../../../config/env';

interface QueuedTweet {
  tweet: Tweet;
  priority: number;
  timestamp: number;
  source: 'search' | 'account' | 'discovery';
}

export class TweetQueueService {
  private static instance: TweetQueueService | null = null;
  private tweetQueue: QueuedTweet[] = [];
  private processedTweetIds = new Set<string>();
  private isProcessing = false;
  private readonly maxQueueSize: number;
  private readonly maxProcessedIdsSize: number;
  private processingTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly runtime: IAgentRuntime;
  private readonly twitterService: TwitterService;

  private constructor(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
    maxQueueSize = 1000,
    maxProcessedIdsSize = 10000,
  ) {
    this.runtime = runtime;
    this.twitterService = twitterService;
    this.maxQueueSize = maxQueueSize;
    this.maxProcessedIdsSize = maxProcessedIdsSize;
  }

  static getInstance(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
    maxQueueSize?: number,
    maxProcessedIdsSize?: number,
  ): TweetQueueService {
    if (!TweetQueueService.instance) {
      TweetQueueService.instance = new TweetQueueService(
        runtime,
        twitterService,
        maxQueueSize,
        maxProcessedIdsSize,
      );
    }
    return TweetQueueService.instance;
  }

  /**
   * Start the tweet processing loop
   */
  async start(): Promise<void> {
    elizaLogger.info('[TweetQueueService] Starting tweet processing loop');
    await this.processTweetsLoop();
  }

  /**
   * Stop the tweet processing loop
   */
  async stop(): Promise<void> {
    elizaLogger.info('[TweetQueueService] Stopping tweet processing loop');
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    this.isProcessing = false;
  }

  private async processTweetsLoop(): Promise<void> {
    try {
      const env = getEnv();

      // Get topic weights once at the start
      const topicWeightRows = await getAggregatedTopicWeights(
        env.SEARCH_TIMEFRAME_HOURS,
      );

      // Get next batch of tweets
      const tweets = await this.getNextBatch();
      if (tweets.length > 0) {
        this.setProcessing(true);
        await this.processBatch(tweets, topicWeightRows);
        this.setProcessing(false);
      }
    } catch (error) {
      elizaLogger.error('[TweetQueueService] Error processing tweets:', error);
      this.setProcessing(false);
    }

    // Schedule next processing cycle
    this.processingTimeout = setTimeout(
      () => void this.processTweetsLoop(),
      5000, // 5 second delay between processing cycles
    );
  }

  private async processBatch(
    tweets: Tweet[],
    topicWeights: TopicWeightRow[],
  ): Promise<void> {
    try {
      elizaLogger.info(
        `[TweetQueueService] Processing batch of ${tweets.length} tweets`,
      );

      await processTweets(
        this.runtime,
        this.twitterService,
        tweets,
        topicWeights,
      );

      elizaLogger.info(
        `[TweetQueueService] Successfully processed ${tweets.length} tweets`,
      );

      // Verify topic weights were updated
      const updatedWeights = await tweetQueries.getTopicWeights();
      elizaLogger.info(
        `[TweetQueueService] Topic weights after processing: ${updatedWeights.length}`,
      );
    } catch (error) {
      elizaLogger.error(
        '[TweetQueueService] Error in batch processing:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Add tweets to the processing queue with specified priority and source
   */
  async addTweets(
    tweets: Tweet[],
    source: QueuedTweet['source'],
    priority = 1,
  ): Promise<void> {
    const newTweets = tweets.filter((tweet) => {
      if (!tweet.id || this.processedTweetIds.has(tweet.id)) {
        elizaLogger.debug(
          `[TweetQueueService] Skipping duplicate or invalid tweet: ${tweet.id}`,
        );
        return false;
      }
      return true;
    });

    const queuedTweets = newTweets.map((tweet) => ({
      tweet,
      priority,
      timestamp: Date.now(),
      source,
    }));

    this.tweetQueue.push(...queuedTweets);

    // Sort by priority (higher first) and then by timestamp (older first)
    this.tweetQueue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    // Trim queue if it gets too large
    if (this.tweetQueue.length > this.maxQueueSize) {
      const removed = this.tweetQueue.length - this.maxQueueSize;
      this.tweetQueue = this.tweetQueue.slice(0, this.maxQueueSize);
      elizaLogger.warn(
        `[TweetQueueService] Queue exceeded max size. Removed ${removed} lowest priority tweets.`,
      );
    }

    elizaLogger.info(
      `[TweetQueueService] Added ${newTweets.length} tweets from ${source} to queue. Queue size: ${this.tweetQueue.length}`,
    );
  }

  /**
   * Get next batch of tweets for processing
   */
  private async getNextBatch(batchSize = 10): Promise<Tweet[]> {
    if (this.isProcessing) {
      elizaLogger.debug(
        '[TweetQueueService] Queue is currently being processed, skipping batch',
      );
      return [];
    }

    const batch = this.tweetQueue.slice(0, batchSize);
    this.tweetQueue = this.tweetQueue.slice(batchSize);

    // Add to processed set
    for (const item of batch) {
      if (item.tweet.id) {
        this.processedTweetIds.add(item.tweet.id);
      }
    }

    // Trim processed set if it gets too large
    if (this.processedTweetIds.size > this.maxProcessedIdsSize) {
      const idsArray = Array.from(this.processedTweetIds);
      this.processedTweetIds = new Set(
        idsArray.slice(-this.maxProcessedIdsSize),
      );
      elizaLogger.info(
        `[TweetQueueService] Trimmed processed tweets set to ${this.maxProcessedIdsSize} entries`,
      );
    }

    if (batch.length > 0) {
      elizaLogger.info(
        `[TweetQueueService] Retrieved batch of ${batch.length} tweets for processing`,
      );
    }

    return batch.map((item) => item.tweet);
  }

  /**
   * Get current queue metrics
   */
  getMetrics() {
    const sourceBreakdown = this.tweetQueue.reduce(
      (acc, item) => {
        acc[item.source]++;
        return acc;
      },
      {
        search: 0,
        account: 0,
        discovery: 0,
      } as Record<QueuedTweet['source'], number>,
    );

    return {
      queueSize: this.tweetQueue.length,
      processedCount: this.processedTweetIds.size,
      isProcessing: this.isProcessing,
      sourceBreakdown,
    };
  }

  /**
   * Check if a tweet has been processed
   */
  hasBeenProcessed(tweetId: string): boolean {
    return this.processedTweetIds.has(tweetId);
  }

  /**
   * Set processing state
   */
  private setProcessing(isProcessing: boolean): void {
    this.isProcessing = isProcessing;
    elizaLogger.debug(
      `[TweetQueueService] Processing state set to: ${isProcessing}`,
    );
  }

  /**
   * Clear the queue and processed tweets set
   */
  clear(): void {
    this.tweetQueue = [];
    this.processedTweetIds.clear();
    this.isProcessing = false;
    elizaLogger.info('[TweetQueueService] Queue and processed set cleared');
  }
}
