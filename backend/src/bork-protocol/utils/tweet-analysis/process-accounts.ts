import {
  accountTopicQueries,
  tweetQueries,
  userMentionQueries,
} from '@/extensions/src/db/queries';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type { DatabaseTweet } from '@/types/twitter';
import { elizaLogger } from '@elizaos/core';

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

export async function storeAccountInfo(
  tweet: DatabaseTweet,
  twitterService: TwitterService,
  topics: string[] = [],
): Promise<void> {
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

    elizaLogger.info(
      '[Mentions Processing] Adding mentions to target accounts and saving relationships',
    );

    // First ensure the author account exists
    try {
      const authorProfile = await twitterService.getUserProfile(tweet.username);
      if (authorProfile) {
        await tweetQueries.insertTargetAccount({
          username: tweet.username,
          userId: authorProfile.userId,
          displayName: authorProfile.displayName,
          description: authorProfile.description,
          followersCount: authorProfile.followersCount,
          followingCount: authorProfile.followingCount,
          friendsCount: authorProfile.friendsCount,
          mediaCount: authorProfile.mediaCount,
          statusesCount: authorProfile.statusesCount,
          likesCount: authorProfile.likesCount,
          listedCount: authorProfile.listedCount,
          tweetsCount: authorProfile.tweetsCount,
          isPrivate: authorProfile.isPrivate,
          isVerified: authorProfile.isVerified,
          isBlueVerified: authorProfile.isBlueVerified,
          joinedAt: authorProfile.joinedAt,
          location: authorProfile.location,
          avatarUrl: authorProfile.avatarUrl,
          bannerUrl: authorProfile.bannerUrl,
          websiteUrl: authorProfile.websiteUrl,
          canDm: authorProfile.canDm,
          createdAt: new Date(),
          lastUpdated: new Date(),
          isActive: true,
          source: 'author',
          avgLikes50: 0,
          avgRetweets50: 0,
          avgReplies50: 0,
          avgViews50: 0,
          engagementRate50: 0,
          influenceScore: 0,
          last50TweetsUpdatedAt: null,
        });

        // Now update account-topic relationships for author
        for (const topic of topics) {
          try {
            await accountTopicQueries.upsertAccountTopic(tweet.username, topic);
          } catch (topicError) {
            elizaLogger.error(
              '[Mentions Processing] Error updating author account-topic relationship:',
              {
                error:
                  topicError instanceof Error
                    ? topicError.message
                    : String(topicError),
                username: tweet.username,
                topic,
              },
            );
          }
        }
      } else {
        elizaLogger.warn(
          '[Mentions Processing] Could not fetch author profile:',
          {
            username: tweet.username,
          },
        );
      }
    } catch (authorError) {
      elizaLogger.error('[Mentions Processing] Error processing author:', {
        error:
          authorError instanceof Error
            ? authorError.message
            : String(authorError),
        username: tweet.username,
      });
    }

    // Process each unique mention
    for (const mentionedUsername of allMentions) {
      try {
        // Skip if target username is missing
        if (!mentionedUsername) {
          continue;
        }

        // For mentioned user
        const mentionedProfile =
          await twitterService.getUserProfile(mentionedUsername);
        if (!mentionedProfile) {
          elizaLogger.warn('[Mentions Processing] Could not fetch profile:', {
            username: mentionedUsername,
          });
          continue;
        }

        // First insert the account
        await tweetQueries.insertTargetAccount({
          username: mentionedUsername,
          userId: mentionedProfile.userId,
          displayName: mentionedProfile.displayName,
          description: mentionedProfile.description,
          followersCount: mentionedProfile.followersCount,
          followingCount: mentionedProfile.followingCount,
          friendsCount: mentionedProfile.friendsCount,
          mediaCount: mentionedProfile.mediaCount,
          statusesCount: mentionedProfile.statusesCount,
          likesCount: mentionedProfile.likesCount,
          listedCount: mentionedProfile.listedCount,
          tweetsCount: mentionedProfile.tweetsCount,
          isPrivate: mentionedProfile.isPrivate,
          isVerified: mentionedProfile.isVerified,
          isBlueVerified: mentionedProfile.isBlueVerified,
          joinedAt: mentionedProfile.joinedAt,
          location: mentionedProfile.location,
          avatarUrl: mentionedProfile.avatarUrl,
          bannerUrl: mentionedProfile.bannerUrl,
          websiteUrl: mentionedProfile.websiteUrl,
          canDm: mentionedProfile.canDm,
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

        // Then update account-topic relationships for mentioned user
        for (const topic of topics) {
          try {
            await accountTopicQueries.upsertAccountTopic(
              mentionedUsername,
              topic,
            );
          } catch (topicError) {
            elizaLogger.error(
              '[Mentions Processing] Error updating mentioned user account-topic relationship:',
              {
                error:
                  topicError instanceof Error
                    ? topicError.message
                    : String(topicError),
                username: mentionedUsername,
                topic,
              },
            );
          }
        }

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
