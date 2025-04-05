import type { TwitterProfile } from '@/types/twitter';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import type { Scraper } from 'agent-twitter-client';

interface TwitterCookie {
  key: string;
  value: string;
  domain: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
}

export class TwitterAuthService {
  private readonly twitterClient: Scraper;
  private readonly runtime: IAgentRuntime;
  private profile: TwitterProfile | null = null;

  constructor(twitterClient: Scraper, runtime: IAgentRuntime) {
    this.twitterClient = twitterClient;
    this.runtime = runtime;
  }

  public async initialize(): Promise<boolean> {
    elizaLogger.info('[TwitterAuthService] Initializing authentication');
    const username = this.runtime.getSetting('TWITTER_USERNAME');
    if (!username) {
      elizaLogger.error('[TwitterAuthService] No Twitter username configured');
      return false;
    }

    // Try to load cached cookies first
    const cachedCookies = await this.getCachedCookies(username);
    if (cachedCookies && cachedCookies.length > 0) {
      elizaLogger.info(
        `[TwitterAuthService] Found ${cachedCookies.length} cached cookies for ${username}`,
      );
      await this.setCookiesFromArray(cachedCookies);
      elizaLogger.info('[TwitterAuthService] Successfully set cached cookies');

      // Verify the cookies are still valid by trying to fetch profile
      this.profile = await this.fetchProfile(username);
      if (this.profile) {
        elizaLogger.info(
          '[TwitterAuthService] Successfully verified cached cookies',
        );
        return true;
      }
      elizaLogger.warn(
        '[TwitterAuthService] Cached cookies appear to be invalid, will re-authenticate',
      );
    }

    // If no valid cached cookies, authenticate
    elizaLogger.info(
      '[TwitterAuthService] No valid cached cookies found, will need to authenticate',
    );
    const authenticated = await this.authenticateWithCookies();
    if (!authenticated) {
      elizaLogger.error(
        '[TwitterAuthService] Failed to authenticate with Twitter',
      );
      return false;
    }

    // Verify authentication by trying to fetch profile
    this.profile = await this.fetchProfile(username);
    if (!this.profile) {
      elizaLogger.error('[TwitterAuthService] Failed to fetch Twitter profile');
      return false;
    }
    elizaLogger.info(
      '[TwitterAuthService] Successfully authenticated and fetched profile',
    );
    return true;
  }

  private async authenticateWithCookies(): Promise<boolean> {
    try {
      const username = this.runtime.getSetting('TWITTER_USERNAME');
      if (!username) {
        elizaLogger.error(
          '[TwitterAuthService] No Twitter username configured for authentication',
        );
        return false;
      }

      elizaLogger.info('[TwitterAuthService] Attempting to get fresh cookies');
      const password = this.runtime.getSetting('TWITTER_PASSWORD');
      const email = this.runtime.getSetting('TWITTER_EMAIL');
      if (!password || !email) {
        elizaLogger.error(
          '[TwitterAuthService] No Twitter password or email configured',
        );
        return false;
      }

      // Add a small delay before authentication attempt
      await new Promise((resolve) => setTimeout(resolve, 2000));

      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 3000; // 3 seconds

      while (retryCount < maxRetries) {
        try {
          elizaLogger.info(
            `[TwitterAuthService] Authentication attempt ${retryCount + 1}/${maxRetries}`,
          );

          await this.twitterClient.login(username, password, email);
          elizaLogger.info('[TwitterAuthService] Successfully authenticated');

          // Get the new cookies after successful authentication
          const newCookies = await this.twitterClient.getCookies();
          if (!newCookies || newCookies.length === 0) {
            throw new Error('No cookies received after authentication');
          }

          elizaLogger.info(
            `[TwitterAuthService] Successfully obtained ${newCookies.length} new cookies`,
          );
          await this.cacheCookies(username, newCookies);
          elizaLogger.info(
            '[TwitterAuthService] Successfully cached new cookies',
          );
          return true;
        } catch (error) {
          retryCount++;
          const delay = baseDelay * 2 ** retryCount; // Exponential backoff
          elizaLogger.warn(
            `[TwitterAuthService] Authentication attempt ${retryCount} failed:`,
            error instanceof Error ? error.message : String(error),
            `Retrying in ${delay}ms...`,
          );

          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      elizaLogger.error(
        '[TwitterAuthService] Failed to obtain cookies after maximum retries',
      );
      return false;
    } catch (error) {
      elizaLogger.error(
        '[TwitterAuthService] Error during cookie authentication:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  private async setCookiesFromArray(
    cookiesArray: TwitterCookie[],
  ): Promise<void> {
    elizaLogger.info(
      `[TwitterAuthService] Setting ${cookiesArray.length} cookies`,
    );
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
      '[TwitterAuthService] Successfully set cookies on Twitter client',
    );
  }

  private async getCachedCookies(
    username: string,
  ): Promise<TwitterCookie[] | undefined> {
    return await this.runtime.cacheManager.get<TwitterCookie[]>(
      `twitter/${username}/cookies`,
    );
  }

  private async cacheCookies(
    username: string,
    cookies: TwitterCookie[],
  ): Promise<void> {
    await this.runtime.cacheManager.set(`twitter/${username}/cookies`, cookies);
  }

  private async getCachedProfile(
    username: string,
  ): Promise<TwitterProfile | undefined> {
    return await this.runtime.cacheManager.get<TwitterProfile>(
      `twitter/${username}/profile`,
    );
  }

  private async cacheProfile(profile: TwitterProfile): Promise<void> {
    await this.runtime.cacheManager.set(
      `twitter/${profile.username}/profile`,
      profile,
    );
  }

  private async fetchProfile(
    username: string,
  ): Promise<TwitterProfile | undefined> {
    const cached = await this.getCachedProfile(username);
    if (cached) {
      return cached;
    }

    try {
      const twitterProfile = await this.twitterClient.getProfile(username);
      const profile: TwitterProfile = {
        userId: twitterProfile.userId,
        username: username,
        displayName: twitterProfile.name || this.runtime.character.name,
        description:
          twitterProfile.biography ||
          (typeof this.runtime.character.bio === 'string'
            ? this.runtime.character.bio
            : this.runtime.character.bio?.length > 0
              ? this.runtime.character.bio[0]
              : ''),
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

      await this.cacheProfile(profile);
      return profile;
    } catch (error) {
      elizaLogger.error(
        '[TwitterAuthService] Error fetching Twitter profile:',
        error,
      );
      return undefined;
    }
  }

  public getProfile(): TwitterProfile | null {
    return this.profile;
  }

  public getClient(): Scraper {
    return this.twitterClient;
  }
}
