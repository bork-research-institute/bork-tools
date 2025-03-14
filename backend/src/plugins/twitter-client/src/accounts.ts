import { elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';
import { TWITTER_CONFIG } from '../../../config/twitter.js';
import { tweetQueries } from '../../bork-extensions/src/db/queries.js';
import { ClientBase } from './base';
import type { Tweet } from './lib/twitter.js';
import {
  getUserSpamData,
  processAndStoreTweet,
  updateMarketMetrics,
} from './lib/utils/tweet-processing.js';

export class TwitterAccountsClient extends ClientBase {
  async start(): Promise<void> {
    elizaLogger.info('[Twitter Accounts] Starting accounts client');
    await this.init();

    // Initialize both topic weights and target accounts if they don't exist
    await this.initializeTopicWeights();
    await this.initializeTargetAccounts();

    this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[Twitter Accounts] Stopping accounts client');
    await super.stop();
  }

  private onReady() {
    this.monitorTargetAccountsLoop();
  }

  private monitorTargetAccountsLoop() {
    this.monitorTargetAccounts();
    const { min, max } = TWITTER_CONFIG.search.searchInterval;
    setTimeout(
      () => this.monitorTargetAccountsLoop(),
      (Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000,
    );
  }

  private async monitorTargetAccounts() {
    elizaLogger.info('[Twitter Accounts] Starting target account monitoring');
    try {
      // Get current topic weights for analysis
      const topicWeights = await tweetQueries.getTopicWeights();

      if (!topicWeights.length) {
        elizaLogger.warn(
          '[Twitter Accounts] No topic weights found, initializing',
        );
        await this.initializeTopicWeights();
        return;
      }

      // Check if target accounts exist, initialize if needed
      const targetAccounts = await tweetQueries.getTargetAccounts();
      if (!targetAccounts.length) {
        elizaLogger.warn(
          '[Twitter Accounts] No target accounts found, initializing',
        );
        await this.initializeTargetAccounts();
        return;
      }

      const tweets = await this.fetchTargetAccountTweets();
      elizaLogger.info(
        `[Twitter Accounts] Fetched ${tweets.length} tweets from target accounts`,
      );

      if (tweets.length === 0) {
        elizaLogger.warn(
          '[Twitter Accounts] No tweets found from target accounts',
        );
        return;
      }

      // Get spam data for all unique authors
      const uniqueAuthors = [...new Set(tweets.map((t) => t.author_id))];
      elizaLogger.info(
        `[Twitter Accounts] Fetching spam data for ${uniqueAuthors.length} unique authors`,
      );

      const spamUsers = new Set<string>();
      await Promise.all(
        uniqueAuthors.map(async (authorId) => {
          try {
            const spamData = await getUserSpamData(
              authorId,
              '[Twitter Accounts]',
            );
            if (spamData && spamData.spamScore > 0.7) {
              spamUsers.add(authorId);
              elizaLogger.debug(
                `[Twitter Accounts] Filtered out spam user ${authorId}`,
                {
                  spamScore: spamData.spamScore,
                  tweetCount: spamData.tweetCount,
                  violations: spamData.violations,
                },
              );
            }
          } catch (error) {
            elizaLogger.error(
              `[Twitter Accounts] Error fetching spam data for user ${authorId}:`,
              error,
            );
          }
        }),
      );

      // Filter out tweets from known spam users
      const filteredTweets = tweets.filter(
        (tweet) => !spamUsers.has(tweet.author_id),
      );
      const spammedTweets = tweets.length - filteredTweets.length;

      elizaLogger.info(
        `[Twitter Accounts] Filtered ${spammedTweets} tweets from ${spamUsers.size} spam users. Processing ${filteredTweets.length} tweets`,
        {
          totalTweets: tweets.length,
          spammedTweets,
          spamUsers: spamUsers.size,
          remainingTweets: filteredTweets.length,
        },
      );

      if (filteredTweets.length > 0) {
        for (const tweet of filteredTweets) {
          await processAndStoreTweet(
            this,
            tweet,
            topicWeights,
            '[Twitter Accounts]',
          );
        }

        // Update market metrics with non-spam tweets
        await updateMarketMetrics(filteredTweets, '[Twitter Accounts]');
      } else {
        elizaLogger.warn(
          '[Twitter Accounts] No non-spam tweets found to process',
        );
      }

      elizaLogger.info(
        '[Twitter Accounts] Successfully processed target account tweets',
      );
    } catch (error) {
      elizaLogger.error(
        '[Twitter Accounts] Error monitoring target accounts:',
        error,
      );
    }
  }

  private async initializeTopicWeights(): Promise<void> {
    try {
      elizaLogger.info('[Twitter Accounts] Initializing topic weights');
      await tweetQueries.initializeTopicWeights(this.runtime.character.topics);
      elizaLogger.info('[Twitter Accounts] Topic weights initialized');
    } catch (error) {
      elizaLogger.error(
        '[Twitter Accounts] Error initializing topic weights:',
        error,
      );
    }
  }

  private async initializeTargetAccounts(): Promise<void> {
    try {
      elizaLogger.info(
        '[Twitter Accounts] Checking target accounts initialization',
      );

      // Check if accounts already exist
      const existingAccounts = await tweetQueries.getTargetAccounts();
      if (existingAccounts.length > 0) {
        elizaLogger.info(
          '[Twitter Accounts] Target accounts already initialized',
        );
        return;
      }

      elizaLogger.info(
        '[Twitter Accounts] Initializing target accounts from config',
      );

      // Get target accounts from config
      const targetAccounts = TWITTER_CONFIG.targetAccounts;

      // Initialize each account with basic metadata
      for (const username of targetAccounts) {
        try {
          // Fetch basic profile info for the account
          const profile = await this.twitterClient.getProfile(username);

          await tweetQueries.insertTargetAccount({
            username,
            userId: profile?.userId || '',
            displayName: profile?.name || username,
            description: profile?.biography || '',
            followersCount: profile?.followersCount || 0,
            followingCount: profile?.followingCount || 0,
            friendsCount: profile?.friendsCount || 0,
            mediaCount: profile?.mediaCount || 0,
            statusesCount: profile?.statusesCount || 0,
            likesCount: profile?.likesCount || 0,
            listedCount: profile?.listedCount || 0,
            tweetsCount: profile?.tweetsCount || 0,
            isPrivate: profile?.isPrivate || false,
            isVerified: profile?.isVerified || false,
            isBlueVerified: profile?.isBlueVerified || false,
            joinedAt: profile?.joined || null,
            location: profile?.location || '',
            avatarUrl: profile?.avatar || null,
            bannerUrl: profile?.banner || null,
            websiteUrl: profile?.website || null,
            canDm: profile?.canDm || false,
            createdAt: new Date(),
            lastUpdated: new Date(),
            isActive: true,
            source: 'config',
          });

          elizaLogger.info(
            `[Twitter Accounts] Initialized target account: ${username}`,
          );
        } catch (error) {
          elizaLogger.error(
            `[Twitter Accounts] Error initializing target account ${username}:`,
            error,
          );
        }
      }

      elizaLogger.info(
        '[Twitter Accounts] Completed target accounts initialization',
      );
    } catch (error) {
      elizaLogger.error(
        '[Twitter Accounts] Error initializing target accounts:',
        error,
      );
    }
  }

  async fetchTargetAccountTweets(): Promise<Tweet[]> {
    const tweets: Tweet[] = [];
    const targetAccounts = await tweetQueries.getTargetAccounts();

    for (const account of targetAccounts) {
      try {
        const userTweets = await this.fetchSearchTweets(
          `from:${account.username}`,
          TWITTER_CONFIG.search.tweetLimits.targetAccounts,
          SearchMode.Latest,
        );
        if (userTweets?.tweets) {
          tweets.push(
            ...userTweets.tweets.map((tweet) => ({
              ...tweet,
              created_at: new Date(tweet.timestamp * 1000),
              author_id: tweet.userId,
              text: tweet.text || '',
              public_metrics: {
                like_count: tweet.likes || 0,
                retweet_count: tweet.retweets || 0,
                reply_count: tweet.replies || 0,
              },
              entities: {
                hashtags: tweet.hashtags || [],
                mentions: tweet.mentions || [],
                urls: tweet.urls || [],
              },
            })),
          );
        }
      } catch (error) {
        elizaLogger.error(
          `[Twitter Accounts] Error fetching tweets from ${account.username}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    return tweets;
  }
}

export default TwitterAccountsClient;
