import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import type { AnalysisQueueService } from '../services/analysis-queue.service';
import { TwitterConfigService } from '../services/twitter-config-service';
// TODO: Move or update utility imports if only used by this client

export class TwitterSearchClient {
  private twitterConfigService: TwitterConfigService;
  private readonly runtime: IAgentRuntime;
  private readonly analysisQueueService: AnalysisQueueService;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    runtime: IAgentRuntime,
    analysisQueueService: AnalysisQueueService,
  ) {
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
    this.analysisQueueService = analysisQueueService;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterSearch] Starting search client');
    // TODO: Move or update initializeTopicWeights if only used here
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
    try {
      // TODO: Move or update selectTopic if only used here
      const selectedTopics = [];
      if (selectedTopics.length === 0) {
        elizaLogger.warn('[TwitterSearch] No topics were selected');
        return;
      }
      elizaLogger.info('[TwitterSearch] Selected topics for search:', {
        topics: selectedTopics.map((t) => ({
          topic: t.topic,
          weight: t.weight,
        })),
      });
      for (const selectedTopic of selectedTopics) {
        elizaLogger.info(
          `[TwitterSearch] Fetching search tweets for topic: ${selectedTopic.topic}`,
          {
            currentTopic: selectedTopic.topic,
            weight: selectedTopic.weight,
          },
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const searchTweets = [];
        if (!searchTweets.length) {
          elizaLogger.warn(
            `[TwitterSearch] No tweets found for term: ${selectedTopic.topic}`,
          );
          continue;
        }
        elizaLogger.info(
          `[TwitterSearch] Found ${searchTweets.length} tweets for term: ${selectedTopic.topic}`,
        );
        await this.analysisQueueService.addTweets(searchTweets, 'search', 1);
        elizaLogger.info(
          `[TwitterSearch] Successfully queued search results for topic: ${selectedTopic.topic}`,
        );
      }
      elizaLogger.info(
        '[TwitterSearch] Completed search for all selected topics',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterSearch] Error engaging with search terms:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
