import { CONTENT_CREATION } from '@/config/creation';
import { TweetQueueService } from '@/services/twitter/tweet-queue-service';
import { TwitterConfigService } from '@/services/twitter/twitter-config-service';
import type { TwitterService } from '@/services/twitter/twitter-service';
import { tweetSchema } from '@/types/response/hypothesis';
import type { HypothesisResponse } from '@/utils/generate-ai-object/generate-hypothesis';
import { generateHypothesis } from '@/utils/generate-ai-object/generate-hypothesis';
import { generateThread } from '@/utils/generate-ai-object/generate-informative-thread';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { threadTrackingQueries } from '../../../db/queries';

interface RuntimeWithAgent extends Omit<IAgentRuntime, 'agentId'> {
  agentId: string;
}

export class InformativeThreadsClient {
  private twitterConfigService: TwitterConfigService;
  private tweetQueueService: TweetQueueService;
  private readonly runtime: IAgentRuntime;
  private monitoringTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentHypothesis: HypothesisResponse | null = null;
  private lastHypothesisGeneration = 0;
  private lastContentGeneration = 0;
  private twitterService: TwitterService;

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.tweetQueueService = new TweetQueueService(twitterService, runtime);
    this.runtime = runtime;
    this.twitterService = twitterService;
  }

  /**
   * Starts monitoring for content creation opportunities
   */
  async start(): Promise<void> {
    elizaLogger.info('[InformativeThreads] Starting content monitoring');

    // Initial content generation
    await this.generateAndProcessContent();

    // Set up periodic content generation
    this.monitoringTimeout = setInterval(
      () => this.generateAndProcessContent(),
      CONTENT_CREATION.CONTENT_GENERATION_INTERVAL,
    );
  }

  /**
   * Stops monitoring for content creation opportunities
   */
  stop(): void {
    elizaLogger.info('[InformativeThreads] Stopping content monitoring');

    if (this.monitoringTimeout) {
      clearInterval(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private async generateAndProcessContent() {
    elizaLogger.info('[InformativeThreads] Starting content generation cycle');

    try {
      // Update all thread and topic performance metrics before generating hypothesis
      elizaLogger.info(
        '[InformativeThreads] Updating performance metrics for all threads and topics',
      );
      await threadTrackingQueries.updateAllThreadPerformanceMetrics();

      // Check if we need to generate a new hypothesis
      const now = Date.now();
      if (
        !this.currentHypothesis ||
        now - this.lastHypothesisGeneration >
          CONTENT_CREATION.HYPOTHESIS_REFRESH_INTERVAL
      ) {
        elizaLogger.info('[InformativeThreads] Generating new hypothesis...');
        this.currentHypothesis = await generateHypothesis(
          this.runtime,
          CONTENT_CREATION.TIMEFRAME_HOURS,
        );
        this.lastHypothesisGeneration = now;
      }

      // If no topic was selected (insufficient data), skip content generation
      if (!this.currentHypothesis?.selectedTopic) {
        elizaLogger.info(
          '[InformativeThreads] No suitable topic found for content generation. Skipping.',
        );
        return;
      }

      try {
        const topic = this.currentHypothesis.selectedTopic;
        elizaLogger.info('[InformativeThreads] Processing topic:', {
          primaryTopic: topic.primaryTopic,
          threadIdea: topic.threadIdea,
        });

        // Generate thread content with integrated media
        const thread = await generateThread(this.runtime, topic);

        // Validate tweets using schema
        const validationResults = await Promise.all(
          thread.tweets.map(async (tweet, index) => {
            try {
              await tweetSchema.parseAsync(tweet);
              return {
                tweetNumber: index + 1,
                text: tweet.text,
                isValid: true,
                hasMedia: tweet.hasMedia,
              };
            } catch (error) {
              return {
                tweetNumber: index + 1,
                text: tweet.text,
                isValid: false,
                error: error instanceof Error ? error.message : String(error),
                hasMedia: tweet.hasMedia,
              };
            }
          }),
        );

        const invalidTweets = validationResults.filter(
          (result) => !result.isValid,
        );

        if (invalidTweets.length > 0) {
          elizaLogger.error(
            `[InformativeThreads] Found ${invalidTweets.length} invalid tweets:`,
            {
              invalidTweets: invalidTweets.map((t) => ({
                tweetNumber: t.tweetNumber,
                text: t.text,
                error: t.error,
              })),
            },
          );
          return;
        }

        // Post the thread to Twitter
        let previousTweetId: string | undefined = undefined;
        const postedTweets: {
          id: string;
          text: string;
          permanentUrl: string;
        }[] = [];

        for (const tweet of thread.tweets) {
          const postedTweet = await this.twitterService.sendTweet(
            tweet.text,
            previousTweetId,
          );
          postedTweets.push({
            id: postedTweet.id,
            text: postedTweet.text,
            permanentUrl: postedTweet.permanentUrl,
          });

          elizaLogger.info('[InformativeThreads] Posted tweet', {
            tweet_id: postedTweet.id,
            text: postedTweet.text,
            inReplyToId: previousTweetId,
            permanentUrl: postedTweet.permanentUrl,
          });

          previousTweetId = postedTweet.id;
        }

        const runtimeWithAgent = this.runtime as RuntimeWithAgent;

        // Save the posted thread and its performance metrics
        const postedThread = await threadTrackingQueries.savePostedThread({
          agentId: runtimeWithAgent.agentId || 'default',
          primaryTopic: topic.primaryTopic,
          relatedTopics: topic.relatedTopics || [],
          threadIdea: topic.threadIdea,
          uniqueAngle: topic.uniqueAngle,
          engagement: {
            likes: 0,
            retweets: 0,
            replies: 0,
            views: 0,
          },
          performanceScore: 0,
          tweetIds: postedTweets.map((t) => t.id),
        });

        // Save the used knowledge
        if (topic.relevantKnowledge) {
          await Promise.all(
            topic.relevantKnowledge
              .filter((k) => k.source?.url && k.source?.authorUsername)
              .map((k) =>
                threadTrackingQueries.saveUsedKnowledge({
                  threadId: postedThread.id,
                  content: k.content,
                  source: {
                    url: k.source?.url || '',
                    authorUsername: k.source?.authorUsername || '',
                  },
                  performanceContribution: 0,
                  useCount: 1,
                }),
              ),
          );
        }

        elizaLogger.info('[InformativeThreads] Successfully processed topic', {
          primaryTopic: topic.primaryTopic,
          tweetCount: thread.tweets.length,
          mediaCount: thread.tweets.filter((t) => t.hasMedia).length,
          threadId: postedThread.id,
        });
      } catch (error) {
        elizaLogger.error('[InformativeThreads] Error processing topic:', {
          primaryTopic: this.currentHypothesis.selectedTopic.primaryTopic,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      elizaLogger.error('[InformativeThreads] Error in content generation:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Gets the current hypothesis being used for content generation
   */
  getCurrentHypothesis(): HypothesisResponse | null {
    return this.currentHypothesis;
  }

  /**
   * Forces a refresh of the hypothesis regardless of the refresh interval
   */
  async refreshHypothesis(): Promise<void> {
    try {
      elizaLogger.info('[InformativeThreads] Forcing hypothesis refresh');
      this.currentHypothesis = await generateHypothesis(this.runtime);
      this.lastHypothesisGeneration = Date.now();
    } catch (error) {
      elizaLogger.error('[InformativeThreads] Error refreshing hypothesis:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default InformativeThreadsClient;
