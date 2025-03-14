import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { TWITTER_CONFIG } from '../../../config/twitter';
import { tweetQueries } from '../../bork-extensions/src/db/queries.js';
import { storeMentions } from '../lib/utils/mentions-processing';
import {
  processAndStoreTweet,
  updateMarketMetrics,
} from '../lib/utils/tweet-processing';
import { updateYapsData } from '../lib/utils/yaps-processing';
import { KaitoService } from '../services/kaito.service';
import type { TwitterService } from '../services/twitter.service';

export class TwitterAccountsClient {
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private readonly kaitoService: KaitoService;
  private monitoringTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterService = twitterService;
    this.runtime = runtime;
    this.kaitoService = new KaitoService();
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterAccounts] Starting accounts client');

    const topicWeights = await tweetQueries.getTopicWeights();
    if (!topicWeights.length) {
      elizaLogger.error(
        '[TwitterAccounts] Topic weights need to be initialized',
      );
      throw new Error('Topic weights need to be initialized');
    }
    await this.initializeTargetAccounts();

    this.onReady(topicWeights);
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterAccounts] Stopping accounts client');
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private onReady(topicWeights) {
    this.monitorTargetAccountsLoop(topicWeights);
  }

  private monitorTargetAccountsLoop(topicWeights) {
    this.monitorTargetAccounts(topicWeights);
    const { min, max } = TWITTER_CONFIG.search.searchInterval;
    this.monitoringTimeout = setTimeout(
      () => this.monitorTargetAccountsLoop(topicWeights),
      (Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000,
    );
  }

  private async monitorTargetAccounts(topicWeights) {
    elizaLogger.info('[TwitterAccounts] Starting target account monitoring');
    try {
      // Check if target accounts exist, initialize if needed
      const targetAccounts = await tweetQueries.getTargetAccounts();
      if (!targetAccounts.length) {
        elizaLogger.warn(
          '[TwitterAccounts] No target accounts found, initializing',
        );
        await this.initializeTargetAccounts();
        return;
      }

      // Randomly select accounts to process based on config
      const accountsToProcess = [];
      const availableAccounts = [...targetAccounts];
      const numAccountsToProcess = Math.min(
        TWITTER_CONFIG.search.tweetLimits.accountsToProcess,
        availableAccounts.length,
      );

      for (let i = 0; i < numAccountsToProcess; i++) {
        const randomIndex = Math.floor(
          Math.random() * availableAccounts.length,
        );
        accountsToProcess.push(availableAccounts.splice(randomIndex, 1)[0]);
      }

      elizaLogger.info(
        `[TwitterAccounts] Processing ${accountsToProcess.length} accounts (randomly selected from ${targetAccounts.length} total accounts): ${accountsToProcess.map((a) => a.username).join(', ')}`,
      );

      // Update Yaps data before processing tweets
      await updateYapsData(accountsToProcess);

      const allTweets = [];
      for (const accountToProcess of accountsToProcess) {
        try {
          const { tweets: accountTweets, spammedTweets } =
            await this.twitterService.searchTweets(
              `from:${accountToProcess.username}`,
              TWITTER_CONFIG.search.tweetLimits.targetAccounts,
              SearchMode.Latest,
              '[TwitterAccounts]',
              TWITTER_CONFIG.search.parameters,
              TWITTER_CONFIG.search.engagementThresholds,
            );

          elizaLogger.info(
            `[TwitterAccounts] Fetched ${accountTweets.length} tweets from ${accountToProcess.username}`,
            { spammedTweets },
          );

          // Collect most recent tweets that meet engagement criteria
          let processedCount = 0;
          const thresholds = TWITTER_CONFIG.search.engagementThresholds;

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
                TWITTER_CONFIG.search.tweetLimits.qualityTweetsPerAccount
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
                TWITTER_CONFIG.search.tweetLimits.qualityTweetsPerAccount,
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
      for (const tweet of allTweets) {
        // First process mentions
        await storeMentions(tweet);

        // Then process the tweet itself
        await processAndStoreTweet(
          this.runtime,
          this.twitterService,
          tweet,
          topicWeights,
        );
      }

      // Update market metrics with non-spam tweets
      await updateMarketMetrics(allTweets);

      elizaLogger.info(
        '[TwitterAccounts] Successfully processed target account tweets',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccounts] Error monitoring target accounts:',
        error,
      );
    }
  }

  private async initializeTargetAccounts(): Promise<void> {
    try {
      elizaLogger.info(
        '[TwitterAccounts] Checking target accounts initialization',
      );

      // Check if accounts already exist
      const existingAccounts = await tweetQueries.getTargetAccounts();
      if (existingAccounts.length > 0) {
        elizaLogger.info(
          '[TwitterAccounts] Target accounts already initialized',
        );
        return;
      }

      elizaLogger.info(
        '[TwitterAccounts] Initializing target accounts from config',
      );

      // Get target accounts from config
      const targetAccounts = TWITTER_CONFIG.targetAccounts;

      // Initialize each account with basic metadata
      for (const username of targetAccounts) {
        try {
          // Fetch basic profile info for the account using TwitterService
          const { tweets } = await this.twitterService.searchTweets(
            `from:${username}`,
            1,
            SearchMode.Latest,
            '[TwitterAccounts]',
          );

          const profile = tweets[0];
          if (!profile) {
            elizaLogger.error(
              `[TwitterAccounts] Could not fetch profile for ${username}`,
            );
            continue;
          }

          await tweetQueries.insertTargetAccount({
            username,
            userId: profile.userId || '',
            displayName: profile.name || username,
            description: '', // We don't have access to this through tweets
            followersCount: 0, // We don't have access to this through tweets
            followingCount: 0, // We don't have access to this through tweets
            friendsCount: 0,
            mediaCount: 0,
            statusesCount: 0,
            likesCount: 0,
            listedCount: 0,
            tweetsCount: 0,
            isPrivate: false,
            isVerified: false,
            isBlueVerified: false,
            joinedAt: null,
            location: '',
            avatarUrl: null,
            bannerUrl: null,
            websiteUrl: null,
            canDm: false,
            createdAt: new Date(),
            lastUpdated: new Date(),
            isActive: true,
            source: 'config',
          });

          elizaLogger.info(
            `[TwitterAccounts] Initialized target account: ${username}`,
          );
        } catch (error) {
          elizaLogger.error(
            `[TwitterAccounts] Error initializing target account ${username}:`,
            error,
          );
        }
      }

      elizaLogger.info(
        '[TwitterAccounts] Completed target accounts initialization',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccounts] Error initializing target accounts:',
        error,
      );
    }
  }
}

export default TwitterAccountsClient;
