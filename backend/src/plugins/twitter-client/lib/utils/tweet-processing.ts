import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  stringToUuid,
} from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import { tweetQueries } from '../../../bork-extensions/src/db/queries.js';
import type { TwitterService } from '../../services/twitter.service';
import { tweetAnalysisTemplate } from '../../templates/analysis';
import type { TopicWeightRow } from '../../types/topic.js';
import type { SpamUser } from '../../types/twitter.js';

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

export async function processAndStoreTweet(
  runtime: IAgentRuntime,
  twitterService: TwitterService,
  tweet: Tweet,
  topicWeights: TopicWeightRow[],
): Promise<void> {
  try {
    // Store tweet in cache
    await twitterService.cacheTweet(tweet);

    elizaLogger.info(
      `[Tweet Processing] Starting analysis for tweet ${tweet.id} from @${tweet.userId}`,
      {
        text:
          tweet.text?.substring(0, 100) +
          (tweet.text?.length > 100 ? '...' : ''),
        metrics: {
          likes: tweet.likes,
          retweets: tweet.retweets,
          replies: tweet.replies,
        },
      },
    );

    // Perform comprehensive analysis
    const template = tweetAnalysisTemplate({
      text: tweet.text || '',
      public_metrics: {
        like_count: tweet.likes || 0,
        retweet_count: tweet.retweets || 0,
        reply_count: tweet.replies || 0,
      },
      topics: runtime.character.topics || [],
      topicWeights: topicWeights.map((tw) => ({
        topic: tw.topic,
        weight: tw.weight,
      })),
    });

    const context = composeContext({
      state: await runtime.composeState(
        {
          content: { text: tweet.text },
          userId: stringToUuid(tweet.userId),
          agentId: runtime.agentId,
          roomId: stringToUuid(`${tweet.id}-${runtime.agentId}`),
        } as Memory,
        {
          twitterService,
          twitterUserName: runtime.getSetting('TWITTER_USERNAME'),
          currentPost: tweet.text,
        },
      ),
      template: template.context,
    });

    elizaLogger.debug('[Tweet Processing] Generated context:', {
      contextLength: context.length,
      hasTemplate: Boolean(template.context),
      modelClass: template.modelClass,
    });

    const analysis = await generateMessageResponse({
      runtime,
      context,
      modelClass: ModelClass.LARGE,
    });

    if (!analysis || !analysis.text) {
      throw new Error('Invalid analysis response structure');
    }

    const parsedAnalysis = JSON.parse(analysis.text);

    // Validate required fields
    if (!parsedAnalysis.spamAnalysis || !parsedAnalysis.contentAnalysis) {
      throw new Error('Invalid analysis format - missing required fields');
    }

    // Store tweet in database with analysis
    await tweetQueries.saveTweetObject({
      id: tweet.id,
      content: tweet.text || '',
      status: parsedAnalysis.spamAnalysis.isSpam ? 'spam' : 'analyzed',
      createdAt: new Date(tweet.timestamp * 1000),
      agentId: runtime.agentId,
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

    // Store analysis in database
    await tweetQueries.insertTweetAnalysis(
      tweet.id,
      parsedAnalysis.contentAnalysis.type,
      parsedAnalysis.contentAnalysis.sentiment,
      parsedAnalysis.contentAnalysis.confidence,
      {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
        spamScore: parsedAnalysis.spamAnalysis.spamScore,
        spamViolations: parsedAnalysis.spamAnalysis.reasons,
        ...parsedAnalysis.contentAnalysis.metrics,
      },
      parsedAnalysis.contentAnalysis.entities,
      parsedAnalysis.contentAnalysis.topics,
      parsedAnalysis.contentAnalysis.impactScore,
      new Date(tweet.timestamp * 1000),
      tweet.userId,
      tweet.text || '',
      {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
      },
      {
        hashtags: tweet.hashtags || [],
        mentions: tweet.mentions || [],
        urls: tweet.urls || [],
        topicWeights: topicWeights.map((tw) => ({
          topic: tw.topic,
          weight: tw.weight,
        })),
      },
    );

    // Update topic weights if not spam
    if (!parsedAnalysis.spamAnalysis.isSpam && topicWeights.length > 0) {
      await updateTopicWeights(
        topicWeights,
        parsedAnalysis.contentAnalysis.topics || [],
        parsedAnalysis.contentAnalysis.impactScore || 0.5,
        '[Tweet Processing]',
      );
    }

    elizaLogger.info(
      `[Tweet Processing] Successfully processed tweet ${tweet.id}`,
    );
  } catch (error) {
    elizaLogger.error('[Tweet Processing] Error processing tweet:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tweetId: tweet.id,
      userId: tweet.userId,
      text:
        tweet.text?.substring(0, 100) + (tweet.text?.length > 100 ? '...' : ''),
    });
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

export async function getUserSpamData(
  userId: string,
  context: string,
): Promise<SpamUser> {
  try {
    const spamUser = await tweetQueries.getSpamUser(userId);
    if (!spamUser) {
      return null;
    }

    return {
      userId: spamUser.user_id,
      spamScore: spamUser.spam_score,
      lastTweetDate: new Date(spamUser.last_tweet_date),
      tweetCount: spamUser.tweet_count,
      violations: spamUser.violations,
    };
  } catch (error) {
    elizaLogger.error(
      `${context} Error getting spam data for user ${userId}:`,
      error,
    );
    return null;
  }
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
