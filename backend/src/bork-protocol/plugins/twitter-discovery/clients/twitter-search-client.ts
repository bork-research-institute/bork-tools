import { TwitterService } from '@/services/twitter-service';
import { AnalysisQueueService } from '@bork/plugins/twitter-discovery/services/analysis-queue.service';
import { TwitterDiscoveryConfigService } from '@bork/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { TwitterConfig } from '@bork/plugins/twitter-discovery/types/twitter-config';
import type { TwitterDiscoveryConfig } from '@bork/plugins/twitter-discovery/types/twitter-discovery-config';
import { initializeTopicWeights } from '@bork/utils/initialize-db/topics';
import { selectTopic } from '@bork/utils/selection/select-topic';
import {
  type Client,
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';

export class TwitterSearchClient implements Client, ClientInstance {
  name = 'TwitterSearchClient';
  private searchTimeout: ReturnType<typeof setInterval> | null = null;

  async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    elizaLogger.info('[TwitterSearchClient] Starting search client');

    const configService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!configService) {
      elizaLogger.error(
        '[TwitterSearchClient] Twitter config service not found',
      );
      return;
    }

    const config = await configService.getConfig();
    const characterConfig = configService.getCharacterConfig();

    const analysisQueueService = runtime.services.get(
      AnalysisQueueService.serviceType,
    ) as AnalysisQueueService;
    if (!analysisQueueService) {
      elizaLogger.error(
        '[TwitterSearchClient] Analysis queue service not found',
      );
      return;
    }
    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error('[TwitterSearchClient] Twitter service not found');
      return;
    }

    // Initialize topic weights if they don't exist
    try {
      await initializeTopicWeights(runtime);
    } catch (error) {
      elizaLogger.error(
        '[TwitterSearchClient] Error initializing topic weights:',
        error,
      );
    }
    await this.engageWithSearchTermsLoop(
      runtime,
      analysisQueueService,
      twitterService,
      config,
      characterConfig,
    );
    return this;
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterSearchClient] Stopping search client');
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  private async engageWithSearchTermsLoop(
    runtime: IAgentRuntime,
    analysisQueueService: AnalysisQueueService,
    twitterService: TwitterService,
    config: TwitterConfig,
    characterConfig: TwitterDiscoveryConfig,
  ) {
    this.searchTimeout = setInterval(
      () =>
        this.engageWithSearchTerms(
          runtime,
          analysisQueueService,
          twitterService,
          config,
          characterConfig,
        ),
      // TODO Could be a different interval for search
      characterConfig.twitterPollInterval,
    );
  }

  private async engageWithSearchTerms(
    runtime: IAgentRuntime,
    analysisQueueService: AnalysisQueueService,
    twitterService: TwitterService,
    config: TwitterConfig,
    characterConfig: TwitterDiscoveryConfig,
  ) {
    elizaLogger.info('[TwitterSearchClient] Engaging with search terms');
    try {
      // Use the new async selectTopic with runtime and configured timeframe
      const selectedTopics = await selectTopic(
        runtime,
        characterConfig.searchTimeframeHours,
        characterConfig.preferredTopic,
        characterConfig.maxSearchTopics,
      );
      if (selectedTopics.length === 0) {
        elizaLogger.warn('[TwitterSearchClient] No topics were selected');
        return;
      }
      for (const selectedTopic of selectedTopics) {
        elizaLogger.debug(
          `[TwitterSearchClient] Fetching search tweets for topic: ${selectedTopic.topic}`,
          {
            currentTopic: selectedTopic.topic,
            weight: selectedTopic.weight,
          },
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const { tweets: searchTweets } = await twitterService.searchTweets(
          selectedTopic.topic,
          config.search.tweetLimits.searchResults,
          SearchMode.Top,
          '[TwitterSearchClient]',
          config.search.parameters,
          config.search.engagementThresholds,
        );

        if (!searchTweets.length) {
          elizaLogger.warn(
            `[TwitterSearchClient] No tweets found for term: ${selectedTopic.topic}`,
          );
          continue;
        }
        elizaLogger.info(
          `[TwitterSearchClient] Found ${searchTweets.length} tweets for term: ${selectedTopic.topic}`,
        );
        await analysisQueueService.addTweets(searchTweets, 'search', 1);
      }
      elizaLogger.info(
        '[TwitterSearchClient] Completed search for all selected topics',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterSearchClient] Error engaging with search terms:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
