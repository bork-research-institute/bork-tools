import type { TopicWeightRow } from '@/bork-protocol/types/topic';
import { getAggregatedTopicWeights } from '@/bork-protocol/utils/topic-weights/topics';
import { processTweets } from '@/bork-protocol/utils/tweet-analysis/process-tweets';
import { TwitterService } from '@/services/twitter-service';
import { type IAgentRuntime, Service, type ServiceType } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import { TwitterDiscoveryConfigService } from '../bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import { ServiceTypeExtension } from '../bork-protocol/plugins/twitter-discovery/types/service-type-extension';
interface QueuedTweet {
  tweet: Tweet;
  priority: number;
  timestamp: number;
  source: 'search' | 'account' | 'discovery';
}

export class AnalysisQueueService extends Service {
  private tweetQueue: QueuedTweet[] = [];
  private processedTweetIds = new Set<string>();
  private isProcessing = false;
  private maxQueueSize: number;
  private maxProcessedIdsSize: number;
  private searchTimeframeHours: number;
  private processingTimeout: ReturnType<typeof setInterval> | null = null;

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.ANALYSIS_QUEUE as unknown as ServiceType;
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info(
      '[AnalysisQueueService] Initializing tweet processing loop',
    );
    const configService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!configService) {
      elizaLogger.error(
        '[AnalysisQueueService] Twitter config service not found',
      );
      return;
    }
    this.maxQueueSize = configService.getCharacterConfig().maxQueueSize;
    this.maxProcessedIdsSize =
      configService.getCharacterConfig().maxProcessedIdsSize;
    this.searchTimeframeHours =
      configService.getCharacterConfig().searchTimeframeHours;
    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error('[AnalysisQueueService] Twitter service not found');
      return;
    }
    // TODO Add timeout to config
    this.processingTimeout = setInterval(
      () => void this.processTweetsLoop(runtime, twitterService),
      5000, // 5 second delay between processing cycles
    );
  }

  /**
   * Stop the tweet processing loop
   */
  async stop(): Promise<void> {
    elizaLogger.info('[AnalysisQueueService] Stopping tweet processing loop');
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    this.isProcessing = false;
  }

  private async processTweetsLoop(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
  ): Promise<void> {
    try {
      // Get topic weights once at the start
      const topicWeightRows = await getAggregatedTopicWeights(
        this.searchTimeframeHours,
      );

      // Get next batch of tweets
      const tweets = await this.getNextBatch();
      if (tweets.length > 0) {
        this.setProcessing(true);
        await this.processBatch(
          runtime,
          twitterService,
          tweets,
          topicWeightRows,
        );
        this.setProcessing(false);
      }
    } catch (error) {
      elizaLogger.error(
        '[AnalysisQueueService] Error processing tweets:',
        error,
      );
      this.setProcessing(false);
    }
  }

  private async processBatch(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
    tweets: Tweet[],
    topicWeights: TopicWeightRow[],
  ): Promise<void> {
    try {
      await processTweets(runtime, twitterService, tweets, topicWeights);

      elizaLogger.info(
        `[AnalysisQueueService] Successfully processed ${tweets.length} tweets`,
      );
    } catch (error) {
      elizaLogger.error(
        '[AnalysisQueueService] Error in batch processing:',
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
          `[AnalysisQueueService] Skipping duplicate or invalid tweet: ${tweet.id}`,
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
        `[AnalysisQueueService] Queue exceeded max size. Removed ${removed} lowest priority tweets.`,
      );
    }

    elizaLogger.info(
      `[AnalysisQueueService] Added ${newTweets.length} tweets from ${source} to queue. Queue size: ${this.tweetQueue.length}`,
    );
  }

  /**
   * Get next batch of tweets for processing
   */
  private async getNextBatch(batchSize = 10): Promise<Tweet[]> {
    if (this.isProcessing) {
      elizaLogger.debug(
        '[AnalysisQueueService] Queue is currently being processed, skipping batch',
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
        `[AnalysisQueueService] Trimmed processed tweets set to ${this.maxProcessedIdsSize} entries`,
      );
    }

    if (batch.length > 0) {
      elizaLogger.info(
        `[AnalysisQueueService] Retrieved batch of ${batch.length} tweets for processing`,
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
      `[AnalysisQueueService] Processing state set to: ${isProcessing}`,
    );
  }

  /**
   * Clear the queue and processed tweets set
   */
  clear(): void {
    this.tweetQueue = [];
    this.processedTweetIds.clear();
    this.isProcessing = false;
    elizaLogger.info('[AnalysisQueueService] Queue and processed set cleared');
  }
}

export const analysisQueueService = new AnalysisQueueService();
