import { CONTENT_CREATION } from '@/config/creation';
import { TweetQueueService } from '@/services/twitter/tweet-queue-service';
import { TwitterConfigService } from '@/services/twitter/twitter-config-service';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type { HypothesisResponse } from '@/utils/generate-ai-object/generate-hypothesis';
import { generateHypothesis } from '@/utils/generate-ai-object/generate-hypothesis';
import { generateThread } from '@/utils/generate-ai-object/generate-informative-thread';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';

export class InformativeThreadsClient {
  private twitterConfigService: TwitterConfigService;
  private tweetQueueService: TweetQueueService;
  private readonly runtime: IAgentRuntime;
  private monitoringTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentHypothesis: HypothesisResponse | null = null;
  private lastHypothesisGeneration = 0;
  private lastContentGeneration = 0;

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.tweetQueueService = new TweetQueueService(twitterService, runtime);
    this.runtime = runtime;
  }

  async start(): Promise<void> {
    elizaLogger.info(
      '[InformativeThreads] Starting informative threads client',
    );
    await this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info(
      '[InformativeThreads] Stopping informative threads client',
    );
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private async onReady() {
    await this.contentGenerationLoop();
  }

  private async contentGenerationLoop() {
    try {
      const now = Date.now();
      const timeSinceLastGeneration = now - this.lastContentGeneration;

      // Only generate content if it's been 24 hours since the last generation
      if (
        timeSinceLastGeneration >= CONTENT_CREATION.CONTENT_GENERATION_INTERVAL
      ) {
        await this.generateAndProcessContent();
        this.lastContentGeneration = now;
      } else {
        elizaLogger.debug(
          '[InformativeThreads] Skipping content generation, not enough time has passed',
          {
            timeSinceLastGeneration,
            nextGenerationIn:
              CONTENT_CREATION.CONTENT_GENERATION_INTERVAL -
              timeSinceLastGeneration,
          },
        );
      }
    } catch (error) {
      elizaLogger.error(
        '[InformativeThreads] Error in content generation loop:',
        error,
      );
    }

    // Schedule next check
    this.monitoringTimeout = setTimeout(
      () => this.contentGenerationLoop(),
      // Check every hour if it's time to generate content
      CONTENT_CREATION.CONTENT_GENERATION_INTERVAL / 24,
    );
  }

  private async generateAndProcessContent() {
    elizaLogger.info('[InformativeThreads] Starting content generation cycle');

    try {
      // Check if we need to generate a new hypothesis
      const now = Date.now();
      if (
        !this.currentHypothesis ||
        now - this.lastHypothesisGeneration >
          CONTENT_CREATION.HYPOTHESIS_REFRESH_INTERVAL
      ) {
        elizaLogger.info('[InformativeThreads] Generating new hypothesis...');
        this.currentHypothesis = await generateHypothesis(this.runtime);
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

        // TODO: Add media generation for first tweet of thread

        // Schedule the thread for posting
        await this.tweetQueueService.scheduleThread(thread);

        elizaLogger.info('[InformativeThreads] Successfully processed topic', {
          primaryTopic: topic.primaryTopic,
          tweetCount: thread.tweets.length,
          mediaCount: thread.tweets.filter((t) => t.media).length,
        });
      } catch (error) {
        elizaLogger.error('[InformativeThreads] Error processing topic:', {
          primaryTopic: this.currentHypothesis.selectedTopic.primaryTopic,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      elizaLogger.info(
        '[InformativeThreads] Content generation cycle completed',
      );
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
