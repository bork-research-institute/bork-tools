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
import { RequestQueue } from './request-queue';
import type { TwitterProfile } from './types/twitter';

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
    const username = this.runtime.getSetting('TWITTER_USERNAME');
    if (!username) {
      elizaLogger.error('[Twitter Client] No Twitter username configured');
      return;
    }

    // Try to load cached cookies first
    const cachedCookies = await this.getCachedCookies(username);
    if (cachedCookies && cachedCookies.length > 0) {
      elizaLogger.info(
        `[Twitter Client] Found ${cachedCookies.length} cached cookies for ${username}`,
      );
      await this.setCookiesFromArray(cachedCookies);
      elizaLogger.info('[Twitter Client] Successfully set cached cookies');

      // Verify the cookies are still valid by trying to fetch profile
      this.profile = await this.fetchProfile(username);
      if (this.profile) {
        elizaLogger.info(
          '[Twitter Client] Successfully verified cached cookies',
        );
        return;
      }
      elizaLogger.warn(
        '[Twitter Client] Cached cookies appear to be invalid, will re-authenticate',
      );
    }

    // If no valid cached cookies, authenticate
    elizaLogger.info(
      '[Twitter Client] No valid cached cookies found, will need to authenticate',
    );
    const authenticated = await this.authenticateWithCookies();
    if (!authenticated) {
      elizaLogger.error('[Twitter Client] Failed to authenticate with Twitter');
      return;
    }

    // Verify authentication by trying to fetch profile
    this.profile = await this.fetchProfile(username);
    if (!this.profile) {
      elizaLogger.error('[Twitter Client] Failed to fetch Twitter profile');
      return;
    }
    elizaLogger.info(
      '[Twitter Client] Successfully authenticated and fetched profile',
    );
  }

  async authenticateWithCookies(): Promise<boolean> {
    try {
      const username = this.runtime.getSetting('TWITTER_USERNAME');
      if (!username) {
        elizaLogger.error(
          '[Twitter Client] No Twitter username configured for authentication',
        );
        return false;
      }

      elizaLogger.info('[Twitter Client] Attempting to get fresh cookies');

      // If no cookies, try to authenticate
      elizaLogger.info(
        '[Twitter Client] No existing cookies, attempting to authenticate',
      );
      const password = this.runtime.getSetting('TWITTER_PASSWORD');
      if (!password) {
        elizaLogger.error('[Twitter Client] No Twitter password configured');
        return false;
      }

      await this.twitterClient.login(username, password);
      elizaLogger.info('[Twitter Client] Successfully authenticated');

      // Get the new cookies after successful authentication
      const newCookies = await this.twitterClient.getCookies();
      if (newCookies && newCookies.length > 0) {
        elizaLogger.info(
          `[Twitter Client] Successfully obtained ${newCookies.length} new cookies`,
        );
        await this.cacheCookies(username, newCookies);
        elizaLogger.info('[Twitter Client] Successfully cached new cookies');
        return true;
      }

      elizaLogger.error(
        '[Twitter Client] Failed to obtain cookies after authentication',
      );
      return false;
    } catch (error) {
      elizaLogger.error(
        '[Twitter Client] Error during cookie authentication:',
        error,
      );
      return false;
    }
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
      const timeoutPromise = new Promise<QueryTweetsResponse>((resolve) =>
        setTimeout(() => resolve({ tweets: [] }), 30000),
      );

      try {
        const result = await this.requestQueue.add(async () => {
          // First try to get fresh cookies
          const cookies = await this.twitterClient.getCookies();
          if (cookies && cookies.length > 0) {
            await this.setCookiesFromArray(cookies);
          }

          return await Promise.race([
            this.twitterClient.fetchSearchTweets(
              query,
              maxTweets,
              searchMode,
              cursor,
            ),
            timeoutPromise,
          ]);
        });

        if (!result || !('tweets' in result) || result.tweets.length === 0) {
          elizaLogger.warn(
            `[Twitter Client] No tweets found for query: ${query}`,
          );
          return { tweets: [] };
        }

        return result as QueryTweetsResponse;
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
    elizaLogger.info(`[Twitter Client] Setting ${cookiesArray.length} cookies`);
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
          cookie.secure ? 'Secure; ' : ''
        }${cookie.httpOnly ? 'HttpOnly; ' : ''}${
          cookie.sameSite ? `SameSite=${cookie.sameSite}; ` : ''
        }`,
    );
    await this.twitterClient.setCookies(cookieStrings);
    elizaLogger.info(
      '[Twitter Client] Successfully set cookies on Twitter client',
    );
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
