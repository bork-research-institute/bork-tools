import { threadQueries } from '@/bork-protocol/db/thread-queries';
import { updateAllThreadsMetrics } from '@/bork-protocol/utils/active-tweeting';
import { TwitterService } from '@/services/twitter-service';
import { CONTENT_CREATION } from '@bork/plugins/twitter-interaction/config/creation';
import { tweetSchema } from '@bork/types/response/hypothesis';
import type { HypothesisResponse } from '@bork/utils/generate-ai-object/hypothesis';
import { generateHypothesis } from '@bork/utils/generate-ai-object/hypothesis';
import { generateThread } from '@bork/utils/generate-ai-object/informative-thread';
import {
  type Client,
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';

export class InformativeThreadsClient implements Client, ClientInstance {
  name = 'InformativeThreadsClient';
  private monitoringTimeout: ReturnType<typeof setInterval> | null = null;
  private currentHypothesis: HypothesisResponse | null = null;
  private lastHypothesisGeneration = 0;

  /**
   * Starts monitoring for content creation opportunities
   */
  async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    elizaLogger.info('[InformativeThreads] Starting content monitoring');

    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error('[InformativeThreads] Twitter service not found');
      return;
    }
    // Set up periodic content generation
    this.monitoringTimeout = setInterval(
      () => this.generateAndProcessContent(runtime, twitterService),
      CONTENT_CREATION.CONTENT_GENERATION_INTERVAL,
    );
  }

  /**
   * Stops monitoring for content creation opportunities
   */
  async stop(): Promise<void> {
    elizaLogger.info('[InformativeThreads] Stopping content monitoring');

    if (this.monitoringTimeout) {
      clearInterval(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private async generateAndProcessContent(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
  ) {
    elizaLogger.info('[InformativeThreads] Starting content generation cycle');

    try {
      // Update all thread metrics before generating hypothesis
      elizaLogger.debug(
        '[InformativeThreads] Updating performance metrics for all threads',
      );

      // Fetch all threads and update their metrics
      const allThreads = await threadQueries.getThreadsByAgent(
        runtime.agentId || 'default',
      );

      await updateAllThreadsMetrics(
        allThreads.map((thread) => ({
          id: thread.id,
          tweetIds: thread.tweetIds,
        })),
        twitterService,
      );

      // Check if we need to generate a new hypothesis
      const now = Date.now();
      if (
        !this.currentHypothesis ||
        now - this.lastHypothesisGeneration >
          CONTENT_CREATION.HYPOTHESIS_REFRESH_INTERVAL
      ) {
        elizaLogger.debug('[InformativeThreads] Generating new hypothesis...');
        this.currentHypothesis = await generateHypothesis(
          runtime,
          CONTENT_CREATION.TIMEFRAME_HOURS,
          CONTENT_CREATION.PREFERRED_TOPIC,
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
        elizaLogger.debug('[InformativeThreads] Processing topic:', {
          primaryTopic: topic.primaryTopic,
          threadIdea: topic.threadIdea,
        });

        // Generate thread content with integrated media
        const thread = await generateThread(runtime, topic);

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
          const postedTweet = await twitterService.sendTweet(
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

        // Save the posted thread with all its data
        const postedThread = await threadQueries.savePostedThread({
          agentId: runtime.agentId || 'default',
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
          usedKnowledge:
            topic.relevantKnowledge
              ?.filter((k) => k.source?.url && k.source?.authorUsername)
              .map((k) => ({
                content: k.content,
                type: k.type,
                useCase: k.useCase,
                createdAt: k.createdAt,
                source: {
                  tweetId: k.source?.tweetId,
                  url: k.source?.url || '',
                  authorUsername: k.source?.authorUsername || '',
                  metrics: k.source?.metrics
                    ? {
                        likes: k.source.metrics.likes || 0,
                        retweets: k.source.metrics.retweets || 0,
                        replies: k.source.metrics.replies || 0,
                      }
                    : undefined,
                },
              })) || [],
        });

        elizaLogger.info('[InformativeThreads] Successfully processed topic');
        elizaLogger.debug({
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
}

export default InformativeThreadsClient;
