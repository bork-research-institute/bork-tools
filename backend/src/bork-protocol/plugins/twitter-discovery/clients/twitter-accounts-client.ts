import { TwitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { TwitterConfig } from '@/bork-protocol/types/config';
import { selectTargetAccounts } from '@/bork-protocol/utils/selection/select-account';
import { selectTweetsFromAccounts } from '@/bork-protocol/utils/selection/select-tweets-from-account';
import { AnalysisQueueService } from '@/services/analysis-queue.service';
import { TwitterService } from '@/services/twitter-service';
import type { TwitterDiscoveryConfig } from '@bork/plugins/twitter-discovery/types/twitter-discovery-config';
import { initializeTargetAccounts } from '@bork/utils/initialize-db/accounts';
import { initializeTopicWeights } from '@bork/utils/initialize-db/topics';
import {
  type Client,
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';

export class TwitterAccountsClient implements Client, ClientInstance {
  name = 'TwitterAccountsClient';
  private monitoringTimeout: ReturnType<typeof setInterval> | null = null;

  async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    elizaLogger.info('[TwitterAccountsClient] Starting accounts client');

    const analysisQueueService = runtime.services.get(
      AnalysisQueueService.serviceType,
    ) as AnalysisQueueService;
    if (!analysisQueueService) {
      elizaLogger.error(
        '[TwitterAccountsClient] Analysis queue service not found',
      );
      return;
    }
    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error('[TwitterAccountsClient] Twitter service not found');
      return;
    }
    const configService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!configService) {
      elizaLogger.error(
        '[TwitterAccountDiscoveryService] Twitter config service not found',
      );
      return;
    }

    const config = await configService.getConfig();
    const discoveryConfig = configService.getCharacterConfig();

    // Initialize topic weights if they don't exist
    try {
      await initializeTopicWeights(runtime);
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccountsClient] Error initializing topic weights:',
        error,
      );
    }
    await this.initializeTargetAccounts(twitterService, config);
    await this.monitorTargetAccountsLoop(
      runtime,
      analysisQueueService,
      twitterService,
      config,
      discoveryConfig,
    );

    if (discoveryConfig.shouldPrefetch) {
      elizaLogger.info('[TwitterAccountsClient] Prefetching...');
      await this.monitorTargetAccounts(
        runtime,
        analysisQueueService,
        twitterService,
        config,
        discoveryConfig,
      );
      elizaLogger.info('[TwitterAccountsClient] Prefetching complete');
    }
    return this;
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterAccountsClient] Stopping accounts client');
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private async monitorTargetAccountsLoop(
    runtime: IAgentRuntime,
    analysisQueueService: AnalysisQueueService,
    twitterService: TwitterService,
    config: TwitterConfig,
    discoveryConfig: TwitterDiscoveryConfig,
  ) {
    this.monitoringTimeout = setInterval(
      () =>
        this.monitorTargetAccounts(
          runtime,
          analysisQueueService,
          twitterService,
          config,
          discoveryConfig,
        ),
      discoveryConfig.twitterPollInterval,
    );
  }

  private async monitorTargetAccounts(
    runtime: IAgentRuntime,
    analysisQueueService: AnalysisQueueService,
    twitterService: TwitterService,
    config: TwitterConfig,
    discoveryConfig: TwitterDiscoveryConfig,
  ) {
    elizaLogger.info(
      '[TwitterAccountsClient] Starting target account monitoring',
    );
    try {
      // Select accounts to process using weighted randomization
      const accountsToProcess = await selectTargetAccounts(
        runtime,
        config,
        discoveryConfig,
      );
      if (!accountsToProcess.length) {
        elizaLogger.warn('[TwitterAccountsClient] No target accounts found');
        return;
      }
      // Select tweets from accounts based on engagement criteria
      const selectionResults = await selectTweetsFromAccounts(
        twitterService,
        accountsToProcess,
        config,
      );
      const allTweets = selectionResults.flatMap((result) => result.tweets);

      if (allTweets.length === 0) {
        elizaLogger.warn(
          '[TwitterAccountsClient] No tweets found from any target accounts',
        );
        return;
      }
      await analysisQueueService.addTweets(allTweets, 'account', 2);
      elizaLogger.info(
        '[TwitterAccountsClient] Successfully queued tweets from target accounts',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccountsClient] Error monitoring target accounts:',
        error instanceof Error ? error.stack || error.message : String(error),
      );
    } finally {
      elizaLogger.info(
        '[TwitterAccountsClient] Target account monitoring cycle completed',
      );
    }
  }

  private async initializeTargetAccounts(
    twitterService: TwitterService,
    config: TwitterConfig,
  ): Promise<void> {
    await initializeTargetAccounts(twitterService, config);
  }
}
