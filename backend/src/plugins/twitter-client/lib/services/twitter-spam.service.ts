import { elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import { getUserSpamData } from '../utils/spam-processing';

export interface SpamData {
  spamScore: number;
  tweetCount: number;
  violations: string[];
}

// TODO Use the runtime cache?
export class TwitterSpamService {
  private readonly spamCache = new Map<string, SpamData>();
  private readonly spamThreshold = 0.7;

  public async filterSpamTweets(
    tweets: Tweet[],
    context: string,
  ): Promise<{
    filteredTweets: Tweet[];
    spammedTweets: number;
    spamUsers: Set<string>;
  }> {
    const uniqueAuthors = [...new Set(tweets.map((t) => t.userId))];
    elizaLogger.info(
      `[TwitterSpamService] Fetching spam data for ${uniqueAuthors.length} unique authors`,
      { context },
    );

    const spamUsers = new Set<string>();
    await Promise.all(
      uniqueAuthors.map(async (authorId) => {
        try {
          const spamData = await this.getSpamData(authorId);
          if (spamData && spamData.spamScore > this.spamThreshold) {
            spamUsers.add(authorId);
            elizaLogger.debug(
              `[TwitterSpamService] Filtered out spam user ${authorId}`,
              {
                context,
                spamScore: spamData.spamScore,
                tweetCount: spamData.tweetCount,
                violations: spamData.violations,
              },
            );
          }
        } catch (error) {
          elizaLogger.error(
            `[TwitterSpamService] Error fetching spam data for user ${authorId}:`,
            error,
          );
        }
      }),
    );

    // Filter out tweets from known spam users
    const filteredTweets = tweets.filter(
      (tweet) => !spamUsers.has(tweet.userId),
    );
    const spammedTweets = tweets.length - filteredTweets.length;

    elizaLogger.info(
      `[TwitterSpamService] Filtered ${spammedTweets} tweets from ${spamUsers.size} spam users`,
      {
        context,
        totalTweets: tweets.length,
        spammedTweets,
        spamUsers: spamUsers.size,
        remainingTweets: filteredTweets.length,
      },
    );

    return {
      filteredTweets,
      spammedTweets,
      spamUsers,
    };
  }

  private async getSpamData(authorId: string): Promise<SpamData | undefined> {
    // Check cache first
    const cached = this.spamCache.get(authorId);
    if (cached) {
      return cached;
    }

    try {
      const spamData = await getUserSpamData(authorId);
      if (spamData) {
        // Cache the result
        this.spamCache.set(authorId, spamData);
        return spamData;
      }
    } catch (error) {
      elizaLogger.error(
        `[TwitterSpamService] Error getting spam data for user ${authorId}:`,
        error,
      );
    }

    return undefined;
  }

  public clearSpamCache(): void {
    this.spamCache.clear();
  }
}
