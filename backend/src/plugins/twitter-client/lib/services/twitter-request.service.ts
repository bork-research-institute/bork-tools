import { elizaLogger } from '@elizaos/core';
import {
  type QueryTweetsResponse,
  type Scraper,
  SearchMode,
  type Tweet,
} from 'agent-twitter-client';

export class TwitterRequestService {
  private readonly twitterClient: Scraper;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(twitterClient: Scraper) {
    this.twitterClient = twitterClient;
  }

  private async enqueueRequest<T>(
    request: () => Promise<T>,
    context: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          elizaLogger.error(`${context} Error executing request:`, error);
          reject(error);
        }
      });

      if (!this.isProcessingQueue) {
        void this.processRequestQueue();
      }
    });
  }

  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
          // Add a delay between requests to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          elizaLogger.error('Error processing request:', error);
        }
      }
    }
    this.isProcessingQueue = false;
  }

  async fetchSearchTweets(
    query: string,
    limit: number,
    mode: SearchMode,
    context: string,
  ): Promise<QueryTweetsResponse> {
    return this.enqueueRequest(async () => {
      elizaLogger.info(`${context} Fetching search tweets for query: ${query}`);
      try {
        const searchResults = await this.twitterClient.fetchSearchTweets(
          query,
          limit,
          mode,
        );

        if (!searchResults.tweets.length) {
          elizaLogger.info(`${context} No tweets found for query: ${query}`);
          return searchResults;
        }

        elizaLogger.info(
          `${context} Found ${searchResults.tweets.length} tweets:`,
          {
            tweets: searchResults.tweets.map((t) => ({
              id: t.id,
              username: t.username,
              text: `${t.text?.slice(0, 50)}...`,
              likes: t.likes,
              retweets: t.retweets,
              replies: t.replies,
              conversationId: t.conversationId,
              threadSize: t.thread?.length || 0,
            })),
          },
        );

        return searchResults;
      } catch (error) {
        elizaLogger.error(`${context} Error fetching search tweets:`, error);
        throw error;
      }
    }, context);
  }

  async getTweet(tweetId: string): Promise<Tweet | null> {
    return this.enqueueRequest(async () => {
      elizaLogger.info(`Fetching tweet: ${tweetId}`);
      try {
        return await this.twitterClient.getTweet(tweetId);
      } catch (error) {
        elizaLogger.error('Error fetching tweet:', error);
        return null;
      }
    }, 'getTweet');
  }

  async getUserTweets(
    username: string,
    limit: number,
  ): Promise<QueryTweetsResponse> {
    return this.enqueueRequest(async () => {
      elizaLogger.info(`Fetching user tweets for: ${username}`);
      try {
        return await this.twitterClient.fetchSearchTweets(
          `from:${username}`,
          limit,
          SearchMode.Latest,
        );
      } catch (error) {
        elizaLogger.error('Error fetching user tweets:', error);
        throw error;
      }
    }, 'getUserTweets');
  }

  async sendTweet(text: string, inReplyToId?: string): Promise<Tweet> {
    return this.enqueueRequest(async () => {
      elizaLogger.info('Sending tweet:', { text, inReplyToId });
      try {
        const response = await this.twitterClient.sendTweet(text, inReplyToId);
        const tweetId = (
          response as unknown as { id: string | number }
        ).id.toString();
        const timestamp = Math.floor(Date.now() / 1000);

        // Create a Tweet object from the response
        const tweet: Tweet = {
          id: tweetId,
          text: text,
          userId: 'unknown', // Will be updated by the TwitterAuthService
          username: 'unknown', // Will be updated by the TwitterAuthService
          name: 'unknown', // Will be updated by the TwitterAuthService
          timestamp: timestamp,
          isReply: !!inReplyToId,
          isRetweet: false,
          inReplyToStatusId: inReplyToId,
          conversationId: tweetId,
          permanentUrl: `https://twitter.com/unknown/status/${tweetId}`, // Will be updated by the TwitterAuthService
          hashtags: [],
          mentions: [],
          photos: [],
          thread: [],
          urls: [],
          videos: [],
        };
        return tweet;
      } catch (error) {
        elizaLogger.error('Error sending tweet:', error);
        throw error;
      }
    }, 'sendTweet');
  }
}
