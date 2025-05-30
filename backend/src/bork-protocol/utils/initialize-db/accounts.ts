import type { TwitterService } from '@/services/twitter-service';
import { accountTopicQueries, tweetQueries } from '@bork/db/queries';
import type { TwitterConfig } from '@bork/types/config';
import { elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';

export async function initializeTargetAccounts(
  twitterService: TwitterService,
  config: TwitterConfig,
): Promise<void> {
  try {
    elizaLogger.info(
      '[TwitterAccounts] Checking target accounts initialization',
    );

    // Check if accounts already exist
    const existingAccounts = await tweetQueries.getTargetAccounts();
    if (existingAccounts.length > 0) {
      elizaLogger.info('[TwitterAccounts] Target accounts already initialized');

      // Add some initial topic associations for testing if none exist
      const testAccount = existingAccounts[0];
      const topics = await accountTopicQueries.getAccountTopics(
        testAccount.username,
      );

      if (topics.length === 0) {
        elizaLogger.info('[TwitterAccounts] Adding test topic associations');

        // Initial topics - keep original casing for display but ensure case-insensitive matching
        const initialTopics = [
          'Solana',
          'Blockchain',
          'Crypto',
          'NFTs',
          'DeFi',
          'Web3',
          'Smart Contracts',
          'Cryptocurrency',
          'Digital Assets',
          'Decentralized Finance',
        ];

        for (const topic of initialTopics) {
          elizaLogger.debug(
            `[TwitterAccounts] Adding topic association for ${testAccount.username}: ${topic}`,
          );
          await accountTopicQueries.upsertAccountTopic(
            testAccount.username,
            topic, // Store original casing
          );
        }

        elizaLogger.info(
          `[TwitterAccounts] Added ${initialTopics.length} topic associations for ${testAccount.username}`,
        );
      }

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
        const { tweets } = await twitterService.searchTweets(
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
          // Initialize influence metrics with default values
          avgLikes50: 0,
          avgRetweets50: 0,
          avgReplies50: 0,
          avgViews50: 0,
          engagementRate50: 0,
          influenceScore: 0,
          last50TweetsUpdatedAt: null,
        });

        elizaLogger.debug(
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
    throw error;
  }
}
