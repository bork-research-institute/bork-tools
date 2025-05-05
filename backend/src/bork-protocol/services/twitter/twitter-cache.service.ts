import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';

/**
 * Creates a clean copy of a tweet suitable for caching by removing properties that could create circular references
 */
function cleanTweetForCache(tweet: Tweet): Tweet {
  return {
    ...tweet,
    inReplyToStatus: null,
    quotedStatus: null,
    retweetedStatus: null,
    thread: [],
  };
}

export class TwitterCacheService {
  private readonly runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  public async cacheTweet(tweet: Tweet): Promise<void> {
    if (!tweet) {
      elizaLogger.warn(
        '[TwitterCacheService] Tweet is undefined, skipping cache',
      );
      return;
    }
    // Clean the tweet before caching to prevent circular references
    const cleanTweet = cleanTweetForCache(tweet);
    await this.runtime.cacheManager.set(
      `twitter/tweets/${tweet.id}`,
      cleanTweet,
    );
  }

  public async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
    return await this.runtime.cacheManager.get<Tweet>(
      `twitter/tweets/${tweetId}`,
    );
  }

  public async getCachedTimeline(
    username: string,
  ): Promise<Tweet[] | undefined> {
    if (!username) {
      return undefined;
    }
    return await this.runtime.cacheManager.get<Tweet[]>(
      `twitter/${username}/timeline`,
    );
  }

  public async cacheTimeline(
    username: string,
    timeline: Tweet[],
  ): Promise<void> {
    if (!username) {
      elizaLogger.warn(
        '[TwitterCacheService] No username provided, skipping timeline cache',
      );
      return;
    }
    // Clean each tweet in the timeline before caching
    const cleanTimeline = timeline.map(cleanTweetForCache);
    await this.runtime.cacheManager.set(
      `twitter/${username}/timeline`,
      cleanTimeline,
    );
  }

  public async cacheLatestCheckedTweetId(
    username: string,
    tweetId: bigint,
  ): Promise<void> {
    if (!username || !tweetId) {
      return;
    }
    await this.runtime.cacheManager.set(
      `twitter/${username}/lastCheckedTweetId`,
      tweetId.toString(),
    );
  }

  public async getLatestCheckedTweetId(
    username: string,
  ): Promise<bigint | null> {
    if (!username) {
      return null;
    }
    const lastId = await this.runtime.cacheManager.get<string>(
      `twitter/${username}/lastCheckedTweetId`,
    );
    return lastId ? BigInt(lastId) : null;
  }

  public async cacheMentions(
    username: string,
    mentions: Tweet[],
  ): Promise<void> {
    if (!username) {
      return;
    }
    // Clean each mention tweet before caching
    const cleanMentions = mentions.map(cleanTweetForCache);
    await this.runtime.cacheManager.set(
      `twitter/${username}/mentions`,
      cleanMentions,
      { expires: Date.now() + 10 * 1000 }, // 10 seconds expiry
    );
  }

  public async getCachedMentions(
    username: string,
  ): Promise<Tweet[] | undefined> {
    if (!username) {
      return undefined;
    }
    return await this.runtime.cacheManager.get<Tweet[]>(
      `twitter/${username}/mentions`,
    );
  }

  public async cacheResponseInfo(
    tweetId: string,
    context: string,
    tweet: Tweet,
    response: string,
  ): Promise<void> {
    // Clean the tweet before including in response info
    const cleanTweet = cleanTweetForCache(tweet);
    const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${cleanTweet.id} - ${cleanTweet.username}: ${cleanTweet.text}\nAgent's Output:\n${response}`;
    await this.runtime.cacheManager.set(
      `twitter/tweet_generation_${tweetId}.txt`,
      responseInfo,
    );
  }
}
