import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { TWITTER_CONFIG } from '../../../config/twitter';
import { tweetQueries } from '../../bork-extensions/src/db/queries.js';
import { updateMarketMetrics } from '../lib/utils/tweet-processing';
import { processAndStoreTweet } from '../lib/utils/tweet-processing';
import type { TwitterService } from '../services/twitter.service';

export class TwitterAccountsClient {
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private monitoringTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterService = twitterService;
    this.runtime = runtime;
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

    this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterAccounts] Stopping accounts client');
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private onReady() {
    this.monitorTargetAccountsLoop();
  }

  private monitorTargetAccountsLoop() {
    this.monitorTargetAccounts();
    const { min, max } = TWITTER_CONFIG.search.searchInterval;
    this.monitoringTimeout = setTimeout(
      () => this.monitorTargetAccountsLoop(),
      (Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000,
    );
  }

  private async monitorTargetAccounts() {
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

      const allTweets = [];
      for (const account of targetAccounts) {
        try {
          const { tweets: accountTweets, spammedTweets } =
            await this.twitterService.searchTweets(
              `from:${account.username}`,
              TWITTER_CONFIG.search.tweetLimits.targetAccounts,
              SearchMode.Latest,
              '[TwitterAccounts]',
            );

          elizaLogger.info(
            `[TwitterAccounts] Fetched ${accountTweets.length} tweets from ${account.username}`,
            { spammedTweets },
          );

          allTweets.push(...accountTweets);
        } catch (error) {
          elizaLogger.error(
            `[TwitterAccounts] Error fetching tweets from ${account.username}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      if (allTweets.length === 0) {
        elizaLogger.warn(
          '[TwitterAccounts] No tweets found from target accounts',
        );
        return;
      }

      const topicWeights = await tweetQueries.getTopicWeights();
      // Process filtered tweets
      for (const tweet of allTweets) {
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
