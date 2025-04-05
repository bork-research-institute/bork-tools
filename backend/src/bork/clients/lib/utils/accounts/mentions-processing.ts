import { elizaLogger } from '@elizaos/core';
import {
  tweetQueries,
  userMentionQueries,
} from '../../../../extensions/src/db/queries';
import type { DatabaseTweet } from '../../types/twitter';

function getMentionsFromText(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex) || [];
  return matches.map((match) => match.slice(1)); // Remove @ symbol
}

function getMentionsFromThread(thread: unknown[]): string[] {
  const mentions = new Set<string>();

  for (const tweet of thread) {
    if (typeof tweet === 'object' && tweet && 'text' in tweet) {
      const text = String(tweet.text || '');
      for (const mention of getMentionsFromText(text)) {
        mentions.add(mention);
      }
    }
  }

  return Array.from(mentions);
}

export async function storeMentions(tweet: DatabaseTweet): Promise<void> {
  try {
    // Skip if no username
    if (!tweet.username) {
      elizaLogger.warn(
        '[Mentions Processing] Tweet has no username, skipping mentions',
      );
      return;
    }

    // Get unique mentions from all sources
    const textMentions = getMentionsFromText(tweet.text || '');
    const threadMentions = getMentionsFromThread(tweet.thread || []);
    const metadataMentions = (tweet.mentions || [])
      .map((m) => m.username)
      .filter(Boolean);

    const allMentions = new Set([
      ...textMentions,
      ...threadMentions,
      ...metadataMentions,
    ]);

    elizaLogger.info('[Mentions Processing] Processing mentions:', {
      textMentions,
      threadMentions,
      metadataMentions,
      totalUnique: allMentions.size,
      fromUsername: tweet.username,
      hasIds: Array.from(allMentions),
    });

    // Process each unique mention
    for (const mentionedUsername of allMentions) {
      try {
        // Skip if source or target username is missing
        if (!mentionedUsername || !tweet.username) {
          continue;
        }

        // First ensure both users exist in target_accounts
        await tweetQueries.insertTargetAccount({
          username: tweet.username,
          userId: tweet.userId?.toString() || '',
          displayName: tweet.name || tweet.username,
          description: '',
          followersCount: 0,
          followingCount: 0,
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
          source: 'tweet_author',
          avgLikes50: 0,
          avgRetweets50: 0,
          avgReplies50: 0,
          avgViews50: 0,
          engagementRate50: 0,
          influenceScore: 0,
          last50TweetsUpdatedAt: null,
        });

        await tweetQueries.insertTargetAccount({
          username: mentionedUsername,
          userId: '', // We don't have the ID yet
          displayName: mentionedUsername,
          description: '',
          followersCount: 0,
          followingCount: 0,
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
          source: 'mention',
          avgLikes50: 0,
          avgRetweets50: 0,
          avgReplies50: 0,
          avgViews50: 0,
          engagementRate50: 0,
          influenceScore: 0,
          last50TweetsUpdatedAt: null,
        });

        // Now create the mention relationship
        await userMentionQueries.upsertMentionRelationship(
          tweet.username,
          mentionedUsername,
          tweet.tweet_id,
          new Date(tweet.timestamp * 1000),
        );
      } catch (error) {
        elizaLogger.error('[Mentions Processing] Error processing mention:', {
          fromUsername: tweet.username,
          toUsername: mentionedUsername,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    elizaLogger.error('[Mentions Processing] Error processing mentions:', {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id,
    });
  }
}
