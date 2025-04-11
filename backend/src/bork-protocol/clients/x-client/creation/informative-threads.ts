import { TwitterConfigService } from '@/services/twitter/twitter-config-service';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type { HypothesisResponse } from '@/types/response/hypothesis';
import { generateHypothesis } from '@/utils/generate-ai-object/generate-hypothesis';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';

export class InformativeThreadsClient {
  private twitterConfigService: TwitterConfigService;
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private monitoringTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentHypothesis: HypothesisResponse | null = null;
  private lastHypothesisGeneration = 0;
  private readonly HYPOTHESIS_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterService = twitterService;
    this.twitterConfigService = new TwitterConfigService(runtime);
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
      await this.generateAndProcessContent();
    } catch (error) {
      elizaLogger.error(
        '[InformativeThreads] Error in content generation loop:',
        error,
      );
    }

    // Schedule next run
    this.monitoringTimeout = setTimeout(
      () => this.contentGenerationLoop(),
      Number(this.runtime.getSetting('CONTENT_GENERATION_INTERVAL') || 3600) *
        1000, // Default 1 hour
    );
  }

  private async generateAndProcessContent() {
    elizaLogger.info('[InformativeThreads] Starting content generation cycle');

    try {
      // Check if we need to generate a new hypothesis
      const now = Date.now();
      if (
        !this.currentHypothesis ||
        now - this.lastHypothesisGeneration > this.HYPOTHESIS_REFRESH_INTERVAL
      ) {
        elizaLogger.info('[InformativeThreads] Generating new hypothesis...');
        this.currentHypothesis = await generateHypothesis(this.runtime);
        this.lastHypothesisGeneration = now;

        elizaLogger.info('[InformativeThreads] New hypothesis generated', {
          numProjects: this.currentHypothesis.hypotheses.length,
          recommendedFrequency:
            this.currentHypothesis.overallStrategy.recommendedFrequency,
        });
      }

      // Process each hypothesis project
      for (const project of this.currentHypothesis.hypotheses) {
        elizaLogger.info('[InformativeThreads] Processing project', {
          projectName: project.projectName,
          primaryTopic: project.primaryTopic,
          format: project.contentStrategy.format,
        });

        // TODO: Implement content generation for each project
        // This will involve:
        // 1. Generating thread content based on project specifications
        // 2. Creating images/media if needed
        // 3. Scheduling posts according to recommendedFrequency
        // 4. Tracking performance metrics against successMetrics
      }

      // TODO: Implement project success tracking
      // This will involve:
      // 1. Tracking engagement metrics for published content
      // 2. Comparing against successMetrics
      // 3. Adjusting strategy based on performance
      // 4. Updating hypothesis if needed

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
