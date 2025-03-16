import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { tweetQueries } from '../../bork-extensions/src/db/queries';
import { storeMentions } from '../lib/utils/mentions-processing';
import { processAndStoreTweet } from '../lib/utils/tweet-processing';
import { updateYapsData } from '../lib/utils/yaps-processing';
import { KaitoService } from '../services/kaito-service';
import { TwitterConfigService } from '../services/twitter-config-service';
import type { TwitterService } from '../services/twitter-service';

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

    const config = await this.twitterConfigService.getConfig();

    const topicWeights = await tweetQueries.getTopicWeights();
    if (!topicWeights.length) {
      elizaLogger.error(
        '[TwitterAccounts] Topic weights need to be initialized',
      );
      throw new Error('Topic weights need to be initialized');
    }

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

      // Get yaps data for all accounts to calculate weights
      const userIds = targetAccounts.map((account) => account.userId);
      const yapsData = await tweetQueries.getYapsForAccounts(userIds);

      // Create weighted selection array with base weight of 1, adding yaps_l24h score
      const weightedAccounts = targetAccounts.map((account) => {
        const accountYaps = yapsData.find(
          (yaps) => yaps.userId === account.userId,
        );
        const weight = 1 + (accountYaps?.yapsL24h || 0);
        return { account, weight };
      });

      // Calculate total weight
      const totalWeight = weightedAccounts.reduce(
        (sum, { weight }) => sum + weight,
        0,
      );

      // Select accounts using weighted random selection
      const accountsToProcess = [];
      const availableAccounts = [...weightedAccounts];
      const numAccountsToProcess = Math.min(
        config.search.tweetLimits.accountsToProcess,
        availableAccounts.length,
      );

      for (let i = 0; i < numAccountsToProcess; i++) {
        let randomWeight = Math.random() * totalWeight;
        let selectedIndex = 0;

        // Find the account that corresponds to the random weight
        for (let j = 0; j < availableAccounts.length; j++) {
          randomWeight -= availableAccounts[j].weight;
          if (randomWeight <= 0) {
            selectedIndex = j;
            break;
          }
        }

        // Add selected account and remove it from available pool
        accountsToProcess.push(availableAccounts[selectedIndex].account);
        availableAccounts.splice(selectedIndex, 1);
      }

      elizaLogger.info(
        `[TwitterAccounts] Processing ${accountsToProcess.length} accounts (weighted random selection from ${targetAccounts.length} total accounts): ${accountsToProcess.map((a) => a.username).join(', ')}`,
      );

      // Update Yaps data before processing tweets
      await updateYapsData(accountsToProcess);

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
      const mergedTweets = allTweets.map((tweet) => {
        // Start with the original tweet text
        let mergedText = tweet.text || '';

        // First merge thread content if it exists
        if (tweet.thread && tweet.thread.length > 0) {
          // Sort thread by timestamp to ensure chronological order
          const sortedThread = tweet.thread.sort(
            (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
          );

          // Merge text from all thread tweets
          for (const threadTweet of sortedThread) {
            if (threadTweet.id !== tweet.id) {
              mergedText = `${mergedText}\n\n${threadTweet.text || ''}`;
            }
          }
        }

        // Then add top replies if they exist
        if (tweet.topReplies && tweet.topReplies.length > 0) {
          mergedText = `${mergedText}\n\n--- Top Replies ---\n`;

          // Add each top reply with author info
          for (const reply of tweet.topReplies) {
            mergedText = `${mergedText}\n@${reply.username || 'unknown'}: ${reply.text || ''}\n`;
          }
        }

        // Create a new tweet object with merged content
        return {
          ...tweet,
          text: mergedText,
          originalText: tweet.text, // Keep original text for reference
          isThreadMerged: tweet.thread?.length > 0,
          hasReplies: tweet.topReplies?.length > 0,
          threadSize: tweet.thread?.length || 0,
          replyCount: tweet.topReplies?.length || 0,
        };
      });

      elizaLogger.info(
        `[TwitterAccounts] Merged ${mergedTweets.length} tweets with their threads and replies`,
      );

      // Now process each merged tweet
      for (const tweet of mergedTweets) {
        try {
          // Process mentions from the original tweet only
          await storeMentions(tweet);

          // Process and store the merged tweet
          await processAndStoreTweet(
            this.runtime,
            this.twitterService,
            tweet,
            topicWeights,
          );

          elizaLogger.info(
            `[TwitterAccounts] Processed tweet ${tweet.id} with ${tweet.threadSize} thread tweets and ${tweet.replyCount} replies`,
            {
              isThreadMerged: tweet.isThreadMerged,
              hasReplies: tweet.hasReplies,
              textLength: tweet.text.length,
              originalTextLength: tweet.originalText.length,
            },
          );
        } catch (error) {
          elizaLogger.error(
            `[TwitterAccounts] Error processing tweet ${tweet.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      elizaLogger.info(
        '[TwitterAccounts] Successfully processed all merged tweets',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccounts] Error monitoring target accounts:',
        error,
      );
    }
  }

  private async initializeTargetAccounts(): Promise<void> {
    const config = await this.twitterConfigService.getConfig();
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
      const targetAccounts = config.targetAccounts;

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
