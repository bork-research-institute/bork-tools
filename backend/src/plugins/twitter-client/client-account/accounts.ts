import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { KaitoService } from '../lib/services/kaito-service';
import { TwitterConfigService } from '../lib/services/twitter-config-service';
import type { TwitterService } from '../lib/services/twitter-service';
import { initializeTopicWeights } from '../lib/utils/topic-weights';
import { processTweets } from '../lib/utils/tweet-processing';
import { initializeTargetAccounts } from './utils/account-initialization';
import { selectTargetAccounts } from './utils/account-selection';

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
      // Continue even if there's an error - we'll retry later
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
    this.monitorTargetAccounts();
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

      const allTweets = [];
      for (const accountToProcess of accountsToProcess) {
        try {
          const { tweets: accountTweets, spammedTweets } =
            await this.twitterService.searchTweets(
              `from:${accountToProcess.username}`,
              config.search.tweetLimits.targetAccounts,
              SearchMode.Latest,
              '[TwitterAccounts]',
              config.search.parameters,
              config.search.engagementThresholds,
            );

          elizaLogger.info(
            `[TwitterAccounts] Fetched ${accountTweets.length} tweets from ${accountToProcess.username}`,
            { spammedTweets },
          );

          // Collect most recent tweets that meet engagement criteria
          let processedCount = 0;
          const thresholds = config.search.engagementThresholds;

          for (const tweet of accountTweets) {
            if (
              tweet.likes >= thresholds.minLikes &&
              tweet.retweets >= thresholds.minRetweets &&
              tweet.replies >= thresholds.minReplies
            ) {
              allTweets.push(tweet);
              processedCount++;

              if (
                processedCount >=
                config.search.tweetLimits.qualityTweetsPerAccount
              ) {
                break;
              }
            }
          }

          elizaLogger.info(
            `[TwitterAccounts] Selected ${processedCount} tweets meeting criteria from ${accountTweets.length} fetched tweets for ${accountToProcess.username}`,
            {
              minLikes: thresholds.minLikes,
              minRetweets: thresholds.minRetweets,
              minReplies: thresholds.minReplies,
              maxQualityTweets:
                config.search.tweetLimits.qualityTweetsPerAccount,
            },
          );
        } catch (error) {
          elizaLogger.error(
            `[TwitterAccounts] Error fetching tweets from ${accountToProcess.username}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      if (allTweets.length === 0) {
        elizaLogger.warn(
          '[TwitterAccounts] No tweets found from any target accounts',
        );
        return;
      }

      // Process filtered tweets
      await processTweets(allTweets);
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
