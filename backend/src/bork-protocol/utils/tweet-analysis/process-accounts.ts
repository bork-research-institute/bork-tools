import {
  accountTopicQueries,
  tweetQueries,
  userMentionQueries,
} from '@/extensions/src/db/queries';
import type { DatabaseTweet } from '@/types/twitter';
import { elizaLogger } from '@elizaos/core';
import { Scraper } from 'agent-twitter-client';

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

    elizaLogger.info('[Mentions Processing] Processing mentions:');
    elizaLogger.debug({
      textMentions,
      threadMentions,
      metadataMentions,
      totalUnique: allMentions.size,
      fromUsername: tweet.username,
      hasIds: Array.from(allMentions),
      topics,
    });

    // Initialize Twitter scraper for profile fetching
    const scraper = new Scraper();

    // First ensure both tweet author exists in target_accounts
    const authorProfile = await scraper.getProfile(tweet.username);
    await tweetQueries.insertTargetAccount({
      username: tweet.username,
      userId: tweet.userId?.toString() || authorProfile?.userId || '',
      displayName: tweet.name || authorProfile?.name || tweet.username,
      description: authorProfile?.biography || '',
      followersCount: authorProfile?.followersCount || 0,
      followingCount: authorProfile?.followingCount || 0,
      friendsCount: authorProfile?.friendsCount || 0,
      mediaCount: authorProfile?.mediaCount || 0,
      statusesCount: authorProfile?.tweetsCount || 0,
      likesCount: authorProfile?.likesCount || 0,
      listedCount: authorProfile?.listedCount || 0,
      tweetsCount: authorProfile?.tweetsCount || 0,
      isPrivate: authorProfile?.isPrivate || false,
      isVerified: authorProfile?.isVerified || false,
      isBlueVerified: authorProfile?.isBlueVerified || false,
      joinedAt: authorProfile?.joined || null,
      location: authorProfile?.location || '',
      avatarUrl: authorProfile?.avatar || null,
      bannerUrl: authorProfile?.banner || null,
      websiteUrl: authorProfile?.website || null,
      canDm: authorProfile?.canDm || false,
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

    // Update account-topic relationships for author
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

    // Process each unique mention
    for (const mentionedUsername of allMentions) {
      try {
        // Skip if target username is missing
        if (!mentionedUsername) {
          continue;
        }

        // For mentioned user
        const mentionedProfile = await scraper.getProfile(mentionedUsername);
        await tweetQueries.insertTargetAccount({
          username: mentionedUsername,
          userId: mentionedProfile?.userId || '',
          displayName: mentionedProfile?.name || mentionedUsername,
          description: mentionedProfile?.biography || '',
          followersCount: mentionedProfile?.followersCount || 0,
          followingCount: mentionedProfile?.followingCount || 0,
          friendsCount: mentionedProfile?.friendsCount || 0,
          mediaCount: mentionedProfile?.mediaCount || 0,
          statusesCount: mentionedProfile?.tweetsCount || 0,
          likesCount: mentionedProfile?.likesCount || 0,
          listedCount: mentionedProfile?.listedCount || 0,
          tweetsCount: mentionedProfile?.tweetsCount || 0,
          isPrivate: mentionedProfile?.isPrivate || false,
          isVerified: mentionedProfile?.isVerified || false,
          isBlueVerified: mentionedProfile?.isBlueVerified || false,
          joinedAt: mentionedProfile?.joined || null,
          location: mentionedProfile?.location || '',
          avatarUrl: mentionedProfile?.avatar || null,
          bannerUrl: mentionedProfile?.banner || null,
          websiteUrl: mentionedProfile?.website || null,
          canDm: mentionedProfile?.canDm || false,
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

        // Update account-topic relationships for mentioned user
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
