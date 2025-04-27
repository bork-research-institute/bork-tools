import type {
  TwitterEngagementThresholds,
  TwitterProfile,
  TwitterSearchParams,
} from '@/types/twitter';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { type Scraper, SearchMode, type Tweet } from 'agent-twitter-client';
import { TwitterAuthService } from './twitter-auth.service';
import { TwitterCacheService } from './twitter-cache.service';
import { TwitterRequestService } from './twitter-request.service';
import { TwitterSpamService } from './twitter-spam.service';

export class TwitterService {
  private readonly authService: TwitterAuthService;
  private readonly cacheService: TwitterCacheService;
  private readonly spamService: TwitterSpamService;
  private requestService: TwitterRequestService;
  private targetUsers: string[] = [];

  constructor(twitterClient: Scraper, runtime: IAgentRuntime) {
    this.authService = new TwitterAuthService(twitterClient, runtime);
    this.cacheService = new TwitterCacheService(runtime);
    this.spamService = new TwitterSpamService();
    // Initialize requestService with unauthenticated client, will update after auth
    this.requestService = new TwitterRequestService(twitterClient);
  }

  public async initialize(): Promise<boolean> {
    elizaLogger.info('[TwitterService] Initializing Twitter service');
    const authenticated = await this.authService.initialize();
    if (!authenticated) {
      elizaLogger.error(
        '[TwitterService] Failed to initialize Twitter service',
      );
      return false;
    }

    // Update requestService to use the authenticated client
    this.requestService = new TwitterRequestService(
      this.authService.getClient(),
    );
    return true;
  }

  public getProfile(): TwitterProfile | null {
    return this.authService.getProfile();
  }

  public async getUserProfile(
    username: string,
  ): Promise<TwitterProfile | undefined> {
    try {
      const twitterProfile = await this.authService
        .getClient()
        .getProfile(username);
      if (!twitterProfile) {
        return undefined;
      }

      const profile: TwitterProfile = {
        userId: twitterProfile.userId,
        username: username,
        displayName: twitterProfile.name || '',
        description: twitterProfile.biography || '',
        followersCount: twitterProfile.followersCount || 0,
        followingCount: twitterProfile.followingCount || 0,
        friendsCount: twitterProfile.friendsCount || 0,
        mediaCount: twitterProfile.mediaCount || 0,
        statusesCount: twitterProfile.statusesCount || 0,
        likesCount: twitterProfile.likesCount || 0,
        listedCount: twitterProfile.listedCount || 0,
        tweetsCount: twitterProfile.tweetsCount || 0,
        isPrivate: twitterProfile.isPrivate || false,
        isVerified: twitterProfile.isVerified || false,
        isBlueVerified: twitterProfile.isBlueVerified || false,
        joinedAt: twitterProfile.joined
          ? new Date(twitterProfile.joined)
          : null,
        location: twitterProfile.location || '',
        avatarUrl: twitterProfile.avatar || null,
        bannerUrl: twitterProfile.banner || null,
        websiteUrl: twitterProfile.website || null,
        canDm: twitterProfile.canDm || false,
      };

      return profile;
    } catch (error) {
      elizaLogger.error('[TwitterService] Error fetching Twitter profile:', {
        error: error instanceof Error ? error.message : String(error),
        username,
      });
      return undefined;
    }
  }

  public async searchTweets(
    query: string,
    maxTweets: number,
    searchMode: SearchMode = SearchMode.Latest,
    context = '[TwitterService]',
    searchParams?: TwitterSearchParams,
    engagementThresholds?: TwitterEngagementThresholds,
  ): Promise<{
    tweets: Tweet[];
    spammedTweets: number;
    spamUsers: Set<string>;
  }> {
    elizaLogger.debug({
      maxTweets,
      searchMode,
      searchParams,
      engagementThresholds,
    });

    const searchResults = await this.requestService.fetchSearchTweets(
      query,
      maxTweets,
      searchMode,
      context,
    );

    if (!searchResults.tweets.length) {
      elizaLogger.warn(`${context} No tweets found for query`, {
        context,
        query,
      });
      return { tweets: [], spammedTweets: 0, spamUsers: new Set() };
    }

    // Apply search parameters
    let filteredTweets = searchResults.tweets;
    if (searchParams) {
      filteredTweets = searchResults.tweets.filter((tweet) => {
        if (searchParams.excludeReplies && tweet.inReplyToStatusId) {
          return false;
        }
        if (searchParams.excludeRetweets && tweet.isRetweet) {
          return false;
        }
        return true;
      });
    }

    // Apply engagement thresholds if provided
    if (engagementThresholds) {
      const {
        minLikes = 0,
        minRetweets = 0,
        minReplies = 0,
      } = engagementThresholds;

      filteredTweets = filteredTweets.filter((tweet) => {
        const meetsLikesThreshold = tweet.likes >= minLikes;
        const meetsRetweetsThreshold = tweet.retweets >= minRetweets;
        const meetsRepliesThreshold = tweet.replies >= minReplies;

        return (
          meetsLikesThreshold && meetsRetweetsThreshold && meetsRepliesThreshold
        );
      });

      elizaLogger.info(
        `${context} Filtered out ${maxTweets - filteredTweets.length} tweets based on engagement thresholds`,
      );
    }

    // Filter spam tweets
    const {
      filteredTweets: nonSpamTweets,
      spammedTweets,
      spamUsers,
    } = await this.spamService.filterSpamTweets(filteredTweets, context);

    // Cache filtered tweets
    await Promise.all(
      nonSpamTweets.map((tweet) => this.cacheService.cacheTweet(tweet)),
    );

    return {
      tweets: nonSpamTweets,
      spammedTweets,
      spamUsers,
    };
  }

  public async getTweet(tweetId: string): Promise<Tweet | undefined> {
    // Try cache first
    const cachedTweet = await this.cacheService.getCachedTweet(tweetId);
    if (cachedTweet) {
      return cachedTweet;
    }

    // Fetch from Twitter if not cached
    const tweet = await this.requestService.getTweet(tweetId);
    if (!tweet) {
      return undefined;
    }

    // Cache the tweet
    await this.cacheService.cacheTweet(tweet);
    return tweet;
  }

  public async getUserTimeline(
    username: string,
    count: number,
  ): Promise<{
    tweets: Tweet[];
    spammedTweets: number;
  }> {
    // Try cache first
    const cachedTimeline = await this.cacheService.getCachedTimeline(username);
    if (cachedTimeline) {
      return { tweets: cachedTimeline, spammedTweets: 0 };
    }

    // Get user profile to get userId
    const profile = await this.authService.getClient().getProfile(username);
    if (!profile?.userId) {
      elizaLogger.error(
        `[TwitterService] Could not find user profile for ${username}`,
      );
      return { tweets: [], spammedTweets: 0 };
    }

    // Fetch timeline
    const response = await this.requestService.getUserTweets(
      profile.userId,
      count,
    );

    if (!response.tweets.length) {
      return { tweets: [], spammedTweets: 0 };
    }

    // Filter spam tweets
    const { filteredTweets, spammedTweets } =
      await this.spamService.filterSpamTweets(
        response.tweets,
        '[TwitterService]',
      );

    // Cache filtered timeline
    await this.cacheService.cacheTimeline(username, filteredTweets);

    return {
      tweets: filteredTweets,
      spammedTweets,
    };
  }

  public async updateLatestCheckedTweetId(
    username: string,
    tweetId: bigint,
  ): Promise<void> {
    await this.cacheService.cacheLatestCheckedTweetId(username, tweetId);
  }

  public async getLatestCheckedTweetId(
    username: string,
  ): Promise<bigint | null> {
    return await this.cacheService.getLatestCheckedTweetId(username);
  }

  public async cacheMentions(
    username: string,
    mentions: Tweet[],
  ): Promise<void> {
    await this.cacheService.cacheMentions(username, mentions);
  }

  public async getCachedMentions(
    username: string,
  ): Promise<Tweet[] | undefined> {
    return await this.cacheService.getCachedMentions(username);
  }

  public async cacheResponseInfo(
    tweetId: string,
    context: string,
    tweet: Tweet,
    response: string,
  ): Promise<void> {
    const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweetId} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response}`;
    await this.cacheService.cacheResponseInfo(
      tweetId,
      responseInfo,
      tweet,
      response,
    );
  }

  public clearSpamCache(): void {
    this.spamService.clearSpamCache();
  }

  public async cacheTweet(tweet: Tweet): Promise<void> {
    await this.cacheService.cacheTweet(tweet);
  }

  setTargetUsers(users: string[]): void {
    this.targetUsers = users;
  }

  getTargetUsers(): string[] {
    return this.targetUsers;
  }

  async sendTweet(text: string, inReplyToId?: string): Promise<Tweet> {
    return this.requestService.sendTweet(text, inReplyToId);
  }
}
