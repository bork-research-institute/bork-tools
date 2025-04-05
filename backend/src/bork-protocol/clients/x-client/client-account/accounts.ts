import { processTweets } from '@/utils/tweet-analysis/process-tweets';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { tweetQueries } from 'src/bork-protocol/extensions/src/db/queries';
import { KaitoService } from 'src/bork-protocol/services/kaito-service';
import { TwitterConfigService } from 'src/bork-protocol/services/twitter-config-service';
import type { TwitterService } from 'src/bork-protocol/services/twitter-service';
import { initializeTopicWeights } from 'src/bork-protocol/utils/topics/topics';
import { initializeTargetAccounts } from './utils/account-initialization';
import { selectTargetAccounts } from './utils/account-selection';
import { selectTweetsFromAccounts } from './utils/tweet-selection';

export class TwitterAccountsClient {
  private twitterConfigService: TwitterConfigService;
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private readonly kaitoService: KaitoService;
  private monitoringTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterService = twitterService;
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
    this.kaitoService = new KaitoService();
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterAccounts] Starting accounts client');

    // Initialize topic weights if they don't exist
    try {
      await initializeTopicWeights(this.runtime);
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccounts] Error initializing topic weights:',
        error,
      );
    }

    await this.initializeTargetAccounts();
    await this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterAccounts] Stopping accounts client');
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private async onReady() {
    await this.monitorTargetAccountsLoop();
  }

  private async monitorTargetAccountsLoop() {
    try {
      await this.monitorTargetAccounts();
    } catch (error) {
      elizaLogger.error('[TwitterAccounts] Error in monitoring loop:', error);
    }

    // Schedule next run only after current one completes
    this.monitoringTimeout = setTimeout(
      () => this.monitorTargetAccountsLoop(),
      Number(this.runtime.getSetting('TWITTER_POLL_INTERVAL') || 60) * 1000,
    );
  }

  private async monitorTargetAccounts() {
    elizaLogger.info('[TwitterAccounts] Starting target account monitoring');

    try {
      // Get config first
      const config = await this.twitterConfigService.getConfig();

      // Select accounts to process using weighted randomization
      const accountsToProcess = await selectTargetAccounts(config);
      if (!accountsToProcess.length) {
        return;
      }

      // Select tweets from accounts based on engagement criteria
      const selectionResults = await selectTweetsFromAccounts(
        this.twitterService,
        accountsToProcess,
        config,
      );

      // Collect all tweets that meet criteria
      const allTweets = selectionResults.flatMap((result) => result.tweets);

      if (allTweets.length === 0) {
        elizaLogger.warn(
          '[TwitterAccounts] No tweets found from any target accounts',
        );
        return;
      }

      // Get topic weights for processing
      const topicWeights = await tweetQueries.getTopicWeights();

      // Process filtered tweets
      await processTweets(
        this.runtime,
        this.twitterService,
        allTweets,
        topicWeights,
      );
    } catch (error) {
      // Catch-all error handler to prevent process crashes
      elizaLogger.error(
        '[TwitterAccounts] Error monitoring target accounts:',
        error instanceof Error ? error.stack || error.message : String(error),
      );
    } finally {
      // Log completion of monitoring cycle whether successful or not
      elizaLogger.info(
        '[TwitterAccounts] Target account monitoring cycle completed',
      );
    }
  }

  private async initializeTargetAccounts(): Promise<void> {
    const config = await this.twitterConfigService.getConfig();
    await initializeTargetAccounts(this.twitterService, config);
  }
}

export default TwitterAccountsClient;
