import type {
  TweetResponse,
  TwitterApiResponse,
  TwitterResponse,
} from '@/types/twitter';
import { elizaLogger } from '@elizaos/core';
import {
  type QueryTweetsResponse,
  type Scraper,
  SearchMode,
  type Tweet,
} from 'agent-twitter-client';

// FIXME This doesn't work with the current flow because most of the time the requests are done
// the caller is expecting a result
export class TwitterRequestService {
  private readonly twitterClient: Scraper;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private processingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(twitterClient: Scraper) {
    this.twitterClient = twitterClient;
    // TODO Probably need to optimize this to be more efficient
    this.processingInterval = setInterval(() => {
      this.processRequestQueue();
    }, 10000);
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
          elizaLogger.error(
            '[TwitterRequestService] Error processing request:',
            error,
          );
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

        elizaLogger.debug('tweets:', {
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
        });

        return searchResults;
      } catch (error) {
        elizaLogger.error(`${context} Error fetching search tweets:`, error);
        throw error;
      }
    }, context);
  }

  async getTweet(tweetId: string): Promise<Tweet | null> {
    return this.enqueueRequest(async () => {
      elizaLogger.info(`[TwitterRequestService] Fetching tweet: ${tweetId}`);
      try {
        return await this.twitterClient.getTweet(tweetId);
      } catch (error) {
        elizaLogger.error(
          '[TwitterRequestService] Error fetching tweet:',
          error,
        );
        return null;
      }
    }, 'getTweet');
  }

  async getUserTweets(
    username: string,
    limit: number,
  ): Promise<QueryTweetsResponse> {
    return this.enqueueRequest(async () => {
      elizaLogger.info(
        `[TwitterRequestService] Fetching user tweets for: ${username}`,
      );
      try {
        return await this.twitterClient.fetchSearchTweets(
          `from:${username}`,
          limit,
          SearchMode.Latest,
        );
      } catch (error) {
        elizaLogger.error(
          '[TwitterRequestService] Error fetching user tweets:',
          error,
        );
        throw error;
      }
    }, 'getUserTweets');
  }

  private async waitWithBackoff(attempt: number): Promise<void> {
    // Start with 2 seconds, double each time, max 1 minute
    const delay = Math.min(2000 * 2 ** attempt, 60000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async sendTweet(text: string, inReplyToId?: string): Promise<Tweet> {
    return this.enqueueRequest(async () => {
      elizaLogger.info('[TwitterRequestService] Sending tweet:', {
        text,
        inReplyToId,
      });
      try {
        let response: TwitterResponse = await this.twitterClient.sendTweet(
          text,
          inReplyToId,
        );

        // Add detailed logging of the response
        elizaLogger.debug('[TwitterRequestService] Tweet response details:', {
          responseType: typeof response,
          isNull: response === null,
          isUndefined: response === undefined,
          constructor: response?.constructor?.name,
        });

        // Handle Response object
        if (response instanceof Response) {
          const responseData = (await response.json()) as TwitterApiResponse;
          elizaLogger.debug('[TwitterRequestService] Response data:', {
            responseData,
          });

          // Extract tweet ID from response data
          const tweetId =
            responseData.data?.create_tweet?.tweet_results?.result?.rest_id ||
            responseData.data?.create_tweet?.tweet_results?.result?.legacy
              ?.id_str;

          if (tweetId) {
            response = tweetId;
          } else {
            elizaLogger.error(
              '[TwitterRequestService] Failed to extract tweet ID from response:',
              responseData,
            );
            throw new Error('Could not find tweet ID in response');
          }
        }

        // Try up to 5 times with exponential backoff
        for (let attempt = 0; attempt < 5 && !response; attempt++) {
          elizaLogger.info(
            `[TwitterRequestService] Attempt ${attempt + 1} to get tweet response...`,
          );
          await this.waitWithBackoff(attempt);
          let retryResponse: TwitterResponse =
            await this.twitterClient.sendTweet(text, inReplyToId);

          // Handle Response object in retries
          if (retryResponse instanceof Response) {
            const responseData =
              (await retryResponse.json()) as TwitterApiResponse;
            elizaLogger.debug(
              `[TwitterRequestService] Retry ${attempt + 1} response data:`,
              responseData,
            );

            const tweetId =
              responseData.data?.create_tweet?.tweet_results?.result?.rest_id ||
              responseData.data?.create_tweet?.tweet_results?.result?.legacy
                ?.id_str;

            if (tweetId) {
              retryResponse = tweetId;
            } else {
              elizaLogger.error(
                '[TwitterRequestService] Failed to extract tweet ID from retry response:',
                responseData,
              );
              throw new Error('Could not find tweet ID in retry response');
            }
          }
          response = retryResponse;
        }

        if (!response) {
          throw new Error(
            'No response received from Twitter client after multiple attempts',
          );
        }

        // Create a basic tweet object since we can't fetch it right away
        const timestamp = Math.floor(Date.now() / 1000);

        // Handle different response types
        let tweetId: string;
        if (typeof response === 'string') {
          tweetId = response;
        } else if (typeof response === 'number') {
          tweetId = response.toString();
        } else if (typeof response === 'object' && response !== null) {
          const resp = response as TweetResponse;
          // Check for nested data structure
          const possibleId =
            resp.rest_id ||
            resp.legacy?.id_str ||
            resp.tweet_id?.toString() ||
            resp.data?.id?.toString();

          if (!possibleId) {
            throw new Error(
              `Could not find ID in response object: ${JSON.stringify(response)}`,
            );
          }
          tweetId = possibleId;
        } else {
          throw new Error(`Unexpected response type: ${typeof response}`);
        }

        if (!tweetId) {
          elizaLogger.error(
            '[TwitterRequestService] Failed to extract tweet ID from response:',
            {
              response,
              responseType: typeof response,
              stringified: JSON.stringify(response, null, 2),
            },
          );
          throw new Error('Could not extract tweet ID from response');
        }

        const tweet: Tweet = {
          id: tweetId,
          text: text,
          userId: 'pending',
          username: 'pending',
          name: 'pending',
          timestamp: timestamp,
          isReply: !!inReplyToId,
          isRetweet: false,
          inReplyToStatusId: inReplyToId,
          conversationId: tweetId,
          permanentUrl: 'pending',
          hashtags: [],
          mentions: [],
          photos: [],
          videos: [],
          thread: [],
          urls: [],
        };

        return tweet;
      } catch (error) {
        elizaLogger.error('[TwitterRequestService] Error sending tweet:', {
          error,
          errorType: error?.constructor?.name,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }, 'sendTweet');
  }
}
