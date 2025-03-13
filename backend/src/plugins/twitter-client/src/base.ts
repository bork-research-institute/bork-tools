import { EventEmitter } from 'node:events';
import {
  type IAgentRuntime,
  type IImageDescriptionService,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import {
  type QueryTweetsResponse,
  Scraper,
  type SearchMode,
  type Tweet,
} from 'agent-twitter-client';
import type { TwitterProfile } from './lib/types';
import { RequestQueue } from './request-queue';

interface TwitterCookie {
  key: string;
  value: string;
  domain: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
}

export function extractAnswer(text: string): string {
  const startIndex = text.indexOf('Answer: ') + 8;
  const endIndex = text.indexOf('<|endoftext|>', 11);
  return text.slice(startIndex, endIndex);
}

export interface TwitterConfig {
  TWITTER_TARGET_USERS: string[];
}

export class ClientBase extends EventEmitter {
  static _twitterClients: { [accountIdentifier: string]: Scraper } = {};
  twitterClient!: Scraper;
  runtime!: IAgentRuntime;
  directions!: string;
  lastCheckedTweetId: bigint | null = null;
  imageDescriptionService!: IImageDescriptionService;
  temperature = 0.5;
  requestQueue = new RequestQueue();
  profile: TwitterProfile | null = null;
  twitterConfig: TwitterConfig = { TWITTER_TARGET_USERS: [] };

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
    const username = this.runtime.getSetting('TWITTER_USERNAME');
    if (ClientBase._twitterClients[username]) {
      this.twitterClient = ClientBase._twitterClients[username];
    } else {
      this.twitterClient = new Scraper();
      ClientBase._twitterClients[username] = this.twitterClient;
    }

    this.directions = `- ${this.runtime.character.style.all.join('\n- ')}- ${this.runtime.character.style.post.join()}`;
  }

  async init(): Promise<void> {
    elizaLogger.info('[Twitter Client] Twitter client initializing');
  }

  async cacheTweet(tweet: Tweet): Promise<void> {
    if (!tweet) {
      console.warn('Tweet is undefined, skipping cache');
      return;
    }
    await this.runtime.cacheManager.set(`twitter/tweets/${tweet.id}`, tweet);
  }

  async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
    return await this.runtime.cacheManager.get<Tweet>(
      `twitter/tweets/${tweetId}`,
    );
  }

  async getTweet(tweetId: string): Promise<Tweet | undefined> {
    const cachedTweet = await this.getCachedTweet(tweetId);
    if (cachedTweet) {
      return cachedTweet;
    }
    try {
      const tweet = (await this.requestQueue.add(() =>
        this.twitterClient.getTweet(tweetId),
      )) as Tweet;

      if (tweet) {
        await this.cacheTweet(tweet);
      }
      return tweet;
    } catch (error) {
      elizaLogger.error('Error fetching tweet:', error);
      return undefined;
    }
  }

  async getCachedTimeline(): Promise<Tweet[] | undefined> {
    if (!this.profile?.username) {
      return undefined;
    }
    return await this.runtime.cacheManager.get<Tweet[]>(
      `twitter/${this.profile.username}/timeline`,
    );
  }

  async cacheTimeline(timeline: Tweet[]): Promise<void> {
    if (!this.profile?.username) {
      console.warn('No profile username, skipping timeline cache');
      return;
    }
    await this.runtime.cacheManager.set(
      `twitter/${this.profile.username}/timeline`,
      timeline,
    );
  }

  async cacheLatestCheckedTweetId(): Promise<void> {
    if (!this.profile?.username || !this.lastCheckedTweetId) {
      return;
    }
    await this.runtime.cacheManager.set(
      `twitter/${this.profile.username}/lastCheckedTweetId`,
      this.lastCheckedTweetId.toString(),
    );
  }

  async saveRequestMessage(message: Memory, state: State): Promise<void> {
    await this.runtime.messageManager.createMemory({
      ...message,
      content: { ...message.content, state },
    });
  }

  async stop(): Promise<void> {
    try {
      if (this.twitterClient) {
        // Clean up the client instance
        const username = this.runtime.getSetting('TWITTER_USERNAME');
        if (username) {
          delete ClientBase._twitterClients[username];
        }
        // Clear any pending requests
        this.requestQueue = new RequestQueue();
      }
    } catch (error) {
      elizaLogger.error('Error cleaning up Twitter client:', error);
    }
  }

  async fetchHomeTimeline(count: number): Promise<Tweet[]> {
    elizaLogger.debug('fetching home timeline');
    if (!this.profile?.id) {
      return [];
    }
    const homeTimeline = await this.twitterClient.getUserTweets(
      this.profile.id,
      count,
    );
    return homeTimeline.tweets;
  }

  async fetchSearchTweets(
    query: string,
    maxTweets: number,
    searchMode: SearchMode,
    cursor?: string,
  ): Promise<QueryTweetsResponse> {
    try {
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ tweets: [] }), 10000),
      );

      try {
        const result = await this.requestQueue.add(
          async () =>
            await Promise.race([
              this.twitterClient.fetchSearchTweets(
                query,
                maxTweets,
                searchMode,
                cursor,
              ),
              timeoutPromise,
            ]),
        );
        return (result ?? { tweets: [] }) as QueryTweetsResponse;
      } catch (error) {
        elizaLogger.error('Error fetching search tweets:', error);
        return { tweets: [] };
      }
    } catch (error) {
      elizaLogger.error('Error fetching search tweets:', error);
      return { tweets: [] };
    }
  }

  async setCookiesFromArray(cookiesArray: TwitterCookie[]): Promise<void> {
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
          cookie.secure ? 'Secure; ' : ''
        }${cookie.httpOnly ? 'HttpOnly; ' : ''}${
          cookie.sameSite ? `SameSite=${cookie.sameSite}; ` : ''
        }`,
    );
    await this.twitterClient.setCookies(cookieStrings);
  }

  async cacheMentions(mentions: Tweet[]): Promise<void> {
    if (!this.profile?.username) {
      return;
    }
    await this.runtime.cacheManager.set(
      `twitter/${this.profile.username}/mentions`,
      mentions,
      { expires: Date.now() + 10 * 1000 },
    );
  }

  async getCachedCookies(
    username: string,
  ): Promise<TwitterCookie[] | undefined> {
    return await this.runtime.cacheManager.get<TwitterCookie[]>(
      `twitter/${username}/cookies`,
    );
  }

  async cacheCookies(
    username: string,
    cookies: TwitterCookie[],
  ): Promise<void> {
    await this.runtime.cacheManager.set(`twitter/${username}/cookies`, cookies);
  }

  async getCachedProfile(
    username: string,
  ): Promise<TwitterProfile | undefined> {
    return await this.runtime.cacheManager.get<TwitterProfile>(
      `twitter/${username}/profile`,
    );
  }

  async cacheProfile(profile: TwitterProfile): Promise<void> {
    await this.runtime.cacheManager.set(
      `twitter/${profile.username}/profile`,
      profile,
    );
  }

  async fetchProfile(username: string): Promise<TwitterProfile | undefined> {
    const cached = await this.getCachedProfile(username);
    if (cached) {
      return cached;
    }

    try {
      const profile = await this.requestQueue.add(async () => {
        const twitterProfile = await this.twitterClient.getProfile(username);
        return {
          id: twitterProfile.userId,
          username,
          screenName: twitterProfile.name || this.runtime.character.name,
          bio:
            twitterProfile.biography ||
            (typeof this.runtime.character.bio === 'string'
              ? this.runtime.character.bio
              : this.runtime.character.bio?.length > 0
                ? this.runtime.character.bio[0]
                : ''),
          nicknames: this.runtime.character.twitterProfile?.nicknames || [],
        } satisfies TwitterProfile;
      });

      await this.cacheProfile(profile);
      return profile;
    } catch (error) {
      elizaLogger.error('Error fetching Twitter profile:', error);
      return undefined;
    }
  }
}
