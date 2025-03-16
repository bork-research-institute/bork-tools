import { elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import {
  tweetQueries,
  userMentionQueries,
} from '../../../bork-extensions/src/db/queries.js';
import { extractMentionsFromText } from '../../mappers/mentions-mapper.js';

export async function storeMentions(tweet: Tweet): Promise<void> {
  try {
    if (!tweet.username) {
      return;
    }

    // Get mentions from the original tweet text
    const textMentions = extractMentionsFromText(tweet.text || '');

    // Get mentions from thread content (tweets before this one)
    const threadMentions = (tweet.thread || [])
      .filter((t) => t.timestamp <= tweet.timestamp) // Only include tweets before or equal to current tweet
      .flatMap((t) => extractMentionsFromText(t.text || ''));

    // Get mentions from metadata, but only for the original tweet
    const metadataMentions = (tweet.mentions || [])
      .map((m) => m.username)
      .filter(Boolean);

    // Combine all mentions, excluding duplicates
    const allMentions = new Set([
      ...textMentions,
      ...threadMentions,
      ...metadataMentions,
    ]);

    // Create a map of usernames to IDs from metadata (for target account storage)
    const usernameToId = new Map(
      (tweet.mentions || [])
        .filter((m) => m.username && m.id)
        .map((m) => [m.username.toLowerCase(), m.id]),
    );

    elizaLogger.info('[Mentions Processing] Processing mentions:', {
      textMentions,
      threadMentions,
      metadataMentions,
      totalUnique: allMentions.size,
      fromUsername: tweet.username,
      hasIds: Array.from(usernameToId.keys()),
    });

    // Process mentions and add to target accounts
    if (allMentions.size > 0) {
      await Promise.all(
        Array.from(allMentions).map(async (username) => {
          if (!username) {
            return;
          }

          try {
            // Get Twitter ID if available from metadata
            const lowercaseUsername = username.toLowerCase();
            const twitterId = usernameToId.get(lowercaseUsername);

            // Convert tweet timestamp to Date
            const tweetDate = new Date(tweet.timestamp * 1000);

            // Add to target accounts with Twitter ID when available
            await tweetQueries.insertTargetAccount({
              username: username,
              userId: twitterId || username, // Fallback to username if no ID
              displayName: username,
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
              createdAt: tweetDate,
              lastUpdated: new Date(),
              isActive: true,
              source: 'mention',
            });

            // Update mention relationship using usernames only
            await userMentionQueries.upsertMentionRelationship(
              tweet.username,
              username,
              tweet.id,
              tweetDate,
            );

            elizaLogger.debug(
              '[Mentions Processing] Added mention relationship:',
              {
                fromUsername: tweet.username,
                toUsername: username,
                tweetId: tweet.id,
                hasTwitterId: Boolean(twitterId),
              },
            );
          } catch (error) {
            elizaLogger.error(
              '[Mentions Processing] Error processing mention:',
              {
                fromUsername: tweet.username,
                toUsername: username,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          }
        }),
      );

      // Periodically decay old relationships (do this occasionally, not for every tweet)
      if (Math.random() < 0.01) {
        // 1% chance to run decay
        await userMentionQueries.decayRelationships();
      }
    }
  } catch (error) {
    elizaLogger.error('[Mentions Processing] Error processing mentions:', {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.id,
      userId: tweet.userId,
    });
  }
}
