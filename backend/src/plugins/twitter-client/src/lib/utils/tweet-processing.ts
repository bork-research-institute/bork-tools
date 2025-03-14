import {
  composeContext,
  elizaLogger,
  generateMessageResponse,
  stringToUuid,
} from '@elizaos/core';
import { ModelClass } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { tweetQueries } from '../../../../bork-extensions/src/db/queries.js';
import type { ClientBase } from '../../base.js';
import { tweetAnalysisTemplate } from '../../templates/analysis.js';
import { convertToTopicWeight } from '../twitter.js';
import type {
  MarketMetrics,
  SpamUser,
  TopicWeightRow,
  Tweet,
  TweetAnalysis,
} from '../twitter.js';

export async function processAndStoreTweet(
  client: ClientBase,
  tweet: Tweet,
  topicWeights: TopicWeightRow[],
  logPrefix = '[Tweet Processing]',
): Promise<void> {
  let analysis: { text: string } | TweetAnalysis | undefined;
  try {
    elizaLogger.info(
      `${logPrefix} Starting analysis for tweet ${tweet.id} from @${tweet.author_id}`,
      {
        text:
          tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
        metrics: tweet.public_metrics,
      },
    );

    // Perform comprehensive analysis with retry logic
    elizaLogger.debug(`${logPrefix} Starting comprehensive analysis`);
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    while (retryCount < maxRetries) {
      try {
        const template = tweetAnalysisTemplate({
          text: tweet.text,
          public_metrics: {
            like_count: tweet.public_metrics?.like_count || 0,
            retweet_count: tweet.public_metrics?.retweet_count || 0,
            reply_count: tweet.public_metrics?.reply_count || 0,
          },
          topics: client.runtime.character.topics,
          topicWeights: topicWeights.map(convertToTopicWeight),
        });

        const tweetId = uuidv4();

        // Save tweet directly to tweets table
        await tweetQueries.saveTweetObject({
          id: tweetId,
          content: tweet.text,
          status: 'analyzed',
          createdAt: tweet.created_at,
          agentId: client.runtime.agentId,
          mediaType: 'text',
          mediaUrl: tweet.permanentUrl,
          homeTimeline: {
            publicMetrics: tweet.public_metrics || {},
            entities: tweet.entities || {},
            twitterTweetId: tweet.id,
          },
        });

        const message = {
          content: { text: tweet.text },
          agentId: client.runtime.agentId,
          userId: stringToUuid(
            tweet.author_id,
          ) as `${string}-${string}-${string}-${string}-${string}`,
          roomId: stringToUuid(
            `${tweet.id}-${client.runtime.agentId}`,
          ) as `${string}-${string}-${string}-${string}-${string}`,
        };

        const context = composeContext({
          state: await client.runtime.composeState(message, {
            twitterClient: client.twitterClient,
            twitterUserName: client.runtime.getSetting('TWITTER_USERNAME'),
            currentPost: tweet.text,
            formattedConversation: tweet.text,
            timeline: tweet.text,
          }),
          template: template.context,
        });

        elizaLogger.debug(`${logPrefix} Generated context:`, {
          contextLength: context.length,
          hasTemplate: Boolean(template.context),
          modelClass: template.modelClass,
        });

        analysis = await generateMessageResponse({
          runtime: client.runtime,
          context,
          modelClass: ModelClass.LARGE,
        });

        // Validate and process the analysis response
        if (!analysis || typeof analysis !== 'object') {
          throw new Error('Invalid analysis response structure');
        }

        let parsedAnalysis: TweetAnalysis;
        if ('spamAnalysis' in analysis && 'contentAnalysis' in analysis) {
          parsedAnalysis = analysis as TweetAnalysis;
        } else if ('text' in analysis) {
          const textAnalysis = analysis as { text: string };
          const cleanedText = extractJsonFromText(textAnalysis.text);
          parsedAnalysis = JSON.parse(cleanedText) as TweetAnalysis;
        } else {
          throw new Error('Invalid analysis response format');
        }

        // Validate required fields
        if (!parsedAnalysis.spamAnalysis || !parsedAnalysis.contentAnalysis) {
          throw new Error('Invalid analysis format - missing required fields');
        }

        // Update spam user data
        await updateUserSpamData(
          tweet.author_id,
          parsedAnalysis.spamAnalysis.spamScore,
          parsedAnalysis.spamAnalysis.reasons,
          logPrefix,
        );

        // Update topic weights if not spam
        if (!parsedAnalysis.spamAnalysis.isSpam) {
          await updateTopicWeights(
            topicWeights,
            parsedAnalysis.contentAnalysis.topics || [],
            parsedAnalysis.contentAnalysis.impactScore || 0.5,
            logPrefix,
          );
        }

        // Store analysis in database
        await tweetQueries.insertTweetAnalysis(
          tweetId,
          parsedAnalysis.spamAnalysis.isSpam
            ? 'engagement'
            : parsedAnalysis.contentAnalysis.type,
          parsedAnalysis.spamAnalysis.isSpam
            ? 'neutral'
            : parsedAnalysis.contentAnalysis.sentiment,
          parsedAnalysis.spamAnalysis.isSpam
            ? 0.1
            : parsedAnalysis.contentAnalysis.confidence,
          {
            likes: tweet.public_metrics?.like_count || 0,
            retweets: tweet.public_metrics?.retweet_count || 0,
            replies: tweet.public_metrics?.reply_count || 0,
            spamScore: parsedAnalysis.spamAnalysis.spamScore,
            spamViolations: parsedAnalysis.spamAnalysis.reasons,
            ...(parsedAnalysis.spamAnalysis.isSpam
              ? {}
              : parsedAnalysis.contentAnalysis.metrics),
          },
          parsedAnalysis.spamAnalysis.isSpam
            ? []
            : parsedAnalysis.contentAnalysis.entities,
          parsedAnalysis.spamAnalysis.isSpam
            ? []
            : parsedAnalysis.contentAnalysis.topics,
          parsedAnalysis.spamAnalysis.isSpam
            ? 0.1
            : parsedAnalysis.contentAnalysis.impactScore,
          tweet.created_at,
          tweet.author_id,
          tweet.text,
          tweet.public_metrics || {},
          {
            ...tweet.entities,
            topicWeights: topicWeights.map(convertToTopicWeight),
          },
        );

        break;
      } catch (error) {
        retryCount++;
        if (error.message?.includes('rate_limit_exceeded')) {
          const delay = baseDelay * 2 ** retryCount;
          elizaLogger.warn(
            `${logPrefix} Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (retryCount === maxRetries) {
          throw error;
        } else {
          elizaLogger.warn(
            `${logPrefix} Analysis failed, retrying (attempt ${retryCount}/${maxRetries})`,
            error,
          );
          await new Promise((resolve) => setTimeout(resolve, baseDelay));
        }
      }
    }

    elizaLogger.info(`${logPrefix} Successfully processed tweet ${tweet.id}`);
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error processing tweet:`, {
      error: error.message,
      stack: error.stack,
      tweetId: tweet.id,
      authorId: tweet.author_id,
      text:
        tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
      metrics: tweet.public_metrics,
    });
  }
}

export async function getUserSpamData(
  userId: string,
  logPrefix = '[Tweet Processing]',
): Promise<SpamUser | null> {
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
      `${logPrefix} Error getting spam data for user ${userId}:`,
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

export async function updateMarketMetrics(
  tweets: Tweet[],
  logPrefix = '[Tweet Processing]',
): Promise<void> {
  try {
    // Calculate aggregate metrics
    const metrics: MarketMetrics = {
      totalEngagement: tweets.reduce(
        (sum, tweet) =>
          sum +
          (tweet.public_metrics?.like_count || 0) +
          (tweet.public_metrics?.retweet_count || 0) +
          (tweet.public_metrics?.reply_count || 0),
        0,
      ),
      tweetCount: tweets.length,
      averageSentiment: 0.5, // TODO: Calculate from analysis
      timestamp: new Date(),
    };

    // Store in database
    await tweetQueries.insertMarketMetrics({
      ...metrics,
      [metrics.timestamp.toISOString()]: metrics,
    });

    elizaLogger.info(`${logPrefix} Updated market metrics`);
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error updating market metrics:`, error);
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
