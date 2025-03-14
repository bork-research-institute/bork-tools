import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import { tweetQueries } from '../../../bork-extensions/src/db/queries.js';
import type { TwitterService } from '../../services/twitter.service';
import type { TopicWeightRow } from '../twitter.js';

export interface SpamData {
  spamScore: number;
  tweetCount: number;
  violations: string[];
}

export interface ProcessedTweet extends Tweet {
  created_at: Date;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
  entities: {
    hashtags: string[];
    mentions: Array<{ username: string; id: string }>;
    urls: string[];
  };
}

export function processTweet(tweet: Tweet): ProcessedTweet {
  return {
    ...tweet,
    created_at: new Date(tweet.timestamp * 1000),
    author_id: tweet.userId,
    text: tweet.text || '',
    public_metrics: {
      like_count: tweet.likes || 0,
      retweet_count: tweet.retweets || 0,
      reply_count: tweet.replies || 0,
    },
    entities: {
      hashtags: tweet.hashtags || [],
      mentions: (tweet.mentions || []).map((mention) => ({
        username: mention.username,
        id: mention.id,
      })),
      urls: tweet.urls || [],
    },
  };
}

export async function processAndStoreTweet(
  _runtime: IAgentRuntime,
  twitterService: TwitterService,
  tweet: Tweet,
): Promise<void> {
  try {
    // Store tweet in cache
    await twitterService.cacheTweet(tweet);

    // Store in database
    await tweetQueries.saveTweetObject({
      id: tweet.id,
      content: tweet.text || '',
      status: 'analyzed',
      createdAt: new Date(tweet.timestamp * 1000),
      agentId: _runtime.agentId,
      mediaType: 'text',
      mediaUrl: tweet.permanentUrl,
      homeTimeline: {
        publicMetrics: {
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
        },
        entities: {
          hashtags: tweet.hashtags || [],
          mentions: tweet.mentions || [],
          urls: tweet.urls || [],
        },
        twitterTweetId: tweet.id,
      },
    });

    elizaLogger.info(
      `[Tweet Processing] Successfully processed tweet ${tweet.id}`,
    );
  } catch (error) {
    elizaLogger.error(
      `[Tweet Processing] Error processing tweet ${tweet.id}:`,
      error,
    );
  }
}

export async function updateMarketMetrics(tweets: Tweet[]): Promise<void> {
  try {
    const metrics = {
      totalEngagement: tweets.reduce(
        (sum, tweet) =>
          sum +
          (tweet.likes || 0) +
          (tweet.retweets || 0) +
          (tweet.replies || 0),
        0,
      ),
      tweetCount: tweets.length,
      averageSentiment: 0.5, // Default neutral sentiment
      timestamp: new Date(),
    };

    await tweetQueries.insertMarketMetrics({
      ...metrics,
      [metrics.timestamp.toISOString()]: metrics,
    });

    elizaLogger.info(
      `[Tweet Processing] Updated market metrics for ${tweets.length} tweets`,
      metrics,
    );
  } catch (error) {
    elizaLogger.error(
      '[Tweet Processing] Error updating market metrics:',
      error,
    );
  }
}

export async function getUserSpamData(_authorId: string): Promise<SpamData> {
  // This is a placeholder implementation
  // In a real implementation, you would analyze the user's tweets, behavior, etc.
  return {
    spamScore: Math.random(), // Placeholder random score
    tweetCount: 0,
    violations: [],
  };
}

export async function updateUserSpamData(
  userId: string,
  spamScore: number,
  violations: string[],
  logPrefix = '[Tweet Processing]',
): Promise<void> {
  try {
    await tweetQueries.updateSpamUser(userId, spamScore, violations);
    elizaLogger.info(`${logPrefix} Updated spam data for user ${userId}`);
  } catch (error) {
    elizaLogger.error(
      `${logPrefix} Error updating spam data for user ${userId}:`,
      error,
    );
  }
}

export async function updateTopicWeights(
  currentWeights: TopicWeightRow[],
  relevantTopics: string[],
  impactScore: number,
  logPrefix = '[Tweet Processing]',
): Promise<TopicWeightRow[]> {
  try {
    // Update weights based on relevance and impact
    const updatedWeights = currentWeights.map((weight) => {
      const isRelevant = relevantTopics.includes(weight.topic);
      const newWeight = isRelevant
        ? Math.min(1, weight.weight + 0.1 * impactScore)
        : Math.max(0, weight.weight - 0.05);

      return {
        ...weight,
        weight: newWeight,
        impact_score: isRelevant ? impactScore : weight.impact_score,
        last_updated: new Date(),
      };
    });

    // Store updated weights in database
    await Promise.all(
      updatedWeights.map(({ topic, weight, impact_score, seed_weight }) =>
        tweetQueries.updateTopicWeight(
          topic,
          weight,
          impact_score,
          seed_weight,
        ),
      ),
    );

    return updatedWeights;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error updating topic weights:`, error);
    return currentWeights;
  }
}

export function extractJsonFromText(text: string): string {
  try {
    // First try direct parsing after aggressive trimming
    const trimmedText = text.trim().replace(/^\s+|\s+$/g, '');
    JSON.parse(trimmedText);
    return trimmedText;
  } catch {
    // If direct parsing fails, try to extract JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extractedJson = jsonMatch[0]
        .replace(/^\s+|\s+$/g, '') // Remove all leading/trailing whitespace
        .replace(/\s+/g, ' ') // Normalize internal spaces
        .replace(/\{\s+/, '{') // Remove spaces after opening brace
        .replace(/\s+\}/, '}') // Remove spaces before closing brace
        .replace(/\[\s+/, '[') // Remove spaces after opening bracket
        .replace(/\s+\]/, ']') // Remove spaces before closing bracket
        .replace(/,\s+/, ',') // Remove spaces after commas
        .replace(/:\s+/, ':') // Remove spaces after colons
        .trim();

      try {
        // Validate the extracted JSON
        JSON.parse(extractedJson);
        return extractedJson;
      } catch {
        // If extraction fails, return a default valid JSON
        return JSON.stringify({
          spamAnalysis: {
            spamScore: 0.5,
            reasons: [],
            isSpam: false,
          },
          contentAnalysis: {
            type: 'unknown',
            sentiment: 'neutral',
            confidence: 0.5,
            impactScore: 0.5,
            entities: [],
            topics: [],
            metrics: {},
          },
        });
      }
    }
    // If no JSON found, return default
    return JSON.stringify({
      spamAnalysis: {
        spamScore: 0.5,
        reasons: [],
        isSpam: false,
      },
      contentAnalysis: {
        type: 'unknown',
        sentiment: 'neutral',
        confidence: 0.5,
        impactScore: 0.5,
        entities: [],
        topics: [],
        metrics: {},
      },
    });
  }
}
